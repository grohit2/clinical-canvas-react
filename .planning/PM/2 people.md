You’re really asking for one operating model that covers people, teams, schedules, tasks, and access, while staying close enough to FHIR that you can migrate later without redoing the whole database.

The best approach is **not** to make the backend “raw FHIR first.” It is to make the backend **FHIR-aligned**: keep a clean relational/canonical model now, name the data domains the way FHIR thinks about them, and add a mapping layer that can emit FHIR resources later. That gives you a stable operational system now and a lower-risk migration path later. FHIR’s current published core version is **R5 (5.0.0)**, while the current published **US Core** guide is **8.0.1** and is still based on **FHIR R4**; the current published SMART App Launch guide is **2.2.0**, also R4-based, though it says it is compatible across FHIR versions from DSTU2 onward. ([HL7][1])

## 1. The hospital model you should build

Think of the system as 10 connected layers:

```text
Organization hierarchy      -> hospital, campus, service line, department, unit, clinic
Location hierarchy          -> building, floor, ward, room, bed
Healthcare services         -> cardiology, ICU, social work, interpreter, transport, etc.
People                      -> doctors, nurses, residents, students, support staff
Role assignments            -> what each person does, where, for whom, during what period
Care teams                  -> patient team, consult team, on-call team, support team
Schedules / slots           -> shifts, call, clinic sessions, blocked time
Appointments                -> planned booked events
Encounters / episodes       -> actual care events and longitudinal responsibility
Tasks + security/audit      -> consults, routing, access rules, consent, audit, provenance
```

That stack maps cleanly to FHIR resources: `Organization`, `Location`, `HealthcareService`, `Practitioner`, `PractitionerRole`, `CareTeam`, `Schedule`, `Slot`, `Appointment`, `Encounter`, `EpisodeOfCare`, `Task`, `Consent`, `Permission`, `Provenance`, and `AuditEvent`. `CareTeam` is for planned participants in care, `Schedule`/`Slot` is for availability, `Appointment` is for planned bookings, `Encounter.participant` is for who actually provided service, `EpisodeOfCare` is for longer-term responsibility, and `Task` is for work management. ([HL7][2])

## 2. How to organize people

### A. Organization and department structure

Use `Organization` for the business structure: hospital, institute, department, clinic, service line, nursing division, residency program, and unit. FHIR explicitly supports organizational hierarchy with `Organization.partOf`, so you can model:

* Hospital

  * Department of Medicine

    * Cardiology Division

      * CCU Service
  * Department of Surgery
  * Nursing Administration

    * ICU Nursing
    * Med-Surg Nursing

Use `Location` separately for physical places: building, ward, room, bed, virtual clinic, mobile unit. Keep business hierarchy and physical hierarchy separate. For contractors, agency nurses, outsourced labs, radiology groups, HIEs, and community partners, use `OrganizationAffiliation`, not `Organization.partOf`, because those are relationships between distinct organizations, not internal subdivisions. ([HL7][2])

### B. People vs roles

Use `Practitioner` for the person as a person. Use `PractitionerRole` for what that person is doing for a specific organization, at specific locations, for specific services, during a specific time period. That distinction is the single most important design decision in your database. `Practitioner` carries identity and qualifications; `PractitionerRole` carries role, specialty, organization, location, healthcare service, contact, availability, and endpoint. ([HL7][3])

That means:

* **Attending physician** = `Practitioner` + one or more `PractitionerRole`
* **Resident / fellow / intern** = same pattern
* **Nurse / charge nurse / APRN / PA / pharmacist / therapist / social worker** = same pattern
* **Case manager / interpreter / patient navigator / transport coordinator / registration staff** = same pattern if they have formal responsibilities in the care workflow
* **Family member / guardian / private caregiver** = `RelatedPerson`, not `Practitioner` ([HL7][3])

### C. Residents, students, professors, interns

This is where most hospital systems get messy. The clean rule is:

* **One person = one `Practitioner`**
* **Many assignments over time = many `PractitionerRole` records**

So a resident should **not** become a new person every year or every rotation. The same resident gets multiple time-bounded role assignments. FHIR explicitly says `PractitionerRole` is for a specific set of roles/locations/specialties/services for a period of time, and that separate instances should be created when location, service, availability, or other details differ. ([HL7][4])

