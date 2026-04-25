# AHAM Billing, Finance, Settings & Notifications -- Implementation Flow

> **Audience:** Junior developers building this system from scratch.
> **Stack:** Flutter/Dart, BLoC pattern, jBPM workflow engine, REST APIs, Firebase (FCM + Remote Config).
> **Last updated:** 2026-04-22

---

## Table of Contents

1. [Overview](#1-overview)
2. [Invoice System](#2-invoice-system)
3. [Receipt System](#3-receipt-system)
4. [Refund System](#4-refund-system)
5. [Discount System](#5-discount-system)
6. [Authorization System](#6-authorization-system)
7. [Retrospect Invoice (2-Stage Approval)](#7-retrospect-invoice-2-stage-approval)
8. [Additional Models](#8-additional-models)
9. [Billing API Reference](#9-billing-api-reference)
10. [Detail Screens (7 Screens, Shared TaskDetailBloc)](#10-detail-screens)
11. [Multi-Facility Switching](#11-multi-facility-switching)
12. [Notification System](#12-notification-system)
13. [Remote Config & Feature Flags](#13-remote-config--feature-flags)
14. [Language & Localization](#14-language--localization)
15. [Privacy & Security](#15-privacy--security)
16. [Local Storage Architecture](#16-local-storage-architecture)
17. [Error Handling](#17-error-handling)
18. [Edge Cases](#18-edge-cases)
19. [Implementation Checklist](#19-implementation-checklist)

---

## 1. Overview

This document covers two distinct but interconnected parts of AHAM:

- **Part A: Billing & Finance** -- The financial document hierarchy, approval workflows, and the 7 detail screens that let approvers review invoices, receipts, refunds, discounts, authorizations, medications, and unbilled documents.
- **Part B: Settings & Notifications** -- Multi-facility switching, push notifications (FCM), remote config / feature flags, language localization, privacy, security, and local storage.

### Why These Are Combined

Billing documents are scoped to the active facility and unit. When a user switches facilities (a Settings action), all billing data must refresh. Notifications alert users about new billing tasks. Language settings determine how billing screens render labels. These systems are deeply intertwined at runtime.

### Document Hierarchy (Billing)

```
Service Delivery
       |
       v
Invoice Generation -----------> Invoice Generation Approval (jBPM)
       |
       +-- Discount Applied -----> Discount Approval (jBPM)
       |
       v
Receipt Collection -----------> Receipt Approval (jBPM)
       |
       +-- Cancel Receipt -------> Receipt Cancellation (jBPM)
       |
       +-- Refund Initiated -----> Refund Approval (jBPM)
       |
       +-- Retrospective Adj ----> Retrospect Invoice Initiation (jBPM)
       |                                |
       |                                v
       |                         Retrospect Invoice Approval (jBPM, auto-created)
       |
       +-- Reversal -------------> Reversal Invoice Approval (jBPM)
       |
       +-- Cancellation ----------> Invoice Cancellation (jBPM)

Unbilled Services ----------------> UnBilled Invoice Approval (jBPM)
High-Value Medications -----------> HighValue MedicationRequest Approval (jBPM)
Authorization Requests -----------> Authorization Approval (jBPM)
Mandatory Brand (LCHM) -----------> Mandatory Brand Approval (jBPM)
```

### Document Relationships

```
Invoice --+-- Receipt --+-- Refund
           |
           +-- UnbilledDocument
           |
           +-- Authorization
           |
           +-- InvoiceDiscountModel
           |
           +-- RetrospectInvoiceModel
           |
           +-- ReversalInvoiceModel

MedicationRequestModel (standalone)
LchmModel (standalone)
HighValueModel (standalone)
```

**Key insight:** Every financial action flows through jBPM approval. The AHAM mobile app is a read-only reviewer -- approvers can claim, approve, reject, or revert tasks, but they do NOT create or edit invoices, receipts, or refunds directly. Those originate from the hospital's back-office billing systems.

### Settings Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     SETTINGS LAYER                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Multi-Facility│  │  Language    │  │  Notifications   │   │
│  │ Switching     │  │  (8 langs)  │  │  (FCM / system)  │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────────┘   │
│         │                 │                  │                │
│         ├─────────────────┼──────────────────┤                │
│         v                 v                  v                │
│  ┌────────────────────────────────────────────────────────┐   │
│  │               PreferenceBloc                           │   │
│  │  Events: LoadPreferences, PreferenceSave               │   │
│  │  Persistence: SharedPreferences + Server sync          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ Remote Config│  │  Privacy     │  │  FAQ / About Us  │   │
│  │ (Firebase)   │  │  Policy      │  │  (local content) │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Invoice System

### 2.1 The Invoice Model (40+ Fields, 6 Groups)

The invoice is the central financial document. Every other document (receipt, refund, discount, authorization) links back to an invoice.

#### Group 1 -- Identity & Patient Fields

| Field | Type | Description |
|-------|------|-------------|
| `invoiceId` | `String` | Internal unique identifier |
| `invoiceNumber` | `String` | Human-readable number (e.g., `INV-2026-001234`). Note: display label is `invoiceNo` but the Dart property is `invoiceNumber`. |
| `patientId` | `String` | Patient reference ID |
| `uhid` | `String` | Universal Health ID |
| `patientName` | `String` | Patient display name |
| `encounterNo` | `String` | Visit / encounter number |
| `unitCode` | `String` | Hospital unit code |
| `departmentCode` | `String` | Department code |
| `invoiceDate` | `String` | Invoice creation date (ISO-8601) |
| `invoiceStatus` | `String` | Current invoice status |
| `invoiceType` | `String` | Invoice type classification |

#### Group 2 -- Gross & Base Amounts

| Field | Type | Description |
|-------|------|-------------|
| `grossAmount` | `double` | Total gross amount before any discounts |
| `grossAmtWithAuth` | `double` | Gross amount factoring in authorization scope |
| `hospitalTariff` | `double` | Hospital tariff rate applied |
| `taxAmount` | `double` | Total tax amount |
| `originalInvoiceAmt` | `double` | Original invoice amount at creation |
| `originalInvoiceAmount` | `double` | Alternate full name (binary has both `originalInvoiceAmt` and `originalInvoiceAmount`) |
| `originalInvoiceAmtWithAuth` | `double` | Authorization-adjusted original amount |
| `updatedInvoiceAmt` | `double` | Updated amount after modifications |
| `netAmount` | `double` | Net amount after all adjustments |

#### Group 3 -- Discount Fields

| Field | Type | Description |
|-------|------|-------------|
| `patientDiscount` | `double` | Discount applied to the patient portion |
| `patientDiscountWithAuth` | `double` | Patient discount recalculated with authorization |
| `sponsorDiscount` | `double` | Discount applied to the sponsor portion |
| `sponsorDiscountWithAuth` | `double` | Sponsor discount recalculated with authorization |
| `discretionaryDiscount` | `double` | Manual discount (always requires Discount Approval) |
| `nonDiscretionaryDiscount` | `double` | System-applied discount based on rules/contracts |
| `planDiscountAmount` | `double` | Discount from insurance plan / health scheme |
| `totalUserDiscountPercentage` | `double` | Aggregate user discount expressed as percentage |

#### Group 4 -- Payable & Settlement Fields

| Field | Type | Description |
|-------|------|-------------|
| `patientPayable` | `double` | Amount the patient must pay |
| `patientPayableWithAuth` | `double` | Patient payable recalculated with authorization |
| `sponsorAmount` | `double` | Sponsor's contribution amount |
| `sponsorPayable` | `double` | Sponsor payable amount |
| `sponsorNetAmtWithAuth` | `double` | Sponsor net amount with authorization |
| `totalSponsorAmount` | `double` | Total sponsor amount across all heads |
| `patientAmount` | `double` | Total patient responsibility |
| `totalAmount` | `double` | Grand total (patient + sponsor) |

#### Group 5 -- Metadata

| Field | Type | Description |
|-------|------|-------------|
| `lineItems` | `List<TaskLineItem>?` | Service line items on the invoice |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp (ISO-8601) |
| `approvedBy` | `String?` | Approver user ID (set after approval) |
| `approvedAt` | `String?` | Approval timestamp |
| `remarks` | `String?` | Free-text remarks / notes |

#### Group 6 -- Additional Fields

| Field | Type | Description |
|-------|------|-------------|
| `retrospectInvAmount` | `double` | Retrospect invoice amount |
| `reasonForRetrospect` | `String?` | Reason text for retrospective adjustments |
| `consultationFee` | `double` | Consultation fee |
| `registrationFee` | `double` | Registration fee |
| `regChargesCollected` | `double` | Registration charges collected |
| `patientPaymentCategory` | `String` | Payment category classification |
| `billingType` | `String` | Billing type (e.g., `PRE_BILLING`) |
| `encounterDocumentNumber` | `String` | Encounter document number |

### 2.2 Invoice Amount Formula

This is the core financial calculation. Every developer on the billing team must understand it.

```
netAmount = grossAmount
          - patientDiscount
          - sponsorDiscount
          - discretionaryDiscount
          - nonDiscretionaryDiscount
          - planDiscountAmount
          + taxAmount

patientPayable = netAmount - sponsorAmount
sponsorPayable = sponsorAmount
totalAmount = patientPayable + sponsorPayable  (== netAmount)

totalUserDiscountPercentage =
  ((patientDiscount + discretionaryDiscount + nonDiscretionaryDiscount
    + planDiscountAmount) / grossAmount) * 100
```

### 2.3 Amount Relationship Diagram

```
grossAmount
    |
    +-- - patientDiscount
    +-- - sponsorDiscount
    +-- - discretionaryDiscount
    +-- - nonDiscretionaryDiscount
    +-- - planDiscountAmount
    |
    v
netAmount = grossAmount - (all discounts) + taxAmount
    |
    +-- patientPayable = netAmount - sponsorAmount
    |
    +-- sponsorPayable = sponsorAmount
    |
    +-- totalAmount = patientPayable + sponsorPayable (== netAmount)

With Authorization:
    grossAmtWithAuth        --> patientPayableWithAuth
                             --> sponsorNetAmtWithAuth
    patientDiscountWithAuth = patientDiscount (recalculated for auth scope)
    sponsorDiscountWithAuth = sponsorDiscount (recalculated for auth scope)
```

### 2.4 Authorization Adjustment Formula

```
grossAmtWithAuth = grossAmount (scoped to authorized services only)

patientDiscountWithAuth = recalculated for authorized scope
sponsorDiscountWithAuth = recalculated for authorized scope

patientPayableWithAuth = grossAmtWithAuth - sponsorNetAmtWithAuth - discountsWithAuth
sponsorNetAmtWithAuth  = authorized sponsor portion
```

### 2.5 Invoice Type / Status Values

| Value | Description |
|-------|-------------|
| `INVOICE` | Standard invoice |
| `INVOICE_AUTHORIZATION` | Invoice with authorization |
| `UNBILLED_INVOICE` | Unbilled invoice |
| `PRE_BILLING` | Pre-billing invoice |
| `CANCELLED_RECEIPT` | Cancelled receipt |
| `Retrospect_Invoice` | Retrospective invoice |
| `Invoice_Discount` | Invoice with discount |
| `Invoice_Retrospect` | Invoice retrospect variant |

### 2.6 Invoice User Journey (Approver)

```
Step 1: User opens Task Management module
        -> Sees task card: "Invoice Generation Approval - INV-2026-001234"
        -> User taps the card

Step 2: App dispatches LoadTaskDetail(taskId: 12345)
        -> TaskDetailBloc emits TaskDetailLoadingState
        -> Two parallel API calls:
           a) GET /api/jbpm/tasks/12345/process-variable
           b) GET /amb/invoicelite?documentNo=INV-2026-001234
        -> TaskDetailBloc emits TaskDetailLoadedState
        -> InvoiceDetailScreen renders with all 6 field groups

Step 3: User reviews the invoice
        -> Gross amount, discounts, net amount, patient/sponsor split
        -> Line items (services, quantities, rates)
        -> Patient information (name, UHID, encounter)

Step 4: User claims the task
        -> POST /api/jbpm/tasks/12345/claim-start
        -> Approve / Reject / Revert buttons appear

Step 5: User approves (or rejects with mandatory remarks)
        -> jBPM completes the task
        -> Invoice status updated server-side
        -> Navigate back to task list
```

---

## 3. Receipt System

### 3.1 Receipt Model (16 Fields)

| Field | Type | Description |
|-------|------|-------------|
| `receiptId` | `String` | Internal receipt ID |
| `receiptNumber` | `String` | Display receipt number (e.g., `REC-2026-000567`). Note: display label is `receiptNo` but the Dart property is `receiptNumber`. |
| `invoiceNo` | `String` | Linked invoice number |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `receiptAmount` | `double` | Amount received |
| `paymentMode` | `String` | Payment method: Cash / Card / UPI / NEFT / Cheque |
| `receiptDate` | `String` | Receipt date (ISO-8601) |
| `receiptStatus` | `String` | Current status (see lifecycle below) |
| `cancellationAmount` | `double?` | Amount to cancel (null if not cancelled) |
| `reasonForCancellation` | `String?` | Cancellation reason text |
| `cancelledBy` | `String?` | User who initiated cancellation |
| `cancelledAt` | `String?` | Cancellation timestamp |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `unitCode` | `String` | Hospital unit code |

### 3.2 Receipt Status Lifecycle

```
CREATED --> Receipt Approval task (jBPM)
    |
    +-- Approved --> ACTIVE
    |                  |
    |                  +-- Cancel requested --> CANCELLATION_PENDING
    |                  |                           |
    |                  |                   +-------+-------+
    |                  |                   |               |
    |                  |                   v               v
    |                  |            CANCELLED     CANCELLATION_REJECTED
    |                  |                           (stays ACTIVE)
    |                  |
    |                  +-- Refund initiated --> (see Refund flow, Section 4)
    |
    +-- Rejected --> Receipt stays in CREATED (not finalized)
```

### 3.3 Receipt Status Values

| Status | Description |
|--------|-------------|
| `CREATED` | Receipt generated, pending approval |
| `ACTIVE` | Receipt approved, payment confirmed |
| `CANCELLATION_PENDING` | Cancellation requested, awaiting approval |
| `CANCELLED` | Receipt cancelled after approval |
| `CANCELLATION_REJECTED` | Cancellation request rejected, receipt stays ACTIVE |

### 3.4 Receipt Cancellation Validation

```
cancellationAmount <= receiptAmount
cancellationAmount == receiptAmount   --> full cancellation
cancellationAmount < receiptAmount    --> partial cancellation
```

### 3.5 Receipt User Journey (Approver)

```
Step 1: User sees "Receipt Approval" or "Receipt Cancellation" task
        -> Taps the card

Step 2: ReceiptDetailScreen loads
        -> Shows receipt number, linked invoice, amount, payment mode
        -> For cancellation tasks: shows cancellation amount and reason

Step 3: User claims -> reviews -> approves or rejects
        -> For Receipt Cancellation:
           - Approve -> receipt status changes to CANCELLED
           - Reject -> receipt status stays ACTIVE (cancellation rejected)
```

---

## 4. Refund System

### 4.1 Refund Model (16 Fields)

| Field | Type | Description |
|-------|------|-------------|
| `refundId` | `String` | Internal refund ID |
| `refundNumber` | `String` | Display refund number (e.g., `REF-2026-000123`). Note: display label is `refundNo` but the Dart property is `refundNumber`. |
| `receiptNo` | `String` | Linked receipt number |
| `invoiceNo` | `String` | Linked invoice number |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `refundAmount` | `double` | Amount to refund |
| `refundMode` | `String` | Refund method: Cash / Bank Transfer / UPI |
| `refundDate` | `String` | Refund date (ISO-8601) |
| `refundStatus` | `String` | Current status |
| `reasonForRefund` | `String` | Refund reason text (mandatory) |
| `approvedBy` | `String?` | Approver user ID |
| `approvedAt` | `String?` | Approval timestamp |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `unitCode` | `String` | Hospital unit code |

### 4.2 Refund Status Lifecycle

```
INITIATED (PENDING)
    |
    v
Refund Approval task created (APPROVAL_PENDING)
    |
    +-- Approved --> APPROVED --> Refund processed (money returned)
    |
    +-- Rejected --> REJECTED (terminal)
```

| Status | Description |
|--------|-------------|
| `PENDING` | Refund initiated, not yet submitted for approval |
| `APPROVAL_PENDING` | Refund submitted, awaiting approval task |
| `APPROVED` | Refund approved, processing initiated |
| `REJECTED` | Refund request rejected |

### 4.3 Refund Validation Rules

| Rule | Error Message | Enforcement |
|------|---------------|-------------|
| `refundAmount <= receiptAmount - previousRefundsForReceipt` | Server-side validation | Server |
| `refundMode` must be non-null and non-empty | `"Cannot approve document, Refund mode not available"` | Server |
| Reason must be provided | `"Please enter reason for refund"` | Client |

```
maxRefundable = receiptAmount - sum(previousApprovedRefundsForReceipt)
refundAmount <= maxRefundable
refundMode must be non-null and non-empty
```

### 4.4 Refund User Journey (Approver)

```
Step 1: User sees "Refund Approval" task
        -> Taps the card

Step 2: RefundDetailScreen loads
        -> Shows refund number, linked receipt, linked invoice
        -> Refund amount, refund mode, reason

Step 3: User claims -> reviews -> approves or rejects
        -> CRITICAL: If refundMode is missing or empty:
           - Server returns 400: "Cannot approve document, Refund mode not available"
           - Approver must reject the task so the initiator can fix it
```

---

## 5. Discount System

### 5.1 Five Discount Types

| # | Type | Invoice Field | Requires Approval | Applied By | Description |
|---|------|-------------|-------------------|-----------|-------------|
| 1 | Non-Discretionary | `nonDiscretionaryDiscount` | No | System (rules) | Policy-based: senior citizen, employee family |
| 2 | Plan | `planDiscountAmount` | No | System | Health plan / scheme discount |
| 3 | Discretionary | `discretionaryDiscount` | **Always** | User (manual) | Compassionate or case-by-case discount |
| 4 | Sponsor | `sponsorDiscount` | Depends | System/User | Insurance/corporate sponsor reduction |
| 5 | Patient | `patientDiscount` | Depends | System/User | Reduction on patient's portion |

### 5.2 Discount Calculation Order

This order is critical. Implement it exactly as specified.

```
Step 1: Apply non-discretionary discount (automatic, policy-based)
    |
Step 2: Apply plan discount (automatic, from insurance/scheme enrollment)
    |
Step 3: Apply discretionary discount (manual entry --> triggers Discount Approval task)
    |
Step 4: Calculate totalUserDiscountPercentage:
        = ((patientDiscount + discretionaryDiscount + nonDiscretionaryDiscount
            + planDiscountAmount) / grossAmount) * 100
    |
Step 5: Split discounts between patient and sponsor portions
    |
Step 6: Recalculate patientPayable and sponsorPayable
```

### 5.3 Discount Percentage Validation

```
totalUserDiscountPercentage >= 0
totalUserDiscountPercentage <= 100
```

If the discount percentage exceeds 100%, the server rejects with: `"Discount amount exceeds allowable limit"`.

### 5.4 Discount Approval API

```
POST /amb/invoice/discount

Request:
{
  "invoiceNo": "INV-2026-001234",
  "discretionaryDiscount": 500.00,
  "nonDiscretionaryDiscount": 0,
  "totalUserDiscountPercentage": 5.0,
  "remarks": "Financial hardship - approved by HOD",
  "approvedBy": "dr.venkat"
}

Response 200:
{
  "invoiceNo": "INV-2026-001234",
  "updatedInvoiceAmt": 9500.00,
  "patientPayable": 4750.00,
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 5.5 InvoiceDiscountModel (Discount History)

| Field | Type | Description |
|-------|------|-------------|
| `discountId` | `String` | Discount record ID |
| `invoiceNo` | `String` | Invoice reference |
| `discountType` | `String` | DISCRETIONARY / NON_DISCRETIONARY / SPONSOR / PATIENT / PLAN |
| `discountAmount` | `double` | Discount amount |
| `discountPercentage` | `double` | Discount as percentage |
| `appliedBy` | `String` | User who applied |
| `appliedAt` | `String` | Application timestamp |
| `approvedBy` | `String?` | Approver (if approval required) |
| `remarks` | `String?` | Reason for discount |

### 5.6 Discount Detail Screen Layout

When `InvoiceDetailScreen` renders a `Discount Approval` task, it shows this layout:

```
+----------------------------------------------+
| Discount Approval                            |
+----------------------------------------------+
| Original Amount:        Rs 50,000            |
| Discretionary Discount: Rs 10,000 (20%)     |
| Non-Discretionary:      Rs  0               |
| Plan Discount:          Rs  0               |
| Total Discount %:       20%                  |
| Updated Amount:         Rs 40,000            |
| -------------------------------------------- |
| Patient Payable:        Rs 30,000            |
| Sponsor Payable:        Rs 10,000            |
| -------------------------------------------- |
| Reason: Financial hardship                   |
| Authorized By: Dr. Venkat (HOD, Cardiology)  |
+----------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]             |
+----------------------------------------------+
```

---

## 6. Authorization System

### 6.1 Authorization Model (14 Fields)

Pre-authorization for planned procedures or admissions.

| Field | Type | Description |
|-------|------|-------------|
| `authorizationId` | `String` | Authorization ID |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `invoiceNo` | `String` | Linked invoice number |
| `requestedAmount` | `double` | Amount originally requested |
| `authorizationAmount` | `double` | Authorized amount (approved by insurer) |
| `status` | `AuthorizationStatus` | Current status |
| `validFrom` | `String` | Authorization validity start date |
| `validTo` | `String` | Authorization validity end date |
| `remarks` | `String?` | Authorization remarks |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `approvedBy` | `String?` | Approver user ID |
| `approvedAt` | `String?` | Approval timestamp |

### 6.2 Authorization Status Values

| Value | Description |
|-------|-------------|
| `PENDING` | Authorization pending review |
| `APPROVED` | Authorization approved |
| `REJECTED` | Authorization denied |
| `EXPIRED` | Past validity period (`validTo` < today) |
| `CANCELLED` | Authorization cancelled by user |

### 6.3 Authorization Lifecycle

```
Authorization request created (PENDING)
    |
    v
Authorization Approval task in jBPM
    |
    +-- Approved --> APPROVED --> Invoice WithAuth fields recalculated
    |
    +-- Rejected --> REJECTED (patient bears full cost)
    |
    +-- (time passes beyond validTo) --> EXPIRED
```

### 6.4 Authorization Impact on Invoice

When an authorization is APPROVED, it triggers automatic recalculation of the invoice's `WithAuth` fields. This is the critical side effect that makes authorizations different from other approval types.

```
Authorization APPROVED
    |
    v
Invoice recalculation:
    grossAmtWithAuth        = recalculated based on authorized service scope
    patientDiscountWithAuth = patient discount adjusted for auth
    sponsorDiscountWithAuth = sponsor discount adjusted for auth
    patientPayableWithAuth  = patient payable factoring authorization
    sponsorNetAmtWithAuth   = sponsor net amount with authorization
```

The `AuthorizationDetailScreen` displays both the requested amount and the authorized amount, highlighting the difference:

```
Patient Responsibility = requestedAmount - authorizationAmount
```

### 6.5 Authorization Detail Screen Layout

```
+--------------------------------------------+
| Authorization                          <- = |
+--------------------------------------------+
| Auth ID: AUTH-2026-000234                 |
| Patient: Vikram Singh (UHID-001234)       |
| Invoice: INV-2026-001234                 |
+--------------------------------------------+
| Authorization Details                      |
| +----------------------------------------+|
| | Estimated Cost:      Rs 3,50,000.00    ||
| | Authorized Amount:   Rs 3,00,000.00    ||
| | Patient Responsibility: Rs 50,000.00   ||
| | Valid From:          22 Apr 2026        ||
| | Valid To:            22 May 2026        ||
| | Status:              PENDING           ||
| +----------------------------------------+|
+--------------------------------------------+
| Note: Amount may be recalculated based     |
| on actual procedure costs.                 |
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

---

## 7. Retrospect Invoice (2-Stage Approval)

### 7.1 Why Retrospect Exists

Retrospect invoices modify bills after patient discharge. A lab test was missed, a charge was incorrect, or services were added after the patient left. Because this changes a finalized invoice, it requires two separate levels of approval from two different people.

### 7.2 RetrospectInvoiceModel

| Field | Type | Description |
|-------|------|-------------|
| `retrospectId` | `String` | Retrospect adjustment ID |
| `invoiceNo` | `String` | Original invoice being adjusted |
| `adjustmentType` | `String` | Type of adjustment (e.g., `LINE_ITEM_ADDITION`) |
| `adjustmentAmount` | `double` | Amount of adjustment |
| `reason` | `String` | Reason for retrospective change |
| `lineItems` | `List<TaskLineItem>?` | Adjusted line items |
| `stage` | `int` | Current stage (1 or 2) |
| `stage1ApprovedBy` | `String?` | Stage 1 approver (set after stage 1) |
| `stage1ApprovedAt` | `String?` | Stage 1 approval timestamp |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |

### 7.3 Two-Stage Approval Flow

```
Retrospect request submitted
    POST /amb/invoice/retrospect
       |
       v
Stage 1: Retrospect Invoice Initiation
       |   (taskName: "Retrospect Invoice Initiation")
       |   Assigned to: first-level reviewer group
       |
       +-- Rejected --> Terminal. No Stage 2 created.
       |
       +-- Approved
               |
               v
           Stage 2: Retrospect Invoice Approval
               |   (taskName: "Retrospect Invoice Approval")
               |   Auto-created by jBPM process
               |   Assigned to: senior reviewer group
               |
               +-- Rejected --> Terminal. Invoice unchanged.
               +-- Approved --> Retrospect finalized, invoice updated.
```

### 7.4 Retrospect Rules (Hard Constraints)

| Rule | Enforcement |
|------|------------|
| Stage 1 must be approved before Stage 2 is created | jBPM process definition |
| Stage 1 rejection prevents Stage 2 creation | jBPM process definition |
| Stage 1 approver CANNOT be Stage 2 approver | Server-side validation |
| Both stages use the same InvoiceDetailScreen | UI routing by `taskName` |
| Stage number is embedded in task description | `task.description` field |

**Key insight:** If User A approves Stage 1, and then User A tries to claim Stage 2, the server will reject the claim with a 403 error. This is enforced server-side, not in the app. The app will show an error, and User A should revert the Stage 2 task so someone else can claim it.

### 7.5 Retrospect API

```
POST /amb/invoice/retrospect

Request:
{
  "invoiceNo": "INV-2026-001234",
  "adjustmentType": "LINE_ITEM_ADDITION",
  "adjustmentAmount": 1000.00,
  "reason": "Post-discharge lab test charges not included",
  "lineItems": [
    {
      "serviceCode": "LAB-001",
      "quantity": 1,
      "unitPrice": 1000.00
    }
  ]
}

Response 200:
{
  "invoiceNo": "INV-2026-001234",
  "retrospectId": "RET-2026-000456",
  "workflowTriggered": true,
  "taskId": 12345
}
```

---

## 8. Additional Models

### 8.1 MedicationRequestModel

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `String` | Request ID |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `medicationName` | `String` | Medication name |
| `dosage` | `String` | Dosage description (e.g., "200mg IV") |
| `amount` | `double` | Unit cost |
| `quantity` | `int` | Prescribed quantity |
| `isHighValue` | `bool` | Flag: cost exceeds high-value threshold |
| `justification` | `String?` | Clinical justification |
| `prescribedBy` | `String` | Prescribing doctor ID |
| `prescribedByName` | `String` | Prescribing doctor name |
| `status` | `String` | PENDING / APPROVAL_PENDING / APPROVED / REJECTED |
| `createdOn` | `String` | Creation timestamp |
| `unitCode` | `String` | Hospital unit code |

### 8.2 HighValueModel

Extended medication request model for high-value drugs. When `isHighValue == true`, the medication goes through the `HighValue MedicationRequest Approval` workflow.

| Field | Type | Description |
|-------|------|-------------|
| (inherits all MedicationRequestModel fields) | | |
| `highValueThreshold` | `double` | Cost threshold that triggered high-value flag |
| `totalCost` | `double` | Computed: `amount * quantity` |
| `approvalLevel` | `String` | Required approval level (e.g., HOD, Director) |

**HighValue Detail Screen Layout:**

```
+--------------------------------------------+
| High Value Medication                  <- = |
+--------------------------------------------+
| Request ID: MED-2026-000456               |
| Patient: Rajesh Kumar (UHID-001234)       |
+--------------------------------------------+
| Medication Details                         |
| +----------------------------------------+|
| | Medication: Pembrolizumab              ||
| | Dosage: 200mg IV                       ||
| | Unit Cost: Rs 1,25,000.00             ||
| | Quantity: 1                            ||
| | Total Cost: Rs 1,25,000.00            ||
| | Is High Value: YES                     ||
| | Status: APPROVAL_PENDING              ||
| +----------------------------------------+|
+--------------------------------------------+
| Clinical Justification:                    |
| Stage IV NSCLC, PD-L1 positive.           |
| First-line immunotherapy per NCCN.         |
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 8.3 LchmModel (Low Cost High Margin / Mandatory Brand)

When a doctor prescribes a specific brand instead of the generic equivalent, this model captures the cost difference and requires approval.

| Field | Type | Description |
|-------|------|-------------|
| `requestId` | `String` | Request ID |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `genericName` | `String` | Generic drug name |
| `brandName` | `String` | Requested brand name |
| `genericCost` | `double` | Generic drug cost |
| `brandCost` | `double` | Brand drug cost |
| `dosage` | `String` | Dosage |
| `justification` | `String` | Doctor's reason for brand preference |
| `prescribedBy` | `String` | Prescribing doctor |
| `status` | `String` | PENDING / APPROVAL_PENDING / APPROVED / REJECTED |
| `createdOn` | `String` | Creation timestamp |
| `unitCode` | `String` | Unit code |

**LCHM Detail Screen Layout:**

```
+--------------------------------------------+
| Mandatory Brand Medication             <- = |
+--------------------------------------------+
| Request ID: MED-2026-000789               |
| Patient: Fatima Begum (UHID-001234)       |
+--------------------------------------------+
| Medication Details                         |
| +----------------------------------------+|
| | Generic Name: Levetiracetam            ||
| | Requested Brand: Keppra                ||
| | Generic Cost: Rs 800.00               ||
| | Brand Cost: Rs 2,400.00              ||
| | Cost Difference: Rs 1,600.00          ||
| | Status: APPROVAL_PENDING              ||
| +----------------------------------------+|
+--------------------------------------------+
| Doctor's Reason:                           |
| Patient has adverse reaction to generic    |
| formulation excipients.                    |
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 8.4 ReversalInvoiceModel

| Field | Type | Description |
|-------|------|-------------|
| `reversalId` | `String` | Reversal ID |
| `originalInvoiceNo` | `String` | Original invoice being reversed |
| `reversalAmount` | `double` | Amount being reversed |
| `reason` | `String` | Reversal reason |
| `status` | `String` | PENDING / APPROVED / REJECTED |
| `createdBy` | `String` | Creator |
| `createdAt` | `String` | Timestamp |

### 8.5 UnbilledDocument Model (13 Fields)

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `String` | Internal document ID |
| `documentNo` | `String` | Display number (e.g., `UBD-2026-000789`) |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `patientName` | `String` | Patient name |
| `encounterNo` | `String` | Encounter / visit number |
| `unbilledAmount` | `double` | Total unbilled service amount |
| `serviceDate` | `String` | Date services were rendered |
| `departmentCode` | `String` | Originating department |
| `unitCode` | `String` | Hospital unit code |
| `status` | `String` | PENDING / APPROVAL_PENDING / APPROVED / REJECTED |
| `lineItems` | `List<TaskLineItem>?` | Individual unbilled service items |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |

**Unbilled Document Flow:**

```
Services rendered but not invoiced
    |
    v
UnbilledDocument created (PENDING)
    |
    v
UnBilled Invoice Approval task (APPROVAL_PENDING)
    |
    +-- Approved --> Invoice auto-generated from unbilled items
    |
    +-- Rejected --> Document closed, items remain uninvoiced
```

---

## 9. Billing API Reference

### 9.1 GET `/amb/invoicelite`

Fetch lightweight invoice list.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | String | No | Filter by patient |
| `uhid` | String | No | Filter by UHID |
| `encounterNo` | String | No | Filter by encounter |
| `unitCode` | String | Yes | Hospital unit |
| `status` | String | No | Invoice status filter |
| `page` | int | No | Page (default 0) |
| `size` | int | No | Size (default 20) |

**Response `200`:**
```json
{
  "data": [
    {
      "invoiceNo": "INV-2026-001234",
      "patientName": "Rajesh Kumar",
      "uhid": "NH-2026-00451",
      "grossAmount": 10000.00,
      "netAmount": 9500.00,
      "patientPayable": 5000.00,
      "invoiceDate": "2026-04-22",
      "invoiceStatus": "PENDING_APPROVAL"
    }
  ],
  "totalCount": 50
}
```

### 9.2 POST `/amb/invoice/discount`

Apply discount to an invoice. Triggers Discount Approval workflow.

**Request:**
```json
{
  "invoiceNo": "INV-2026-001234",
  "discretionaryDiscount": 500.00,
  "nonDiscretionaryDiscount": 0,
  "totalUserDiscountPercentage": 5.0,
  "remarks": "Financial hardship",
  "approvedBy": "dr.venkat"
}
```

**Response `200`:**
```json
{
  "invoiceNo": "INV-2026-001234",
  "updatedInvoiceAmt": 9500.00,
  "patientPayable": 4750.00,
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 9.3 POST `/amb/invoice/retrospect`

Initiate retrospective invoice adjustment. Triggers Retrospect Invoice Initiation workflow.

**Request:**
```json
{
  "invoiceNo": "INV-2026-001234",
  "adjustmentType": "LINE_ITEM_ADDITION",
  "adjustmentAmount": 1000.00,
  "reason": "Post-discharge lab charges",
  "lineItems": [
    { "serviceCode": "LAB-001", "quantity": 1, "unitPrice": 1000.00 }
  ]
}
```

**Response `200`:**
```json
{
  "invoiceNo": "INV-2026-001234",
  "retrospectId": "RET-2026-000456",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 9.4 GET `/amb/medication-request`

Fetch a single medication request by ID.

**Query Parameters:** `requestId` (String)

**Response:** Full `MedicationRequestModel` as JSON.

### 9.5 GET `/amb/medication-requests`

Fetch list of medication requests.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `patientId` | String | No | Filter by patient |
| `uhid` | String | No | Filter by UHID |
| `unitCode` | String | Yes | Hospital unit |
| `status` | String | No | Status filter |
| `page` | int | No | Page (default 0) |
| `size` | int | No | Size (default 20) |

**Response `200`:**
```json
{
  "data": [
    {
      "requestId": "MED-2026-000456",
      "patientId": "PAT-001",
      "uhid": "NH-2026-00451",
      "medicationName": "Pembrolizumab",
      "dosage": "200mg IV",
      "amount": 125000.00,
      "status": "APPROVAL_PENDING",
      "isHighValue": true,
      "createdOn": "2026-04-22T10:00:00Z"
    }
  ],
  "totalCount": 10
}
```

### 9.6 GET `/amb/receipts`

Fetch receipts for a patient or invoice.

**Query Parameters:** `invoiceNo`, `patientId`, `uhid`, `unitCode`, `page`, `size`

**Response `200`:**
```json
{
  "data": [
    {
      "receiptNo": "REC-2026-000567",
      "invoiceNo": "INV-2026-001234",
      "receiptAmount": 5000.00,
      "paymentMode": "UPI",
      "receiptDate": "2026-04-22",
      "receiptStatus": "ACTIVE"
    }
  ],
  "totalCount": 5
}
```

### 9.7 POST `/amb/receipt/cancel`

Cancel a receipt. Triggers Receipt Cancellation workflow.

**Request:**
```json
{
  "receiptNo": "REC-2026-000567",
  "cancellationAmount": 5000.00,
  "reasonForCancellation": "Duplicate payment"
}
```

**Response `200`:**
```json
{
  "receiptNo": "REC-2026-000567",
  "receiptStatus": "CANCELLATION_PENDING",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 9.8 GET `/amb/refunds`

Fetch refund records.

**Query Parameters:** `receiptNo`, `invoiceNo`, `patientId`, `unitCode`, `page`, `size`

**Response `200`:**
```json
{
  "data": [
    {
      "refundNo": "REF-2026-000123",
      "receiptNo": "REC-2026-000567",
      "refundAmount": 2000.00,
      "refundMode": "Bank Transfer",
      "refundStatus": "APPROVAL_PENDING",
      "reasonForRefund": "Service cancelled"
    }
  ],
  "totalCount": 3
}
```

### 9.9 POST `/amb/app/refund`

Initiate a refund. Triggers Refund Approval workflow.

**Request:**
```json
{
  "receiptNo": "REC-2026-000567",
  "refundAmount": 2000.00,
  "refundMode": "Bank Transfer",
  "reasonForRefund": "Service cancelled"
}
```

**Response `200`:**
```json
{
  "refundNo": "REF-2026-000123",
  "refundStatus": "APPROVAL_PENDING",
  "workflowTriggered": true,
  "taskId": 12345
}
```

**Validation Error:** `400` -- `"Cannot approve document, Refund mode not available"`

### 9.10 GET `/amb/unbilled-documents`

Fetch unbilled document records.

**Query Parameters:** `patientId`, `uhid`, `encounterNo`, `unitCode`, `page`, `size`

**Response `200`:**
```json
{
  "data": [
    {
      "documentNo": "UBD-2026-000789",
      "patientName": "Ramesh Kumar",
      "uhid": "NH-2026-00451",
      "unbilledAmount": 3000.00,
      "serviceDate": "2026-04-20",
      "status": "PENDING"
    }
  ],
  "totalCount": 8
}
```

### 9.11 POST `/amb/app/unbilled`

Process an unbilled document. Triggers UnBilled Invoice Approval workflow.

**Request:**
```json
{
  "documentNo": "UBD-2026-000789",
  "action": "APPROVE",
  "remarks": "Services confirmed by department"
}
```

**Response `200`:**
```json
{
  "documentNo": "UBD-2026-000789",
  "status": "APPROVED",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 9.12 Workflow-Triggering API Summary

| Endpoint | Task Type Created |
|----------|-------------------|
| `POST /amb/invoice/discount` | Discount Approval |
| `POST /amb/invoice/retrospect` | Retrospect Invoice Initiation |
| `POST /amb/receipt/cancel` | Receipt Cancellation |
| `POST /amb/app/refund` | Refund Approval |
| `POST /amb/app/unbilled` | UnBilled Invoice Approval |

---

## 10. Detail Screens

### 10.1 Seven Screens, One Shared BLoC

All 7 billing detail screens use the `TaskDetailBloc` from the Task Management module (see `01_TASK_MANAGEMENT_FLOW.md`). They do NOT have their own BLoC -- they are views that render data loaded by TaskDetailBloc.

```
TASK TYPE REGISTRY (Billing-Related Tasks)
==================

 #  | taskName (exact string from API)         | Detail Screen
----+------------------------------------------+------------------------------
  1 | Invoice Generation Approval              | InvoiceDetailScreen
  2 | Discount Approval                        | InvoiceDetailScreen
  3 | Receipt Approval                         | ReceiptDetailScreen
  4 | Receipt Cancellation                     | ReceiptDetailScreen
  5 | Refund Approval                          | RefundDetailScreen
  6 | Reversal Invoice Approval                | InvoiceDetailScreen
  7 | Retrospect Invoice Initiation            | InvoiceDetailScreen
  8 | Retrospect Invoice Approval              | InvoiceDetailScreen
  9 | UnBilled Invoice Approval                | UnbilledDocumentDetailScreen
 10 | HighValue MedicationRequest Approval     | HighValueDetailScreen
 11 | Authorization Approval                   | AuthorizationDetailScreen
 12 | Mandatory Brand Approval                 | LchmDetailScreen
 13 | Invoice Cancellation                     | InvoiceDetailScreen
```

**Key insight:** 6 of the 13 task types share `InvoiceDetailScreen`. The screen adapts its layout based on the `taskName` -- showing different subsets of fields for discounts, retrospects, reversals, and cancellations.

### 10.2 Screen Routing Logic

```dart
// Pseudocode for routing from TaskDetailScreen to the correct detail screen
Widget getDetailScreen(String taskName) {
  switch (taskName) {
    case 'Invoice Generation Approval':
    case 'Discount Approval':
    case 'Reversal Invoice Approval':
    case 'Retrospect Invoice Initiation':
    case 'Retrospect Invoice Approval':
    case 'Invoice Cancellation':
      return InvoiceDetailScreen();

    case 'Receipt Approval':
    case 'Receipt Cancellation':
      return ReceiptDetailScreen();

    case 'Refund Approval':
      return RefundDetailScreen();

    case 'UnBilled Invoice Approval':
      return UnbilledDocumentDetailScreen();

    case 'HighValue MedicationRequest  Approval':  // note: double space in binary
      return HighValueDetailScreen();

    case 'Authorization Approval':
      return AuthorizationDetailScreen();

    case 'Mandatory Brand Approval':
      return LchmDetailScreen();
  }
}
```

### 10.3 InvoiceDetailScreen Layout

```
+--------------------------------------------+
| Invoice Details                        <- = |
+--------------------------------------------+
| Invoice No: INV-2026-001234               |
| Date: 22 Apr 2026                         |
| Status: PENDING APPROVAL                  |
+--------------------------------------------+
| Patient Information                        |
| +----------------------------------------+|
| | Name: Ramesh Kumar                     ||
| | UHID: UHID-001234                      ||
| | Encounter: ENC-2026-5678              ||
| +----------------------------------------+|
+--------------------------------------------+
| Amount Summary                             |
| +----------------------------------------+|
| | Gross Amount:        Rs 45,000.00      ||
| | Hospital Tariff:     Rs 40,000.00      ||
| | Tax:                  Rs 2,250.00      ||
| | ----------------------------------------||
| | Patient Discount:    -Rs 2,000.00      ||
| | Sponsor Discount:    -Rs 5,000.00      ||
| | Discretionary:       -Rs 1,000.00      ||
| | Non-Discretionary:     -Rs 500.00      ||
| | Plan Discount:       -Rs 1,500.00      ||
| | ----------------------------------------||
| | Net Amount:          Rs 37,250.00      ||
| | Patient Payable:     Rs 20,250.00      ||
| | Sponsor Payable:     Rs 17,000.00      ||
| | ----------------------------------------||
| | Total Amount:        Rs 37,250.00      ||
| +----------------------------------------+|
+--------------------------------------------+
| Line Items                                 |
| +----------------------------------------+|
| | 1. Consultation        Rs 2,000.00     ||
| | 2. Lab - CBC           Rs 1,500.00     ||
| | 3. X-Ray Chest         Rs 3,000.00     ||
| | ... more items                         ||
| +----------------------------------------+|
+--------------------------------------------+
| Remarks: [text field]                      |
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 10.4 ReceiptDetailScreen Layout

```
+--------------------------------------------+
| Receipt Details                        <- = |
+--------------------------------------------+
| Receipt No: REC-2026-000567               |
| Invoice No: INV-2026-001234              |
| Date: 22 Apr 2026                         |
+--------------------------------------------+
| Payment Details                            |
| +----------------------------------------+|
| | Receipt Amount:      Rs 20,250.00      ||
| | Payment Mode:        UPI               ||
| | Status:              ACTIVE            ||
| +----------------------------------------+|
+--------------------------------------------+
| Cancellation Details (if cancellation)     |
| +----------------------------------------+|
| | Cancellation Amount: Rs 20,250.00      ||
| | Reason: Duplicate payment              ||
| +----------------------------------------+|
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 10.5 RefundDetailScreen Layout

```
+--------------------------------------------+
| Refund Details                         <- = |
+--------------------------------------------+
| Refund No: REF-2026-000123               |
| Receipt No: REC-2026-000567             |
| Invoice No: INV-2026-001234             |
+--------------------------------------------+
| Refund Details                             |
| +----------------------------------------+|
| | Refund Amount:       Rs 5,000.00       ||
| | Refund Mode:         Bank Transfer     ||
| | Reason:              Excess payment    ||
| | Status:              APPROVAL_PENDING  ||
| +----------------------------------------+|
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 10.6 UnbilledDocumentDetailScreen Layout

```
+--------------------------------------------+
| Unbilled Document                      <- = |
+--------------------------------------------+
| Document No: UBD-2026-000789              |
| Patient: Ramesh Kumar (UHID-001234)       |
| Service Date: 20 Apr 2026                |
+--------------------------------------------+
| Summary                                    |
| +----------------------------------------+|
| | Unbilled Amount:     Rs 15,000.00      ||
| | Department:          Cardiology        ||
| | Status:              PENDING           ||
| +----------------------------------------+|
+--------------------------------------------+
| Service Items                              |
| +----------------------------------------+|
| | 1. ECG                Rs 3,000.00      ||
| | 2. Echo               Rs 8,000.00      ||
| | 3. Stress Test        Rs 4,000.00      ||
| +----------------------------------------+|
+--------------------------------------------+
| [APPROVE]   [REJECT]   [REVERT]           |
+--------------------------------------------+
```

### 10.7 Workflow Execution Methods (7)

These are the BLoC/service methods that trigger jBPM processes for billing documents:

| # | Method | Trigger | Task Type Created |
|---|--------|---------|-------------------|
| 1 | `executeWorkflow` | Generic base method | (varies by document type) |
| 2 | `executeReceiptWorkflow` | Receipt generated | Receipt Approval |
| 3 | `executeRefundWorkflow` | Refund initiated | Refund Approval |
| 4 | `executeWorkflowForRetrospect` | Retrospective adjustment | Retrospect Invoice Initiation/Approval |
| 5 | `executeWorkflowForUnbilled` | Unbilled doc processing | UnBilled Invoice Approval |
| 6 | `executeWorkflowForHighValue` | High-value medication | HighValue MedicationRequest Approval |
| 7 | `executeWorkflowForLchm` | Mandatory brand med | Mandatory Brand Approval |

### 10.8 Encounter Number Polling

Before workflow execution, the system may need to wait for an encounter number to be assigned:

```
User Action (e.g., initiate refund)
    |
    v
_startEncounterPolling()
    |
    v
_pollForEncounterNumber()  (periodic check)
    |
    +-- Encounter number assigned --> _stopEncounterPolling() --> proceed
    |
    +-- Timeout --> _stopEncounterPolling() --> show error
```

UI message during polling: `"Waiting for encounter number..."`

### 10.9 Process Variable Payload Structure

Each workflow method packages the following into jBPM process variables:

```json
{
  "documentNo": "INV-2026-001234",
  "documentType": "INVOICE",
  "patientId": "PAT-001",
  "uhid": "UHID-001",
  "unitCode": "UNIT001",
  "createdBy": "USER-001",
  "documentData": {
    // Full document model serialized as JSON
  },
  "additionalData": {
    // Context-specific data
  }
}
```

---

## 11. Multi-Facility Switching

### 11.1 Two Levels of Switching

AHAM supports two levels of facility switching:

1. **Organization level** -- Switch between entirely different hospital facilities (e.g., NH Bangalore to NH Mysuru). Shown after login if user has access to more than one organization.
2. **Unit/HSC level** -- Switch between units within the same facility (e.g., Cardiology to Oncology). Available from the Preferences screen without logging out.

### 11.2 APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mdm/api/logged-in/organizations` | GET | Fetch organizations the user belongs to |
| `/mdm/api/logged-in/all-unit-hscs` | GET | Fetch all units/HSCs for current organization |

### 11.3 Organization Selection Flow (After Login)

```
Login success
    |
    v
GET /mdm/api/logged-in/organizations
    |
    +-- 1 organization --> Skip selection, go to Home
    |
    +-- >1 organization --> Show organization selection screen
            |
            v
        User taps a facility
            |
            v
        Store in SharedPreferences (logged-in-unit)
            |
            v
        Home screen loads with selected facility context
```

**Organization Selection Screen:**

```
+--------------------------------------------------+
|                                                   |
|  SELECT YOUR ORGANIZATION                         |
|                                                   |
|  You have access to the following facilities:     |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Bangalore - Health City                    | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Mysuru                                     | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Anantapur                                  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | SRCC Children's Hospital, Mumbai              | |
|  +----------------------------------------------+ |
|                                                   |
|  Tap a facility to continue                       |
|                                                   |
+--------------------------------------------------+
```

### 11.4 Unit/HSC Switching Flow (No Logout Needed)

```
User navigates to Preferences screen
    |
    v
User taps "Switch Unit"
    |
    v
GET /mdm/api/logged-in/all-unit-hscs
    |
    v
Unit selection list appears
    |
    v
User selects new unit
    |
    v
Store unit in SharedPreferences
    |
    v
Refresh ALL data:
    +-- Tasks: LoadModuleTask with new unitCode
    +-- Chats: FetchAllConversation with new context
    +-- Camps: FetchOutreachCamps with new unitCode
    +-- Billing: All invoice/receipt/refund queries scoped to new unit
    |
    v
UI header updated with new unit name
```

**Unit Selection Screen:**

```
+--------------------------------------------------+
|                                                   |
|  SELECT UNIT                                      |
|                                                   |
|  NH Bangalore - Health City                       |
|                                                   |
|  +----------------------------------------------+ |
|  | Cardiology Unit - Block A               [*]  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Oncology Unit - Block B                 [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | General Medicine - Block C              [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Orthopedics - Block D                   [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### 11.5 What Changes When You Switch

| Data | Behavior on Switch |
|------|--------------------|
| **Task queues** | Refreshed to show only tasks for the new unit |
| **Chat conversations** | Refreshed to show conversations for the new unit |
| **Camp list** | Refreshed to show camps for the new unit |
| **Billing items** | Refreshed to show financial documents for the new unit |
| **Header display** | Updated to show the new unit name |

### 11.6 Multi-Facility User Journey

> **Sunita** is a billing administrator who works across two Narayana Health facilities. In the morning, she reviews invoice approvals at NH Bangalore. After lunch, she needs to check on tasks at NH Mysuru.
>
> 1. Sunita opens AHAM (already logged in from this morning)
> 2. She sees her Bangalore tasks on the Home screen
> 3. She taps the side menu and goes to **Preferences**
> 4. She taps **Current Facility** and selects **NH Mysuru**
> 5. The app refreshes -- all task queues, chats, and billing items now show Mysuru data
> 6. She taps **Switch Unit** and picks "Finance Department"
> 7. Her task queue narrows to finance-related tasks at Mysuru
>
> At no point did she need to log out and log back in.

---

## 12. Notification System

### 12.1 Push Notification Architecture

AHAM uses Firebase Cloud Messaging (FCM). There is **no in-app notification settings screen** -- the app defers entirely to the operating system's notification controls.

### 12.2 Notification Types

| Notification Type | When It Fires | Example |
|-------------------|---------------|---------|
| **New task available** | A new task appears in Group Tasks | "New Invoice Approval - Rs 45,200" |
| **Task assigned to you** | A supervisor assigns a task directly | "Invoice task assigned to you by Dr. Anita" |
| **Chat message received** | A patient sends a message | "Rajesh Kumar: When will my reports be ready?" |
| **New unassigned chat** | A patient starts a new conversation | "New unassigned conversation from Meena Devi" |
| **Camp reminder** | A camp is starting soon | "Anantapur Health Camp starts tomorrow" |
| **System alert** | Important system-level message | "Scheduled maintenance tonight 11 PM - 2 AM" |

### 12.3 Notification Behavior by App State

```
+------------------------------------------------------------------+
|                                                                    |
|                NOTIFICATION DELIVERY                               |
|                                                                    |
|  +------------------+   +------------------+   +----------------+ |
|  | APP IN           |   | APP IN           |   | APP            | |
|  | FOREGROUND       |   | BACKGROUND       |   | CLOSED         | |
|  |                  |   |                  |   |                | |
|  | In-app banner    |   | System           |   | System         | |
|  | or toast         |   | notification     |   | notification   | |
|  | appears at top   |   | in tray          |   | in tray        | |
|  | of screen        |   |                  |   |                | |
|  |                  |   | Tap to open      |   | Tap to open    | |
|  | Tap to navigate  |   | relevant screen  |   | app & navigate | |
|  | to relevant      |   |                  |   | to relevant    | |
|  | screen           |   |                  |   | screen         | |
|  +------------------+   +------------------+   +----------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

### 12.4 FCM Token Lifecycle

```dart
class FcmUserInfoModel {
  String? userId;
  String? fcmToken;
  String? deviceId;
  String? platform;        // "android" or "ios"
  String? appVersion;
}
```

**Token Flow:**

```
Login success
    |
    v
Firebase generates FCM token
    |
    v
App registers token with backend:
    FcmUserInfoModel {
      userId: "sunita.patel",
      fcmToken: "dXyz123...",
      deviceId: "device-uuid",
      platform: "android",
      appVersion: "2.6.1"
    }
    |
    v
Token stored in SharedPreferences (key: "fcm_token")
    |
    v
Token change detected (app reinstall, Firebase refresh)
    |
    v
Auto-update: register new token with backend
    |
    v
Logout
    |
    v
Clear FCM token from SharedPreferences
Clear registration from backend (user stops receiving push)
```

### 12.5 Push Notification Handling

```
App State         | Handler
------------------+----------------------------------------------
Foreground        | onMessage (RemoteMessage.fromMap)
                  | --> In-app banner with navigation on tap
Background        | Background handler (top-level Dart function)
                  | --> System notification tray
Terminated        | getInitialMessage on app launch
                  | --> System notification with deep link
```

- `RemoteMessage.fromMap` parses the FCM payload
- Background handler must be a top-level Dart function (required by Firebase)
- FCM token is stored in SharedPreferences (`fcm_token`)
- Token is registered with backend on login and refreshed on token change

### 12.6 FCM BLoC

```
Events:
  └── FetchFcmUserInfo

States:
  ├── FcmUserInfoInitial
  ├── FcmUserInfoLoading
  ├── FcmUserInfoFetched
  └── FcmUserInfoFetchFailure { message: String }
```

### 12.7 Managing Notifications (OS-Level Only)

```
  Device Settings > Apps > AHAM > Notifications
       |
       +-- All notifications: ON / OFF
       +-- Sound: ON / OFF
       +-- Vibration: ON / OFF
       +-- Show on lock screen: ON / OFF
```

There is **no in-app notification settings screen**. All push notifications are mandatory from the app's perspective. Users can only control them through OS system settings.

---

## 13. Remote Config & Feature Flags

### 13.1 Firebase Remote Config

Feature flags are fetched from Firebase Remote Config on app startup and cached locally.

```dart
class AppRemoteConfigModel {
  bool? enableAadhaarRegistration;     // enable_aadhaar_registration
  // additional feature flags loaded from Firebase Remote Config
}
```

### 13.2 Known Feature Flags

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `enable_aadhaar_registration` | bool | false | Controls Aadhaar KYC section in patient registration |

### 13.3 App Config Flavors

| Flavor | Config Name | Purpose |
|--------|-------------|---------|
| prod | `aham_appconfig` | Production configuration |
| dev | `aham_appconfig_dev` | Development configuration |
| sqa | `aham_appconfig_sqa` | SQA/QA testing configuration |
| uat | `aham_appconfig_uat` | UAT testing configuration |

### 13.4 Remote Config Fetch Flow

```
App launch
    |
    v
Firebase.initializeApp()
    |
    v
Remote Config fetch (non-blocking)
    |
    +-- Success --> AppRemoteConfigModel populated from fetched values
    |               Cached locally for offline access
    |
    +-- Failure --> Use cached values from previous fetch
    |               If no cache: use compile-time defaults
    |
    v
Features enabled/disabled based on flag values
    (e.g., Aadhaar section shown/hidden in PatientRegistrationScreen)
```

### 13.5 Feature Flag Use Cases

Feature flags allow Narayana Health to:
- Roll out new features gradually across facilities
- Disable features not yet approved in certain jurisdictions
- Turn off features quickly if issues are discovered
- Test features in specific build flavors before production

Staff do not see or interact with feature flags directly -- the app simply shows or hides functionality based on current flag values.

---

## 14. Language & Localization

### 14.1 Eight Supported Languages

| # | Language | Code | Script | Primary Region |
|---|----------|------|--------|----------------|
| 1 | **English** | en | Latin | All facilities (default) |
| 2 | **Bengali** | bn | Bengali | Eastern India (Kolkata) |
| 3 | **Gujarati** | gu | Gujarati | Western India (Ahmedabad) |
| 4 | **Hindi** | hi | Devanagari | North India |
| 5 | **Kannada** | kn | Kannada | Karnataka (Bangalore HQ) |
| 6 | **Marathi** | mr | Devanagari | Maharashtra (Mumbai, Pune) |
| 7 | **Tamil** | ta | Tamil | Tamil Nadu (Chennai) |
| 8 | **Telugu** | te | Telugu | Andhra Pradesh & Telangana |

### 14.2 PreferenceBloc (Language & Preferences)

```
Events:
  ├── LoadPreferences
  └── PreferenceSave

States:
  ├── PreferenceIntialState      (sic -- typo preserved from source)
  ├── PreferenceLoadedState
  ├── PreferenceSavingState
  ├── PreferenceSavedState
  └── PreferenceFailedState
```

### 14.3 Preference Repository & Service

```dart
class PreferenceRepository {
  Future<UserPreferences> fetchPreferences();
  Future<void> savePreferences(UserPreferences prefs);
}

class PrefernceService {          // sic -- typo preserved from source
  Future<UserPreferences> getPreferences();
  Future<void> updatePreferences(UserPreferences prefs);
}
```

### 14.4 Preference API

```
GET /uaa/api/account/preferences
    Response: { "language": "en", "defaultFacility": "HYD01", ... }

POST /uaa/api/account/preferences
    Request: { "language": "kn", "defaultFacility": "BLR01", ... }
    Response: 200 OK
```

### 14.5 What Gets Translated vs. What Does NOT

| Element | Translated? | Notes |
|---------|------------|-------|
| **Menu items & navigation** | Yes | All UI labels change |
| **Button text** (Approve, Reject, etc.) | Yes | Action buttons in all 8 languages |
| **Error messages** | Yes | Validation and system messages |
| **FAQ content** | Yes | Questions and answers |
| **Patient names & data** | No | Patient data stays as entered |
| **Task financial amounts** | No | Numbers displayed as-is |
| **Chat messages** | No | Messages shown in original language |

### 14.6 Language Selection Screen

```
+--------------------------------------------------+
|  SELECT LANGUAGE                                  |
|                                                   |
|  +----------------------------------------------+ |
|  | English                                 [*]  | |
|  +----------------------------------------------+ |
|  | Bengali / bangla                        [ ]  | |
|  +----------------------------------------------+ |
|  | Gujarati / gujaraatee                   [ ]  | |
|  +----------------------------------------------+ |
|  | Hindi / hindee                          [ ]  | |
|  +----------------------------------------------+ |
|  | Kannada / kannada                       [ ]  | |
|  +----------------------------------------------+ |
|  | Marathi / maraathee                     [ ]  | |
|  +----------------------------------------------+ |
|  | Tamil / tamil                           [ ]  | |
|  +----------------------------------------------+ |
|  | Telugu / telugu                         [ ]  | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### 14.7 Language Change Flow

```
User opens Preferences -> taps Language -> selects "Kannada"
    |
    v
PreferenceSave event dispatched with language: "kn"
    |
    v
PreferenceSavingState emitted
    |
    v
POST /uaa/api/account/preferences { "language": "kn" }
    |
    +-- Success --> PreferenceSavedState
    |               --> Locale changes immediately
    |               --> All UI text rebuilds in Kannada
    |               --> SharedPreferences updated locally
    |
    +-- Failure --> PreferenceFailedState
                    --> "Failed to save preferences" snackbar
                    --> UI stays in previous language
```

### 14.8 Preference Persistence

| Preference | Where Saved | When It Applies |
|-----------|-------------|-----------------|
| **Selected facility** | Device + server | Immediately; all data refreshes |
| **Selected unit** | Device + server | Immediately; task queue refreshes |
| **Language** | Device + server | Immediately; all UI text changes |
| **Notification settings** | Device + server | On next notification |
| **Default facility** | Server | Used on next login to skip facility selection |

Preferences sync to the server, so if a staff member logs in on a different device, their language and default facility carry over.

---

## 15. Privacy & Security

### 15.1 Privacy Policy

| Field | Value |
|-------|-------|
| Jurisdiction | Cayman Islands |
| Governing Law | Data Protection Act 2021 |
| DPO Contact | dpo@healthcity.ky |
| WebView Route | `/privacyPolicy` |
| Content URL | `/privacy-policy.html` |

**Privacy Policy Screen:**

```
+--------------------------------------------------+
|  PRIVACY POLICY                                   |
|                                                   |
|  +----------------------------------------------+ |
|  |                                               | |
|  |  [Full privacy policy text displayed          | |
|  |   in a scrollable web view]                   | |
|  |                                               | |
|  |  Jurisdiction: Cayman Islands                 | |
|  |  Governing Law: Data Protection Act 2021      | |
|  |  DPO Contact: dpo@healthcity.ky               | |
|  |                                               | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### 15.2 Data Collection Summary

| What Data | Why It's Collected | Who Can See It |
|-----------|-------------------|----------------|
| Staff name, employee ID, department | Login and access control | Staff themselves, IT admins |
| Patient name, DOB, gender | Patient identification during registration | Authorized staff at the facility |
| Mobile number, email | Contact and notifications | Authorized staff |
| Aadhaar number + images | KYC verification (when enabled) | Authorized staff during registration |
| Patient address (full hierarchy) | Medical records | Authorized staff |
| Medical records | Treatment documentation | Authorized clinical staff |
| Device information | Push notification delivery | System only (not visible to users) |
| Usage analytics | App improvement | Aggregated; not tied to individuals |

### 15.3 Data Subject Rights (DPA 2021)

- Right of access to personal data
- Right to rectification of inaccurate data
- Right to erasure (right to be forgotten)
- Right to restrict processing
- Right to data portability
- Right to object to processing
- Rights related to automated decision-making

### 15.4 Transport Security

```
Protocol:       TLS/SSL (HTTPS only)
Certificate:    Server certificate validation (default Dio behavior)
Pinning:        _registerBadCertificateCallback and _onBadCertificateWrapper exist
                in binary, suggesting custom certificate validation may be present
Min TLS:        Platform default (Android: TLS 1.2+)
```

### 15.5 Authentication Security

```
Token Type:       Bearer JWT
Storage:          SharedPreferences (access_token, refresh_token)
Transmission:     Authorization header on every API request
Refresh:          Automatic via Dio interceptor on 401 response
Expiry:           Server-controlled (expires_in field)
Logout:           SharedPreferences.clear() removes all tokens
```

### 15.6 Dio Interceptor Chain

```
Request Interceptor:
  1. Add Authorization: Bearer <access_token>
  2. Add Content-Type header
  3. Add facility/organization context headers

Response Interceptor:
  1. Check for 401 Unauthorized
  2. If 401: attempt token refresh
     a. Success: retry original request with new token
     b. Failure: clear session, redirect to LoginScreen

Error Interceptor:
  1. Parse error response into ErrorResponseModel
  2. Emit appropriate error state in calling BLoC
```

### 15.7 ObjectBox Encryption

```
Encryption:     ObjectBox supports AES-256 encryption at rest
Key Storage:    Android KeyStore
Scope:          Entire ObjectBox database file
Performance:    Minimal overhead (hardware-accelerated AES)
```

Note: The presence of ObjectBox encryption was inferred from the combination of ObjectBox FFI references and Android KeyStore usage. The exact encryption configuration could not be confirmed from string-level decompilation alone.

### 15.8 Android Permissions (10)

**Standard Permissions (8):**

| # | Permission | Purpose |
|---|-----------|---------|
| 1 | `android.permission.INTERNET` | Network access |
| 2 | `android.permission.CAMERA` | Photo capture (Aadhaar, attachments) |
| 3 | `android.permission.READ_EXTERNAL_STORAGE` | File access (pre-Android 13) |
| 4 | `android.permission.WRITE_EXTERNAL_STORAGE` | File writing (pre-Android 13) |
| 5 | `android.permission.POST_NOTIFICATIONS` | Push notifications (Android 13+) |
| 6 | `android.permission.ACCESS_NETWORK_STATE` | Network connectivity checks |
| 7 | `android.permission.ACCESS_WIFI_STATE` | Wi-Fi connectivity checks |
| 8 | `android.permission.WAKE_LOCK` | Background processing |

**GMS/Custom Permissions (2):**

| # | Permission | Purpose |
|---|-----------|---------|
| 9 | `android.permission.READ_MEDIA_IMAGES` | Media access (Android 13+) |
| 10 | `com.google.android.c2dm.permission.RECEIVE` | GCM/FCM push message receipt |

### 15.9 Security Boundary Diagram

```
┌─────────────────────────────────────────────────────┐
│                    AHAM App                          │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ SharedPrefs   │    │ ObjectBox (AES-256)       │   │
│  │ - JWT tokens  │    │ - Chat messages           │   │
│  │ - Session     │    │ - Attachments metadata    │   │
│  │ - FCM token   │    │                          │   │
│  └──────┬───────┘    └──────────┬───────────────┘   │
│         │                       │                    │
│  ┌──────┴───────────────────────┴───────────────┐   │
│  │            Android KeyStore                    │   │
│  │         (encryption key storage)               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         TLS/SSL Transport Layer               │   │
│  │    Bearer JWT on every API request            │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
              ┌───────┴────────┐
              │  Backend APIs   │
              │  (7 services)   │
              │  + ACS (chat)   │
              └────────────────┘
```

### 15.10 Audit Logging

```
Events Logged:
  - User login / logout
  - Task claim / approve / reject / revert
  - Patient registration
  - Camp start / completion
  - Chat conversation assign / delegate / close
  - Document upload / download

Log Destination:    Server-side (via API calls)
Local Logging:      Debug-level only (not persisted in release builds)
```

---

## 16. Local Storage Architecture

### 16.1 SharedPreferences (10 Keys)

| Key | Type | Purpose | Set When |
|-----|------|---------|----------|
| `fcm_token` | String | Firebase Cloud Messaging device token | FCM token received/refreshed |
| `access_token` | String | JWT access token for API auth | Login success, token refresh |
| `refresh_token` | String | JWT refresh token | Login success, token refresh |
| `logged-in-id` | String | Current logged-in user ID | Login success |
| `logged-in-login` | String | Current logged-in username | Login success |
| `logged-in-name` | String | Current logged-in display name | Login success |
| `logged-in-unit` | String | Current logged-in unit/facility | Login success, unit switch |
| `logged-in-user` | String (JSON) | Current logged-in user object | Login success |
| `client_baseUrl` | String | Dynamic base URL for API calls | Client setup success |
| `appSharedPreferences` | String (JSON) | General app preferences blob | Preference save |

### 16.2 Logout Cleanup

```
1. SharedPreferences.clear()
       │   Removes: access_token, refresh_token, logged-in-id, logged-in-login,
       │            logged-in-name, logged-in-unit, logged-in-user, fcm_token
       │   PRESERVES: client_baseUrl (via _purge method, not clear())
       │
       ▼
2. ACS disconnect
       │   Closes WebSocket connection
       │
       ▼
3. Navigate to LoginScreen
       │   pushNamedAndRemoveUntil('/', (route) => false)
       │
       ▼
4. ObjectBox data retained
       │   Chat history preserved for next login
       │   (same device, potentially different user)
```

**Important:** The `_purge` method on `AppSharedPreferences` selectively removes session-related keys while preserving `client_baseUrl`. This means after logout, the user does NOT need to re-enter the organization code.

### 16.3 Four-Layer Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│ L0: MemoryCache (package:memory_cache)                          │
│   Layer:    RAM                                                 │
│   Scope:    Current app session only                            │
│   Content:  API responses, computed results, frequently used    │
│   Eviction: TTL-based (per cache item)                          │
│   API:      MemoryCache.instance.put(key, value, expiry)        │
│             MemoryCache.instance.read<T>(key)                   │
│   Cleared:  On app termination                                  │
├─────────────────────────────────────────────────────────────────┤
│ L1: In-Memory ImageCache (Flutter built-in)                     │
│   Layer:    RAM                                                 │
│   Scope:    Current app session only                            │
│   Content:  Decoded image data (profile avatars, thumbnails)    │
│   Eviction: LRU (Least Recently Used), 100 images / 100 MB     │
│   Cleared:  On app termination                                  │
├─────────────────────────────────────────────────────────────────┤
│ L2: ObjectBox Persistent Cache                                  │
│   Layer:    Disk (ObjectBox database file)                       │
│   Scope:    Persists across app sessions                        │
│   Content:  StoreChatDataModel entities (chat messages)          │
│   Eviction: Manual via deleteOldMessages()                      │
│   Encrypted: AES-256 (key in Android KeyStore)                  │
├─────────────────────────────────────────────────────────────────┤
│ L3: Attachment Filesystem Cache                                 │
│   Layer:    Disk (app-specific directory)                        │
│   Scope:    Persists across app sessions                        │
│   Content:  Downloaded attachments (images, PDFs, audio)         │
│   Path:     attachmentLocalPath in StoreChatDataModel            │
│   Eviction: Manual cleanup with deleteOldMessages() (cascading)  │
└─────────────────────────────────────────────────────────────────┘
```

### 16.4 Data Retention

```
Medical records:    Retained for legally required period (Cayman Islands medical law)
Chat messages:      Retained until explicit cleanup (deleteOldMessages)
Session data:       Cleared on logout
FCM tokens:         Cleared on logout, refreshed on new login
Attachments:        Retained until associated messages are hard-deleted
Audit logs:         Retained per hospital compliance requirements
```

---

## 17. Error Handling

### 17.1 Billing Error Messages

| # | Message | Context |
|---|---------|---------|
| 1 | `"Cannot approve document, Refund mode not available"` | Refund approval without valid refund mode |
| 2 | `"Failed to load invoice details"` | AMB invoice fetch failure |
| 3 | `"Failed to load receipt details"` | AMB receipt fetch failure |
| 4 | `"Failed to load refund details"` | AMB refund fetch failure |
| 5 | `"Failed to process unbilled document"` | AMB unbilled processing failure |
| 6 | `"Discount amount exceeds allowable limit"` | Discount percentage > 100% |
| 7 | `"Authorization has expired"` | Action on expired authorization |
| 8 | `"Invoice already cancelled"` | Cancel attempt on cancelled invoice |
| 9 | `"Receipt already cancelled"` | Cancel attempt on cancelled receipt |
| 10 | `"Document creator cannot approve the document. Please revert the task."` | Self-approval prevention |
| 11 | `"Please click on claim/start to start the approval process."` | Task not yet claimed |
| 12 | `"Waiting for encounter number..."` | Encounter number polling in progress |

### 17.2 Settings Error Messages

| # | Message | Context |
|---|---------|---------|
| 1 | `"Failed to save preferences"` | Preference API failure |
| 2 | `"Session expired. Please login again"` | Token refresh failure |
| 3 | `"Failed to refresh token"` | Refresh token invalid/expired |
| 4 | `"Failed to Verify Client"` | Client setup verification failed |
| 5 | `"Domain not found"` | Unknown client code in domain fetch |

### 17.3 Network Error Messages (DioException)

| DioException Type | User-Facing Message |
|-------------------|-------------------|
| `connectionTimeout` | "Connection timed out. Please try again" |
| `sendTimeout` | "Request timed out. Please try again" |
| `receiveTimeout` | "Server response timed out" |
| `badResponse` (400) | Parsed from ErrorResponseModel |
| `badResponse` (401) | Triggers token refresh or logout |
| `badResponse` (403) | "You do not have permission to perform this action" |
| `badResponse` (404) | "Resource not found" |
| `badResponse` (500) | "Internal server error. Please try again later" |
| `cancel` | "Request was cancelled" |
| `connectionError` | "Unable to connect to server. Check your network" |
| `unknown` | "An unexpected error occurred" |

### 17.4 BLoC Error States (Billing & Settings Related)

| # | BLoC | Error State | Carries |
|---|------|-------------|---------|
| 1 | `TaskDetailBloc` | `TaskDetailLoadingErrorState` | error message |
| 2 | `TaskDetailBloc` | `ClaimTaskErrorState` | error message |
| 3 | `TaskDetailBloc` | `TaskActionError` | error message (approve/reject) |
| 4 | `TaskDetailBloc` | `RevertTaskErrorState` | error message |
| 5 | `PreferenceBloc` | `PreferenceFailedState` | error message |
| 6 | `FcmBloc` | `FcmUserInfoFetchFailure` | error message |
| 7 | `LoginBloc` | `LoginFailure` | errorCode: String |
| 8 | `ClientSetupBloc` | `ClientSetupErrorState` | error message |

### 17.5 ErrorResponseModel

```dart
class ErrorResponseModel {
  String? errorCode;       // machine-readable error code
  String? errorMessage;    // human-readable error message
  int? statusCode;         // HTTP status code
  String? timestamp;       // ISO 8601 timestamp
  String? path;            // API endpoint that generated the error
}
```

### 17.6 Error Handling Pattern (All BLoCs)

```dart
// BLoC error emission pattern (all BLoCs follow this)
try {
  final result = await repository.someOperation();
  emit(SuccessState(data: result));
} catch (e) {
  emit(ErrorState(message: e.toString()));
}

// UI error consumption pattern
BlocListener<SomeBloc, SomeState>(
  listener: (context, state) {
    if (state is ErrorState) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.message)),
      );
    }
  },
)
```

### 17.7 Billing Validation Rules

| # | Rule | Error Message | Document Type | Enforcement |
|---|------|---------------|---------------|-------------|
| 1 | Refund amount cannot exceed receipt balance | Server-side validation | Refund | Server |
| 2 | Refund mode must be set | `"Cannot approve document, Refund mode not available"` | Refund | Server |
| 3 | Discount percentage 0-100% | Server-side validation | Invoice (Discount) | Server |
| 4 | Cancellation amount <= receipt amount | Server-side validation | Receipt | Server |
| 5 | All amounts are read-only in AHAM | (UI: non-editable fields) | All | Client |
| 6 | Retrospect Stage 2 needs different reviewer | Server-side validation | Retrospect Invoice | Server |
| 7 | Authorization validity dates must be in future | Server-side validation | Authorization | Server |
| 8 | High-value threshold triggers mandatory approval | Server-side flag check | Medication | Server |
| 9 | Document creator cannot approve own document | `"Document creator cannot approve the document..."` | All | Server |
| 10 | Task must be claimed before approval | `"Please click on claim/start..."` | All | Server |

---

## 18. Edge Cases

### 18.1 Billing Edge Cases

| # | Scenario | What Happens | Resolution |
|---|----------|-------------|------------|
| 1 | **Concurrent claim on same billing task** | User A claims first (200). User B gets 409: "Task has been already claimed by other user..!!" | No retry. User B navigates back, task gone from Group Tasks. |
| 2 | **Self-approval (creator tries to approve)** | Server returns 403: "Document creator cannot approve the document. Please revert the task." | Approver must tap Revert so someone else can claim. |
| 3 | **Refund without refund mode** | Server returns 400: "Cannot approve document, Refund mode not available" | Approver rejects the refund. Initiator re-submits with valid mode. |
| 4 | **Retrospect same-person Stage 1 + Stage 2** | Stage 1 approver claims Stage 2 --> server rejects (different approver required). | User must revert Stage 2 for another approver. |
| 5 | **Authorization expired before approval** | Status transitions to EXPIRED. Task may still be in queue. | Approver sees EXPIRED status, should reject the task. |
| 6 | **Discount percentage > 100%** | Server rejects: "Discount amount exceeds allowable limit" | Initiator must re-submit with valid discount. |
| 7 | **Invoice already cancelled** | Attempt to cancel again returns: "Invoice already cancelled" | No action needed. Task may be stale in queue. |
| 8 | **Receipt already cancelled** | Cancel attempt returns: "Receipt already cancelled" | No action needed. |
| 9 | **Encounter number not yet assigned** | UI shows "Waiting for encounter number..." during polling. | Polling continues until assigned or timeout. |
| 10 | **Refund exceeds receipt balance** | Server rejects. `refundAmount > (receiptAmount - previousRefunds)` | Initiator must adjust refund amount. |
| 11 | **Multiple discounts on same invoice** | Each discount creates a separate InvoiceDiscountModel record. Calculation order applies cumulatively. | Ensure totalUserDiscountPercentage stays <= 100%. |
| 12 | **High-value medication with zero justification** | `justification` field is nullable. Screen renders without justification text. | Approver may reject due to missing clinical reasoning. |

### 18.2 Settings Edge Cases

| # | Scenario | What Happens | Resolution |
|---|----------|-------------|------------|
| 1 | **Facility switch during active task review** | All billing data refreshes for new unit. If user was viewing a task detail from the old unit, data becomes stale. | Navigate back to task list, which auto-refreshes. |
| 2 | **Language change during network failure** | PreferenceFailedState emitted. "Failed to save preferences" snackbar. UI stays in previous language. | Server sync fails but could retry. Local preference not updated. |
| 3 | **FCM token refresh while app is in background** | Firebase triggers token change callback. App auto-registers new token with backend. | Transparent to user. |
| 4 | **FCM token registration fails on login** | FcmUserInfoFetchFailure state. User can still use the app but won't receive push notifications. | Token re-registration attempted on next app launch. |
| 5 | **User has access to 0 organizations** | Organization list is empty after login. | Should not happen (server grants at least 1). If it does, user sees empty screen and should contact IT. |
| 6 | **Remote config fetch fails on startup** | Cached values used. If no cache: compile-time defaults apply. Aadhaar registration disabled by default. | Non-blocking. App functions normally with defaults. |
| 7 | **ObjectBox corruption** | DbFileCorruptException on store open. Recovery: delete database files, reinitialize fresh. Chat history lost locally (re-fetchable from ACS). | Automatic recovery path. SharedPreferences remain intact. |
| 8 | **Logout with unsaved preferences** | Preferences that were changed locally but not synced to server are lost. | Always sync before logout. Server is the source of truth. |
| 9 | **Two devices, same user, different languages** | Language preference syncs to server via `/uaa/api/account/preferences`. Second device picks up the latest server value on next LoadPreferences. | Last-write-wins on server. |
| 10 | **Notification permission denied (Android 13+)** | POST_NOTIFICATIONS permission not granted. User does not receive push notifications. | App continues to function. User must enable notifications via OS settings. |

---

## 19. Implementation Checklist

### Phase 1: Billing Data Models

- [ ] Implement `InvoiceModel` with all 40+ fields (6 groups)
- [ ] Implement `ReceiptModel` (16 fields)
- [ ] Implement `RefundModel` (16 fields)
- [ ] Implement `UnbilledDocumentModel` (13 fields)
- [ ] Implement `InvoiceDiscountModel` (9 fields)
- [ ] Implement `AuthorizationModel` (14 fields)
- [ ] Implement `RetrospectInvoiceModel` (10 fields)
- [ ] Implement `ReversalInvoiceModel` (7 fields)
- [ ] Implement `MedicationRequestModel` (14 fields)
- [ ] Implement `HighValueModel` (extends MedicationRequest + 3 fields)
- [ ] Implement `LchmModel` (13 fields)
- [ ] Add JSON serialization/deserialization for all models
- [ ] Write unit tests for invoice amount formula

### Phase 2: Billing API Layer

- [ ] Implement AMB service client with 11 endpoints
- [ ] Wire GET `/amb/invoicelite` with query parameter support
- [ ] Wire POST `/amb/invoice/discount`
- [ ] Wire POST `/amb/invoice/retrospect`
- [ ] Wire GET `/amb/medication-request` and GET `/amb/medication-requests`
- [ ] Wire GET `/amb/receipts`
- [ ] Wire POST `/amb/receipt/cancel`
- [ ] Wire GET `/amb/refunds`
- [ ] Wire POST `/amb/app/refund` with validation error handling (400)
- [ ] Wire GET `/amb/unbilled-documents`
- [ ] Wire POST `/amb/app/unbilled`
- [ ] Implement encounter number polling (`_pollForEncounterNumber`)

### Phase 3: Billing Detail Screens (7 Screens)

- [ ] Build `InvoiceDetailScreen` (handles 6 task types with conditional field rendering)
- [ ] Build `ReceiptDetailScreen` (handles Receipt Approval + Receipt Cancellation)
- [ ] Build `RefundDetailScreen` (handles Refund Approval)
- [ ] Build `UnbilledDocumentDetailScreen` (handles UnBilled Invoice Approval)
- [ ] Build `HighValueDetailScreen` (handles HighValue MedicationRequest Approval)
- [ ] Build `AuthorizationDetailScreen` (handles Authorization Approval)
- [ ] Build `LchmDetailScreen` (handles Mandatory Brand Approval)
- [ ] Implement screen routing from `taskName` to correct detail screen
- [ ] Wire all screens to `TaskDetailBloc` (claim/approve/reject/revert)
- [ ] Test with "HighValue MedicationRequest  Approval" (note: double space in binary)

### Phase 4: Workflow Integration

- [ ] Implement `executeWorkflow` (generic base)
- [ ] Implement `executeReceiptWorkflow`
- [ ] Implement `executeRefundWorkflow`
- [ ] Implement `executeWorkflowForRetrospect`
- [ ] Implement `executeWorkflowForUnbilled`
- [ ] Implement `executeWorkflowForHighValue`
- [ ] Implement `executeWorkflowForLchm`
- [ ] Implement process variable payload packaging
- [ ] Test 2-stage retrospect approval (Stage 1 approver != Stage 2 approver)
- [ ] Test self-approval prevention (document creator cannot approve)

### Phase 5: Multi-Facility Switching

- [ ] Wire GET `/mdm/api/logged-in/organizations`
- [ ] Wire GET `/mdm/api/logged-in/all-unit-hscs`
- [ ] Build organization selection screen (post-login, if >1 org)
- [ ] Build unit selection screen (within Preferences)
- [ ] Implement data refresh on facility/unit switch (tasks, chats, camps, billing)
- [ ] Store selected facility/unit in SharedPreferences (`logged-in-unit`)
- [ ] Update UI header with current facility/unit name

### Phase 6: Notification System

- [ ] Implement `FcmUserInfoModel`
- [ ] Implement FCM token registration on login
- [ ] Implement FCM token auto-update on token change
- [ ] Implement FCM token clear on logout
- [ ] Implement foreground notification handler (`onMessage`)
- [ ] Implement background notification handler (top-level Dart function)
- [ ] Implement `getInitialMessage` for terminated state
- [ ] Implement deep linking from notification tap to relevant screen
- [ ] Test all 6 notification types
- [ ] Verify no in-app notification settings (defers to OS)

### Phase 7: Language & Localization

- [ ] Set up Flutter localization with 8 locale files (en, bn, gu, hi, kn, mr, ta, te)
- [ ] Implement `PreferenceBloc` (LoadPreferences, PreferenceSave)
- [ ] Implement `PreferenceRepository` and `PrefernceService` (note: typo preserved)
- [ ] Wire GET/POST `/uaa/api/account/preferences`
- [ ] Build language selection screen
- [ ] Translate all UI labels, buttons, and error messages
- [ ] Test that patient data, amounts, and chat messages are NOT translated
- [ ] Test language persistence across app restarts

### Phase 8: Remote Config & Feature Flags

- [ ] Implement `AppRemoteConfigModel`
- [ ] Wire Firebase Remote Config fetch on startup
- [ ] Implement local caching of fetched values
- [ ] Implement fallback to compile-time defaults
- [ ] Wire `enable_aadhaar_registration` flag to patient registration screen
- [ ] Set up 4 config flavors (prod, dev, sqa, uat)

### Phase 9: Privacy, Security & Local Storage

- [ ] Build `PrivacyPolicyScreen` (WebView loading `/privacy-policy.html`)
- [ ] Build `AboutUsScreen` (app version, build number, org info)
- [ ] Build `FAQScreen` with 6 expandable Q&A items (local content, no API)
- [ ] Implement SharedPreferences with 10 keys
- [ ] Implement `_purge` method (selective cleanup, preserves `client_baseUrl`)
- [ ] Implement 4-layer caching (MemoryCache, ImageCache, ObjectBox, Filesystem)
- [ ] Configure Dio interceptor chain (auth header, token refresh, error parsing)
- [ ] Request all 10 Android permissions at appropriate times
- [ ] Verify TLS/HTTPS for all API calls
- [ ] Test ObjectBox corruption recovery path

### Phase 10: Side Navigation & Settings Screens

- [ ] Build side navigation drawer with: Home, Preferences, FAQ, About Us, Privacy Policy, Logout
- [ ] Build Preferences screen with: Current Facility, Switch Unit, Language, Notifications
- [ ] Implement logout flow (clear session, disconnect ACS, navigate to login)
- [ ] Build `UserProfileBloc` (FetchUserProfile event)
- [ ] Display user profile in navigation drawer header (avatar, name, designation, facility)
- [ ] Test logout preserves `client_baseUrl` but clears all session keys

### Phase 11: Integration Testing

- [ ] Test complete billing flow: Invoice -> Receipt -> Refund lifecycle
- [ ] Test discount calculation order (5 types applied sequentially)
- [ ] Test retrospect 2-stage approval with different approvers
- [ ] Test authorization approval recalculates `WithAuth` fields on linked invoice
- [ ] Test facility switch refreshes all billing data
- [ ] Test language change applies to all billing screen labels
- [ ] Test push notification deep links to correct billing detail screen
- [ ] Test all 12 billing error messages display correctly
- [ ] Test all 5 settings error messages display correctly
- [ ] Test concurrent claim handling (409 response)
- [ ] Test self-approval prevention (403 response)
- [ ] Test refund mode validation (400 response)

---

## Cross-References

| Topic | Document |
|-------|----------|
| Login, token lifecycle, client setup | `00_LOGIN_AUTH_FLOW.md` |
| 13 approval types, jBPM integration, TaskDetailBloc | `01_TASK_MANAGEMENT_FLOW.md` |
| Chat messaging, ACS integration | `02_CHAT_MESSAGING_FLOW.md` |
| Outreach camps, patient registration | `03_OUTREACH_CAMPS_FLOW.md` |
| Data models reference | `specs/01_DATA_MODELS.md` |
| API endpoint reference | `specs/02_API_LAYER.md` |
| Billing spec | `specs/04_BILLING_FINANCE.md` |
| Auth & settings spec | `specs/07_AUTH_SETTINGS.md` |
| Screen inventory | `specs/08_SCREENS_NAVIGATION.md` |
| Local storage spec | `specs/09_LOCAL_STORAGE.md` |
| Error messages & security spec | `specs/10_ERROR_SECURITY.md` |
| Platform & settings product doc | `product-docs/04_PLATFORM_SETTINGS.md` |

---

*End of Billing, Finance, Settings & Notifications Flow*
