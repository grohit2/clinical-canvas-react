#!/usr/bin/env python3
"""
Seed + e2e test script for HMS API (with checklist seeding + timeline validation).

What it does (in order):
-1) seed transition checklists (from→to) for the state chain (HTTP PUT /checklists if available; else Dynamo fallback)
  * onboarding→preop
  * preop→op
  * op→postop
  * postop→discharge
  * preop→discharge (non-op path)
0)  create 9 doctors (3 per department)
1)  create 15 patients (5 per department) and assign doctors by department
2)  read all patients and verify ours are present
3)  soft-delete 1 patient per department and verify patient lists
4)  update 1 patient per department through state chain using the seeded checklists
    -> validates timeline rows after progression (order, open/closed, required vs done)
    -> also attempts an invalid transition to ensure backend rejects it
5)  create **3 notes** per remaining (active) patient
6)  create **3 meds** per remaining (active) patient
7)  create 5 tasks per remaining (active) patient, assigned to that patient’s doctor
8)  verify tasks by patient
9)  verify tasks by doctor (department dashboard)

Usage:
    pip install requests  (and optionally boto3 if you need the Dynamo fallback)
    python seed_and_test.py --base https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws [--prefix myrun] [--region us-east-1] [--table HMS]
"""

import argparse
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

try:
    import boto3  # optional, only used for Dynamo fallbacks
except ImportError:
    boto3 = None


# --------------------------- constants & helpers ---------------------------

DEPARTMENTS = ["Cardiology", "GeneralSurgery", "Emergency"]
PATHWAY_FOR_DEPT = {
    "Cardiology": "consultation",
    "GeneralSurgery": "surgical",
    "Emergency": "emergency",
}
# canonical state chain we use in this script
STATE_CHAIN = ["onboarding", "preop", "op", "postop", "discharge"]
# plus a non-op branch we seed (preop->discharge)

TASK_TYPES = ["lab", "assessment", "procedure", "medication", "discharge"]

def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")

def iso_in(hours=0, minutes=0):
    return (datetime.now(timezone.utc) + timedelta(hours=hours, minutes=minutes)).replace(
        microsecond=0
    ).isoformat().replace("+00:00", "Z")

def short_dept(dept):
    return {"Cardiology":"card", "GeneralSurgery":"surg", "Emergency":"emer"}[dept]

def die(msg):
    print(f"❌ {msg}")
    sys.exit(1)

def ok(msg):
    print(f"✅ {msg}")

def info(msg):
    print(f"• {msg}")

class API:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.s = requests.Session()
        self.s.headers.update({"Content-Type": "application/json"})

    def _u(self, path):
        return f"{self.base}{path}"

    def _check(self, r):
        if not r.ok:
            try:
                j = r.json()
                raise RuntimeError(f"{r.request.method} {r.url} -> {r.status_code}: {j}")
            except Exception:
                raise RuntimeError(f"{r.request.method} {r.url} -> {r.status_code}: {r.text}")
        return r

    def get(self, path, params=None):
        return self._check(self.s.get(self._u(path), params=params)).json()

    def post(self, path, json=None):
        return self._check(self.s.post(self._u(path), json=json)).json()

    def put(self, path, json=None):
        return self._check(self.s.put(self._u(path), json=json)).json()

    def patch(self, path, json=None):
        return self._check(self.s.patch(self._u(path), json=json)).json()

    def delete(self, path):
        return self._check(self.s.delete(self._u(path))).json()


# --------------------------- checklists (HTTP first, Dynamo fallback) ---------------------------

CHECKLIST_DEFS = {
    ("onboarding", "preop"): {
        "in":  ["vitals-recorded", "allergies-checked"],
        "out": ["registration-complete"]
    },
    ("preop", "op"): {
        "in":  ["timeout-completed", "anesthesia-cleared", "antibiotics-given"],
        "out": ["fasting-confirmed"]
    },
    ("op", "postop"): {
        "in":  ["procedure-completed", "counts-correct"],
        "out": ["op-notes-signed"]
    },
    ("postop", "discharge"): {
        "in":  ["recovery-stable", "pain-managed"],
        "out": ["followup-scheduled"]
    },
    # Non-surgery path
    ("preop", "discharge"): {
        "in":  ["non-surgical-plan", "education-complete"],
        "out": ["preop-cancelled"]
    }
}

