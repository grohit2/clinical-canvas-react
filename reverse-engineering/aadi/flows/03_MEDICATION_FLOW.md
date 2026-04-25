# Flow 03: Medication Management System

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `medication-orders.page.ts`, `medication-order-list.page.ts`, `medication-order-add-dosage.page.ts`, `medication-order-custom-dosage.page.ts`, `medication-order-frequency.page.ts`, `current-medication-dashboard.page.ts`, `current-medication-order-list.page.ts`, `medicine-reconciliation.page.ts`, `add-medication-on-category-wise.page.ts`, `add-medication-order-category-wise.page.ts`, `medicine-card-popups.page.ts`, `medication-list.page.ts`, `medication.service.ts`, `medication-order.service.ts`

---

## 1. Overview

The Medication system is the most feature-dense clinical workflow in AADI. It spans 10 page components and 2 services, coordinating ~30 ATHMA API endpoints to handle the full lifecycle of medication ordering -- from search and dosage configuration through administration tracking on a 24-hour timeline. The system supports 5 medication categories (Regular, SOS, Infusion, Narcotic, STAT), 3 ordering contexts (Inpatient, Discharge Summary, Progress Notes), and specialized workflows for medicine reconciliation, fractional dosing, IV/infusion configuration, and swipe-to-order gestures.

### 1.1 Component Dependency Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        MEDICATION SYSTEM                                   │
│                                                                            │
│  ┌─────────────────────────┐    ┌──────────────────────────────────────┐   │
│  │ medication.service.ts   │    │ medication-order.service.ts          │   │
│  │ (Direct REST calls)     │    │ (ATHMA proxy - EHR/MDM endpoints)   │   │
│  │ - search medications    │    │ - ATHMA token management (5hr TTL)  │   │
│  │ - favorites CRUD        │    │ - order CRUD                        │   │
│  │ - drug interactions     │    │ - reconciliation                    │   │
│  └──────────┬──────────────┘    │ - dashboard data                    │   │
│             │                   │ - stop/hold/resume/cancel            │   │
│             │                   └──────────┬───────────────────────────┘   │
│             │                              │                              │
└─────────────┼──────────────────────────────┼──────────────────────────────┘
              │                              │
              ▼                              ▼
┌────────────────────────┐      ┌─────────────────────────────────┐
│  Spring Boot Backend   │      │  ATHMA EHR Gateway               │
│  (REST API)            │      │  (proxied via /api/athma-proxy)  │
│                        │      │  - EHR_019..EHR_169              │
│                        │      │  - MDM_001, MDM_002              │
└────────────────────────┘      └─────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

```
MedicationOrdersPage (entry: existing orders grouped by date)
  │
  ├── MedicationOrderListPage (ML context: inpatient ordering)
  │     ├── MedicationOrderAddDosagePage (standard dosage config)
  │     │     ├── MedicationOrderFrequencyPage (extended frequency picker)
  │     │     ├── MedicationOrderCustomDosagePage (fractional 1/4, 1/2)
  │     │     └── CommonModalPage (route, unit, durationUnit pickers)
  │     └── (swipe-to-order → EHR_021 POST)
  │
CurrentMedicationDashboardPage (24-hour timeline, 5 categories)
  ├── CurrentMedicationOrderListPage (quick add from dashboard)
  ├── MedicineReconciliationPage (admission reconciliation)
  │     └── AddMedicationOnCategoryWisePage (reconciliation dosage)
  ├── MedicationOrderListPage (DS context: discharge medications)
  └── MedicineCardPopupsPage (stop/withhold/cancel/details modal)

MedicationListPage (legacy: search+order from chat context)
```

### 1.3 Three Ordering Contexts

| Context Code | Full Name | Where Used | Description |
|---|---|---|---|
| `ML` | Medication List | `MedicationOrdersPage` → `MedicationOrderListPage` | Standard inpatient medication ordering |
| `DS` | Discharge Summary | `CurrentMedicationDashboardPage` → `MedicationOrderListPage` | Discharge medication ordering with sync |
| `PN` | Progress Notes | `PatientChatPage` → `MedicationOrderListPage` | Ordering from within progress notes |

### 1.4 Five Medication Categories

| Category | Display Name | Icon/Color | Notes |
|---|---|---|---|
| `Regular` | Regular | Default | Standard scheduled medications |
| `SOS` | SOS (PRN) | Alert style | As-needed; sub-types: Regular, Continuous |
| `Infusion` | Infusion / IV | IV drip icon | Requires dilutant, flow rate, time slots |
| `Narcotic` | Narcotic | Controlled | Controlled substance handling |
| `STAT` | STAT | Urgent flag | One-time immediate administration |

---

## 2. Medication Search & Selection

### 2.1 Search Flow

```
User types in search bar (min 3 chars)
         │
         ▼
┌─────────────────────────────────────────────┐
│  Toggle: [BRAND] / [GENERIC]                │
│  searchType = "BRAND" (default) | "GENERIC" │
└──────────────┬──────────────────────────────┘
               │
               ▼
  ATHMA EHR_020 GET /medications/search
  ?searchTerm={query}&searchType={BRAND|GENERIC}
  &encounterId={encounterId}
               │
               ▼
  ┌─────────────────────────────────┐
  │  Response: Array<Medication>    │
  │  {                              │
  │    code: "MED-12345",           │
  │    name: "Paracetamol 500mg",   │
  │    genericName: "Acetaminophen",│
  │    drugForm: "TABLET",          │
  │    strength: "500mg",           │
  │    manufacturer: "Cipla"        │
  │  }                              │
  └──────────────┬──────────────────┘
                 │
                 ▼
  Results rendered as scrollable list
  User taps a medication → added to draft orders array
```

**Debounce:** Search input is debounced (typically 300ms) to prevent excessive API calls during typing.

**Minimum character enforcement:**
```typescript
if (searchTerm.length < 3) {
  // Do not call API; show "Type at least 3 characters"
  return;
}
```

### 2.2 Favorites

Clinicians can save frequently-ordered medications as favorites for quick access without searching.

```
ATHMA EHR_024 GET /medications/favorites
  ?userId={currentUserId}
         │
         ▼
  ┌───────────────────────────────────┐
  │  Favorites list displayed above   │
  │  search results (or in tab)       │
  │  User taps → added to draft       │
  └───────────────────────────────────┘
```

**Adding a favorite:**
```
ATHMA EHR_024 POST /medications/favorites
Body: { userId, medication: { code, name, ... } }
```

**Removing a favorite:**
```
ATHMA EHR_024 DELETE /medications/favorites/{favoriteId}
```

### 2.3 Duplicate Detection

Before adding a medication to the draft order list, the system checks for duplicates:

```typescript
// Check if medication already exists in current draft orders
const isDuplicate = draftOrders.some(
  order => order.medication.code === selectedMedication.code
);

if (isDuplicate) {
  // Show toast: "This medication is already in your order list"
  return;
}
```

Additionally, the system may check against active inpatient medications to warn about therapeutic duplicates. This check uses the medication `code` field as the unique identifier.

---

## 3. Dosage Configuration

### 3.1 MedicationOrderAddDosagePage -- Standard Dosage

This is the primary dosage configuration screen, opened after selecting a medication from the order list.

#### Screen Layout