My recommended internal model:

* **Resident year (PGY1, PGY2, PGY3, chief)** = attribute on `PractitionerRole`, or local extension on the role
* **Rotation** = separate `PractitionerRole` or separate rotation table linked to `PractitionerRole`
* **Supervising attending** = relationship table or team/assignment rule, not a new person type
* **Student** = `Practitioner` + `PractitionerRole` only if they participate in formal workflow
* **Professor** = HR/academic title attribute; do **not** use professor rank as the access role
* **Clinical intern** = usually a trainee role; treat as role/year
* **Non-clinical intern** = workforce role with no patient access by default

A useful extra rule from FHIR: if you have an **open call slot** or **vacant role**, you do not need to create a fake person. FHIR allows a `PractitionerRole` with no specific practitioner attached, which is useful for unfilled night float, open hospitalist slot, or unnamed surgical coverage. ([HL7][4])

## 3. How to organize teams

You asked specifically about **on-call team** and **patient support team**. They should not be modeled the same way.

### A. Patient care team

Use `CareTeam` for the people and organizations planned to participate in the coordination and delivery of care. FHIR says `CareTeam` can be for a patient, a group, or even an event such as a code blue team, and its participants can be `Practitioner`, `PractitionerRole`, `Organization`, `Patient`, `RelatedPerson`, or another `CareTeam`. ([HL7][1])

Recommended team types:

* **Longitudinal team**: PCP, specialist, care coordinator, social worker
* **Encounter team**: the current inpatient medicine team for this admission
* **Consult team**: cardiology consult team, psychiatry consult team
* **Patient support team**: case manager, discharge planner, interpreter, PT/OT
* **Event team**: rapid response, trauma, code blue

For patient care over time, connect `CareTeam` to `EpisodeOfCare`; for care during a stay, connect to `Encounter`; for the actual individuals who really participated, use `Encounter.participant`. `Encounter` is for the actual healthcare interaction, while `Appointment` is for the planned booking. ([HL7][5])

### B. On-call and shift team

Use `Schedule` and `Slot` for call, shifts, and availability. FHIR allows `Schedule.actor` to reference `Practitioner`, `PractitionerRole`, `CareTeam`, `HealthcareService`, or `Location`, which is exactly what you need for hospital staffing. `Slot` gives you the individual shift or availability block, including open, booked, busy, blocked, or overbooked behavior. ([HL7][6])

So your **on-call module** should look like this:

* `CareTeam`: “Cardiology Night Call Team”
* `Schedule`: applied to that care team or to a role like “PGY2 night float cardiology”
* `Slot`: 7pm–7am shift blocks
* `CareTeam.participant` or assignment table: who is covering each slot
* `Task`: actual consults or work items routed to the on-call team ([HL7][1])

### C. Patient support team

Use `HealthcareService` to define the service itself: social work, interpreter services, case management, nutrition, PT, transport, financial counseling. FHIR defines `HealthcareService` as the details of a healthcare service available at a location, provided by an organization, with availability and whether appointment is required. ([HL7][7])

Then use:

* `Task` to request work from the support service
* `requestedPerformer` = `HealthcareService`, `CareTeam`, or `PractitionerRole`
* `owner` = the person/role/team currently responsible
* add the actual person to `CareTeam` once assigned if they become part of the active patient team ([HL7][8])

## 4. Who should manage what

Do not let one department “own everything.” Split the authority by data domain.

### Recommended ownership model

* **HR / Medical Staff Office / Credentialing**

  * legal identity
  * employment status
  * licensure / certifications
  * active/inactive state

* **Graduate Medical Education (GME)**

  * resident/fellow year
  * rotations
  * supervising service
  * trainee status changes

* **Department administration / service line leadership**

  * local role catalog
  * team templates
  * on-call roster approvals
  * coverage rules

* **Nursing administration**

  * nursing unit assignments
  * charge nurse structure
  * float pool mapping

* **Clinical operations / house supervisor**

  * real-time cross-coverage
  * emergency reassignment
  * active on-call activation

* **Privacy / HIM / Compliance**

  * consent exceptions
  * break-glass review
  * audit review