def upsert_checklist_http(api: API, from_state, to_state, in_req, out_req):
    payload = {"from": from_state, "to": to_state, "in": in_req, "out": out_req}
    try:
        api.put("/checklists", payload)
        return True
    except RuntimeError as e:
        if "404" in str(e) or "405" in str(e):
            return False
        raise

def upsert_checklist_ddb(table_name, region, from_state, to_state, in_req, out_req):
    if boto3 is None:
        die("boto3 not installed; cannot fallback to Dynamo checklist upserts. Install boto3 or enable PUT /checklists.")
    ddb = boto3.resource("dynamodb", region_name=region).Table(table_name)
    now = now_iso()
    item = {
        "PK": "CHECKLIST",
        "SK": f"STAGE#{from_state}#TO#{to_state}",
        "from": from_state,
        "to": to_state,
        "in_required": in_req,
        "out_required": out_req,
        "created_at": now,
        "updated_at": now,
    }
    ddb.put_item(Item=item)

def seed_checklists(api: API, table_name, region):
    info("Seeding checklist transitions")
    used_http = True
    for (f, t), reqs in CHECKLIST_DEFS.items():
        ok_http = upsert_checklist_http(api, f, t, reqs["in"], reqs["out"])
        if not ok_http:
            used_http = False
            if not table_name:
                die("PUT /checklists not available. Provide --table to upsert checklists directly into Dynamo.")
            upsert_checklist_ddb(table_name, region, f, t, reqs["in"], reqs["out"])
    ok(f"Checklists seeded via {'HTTP' if used_http else 'Dynamo fallback'} ✅")
    return CHECKLIST_DEFS.copy()


# --------------------------- doctor creation (HTTP first, Dynamo fallback) ---------------------------

def create_doctor_http(api: API, name, email, department):
    payload = {
        "name": name,
        "email": email,
        "department": department,
        "role": "doctor",
        "contactInfo": {"phone": "+1-555-0101"},
        "permissions": ["task:write", "patient:read"],
    }
    try:
        resp = api.post("/doctors", payload)
        return resp.get("doctor") or resp
    except RuntimeError as e:
        if "404" in str(e) or "405" in str(e):
            return None
        raise

def create_doctor_ddb(table_name, region, user_id, name, email, department):
    if boto3 is None:
        die("boto3 not installed; cannot fallback to Dynamo direct writes for doctors.")
    ddb = boto3.resource("dynamodb", region_name=region).Table(table_name)
    now = now_iso()
    item = {
        "PK": f"USER#{user_id}",
        "SK": "PROFILE",
        "user_id": user_id,
        "name": name,
        "role": "doctor",
        "department": department,
        "avatar": None,
        "contact_info": {"phone": "+1-555-seeded"},
        "permissions": ["task:write", "patient:read"],
        "email": email,
        "created_at": now,
        "updated_at": now,
        "GSI1PK": f"DEPT#{department}#ROLE#DOCTOR",
    }
    ddb.put_item(Item=item)
    return {
        "doctorId": user_id,
        "name": name,
        "department": department,
        "email": email,
        "createdAt": now,
        "updatedAt": now,
    }