```
┌──────────────────────────────────────────────┐
│  [<] Paracetamol 500mg Tablet                │
├──────────────────────────────────────────────┤
│                                              │
│  FREQUENCY                                   │
│  ┌────────┐ ┌────────┐ ┌────────┐            │
│  │ Once   │ │ Twice  │ │ Thrice │            │
│  │ Daily  │ │ Daily  │ │ Daily  │            │
│  ├────────┤ ├────────┤ ├────────┤            │
│  │ Four   │ │ As     │ │ More   │ ← opens   │
│  │ times  │ │ needed │ │ ▸      │  frequency │
│  └────────┘ └────────┘ └────────┘  picker    │
│                                              │
│  DOSE                                        │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ 0.25 │ │ 0.5  │ │  1   │ │  2   │        │
│  └──────┘ └──────┘ └──────┘ └──────┘        │
│  [Custom ▸]  ← opens CustomDosagePage        │
│                                              │
│  DAY-WISE DISTRIBUTION                       │
│  ┌───────┬───────┬───────┬───────┐           │
│  │ Morn  │ Aftn  │ Even  │ Night │           │
│  │  1    │  0    │  0    │  0    │  ○ select │
│  │  0    │  1    │  0    │  0    │  ○        │
│  │  0    │  0    │  1    │  0    │  ○        │
│  │  0    │  0    │  0    │  1    │  ○        │
│  └───────┴───────┴───────┴───────┘           │
│                                              │
│  DURATION                                    │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │
│  │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │ │ 7 │ │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ │
│  [Custom] days                               │
│  Duration Unit: [Days ▼] [Weeks] [Months]    │
│                                              │
│  ROUTE:  [Oral ▼]                            │
│  FOOD:   [After Food ▼]                      │
│  REFILL: [0 ▼] (0-4+)                        │
│                                              │
│  Prescription Date: [2026-04-22]             │
│  End Date:          [2026-04-29]  (auto)     │
│                                              │
│  Qty: 7 tablet(s)  (auto-calculated)         │
│                                              │
│  Instruction: "Once Daily (1-0-0-0) tablet   │
│    Oral After Food For 7 Days"               │
│                                              │
│             [SAVE]                            │
└──────────────────────────────────────────────┘
```

### 3.2 Frequency Options

The primary frequency picker offers 6 quick-select options. The "More" option opens `MedicationOrderFrequencyPage` with the full list from `EHR_023`.

| Button Label | Frequency Code | Daily Intake | Day-Wise Slots |
|---|---|---|---|
| Once Daily | OID | 1 | 1 non-zero slot |
| Twice Daily | BID | 2 | 2 non-zero slots |
| Thrice Daily | TID | 3 | 3 non-zero slots |
| Four times daily | QID | 4 | 4 non-zero slots |
| As needed | PRN/SOS | varies | No slot validation |
| More... | (opens picker) | varies | Per frequency definition |

**Extended Frequencies (from EHR_023):**

```
ATHMA EHR_023 GET /medications/drug-frequencies
         │
         ▼
  Returns: Array<DrugFrequency>
  [
    { code: "OID", display: "Once Daily", dailyIntake: 1 },
    { code: "BID", display: "Twice Daily", dailyIntake: 2 },
    { code: "TID", display: "Thrice Daily", dailyIntake: 3 },
    { code: "QID", display: "Four times daily", dailyIntake: 4 },
    { code: "FID", display: "Five times daily", dailyIntake: 5 },
    { code: "SID", display: "Six times daily", dailyIntake: 6 },
    { code: "STAT", display: "Immediately", dailyIntake: 1 },
    { code: "NTID", display: "Nightly", dailyIntake: 1 },
    { code: "QHS", display: "At bedtime", dailyIntake: 1 },
    { code: "Q4H", display: "Every 4 hours", dailyIntake: 6 },
    { code: "Q6H", display: "Every 6 hours", dailyIntake: 4 },
    { code: "Q8H", display: "Every 8 hours", dailyIntake: 3 },
    { code: "Q12H", display: "Every 12 hours", dailyIntake: 2 },
    ...
  ]
```

**Dosage-disabled frequencies:** For FID, SID, STAT, and NTID frequency codes, the day-wise distribution picker is disabled. These frequencies have pre-defined intake patterns that do not map cleanly to the Morning-Afternoon-Evening-Night model.

### 3.3 Day-Wise Distribution Auto-Generation

When a frequency and dose are selected, the system auto-generates all valid distribution permutations across 4 time slots: Morning (M), Afternoon (A), Evening (E), Night (N).

```
Input: frequency=OID, dose=1

Generate permutations where exactly 1 slot is non-zero:
  [1, 0, 0, 0]  →  "1 - 0 - 0 - 0"   (morning only)
  [0, 1, 0, 0]  →  "0 - 1 - 0 - 0"   (afternoon only)
  [0, 0, 1, 0]  →  "0 - 0 - 1 - 0"   (evening only)
  [0, 0, 0, 1]  →  "0 - 0 - 0 - 1"   (night only)
```

**Distribution matrix by frequency:**

| Frequency | Non-zero slots | Example permutations (dose=1) |
|---|---|---|
| Once Daily (OID) | 1 of 4 | `[1,0,0,0]` `[0,1,0,0]` `[0,0,1,0]` `[0,0,0,1]` |
| Twice Daily (BID) | 2 of 4 | `[1,0,0,1]` `[1,0,1,0]` `[0,1,0,1]` `[1,1,0,0]` `[0,1,1,0]` `[0,0,1,1]` |
| Thrice Daily (TID) | 3 of 4 | `[1,1,0,1]` `[1,1,1,0]` `[1,0,1,1]` `[0,1,1,1]` |
| Four times (QID) | 4 of 4 | `[1,1,1,1]` |

**Validation:** The number of non-zero slots in the selected distribution MUST equal the `dailyIntake` count of the selected frequency. If a user tries to submit a mismatch, the system blocks with a validation error.

### 3.4 Dose Options

Predefined dose buttons: `0.25`, `0.5`, `1`, `2`

If none of these match the clinician's needs, the "Custom" button opens `MedicationOrderCustomDosagePage` for fractional entry.

### 3.5 Drug Form to Unit Mapping

The unit of measure is automatically determined from the medication's `drugForm`:

| Drug Form | Default Unit | Display |
|---|---|---|
| `TABLET` | tablet | "tablet(s)" |
| `CAPSULE` | capsule | "capsule(s)" |
| `SYRUP` | ml | "ml" |
| `INHALER` | puff | "puff(s)" |
| `POWDER` | scoop | "scoop(s)" |
| `INJECTION` | ml | "ml" |
| `DROPS` | drop | "drop(s)" |
| `OINTMENT` | application | "application(s)" |
| `CREAM` | application | "application(s)" |

The unit can be overridden via the unit picker (opens `CommonModalPage` with values from `EHR_025`).

### 3.6 Duration & Duration Unit

**Quick-select buttons:** 1 through 7 (days by default)

**Duration units** (from `EHR_025 concept: durationUnit`):
- Days (multiplier: 1)
- Weeks (multiplier: 7)
- Months (multiplier: 30)

**Custom duration:** For values > 7, a numeric input field allows free entry.

**Validation:** Duration must be > 0 for all frequencies except SOS/PRN.

### 3.7 Quantity Auto-Calculation

The total quantity to dispense is automatically calculated using:

```
frequency = morning + afternoon + evening + night
daysConversion = duration × unitMultiplier

where unitMultiplier:
  DAYS   → 1
  WEEKS  → 7
  MONTHS → 30

quantity = Math.ceil(frequency × daysConversion)
```

**Example:**
```
Medication: Paracetamol 500mg
Distribution: [1, 0, 0, 1]  (morning + night)
Duration: 7 Days

frequency = 1 + 0 + 0 + 1 = 2
daysConversion = 7 × 1 = 7
quantity = ceil(2 × 7) = 14 tablets
```

**Example with weeks:**
```
Distribution: [0.5, 0, 0, 0.5]
Duration: 2 Weeks

frequency = 0.5 + 0 + 0 + 0.5 = 1
daysConversion = 2 × 7 = 14
quantity = ceil(1 × 14) = 14 tablets
```

### 3.8 Route & Food Instruction

**Route** (from `EHR_025 concept: route`):
- Oral, Sublingual, Topical, Intravenous, Intramuscular, Subcutaneous, Inhalation, Rectal, etc.
- Default: Oral (for tablets/capsules), Topical (for creams/ointments)
- If user selects "Select Route" placeholder, the value is cleaned to `null` before submission.

**Food Instruction:**
- Before Food
- After Food
- With Food
- Empty Stomach
- Not Applicable

### 3.9 Refill Count

Numeric picker: 0 (no refills), 1, 2, 3, 4, or custom entry for higher values. Relevant primarily for outpatient/discharge prescriptions.

### 3.10 Prescription & End Date

