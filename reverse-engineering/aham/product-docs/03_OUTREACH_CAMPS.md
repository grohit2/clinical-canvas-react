# AHAM - Outreach Health Camps

Narayana Health conducts free or subsidized health camps in underserved communities. The Outreach module in AHAM lets coordinators manage every aspect of these camps -- from setup to patient registration -- directly from their mobile device, even in areas with poor connectivity.

---

## Table of Contents

1. [Camp Lifecycle](#camp-lifecycle)
2. [Camp List Screen](#camp-list-screen)
3. [Camp Detail Screen](#camp-detail-screen)
4. [Patient Registration Flow](#patient-registration-flow)
5. [Aadhaar KYC Flow](#aadhaar-kyc-flow)
6. [Address Cascading](#address-cascading)
7. [Coordinator Management](#coordinator-management)
8. [Validations](#validations)
9. [User Journeys](#user-journeys)

---

## Camp Lifecycle

Every health camp moves through three stages:

```
+------------------+        +------------------+        +------------------+
|                  |        |                  |        |                  |
|   NOT STARTED    +------->+   IN PROGRESS    +------->+      DONE        |
|                  |        |                  |        |                  |
|  Camp created,   |        |  Camp is live,   |        |  Camp completed, |
|  date set,       |  Start |  patients being  |  End   |  all data        |
|  doctors and     +------->+  registered,     +------->+  submitted,      |
|  coordinators    |        |  screenings      |        |  reports ready   |
|  assigned        |        |  happening       |        |                  |
|                  |        |                  |        |                  |
+------------------+        +------------------+        +------------------+
```

| Stage | What Coordinators Can Do |
|-------|------------------------|
| **Not Started** | View camp details, add/remove doctors and coordinators, prepare logistics |
| **In Progress** | Register patients, record screenings, update patient information |
| **Done** | View summary and patient list (read-only), generate reports |

---

## Camp List Screen

The main Outreach screen shows a list of all camps the coordinator is involved with.

```
+--------------------------------------------------+
|  OUTREACH CAMPS                                   |
|                                                   |
|  +----------------------------------------------+ |
|  | Anantapur Community Health Camp               | |
|  | Date: 20 Mar 2026                             | |
|  | Location: Anantapur District, AP              | |
|  | Status: IN PROGRESS                           | |
|  | Patients Registered: 47                       | |
|  | Doctors: 3 | Coordinators: 2                  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Tumkur Village Screening Camp                 | |
|  | Date: 25 Mar 2026                             | |
|  | Location: Tumkur District, KA                 | |
|  | Status: NOT STARTED                           | |
|  | Patients Registered: 0                        | |
|  | Doctors: 2 | Coordinators: 1                  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Mysuru Cardiac Screening                      | |
|  | Date: 10 Mar 2026                             | |
|  | Location: Mysuru, KA                          | |
|  | Status: DONE                                  | |
|  | Patients Registered: 112                      | |
|  | Doctors: 4 | Coordinators: 3                  | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

---

## Camp Detail Screen

Tapping a camp card opens the full detail view with three sections.

```
+--------------------------------------------------+
|  ANANTAPUR COMMUNITY HEALTH CAMP                  |
|  Status: IN PROGRESS                              |
|                                                   |
|  ================================================ |
|  CAMP INFORMATION                                 |
|  ================================================ |
|  Date        : 20 Mar 2026                        |
|  Location    : Anantapur District, AP             |
|  Facility    : NH Anantapur Unit                  |
|  Camp Type   : General Health Screening           |
|                                                   |
|  ================================================ |
|  DOCTORS (3)                                      |
|  ================================================ |
|  +----------------------------------------------+ |
|  | Dr. Venkat Rao        Cardiology              | |
|  | Dr. Meena Kumari      General Medicine        | |
|  | Dr. Suresh Nair       Pediatrics              | |
|  +----------------------------------------------+ |
|                                                   |
|  ================================================ |
|  COORDINATORS (2)                                 |
|  ================================================ |
|  +----------------------------------------------+ |
|  | Anand Kumar           Primary Coordinator     | |
|  | Lakshmi S.            Field Coordinator       | |
|  +----------------------------------------------+ |
|  [ + Add Coordinator ]                            |
|                                                   |
|  ================================================ |
|  PATIENTS REGISTERED (47)                         |
|  ================================================ |
|  +----------------------------------------------+ |
|  | Ramaiah G.    M/52    MRN: NH-2026-C-001      | |
|  | Savitri B.    F/38    MRN: NH-2026-C-002      | |
|  | Nagaraj K.    M/67    MRN: NH-2026-C-003      | |
|  | ... (44 more)                                 | |
|  +----------------------------------------------+ |
|  [ + Register New Patient ]                       |
|                                                   |
+--------------------------------------------------+
```

---

## Patient Registration Flow

When a coordinator taps "Register New Patient," the app follows a structured decision tree to either find the patient in the existing database or create a new record.

```
                    +------------------------+
                    |  + Register New Patient |
                    +----------+-------------+
                               |
                               v
                    +------------------------+
                    |  SEARCH EXISTING       |
                    |  PATIENT               |
                    |                        |
                    |  Enter: Name, Phone,   |
                    |  MRN, or Aadhaar       |
                    +----------+-------------+
                               |
                   +-----------+-----------+
                   |                       |
                   v                       v
          +--------+--------+    +---------+-------+
          |  PATIENT FOUND  |    |  NOT FOUND      |
          |                 |    |                  |
          |  Show matching  |    |  "No matching   |
          |  records        |    |   patient found" |
          +--------+--------+    +---------+-------+
                   |                       |
                   v                       v
          +--------+--------+    +---------+-------+
          |  SELECT PATIENT |    |  CREATE NEW     |
          |  from results   |    |  PATIENT RECORD |
          +--------+--------+    +---------+-------+
                   |                       |
                   v                       v
          +--------+---------------------+-+
          |  ELIGIBILITY CHECK              |
          |                                 |
          |  Is the patient eligible for    |
          |  this camp type?                |
          +-----------+----------+----------+
                      |          |
                 Yes  |          | No
                      v          v
             +--------+--+  +---+-----------+
             | REGISTER   |  | SHOW ERROR    |
             | for camp   |  | "Patient not  |
             |            |  |  eligible for |
             | Add to     |  |  this camp    |
             | patient    |  |  type"        |
             | list       |  |               |
             +------------+  +---------------+
```

### Search Screen

```
+--------------------------------------------------+
|  SEARCH PATIENT                                   |
|                                                   |
|  Search by:                                       |
|  +----------------------------------------------+ |
|  | Name, Phone, MRN, or Aadhaar Number          | |
|  +----------------------------------------------+ |
|                                                   |
|  [ Search ]                                       |
|                                                   |
|  Results:                                         |
|  +----------------------------------------------+ |
|  | Ramaiah G.     M / Age 52                     | |
|  | Phone: 98765-43210                            | |
|  | MRN: NH-2019-45678                            | |
|  | [ Select ]                                    | |
|  +----------------------------------------------+ |
|  +----------------------------------------------+ |
|  | Ramaiah K.     M / Age 34                     | |
|  | Phone: 87654-32109                            | |
|  | MRN: NH-2022-11234                            | |
|  | [ Select ]                                    | |
|  +----------------------------------------------+ |
|                                                   |
|  Patient not in the list?                         |
|  [ + Create New Patient ]                         |
+--------------------------------------------------+
```

### New Patient Registration Form

```
+--------------------------------------------------+
|  NEW PATIENT REGISTRATION                         |
|                                                   |
|  Personal Details                                 |
|  -----------------------------------------------  |
|  First Name *      : [                         ]  |
|  Last Name *       : [                         ]  |
|  Gender *          : [ Male / Female / Other   ]  |
|  Date of Birth *   : [  DD / MM / YYYY         ]  |
|  Phone *           : [                         ]  |
|  Email             : [                         ]  |
|                                                   |
|  Identity                                         |
|  -----------------------------------------------  |
|  Aadhaar Number    : [                         ]  |
|  [ Scan Aadhaar Card ] (opens camera)             |
|                                                   |
|  Address                                          |
|  -----------------------------------------------  |
|  Country *         : [ India                   v]  |
|  State *           : [ Select State            v]  |
|  District *        : [ Select District         v]  |
|  City *            : [ Select City             v]  |
|  Pincode *         : [                         ]  |
|  Address Line 1    : [                         ]  |
|  Address Line 2    : [                         ]  |
|                                                   |
|  [ Register Patient ]                             |
+--------------------------------------------------+
```

---

## Aadhaar KYC Flow

For identity verification, AHAM supports Aadhaar card scanning using the device camera. The app uses AI-based text extraction to auto-fill the registration form.

```
Step 1                  Step 2                  Step 3
SCAN FRONT              SCAN BACK               AI EXTRACTION
                                                 + AUTO-FILL

+----------------+      +----------------+      +----------------+
|                |      |                |      |                |
|   AADHAAR      |      |                |      |  Extracting... |
|                |      |   AADHAAR      |      |                |
|  Photo  Name   |      |                |      |  Name: Ramaiah |
|  DOB    Gender |      |  Address       |      |  DOB: 12/05/74 |
|  Aadhaar No.   |      |  QR Code       |      |  Gender: Male  |
|                |      |                |      |  Aadhaar: XXXX |
|  [ Capture ]   |      |  [ Capture ]   |      |  Address: ...  |
|                |      |                |      |                |
+----------------+      +----------------+      +----------------+
        |                       |                       |
        v                       v                       v
  Camera opens            Camera opens            Form fields are
  Align front of          Align back of           auto-populated
  Aadhaar card            Aadhaar card            Staff reviews
  in frame                in frame                and corrects
                                                  if needed
```

### Step-by-Step:

1. **Tap "Scan Aadhaar Card"** on the registration form
2. **Camera opens** -- position the FRONT of the Aadhaar card within the guide frame
3. **Tap Capture** -- the app photographs the front
4. **Camera flips to BACK** -- position the back of the card
5. **Tap Capture** -- the app photographs the back
6. **AI processes both images** -- extracts name, date of birth, gender, Aadhaar number, and address
7. **Form auto-fills** -- the extracted data populates the registration form fields
8. **Staff reviews** -- verify the extracted data is correct, make corrections if needed
9. **Continue with registration** -- submit the form

If the camera cannot read the card clearly (blurry photo, damaged card), the staff member can manually enter the details instead.

---

## Address Cascading

The address fields use a cascading dropdown system. Each selection narrows down the options for the next field.

```
  Country        State           District         City            Pincode
  --------       ----------      -----------      ---------       --------
  [ India  v] -> [ Karnataka v] -> [ Mysuru   v] -> [ Mysuru  v] -> [ 570001 ]
                                                     [ Nanjangud]    [ 571301 ]
                                                     [ T Narsipur]   [ 571124 ]

  [ India  v] -> [ Andhra Pr v] -> [ Anantapur v] -> [ Anantapur] -> [ 515001 ]
                                                      [ Guntakal ]   [ 515801 ]
                                                      [ Dharmavaram]  [ 515671 ]
```

**How it works:**
1. Select **Country** (default: India)
2. **State** dropdown loads states for the selected country
3. Select **State** -- **District** dropdown loads districts for that state
4. Select **District** -- **City** dropdown loads cities for that district
5. Enter or select **Pincode**

Each dropdown only shows valid options based on the previous selection. If you change State, District and City reset to empty.

---

## Coordinator Management

Each camp requires at least one coordinator. Coordinators are the on-ground staff who manage camp logistics and register patients.

### Adding a Coordinator

```
+--------------------------------------------------+
|  ADD COORDINATOR                                  |
|                                                   |
|  Search staff member:                             |
|  +----------------------------------------------+ |
|  | [Type name or employee ID]                   | |
|  +----------------------------------------------+ |
|                                                   |
|  Results:                                         |
|  +----------------------------------------------+ |
|  | Lakshmi S.    Employee ID: NH-EMP-5567       | |
|  | Department: Outreach                         | |
|  | [ + Add as Coordinator ]                     | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### Removing a Coordinator

A coordinator can be removed from a camp, but at least one coordinator must always remain assigned.

```
+--------------------------------------------------+
|  COORDINATORS (2)                                 |
|                                                   |
|  +----------------------------------------------+ |
|  | Anand Kumar         Primary     [ Remove ]   | |
|  +----------------------------------------------+ |
|  +----------------------------------------------+ |
|  | Lakshmi S.          Field       [ Remove ]   | |
|  +----------------------------------------------+ |
|                                                   |
|  If you try to remove the last coordinator:       |
|                                                   |
|  +----------------------------------------------+ |
|  |  "Cannot remove. A camp must have at least   | |
|  |   one coordinator assigned."                 | |
|  |                                              | |
|  |                    [ OK ]                    | |
|  +----------------------------------------------+ |
+--------------------------------------------------+
```

---

## Validations

All rules stated in plain English:

### Camp Rules
- A camp must have **at least one coordinator** at all times
- A camp must have **at least one doctor** assigned
- Camp status can only move forward: Not Started -> In Progress -> Done (no going back)
- Once a camp is marked "Done," no new patients can be registered

### Patient Registration Rules
- **First Name** is required
- **Last Name** is required
- **Gender** is required
- **Date of Birth** is required and must be a valid past date
- **Phone number** is required and must be a valid Indian mobile number (10 digits)
- **Country, State, District, and City** are all required
- **Pincode** is required and must be a valid 6-digit Indian postal code
- If the patient already exists in the system (matched by phone or Aadhaar), the app shows the existing record instead of creating a duplicate
- A patient cannot be registered for the same camp twice

### Aadhaar Rules
- Both front and back of the card must be scanned
- If AI extraction fails, manual entry is allowed
- Aadhaar number must be exactly 12 digits
- The scanned Aadhaar data can be edited by the staff member before submitting

---

## User Journeys

### Journey 1: Running a Health Camp Day

**Scenario:** Coordinator Anand Kumar arrives at the Anantapur Community Health Camp location at 8 AM. He needs to start the camp and begin registering patients.

```
Step 1: Anand opens AHAM and taps "Outreach Camps"
        |
        v
Step 2: He sees the Anantapur camp card
        Status: NOT STARTED
        He taps to open it
        |
        v
Step 3: He reviews the camp details:
        - 3 doctors assigned (all present)
        - 2 coordinators (himself + Lakshmi)
        - Patient list is empty
        |
        v
Step 4: He taps "Start Camp"
        Status changes to IN PROGRESS
        The "Register New Patient" button
        becomes active
        |
        v
Step 5: Patients begin arriving
        A line forms at the registration desk
        Anand taps "Register New Patient"
        |
        v
Step 6: First patient: Ramaiah, age 52
        Anand searches by phone number
        No existing record found
        He taps "Create New Patient"
        |
        v
Step 7: Anand fills in the registration form:
        - Name, DOB, Gender, Phone
        - Scans Aadhaar card (front + back)
        - AI auto-fills address fields
        - He verifies and taps "Register"
        |
        v
Step 8: Ramaiah appears in the patient list
        "Patients Registered: 1"
        |
        v
Step 9: Anand repeats for each patient
        By end of day: 47 patients registered
        |
        v
Step 10: At 5 PM, all screenings are done
         Anand taps "End Camp"
         Status changes to DONE
         The patient list becomes read-only
```

**Total time:** Full day event, registration takes ~3 minutes per patient

---

### Journey 2: Registering a Patient with Aadhaar

**Scenario:** Coordinator Lakshmi is registering Savitri, a 38-year-old woman who has her Aadhaar card with her. Lakshmi uses the card scan to speed up registration.

```
Step 1: Lakshmi taps "Register New Patient"
        |
        v
Step 2: She searches by name "Savitri"
        No matching records found
        She taps "Create New Patient"
        |
        v
Step 3: The blank registration form opens
        Instead of typing everything manually,
        she taps "Scan Aadhaar Card"
        |
        v
Step 4: Camera opens with a guide frame
        Savitri holds up the FRONT of her card
        Lakshmi aligns it and taps "Capture"
        |
        v
Step 5: Camera prompts for the BACK
        Savitri flips the card
        Lakshmi aligns and taps "Capture"
        |
        v
Step 6: The app processes both images
        A loading indicator shows "Extracting..."
        After 3-4 seconds, the form auto-fills:

        First Name  : Savitri
        Last Name   : Basappa
        Gender      : Female
        DOB         : 15/08/1988
        Aadhaar     : XXXX-XXXX-3456
        Country     : India
        State       : Andhra Pradesh
        District    : Anantapur
        City        : Anantapur
        Pincode     : 515001
        |
        v
Step 7: Lakshmi reviews the extracted data
        The name and DOB look correct
        She adds the phone number manually
        (not on the Aadhaar card): 98765-43210
        |
        v
Step 8: She taps "Register Patient"
        |
        v
Step 9: Success! Savitri appears in the camp's
        patient list
        "Patients Registered: 2"
        |
        v
Step 10: Lakshmi calls the next person in line
```

**Total time:** ~2 minutes (vs ~4 minutes for fully manual entry)

---

*Previous: [Chat Conversations](./02_CHAT_CONVERSATIONS.md) | Next: [Platform & Settings](./04_PLATFORM_SETTINGS.md)*
