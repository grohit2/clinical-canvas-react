# 06 - Outreach Health Camps

**Module:** Outreach Camps & Patient Registration
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart BLoC/model classes
**BLoCs:** OutreachCampsBloc, PatientRegistrationBloc, AadharBloc
**Services:** OutreachCampsService, OutreachCampsRepo

---

## 1. Camp Lifecycle

### State Machine

```
NOT_STARTED ──→ IN_PROGRESS ──→ DONE
     │
     └──→ CANCELLED
```

### CampStatus Enum

| Value | Description |
|-------|-------------|
| `NOT_STARTED` | Camp created but not yet active |
| `IN_PROGRESS` | Camp actively running, patient registration open |
| `DONE` | Camp completed, no further registrations |
| `CANCELLED` | Camp cancelled before or during execution |

Transition rules:
- Only `NOT_STARTED` camps can be started (→ `IN_PROGRESS`)
- Only `IN_PROGRESS` camps can be completed (→ `DONE`)
- `CANCELLED` and `DONE` are terminal states
- Starting a camp triggers `StartCampEvent` in `OutreachCampsBloc`

---

## 2. CampModel

```dart
class CampModel {
  String? campId;
  String? campName;
  String? campCode;
  String? campScheduleId;
  String? campScheduleCode;
  String? campScheduleStatus;     // maps to CampStatus enum
  List<CoordinatorModel>? coordinatorDTOList;
  List<ConsultantModel>? consultants;
  int? consultantCount;
  String? status;                  // CampStatus enum value
}
```

### ConsultantModel

```dart
class ConsultantModel {
  String? id;
  String? login;
  String? displayName;
  String? firstName;
  String? lastName;
  String? employeeNo;
  String? designation;
  String? department;
  String? status;
  String? mobileNo;
}
```

### CoordinatorModel

```dart
class CoordinatorModel {
  String? id;
  String? login;
  String? displayName;
  String? firstName;
  String? lastName;
  String? employeeNo;
  String? designation;
  String? department;
  String? status;
  String? mobileNo;
}
```

Note: `CoordinatorModel` has a `fromJsonForSearch` factory variant used when parsing coordinator search results (different JSON key mapping from the standard `fromJson`).

---

## 3. Patient Registration Flow

### Step-by-Step Sequence

```
1. MPI Search (/mpi/api/search/patients)
       │
       ▼
2. Patient Type Detection
       │
       ├── Existing patient found
       │       │
       │       ▼
       │   3a. Eligibility Checks
       │       ├── Is patient blocked?    → Error: "Cannot select blocked MRN patient"
       │       ├── Is patient deceased?   → Error: "Cannot select deceased MRN patient"
       │       └── Is patient merged?     → Error: "Cannot select merged MRN patient"
       │       │
       │       ▼
       │   4a. Duplicate Prevention
       │       └── Already registered in this camp? → Error: "Patient already registered"
       │
       └── No patient found
               │
               ▼
           3b. New Patient Creation
                   │
                   ▼
4. Doctor Assignment (MANDATORY)
       │
       ▼
5. Camp Assignment (with duplicate check)
       │
       ▼
6. Aadhaar KYC (optional, controlled by remote config)
       │
       ▼
7. Document Upload
       │
       ▼
8. Temp ID Generation (/prm/api/outreach/temp-numbers)
```

### PatientRegistrationRequestModel

```dart
class PatientRegistrationRequestModel {
  String? campId;
  String? campScheduleId;
  String? patientId;
  String? patientMrn;
  String? patientFirstName;
  String? patientMiddleName;
  String? patientLastName;
  String? patientName;         // computed/display name
  String? gender;
  String? dateOfBirth;
  String? mobileNo;
  String? email;
  String? consultantId;
  String? consultantName;
  String? address;
  String? city;
  String? state;
  String? district;
  String? country;
  String? zipcode;
  String? aadhaarNumber;
  String? document_front_image;   // base64 or file path (not aadhaarFrontImage)
  String? document_back_image;    // base64 or file path (not aadhaarBackImage)
  String? tempNumber;             // generated temp ID
  String? patientType;            // NEW or EXISTING
}
```

---

## 4. Aadhaar KYC Integration

### Provider: Veri5 Digital

**Screen:** `AadharAuthScreen`
**BLoC:** `AadharBloc`
**Result Model:** `AadhaarResultModel`

### Flow