- **Prescription Date:** Defaults to current date. Editable via date picker.
- **End Date:** Auto-calculated as `prescriptionDate + duration` (adjusted for duration unit). Editable; if manually changed, duration is back-calculated.
- **Validation:** End date must be >= prescription date.

---

## 4. Custom / Fractional Dosage

### 4.1 MedicationOrderCustomDosagePage

This page allows per-slot (Morning/Afternoon/Evening/Night) fractional dose entry using a cycling mechanism.

#### Screen Layout

```
┌──────────────────────────────────────────┐
│  [<] Custom Dosage                       │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐    │
│  │        MORNING                    │    │
│  │     ┌──────────────┐              │    │
│  │     │      1       │  ← tap to   │    │
│  │     │              │    cycle     │    │
│  │     └──────────────┘              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │        AFTERNOON                  │    │
│  │     ┌──────────────┐              │    │
│  │     │      0       │              │    │
│  │     └──────────────┘              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │        EVENING                    │    │
│  │     ┌──────────────┐              │    │
│  │     │     1/2      │              │    │
│  │     └──────────────┘              │    │
│  └──────────────────────────────────┘    │
│                                          │
│  ┌──────────────────────────────────┐    │
│  │        NIGHT                      │    │
│  │     ┌──────────────┐              │    │
│  │     │     1/4      │              │    │
│  │     └──────────────┘              │    │
│  └──────────────────────────────────┘    │
│                                          │
│             [DONE]                       │
└──────────────────────────────────────────┘
```

### 4.2 Cycling Logic

Each slot is independently tappable. Each tap cycles through values in this sequence:

```
Tap sequence:  1/4 → 1/2 → 0 → 1 → 2 → 3 → 4 → 5 → ... → 1/4 (wraps)

Internal values:
  "1/4" → 0.25
  "1/2" → 0.50
  "0"   → 0
  "1"   → 1
  "2"   → 2
  ...
```

**Display mapping:**

| Internal Value | Display |
|---|---|
| 0 | `0` |
| 0.25 | `1/4` |
| 0.50 | `1/2` |
| 1 | `1` |
| 2 | `2` |
| 3+ | integer |

### 4.3 Return Value

When the user taps "Done", the page returns a string in the format:

```
"morning-afternoon-evening-night"
```

**Examples:**
- `"1-0-0.5-0.25"` means 1 in morning, none afternoon, half evening, quarter night
- `"0-0-0-2"` means 2 at night only

The calling page (`MedicationOrderAddDosagePage`) parses this string, updates the distribution display, and recalculates the quantity.

---

## 5. Swipe-to-Order Gesture

### 5.1 Overview

The swipe-to-order gesture is used in both `MedicationOrderListPage` and `MedicineReconciliationPage`. It provides a deliberate two-threshold confirmation to prevent accidental order submissions.

### 5.2 Touch Event Implementation

```
┌─────────────────────────────────────────────────────┐
│  Medication Card                                     │
│  ┌─────────────────────────────────────────────────┐ │
│  │ Paracetamol 500mg                               │ │
│  │ 1-0-0-1 | Oral | After Food | 7 Days           │ │
│  │                                                  │ │
│  │  ══════════════▶  "Swipe to order"              │ │
│  │                     (at 30%)                     │ │
│  │  ══════════════════════════▶  "Confirmed!"      │ │
│  │                               (at 60%)          │ │
│  │  ══════════════════════════════════▶  SUBMIT     │ │
│  │                                      (>60%)     │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 5.3 Threshold Logic

The gesture is tracked via `touchstart`, `touchmove`, and `touchend` events on the card element:

```typescript
// On touchstart
startX = event.touches[0].clientX;

// On touchmove
currentX = event.touches[0].clientX;
deltaX = currentX - startX;
cardWidth = cardElement.offsetWidth;
swipePercent = (deltaX / cardWidth) * 100;

if (swipePercent >= 30 && swipePercent < 60) {
  // Visual state 1: show "Swipe to order" label
  // Background color transitions to light green
  feedbackLabel = "Swipe to order";
} else if (swipePercent >= 60) {
  // Visual state 2: show "Confirmed!" label
  // Background color transitions to solid green
  feedbackLabel = "Confirmed!";
  // Haptic feedback (if available)
}

// On touchend
if (swipePercent >= 60) {
  // SUBMIT the order
  submitMedicationOrder(medication);
} else {
  // Snap back to original position with animation
  resetCardPosition();
}
```

### 5.4 Visual Feedback During Swipe

| Swipe % | Background | Label | Haptic |
|---|---|---|---|
| 0-29% | Default (white) | None | None |
| 30-59% | Light green gradient | "Swipe to order" | None |
| 60-100% | Solid green | "Confirmed!" | Short vibration |
| Release at 60%+ | Submission animation | Checkmark | Success vibration |
| Release at <60% | Snap-back animation | None | None |

### 5.5 Order Submission on Swipe

When the swipe threshold is met and finger lifted:

```
ATHMA EHR_021 POST /medications/orders
Body: {
  encounterId: "...",
  patientId: "...",
  medication: { code, name, drugForm, ... },
  dosage: {
    morning: 1, afternoon: 0, evening: 0, night: 1,
    frequency: { code: "BID", display: "Twice Daily" },
    dose: 1,
    unit: "tablet"
  },
  duration: 7,
  durationUnit: "DAYS",
  route: "Oral",
  foodInstruction: "After Food",
  quantity: 14,
  prescriptionDate: "2026-04-22",
  endDate: "2026-04-29",
  refillCount: 0,
  instruction: "Twice Daily (1-0-0-1) tablet Oral After Food For 7 Days",
  orderContext: "ML",
  status: "ORDERED"
}
```

---

## 6. 24-Hour Timeline Dashboard

### 6.1 CurrentMedicationDashboardPage -- Overview

This is the most visually complex page in the medication system. It renders a 24-hour medication administration timeline organized by the 5 medication categories, with real-time status tracking for each dose slot.

#### Screen Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [<] Current Medications          [◀ Apr 21] Apr 22 [Apr 23 ▶] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Patient: Mr. Ravi Kumar  Ht: 175cm  Wt: 72kg               │
│           BMI: 23.5  BSA: 1.87 m²                            │
│                                                              │
│  ┌─ Category Tabs ──────────────────────────────────────┐    │
│  │ [Regular(12)] [SOS(3)] [Infusion(2)] [Narco(1)]     │    │
│  │ [STAT(1)] [Stopped(4)]                               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  REGULAR MEDICATIONS                                         │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  ┌─ Paracetamol 500mg ──────────────────────────────────┐   │
│  │                                                       │   │
│  │  Timeline (24h):                                      │   │
│  │  ├─6am──┤──8am──┤──10am──┤──12pm──┤──2pm──┤──NOW──┤  │   │
│  │  │ ✓    │       │        │  ✓     │       │  ●    │  │   │
│  │  │ DONE │       │        │  DONE  │       │ PEND  │  │   │
│  │  ├──────┴───────┴────────┴────────┴───────┴───────┤  │   │
│  │                                                       │   │
│  │  M: 1 (✓ 8:00)  A: 0  E: 1 (pending)  N: 1          │   │
│  │                                                       │   │
│  │  [⋯ More] [Stop] [Hold]                              │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Amoxicillin 250mg ──────────────────────────────────┐   │
│  │  ...similar card...                                   │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  INFUSION MEDICATIONS                                        │
│  ──────────────────────────────────────────────────────────  │
│                                                              │
│  ┌─ Normal Saline 0.9% ─────────────────────────────────┐   │
│  │  Rate: 100 ml/hr                                      │   │
│  │  Progress: [████████████░░░░░░░] 65% (650/1000 ml)    │   │
│  │  Time remaining: ~3.5 hrs                             │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────┐  ┌───────────────────────────────┐    │
│  │  [+ Order]        │  │  [Reconciliation]              │    │
│  └──────────────────┘  └───────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Data Loading

On page entry, multiple parallel API calls fetch dashboard data:

```
┌──────────────────────────────────────────┐
│           Page Load (ionViewWillEnter)    │
└──────────┬───────────────────────────────┘
           │
           ├─→ EHR_056: Current medications by date
           │   GET /medications/current?date={selectedDate}
           │   &encounterId={encounterId}
           │
           ├─→ EHR_168: Medication card timings
           │   GET /medications/card-timings
           │   ?encounterId={encounterId}
           │
           ├─→ EHR_169: Patient vitals
           │   GET /patients/{patientId}/vitals
           │   ?encounterId={encounterId}
           │
           └─→ MDM_001: Value sets (category display order)
               GET /value-sets?code=CategoryDisplayOrder

