I’m assuming “FHIR7” means **HL7 FHIR**. The release names are R4/R4B/R5 rather than “7”; the current published core FHIR spec is **R5**. For an international patient-summary baseline, the current published **IPS STU2** is based on **FHIR R4**. For U.S. implementations, the current published **US Core** is **8.0.1**, also based on **FHIR R4**. So the safest plan is: use HL7 FHIR as the model, then choose one implementation guide as your contract—**IPS** for international summary, **US Core** for U.S. interoperability. ([HL7][1])

FHIR gives you the **data model and exchange contract**; the page layout still has to follow clinician workflow. The strongest usability guidance says to align the UI with real clinical workflow, reduce clicks, support longitudinal/context-driven review, minimize alert fatigue, and validate with representative users doing realistic tasks. ([HL7][2])

## What should be on the first patient-details screen

* **Patient banner:** name, identifier/MRN, DOB/age, sex, contact, preferred language, PCP/managing organization, and the current encounter context. These map cleanly to `Patient`, `Encounter`, and optionally `CareTeam`. ([HL7][3])
* **Safety strip:** allergies, major flags, advance-directive / high-risk warnings, and other things that deserve special display rather than being buried in notes. IPS includes allergies, alerts, and advance directives, and FHIR has dedicated `AllergyIntolerance` and `Flag` resources. ([HL7][4])
* **Clinical snapshot:** active problems, current medications, recent vitals, latest important results, and current plan of care. IPS makes problems, allergies, and medication summary required, and recommends results, plan of care, and vital signs; US Core medication-list guidance centers the active medication view on `MedicationRequest`. ([HL7][4])
* **Today’s work:** pending referrals, pending orders, outstanding tasks, unsigned notes, and unreviewed results. `Task` tracks work state through completion, while `ServiceRequest` is the request for the clinical service itself. ([HL7][5])
* **Unified activity feed:** the main body should be a single longitudinal timeline with filters like All, Results, Meds, Notes, Orders, Procedures, Referrals, and Tasks. ONC explicitly recommends longitudinal, context-driven presentation and workflow-aligned design. ([ASTP][6])

## What counts as “activity” on the patient timeline

* **Visits, admissions, discharges, transfers:** `Encounter`. FHIR defines Encounter as the actual interaction/activity that occurred, not merely the planned activity. ([HL7][7])
* **Problem or diagnosis changes:** `Condition`. This is the right place for problems, diagnoses, and health concerns. ([HL7][8])
* **Medication ordered, changed, held, or stopped:** `MedicationRequest`. **Medication actually given:** `MedicationAdministration`. For medication-list access, US Core says active medications can be obtained using `MedicationRequest`. ([HL7][9])
* **Lab or imaging ordered vs. resulted:** `ServiceRequest` for the order, `DiagnosticReport` for the report/context, and `Observation` for the atomic results and trends. FHIR explicitly distinguishes `DiagnosticReport` from `Observation` this way. ([HL7][10])
* **Procedures performed:** `Procedure`. ([HL7][11])
* **Referrals and consults:** `ServiceRequest`. The operational follow-up around them—claimed, accepted, in progress, completed, failed—belongs in `Task`. ([HL7][10])
* **Notes, discharge summaries, PDFs, and scans:** `DocumentReference` for general notes/documents, and `Composition` when you are authoring a structured attested clinical document. US Core says `DocumentReference` is the better choice for broad narrative notes like progress notes and discharge summaries, while `DiagnosticReport` is better when the system needs to share discrete report data or coded interpretations. ([HL7][12])
* **Rounds and handoffs:** in practice, use encounter context plus a structured assessment in `ClinicalImpression`, team communication in `Communication`, and the actual round note as `DocumentReference`/`Composition`. `ClinicalImpression` is specifically for a clinical assessment, and `Communication` is for information being transmitted or shared. ([HL7][13])
* **Care-plan changes:** `CarePlan`. ([HL7][14])
* **Where data came from / who last updated it:** `Provenance`. Keep this visible on imported or reconciled data, but secondary to the clinical content itself. ([HL7][15])
* **Access/audit logs:** keep these separate from the main doctor timeline. `AuditEvent` is for operations, privacy, security, maintenance, and performance analysis, and HL7 says it is not intended to be used directly by routine healthcare users like providers. ([FHIR][16])

