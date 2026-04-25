# AHAM - Task Management

Task Management is the core feature of AHAM. Every financial or clinical action that needs a second pair of eyes -- an invoice, a refund, a high-value medication order -- becomes a "task" that flows through a structured approval pipeline.

---

## Table of Contents

1. [Task Views](#task-views)
2. [Task Lifecycle](#task-lifecycle)
3. [The 13 Approval Types](#the-13-approval-types)
4. [Task Actions Explained](#task-actions-explained)
5. [Validation Rules](#validation-rules)
6. [User Journeys](#user-journeys)

---

## Task Views

AHAM organizes tasks into three queues, accessible via tabs at the top of the Task Management screen.

### MY TASKS

Tasks that **you** have claimed and are actively working on. Only you can see these in your My Tasks queue.

```
+--------------------------------------------------+
|  TASK MANAGEMENT                                  |
|                                                   |
|  [ MY TASKS ]   GROUP TASKS    ALL TASKS          |
|  -----------                                      |
|                                                   |
|  +----------------------------------------------+ |
|  | INVOICE APPROVAL              15 Mar 2026    | |
|  | Patient: Rajesh Kumar                        | |
|  | Amount: Rs 45,200                            | |
|  | Status: CLAIMED                              | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | REFUND REQUEST                 14 Mar 2026    | |
|  | Patient: Priya Sharma                        | |
|  | Amount: Rs 8,500                             | |
|  | Status: CLAIMED                              | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | DISCOUNT APPROVAL              14 Mar 2026   | |
|  | Patient: Anil Reddy                          | |
|  | Type: Discretionary Discount                 | |
|  | Status: CLAIMED                              | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### GROUP TASKS

Tasks assigned to **your group** (e.g., "Billing Team - Unit 3") that nobody has claimed yet. Any member of the group can pick one up.

```
+--------------------------------------------------+
|  TASK MANAGEMENT                                  |
|                                                   |
|  MY TASKS   [ GROUP TASKS ]    ALL TASKS          |
|             -------------                         |
|                                                   |
|  +----------------------------------------------+ |
|  | RECEIPT APPROVAL              15 Mar 2026    | |
|  | Patient: Meena Devi                          | |
|  | Amount: Rs 12,000                            | |
|  | Status: NEW (unclaimed)                      | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | HIGH VALUE MEDICATION          15 Mar 2026   | |
|  | Patient: Sanjay Gupta                        | |
|  | Amount: Rs 1,25,000                          | |
|  | Status: NEW (unclaimed)                      | |
|  +----------------------------------------------+ |
|                                                   |
|  (Tap a task to view details and claim it)        |
+--------------------------------------------------+
```

### ALL TASKS

A supervisor view showing **every task** across the facility, regardless of who claimed it or which group it belongs to.

```
+--------------------------------------------------+
|  TASK MANAGEMENT                                  |
|                                                   |
|  MY TASKS    GROUP TASKS   [ ALL TASKS ]          |
|                            ----------             |
|                                                   |
|  Showing 47 tasks across all groups               |
|                                                   |
|  +----------------------------------------------+ |
|  | AUTHORIZATION                  15 Mar 2026   | |
|  | Patient: Vikram Singh                        | |
|  | Claimed by: Dr. Anita (Finance Team)         | |
|  | Status: IN REVIEW                            | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | RETROSPECT INVOICE             14 Mar 2026   | |
|  | Patient: Lakshmi Nair                        | |
|  | Claimed by: (unclaimed)                      | |
|  | Status: NEW                                  | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

---

## Task Lifecycle

Every task follows the same lifecycle, regardless of type:

```
                    +-------------------+
                    |    TASK CREATED    |
                    | (by billing system)|
                    +--------+----------+
                             |
                             v
                    +-------------------+
                    |   GROUP POOL      |
                    | (visible to team) |
                    +--------+----------+
                             |
                     Staff member taps
                      "Claim" button
                             |
                             v
                    +-------------------+
                    |     CLAIMED       |
                    | (moves to My Tasks)|
                    +--------+----------+
                             |
                     Staff reviews the
                      details & amounts
                             |
                             v
                    +-------------------+
                    |    IN REVIEW      |
                    +--------+----------+
                             |
               +-------------+-------------+
               |             |             |
               v             v             v
      +--------+--+  +------+------+  +---+--------+
      |  APPROVE  |  |   REJECT    |  |   REVERT   |
      |           |  |             |  | (send back) |
      +-----------+  +------+------+  +---+--------+
                             |             |
                             v             v
                     Task closed     Task returns
                     with reason     to Group Pool
                                    for re-review
```

### What Happens at Each Stage

| Stage | What the User Sees | Who Can Act |
|-------|-------------------|-------------|
| **Task Created** | Task appears in Group Tasks queue | Nobody yet -- it just arrived |
| **Group Pool** | Card shows patient name, type, amount, date | Any group member |
| **Claimed** | Task moves to the claimer's My Tasks tab | Only the person who claimed it |
| **In Review** | Detailed view with all financial data visible | Only the claimer |
| **Approved** | Confirmation message, task disappears from queue | Done -- no further action |
| **Rejected** | Rejection reason recorded, task closed | Done -- no further action |
| **Reverted** | Task unclaimed, returns to Group Pool | Any group member can re-claim |

---

## The 13 Approval Types

### 1. Invoice Approval

Review an invoice before it is finalized for the patient.

```
+--------------------------------------------------+
|  INVOICE APPROVAL                                 |
|                                                   |
|  Patient: Rajesh Kumar                            |
|  MRN: NH-2026-00451                               |
|  Encounter: IP/2026/03/1234                       |
|                                                   |
|  +----------------------------------------------+ |
|  | Gross Amount         :    Rs 1,25,000         | |
|  | Hospital Tariff      :    Rs 1,10,000         | |
|  | Patient Discount     :  - Rs    5,000         | |
|  | Sponsor Discount     :  - Rs   15,000         | |
|  |----------------------------------------------| |
|  | Patient Payable      :    Rs   90,000         | |
|  +----------------------------------------------+ |
|                                                   |
|  Remarks: Post-surgery billing for cardiac unit   |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

**Key fields:** Gross Amount, Hospital Tariff, Patient Discount, Sponsor Discount, Patient Payable

---

### 2. Receipt Approval

Confirm that a payment received from the patient or sponsor is valid.

```
+--------------------------------------------------+
|  RECEIPT APPROVAL                                 |
|                                                   |
|  Patient: Meena Devi                              |
|  MRN: NH-2026-00389                               |
|                                                   |
|  +----------------------------------------------+ |
|  | Receipt Amount       :    Rs 12,000           | |
|  | Payment Mode         :    UPI                 | |
|  | Receipt Date         :    15 Mar 2026         | |
|  | Reference No.        :    UPI-78234-X         | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

**Key field:** Receipt Amount

---

### 3. Refund Approval

Authorize returning money to a patient.

```
+--------------------------------------------------+
|  REFUND APPROVAL                                  |
|                                                   |
|  Patient: Priya Sharma                            |
|  MRN: NH-2026-00412                               |
|                                                   |
|  +----------------------------------------------+ |
|  | Refund Amount        :    Rs 8,500            | |
|  | Refund Reason        :    Service cancelled   | |
|  | Original Invoice     :    INV-2026-5567       | |
|  | Original Amount      :    Rs 25,000           | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

**Key fields:** Refund Amount, Refund Reason

---

### 4. Unbilled Approval

Review charges that have been incurred but not yet formally invoiced.

```
+--------------------------------------------------+
|  UNBILLED APPROVAL                                |
|                                                   |
|  Patient: Karthik Menon                           |
|  MRN: NH-2026-00478                               |
|                                                   |
|  +----------------------------------------------+ |
|  | Unbilled Amount      :    Rs 3,200            | |
|  | Service              :    Lab Tests (Panel A) | |
|  | Department           :    Pathology           | |
|  | Date of Service      :    14 Mar 2026         | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

**Key field:** Unbilled Amount

---

### 5-9. Discount Approvals (5 Types)

AHAM handles five distinct discount types, each with its own approval screen. All share a similar layout but differ in who benefits and why.

#### 5. Discretionary Discount

A discount granted at the discretion of a doctor or administrator (e.g., compassionate grounds).

```
+--------------------------------------------------+
|  DISCRETIONARY DISCOUNT                           |
|                                                   |
|  Patient: Anil Reddy                              |
|  Authorized By: Dr. Venkat (HOD, Cardiology)      |
|                                                   |
|  +----------------------------------------------+ |
|  | Original Amount      :    Rs 50,000           | |
|  | Discount Percentage  :    20%                 | |
|  | Discount Amount      :    Rs 10,000           | |
|  | Reason               :    Financial hardship  | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

#### 6. Non-Discretionary Discount

A standard discount applied per hospital policy (e.g., senior citizen, employee family).

```
+--------------------------------------------------+
|  NON-DISCRETIONARY DISCOUNT                       |
|                                                   |
|  Patient: Sunita Joshi                            |
|  Policy: Senior Citizen (65+)                     |
|                                                   |
|  +----------------------------------------------+ |
|  | Original Amount      :    Rs 30,000           | |
|  | Discount Percentage  :    10%                 | |
|  | Discount Amount      :    Rs  3,000           | |
|  | Policy Reference     :    SC-POLICY-2024      | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

#### 7. Sponsor Discount

A discount provided by a sponsoring entity (insurance company, government scheme, corporate tie-up).

```
+--------------------------------------------------+
|  SPONSOR DISCOUNT                                 |
|                                                   |
|  Patient: Ramesh Babu                             |
|  Sponsor: Star Health Insurance                   |
|                                                   |
|  +----------------------------------------------+ |
|  | Original Amount      :    Rs 80,000           | |
|  | Sponsor Covers       :    Rs 60,000           | |
|  | Sponsor Discount     :    Rs  5,000           | |
|  | Patient Pays         :    Rs 15,000           | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

#### 8. Patient Discount

A direct reduction applied to the patient's portion of the bill.

```
+--------------------------------------------------+
|  PATIENT DISCOUNT                                 |
|                                                   |
|  Patient: Deepa Krishnan                          |
|                                                   |
|  +----------------------------------------------+ |
|  | Patient Payable      :    Rs 25,000           | |
|  | Discount Amount      :    Rs  2,500           | |
|  | Revised Payable      :    Rs 22,500           | |
|  | Reason               :    Loyalty program     | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

#### 9. Plan Discount

A discount tied to a specific health plan or package the patient is enrolled in.

```
+--------------------------------------------------+
|  PLAN DISCOUNT                                    |
|                                                   |
|  Patient: Arjun Nair                              |
|  Plan: NH Cardiac Care Gold                       |
|                                                   |
|  +----------------------------------------------+ |
|  | Package Price        :    Rs 2,50,000         | |
|  | Plan Discount        :    Rs   25,000         | |
|  | Final Package Price  :    Rs 2,25,000         | |
|  | Plan Validity        :    Until Dec 2026      | |
|  +----------------------------------------------+ |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

---

### 10. High Value Medication

Approve expensive medications that exceed a cost threshold.

```
+--------------------------------------------------+
|  HIGH VALUE MEDICATION                            |
|                                                   |
|  Patient: Sanjay Gupta                            |
|  Prescribing Doctor: Dr. Rao (Oncology)           |
|                                                   |
|  +----------------------------------------------+ |
|  | Medication           :    Pembrolizumab       | |
|  | Dosage               :    200mg IV            | |
|  | Unit Cost            :    Rs 1,25,000         | |
|  | Quantity             :    1                    | |
|  | Total Cost           :    Rs 1,25,000         | |
|  +----------------------------------------------+ |
|                                                   |
|  Clinical Justification:                          |
|  Stage IV NSCLC, PD-L1 positive. First-line       |
|  immunotherapy per NCCN guidelines.               |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

---

### 11. Authorization

Approve a pre-authorization request for a planned procedure or admission.

```
+--------------------------------------------------+
|  AUTHORIZATION                                    |
|                                                   |
|  Patient: Vikram Singh                            |
|  Procedure: Total Knee Replacement (Right)        |
|                                                   |
|  +----------------------------------------------+ |
|  | Estimated Cost       :    Rs 3,50,000         | |
|  | Authorized Amount    :    Rs 3,00,000         | |
|  | Patient Responsibility:   Rs   50,000         | |
|  | Insurance Provider   :    ICICI Lombard       | |
|  | Pre-Auth Reference   :    PA-2026-8891        | |
|  +----------------------------------------------+ |
|                                                   |
|  Note: Amount may be recalculated based on        |
|  actual procedure costs.                          |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

---

### 12. Mandatory Brand Approval

Approve a request to use a specific brand-name medication instead of the generic alternative.

```
+--------------------------------------------------+
|  MANDATORY BRAND                                  |
|                                                   |
|  Patient: Fatima Begum                            |
|  Doctor: Dr. Prasad (Neurology)                   |
|                                                   |
|  +----------------------------------------------+ |
|  | Generic Name         :    Levetiracetam       | |
|  | Requested Brand      :    Keppra              | |
|  | Generic Cost         :    Rs    800            | |
|  | Brand Cost           :    Rs  2,400            | |
|  | Cost Difference      :    Rs  1,600            | |
|  +----------------------------------------------+ |
|                                                   |
|  Doctor's Reason: Patient has adverse reaction    |
|  to generic formulation excipients.               |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

---

### 13. Receipt / Invoice Cancellation

Approve the cancellation of a previously issued receipt or invoice.

```
+--------------------------------------------------+
|  RECEIPT/INVOICE CANCELLATION                     |
|                                                   |
|  Patient: Gopal Rao                               |
|  Document: Receipt REC-2026-4421                  |
|                                                   |
|  +----------------------------------------------+ |
|  | Original Amount      :    Rs 15,000           | |
|  | Document Type        :    Receipt             | |
|  | Original Date        :    10 Mar 2026         | |
|  | Cancellation Reason  :    Duplicate entry      | |
|  +----------------------------------------------+ |
|                                                   |
|  Warning: Cancellation is irreversible once       |
|  approved.                                        |
|                                                   |
|  [ APPROVE ]    [ REJECT ]    [ REVERT ]          |
+--------------------------------------------------+
```

---

### Bonus: Retrospect Invoice (2-Stage Approval)

Retrospect invoices require TWO levels of approval because they modify a bill after the patient has already been discharged.

```
  Stage 1                          Stage 2
  (First Reviewer)                 (Senior Reviewer)

  +------------------+             +------------------+
  |  RETROSPECT      |             |  RETROSPECT      |
  |  INVOICE         |             |  INVOICE         |
  |  (Stage 1 of 2)  |             |  (Stage 2 of 2)  |
  |                  |  Approve    |                  |
  |  Review changes  +------------>+  Final sign-off  |
  |  to post-        |             |  by senior       |
  |  discharge bill  |             |  authority       |
  |                  |             |                  |
  |  [APPROVE]       |             |  [APPROVE]       |
  |  [REJECT]        |             |  [REJECT]        |
  |  [REVERT]        |             |  [REVERT]        |
  +------------------+             +------------------+
```

Stage 1 reviewer approves --> task automatically moves to Stage 2 queue for a senior reviewer. Both must approve for the retrospect invoice to be finalized.

---

## Task Actions Explained

### Claim

**What it does:** Takes an unclaimed task from the Group Pool and assigns it to you.

**When to use:** When you see a task in Group Tasks that you want to handle.

**What happens:**
- The task moves from "Group Tasks" to "My Tasks"
- Other team members can no longer claim it
- You can now review the details and take action

**Think of it as:** Picking up a file from the shared inbox and putting it on your desk.

---

### Approve

**What it does:** Confirms that the financial document is correct and should be processed.

**When to use:** After reviewing all the amounts, reasons, and patient details, and everything checks out.

**What happens:**
- The task is marked as approved
- The billing system processes the document (invoice sent, refund initiated, etc.)
- The task disappears from your queue
- An audit trail entry is created

**Think of it as:** Signing off on a form and sending it to be processed.

---

### Reject

**What it does:** Declines the financial document with a reason.

**When to use:** When something is wrong -- incorrect amount, missing justification, policy violation.

**What happens:**
- You must enter a rejection reason (mandatory)
- The task is closed
- The originator is notified that their request was rejected
- An audit trail entry is created with your reason

**Think of it as:** Sending a form back with a "Not Approved" stamp and a note explaining why.

---

### Revert

**What it does:** Unclaims the task and sends it back to the Group Pool.

**When to use:** When you realize you are not the right person to handle this task, or you need someone else's expertise.

**What happens:**
- The task moves from "My Tasks" back to "Group Tasks"
- It becomes available for any group member to claim
- Your claim is released -- no record of you having held it
- No approval or rejection is recorded

**Think of it as:** Putting a file back in the shared inbox because it belongs to someone else.

---

## Validation Rules

These rules are enforced by the app. If a rule is not met, the user sees an error message and cannot proceed.

### General Rules (Apply to All Tasks)
- A task must be **claimed** before any action (approve/reject/revert) can be taken
- Rejection **requires a reason** -- the reason field cannot be empty
- Amounts displayed are **read-only** -- staff cannot edit amounts in AHAM, only approve or reject them
- All actions are **logged** for audit purposes with timestamp and user identity

### Financial Amount Rules
- Invoice amounts must show both gross and net (patient payable) values
- Refund amount must not exceed the original invoice amount
- Discount percentage must be between 0% and 100%
- Authorization amounts may be recalculated -- the reviewer should verify the latest figure

### Retrospect Invoice Rules
- Stage 1 must be approved before Stage 2 becomes available
- If Stage 1 is rejected, Stage 2 never triggers
- A different reviewer must handle Stage 2 (cannot be the same person as Stage 1)

### Task Queue Rules
- A task can only be in one person's "My Tasks" at a time
- If a task is reverted, it returns to the Group Pool with its original priority
- Supervisors can view all tasks but follow the same claim-before-action rule

---

## User Journeys

### Journey 1: Approving an Invoice

**Scenario:** Billing admin Sunita needs to approve a cardiac surgery invoice for patient Rajesh Kumar.

```
Step 1: Sunita opens AHAM and taps "Task Management"
        |
        v
Step 2: She sees 3 tasks in her "Group Tasks" tab
        One is an Invoice Approval for Rs 1,25,000
        |
        v
Step 3: She taps the invoice task card
        The detail screen opens showing:
        - Gross Amount: Rs 1,25,000
        - Hospital Tariff: Rs 1,10,000
        - Patient Discount: Rs 5,000
        - Sponsor Discount: Rs 15,000
        - Patient Payable: Rs 90,000
        |
        v
Step 4: She taps "Claim"
        The task moves to her "My Tasks" tab
        |
        v
Step 5: She cross-checks the amounts against the
        hospital system records
        Everything matches
        |
        v
Step 6: She taps "Approve"
        Confirmation: "Task approved successfully"
        The task disappears from her queue
        |
        v
Step 7: The billing system generates the final
        invoice and sends it to the patient
```

**Total time:** ~2 minutes

---

### Journey 2: Handling a Refund

**Scenario:** Finance manager Prakash reviews a refund request from patient Priya Sharma whose elective surgery was cancelled.

```
Step 1: Prakash opens "Task Management"
        and checks "Group Tasks"
        |
        v
Step 2: He sees a Refund Approval task
        Patient: Priya Sharma
        Refund Amount: Rs 8,500
        Reason: "Service cancelled"
        |
        v
Step 3: He taps to view details and claims the task
        |
        v
Step 4: He reviews:
        - Original Invoice: INV-2026-5567 (Rs 25,000)
        - Refund requested: Rs 8,500
        - This is partial refund (advance payment)
        - Reason seems valid: surgery was cancelled
        |
        v
Step 5: He notices the refund amount seems low --
        the advance was Rs 10,000 not Rs 8,500
        |
        v
        DECISION POINT: Something doesn't add up
        |
        v
Step 6: He taps "Reject"
        Enters reason: "Refund amount incorrect.
        Patient advance was Rs 10,000 per records.
        Please resubmit with correct amount."
        |
        v
Step 7: Task is closed with rejection reason
        The billing team is notified to correct
        and resubmit
```

**Total time:** ~3 minutes

---

### Journey 3: Reverting a Task

**Scenario:** Front office staff member Kavita claims a High Value Medication task by mistake -- it should be handled by the pharmacy team lead.

```
Step 1: Kavita sees a High Value Medication task
        in Group Tasks and claims it
        |
        v
Step 2: She opens the details:
        Medication: Pembrolizumab (Rs 1,25,000)
        She realizes this needs pharmacy expertise,
        not front office review
        |
        v
Step 3: She taps "Revert"
        |
        v
Step 4: Confirmation: "Task reverted to group pool"
        The task moves back to Group Tasks
        |
        v
Step 5: Pharmacy team lead Rajan sees the task
        in his Group Tasks, claims it, reviews
        the clinical justification, and approves it
```

**Total time:** ~30 seconds for the revert

---

*Next: [Chat Conversations](./02_CHAT_CONVERSATIONS.md)*