All responses merged into dashboard state
```

### 6.3 Category Organization with IntersectionObserver

The dashboard uses `IntersectionObserver` to track which category section is currently visible as the user scrolls, updating the highlighted category tab accordingly.

```typescript
// Setup IntersectionObserver for category section tracking
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Update active category tab based on visible section
        this.activeCategory = entry.target.getAttribute('data-category');
      }
    });
  },
  {
    root: this.contentContainer.nativeElement,
    threshold: 0.3,  // 30% visible triggers activation
    rootMargin: '-50px 0px 0px 0px'
  }
);

// Observe each category section
['Regular', 'SOS', 'Infusion', 'Narcotic', 'STAT', 'Stopped'].forEach(cat => {
  const section = document.getElementById(`category-${cat}`);
  if (section) observer.observe(section);
});
```

**Behavior:** As the user scrolls through medications grouped by category, the top category tab bar automatically highlights the currently visible category. Tapping a category tab scrolls to that section using `scrollIntoView({ behavior: 'smooth' })`.

### 6.4 Timeline Rendering

Each medication card includes a horizontal 24-hour timeline. The timeline is rendered as a horizontal scrollable container with hour markers and dose slot indicators.

**Time period defaults** (used if EHR_168 returns no data):

| Period | Start Hour | End Hour | Icon Color |
|---|---|---|---|
| Morning | 6:00 | 11:00 | Yellow (#FFD700) |
| Afternoon | 11:00 | 15:00 | Orange (#FFA500) |
| Evening | 15:00 | 20:00 | Purple (#800080) |
| Night | 20:00 | 6:00 (+1) | Purple (#4B0082) |

**Current time indicator:** A vertical red line marks the current time position. On page load, the timeline auto-scrolls to center the current time indicator in view.

```typescript
// Auto-scroll to current time
const now = new Date();
const currentHour = now.getHours() + now.getMinutes() / 60;
const scrollPosition = (currentHour / 24) * timelineWidth;
timelineContainer.scrollLeft = scrollPosition - (containerWidth / 2);
```

### 6.5 Slot Status Colors

Each dose administration slot is colored based on its status:

| Status | Color | Hex | Description |
|---|---|---|---|
| `OVERDUE` | Pink/Red | `#FCCFCF` | Scheduled time has passed, not administered |
| `PENDING` | Light Gray | `#F1F1F1` | Scheduled but time not yet reached |
| `ADMINISTERED` | Teal/Green | `#2FB7B1` | Successfully administered by nurse |
| `WITHHELD` | Yellow | `#FFF3CD` | Temporarily held/withheld |
| `STOPPED` | Red | `#DC3545` | Permanently stopped |

### 6.6 Infusion Progress Calculation

For infusion medications, the dashboard shows a real-time progress bar:

```typescript
// Infusion progress calculation
const ratePerHour: number = infusion.ratePerHour;      // e.g., 100 ml/hr
const mlPerMinute: number = ratePerHour / 60;           // e.g., 1.667 ml/min
const totalVolume: number = infusion.totalVolume;        // e.g., 1000 ml
const givenTillNow: number = infusion.givenTillNow;     // from API, e.g., 650 ml

const completedPercent: number = (givenTillNow / totalVolume) * 100;
// e.g., (650 / 1000) * 100 = 65%

const remainingVolume: number = totalVolume - givenTillNow;
const remainingMinutes: number = remainingVolume / mlPerMinute;
const remainingHours: number = remainingMinutes / 60;
// e.g., 350 / 1.667 = 210 min = 3.5 hours
```

**Progress bar rendering:**
```
[████████████████░░░░░░░░░] 65%
 650 ml / 1000 ml | ~3.5 hrs remaining | Rate: 100 ml/hr
```

### 6.7 Date Navigation

Users can navigate between days to view historical or future medication schedules:

```
[◀ Previous Day]  April 22, 2026  [Next Day ▶]
```

Each date change triggers a fresh `EHR_056` call with the new date parameter.

---

## 7. Medication Actions

### 7.1 Action Overview

From the `CurrentMedicationDashboardPage` or `MedicineCardPopupsPage`, clinicians can perform the following actions on active medications:

```
┌───────────────────────────────────────────┐
│  Medication Action Menu                    │
│                                            │
│  [Stop]        - Permanently discontinue   │
│  [Withhold]    - Temporarily hold          │
│  [Resume]      - Resume held medication    │
│  [Cancel]      - Cancel ordered (not given)│
│  [Monograph]   - View drug information     │
│  [Interaction] - Check drug interactions   │
│  [Details]     - View full order details   │
└───────────────────────────────────────────┘
```

### 7.2 Stop Medication

Permanently discontinues an active medication.

```
User taps [Stop] on medication card
         │
         ▼
  Confirmation dialog:
  "Are you sure you want to stop {medicationName}?"
  [Cancel] [Confirm]
         │ (Confirm)
         ▼
  ATHMA EHR_118 PUT /medications/stop
  Body: {
    encounterId: "...",
    medicationOrderId: "MO-12345",
    stoppedBy: { id: "...", name: "Dr. Sharma" },
    stoppedDate: "2026-04-22T14:30:00",
    reason: "Patient allergic reaction"  // optional
  }
         │
         ▼
  Medication moved to "Stopped" category
  Timeline slots after stop time cleared
  Dashboard refreshed
```

### 7.3 Withhold / Hold Medication

Temporarily suspends a medication without permanently discontinuing it.

```
ATHMA EHR_114 PUT /medications/hold
Body: {
  encounterId: "...",
  medicationOrderId: "MO-12345",
  withheldBy: { id: "...", name: "Dr. Sharma" },
  withheldDate: "2026-04-22T14:30:00",
  reason: "NPO for surgery"
}
```

The medication card shows a "HELD" badge and dose slots are marked as withheld (yellow) until resumed.

### 7.4 Resume Held Medication

Reactivates a previously held/withheld medication.

```
ATHMA EHR_113 PUT /medications/resume
Body: {
  encounterId: "...",
  medicationOrderId: "MO-12345",
  resumedBy: { id: "...", name: "Dr. Sharma" },
  resumedDate: "2026-04-22T18:00:00"
}
```

After resuming, dose slots from the resumed time onward become active again with PENDING status.

### 7.5 Cancel Medication

Cancels an ordered medication that has not yet been administered. Different from "Stop" because the medication was never actually given.

```
ATHMA EHR_026 PUT /medications/cancel/{medicationOrderId}
Body: {
  encounterId: "...",
  cancelledBy: { id: "...", name: "Dr. Sharma" },
  reason: "Duplicate order"
}
```

Alternatively, for cancellation with a structured reason:

```
ATHMA EHR_112 PUT /medications/cancel-with-reason
Body: {
  encounterId: "...",
  medicationOrderId: "MO-12345",
  cancelReason: {
    code: "DUPLICATE",
    display: "Duplicate order"
  },
  cancelledBy: { id: "...", name: "Dr. Sharma" }
}
```

### 7.6 Drug Monograph

Retrieves detailed drug information (indications, contraindications, side effects, etc.).

```
ATHMA EHR_115 GET /medications/monograph
?medicationCode={code}&encounterId={encounterId}
         │
         ▼
  Opens modal/page with:
  - Drug name and classification
  - Indications
  - Contraindications
  - Side effects
  - Dosing guidelines
  - Drug interactions
  - Pregnancy category
  - Storage instructions
```

### 7.7 Drug Interaction Check