## Notes and reports you should support

For notes/documents, a very practical minimum set is the US Core common note set: **consultation note, discharge summary, history & physical, procedures note, progress note, imaging narrative, laboratory report narrative, pathology report narrative, surgical operation note, and emergency department note**. US Core also encourages support for **referral note** and **nurse note**. ([HL7][17])

## What should be second-level, not front-and-center

To keep the page simple, put these one click away unless they are clinically urgent: immunizations, devices, functional status, social history, pregnancy history/status, patient story/preferences, and full provenance drill-down. IPS includes all of these in the patient-summary model, but not everything belongs on the landing screen. ([HL7][4])

## What makes doctors actually use it

* **Default to now:** current encounter, active problems, active meds, new/abnormal results, and open work first; older history should expand only when needed. That matches ONC’s workflow-alignment guidance. ([ASTP][6])
* **Use the same interaction pattern everywhere:** ONC specifically calls out harmonizing common operations like medication reconciliation, medication/lab/imaging ordering, results review, problem-list interaction, history interaction, and documentation authoring/review. ([ASTP][6])
* **Show explicit empty states:** “No known allergies,” “No active medications,” “No pending tasks.” IPS explicitly models missing/none-known states rather than leaving sections blank. ([HL7][4])
* **Make scanned PDFs searchable/extracted:** ONC recommends automatic extraction and indexing of scanned reports, and US Core requires consistent access to overlapping scanned reports through both `DocumentReference` and `DiagnosticReport`. 
* **Support fast entry, but safely:** ONC recommends improving documentation functionality, mentions speech recognition as promising, warns about copy-paste governance, and recommends using EHR logs to find workflow bottlenecks. 
* **Show source and author on imported data:** US Core provenance focuses on timestamp, target resource, author, author organization, transmitter, and transmitter organization; this is especially useful for reconciled meds, allergies, and problems. ([HL7][15])
* **Bring patient-entered data into workflow:** ONC notes that integrating patient-based data collection into workflow can reduce physician/support-staff burden. ([ASTP][6])
* **Test with real clinicians before rollout:** NIST recommends user-centered design and validation with representative users doing realistic tasks. ([NIST][18])

## My practical recommendation

Build the page as **one simple Overview screen** with a sticky patient banner, a safety strip, 4 summary cards (**Problems, Meds, Results, Work Queue**), and then **one unified longitudinal activity timeline**. Put deeper detail behind secondary views like **Results**, **Meds**, **Notes/Documents**, and **Orders/Tasks**. That keeps the UI easy to read, easy to enter data into, and still aligned with FHIR resource boundaries and current HL7 guidance. ([ASTP][6])

Next step would be a wireframe-ready field list mapped resource-by-resource to `Patient`, `Encounter`, `Condition`, `MedicationRequest`, `DiagnosticReport`, `Observation`, `Task`, `ServiceRequest`, `DocumentReference`, `Composition`, `CarePlan`, and `Provenance`.

