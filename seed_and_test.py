#!/usr/bin/env python3
"""
Seed + e2e test script for HMS API.

What it does (in order):
0) create 9 doctors (3 per department)
1) create 15 patients (5 per department) and assign doctors by department
2) read all patients and verify ours are present
3) soft-delete 1 patient per department and verify patient lists
4) update 1 patient per department through state chain: onboarding → preop → op → postop → discharge
5) create 5 tasks per remaining (active) patient, assigned to that patient’s doctor
6) get tasks by patient and verify counts
7) get tasks by doctor (department dashboard) and verify counts

Usage:
    pip install requests  (and optionally boto3 if you need the Dynamo fallback)
    python seed_and_test.py --base https://<your-lambda-url> [--prefix myrun] [--region us-east-1] [--table HMS]

Notes:
- We use a unique MRN prefix so you can run this repeatedly without collisions.
- If POST /doctors isn’t available, pass --table (and have AWS creds set) to let the script
  insert doctors directly into DynamoDB with proper GSI1PK for department listing.
"""

import argparse
import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

try:
    import boto3  # optional, only used if doctor POST not available and --table is provided
except ImportError:
    boto3 = None


# --------------------------- helpers ---------------------------

DEPARTMENTS = ["Cardiology", "GeneralSurgery", "Emergency"]
PATHWAY_FOR_DEPT = {
    "Cardiology": "consultation",
    "GeneralSurgery": "surgical",
    "Emergency": "emergency",
}
STATE_CHAIN = ["onboarding", "preop", "op", "postop", "discharge"]

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
            # try to pull json to show cleaner error
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


# --------------------------- doctor creation (HTTP first, Dynamo fallback) ---------------------------

def create_doctor_http(api: API, name, email, department):
    """Tries POST /doctors; returns {'doctorId', 'name', 'department', ...} or None on 404/405."""
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
        # support either { doctor: {...} } or {...}
        return resp.get("doctor") or resp
    except RuntimeError as e:
        # Unavailable route? let caller decide fallback
        if "404" in str(e) or "405" in str(e):
            return None
        raise

def create_doctor_ddb(table_name, region, user_id, name, email, department):
    """Direct Dynamo insert if POST /doctors doesn't exist. Requires boto3 and AWS creds."""
    if boto3 is None:
        die("boto3 not installed; cannot fallback to Dynamo direct writes. Install boto3 or enable POST /doctors.")
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
        # very important: so GET /doctors?department=... works via GSI1PK-index
        "GSI1PK": f"DEPT#{department}#ROLE#DOCTOR",
    }
    ddb.put_item(Item=item)  # idempotency not enforced here; prefix makes collisions unlikely
    return {
        "doctorId": user_id,
        "name": name,
        "department": department,
        "email": email,
        "createdAt": now,
        "updatedAt": now,
    }

def seed_doctors(api, table_name, region, prefix):
    """
    Returns:
      doctors_by_dept = {
        'Cardiology': [{'doctorId':..., 'name':..., 'department':...}, ... x3],
        'GeneralSurgery': [... x3],
        'Emergency': [... x3],
      }
    Also verifies per-department listing if GET /doctors?department=... is live.
    """
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
                # normalize if needed
                doc["doctorId"] = doc.get("user_id") or did
            doctors_by_dept[dept].append(doc)

    if used_http:
        ok("Doctors created via HTTP ✅")
    else:
        ok("Doctors inserted directly into Dynamo (fallback) ✅")

    # Verify department listing if the query endpoint exists
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
    """
    Create 5 patients per department; assign a doctor from that department (round-robin).
    Returns:
      patients_by_dept = { dept: [ {mrn, assignedDoctorId, department, ...}, ... ] }
    """
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
            doc = docs[(i - 1) % len(docs)]  # round-robin
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

                # IMPORTANT: new backend expects camelCase here
                "assignedDoctorId": assign_doctor_id,
                "assignedDoctor": assign_doctor_name,
            }

            created = api.post("/patients", body)
            assert created["patient"]["mrn"] == mrn, "MRN mismatch on create"

            # quick sanity on echo-back
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