Checks for interactions between the selected medication and all other active medications for the patient.

```
ATHMA EHR_119 POST /medications/drug-interaction
Body: {
  encounterId: "...",
  medicationCode: "MED-12345",
  activeMedications: ["MED-11111", "MED-22222", "MED-33333"]
}
         │
         ▼
  Response: {
    interactions: [
      {
        drug1: "Paracetamol",
        drug2: "Warfarin",
        severity: "MAJOR",
        description: "Increased bleeding risk...",
        recommendation: "Monitor INR closely..."
      }
    ]
  }
```

**Severity levels:** MAJOR (red alert), MODERATE (yellow warning), MINOR (informational).

---

## 8. Medicine Reconciliation

### 8.1 Overview

Medicine reconciliation is the process of comparing a patient's home/pre-admission medications against the inpatient formulary during admission. It ensures continuity of care by identifying medications to continue, stop, or modify.

### 8.2 Reconciliation Flow

```
Patient admitted
         │
         ▼
CurrentMedicationDashboardPage
  → [Reconciliation] button
         │
         ▼
MedicineReconciliationPage loads
         │
         ▼
  ATHMA EHR_106 GET /medications/reconciliation
  ?encounterId={encounterId}&size=500
         │
         ▼
  ┌───────────────────────────────────────────────┐
  │  Reconciled Medication List                    │
  │                                                │
  │  ┌─ Metformin 500mg ────────────────────────┐ │
  │  │  Home dose: 500mg BID                     │ │
  │  │  Status: PENDING RECONCILIATION           │ │
  │  │  [Continue] [Stop] [Modify] [Withhold]    │ │
  │  │                                           │ │
  │  │  ══════▶  Swipe to order                  │ │
  │  └───────────────────────────────────────────┘ │
  │                                                │
  │  ┌─ Lisinopril 10mg ───────────────────────┐  │
  │  │  Home dose: 10mg OID                     │  │
  │  │  Status: PENDING RECONCILIATION           │  │
  │  │  [Continue] [Stop] [Modify] [Withhold]    │  │
  │  └───────────────────────────────────────────┘ │
  │                                                │
  │  [Order Selected (3)]                          │
  └───────────────────────────────────────────────┘
```

### 8.3 Reconciliation Actions

| Action | Behavior | Next Step |
|---|---|---|
| **Continue** | Accept home medication as-is | Add to inpatient orders |
| **Stop** | Discontinue home medication | Record reason, mark stopped |
| **Modify** | Change dose/frequency/route | Opens `AddMedicationOnCategoryWisePage` |
| **Withhold** | Temporarily hold | Record reason, mark withheld |
| **Cancel** | Cancel reconciliation record | Remove from list |

### 8.4 Modify via AddMedicationOnCategoryWisePage

When "Modify" is selected, the `AddMedicationOnCategoryWisePage` opens with similar dosage configuration as `MedicationOrderAddDosagePage`, but uses different API endpoints and data model:

- Uses `concept.medicationReconciliation` instead of `concept.medicationOrder`
- Supports Regular and Infusion categories
- Has diluting dose units (`IO_Dilutant_Dose` value set)
- **Create:** `EHR_107 POST /medications/reconciliation`
- **Update:** `EHR_107 PUT /medications/reconciliation/{id}`

### 8.5 Bulk Ordering Reconciled Medications

After reviewing and configuring reconciliation records, clinicians can bulk-order them:

```
User selects multiple reconciled medications
         │
         ▼
  [Order Selected (3)] button
         │
         ▼
  ATHMA EHR_108 POST /medications/reconciliation/order
  Body: {
    encounterId: "...",
    reconciliationIds: ["REC-001", "REC-002", "REC-003"],
    orderedBy: { id: "...", name: "Dr. Sharma" }
  }
         │
         ▼
  Reconciled medications converted to active inpatient orders
  Page refreshes with updated list
```

The swipe-to-order gesture (same 30%/60% thresholds from Section 5) is also available on individual reconciliation cards for one-at-a-time ordering.

### 8.6 Drug Checks During Reconciliation

Before ordering reconciled medications, the system performs:
1. **Drug monograph lookup** (EHR_115) for each medication
2. **Drug interaction check** (EHR_119) against all active inpatient medications
3. **Duplicate detection** against current inpatient medication list

If interactions or duplicates are found, a warning modal is displayed with the option to proceed or cancel.

---

## 9. IV / Infusion Ordering

### 9.1 AddMedicationOrderCategoryWisePage

This page handles ordering for all 5 medication categories but is most complex for Infusion/IV medications, which require additional fields beyond standard dosage.

### 9.2 IV-Specific Fields

```
┌──────────────────────────────────────────────────────┐
│  [<] Order Infusion Medication                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Category: [Regular] [SOS] [*Infusion*] [Narcotic]   │
│            [STAT]                                     │
│                                                      │
│  Medication: Normal Saline 0.9% 1000ml               │
│                                                      │
│  ── IV Configuration ──                               │
│                                                      │
│  Dilutant:                                           │
│  ┌─────────────────────────────────────┐             │
│  │ [Dextrose 5%] [NS 0.9%] [0.45% DNS]│             │
│  │ [Ringer Lactate] [Sterile Water]     │             │
│  └─────────────────────────────────────┘             │
│                                                      │
│  Dilutant Volume: [___] ml                           │
│                                                      │
│  Flow Rate: [___] ml/hr                              │
│  (or)                                                │
│  Drip Rate: [___] drops/min                          │
│                                                      │
│  ── Time Slots ──                                    │
│                                                      │
│  Start Date/Time: [2026-04-22] [14:00]               │
│  End Date/Time:   [2026-04-23] [02:00]   (auto)      │
│                                                      │
│  Duration: 12 hours (auto-calculated)                │
│                                                      │
│  ── Additional ──                                    │
│                                                      │
│  Total Volume: 1000 ml                               │
│  Route: Intravenous (locked for infusion)            │
│  Instructions: [________________________]            │
│                                                      │
│             [SAVE ORDER]                             │
└──────────────────────────────────────────────────────┘
```

### 9.3 Dilutant Options

Dilutant values are loaded from `MDM_001` with the value set code `IO_Dilutant_Dose`:

| Dilutant | Common Abbreviation |
|---|---|
| Dextrose 5% in Water | D5W |
| Normal Saline 0.9% | NS |
| 0.45% Dextrose Normal Saline | 0.45% DNS |
| Ringer's Lactate | RL |
| Sterile Water for Injection | SWFI |

### 9.4 Flow Rate and Duration Relationship

Flow rate, total volume, and duration are interdependent. Changing one auto-calculates the others:

```typescript
// Given total volume and flow rate, calculate duration
duration_hours = totalVolume / flowRate;
endDateTime = startDateTime + duration_hours;

// Given total volume and duration, calculate flow rate
flowRate = totalVolume / duration_hours;

// Drip rate conversion (standard drip set: 20 drops/ml)
dripsPerMinute = (flowRate * dropFactor) / 60;
// where dropFactor = 20 for standard, 60 for micro-drip
```

### 9.5 SOS Sub-Types

When the SOS category is selected, a sub-type selector appears:

| Sub-Type | Description | Behavior |
|---|---|---|
| **Regular** | Standard PRN (as needed) | Given once when condition met, can repeat after interval |
| **Continuous** | Continuous PRN administration | May be administered without waiting for interval |

---

## 10. Discharge Medication (DS Context)

### 10.1 Overview

When `MedicationOrderListPage` is opened with `orderContext = "DS"` (Discharge Summary), it operates in discharge medication mode. This context is accessed from `CurrentMedicationDashboardPage` when preparing discharge prescriptions.

### 10.2 DS-Specific Behavior