[1]: https://www.hl7.org/fhir/?utm_source=chatgpt.com "HL7 FHIR standard"
[2]: https://www.hl7.org/fhir/overview.html?utm_source=chatgpt.com "HL7.org FHIR Overview"
[3]: https://www.hl7.org/fhir/patient.html "Patient - FHIR v5.0.0"
[4]: https://hl7.org/fhir/uv/ips/STU2/Structure-of-the-International-Patient-Summary.html "Structure of the International Patient Summary - International Patient Summary Implementation Guide v2.0.0"
[5]: https://hl7.org/fhir/task.html "Task - FHIR v5.0.0"
[6]: https://healthit.gov/wp-content/uploads/2020/02/BurdenReport.pdf "Strategy on Reducing Regulatory and Administrative Burden Relating to the Use of Health IT and EHRSs"
[7]: https://hl7.org/fhir/encounter.html "Encounter - FHIR v5.0.0"
[8]: https://hl7.org/fhir/condition.html "Condition - FHIR v5.0.0"
[9]: https://hl7.org/fhir/medicationrequest.html "MedicationRequest - FHIR v5.0.0"
[10]: https://hl7.org/fhir/servicerequest.html "ServiceRequest - FHIR v5.0.0"
[11]: https://hl7.org/fhir/procedure.html "Procedure - FHIR v5.0.0"
[12]: https://hl7.org/fhir/R4/documentreference.html "DocumentReference - FHIR v4.0.1"
[13]: https://hl7.org/fhir/clinicalimpression.html "ClinicalImpression - FHIR v5.0.0"
[14]: https://hl7.org/fhir/careplan.html "CarePlan - FHIR v5.0.0"
[15]: https://hl7.org/fhir/us/core/STU8.0.1/basic-provenance.html "Basic Provenance - US Core Implementation Guide v8.0.1"
[16]: https://fhir.hl7.org/fhir/AuditEvent "AuditEvent - FHIR v5.0.0"
[17]: https://hl7.org/fhir/us/core/STU8.0.1/clinical-notes.html "Clinical Notes - US Core Implementation Guide v8.0.1"
[18]: https://www.nist.gov/publications/technical-basis-user-interface-design-health-it "Technical Basis for User Interface Design of Health IT | NIST"


Yes — below is the version I would build.

Treat “FHIR7” as **HL7 FHIR**. For a real patient-details page, the safest approach is to align the data model to standard FHIR resources and choose a profile baseline such as **IPS** or **US Core**. Both of those are built on **FHIR R4/4.0.1**, while the core FHIR publication also has an **R5** release. ([HL7][1])

## Best shape for the page

Do **one simple overview screen**, not 10 tabs.

```text
[Patient Banner]
Name | MRN | Age/DOB | Sex | Encounter | Location | Language | Attending

[Safety Strip]
Allergies | Critical flags | Advance directive summary

[Quick Actions]
Add note | Order lab/imaging | Add medication | Refer | Create task | Add problem

[4 Summary Cards]
Active Problems | Current Medications | New Results & Vitals | Open Tasks / Referrals

[Activity Feed with Filters]
All | Today | Notes | Orders | Results | Meds | Procedures | Referrals | Tasks | Documents

[Detail Panel]
Click any item to open full detail without leaving the page
```

That layout fits the main usability guidance from ONC and NIST: match clinical workflow, avoid unnecessary extra steps, keep the design efficient/effective, and validate it with representative users doing real tasks. ([ASTP][2])

## What must be on the first screen

* **Patient banner:** full name, MRN, DOB/age, sex, contact basics, preferred language/interpreter, and the current encounter context such as encounter type/status and location. In FHIR terms, this comes mainly from `Patient` and `Encounter`, and US Core adds expectations around identifier, name, birth date, contact detail, and communication/language support. ([HL7][3])

* **Safety strip:** allergies, critical alerts/flags, and advance-directive summary should always be visible at the top, not hidden inside notes. That aligns with `AllergyIntolerance`, `Flag`, and the IPS patient-summary sections for allergies, alerts, and advance directives. ([FHIR][4])

* **Clinical snapshot cards:** the doctor should immediately see active problems, current medications, fresh results/vitals, and open work. Those map naturally to `Condition`, `MedicationRequest`, `Observation`/`DiagnosticReport`, `Task`, and `ServiceRequest`. ([FHIR][5])

* **Unified activity feed:** this is the most important part. It should show everything that happened to the patient in one place, newest first, with filters. Build that feed by aggregating standard FHIR event resources instead of inventing one generic custom “activity” object. FHIR’s workflow pattern already distinguishes requests, events, and tasks, and the `Basic` resource should only be used when no proper resource exists. ([FHIR][6])

* **Quick actions:** doctors should be able to add a note, order something, add/change a medication, create a referral, create a task, or update a problem without leaving the page. Keeping the common actions right on the patient screen supports the workflow/usability guidance to reduce friction and extra navigation. ([ASTP][2])