def seed_doctors(api, table_name, region, prefix):
    doctors_by_dept = {}
    used_http = True
    info("Creating 9 doctors (3 per department)")
    for dept in DEPARTMENTS:
        doctors_by_dept[dept] = []
        for i in range(1, 4):
            did = f"doc-{short_dept(dept)}-{i:03d}-{prefix}"
            name = f"Dr. {dept} {i}"
            email = f"{did}@example.org"
            doc = create_doctor_http(api, name, email, dept)
            if doc is None:
                used_http = False
                if not table_name:
                    die("POST /doctors not available. Provide --table to insert doctors directly into Dynamo.")
                doc = create_doctor_ddb(table_name, region, did, name, email, dept)
            if "doctorId" not in doc:
                doc["doctorId"] = doc.get("user_id") or did
            doctors_by_dept[dept].append(doc)

    ok(f"Doctors created via {'HTTP' if used_http else 'Dynamo'} ✅")

    try:
        for dept in DEPARTMENTS:
            listed = api.get("/doctors", params={"department": dept})
            ids = {d["doctorId"] for d in listed}
            ours = {d["doctorId"] for d in doctors_by_dept[dept]}
            if not ours.issubset(ids):
                raise AssertionError(f"Department {dept} listing missing seeded doctors")
        ok("Verified /doctors?department=... lists seeded doctors ✅")
    except RuntimeError as e:
        info(f"Could not verify /doctors?department (endpoint may not exist yet): {e}")

    return doctors_by_dept


# --------------------------- patients ---------------------------

def create_patients(api, doctors_by_dept, prefix):
    random.seed(prefix)
    patients_by_dept = {d: [] for d in DEPARTMENTS}
    diagnoses = {
        "Cardiology": ["Hypertension", "Chest Pain", "CAD", "Atrial Fibrillation", "Heart Failure"],
        "GeneralSurgery": ["Appendicitis", "Cholecystitis", "Hernia", "Bowel Obstruction", "Diverticulitis"],
        "Emergency": ["Polytrauma", "Sepsis", "Acute MI", "Stroke", "Pneumonia"],
    }

    info("Creating 15 patients (5 per department)")
    for dept in DEPARTMENTS:
        docs = doctors_by_dept[dept]
        for i in range(1, 6):
            mrn = f"patient-{short_dept(dept)}-{i:03d}-{prefix}"
            doc = docs[(i - 1) % len(docs)]
            assign_doctor_id = doc["doctorId"]
            assign_doctor_name = doc.get("name", assign_doctor_id)

            body = {
                "mrn": mrn,
                "name": f"{dept} Patient {i} {prefix}",
                "age": random.randint(25, 85),
                "sex": random.choice(["Male", "Female"]),
                "department": dept,
                "pathway": PATHWAY_FOR_DEPT[dept],
                "current_state": "onboarding",
                "diagnosis": random.choice(diagnoses[dept]),
                "comorbidities": random.sample(["HTN", "DM", "CAD", "COPD", "Obesity"], k=random.randint(0, 3)),
                "assignedDoctorId": assign_doctor_id,
                "assignedDoctor": assign_doctor_name,
            }

            created = api.post("/patients", body)
            assert created["patient"]["mrn"] == mrn, "MRN mismatch on create"
            p = created["patient"]
            assert p.get("assignedDoctorId") == assign_doctor_id, "assignedDoctorId not saved correctly"
            assert p.get("assignedDoctor") == assign_doctor_name, "assignedDoctor not saved correctly"

            patients_by_dept[dept].append({
                "mrn": mrn,
                "department": dept,
                "assignedDoctorId": assign_doctor_id,
                "pathway": body["pathway"],
            })
    ok("Patients created ✅")
    return patients_by_dept

def verify_list_all_patients(api, prefix, expected_total):
    info("Reading all ACTIVE patients")
    allp = api.get("/patients")
    ours = [p for p in allp if p["mrn"].endswith(f"-{prefix}")]
    assert len(ours) == expected_total, f"Expected {expected_total} of ours, got {len(ours)}"
    ok(f"Read-back check passed (found {expected_total} seeded active patients) ✅")
    return ours

def delete_one_per_dept(api, patients_by_dept):
    info("Soft-deleting 1 patient per department")
    deleted = []
    for dept in DEPARTMENTS:
        victim = patients_by_dept[dept][-1]
        api.delete(f"/patients/{victim['mrn']}")
        listed = api.get("/patients", params={"department": dept})
        listed_mrns = {p["mrn"] for p in listed}
        assert victim["mrn"] not in listed_mrns, f"Deleted {victim['mrn']} still listed as ACTIVE in {dept}"
        p = api.get(f"/patients/{victim['mrn']}")
        assert p["status"] == "INACTIVE", "Soft delete should flip status to INACTIVE"
        deleted.append(victim["mrn"])
        patients_by_dept[dept] = [x for x in patients_by_dept[dept] if x["mrn"] != victim["mrn"]]
    ok(f"Deleted (soft) patients: {', '.join(deleted)} ✅")
    return patients_by_dept