```
CurrentMedicationDashboardPage
  → [Discharge Meds] button
         │
         ▼
MedicationOrderListPage (context = "DS")
         │
         ▼
  ┌────────────────────────────────────────────┐
  │  Discharge Medications                      │
  │                                             │
  │  Inpatient medications auto-populated       │
  │  (synced from active medication list)       │
  │                                             │
  │  ┌─ Paracetamol 500mg ─────────────────┐   │
  │  │  1-0-0-1 | Oral | 7 Days             │   │
  │  │  [Edit] [Remove]                      │   │
  │  └──────────────────────────────────────┘   │
  │                                             │
  │  ┌─ Amoxicillin 250mg ─────────────────┐   │
  │  │  1-1-1-0 | Oral | 5 Days             │   │
  │  │  [Edit] [Remove]                      │   │
  │  └──────────────────────────────────────┘   │
  │                                             │
  │  [+ Add More Medications]                   │
  │  [Sync from Active Medications]             │
  │                                             │
  │         [SAVE DISCHARGE MEDICATIONS]         │
  └────────────────────────────────────────────┘
```

### 10.3 Discharge Sync

The "Sync from Active Medications" feature pulls the patient's current inpatient medication list and pre-populates the discharge prescription, adjusting durations for outpatient use.

```
Sync flow:
  1. Fetch active medications (EHR_056)
  2. For each active medication:
     - Copy medication details
     - Adjust duration (e.g., 30 days for chronic, 7 days for acute)
     - Set orderContext = "DS"
     - Mark as draft
  3. Clinician reviews, modifies, removes as needed
  4. Save all via EHR_021 POST (batch)
```

### 10.4 DS Order Submission

Discharge medication orders use the same `EHR_021` endpoint but with `orderContext: "DS"`:

```
ATHMA EHR_021 POST /medications/orders
Body: {
  ...same fields as ML context...
  orderContext: "DS",
  dischargeInstructions: "Continue for 7 days post-discharge"
}
```

---

## 11. Patient Instruction Auto-Generation

### 11.1 Two Instruction Formats

The system generates human-readable patient instructions in two formats based on the `Medication_Dosage_Format` configuration (from `MDM_002`).

**Format 1: Numeric**
```
"{frequency} ({M} - {A} - {E} - {N}) {unit} {route} {food} For {duration} {durationUnit}"
```

**Format 2: Word (natural language)**
```
"{dose} {unit} in the {period1} and {dose} {unit} in the {period2} {route} {frequency} {food} For {duration} {durationUnit}"
```

### 11.2 Numeric Format Examples

| Distribution | Frequency | Unit | Route | Food | Duration | Generated Instruction |
|---|---|---|---|---|---|---|
| 1-0-0-0 | Once Daily | tablet | Oral | After Food | 7 Days | "Once Daily (1 - 0 - 0 - 0) tablet Oral After Food For 7 Days" |
| 1-0-0-1 | Twice Daily | tablet | Oral | After Food | 7 Days | "Twice Daily (1 - 0 - 0 - 1) tablet Oral After Food For 7 Days" |
| 5-0-5-0 | Twice Daily | ml | Oral | Before Food | 5 Days | "Twice Daily (5 - 0 - 5 - 0) ml Oral Before Food For 5 Days" |
| 0.25-0-0-0.5 | Twice Daily | tablet | Oral | After Food | 14 Days | "Twice Daily (0.25 - 0 - 0 - 0.5) tablet Oral After Food For 14 Days" |

### 11.3 Word Format Examples

| Distribution | Generated Instruction |
|---|---|
| 1-0-0-0 | "1 tablet in the morning Oral Once Daily After Food For 7 Days" |
| 1-0-0-1 | "1 tablet in the morning and 1 tablet in the night Oral Twice Daily After Food For 7 Days" |
| 1-1-1-0 | "1 tablet in the morning, 1 tablet in the afternoon and 1 tablet in the evening Oral Thrice Daily After Food For 5 Days" |
| 1-1-1-1 | "1 tablet in the morning, 1 tablet in the afternoon, 1 tablet in the evening and 1 tablet in the night Oral Four times daily After Food For 7 Days" |

### 11.4 Instruction Generation Logic

```typescript
function generateInstruction(order: MedicationOrder, format: string): string {
  const { morning, afternoon, evening, night } = order.dosage;
  const slots = [
    { value: morning, label: 'morning' },
    { value: afternoon, label: 'afternoon' },
    { value: evening, label: 'evening' },
    { value: night, label: 'night' }
  ];

  if (format === 'NUMERIC') {
    return `${order.frequency.display} (${morning} - ${afternoon} - ${evening} - ${night}) ` +
           `${order.unit} ${order.route} ${order.foodInstruction} ` +
           `For ${order.duration} ${order.durationUnit}`;
  }

  // WORD format
  const nonZeroSlots = slots.filter(s => s.value > 0);
  const parts = nonZeroSlots.map(s => `${s.value} ${order.unit} in the ${s.label}`);

  let instruction: string;
  if (parts.length === 1) {
    instruction = parts[0];
  } else {
    const lastPart = parts.pop();
    instruction = parts.join(', ') + ' and ' + lastPart;
  }

  return `${instruction} ${order.route} ${order.frequency.display} ` +
         `${order.foodInstruction} For ${order.duration} ${order.durationUnit}`;
}
```

---

## 12. Complete API Reference

### 12.1 ATHMA EHR Endpoints

All ATHMA endpoints are proxied through the backend at `/api/athma-proxy/{endpointCode}`. The `MedicationOrderService` manages ATHMA token lifecycle (5-hour TTL with auto-refresh).

| Code | Method | Purpose | Key Parameters |
|---|---|---|---|
| **EHR_019** | GET | Existing medication orders | `encounterId` |
| **EHR_020** | GET | Search medications | `searchTerm`, `searchType` (BRAND/GENERIC), `encounterId` |
| **EHR_021** | POST | Create medication order | Full order payload (see Section 5.5) |
| **EHR_021** | PUT | Update medication order | `medicationOrderId` + updated fields |
| **EHR_021** | DELETE | Delete draft medication order | `medicationOrderId` |
| **EHR_023** | GET | Drug frequency master list | None (returns all frequencies) |
| **EHR_024** | GET | Get favorites list | `userId` |
| **EHR_024** | POST | Add favorite | `userId`, `medication` |
| **EHR_024** | DELETE | Remove favorite | `favoriteId` |
| **EHR_025** | GET | Concept values (route, food, durationUnit) | `concept` (route/food/durationUnit) |
| **EHR_026** | PUT | Cancel ordered medication | `medicationOrderId`, `reason` |
| **EHR_056** | GET | Current medications by date | `date`, `encounterId` |
| **EHR_106** | GET | Reconciled medication list | `encounterId`, `size=500` |
| **EHR_107** | POST | Create reconciliation record | Reconciliation payload |
| **EHR_107** | PUT | Update reconciliation record | `reconciliationId` + updated fields |
| **EHR_108** | POST | Order reconciled medications (bulk) | `reconciliationIds[]` |
| **EHR_112** | PUT | Cancel medication with structured reason | `medicationOrderId`, `cancelReason` |
| **EHR_113** | PUT | Resume held medication | `medicationOrderId`, `resumedBy`, `resumedDate` |
| **EHR_114** | PUT | Hold/withhold medication | `medicationOrderId`, `withheldBy`, `reason` |
| **EHR_115** | GET | Drug monograph | `medicationCode`, `encounterId` |
| **EHR_118** | PUT | Stop active medication | `medicationOrderId`, `stoppedBy`, `reason` |
| **EHR_119** | POST | Drug interaction check | `medicationCode`, `activeMedications[]` |
| **EHR_120** | GET | Patient encounter from EHR | `encounterId` |
| **EHR_168** | GET | Medication card timings | `encounterId` |
| **EHR_169** | GET | Patient vitals (height, BMI, BSA) | `patientId`, `encounterId` |

### 12.2 MDM Endpoints

| Code | Method | Purpose | Key Value Set Codes |
|---|---|---|---|
| **MDM_001** | GET | Value sets / master data | `DrugFormUnits` (drug form → unit mapping), `MedicationPrefix` (category prefixes), `CategoryDisplayOrder` (dashboard tab ordering), `IO_Dilutant_Dose` (IV dilutant options) |
| **MDM_002** | GET | App configuration | `Medication_Dosage_Format` (NUMERIC/WORD instruction format) |