## Which FHIR resource should be used for each thing

* **Visits, admission, discharge, transfer** → `Encounter`. FHIR defines this as the actual interaction/activity that occurred. ([HL7][7])

* **Problem list / diagnoses / resolved conditions** → `Condition`. This is the right place for clinical problems and diagnoses that matter for management. ([FHIR][5])

* **Current medication list / medication ordered / medication changed** → `MedicationRequest`. US Core specifically supports active medication-list workflows through `MedicationRequest`. ([HL7][8])

* **Medication actually given** → `MedicationAdministration`. **Medication dispensed/filled** → `MedicationDispense`. FHIR separates the order from the actual administration or supply. ([HL7][8])

* **Labs, vitals, flowsheet-type values** → `Observation`. **Lab/imaging/pathology report package** → `DiagnosticReport`. Observation is the atomic value; DiagnosticReport gives the report-level context and interpretation. ([HL7][9])

* **Orders and referrals** → `ServiceRequest`. This covers requests for diagnostics, treatments, surgeries, consults, and referral/transfer-of-care type services. ([HL7][10])

* **Operational work items** like “book referral,” “collect sample,” “follow up result,” “sign note,” “review report” → `Task`. `Task` is specifically for tracking work state through completion. ([FHIR][11])

* **Procedures performed** → `Procedure`. ([HL7][12])

* **Notes, PDFs, scanned reports, uploaded files** → `DocumentReference`. This is the best general container for clinical notes and document metadata, including scanned paper and binary files. ([FHIR][13])

* **Structured authored documents** like a proper discharge summary or H&P → `Composition` for the document content/structure, usually wrapped in a document bundle when exchanged as a FHIR document. ([HL7][14])

* **Rounds / daily clinical assessment** → `ClinicalImpression` plus the actual note/document. FHIR does not have a special “rounds” resource, so this is the cleanest fit for the assessment part. ([FHIR][15])

* **Handoffs / clinical messages / recorded communications** → `Communication`. ([FHIR][16])

* **Longitudinal plan and goals** → `CarePlan`. ([FHIR][17])

* **Who authored/imported/reconciled the data** → `Provenance`. This is especially useful for external records and reconciled meds/allergies/problems. ([FHIR][18])

## What should appear in the patient activity feed

The feed should include these event types:

* encounter started, admitted, transferred, discharged
* problem added, changed, resolved
* medication ordered, changed, held, stopped, administered, dispensed
* lab/imaging/pathology ordered and resulted
* abnormal or critical result posted
* procedure scheduled or completed
* referral requested, accepted, completed
* task created, assigned, due, completed, failed
* note written, signed, amended
* discharge summary uploaded or signed
* rounds assessment completed
* care plan updated
* communication/handoff recorded
* external document imported

Those are not random UI items; they map directly to `Encounter`, `Condition`, `MedicationRequest`, `MedicationAdministration`, `MedicationDispense`, `Observation`, `DiagnosticReport`, `ServiceRequest`, `Task`, `Procedure`, `DocumentReference`, `Composition`, `ClinicalImpression`, `Communication`, and `CarePlan`. ([HL7][7])

## Notes and reports you should definitely support

At minimum, support these note/report types because they are common, high-value, and already reflected in US Core clinical note guidance: **discharge summary, consult note, history and physical, progress note, procedure note, diagnostic imaging narrative, laboratory report narrative, pathology report narrative, surgical operation note, and emergency department note**. ([FHIR][19])

## Make data entry very easy

The page should be easy for doctors because each quick-add form is tiny:

* **Problem form:** diagnosis, status, onset, short note.
* **Medication form:** medication, dose, route/frequency, start/stop, reason, status.
* **Order/referral form:** requested service, reason, priority, destination.
* **Task form:** task title, owner, due date, priority, linked order if any.
* **Note form:** note type, title, text, encounter.

Those minimal entry fields line up with the core structures of `Condition`, `MedicationRequest`, `ServiceRequest`, `Task`, `DocumentReference`, and `Composition`. The rest should stay under “advanced details,” not on the first form. That keeps the workflow fast and matches the general ONC/NIST recommendation to reduce unnecessary steps and design around real user tasks. ([FHIR][5])