# --------------------------- timeline helpers & validation ---------------------------

def expected_states_after_chain():
    return ["onboarding", "preop", "op", "postop", "discharge"]

def verify_timeline_for_patient(api: API, mrn: str, expected_states: list, checklist_map: dict):
    rows = api.get(f"/patients/{mrn}/timeline")
    states = [r["state"] for r in rows]
    assert states == expected_states, f"{mrn}: timeline states {states} != expected {expected_states}"

    for i, r in enumerate(rows):
        if i < len(rows) - 1:
            assert r["dateOut"], f"{mrn}: state {r['state']} should be closed (dateOut missing)"
        else:
            assert r["dateOut"] is None, f"{mrn}: last state {r['state']} should be open (dateOut should be null)"

    for j in range(len(expected_states) - 1):
        f, t = expected_states[j], expected_states[j + 1]
        req = checklist_map.get((f, t))
        assert req, f"{mrn}: no checklist seeded for {f}->{t}"
        prev = rows[j]
        assert prev.get("requiredOut", []) == req["out"], f"{mrn}: requiredOut mismatch for {f}->{t}"
        assert prev.get("checklistOut", []) == req["out"], f"{mrn}: checklistOut (done) mismatch for {f}->{t}"
        cur = rows[j + 1]
        assert cur.get("requiredIn", []) == req["in"], f"{mrn}: requiredIn mismatch for {f}->{t}"
        assert cur.get("checklistIn", []) == req["in"], f"{mrn}: checklistIn (done) mismatch for {f}->{t}"

    ok(f"{mrn}: timeline validated ✅")


# --------------------------- state progression using checklists ---------------------------

def progress_one_patient_per_dept_with_checklists(api, patients_by_dept, checklist_map):
    info("Advancing one patient per department through states with checklist validation")
    progressed = []
    for dept in DEPARTMENTS:
        candidate = patients_by_dept[dept][0]
        mrn = candidate["mrn"]
        chain = ["onboarding", "preop", "op", "postop", "discharge"]
        for idx in range(1, len(chain)):
            f, t = chain[idx - 1], chain[idx]
            req = checklist_map[(f, t)]
            body = {
                "current_state": t,
                "checklistInDone": req["in"],
                "checklistOutDone": req["out"],
                "actorId": candidate["assignedDoctorId"],
                "timelineNotes": f"{f}->{t} OK",
            }
            api.put(f"/patients/{mrn}", body)
            got = api.get(f"/patients/{mrn}")
            assert got["currentState"] == t, f"State for {mrn} expected {t}, got {got['currentState']}"

        verify_timeline_for_patient(api, mrn, expected_states_after_chain(), checklist_map)
        progressed.append(mrn)

        try:
            api.put(f"/patients/{mrn}", {"current_state": "preop"})
            die(f"{mrn}: invalid transition discharge->preop should have failed")
        except RuntimeError as e:
            assert "400" in str(e), f"{mrn}: expected 400 for invalid transition, got {e}"
    ok(f"State progression + timeline validation passed for: {', '.join(progressed)} ✅")


# --------------------------- notes ---------------------------

def create_notes_for_active_patients(api, patients_by_dept, prefix):
    info("Creating 3 notes per active patient")
    expected_by_patient = {}
    for dept in DEPARTMENTS:
        for p in patients_by_dept[dept]:
            mrn = p["mrn"]
            author = p["assignedDoctorId"]
            expected_by_patient[mrn] = 0

            notes = [
                ("doctorNote", f"[{prefix}] Initial assessment for {mrn}"),
                ("nurseNote",  f"[{prefix}] Vitals stable; pain {random.randint(0,10)}/10"),
                ("pharmacy",   f"[{prefix}] Med reconciliation completed"),
            ]
            for cat, content in notes:
                r = api.post(f"/patients/{mrn}/notes", {
                    "authorId": author,
                    "category": cat,
                    "content": content,
                })
                assert r["note"]["patientId"] == mrn, "note->patientId mismatch"
                expected_by_patient[mrn] += 1

    ok("Notes created ✅")
    return expected_by_patient