### 12.3 Direct REST Endpoints (MedicationService)

These are called directly to the Spring Boot backend (not via ATHMA proxy):

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/medications/search` | Local medication search (may supplement ATHMA) |
| GET | `/api/medications/favorites` | Cached favorites |
| POST | `/api/medications/interaction-check` | Local interaction database |
| GET | `/api/patients/{id}/active-medications` | Quick active medication list |

### 12.4 ATHMA Token Lifecycle

```
┌────────────────────────────────────────────────────┐
│  ATHMA Token Management                             │
│                                                     │
│  1. On first ATHMA call:                            │
│     POST /api/athma-proxy/authenticate               │
│     → Returns { token, expiresIn: 18000 }  (5 hrs) │
│                                                     │
│  2. Token stored in memory with timestamp            │
│     tokenExpiry = Date.now() + (expiresIn * 1000)   │
│                                                     │
│  3. Before each ATHMA call:                          │
│     if (Date.now() > tokenExpiry - 300000) {        │
│       // Refresh 5 min before expiry                │
│       refreshToken();                                │
│     }                                                │
│                                                     │
│  4. Token attached as header:                        │
│     Authorization: Bearer {athmaToken}               │
│                                                     │
│  5. On 401 response: force token refresh + retry     │
└────────────────────────────────────────────────────┘
```

---

## 13. Validation Rules

### 13.1 Complete Validation Matrix

| # | Rule | When Checked | Error Message | Blocking? |
|---|---|---|---|---|
| 1 | Search term >= 3 characters | On keypress in search | "Type at least 3 characters" | Yes (API not called) |
| 2 | Duplicate detection by `medication.code` | On adding med to draft list | "This medication is already in your order list" | Yes |
| 3 | Frequency-dosage slot match: `dailyIntake == count(non-zero slots)` for OID/BID/TID/QID | On dosage save | "Distribution does not match selected frequency" | Yes |
| 4 | At least 1 medication in order list before save | On [Save] tap | "Add at least one medication" | Yes |
| 5 | Network connectivity check | Before every API call | "No internet connection" | Yes |
| 6 | ATHMA token not expired (5-hour TTL) | Before ATHMA calls | Auto-refreshes; if refresh fails: "Session expired" | Yes |
| 7 | End date >= prescription date | On date change | "End date cannot be before prescription date" | Yes |
| 8 | Duration > 0 for non-SOS frequencies | On dosage save | "Duration is required" | Yes |
| 9 | Dosage day-wise input disabled for FID/SID/STAT/NTID | On frequency selection | (UI disabled, no error) | N/A |
| 10 | Route cleanup: "Select Route" placeholder → `null` | On order submission | (Silent cleanup) | No |
| 11 | Null `drugFrequency` removed from payload | On order submission | (Silent cleanup) | No |
| 12 | Patient is currently admitted (inpatient) | On page load | "Patient has been discharged. Cannot add medications." | Yes (navigates back) |
| 13 | Unit supports medication ordering | On page load | "Medication ordering is not available for this unit" | Yes (navigates back) |

### 13.2 Validation Flow Diagram

```
┌─────────────────────────────────────────────────┐
│               ORDER SUBMISSION                    │
└──────────┬──────────────────────────────────────┘
           │
           ▼
  ┌─ Pre-flight checks ──────────────────────┐
  │  1. Network available?         → toast    │
  │  2. ATHMA token valid?         → refresh  │
  │  3. Patient still inpatient?   → block    │
  │  4. Unit supports ordering?    → block    │
  └──────────┬───────────────────────────────┘
             │ (all pass)
             ▼
  ┌─ Order-level validation ─────────────────┐
  │  5. >= 1 medication in list?   → toast    │
  │  6. All meds have dosage?      → toast    │
  └──────────┬───────────────────────────────┘
             │ (all pass)
             ▼
  ┌─ Per-medication validation ──────────────┐
  │  7. Frequency selected?        → toast    │
  │  8. Distribution matches freq? → toast    │
  │  9. Duration > 0 (non-SOS)?    → toast    │
  │ 10. End date >= start date?    → toast    │
  └──────────┬───────────────────────────────┘
             │ (all pass)
             ▼
  ┌─ Payload cleanup ───────────────────────┐
  │ 11. "Select Route" → null                │
  │ 12. null drugFrequency → delete key      │
  │ 13. Remove empty optional fields         │
  └──────────┬───────────────────────────────┘
             │
             ▼
  ┌─ Duplicate check ───────────────────────┐
  │ 14. Check against active meds            │
  │     If duplicate → warning modal         │
  │     [Proceed Anyway] / [Cancel]          │
  └──────────┬───────────────────────────────┘
             │
             ▼
        API CALL (EHR_021 POST)
```

---

## 14. Error Handling

### 14.1 Network Errors

```typescript
// All API calls wrapped with network check
async function callATHMA(endpoint: string, method: string, body?: any) {
  // 1. Network check
  const networkStatus = await Network.getStatus();
  if (!networkStatus.connected) {
    this.toastService.show('No internet connection. Please try again.');
    return;
  }

  // 2. Token check
  if (this.isTokenExpired()) {
    try {
      await this.refreshATHMAToken();
    } catch (e) {
      this.toastService.show('Session expired. Please log in again.');
      this.navCtrl.navigateRoot('/login');
      return;
    }
  }

  // 3. API call with error handling
  try {
    const response = await this.http.request(method, endpoint, { body }).toPromise();
    return response;
  } catch (error) {
    if (error.status === 401) {
      // Token expired mid-call, retry once
      await this.refreshATHMAToken();
      return this.http.request(method, endpoint, { body }).toPromise();
    }
    if (error.status === 409) {
      // Conflict (e.g., medication already ordered by another user)
      this.toastService.show('This medication was already ordered. Please refresh.');
    }
    if (error.status >= 500) {
      this.toastService.show('Server error. Please try again later.');
    }
    throw error;
  }
}
```

### 14.2 Common Error Scenarios

| Scenario | HTTP Status | User-Facing Message | Recovery |
|---|---|---|---|
| No network | N/A | "No internet connection" | Check connectivity, retry |
| ATHMA token expired | 401 | Auto-refresh; if fails: "Session expired" | Re-authenticate |
| Medication already ordered | 409 | "Already ordered, please refresh" | Refresh order list |
| Server error | 500 | "Server error. Please try again." | Retry |
| Patient discharged | 200 (business logic) | "Patient has been discharged" | Navigate back |
| Drug interaction found | 200 (warning) | Interaction details modal | Proceed or cancel |
| Search no results | 200 (empty) | "No medications found" | Modify search term |
| Invalid dosage | Client-side | Specific validation message | Fix dosage fields |

### 14.3 Optimistic UI & Rollback

For the swipe-to-order gesture, the system uses an optimistic UI pattern:
1. On swipe confirmation (>60%), immediately show success animation
2. Fire API call in background
3. If API call fails, revert the card to pre-swipe state and show error toast
4. If API call succeeds, card stays in "ordered" state

---

## 15. Edge Cases

### 15.1 Fractional Dosage Quantity Calculation

When fractional doses are used, the quantity calculation must handle decimals correctly:

```
Distribution: [0.25, 0, 0, 0.5]
Duration: 7 Days

frequency = 0.25 + 0 + 0 + 0.5 = 0.75
daysConversion = 7
quantity = ceil(0.75 × 7) = ceil(5.25) = 6 tablets
```

The `Math.ceil()` ensures partial tablets round up (you can't dispense 5.25 tablets).

### 15.2 Midnight-Crossing Night Period

The Night period (20:00 - 06:00) crosses midnight. The timeline must handle this by rendering the night period as wrapping to the next day:

```
Day: April 22
  Night period: 20:00 Apr 22 → 06:00 Apr 23

