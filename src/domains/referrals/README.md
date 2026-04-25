# Referrals Domain

## Purpose
Manages referral request intake for external referrals and internal cross-consults.
Captures referral details, routing destination, urgency, and supporting context.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| ReferralsScreen | `/(app)/referrals` | Referral request form with live validation and recent request tracking |

## Request Types
| Type | Description |
|------|-------------|
| External Referral | Referral sent to a specific provider |
| Cross Consult | Internal specialist consult request |

## Status Flow
```
Initiated → Accepted → Completed → Closed
```

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | Referral and consult item contracts |
| `types.ts` | Delay checks and status helpers for list workflows |

## Priority Levels
| Priority | Badge Color |
|----------|-------------|
| Normal | Slate |
| Urgent | Red |

## Form Requirements
- Patient name
- MRN
- Requesting doctor
- Destination provider
- Destination department
- Reason for referral

## Cross-Domain Consumers
- `patient-detail/GreenZone` — Links to referrals for discharge planning