# --------------------------- delete one per dept ---------------------------

def delete_one_per_dept(api, patients_by_dept):
    info("Soft-deleting 1 patient per department")
    deleted = []
    for dept in DEPARTMENTS:
        victim = patients_by_dept[dept][-1]  # last created for that dept
        api.delete(f"/patients/{victim['mrn']}")
        # verify via department list: deleted should disappear (ACTIVE filter)
        listed = api.get("/patients", params={"department": dept})
        listed_mrns = {p["mrn"] for p in listed}
        assert victim["mrn"] not in listed_mrns, f"Deleted {victim['mrn']} still listed as ACTIVE in {dept}"
        # verify direct read shows status INACTIVE
        p = api.get(f"/patients/{victim['mrn']}")
        assert p["status"] == "INACTIVE", "Soft delete should flip status to INACTIVE"
        deleted.append(victim["mrn"])
        # also remove from our working set
        patients_by_dept[dept] = [x for x in patients_by_dept[dept] if x["mrn"] != victim["mrn"]]
    ok(f"Deleted (soft) patients: {', '.join(deleted)} ✅")
    return patients_by_dept


# --------------------------- state progression ---------------------------

def progress_one_patient_per_dept(api, patients_by_dept):
    info("Advancing one patient per department through states")
    progressed = []
    for dept in DEPARTMENTS:
        candidate = patients_by_dept[dept][0]  # take first active in the dept
        mrn = candidate["mrn"]
        for state in STATE_CHAIN:
            api.put(f"/patients/{mrn}", {"current_state": state})
            got = api.get(f"/patients/{mrn}")
            assert got["currentState"] == state, f"State for {mrn} expected {state}, got {got['currentState']}"
        progressed.append(mrn)
    ok(f"State progression verified for: {', '.join(progressed)} ✅")


# --------------------------- tasks ---------------------------

def create_tasks_for_active_patients(api, patients_by_dept, doctors_by_dept, prefix):
    """
    Create 5 OPEN tasks per active patient, assigned to that patient’s assigned doctor.
    Returns:
      expected_tasks_by_patient = { mrn: 5, ... }
      expected_tasks_by_doctor = { (dept, doctorId): count, ... }
    """
    info("Creating 5 tasks per active patient")
    expected_by_patient = {}
    expected_by_doctor = {}

    for dept in DEPARTMENTS:
        for p in patients_by_dept[dept]:
            mrn = p["mrn"]
            assignee = p["assignedDoctorId"]  # we saved this at creation
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
                    "recurring": (k == 4),  # last task recurring just to exercise the field
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
    # group by dept to also check dept totals
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

    # sanity: query dept totals (without assignee) and compare sums
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
    ap.add_argument("--table", default=os.getenv("TABLE_NAME"), help="DynamoDB table (needed only if POST /doctors is not available)")
    args = ap.parse_args()

    if not args.base:
        die("Please pass --base https://<lambda-url> (or set BASE env var).")

    print(f"\n=== HMS Seeder — {args.prefix} ===")
    print(f"Base:  {args.base}")
    print(f"Table: {args.table or '— (only needed if doctor POST is missing)'}")
    print(f"Region:{args.region}\n")

    api = API(args.base)

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

    # 4) state progression on 1 per department
    progress_one_patient_per_dept(api, patients_by_dept)

    # 5) create 5 tasks per remaining active patient
    expected_by_patient, expected_by_doctor = create_tasks_for_active_patients(api, patients_by_dept, doctors_by_dept, args.prefix)

    # 6) verify tasks by patient
    verify_tasks_by_patient(api, expected_by_patient)

    # 7) verify tasks by doctor dashboard
    verify_tasks_by_doctor(api, expected_by_doctor)

    print("\n🎉 All steps completed successfully.")

if __name__ == "__main__":
    main()