* **IAM / Security**

  * user accounts
  * access policies
  * authentication / tokens
  * logging and monitoring

* **Integration / Interoperability team**

  * FHIR mappings
  * profile governance
  * API publishing
  * migration/testing

The key principle is this: **department managers can approve business need, but they should not directly grant chart permissions**. FHIR itself says it is not a security protocol, assumes an external security system, and does not provide user/profile administration resources. ([HL7][9])

## 5. Access model: what people should be allowed to do

Use **RBAC + ABAC together**, not RBAC alone. FHIR explicitly supports thinking about access in both RBAC and ABAC terms, and says patient-sensitive data often depends on security labels, purpose of use, consent, relationship to patient, user role, location, time, workflow state, and token scope. ([HL7][9])

### My recommended policy pattern

**Directory / workforce data**

* HR, credentialing, GME, nursing admin, department admins: edit the workforce and schedule records they own
* clinicians: read-only staff directory and call roster
* privacy/compliance: read audit and consent metadata
* ordinary managers: no patient chart access by virtue of manager role alone

**Clinical record access**

* **Attending / fellow / chief**: full access to assigned, supervising, and on-call patients within service rules
* **Resident / intern**: access to assigned and cross-cover patients; privileges depend on trainee year and supervision
* **Student**: assigned-patient read access plus draft/pended documentation only
* **Nursing staff**: assignment- and unit-based access to care plan, meds, flowsheets, orders, and relevant notes
* **Patient support staff**: minimum necessary data only for the service being delivered
* **Schedulers / registration**: demographics, appointments, and administrative views, not sensitive full-chart access
* **IT / support**: no routine production chart access; emergency or support access must be exceptional and audited

**ABAC conditions you should enforce**

* active role
* department/service line
* current shift or on-call membership
* patient assignment or care-team membership
* encounter participation
* trainee year
* supervision requirement
* confidentiality label
* purpose of use
* consent restrictions
* emergency override flag

For API access, use OAuth/SMART patterns rather than inventing your own scope model. The SMART guide defines user-launch and backend-service patterns and scope language such as `user/Encounter.rs` and `system/Encounter.rs`. ([HL7][10])

### Consent, Permission, security labels, audit

My advice is:

* use **`Consent`** for patient privacy preferences and restrictions
* use **`meta.security` security labels** on sensitive resources
* keep the main decision engine in your IAM/authorization platform
* use **`Permission`** cautiously as an interoperable policy artifact only where it helps, because in R5 it is Trial Use, maturity 0, and explicitly under development
* always log access with **`AuditEvent`**
* always log authorship/state transitions with **`Provenance`** ([HL7][11])

## 6. Minimal database you should build now

I would build these internal tables first.

### Directory layer

* `organization`
* `organization_affiliation`
* `location`
* `healthcare_service`
* `practitioner`
* `practitioner_qualification`
* `practitioner_role`

### Team and schedule layer

* `care_team`
* `care_team_member`
* `schedule`
* `slot`
* `appointment`

### Patient context layer

* `episode_of_care`
* `encounter`
* `encounter_participant`

### Work layer

* `task`
* `task_note`
* `task_assignment_history`

### Security layer

* `user_account`
* `policy_role`
* `access_rule`
* `consent_record`
* `permission_record` (optional, future-facing)
* `audit_event`
* `provenance_record`

Use FHIR-style field names where possible: `identifier`, `active`, `status`, `period`, `code`, `specialty`, `partOf`, `actor`, `owner`, `requestedPerformer`, `managingOrganization`, `meta.security`, `lastUpdated`. That makes transformation much easier later. The resource structure and versioning guidance in FHIR are built around consistent resource/version metadata, profiles, and declared capabilities. ([HL7][4])

## 7. How to stay FHIR-aligned without a FHIR-native backend

This is the practical migration plan.

### Phase 1: Canonical model and governance

Define your local code systems and master IDs for:

* role
* trainee year
* supervision level
* team category
* shift type
* purpose of use
* confidentiality level
* department/service line

Do not wait for the FHIR API to do this.

### Phase 2: Workforce master

Stand up:

