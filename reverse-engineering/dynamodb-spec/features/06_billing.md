# Feature: Billing & Finance

> Table: `BillingTable`
> Owners: AMB Service (Ambulatory/Billing)

---

## Domain Overview

Complete billing lifecycle: Invoice generation, discounting, receipt collection, cancellation, refunds, retrospective adjustments, reversals, unbilled document processing, high-value medication approvals, and authorization management.

## Entity Types in This Table

| Entity | SK Pattern | Description |
|--------|-----------|-------------|
| Invoice | `INV#{invoiceNo}` | Full invoice record |
| Invoice Line Item | `INV#{invoiceNo}#LINE#{lineItemId}` | Individual line item |
| Receipt | `INV#{invoiceNo}#REC#{receiptNo}` | Payment receipt |
| Refund | `INV#{invoiceNo}#REC#{receiptNo}#REF#{refundNo}` | Refund against receipt |
| Authorization | `INV#{invoiceNo}#AUTH#{authId}` | Authorization record |
| Discount | `INV#{invoiceNo}#DISC#{discountId}` | Discount application |
| Unbilled Document | `UNBILL#{documentNo}` | Unbilled service record |
| Medication Request | `MEDREQ#{requestId}` | High-value medication request |

## Hierarchical Key Design

The composite sort key creates a natural hierarchy:

```
PAT#P-100234
├── INV#INV-2026-001                          → Invoice
│   ├── INV#INV-2026-001#LINE#L-001           → Line item 1
│   ├── INV#INV-2026-001#LINE#L-002           → Line item 2
│   ├── INV#INV-2026-001#AUTH#AUTH-001         → Authorization
│   ├── INV#INV-2026-001#DISC#DISC-001        → Discount
│   ├── INV#INV-2026-001#REC#REC-001          → Receipt 1
│   │   └── INV#INV-2026-001#REC#REC-001#REF#REF-001 → Refund
│   └── INV#INV-2026-001#REC#REC-002          → Receipt 2
├── INV#INV-2026-002                          → Second invoice
├── UNBILL#UB-001                             → Unbilled document
└── MEDREQ#MR-001                             → Medication request
```

### Query Patterns Enabled

| Query | DynamoDB Operation | Key Condition |
|-------|-------------------|---------------|
| All billing for patient | Query | `PK = PAT#P-100234` |
| Invoice with all children | Query | `PK = PAT#P-100234, SK begins_with INV#INV-2026-001` |
| Just the invoice | GetItem | `PK = PAT#P-100234, SK = INV#INV-2026-001` |
| Receipts for invoice | Query | `PK = PAT#P-100234, SK begins_with INV#INV-2026-001#REC#` |
| Specific receipt with refunds | Query | `PK = PAT#P-100234, SK begins_with INV#INV-2026-001#REC#REC-001` |
| All unbilled docs | Query | `PK = PAT#P-100234, SK begins_with UNBILL#` |

## Financial Calculations

All financial calculations happen in the application layer. DynamoDB stores the computed results:

```
grossAmount = sum(lineItems.amount)
netAmount = grossAmount - totalDiscounts + taxAmount
patientPayable = netAmount - sponsorAmount
totalDiscounts = discretionaryDiscount + nonDiscretionaryDiscount + planDiscountAmount
```

## Workflow Integration

When a billing action triggers a jBPM workflow:

1. **Invoice discount** → Create `DISC` item + Create task in `TaskWorkflowTable`
2. **Receipt cancellation** → Update `REC` item status + Create cancellation task
3. **Refund initiation** → Create `REF` item + Create refund approval task
4. **Retrospective adjustment** → Create adjustment item + Create 2-stage approval tasks

The `TaskWorkflowTable` task item references the billing document via `documentNo`.

## GSI Design

### GSI1: Invoices by Unit and Status

```
GSI1PK = UNIT#NH-BLR-01#STATUS#PENDING
GSI1SK = DATE#2026-04-23

→ Used by AHAM staff to view invoices requiring action
→ Only invoice items have GSI1PK populated (not line items, receipts, etc.)
```

### GSI2: Lookup by Invoice Number

```
GSI2PK = INVNO#INV-2026-001
GSI2SK = PAT#P-100234

→ Direct lookup when you have invoice number but not patient ID
→ Returns the patient ID, then query main table for full hierarchy
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Patient billing history | 50 | 0 | Bill review during discharge |
| Invoice creation | 0 | 20 | Batch at end of day |
| Receipt collection | 0 | 15 | Counter hours |
| Invoices by unit | 30 | 0 | AHAM task list refresh |
| Refund/cancellation | 0 | 5 | Infrequent |

## Consistency Requirements

- **Invoice creation/update**: Strongly consistent (financial integrity)
- **Receipt creation**: Strongly consistent (payment recording)
- **Invoice listing**: Eventually consistent (acceptable for browsing)

## Validation Rules (from AHAM spec)

1. Document creator cannot approve their own document
2. Refund mode must be available before approval
3. Task must not be claimed by another user (optimistic concurrency via condition expressions)
4. Receipt cancellation amount <= receipt amount
5. Refund amount <= receipt amount - previous refunds
