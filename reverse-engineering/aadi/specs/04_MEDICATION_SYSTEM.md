# AADI App - Medication & Orders System

**Source:** `aadi_src/src/app/pages/medication-*/` and `services/medication*/`

---

## 1. Order Status Lifecycle

```
ADDED ──→ ORDERED ──→ PENDING ──→ DISPENSED ──→ ISSUED ──→ CLOSED
  │                                    │              │
  │                              PARTIALLY_      PARTIALLY_    PARTIALLY_
  │                              DISPENSED        ISSUED        CLOSED
  │
  └──→ (DELETE)     ORDERED ──→ CANCELLED / REJECTCED

Actions by status:
  ADDED    → Edit, Delete (EHR_021 DELETE)
  ORDERED  → Cancel (EHR_026 PUT)
  ACTIVE   → Stop (EHR_118), Hold (EHR_114), Unhold (EHR_113)
  Others   → View only
```

---

## 2. Medication Order Creation Flow

### Step-by-Step

```
1. ENTRY POINT (3 contexts)
   ├── orderFrom === 'ML' → Inpatient medication ordering
   ├── orderFrom === 'DS' → Discharge summary medications
   └── orderFrom === 'PN' → Progress notes medications

2. DATA LOADING (parallel)
   ├── getFrequencyList()    → EHR_023 or api/drug-frequencies
   ├── getMedicationRoute()  → EHR_025 (key: concept.medicationOrder.route)
   ├── getFoodInstruction()  → EHR_025 (key: concept.medicationOrder.foodInstruction)
   ├── getDurationUnit()     → EHR_025 (key: concept.medicationOrder.durationUnit)
   ├── getpreFixItemList()   → MDM_001 (valueSetCode: MEDICATION_INSTRUCTION_PREFIX)
   └── loadFavourites()      → EHR_024 (consultant login, type=medication-order)

3. SEARCH MEDICATION
   → Min 3 characters
   → EHR_020 (medType: BRAND or GENERIC, hscId, searchText)
   → Or direct: api/_search/medication-order-records/hscItems

4. SELECT → Opens dosage modal (MedicationOrderAddDosagePage)

5. CONFIGURE DOSAGE
   ├── Frequency selection
   ├── Dosage input (predefined or custom)
   ├── Duration + unit
   ├── Route
   ├── Food instructions
   └── Patient instructions

6. ADD TO ORDER LIST (can add multiple)

7. SUBMIT
   ├── ML: Swipe gesture → api/medication-order-record-action
   ├── DS: Swipe to sync → same API
   └── PN: Button click → return to progress notes (no direct save)
```

### Submit Payload

```typescript
{
    concept: {
        medicationOrder: [ /* array of MedicationOrder objects */ ]
    },
    action: 'ADD_AND_ORDER',
    mrn: string,
    encounterNumber: string,
    actionBy: string    // consultant login
}
```

---

## 3. Dosage Configuration

### Frequency Options

| Code | Name | Frequency | Day Distribution (M-A-E-N) |
|------|------|-----------|---------------------------|
| OID | Once Daily | 1 | dose-0-0-0 |
| BID | Twice Daily | 2 | dose-0-0-dose |
| TID | Thrice Daily | 3 | dose-dose-0-dose |
| QID | Four Times | 4 | dose-dose-dose-dose |
| NTID | As Needed | 11 | 0-0-0-0 (qty=1) |
| Custom | Via modal | N | User-configured per slot |

### Drug Form Dosage Options

| Drug Form | Predefined Doses | Unit |
|-----------|-----------------|------|
| TABLET | 0.5 (half), 1 (full) | tablet |
| CAPSULE | 1 (fixed) | capsule |
| SYRUP | 2.5, 5, 7.5, 10 | ml |
| Custom numeric | Any value via input | mg/ml/etc |

### Custom Dosage (medication-order-custom-dosage.page.ts)

Per-session dose entry with fractional support:
```
Progression: 0 → 1/4 → 1/2 → 1 → 2 → 3 → ...
Storage format: "1-1/2-1-0" (Morning-Afternoon-Evening-Night)
```

### Quantity Calculation

```
totalPerDay = morning + afternoon + evening + night
quantity = ceil(totalPerDay * duration)
Exception: SYRUP → quantity always = 1 (bottle)
```

### Configuration-Driven Behavior

```
MDM_002 query: key=Medication_Dosage_Format
  → 'NUMERIC': Show numeric input field
  → Other: Show predefined dose buttons (half/full/ml options)

Hierarchy: System (applicableType:system) → Global (applicableType:global) → Unit (applicableType:unit)
```

---

## 4. Medication Data Model

```typescript
interface MedicationOrder {
    id?: string;
    medication: {
        code: string;              // Drug code
        name: string;              // Drug name
        brand?: boolean;           // true=Brand, false=Generic
        drugForm?: string;         // TABLET / CAPSULE / SYRUP / INJECTION
        availableStock?: number;
        itemGroup?: string;        // PH (Pharmacy)
    };
    daywiseDosage: {
        morning: number | string;
        afternoon: number | string;
        evening: number | string;
        night: number | string;
        unit?: string;             // mg, ml, etc.
    };
    drugFrequency: {
        id: number;
        code: string;              // OID, BID, TID, NTID
        name: string;              // Display name
        frequency: number;         // Times per day
        dailyIntake: number;
        description: string;
        period: number;
        periodUnit: { id: number; code: string; display: string; };
        active: boolean;
    };
    duration: number;
    durationUnit: string;          // DAYS / WEEKS / MONTHS
    quantity: number;
    route?: string;                // Oral, IV, IM, SC, Topical
    foodInstruction?: string;      // After Food, Before Food, etc.
    instructions?: string;         // Pharmacy instructions
    patientInstruction?: string;   // Patient-specific instructions
    reasonToOrder?: string;
    generatedInstruction?: string; // Auto-generated instruction text
    prescriptionDate: string;      // YYYY-MM-DD
    endDate?: string;
    noOfRepeatAllowed: number;     // Refill count
    isDischargeMedication: boolean;
    substitution: { allowed: boolean; };
    status: MedicationStatus;
}

type MedicationStatus = 'ADDED' | 'ORDERED' | 'PENDING' | 'DISPENSED' |
    'PARTIALLY_DISPENSED' | 'ISSUED' | 'PARTIALLY_ISSUED' |
    'CLOSED' | 'PARTIALLY_CLOSED' | 'CANCELLED' | 'REJECTCED';
```

