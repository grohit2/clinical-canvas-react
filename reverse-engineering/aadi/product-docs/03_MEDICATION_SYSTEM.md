# Medication System

> How medications are ordered, tracked, and administered in AADI.

---

## 1. Medication Order Lifecycle

```
    +--------+     +----------+     +---------+     +-----------+     +--------+     +--------+
    | ADDED  |---->| ORDERED  |---->| PENDING |---->| DISPENSED |---->| ISSUED |---->| CLOSED |
    | (draft)|     | (sent to |     | (pharma |     | (pharma   |     | (sent  |     | (fully |
    |        |     |  pharma) |     |  review)|     |  prepared)|     | to ward)|    | given) |
    +--------+     +----------+     +---------+     +-----------+     +--------+     +--------+
        |               |                               |                 |
      [Delete]       [Cancel]                     [Partially         [Partially
                                                  Dispensed]          Issued]
                                                                         |
                                                                    [Partially
                                                                     Closed]
```

**Doctor can:**
- **Delete** an ADDED (draft) medication
- **Cancel** an ORDERED medication (with reason)
- **Stop** an active medication (with reason)
- **Hold** (temporarily pause) an active medication (with reason)
- **Unhold** (resume) a held medication

---

## 2. Ordering a New Medication

### Step-by-Step Flow

```
Doctor opens Medication List
    |
    v
+----- Search by drug name (min 3 characters)
|      Toggle: [Brand] or [Generic]
|      Results show from hospital's formulary
|
+----- OR select from Favorites
|      (Pre-configured with dosage, frequency, etc.)
|
    v
Select medication
    |
    v
DOSAGE CONFIGURATION MODAL opens
    |
    v
+-----------------------------------------------+
|  CONFIGURE DOSAGE                             |
|                                               |
|  Frequency:                                   |
|    [Once Daily] [Twice] [Thrice] [Four] [SOS] |
|    [More...]  (custom frequency picker)       |
|                                               |
|  Dosage (varies by drug form):                |
|    Tablet:  [Half]  [Full]                    |
|    Capsule: [1]                               |
|    Syrup:   [2.5ml] [5ml] [7.5ml] [10ml]     |
|    Custom:  [____] (numeric input)            |
|                                               |
|  Day-wise breakdown:                          |
|    Morning:    [1  ]                          |
|    Afternoon:  [0  ]                          |
|    Evening:    [0  ]                          |
|    Night:      [1  ]                          |
|                                               |
|  Duration: [7] [Days v]                       |
|  Route:    [Oral v]                           |
|  Food:     [After Food v]                     |
|  Instructions: [________________]             |
|                                               |
|  Quantity: 14 tablets (auto-calculated)        |
|                                               |
|  [Cancel]                      [Add]          |
+-----------------------------------------------+
```

### Day-wise Distribution (Auto-calculated)

| Frequency | Morning | Afternoon | Evening | Night |
|-----------|---------|-----------|---------|-------|
| Once Daily | 1 dose | - | - | - |
| Twice Daily | 1 dose | - | - | 1 dose |
| Thrice Daily | 1 dose | 1 dose | - | 1 dose |
| Four times | 1 dose | 1 dose | 1 dose | 1 dose |
| As Needed (SOS) | - | - | - | - (qty=1) |

### Custom Dosage (Fractional Support)

For tablets, doctors can enter fractional doses:

```
Tap [+] and [-] to cycle:
  0 --> 1/4 --> 1/2 --> 1 --> 2 --> 3 ...

Display format: "1-1/2-1-0"
  = Morning: 1, Afternoon: 1/2, Evening: 1, Night: 0
```

### Quantity Calculation

```
Total per day = Morning + Afternoon + Evening + Night
Quantity = ceil(Total per day x Duration)

Exception: Syrup always = 1 (one bottle)
```

### Submitting the Order

```
Doctor adds multiple medications to order list
    |
    v
Review all medications in list
    |
    v
======================================
  <<< Swipe to order >>>
======================================
    |
    30% swiped: "Swipe to order" (visual feedback)
    60% swiped: "Confirmed!" (turns orange)
    100%: Order submitted to pharmacy
    |
    v
All medications: ADDED --> ORDERED
    |
    v
Pharmacy receives order
```

---

## 3. Medication Dashboard (24-Hour Timeline)

### What It Shows

A visual timeline of all active medications for the current day, organized by category:

```
+------------------------------------------------------------------+
|  REGULAR MEDICATIONS                                              |
|                                                                   |
|  Drug Name     | 00  04  06  08  10  12  14  16  18  20  22      |
|  ----------------------------------------------------------------|
|  Paracetamol   |         [v]         [v]         [v]             |
|  Amoxicillin   |     [v]         [!]         [P]                 |
|  Metformin     |             [v]                 [v]             |
|                                                                   |
|  SOS MEDICATIONS                                                  |
|  Tramadol      |                     [v]                         |
|                                                                   |
|  INFUSION                                                         |
|  NS 0.9%       | [====v=====>        =====>                     |
|                   500ml/hr          250ml/hr                      |
|                                                                   |
|  STOPPED                                                          |
|  Ceftriaxone   |  (stopped: completed course)                    |
+------------------------------------------------------------------+
```

