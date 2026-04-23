# 04 - Billing & Finance

**Module:** Invoice, Receipt, Refund, UnbilledDocument, Discount, Authorization, Retrospect workflows, screen layouts
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart model/service classes + AMB API calls
**Services:** TaskService (via jBPM), AMB Service endpoints
**Backend:** AMB Service (`/amb/api/`), jBPM Service (`/api/jbpm/`)

---

## Table of Contents

1. [Financial Document Flow](#1-financial-document-flow)
2. [Invoice Model (40+ Fields)](#2-invoice-model)
3. [Receipt Model (16 Fields)](#3-receipt-model)
4. [Refund Model (16 Fields)](#4-refund-model)
5. [UnbilledDocument Model (13 Fields)](#5-unbilleddocument-model)
6. [Discount Types (5)](#6-discount-types)
7. [Authorization Model](#7-authorization-model)
8. [Retrospect Invoice (2-Stage)](#8-retrospect-invoice)
9. [Additional Billing Models](#9-additional-billing-models)
10. [Financial Calculations](#10-financial-calculations)
11. [Workflow Execution Methods (7)](#11-workflow-execution-methods)
12. [Billing API Endpoints (11)](#12-billing-api-endpoints)
13. [Screen Layouts (7 Detail Screens)](#13-screen-layouts)
14. [Validation Rules](#14-validation-rules)
15. [Error Messages](#15-error-messages)

---

## 1. Financial Document Flow

```
Service Delivery
       |
       v
Invoice Generation -----------> Invoice Generation Approval
       |
       +-- Discount Applied -----> Discount Approval
       |
       v
Receipt Collection -----------> Receipt Approval
       |
       +-- Cancel Receipt -------> Receipt Cancellation
       |
       +-- Refund Initiated -----> Refund Approval
       |
       +-- Retrospective Adj ----> Retrospect Invoice Initiation
       |                                |
       |                                v
       |                         Retrospect Invoice Approval
       |
       +-- Reversal -------------> Reversal Invoice Approval
       |
       +-- Cancellation ----------> Invoice Cancellation

Unbilled Services ----------------> UnBilled Invoice Approval

High-Value Medications -----------> HighValue MedicationRequest  Approval

Authorization Requests -----------> Authorization Approval

Mandatory Brand (LCHM) -----------> Mandatory Brand Approval
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

---

## 2. Invoice Model

Full invoice model with all billing computation fields. 40+ fields organized into 6 groups.

### 2.1 Identity & Patient Fields

| Field | Type | Description |
|-------|------|-------------|
| `invoiceId` | `String` | Internal unique identifier |
| `invoiceNumber` | `String` | Human-readable invoice number (e.g., `INV-2026-001234`). Note: display label is `invoiceNo` but the Dart property is `invoiceNumber`. |
| `patientId` | `String` | Patient reference ID |
| `uhid` | `String` | Universal Health ID |
| `patientName` | `String` | Patient display name |
| `encounterNo` | `String` | Visit / encounter number |
| `unitCode` | `String` | Hospital unit code |
| `departmentCode` | `String` | Department code |
| `invoiceDate` | `String` | Invoice creation date (ISO-8601) |
| `invoiceStatus` | `String` | Current invoice status |
| `invoiceType` | `String` | Invoice type classification |

### 2.2 Gross & Base Amount Fields

| Field | Type | Description |
|-------|------|-------------|
| `grossAmount` | `double` | Total gross amount before any discounts |
| `grossAmtWithAuth` | `double` | Gross amount factoring in authorization scope |
| `hospitalTariff` | `double` | Hospital tariff rate applied |
| `taxAmount` | `double` | Total tax amount |
| `originalInvoiceAmt` | `double` | Original invoice amount at creation |
| `originalInvoiceAmount` | `double` | Alternate full name for original invoice amount (binary has both `originalInvoiceAmt` and `originalInvoiceAmount`) |
| `originalInvoiceAmtWithAuth` | `double` | Authorization-adjusted original amount |
| `updatedInvoiceAmt` | `double` | Updated amount after modifications (discounts, adjustments) |
| `netAmount` | `double` | Net amount after all adjustments |

### 2.3 Discount Fields

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

### 2.4 Payable & Settlement Fields

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

### 2.5 Metadata Fields

| Field | Type | Description |
|-------|------|-------------|
| `lineItems` | `List<TaskLineItem>?` | Service line items on the invoice |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp (ISO-8601) |
| `approvedBy` | `String?` | Approver user ID (set after approval) |
| `approvedAt` | `String?` | Approval timestamp |
| `remarks` | `String?` | Free-text remarks / notes |

### 2.6 Additional Invoice Fields (Verified from Binary)

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

### 2.7 Invoice Type/Status Enum Values

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

### 2.8 Amount Relationship Diagram

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
    grossAmtWithAuth --> patientPayableWithAuth
                     --> sponsorNetAmtWithAuth
    patientDiscountWithAuth = patientDiscount (recalculated for auth scope)
    sponsorDiscountWithAuth = sponsorDiscount (recalculated for auth scope)
```

---

## 3. Receipt Model

Payment receipt against an invoice. 16 fields.

### 3.1 Fields

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

### 3.2 Receipt Status Values

| Status | Description |
|--------|-------------|
| `CREATED` | Receipt generated, pending approval |
| `ACTIVE` | Receipt approved, payment confirmed |
| `CANCELLATION_PENDING` | Cancellation requested, awaiting approval |
| `CANCELLED` | Receipt cancelled after approval |
| `CANCELLATION_REJECTED` | Cancellation request rejected, receipt stays ACTIVE |

### 3.3 Receipt Lifecycle

```
CREATED --> Receipt Approval task
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
    |                  +-- Refund initiated --> (see Refund flow)
    |
    +-- Rejected --> Receipt stays in CREATED (not finalized)
```

---

## 4. Refund Model

Refund record against a receipt. 16 fields.

### 4.1 Fields

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

### 4.2 Refund Status Values

| Status | Description |
|--------|-------------|
| `PENDING` | Refund initiated, not yet submitted for approval |
| `APPROVAL_PENDING` | Refund submitted, awaiting approval task |
| `APPROVED` | Refund approved, processing initiated |
| `REJECTED` | Refund request rejected |

### 4.3 Refund Lifecycle

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

### 4.4 Refund Validation Rules

| Rule | Error Message | Enforcement |
|------|---------------|-------------|
| `refundAmount <= receiptAmount - previousRefundsForReceipt` | Server-side validation | Server |
| `refundMode` must be non-null and non-empty | `"Cannot approve document, Refund mode not available"` | Server |
| Reason must be provided | `"Please enter reason for refund"` | Client |

---

## 5. UnbilledDocument Model

Document for services rendered but not yet invoiced. 13 fields.

### 5.1 Fields

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

### 5.2 Unbilled Document Flow

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

## 6. Discount Types (5)

AHAM handles five distinct discount types. Each applies at a different level and has different approval requirements.

### 6.1 Discount Classification

| # | Type | Invoice Field | Requires Approval | Applied By | Description |
|---|------|-------------|-------------------|-----------|-------------|
| 1 | Discretionary | `discretionaryDiscount` | **Always** | User (manual) | Compassionate or case-by-case discount |
| 2 | Non-Discretionary | `nonDiscretionaryDiscount` | No | System (rules) | Policy-based: senior citizen, employee family |
| 3 | Sponsor | `sponsorDiscount` | Depends | System/User | Insurance/corporate sponsor reduction |
| 4 | Patient | `patientDiscount` | Depends | System/User | Reduction on patient's portion |
| 5 | Plan | `planDiscountAmount` | No | System | Health plan / scheme discount |

### 6.2 Discount Calculation Order

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

### 6.3 Discount Approval API

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

### 6.4 Discount Detail Screen

The `InvoiceDetailScreen` renders discount fields when task type is `Discount Approval`:

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
```

---

## 7. Authorization Model

Pre-authorization for planned procedures or admissions.

### 7.1 Fields

| Field | Type | Description |
|-------|------|-------------|
| `authorizationId` | `String` | Authorization ID |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `invoiceNo` | `String` | Linked invoice number |
| `authorizationAmount` | `double` | Authorized amount (approved by insurer) |
| `requestedAmount` | `double` | Amount originally requested |
| `status` | `AuthorizationStatus` | Current status |
| `validFrom` | `String` | Authorization validity start date |
| `validTo` | `String` | Authorization validity end date |
| `remarks` | `String?` | Authorization remarks |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `approvedBy` | `String?` | Approver user ID |
| `approvedAt` | `String?` | Approval timestamp |

### 7.2 AuthorizationStatus Enum

| Value | Description |
|-------|-------------|
| `PENDING` | Authorization pending review |
| `APPROVED` | Authorization approved |
| `REJECTED` | Authorization denied |
| `EXPIRED` | Past validity period (validTo < today) |
| `CANCELLED` | Authorization cancelled by user |

### 7.3 Authorization Impact on Invoice

When an authorization is approved, it triggers recalculation of the invoice's `WithAuth` fields:

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

The `AuthorizationDetailScreen` displays both the requested amount and the authorized amount, highlighting the difference as "Patient Responsibility":

```
Patient Responsibility = requestedAmount - authorizationAmount
```

### 7.4 Authorization Lifecycle

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

---

## 8. Retrospect Invoice (2-Stage)

Retrospect invoices modify bills after patient discharge. They require two sequential levels of approval.

### 8.1 RetrospectInvoiceModel

| Field | Type | Description |
|-------|------|-------------|
| `retrospectId` | `String` | Retrospect adjustment ID |
| `invoiceNo` | `String` | Original invoice being adjusted |
| `adjustmentType` | `String` | Type of adjustment |
| `adjustmentAmount` | `double` | Amount of adjustment |
| `reason` | `String` | Reason for retrospective change |
| `lineItems` | `List<TaskLineItem>?` | Adjusted line items |
| `stage` | `int` | Current stage (1 or 2) |
| `stage1ApprovedBy` | `String?` | Stage 1 approver (set after stage 1) |
| `stage1ApprovedAt` | `String?` | Stage 1 approval timestamp |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |

### 8.2 Two-Stage Approval Flow

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

### 8.3 Retrospect Rules

| Rule | Enforcement |
|------|------------|
| Stage 1 must be approved before Stage 2 is created | jBPM process definition |
| Stage 1 rejection prevents Stage 2 creation | jBPM process definition |
| Stage 1 approver CANNOT be Stage 2 approver | Server-side validation |
| Both stages use the same InvoiceDetailScreen | UI routing by `taskName` |
| Stage number is embedded in task description | `task.description` field |

### 8.4 Retrospect API

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

## 9. Additional Billing Models

### 9.1 MedicationRequestModel

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

### 9.2 HighValueModel

Extended medication request model for high-value drugs.

| Field | Type | Description |
|-------|------|-------------|
| (inherits all MedicationRequestModel fields) | | |
| `highValueThreshold` | `double` | Cost threshold that triggered high-value flag |
| `totalCost` | `double` | Computed: `amount * quantity` |
| `approvalLevel` | `String` | Required approval level (e.g., HOD, Director) |

### 9.3 LchmModel

Low Cost High Margin / Mandatory Brand medication.

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

### 9.4 InvoiceDiscountModel

Tracks discount history on an invoice.

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

### 9.5 ReversalInvoiceModel

| Field | Type | Description |
|-------|------|-------------|
| `reversalId` | `String` | Reversal ID |
| `originalInvoiceNo` | `String` | Original invoice being reversed |
| `reversalAmount` | `double` | Amount being reversed |
| `reason` | `String` | Reversal reason |
| `status` | `String` | PENDING / APPROVED / REJECTED |
| `createdBy` | `String` | Creator |
| `createdAt` | `String` | Timestamp |

---

## 10. Financial Calculations

### 10.1 Invoice Amount Formula

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

### 10.2 Authorization Adjustment

```
grossAmtWithAuth = grossAmount (scoped to authorized services only)

patientDiscountWithAuth = recalculated for authorized scope
sponsorDiscountWithAuth = recalculated for authorized scope

patientPayableWithAuth = grossAmtWithAuth - sponsorNetAmtWithAuth - discountsWithAuth
sponsorNetAmtWithAuth  = authorized sponsor portion
```

### 10.3 Refund Validation

```
maxRefundable = receiptAmount - sum(previousApprovedRefundsForReceipt)
refundAmount <= maxRefundable
refundMode must be non-null and non-empty
```

### 10.4 Receipt Cancellation

```
cancellationAmount <= receiptAmount
cancellationAmount == receiptAmount for full cancellation
cancellationAmount < receiptAmount for partial cancellation
```

### 10.5 Discount Percentage Validation

```
totalUserDiscountPercentage >= 0
totalUserDiscountPercentage <= 100
```

---

## 11. Workflow Execution Methods

Seven workflow methods trigger jBPM processes for billing documents. The first is a generic base method; the remaining six are domain-specific.

| # | Method | Trigger | Task Type Created | Document Type |
|---|--------|---------|-------------------|---------------|
| 1 | `executeWorkflow` | Generic base method | (varies by document type) | Any |
| 2 | `executeReceiptWorkflow` | Receipt generated | Receipt Approval | Receipt |
| 3 | `executeRefundWorkflow` | Refund initiated | Refund Approval | Refund |
| 4 | `executeWorkflowForRetrospect` | Retrospective adjustment | Retrospect Invoice Initiation/Approval | Invoice |
| 5 | `executeWorkflowForUnbilled` | Unbilled doc processing | UnBilled Invoice Approval | UnbilledDocument |
| 6 | `executeWorkflowForHighValue` | High-value medication | HighValue MedicationRequest  Approval | MedicationRequest |
| 7 | `executeWorkflowForLchm` | Mandatory brand med | Mandatory Brand Approval | LchmModel |

### Encounter Number Polling

Before workflow execution, the system may need to wait for an encounter number to be assigned:

| Method | Description |
|--------|-------------|
| `_pollForEncounterNumber` | Core polling logic to check for encounter number assignment |
| `_startEncounterPolling` | Initiates periodic polling for encounter number |
| `_stopEncounterPolling` | Stops polling (on success or timeout) |

UI message during polling: `"Waiting for encounter number..."`

### Workflow Execution Sequence

```
User Action (e.g., initiate refund)
    |
    v
Domain Service validates request
    |
    v
Document saved to database (PENDING status)
    |
    v
executeXxxWorkflow() called
    |
    v
jBPM process started with document as process variables
    |
    v
Task created in OPEN state --> appears in GROUP queue
    |
    v
Approver claims --> reviews --> approves/rejects
    |
    v
jBPM callback updates document status
    |
    v
Document finalized (APPROVED / REJECTED)
```

### Process Variable Payload Structure

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

## 12. Billing API Endpoints

### 12.1 GET `/amb/invoicelite`

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

### 12.2 POST `/amb/invoice/discount`

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

### 12.3 POST `/amb/invoice/retrospect`

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

### 12.4 GET `/amb/medication-request`

Fetch a single medication request by ID.

**Query Parameters:** `requestId` (String)

**Response:** Full `MedicationRequestModel` as JSON.

### 12.5 GET `/amb/medication-requests`

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

### 12.6 GET `/amb/receipts`

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

### 12.7 POST `/amb/receipt/cancel`

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

### 12.8 GET `/amb/refunds`

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

### 12.9 POST `/amb/app/refund`

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

### 12.10 GET `/amb/unbilled-documents`

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

### 12.11 POST `/amb/app/unbilled`

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

### 12.12 Workflow-Triggering API Summary

| Endpoint | Task Type Created |
|----------|-------------------|
| `POST /amb/invoice/discount` | Discount Approval |
| `POST /amb/invoice/retrospect` | Retrospect Invoice Initiation |
| `POST /amb/receipt/cancel` | Receipt Cancellation |
| `POST /amb/app/refund` | Refund Approval |
| `POST /amb/app/unbilled` | UnBilled Invoice Approval |

---

## 13. Screen Layouts

### 13.1 InvoiceDetailScreen

Used for: Invoice Generation Approval, Discount Approval, Reversal Invoice Approval, Retrospect Invoice Initiation, Retrospect Invoice Approval, Invoice Cancellation.

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

### 13.2 ReceiptDetailScreen

Used for: Receipt Approval, Receipt Cancellation.

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

### 13.3 RefundDetailScreen

Used for: Refund Approval.

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

### 13.4 UnbilledDocumentDetailScreen

Used for: UnBilled Invoice Approval.

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

### 13.5 HighValueDetailScreen

Used for: HighValue MedicationRequest  Approval (note: double space in binary).

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

### 13.6 AuthorizationDetailScreen

Used for: Authorization Approval.

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

### 13.7 LchmDetailScreen

Used for: Mandatory Brand Approval.

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

---

## 14. Validation Rules

| # | Rule | Error Message | Document Type |
|---|------|---------------|---------------|
| 1 | Refund amount cannot exceed receipt balance | Server-side validation | Refund |
| 2 | Refund mode must be set | `"Cannot approve document, Refund mode not available"` | Refund |
| 3 | Discount percentage 0-100% | Server-side validation | Invoice (Discount) |
| 4 | Cancellation amount <= receipt amount | Server-side validation | Receipt |
| 5 | All amounts are read-only in AHAM | (UI: non-editable fields) | All |
| 6 | Retrospect Stage 2 needs different reviewer | Server-side validation | Retrospect Invoice |
| 7 | Authorization validity dates must be in future | Server-side validation | Authorization |
| 8 | High-value threshold triggers mandatory approval | Server-side flag check | Medication |
| 9 | Document creator cannot approve own document | `"Document creator cannot approve the document. Please revert the task."` | All |
| 10 | Task must be claimed before approval | `"Please click on claim/start to start the approval process."` | All |

---

## 15. Error Messages

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

---

*End of Billing & Finance Specification*