---

## 5. IV / Infusion Medications

**Page:** `add-medication-on-category-wise.page.ts`

Additional fields for IV medications:
```typescript
{
    selectedDrugForm: string,      // mg or ml selection
    dilutantType: string,          // Dextrose, NS (Normal Saline), 0.45% DNS
    dilutingDoseUnits: string[],   // From EHR: getIODilutantDoseUnit()
    flowRateSOS: number,           // Flow rate for stat/SOS
    totalDilutedVolume: number,    // Total volume after dilution
    flowRateMin: number | null,    // Minimum flow rate
    timeSlots: string[],           // Administration time slots
    sosType: 'Regular' | 'Continuous',
    infDaywiseDosageObj: { morning, afternoon, evening, night }  // Separate from oral dosage
}
```

---

## 6. Medicine Card & Timeline

### Legend Indicators

| Code | Legend | Color | Meaning |
|------|--------|-------|---------|
| R | Refuse | Red | Patient refused medication |
| M | Modify | Orange | Order modified |
| W | Withhold | Yellow | Temporarily withheld |
| S | Stopped | Gray | Permanently stopped |
| V | Vomited | Red | Patient vomited after admin |
| A | Allergy | Red | Allergy reported |
| ! | Overdue | Orange | Dose overdue |

### 4-Slot Timeline View

```
Morning (00:00-06:00)  → assets/early-morning.svg
Noon    (06:00-12:00)  → assets/noon.svg
Evening (12:00-18:00)  → assets/mid-evening.svg
Night   (18:00-24:00)  → assets/late-night.svg
```

### Slot Status Colors

| Status | Color | Visual |
|--------|-------|--------|
| ADMINISTERED (no vomit) | #2FB7B1 (teal) | White checkmark |
| PENDING / PENDING_REVIEW | #F1F1F1 (gray) | Blank |
| OVERDUE | #FCCFCF (light red) | "!" badge |
| HOLD | — | "W" badge |
| ADMINISTERED + vomited | — | "V" badge |

### Progress Bar

24-hour bar divided by administration slots:
- Segment width = `(durationHours / 24) * 100%`
- Segment position = `(slotStartHour / 24) * 100%`
- Only shown if `mode.code !== 'REGULAR'`

---

## 7. Drug Safety Features

### Drug Monograph
```
EHR_115 GET → drugCode
Response: HTML blob (rendered in WebView)
```

### Drug Interaction Check
```
EHR_119 GET → encounter, mrn
Response: Interaction warnings
```

### Look-Alike / Sound-Alike (LASA) Warning
- Icon indicator in medication card
- Flags medications with similar names/appearances

---

## 8. Medication Reconciliation

### Flow
```
1. Get reconciled list → EHR_106 GET (encounterNumber, size=500)
2. Get current list → EHR_019 GET (encounterNumber, size=500)
3. Create reconciliation → EHR_107 POST
4. Update reconciliation → EHR_107 PUT
5. Order reconciled records → EHR_108 POST (idArray)
```

---

## 9. Swipe Gesture for Order Submission

**Implementation:** Touch event handlers

```typescript
touchstart() → record start position
touchmove()  → calculate swipe distance
  → 30% swiped: show "Swipe to order" (light feedback)
  → 60% swiped: show "Medication Ordered" (full color)
touchend()   → if >= 60%: execute order
```

Context-specific labels:
- ML (Medication List): "Swipe to order"
- DS (Discharge Summary): "Swipe to sync"
- PN (Progress Notes): Button click "Add" (no swipe)

---

## 10. API Endpoints Summary

| Operation | Direct REST | ATHMA Code |
|-----------|-------------|------------|
| Search medications | `api/_search/medication-order-records/hscItems` | EHR_020 |
| Get favorites | `api/_search/medication-fav-service` | EHR_024 |
| Save order | `api/medication-order-record-action` | — |
| Create in EHR | — | EHR_021 POST |
| Update in EHR | — | EHR_021 PUT |
| Delete draft | — | EHR_021 DELETE |
| Cancel order | — | EHR_026 PUT |
| Get frequencies | `api/drug-frequencies` | EHR_023 |
| Get concept values | — | EHR_025 |
| Active medications | `api/_search/active-medication-order-records` | — |
| Stop medication | — | EHR_118 PUT |
| Hold medication | — | EHR_114 PUT |
| Unhold medication | — | EHR_113 PUT |
| Drug monograph | — | EHR_115 |
| Drug interactions | — | EHR_119 |
| Reconcile list | — | EHR_106 |
| Reconcile create/update | — | EHR_107 |
| Order reconcile | — | EHR_108 |
| Card timings | — | EHR_168 |
| Unit config | `api/medication-enabled/{unitCode}` | MDM_002 |

---

## 11. Validation Rules

```
- Search: minimum 3 characters
- Duplicate check: checkifOrderExists() before adding
- Duration: > 0 for non-SOS medications
- At least 1 medication required before save
- Patient discharge check before submit
- Network connectivity check before API calls
- ATHMA token TTL check (5-hour expiry)
```