## What should stay one click away, not crowd the first screen

These are important, but usually should live in secondary panels unless they are directly relevant to the current visit: **immunizations, devices, functional status, social history, pregnancy history/status, patient story/preferences, and past resolved problems**. IPS includes all of these in a complete patient summary, but they do not all need to dominate the landing screen. ([HL7][20])

## My recommendation for the MVP

Build version 1 with these pieces only:

1. **Banner + safety strip**
2. **4 summary cards**: problems, meds, results/vitals, open work
3. **One unified timeline** with filters
4. **Quick actions** for note, order, medication, referral, task, problem
5. **FHIR resources underneath**: `Patient`, `Encounter`, `AllergyIntolerance`, `Flag`, `Condition`, `MedicationRequest`, `MedicationAdministration`, `MedicationDispense`, `Observation`, `DiagnosticReport`, `ServiceRequest`, `Task`, `Procedure`, `DocumentReference`, `Composition`, `ClinicalImpression`, `Communication`, `CarePlan`, `Provenance` ([HL7][3])

So the answer is: **yes, track everything on one patient timeline, but store each type of thing in the correct FHIR resource instead of dumping all events into one generic activity table**. That gives you a page that is standards-aligned underneath and still simple for doctors on top. ([FHIR][6])

The next useful deliverable would be a **field-by-field PRD and wireframe spec** for this page.

[1]: https://hl7.org/fhir/?utm_source=chatgpt.com "HL7 FHIR standard"
[2]: https://healthit.gov/wp-content/uploads/2020/02/BurdenReport.pdf?utm_source=chatgpt.com "Strategy on Reducing Regulatory and Administrative ..."
[3]: https://www.hl7.org/fhir/patient.html "Patient - FHIR v5.0.0"
[4]: https://fhir.hl7.org/fhir/allergyintolerance-definitions.html?utm_source=chatgpt.com "AllergyIntolerance - FHIR v5.0.0"
[5]: https://fhir.hl7.org/fhir/condition.html "Condition - FHIR v5.0.0"
[6]: https://fhir.hl7.org/fhir/event.html?utm_source=chatgpt.com "event - FHIR v5.0.0 - HL7-FHIR-Spezifikation - HL7.org"
[7]: https://www.hl7.org/fhir/encounter.html "Encounter - FHIR v5.0.0"
[8]: https://hl7.org/fhir/medicationrequest.html "MedicationRequest - FHIR v5.0.0"
[9]: https://hl7.org/fhir/observation.html "Observation - FHIR v5.0.0"
[10]: https://hl7.org/fhir/servicerequest.html "ServiceRequest - FHIR v5.0.0"
[11]: https://fhir.hl7.org/fhir/task.html "Task - FHIR v5.0.0"
[12]: https://hl7.org/fhir/procedure.html "Procedure - FHIR v5.0.0"
[13]: https://fhir.hl7.org/fhir/documentreference.html "DocumentReference - FHIR v5.0.0"
[14]: https://hl7.org/fhir/composition.html "Composition - FHIR v5.0.0"
[15]: https://fhir.hl7.org/fhir/clinicalimpression.html "ClinicalImpression - FHIR v5.0.0"
[16]: https://fhir.hl7.org/fhir/communication.html "Communication - FHIR v5.0.0"
[17]: https://fhir.hl7.org/fhir/careplan.html "CarePlan - FHIR v5.0.0"
[18]: https://build.fhir.org/ig/HL7/US-Core/basic-provenance.html "Basic Provenance - US Core Implementation Guide v9.0.0"
[19]: https://build.fhir.org/ig/HL7/US-Core/ValueSet-us-core-clinical-note-type.html "US Core Clinical Note Type - US Core Implementation Guide v9.0.0"
[20]: https://hl7.org/fhir/uv/ips/STU2/Structure-of-the-International-Patient-Summary.html "Structure of the International Patient Summary - International Patient Summary Implementation Guide v2.0.0"