def verify_notes_by_patient(api, expected_by_patient):
    info("Verifying notes per patient (>= expected)")
    for mrn, expected in expected_by_patient.items():
        resp = api.get(f"/patients/{mrn}/notes", params={"limit": 100})
        items = resp.get("items", []) if isinstance(resp, dict) else resp
        count = len(items)
        assert count >= expected, f"{mrn}: expected at least {expected} notes, got {count}"
    ok("Per-patient note counts verified ✅")


# --------------------------- meds ---------------------------

def create_meds_for_active_patients(api, patients_by_dept, prefix):
    info("Creating 3 meds per active patient")
    expected_by_patient = {}
    for dept in DEPARTMENTS:
        for p in patients_by_dept[dept]:
            mrn = p["mrn"]
            expected_by_patient[mrn] = 0

            meds = [
                {
                    "name": "Ceftriaxone",
                    "dose": "1 g",
                    "route": "IV",
                    "freq": "q24h",
                    "start": now_iso(),
                    "end": None,
                    "priority": "critical",
                    "scheduleTimes": ["10:00Z"]
                },
                {
                    "name": "Acetaminophen",
                    "dose": "650 mg",
                    "route": "PO",
                    "freq": "q6h PRN",
                    "start": now_iso(),
                    "end": None,
                    "priority": "important",
                    "scheduleTimes": ["06:00Z", "12:00Z", "18:00Z", "00:00Z"]
                },
                {
                    "name": "Enoxaparin",
                    "dose": "40 mg",
                    "route": "SC",
                    "freq": "q24h",
                    "start": now_iso(),
                    "end": None,
                    "priority": "routine",
                    "scheduleTimes": ["20:00Z"]
                }
            ]

            for m in meds:
                r = api.post(f"/patients/{mrn}/meds", m)
                assert r["med"]["patientId"] == mrn, "med->patientId mismatch"
                expected_by_patient[mrn] += 1

    ok("Meds created ✅")
    return expected_by_patient

def verify_meds_by_patient(api, expected_by_patient):
    info("Verifying meds per patient (active)")
    for mrn, expected in expected_by_patient.items():
        resp = api.get(f"/patients/{mrn}/meds", params={"active": "1", "limit": 100})
        items = resp.get("items", []) if isinstance(resp, dict) else resp
        count = len(items)
        assert count >= expected, f"{mrn}: expected at least {expected} active meds, got {count}"
    ok("Per-patient med counts verified ✅")


# --------------------------- tasks ---------------------------

def create_tasks_for_active_patients(api, patients_by_dept, doctors_by_dept, prefix):
    info("Creating 5 tasks per active patient")
    expected_by_patient = {}
    expected_by_doctor = {}

    for dept in DEPARTMENTS:
        for p in patients_by_dept[dept]:
            mrn = p["mrn"]
            assignee = p["assignedDoctorId"]
            expected_by_patient[mrn] = 0

            for k in range(5):
                ttype = TASK_TYPES[k % len(TASK_TYPES)]
                due_iso = iso_in(hours=k + 1)
                body = {
                    "title": f"{ttype.title()} task {k+1} for {mrn}",
                    "type": ttype,
                    "due": due_iso,
                    "assigneeId": assignee,
                    "priority": "high" if k == 0 else "medium",
                    "recurring": (k == 4),
                    "recurrence": {"frequency": "daily", "until": iso_in(hours=240)} if k == 4 else None,
                    "details": {"notes": f"seed via python {prefix}"},
                    "department": dept,
                }
                r = api.post(f"/patients/{mrn}/tasks", body)
                assert r["task"]["patientId"] == mrn, "task->patientId mismatch"
                assert r["task"]["status"] == "open", "default status should be open unless overridden"
                expected_by_patient[mrn] += 1

                key = (dept, assignee)
                expected_by_doctor[key] = expected_by_doctor.get(key, 0) + 1

    ok("Tasks created ✅")
    return expected_by_patient, expected_by_doctor