### Slot Status Icons

| Icon | Meaning | Color |
|------|---------|-------|
| [v] | Administered (given to patient) | Teal |
| [P] | Pending (not yet given) | Gray |
| [!] | Overdue (missed time) | Red |
| [W] | Withheld (temporarily paused) | Yellow border |
| [R] | Refused (patient refused) | Red border |
| [V] | Vomited (given but vomited) | Red badge |
| [M] | Modified (dose changed) | Orange badge |
| [S] | Stopped (discontinued) | Gray badge |
| [A] | Allergy alert | Red badge |

### 5 Medication Categories

| Category | What it contains |
|----------|-----------------|
| **Regular** | Standard scheduled medications |
| **SOS** | As-needed medications |
| **Infusion** | IV continuous/intermittent infusions (with flow rate) |
| **Narcotic** | Controlled substances |
| **STAT** | Immediate/urgent medications |
| **Stopped** | Discontinued (archived, read-only) |

### 3 View Modes

| Mode | Best for |
|------|----------|
| **Default** | Full 24-hour grid, all slots visible |
| **Minimised** | Compact view, empty slots hidden |
| **List** | Vertical list, most accessible |

### Time Periods (Color-coded)

```
Night     (00:00 - 06:00)  Blue     late-night icon
Morning   (06:00 - 11:00)  Yellow   early-morning icon
Afternoon (11:00 - 15:00)  Orange   noon icon
Evening   (15:00 - 20:00)  Purple   mid-evening icon
Night     (20:00 - 24:00)  Blue     late-night icon
```

### Infusion Progress Bar

For IV medications, a continuous bar shows:
- **Start time** with dosage
- **Current position** based on elapsed time
- **Flow rate** (e.g., 500 ml/hr)
- **End time** (when infusion completes)

---

## 4. IV Medication Slot Configuration

For intermittent IV infusions, doctors configure exact administration times:

```
24-HOUR TIMELINE
    |
    00:00  [Night]       o
    01:00                o
    02:00                o
    ...
    06:00  [Morning]     o
    07:00                o
    08:00  [Morning]     * <-- Tap to add slot (dose: 500mg)
    09:00                o
    ...
    12:00  [Afternoon]   * <-- Tap to add slot (dose: 250mg)
    ...
    16:00  [Evening]     * <-- Tap to add slot (dose: 500mg)
    ...

Each slot: time, quantity, customizable dose
Tap to add, swipe to remove
```

---

## 5. Medicine Reconciliation

When patients are admitted, their home medications need to be reviewed and reconciled:

```
System loads patient's medication history
    |
    v
+--------------------------------------------+
|  CONTINUE MEDICATIONS     [Select All]     |
|                                            |
|  [x] Metformin 500mg BD  (ORDERED)         |
|  [x] Atorvastatin 20mg OD (ORDERED)        |
|  [ ] Aspirin 75mg OD     (ADDED - new)     |
|                                            |
|  STOPPED MEDICATIONS                       |
|                                            |
|  [-] Clopidogrel (Stopped: adverse effect) |
|  [-] Ranitidine (Stopped: not needed)      |
+--------------------------------------------+

Pre-checked = already ordered (cannot uncheck)
Unchecked = new, user selects to continue

<<< Swipe to confirm >>>
```

Confirmation prompt: "Continue medications below without placing pharmacy order?"

---

## 6. Drug Safety Features

### Drug Monograph

```
Doctor taps info icon on any medication
    |
    v
Full drug monograph opens (indications, contraindications,
  side effects, dosing guidelines, interactions)
    |
    v
Powered by CIMS database
```

### Drug Interaction Check

```
Doctor orders new medication
    |
    v
System checks against ALL current medications for patient
    |
    v
If interactions found:
    Warning displayed with severity and recommendation
```

### Look-Alike / Sound-Alike (LASA) Warning

Special icon badge appears on medications with similar-looking or similar-sounding names to prevent mix-ups.

---

## Key User Journeys

### Journey: Morning Medication Review

```
1. Nurse opens Medication Dashboard for patient
2. Sees 3 medications due at 08:00 (currently "Pending")
3. Administers Paracetamol --> Taps to mark "Administered"
4. Patient refuses Metformin --> Marks as "Refused"
5. Notices Amoxicillin is overdue from 06:00 (red "!" badge)
6. Administers late --> Mark "Administered"
7. Dashboard updates in real-time
```

### Journey: Discharge Medication Ordering

```
1. Doctor opens Medication Order from Discharge Summary
2. Searches "Metformin" (Brand)
3. Configures: 500mg, Twice daily, After food, 30 days
4. Searches "Atorvastatin" (Generic)
5. Configures: 20mg, Once daily, At bedtime, 30 days
6. Reviews order list
7. Swipes to sync with discharge summary
8. Medications appear in "Medication at Discharge" section
```
