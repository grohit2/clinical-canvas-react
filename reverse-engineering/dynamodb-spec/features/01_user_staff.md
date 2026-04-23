# Feature: User & Staff Management

> Table: `UserStaffTable`
> Owners: Gateway Service, MDM Service, UAA Service

---

## Domain Overview

All human actors in the system: doctors, nurses, paramedics, coordinators, and admin staff. Both AADI and AHAM authenticate against the same user base.

## Entity Types in This Table

| Entity | SK Pattern | Description |
|--------|-----------|-------------|
| User Profile | `PROFILE` | Core user demographics and roles |
| FCM Token | `FCM#{deviceId}` | Push notification device registration |

## Key Access Patterns

### Authentication Flow
1. **Login**: GSI1 lookup by `LOGIN#{username}` to find userId, then GetItem for full profile
2. **Token refresh**: GetItem by `USER#{userId}` + `PROFILE` to validate session
3. **FCM registration**: PutItem `USER#{userId}` + `FCM#{deviceId}`

### User Search
1. **Search users in unit**: GSI2 query `UNIT#{unitCode}` with SK prefix `ROLE#DOCTOR` or `ROLE#NURSE`
2. **Search by name**: GSI2 query with filter expression on `displayName contains "searchText"`

### Care Team Population
1. **Find doctors for cross-consultation**: GSI2 query `UNIT#{targetUnit}`, filter `ROLE#DOCTOR`
2. **Find team members for care team**: GSI2 query `UNIT#{unitCode}`, all roles

## Data Flow

```
AADI Login → POST /api/authenticate → Validate credentials → Return JWT
           → GET /api/account → Query UserStaffTable GSI1 by login
           → POST FCM registration → PutItem FCM token

AHAM Login → POST /gateway/login → Same flow, different endpoint

Logout → DeleteItem FCM token → Invalidate JWT (server-side)
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Login (read profile) | 20 | 0 | Shift changes at 7am, 2pm, 10pm |
| FCM token writes | 0 | 10 | Same shift change pattern |
| User search | 30 | 0 | During care team setup |
| Profile updates | 0 | 2 | Rare admin operations |

## Consistency Requirements

- **Login**: Strongly consistent (must see latest password/status changes)
- **User search**: Eventually consistent (OK to lag a few seconds)
- **FCM tokens**: Eventually consistent

## Denormalization Notes

User attributes (`displayName`, `login`, `employeeNo`) are copied to:
- CareTeamTable (MEMBER items)
- ClinicalDocumentTable (createdBy, submittedBy fields)
- TaskWorkflowTable (actualOwner, createdBy)
- ChatTable (assignedTo, assignedToName)

**Update propagation**: DynamoDB Stream on UserStaffTable triggers Lambda to update denormalized copies when `displayName` or role changes. This is rare (admin operation) so eventual consistency is acceptable.
