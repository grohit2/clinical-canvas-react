# Dashboard Domain

## Purpose
Main dashboard view showing KPIs, patient stage distribution, and upcoming procedures.
Provides at-a-glance overview of clinical operations.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| DashboardScreen | `/(app)/` | Main dashboard with KPIs and stats |

## Components
| Component | Description |
|-----------|-------------|
| KPITile | Displays a single KPI metric with icon and optional trend |
| MindfulnessTile | Motivational/wellness tile for staff |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | KPIData, StageEntry, UpcomingProcedure types |
| `types.ts` | Stage normalization and variant helpers |

## KPI Metrics
| Metric | Description |
|--------|-------------|
| Total Patients | Active patient count |
| Tasks Due | Pending tasks requiring attention |
| Urgent Alerts | High-priority notifications |

## Stage Distribution
Displays patient counts by stage:
- Onboarding
- Pre-Op (yellow/caution)
- Intra-Op (red/urgent)
- Post-Op (green/stable)
- Discharge (green/stable)

## Cross-Domain Dependencies
- `patient-list` - Uses usePatients for patient data
- `tasks` - Links to tasks due screen