When viewing Apr 22: Night slots shown from 20:00 to midnight
When viewing Apr 23: Night slots shown from midnight to 06:00
```

### 15.3 Stopped Medications Timeline

Stopped medications still appear in the "Stopped" category but only show timeline data up to the stop time. Slots after the stop time are cleared/hidden.

### 15.4 Concurrent Ordering Conflict

If two clinicians order the same medication for the same patient simultaneously:
- The first order succeeds
- The second order receives a 409 Conflict
- The second clinician sees a warning and must refresh

### 15.5 Discharge Medication Sync Edge Cases

- **Already discontinued:** Medications stopped before discharge are excluded from sync
- **Infusion medications:** IV medications are typically not synced to discharge (oral alternatives suggested)
- **Narcotics:** May require additional authorization workflow for discharge prescriptions
- **Modified dose:** If inpatient dose was changed from admission dose, the latest dose is used

### 15.6 Empty Reconciliation List

If `EHR_106` returns an empty list (no pre-admission medications recorded), the reconciliation page shows an empty state with the option to manually add medications.

### 15.7 IntersectionObserver Fallback

If `IntersectionObserver` is not supported (older WebView), the dashboard falls back to scroll event-based category detection using `getBoundingClientRect()`.

### 15.8 Swipe Gesture on Small Screens

On narrow screens, the 60% threshold may be difficult to reach. The gesture calculations use the card's actual `offsetWidth`, so the absolute distance adjusts proportionally. No minimum pixel distance is enforced beyond the percentage threshold.

### 15.9 Time Zone Handling

Medication times are stored and displayed in the facility's local time zone. The 24-hour timeline uses the server-provided time zone, not the device's local time zone.

---

## 16. Implementation Checklist

### 16.1 Services

- [ ] **MedicationService** (direct REST)
  - [ ] Medication search (brand/generic)
  - [ ] Favorites CRUD
  - [ ] Local interaction check
  - [ ] Active medication quick list

- [ ] **MedicationOrderService** (ATHMA proxy)
  - [ ] ATHMA token management (5-hour TTL, auto-refresh)
  - [ ] EHR_019: Fetch existing orders
  - [ ] EHR_020: Search medications
  - [ ] EHR_021: Create/Update/Delete orders
  - [ ] EHR_023: Drug frequencies
  - [ ] EHR_024: Favorites (via ATHMA)
  - [ ] EHR_025: Concept values
  - [ ] EHR_026: Cancel ordered medication
  - [ ] EHR_056: Current medications by date
  - [ ] EHR_106: Reconciliation list
  - [ ] EHR_107: Create/Update reconciliation
  - [ ] EHR_108: Bulk order reconciled
  - [ ] EHR_112: Cancel with reason
  - [ ] EHR_113: Resume held medication
  - [ ] EHR_114: Hold/withhold medication
  - [ ] EHR_115: Drug monograph
  - [ ] EHR_118: Stop medication
  - [ ] EHR_119: Drug interaction check
  - [ ] EHR_120: Patient encounter
  - [ ] EHR_168: Card timings
  - [ ] EHR_169: Patient vitals
  - [ ] MDM_001: Value sets
  - [ ] MDM_002: Configuration

### 16.2 Pages

- [ ] **MedicationOrdersPage** (entry point)
  - [ ] Fetch existing orders (EHR_019)
  - [ ] Group orders by `orderDate`
  - [ ] Inpatient status check
  - [ ] Unit medication ordering config check
  - [ ] FAB button → MedicationOrderListPage

- [ ] **MedicationOrderListPage** (3 contexts)
  - [ ] Search with brand/generic toggle (EHR_020)
  - [ ] Favorites tab/section (EHR_024)
  - [ ] Duplicate detection
  - [ ] Swipe-to-order gesture (30%/60% thresholds)
  - [ ] Draft order management
  - [ ] Delete draft (EHR_021 DELETE)
  - [ ] Cancel ordered (EHR_026 PUT)
  - [ ] Context-specific behavior (ML/DS/PN)
  - [ ] DS sync from active medications

- [ ] **MedicationOrderAddDosagePage**
  - [ ] 6 quick-select frequencies
  - [ ] "More" → MedicationOrderFrequencyPage
  - [ ] 4 predefined dose buttons + custom
  - [ ] Day-wise distribution auto-generation
  - [ ] Duration quick-select (1-7) + custom
  - [ ] Duration unit selector (Days/Weeks/Months)
  - [ ] Quantity auto-calculation (ceil formula)
  - [ ] Drug form → unit auto-mapping
  - [ ] Route picker (EHR_025)
  - [ ] Food instruction picker
  - [ ] Refill count (0-4+)
  - [ ] Prescription date / end date
  - [ ] Patient instruction generation (NUMERIC/WORD)
  - [ ] All 13 validation rules

- [ ] **MedicationOrderCustomDosagePage**
  - [ ] 4 slot entry (M/A/E/N)
  - [ ] Tap-to-cycle: 1/4 → 1/2 → 0 → 1 → 2 → ...
  - [ ] Return "M-A-E-N" string

- [ ] **MedicationOrderFrequencyPage**
  - [ ] Fetch extended frequencies (EHR_023)
  - [ ] Search/filter frequencies
  - [ ] Return selected frequency

- [ ] **CurrentMedicationDashboardPage**
  - [ ] Parallel data loading (EHR_056, EHR_168, EHR_169, MDM_001)
  - [ ] 5 category tabs + Stopped
  - [ ] IntersectionObserver for scroll-based tab tracking
  - [ ] 24-hour horizontal timeline per medication
  - [ ] Current time indicator + auto-scroll
  - [ ] Slot status colors (OVERDUE/PENDING/ADMINISTERED/WITHHELD/STOPPED)
  - [ ] Infusion progress bar (mlPerMinute, completion %)
  - [ ] Date navigation (prev/next day)
  - [ ] Patient vitals display (height, BMI, BSA)
  - [ ] Actions: Stop, Hold, Resume, Cancel, Monograph, Interaction
  - [ ] Navigation to: OrderList, Reconciliation, CardPopups

- [ ] **CurrentMedicationOrderListPage**
  - [ ] Quick medication add from dashboard context

- [ ] **MedicineReconciliationPage**
  - [ ] Fetch reconciliation list (EHR_106, size=500)
  - [ ] Continue/Stop/Withhold/Cancel actions per medication
  - [ ] Swipe-to-order for individual items
  - [ ] Bulk order selected (EHR_108 POST)
  - [ ] Drug monograph lookup (EHR_115)
  - [ ] Drug interaction check (EHR_119)
  - [ ] Navigate to AddMedicationOnCategoryWisePage for modification

- [ ] **AddMedicationOnCategoryWisePage**
  - [ ] Reconciliation-context dosage config
  - [ ] Regular + Infusion category support
  - [ ] Diluting dose units (IO_Dilutant_Dose)
  - [ ] Create reconciliation (EHR_107 POST)
  - [ ] Update reconciliation (EHR_107 PUT)

- [ ] **AddMedicationOrderCategoryWisePage**
  - [ ] 5 category selector
  - [ ] IV-specific fields (dilutant, flow rate, time slots)
  - [ ] SOS sub-type selector (Regular/Continuous)
  - [ ] Start/end datetime pickers
  - [ ] Flow rate / duration auto-calculation

- [ ] **MedicineCardPopupsPage**
  - [ ] Stop medication (EHR_118)
  - [ ] Withhold medication (EHR_114)
  - [ ] Cancel medication (EHR_026 / EHR_112)
  - [ ] View medication details
  - [ ] Confirmation dialogs with reason entry

- [ ] **MedicationListPage** (legacy)
  - [ ] Search + order from chat context
  - [ ] Simplified ordering flow

### 16.3 Cross-Cutting Concerns

- [ ] ATHMA token 5-hour TTL with 5-minute pre-expiry refresh
- [ ] Network connectivity check before all API calls
- [ ] Inpatient status validation on page entry
- [ ] Unit medication ordering config validation
- [ ] Payload sanitization (null route, null frequency cleanup)
- [ ] Error toasts for all failure scenarios
- [ ] Optimistic UI for swipe-to-order with rollback
- [ ] IntersectionObserver with getBoundingClientRect fallback
- [ ] Time zone handling (facility time, not device time)
- [ ] Concurrent ordering conflict detection (409 handling)
