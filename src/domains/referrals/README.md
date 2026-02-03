# Referrals Domain

## Purpose
Manages external referrals and internal cross-consultations between departments.
Tracks status, priority, and response times for patient referrals.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| ReferralsScreen | `/(app)/referrals` | List of referrals and consults with filters |

## Item Types
| Type | Description |
|------|-------------|
| Referral | External referral to another provider |
| Consult | Internal cross-department consultation |

## Referral Status Flow
```
Initiated → Accepted → Completed → Closed
```

## Consult Status Flow
```
Requested → Accepted → Completed
```

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | ReferralItem, ConsultItem, status types |
| `types.ts` | isDelayed, isMyItem, isSent, isReceived helpers |
| `types.ts` | formatReferralDate, getStatusColor utilities |

## Filters
| Filter | Options |
|--------|---------|
| Patient | All / My Patients |
| Direction | Sent / Received |
| Sort | Newest First / Oldest First |
| Search | Patient name, MRN, provider, reason |

## Priority Levels
| Priority | Badge Color |
|----------|-------------|
| Normal | Default |
| Urgent | Red |

## Status Colors
| Status | Color |
|--------|-------|
| Completed/Closed | Green |
| Accepted | Blue |
| Initiated/Requested | Yellow |

## Cross-Domain Consumers
- `patient-detail/GreenZone` — Links to referrals for discharge planning