```
1. Check remote config: enable_aadhaar_registration
       │
       ├── false → Skip Aadhaar, proceed to registration
       │
       └── true
               │
               ▼
2. Capture Aadhaar Front Side
       │   - Camera or gallery
       │   - Format: JPG or PNG only
       │   - Max size: 5 MB
       │
       ▼
3. Capture Aadhaar Back Side
       │   - Front must be captured first
       │   - Same format/size constraints
       │
       ▼
4. Submit to Veri5 Digital for verification
       │
       ▼
5. Receive AadhaarResultModel
       │
       ▼
6. Populate patient fields from KYC result
```

### Validation Rules

| Rule | Error Message |
|------|---------------|
| Front side required before back | "Please capture Aadhaar front side first" |
| Invalid format | "Only JPG and PNG formats are supported" |
| File too large | "File size must not exceed 5 MB" |
| KYC verification failed | "Aadhaar verification failed" |

### Remote Config Flag

```
enable_aadhaar_registration: bool (default: false)
```

When `false`, the entire Aadhaar KYC step is bypassed in the patient registration flow.

---

## 5. Address Hierarchy

### Cascade Order

```
Country → State → District → City → Zipcode
```

Each level is a cascading dropdown. Selecting a parent level filters the child options.

### API

```
GET /mdm/api/_search/zipcodes
```

Query parameters filter by parent selections:
- `country` → returns available states
- `state` → returns available districts
- `district` → returns available cities
- `city` → returns available zipcodes

All address fields populate from the hierarchy; free-text entry is not supported for structured address components.

---

## 6. Coordinator Management

### Rules

- Minimum 1 coordinator required per camp at all times
- Coordinators can be added or removed
- Removing the last coordinator is blocked with validation error

### UpdateCoordinatorRequest

```dart
class UpdateCoordinatorRequest {
  String? campId;
  String? campScheduleId;
  List<CoordinatorModel>? coordinators;
  String? action;   // "ADD" or "REMOVE"
}
```

### API

```
PUT /prm/api/outreach-camp/update/coordinators
```

---

## 7. Camp APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/prm/api/outreach-health-camps` | GET | Fetch list of camps |
| `/prm/api/outreach/patients` | GET | Fetch patients registered in a camp |
| `/prm/api/outreach/patients` | POST | Register a patient to a camp |
| `/prm/api/outreach/temp-numbers` | POST | Generate temporary patient ID |
| `/prm/api/outreach-camp/create/work-pattern` | POST | Create camp work pattern/schedule |
| `/prm/api/outreach-camp/update/coordinators` | PUT | Add/remove coordinators |
| `/amb/api/_create/appointments/external` | POST | Create external appointment for camp patient |
| `/mpi/api/search/patients` | POST | Search Master Patient Index |
| `/mdm/api/_search/zipcodes` | GET | Address hierarchy lookup |

---

## 8. BLoC Architecture

### OutreachCampsBloc

```
Events:
  ├── FetchOutreachCamps
  ├── StartCampEvent
  └── FetchCampPatientsEvent

States:
  ├── OutreachCampsInitial
  ├── OutreachCampsLoading
  ├── OutreachCampsLoaded
  ├── OutreachCampsError
  ├── StartCampStateLoading
  ├── StartCampStateSuccess
  ├── StartCampStateError4
  ├── FetchCampPatientsStateLoading
  ├── FetchCampPatientsStateSuccess
  └── FetchCampPatientsStateError
```

**Event → State transitions:**

| Event | Loading State | Success State | Error State |
|-------|---------------|---------------|-------------|
| `FetchOutreachCamps` | `OutreachCampsLoading` | `OutreachCampsLoaded` | `OutreachCampsError` |
| `StartCampEvent` | `StartCampStateLoading` | `StartCampStateSuccess` | `StartCampStateError4` |
| `FetchCampPatientsEvent` | `FetchCampPatientsStateLoading` | `FetchCampPatientsStateSuccess` | `FetchCampPatientsStateError` |

### PatientRegistrationBloc

```
Events:
  ├── SearchPatientEvent
  ├── RegisterPatientEvent
  ├── FetchConsultants
  ├── SearchCoOrdinatorEvent
  ├── UpdateCoOrdinatorEvent
  └── SearchZipCodesEvent

States:
  ├── PatientRegistrationInitialState
  ├── PatientRegistrationLoadingState
  ├── PatientRegistrationSuccessState
  ├── PatientRegistrationFailureState
  ├── SearchPatientLoading
  ├── SearchPatientSuccess
  ├── SearchPatientFailure
  ├── FetchConsultantsLoading
  ├── FetchConsultantsSuccess
  ├── FetchConsultantsFailure
  ├── SearchCoOrdinatorsStateLoading
  ├── SearchCoOrdinatorsStateSuccess
  ├── SearchCoOrdinatorsStateError
  ├── UpdateCoOrdinatorsStateLoading
  ├── UpdateCoOrdinatorsStateSuccess
  ├── UpdateCoOrdinatorsStateError
  ├── SearchZipCodeLoading
  ├── SearchZipCodeSuccess
  └── SearchZipCodeError
```