def verify_tasks_by_patient(api, expected_by_patient):
    info("Verifying tasks per patient")
    for mrn, expected in expected_by_patient.items():
        items = api.get(f"/patients/{mrn}/tasks", params={"status": "open", "limit": 100})
        count = len(items)
        assert count == expected, f"{mrn}: expected {expected} open tasks, got {count}"
    ok("Per-patient task counts verified ✅")

def verify_tasks_by_doctor(api, expected_by_doctor):
    info("Verifying tasks by doctor (department dashboard)")
    totals_by_dept = {}
    for (dept, doctor_id), expected in expected_by_doctor.items():
        items = api.get("/tasks", params={
            "department": dept,
            "status": "open",
            "assigneeId": doctor_id,
            "limit": 500
        })
        count = len(items)
        assert count == expected, f"{dept}/{doctor_id}: expected {expected} open tasks, got {count}"
        totals_by_dept[dept] = totals_by_dept.get(dept, 0) + count

    for dept, subtotal in totals_by_dept.items():
        all_open = api.get("/tasks", params={"department": dept, "status": "open", "limit": 2000})
        assert len(all_open) == subtotal, f"{dept}: sum of doctor buckets {subtotal} != dept open total {len(all_open)}"
    ok("Per-doctor and per-department task totals verified ✅")


# --------------------------- main ---------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.getenv("BASE"), help="Base URL for your Lambda (e.g., https://xxx.lambda-url.us-east-1.on.aws)")
    ap.add_argument("--prefix", default=f"run{int(time.time())}", help="Unique MRN/ID prefix so runs don’t collide")
    ap.add_argument("--region", default=os.getenv("AWS_REGION", "us-east-1"))
    ap.add_argument("--table", default=os.getenv("TABLE_NAME"), help="DynamoDB table (needed only if POST /doctors or PUT /checklists is not available)")
    args = ap.parse_args()

    if not args.base:
        die("Please pass --base https://<lambda-url> (or set BASE env var).")

    print(f"\n=== HMS Seeder — {args.prefix} ===")
    print(f"Base:  {args.base}")
    print(f"Table: {args.table or '— (only needed if doctor/checklist HTTP endpoints are missing)'}")
    print(f"Region:{args.region}\n")

    api = API(args.base)

    # -1) seed checklists (HTTP or Dynamo fallback)
    checklist_map = seed_checklists(api, args.table, args.region)

    # 0) doctors
    doctors_by_dept = seed_doctors(api, args.table, args.region, args.prefix)

    # 1) patients (5/dept)
    patients_by_dept = create_patients(api, doctors_by_dept, args.prefix)

    # 2) read all active patients and verify
    verify_list_all_patients(api, args.prefix, expected_total=15)

    # 3) delete 1 per department
    patients_by_dept = delete_one_per_dept(api, patients_by_dept)

    # 2b) verify again (should be 12 active now)
    verify_list_all_patients(api, args.prefix, expected_total=12)

    # 4) state progression + timeline validation on 1 per department
    progress_one_patient_per_dept_with_checklists(api, patients_by_dept, checklist_map)

    # 5) create 3 notes per remaining active patient
    expected_notes_by_patient = create_notes_for_active_patients(api, patients_by_dept, args.prefix)
    verify_notes_by_patient(api, expected_notes_by_patient)

    # 6) create 3 meds per remaining active patient
    expected_meds_by_patient = create_meds_for_active_patients(api, patients_by_dept, args.prefix)
    verify_meds_by_patient(api, expected_meds_by_patient)

    # 7) create 5 tasks per remaining active patient
    expected_by_patient, expected_by_doctor = create_tasks_for_active_patients(api, patients_by_dept, doctors_by_dept, args.prefix)

    # 8) verify tasks by patient
    verify_tasks_by_patient(api, expected_by_patient)

    # 9) verify tasks by doctor dashboard
    verify_tasks_by_doctor(api, expected_by_doctor)

    print("\n🎉 All steps completed successfully.")

if __name__ == "__main__":
    main()