* organization hierarchy
* locations
* services
* practitioners
* qualifications
* practitioner roles
* resident rotation logic

This gives you the hospital directory and staffing model first.

### Phase 3: Team and call coverage

Add:

* care team templates
* shift/on-call schedules
* slots
* vacancy/open-role handling
* escalation chain

This gives you working on-call and support rosters.

### Phase 4: Patient assignment and tasking

Add:

* episode-based and encounter-based team assignment
* consult routing
* support service queues
* acceptance / reassignment / completion workflow using `Task`

### Phase 5: Security and audit

Integrate:

* SSO / IdP
* OAuth / SMART-style token model
* RBAC + ABAC policy engine
* consent restrictions
* security labels
* audit/provenance capture

### Phase 6: FHIR façade and migration readiness

Only after the above is stable:

* publish FHIR resource mappings
* validate generated resources
* add profiles/extensions
* publish a `CapabilityStatement`
* tag resources with version/profile metadata
* run migration/export tests

FHIR’s own versioning guidance says version can be declared via `CapabilityStatement`, MIME-type `fhirVersion`, or version-specific profiles, and that implementers should design for multiple versions over time. ([HL7][12])

## 8. The version strategy I would use

Because you said migration matters, this is the safest strategy:

* **Internal model**: FHIR-aligned, resource-based, version-tagged
* **External interoperability (U.S.)**: plan first for **US Core + SMART**, because current published US Core is R4-based and includes profiles for `CareTeam`, `Encounter`, `Organization`, `Practitioner`, `PractitionerRole`, and `Provenance`
* **Operational staffing/schedule/task features**: use core FHIR resources plus your own local profiles/extensions, because the full hospital staffing model goes beyond what US Core standardizes today ([HL7][13])

## Bottom line

For a teaching hospital, I would organize it like this:

* **Person** = `Practitioner`
* **Assignment/privilege context** = `PractitionerRole`
* **Department hierarchy** = `Organization`
* **Physical unit/bed/room** = `Location`
* **Service catalog** = `HealthcareService`
* **Patient/shift/event team** = `CareTeam`
* **On-call roster** = `Schedule` + `Slot` on a `CareTeam` or `PractitionerRole`
* **Actual care participants** = `Encounter.participant`
* **Longitudinal responsibility** = `EpisodeOfCare`
* **Consults / work queues / support requests** = `Task`
* **Privacy / exceptions** = `Consent` + labels
* **Audit / authorship** = `AuditEvent` + `Provenance` ([HL7][1])

The single most important operational rule is: **resident year, student status, professor title, and temporary rotation belong on top of a stable person record, usually through role assignments and policy attributes, not by creating separate person types all over the database**.

The next useful step is turning this into a concrete schema and access matrix for your specific hospital departments.

[1]: https://hl7.org/fhir/careteam.html "https://hl7.org/fhir/careteam.html"
[2]: https://hl7.org/fhir/organization.html "https://hl7.org/fhir/organization.html"
[3]: https://hl7.org/fhir/practitioner.html "https://hl7.org/fhir/practitioner.html"
[4]: https://hl7.org/fhir/practitionerrole.html "https://hl7.org/fhir/practitionerrole.html"
[5]: https://hl7.org/fhir/episodeofcare.html "https://hl7.org/fhir/episodeofcare.html"
[6]: https://hl7.org/fhir/schedule.html "https://hl7.org/fhir/schedule.html"
[7]: https://hl7.org/fhir/healthcareservice.html "https://hl7.org/fhir/healthcareservice.html"
[8]: https://hl7.org/fhir/task.html "https://hl7.org/fhir/task.html"
[9]: https://hl7.org/fhir/security.html "https://hl7.org/fhir/security.html"
[10]: https://www.hl7.org/fhir/smart-app-launch/ "https://www.hl7.org/fhir/smart-app-launch/"
[11]: https://www.hl7.org/fhir/consent.html "https://www.hl7.org/fhir/consent.html"
[12]: https://hl7.org/fhir/versioning.html "https://hl7.org/fhir/versioning.html"
[13]: https://hl7.org/fhir/us/core/STU8.0.1/index.html "https://hl7.org/fhir/us/core/STU8.0.1/index.html"