**Event → State transitions:**

| Event | Loading State | Success State | Error State |
|-------|---------------|---------------|-------------|
| `SearchPatientEvent` | `SearchPatientLoading` | `SearchPatientSuccess` | `SearchPatientFailure` |
| `RegisterPatientEvent` | `PatientRegistrationLoadingState` | `PatientRegistrationSuccessState` | `PatientRegistrationFailureState` |
| `FetchConsultants` | `FetchConsultantsLoading` | `FetchConsultantsSuccess` | `FetchConsultantsFailure` |
| `SearchCoOrdinatorEvent` | `SearchCoOrdinatorsStateLoading` | `SearchCoOrdinatorsStateSuccess` | `SearchCoOrdinatorsStateError` |
| `UpdateCoOrdinatorEvent` | `UpdateCoOrdinatorsStateLoading` | `UpdateCoOrdinatorsStateSuccess` | `UpdateCoOrdinatorsStateError` |
| `SearchZipCodesEvent` | `SearchZipCodeLoading` | `SearchZipCodeSuccess` | `SearchZipCodeError` |

---

## 9. Validation Messages

| # | Message | Trigger |
|---|---------|---------|
| 1 | "Cannot select blocked MRN patient" | Patient status is BLOCKED |
| 2 | "Cannot select deceased MRN patient" | Patient status is DECEASED |
| 3 | "Cannot select merged MRN patient" | Patient MRN has been merged |
| 4 | "Patient already registered" | Duplicate camp registration attempt |
| 5 | "Please select a consultant" | Doctor assignment missing (mandatory) |
| 6 | "Please enter patient name" | Name field empty |
| 7 | "Please enter mobile number" | Mobile field empty |
| 8 | "Please enter valid mobile number" | Mobile format invalid |
| 9 | "Please select gender" | Gender not selected |
| 10 | "Please enter date of birth" | DOB field empty |
| 11 | "Please select country" | Country not selected in address |
| 12 | "Please select state" | State not selected in address |
| 13 | "Please capture Aadhaar front side first" | Back capture attempted before front |
| 14 | "Only JPG and PNG formats are supported" | Invalid Aadhaar image format |
| 15 | "File size must not exceed 5 MB" | Aadhaar image exceeds 5 MB |
| 16 | "Camp schedule has ended" | Registration attempted on ended camp |
| 17 | "No camps available" | No camps found for user/facility |

---

## 10. Screen Flow

```
OutreachHealthCampsScreen
    │
    ├── Camp list (CampWidgetItem for each)
    │       │
    │       ▼
    │   CampScreen (camp details)
    │       │
    │       ├── Start Camp button (NOT_STARTED only)
    │       │
    │       ├── CampDetailScreen
    │       │       └── Camp metadata, schedule, coordinators
    │       │
    │       └── ManageCoordinatorsSheet
    │               └── Add/remove coordinators
    │
    └── OutreachPatientsScreen
            │
            ├── Patient list (PatientCardWidget for each)
            │       │
            │       ▼
            │   PatientDetailsScreen
            │       └── View/edit patient details
            │
            ├── PatientRegistrationScreen
            │       │
            │       ├── MPI search
            │       ├── Patient form (firstName, middleName, lastName, DOB, gender, mobile, address)
            │       ├── Consultant selection
            │       └── AadharAuthScreen (if enabled)
            │               └── Front/back capture → Veri5 verification
            │
            └── EditPatientDetailsScreen (/editPatient route)
                    └── Edit existing patient registration details
```

---

## 11. Additional Models (Verified from Binary)

| Model | Description |
|-------|-------------|
| `SearchPatientModel` | MPI patient search result model |
| `CampPatientsModel` | Patients registered in a camp |
| `ZipcodeModel` | Zipcode data for address hierarchy |
| `CountryModel` | Country in address hierarchy |
| `StateModel` | State in address hierarchy |
| `DistrictModel` | District in address hierarchy |
| `CityModel` | City in address hierarchy |
| `AddressModel` / `AddressDTO` | Full address data transfer object |
| `OutreachCamp` | Core camp model variant |
| `AadharImageSide` | Enum/model for front/back Aadhaar image side |
