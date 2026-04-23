# AHAM API Layer -- Complete Endpoint Reference

> Engineering Reference | 52+ Endpoints | 11 Microservices | Last updated 2026-04-22

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Gateway Service](#2-gateway-service)
3. [Registry Service](#3-registry-service)
4. [MDM Service (Master Data Management)](#4-mdm-service)
5. [jBPM Service (Task Engine)](#5-jbpm-service)
6. [AMB Service (Ambulatory / Billing)](#6-amb-service)
7. [MPI Service (Master Patient Index)](#7-mpi-service)
8. [PRM Service (Patient Relationship Management)](#8-prm-service)
9. [Additional Services](#9-additional-services)
10. [Common Patterns](#10-common-patterns)

---

## 1. Architecture Overview

```
Mobile App (Flutter)
    │
    ▼
┌─────────────────┐
│  API Gateway     │  ── Auth, routing, rate-limiting
│  (Kong / Custom) │
└────────┬────────┘
         │
    ┌────┴────────────────────────────────────────┐
    │         │         │       │       │          │
    ▼         ▼         ▼       ▼       ▼          ▼
 Gateway   Registry   MDM    jBPM     AMB        PRM
 Service   Service   Service Service  Service   Service
                                        │
                                        ▼
                                       MPI
                                      Service
```

**Routing note**: jBPM task queries go through MDM (`/mdm/api/jbpm/...`), task release goes through AMB (`/amb/api/jbpm/...`), and only claim-start and process-variable use the direct `/api/jbpm/` prefix.

**Base URL pattern**: `https://{environment}.{domain}/api/{service}/{version}/`

**Authentication**: Bearer token (JWT) on all endpoints except login. Token refresh via dedicated endpoint.

**Standard Headers**:
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
X-Unit-Code: {unit_code}
X-Organization-Id: {org_id}
X-Request-Id: {uuid}
```

---

## 2. Gateway Service

Authentication and session management.

### 2.1 POST `/gateway/login`

Production login endpoint.

**Request**:
```json
{
  "username": "string",
  "password": "string",
  "deviceId": "string",
  "fcmToken": "string",
  "platform": "android|ios"
}
```

**Response** `200`:
```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string",
  "expiresIn": 3600,
  "tokenType": "Bearer",
  "user": {
    "userId": "string",
    "username": "string",
    "displayName": "string",
    "roles": ["string"],
    "unitCode": "string",
    "organizationId": "string"
  }
}
```

**Error Responses**:
- `401` - Invalid credentials
- `403` - Account locked / inactive
- `423` - Account temporarily locked (too many attempts)

### 2.2 POST `/gateway/uat/login`

UAT environment login. Same request/response format as production login. May accept test credentials not valid in production.

**Request**: Same as `/gateway/login`

**Response**: Same as `/gateway/login`

### 2.3 POST `/gateway/token/refresh`

Refresh an expired access token.

**Request**:
```json
{
  "refreshToken": "string"
}
```

**Response** `200`:
```json
{
  "accessToken": "string (JWT)",
  "refreshToken": "string",
  "expiresIn": 3600,
  "tokenType": "Bearer"
}
```

**Error Responses**:
- `401` - Refresh token expired / invalid
- `403` - User session revoked

---

## 3. Registry Service

Domain and configuration management.

### 3.1 GET `/registry/domain`

Fetch domain configuration and service endpoints.

**Request**: No body. Auth header required.

**Response** `200`:
```json
{
  "domain": "string",
  "services": {
    "mdm": "string (base URL)",
    "jbpm": "string (base URL)",
    "amb": "string (base URL)",
    "mpi": "string (base URL)",
    "prm": "string (base URL)"
  },
  "config": {
    "chatEnabled": true,
    "campEnabled": true,
    "acsEndpoint": "string",
    "minAppVersion": "string",
    "forceUpdate": false
  }
}
```

---

## 4. MDM Service

Master data management -- users, organizations, geography.

### 4.1 POST `/mdm/user/_search`

Search for users (staff, consultants, coordinators).

**Request**:
```json
{
  "searchText": "string",
  "unitCode": "string",
  "organizationId": "string",
  "role": "string (optional)",
  "department": "string (optional)",
  "isActive": true,
  "page": 0,
  "size": 20
}
```

**Response field list**: `userId`, `username`, `displayName`, `firstName`, `lastName`, `email`, `mobileNumber`, `roles`, `department`, `designation`, `unitCode`, `organizationId`, `isActive`, `photo`

**Response** `200`:
```json
{
  "content": [
    {
      "userId": "string",
      "username": "string",
      "displayName": "string",
      "firstName": "string",
      "lastName": "string",
      "email": "string",
      "mobileNumber": "string",
      "roles": ["string"],
      "department": "string",
      "designation": "string",
      "unitCode": "string",
      "organizationId": "string",
      "isActive": true,
      "photo": "string"
    }
  ],
  "totalElements": 100,
  "totalPages": 5,
  "page": 0,
  "size": 20
}
```

### 4.2 GET `/mdm/zipcodes`

Fetch zipcode master data.

**Query Parameters**:
- `zipcode` (optional) - Filter by zipcode
- `stateCode` (optional) - Filter by state
- `cityCode` (optional) - Filter by city

**Response** `200`:
```json
{
  "data": [
    {
      "zipcode": "string",
      "area": "string",
      "cityCode": "string",
      "cityName": "string",
      "districtCode": "string",
      "districtName": "string",
      "stateCode": "string",
      "stateName": "string",
      "countryCode": "string"
    }
  ]
}
```

### 4.3 GET `/mdm/organizations`

Fetch organization hierarchy.

**Query Parameters**:
- `organizationId` (optional) - Specific org
- `isActive` (optional, default `true`)

**Response** `200`:
```json
{
  "data": [
    {
      "organizationId": "string",
      "organizationName": "string",
      "organizationType": "string",
      "units": [
        {
          "unitCode": "string",
          "unitName": "string",
          "address": {},
          "isActive": true
        }
      ],
      "isActive": true
    }
  ]
}
```

### 4.4 GET `/mdm/all-unit-hscs`

Fetch all units and their HSC (Health Service Center) mappings.

**Response** `200`:
```json
{
  "data": [
    {
      "unitCode": "string",
      "unitName": "string",
      "hscCode": "string",
      "hscName": "string",
      "organizationId": "string",
      "isActive": true
    }
  ]
}
```

---

## 5. jBPM Service

Business process and task management engine.

### 5.1 GET `/jbpm/alltasks`

Fetch all tasks across all queues with filters.

**Query Parameters**:
- `page` (int, default 0)
- `size` (int, default 20)
- `status` (string, optional) - Filter by task status
- `taskName` (string, optional) - Filter by task type
- `unitCode` (string, required)
- `sortBy` (string, default `createdOn`)
- `sortOrder` (string, default `desc`)

**Task name filter query** (covers all 13 task types):
```
taskName=Invoice Generation Approval,Discount Approval,Receipt Approval,
Receipt Cancellation,Refund Approval,Reversal Invoice Approval,
Retrospect Invoice Initiation,Retrospect Invoice Approval,
UnBilled Invoice Approval,HighValue MedicationRequest Approval,
Authorization Approval,Mandatory Brand Approval,Invoice Cancellation
```

**Response** `200`:
```json
{
  "taskSummaryList": [
    {
      "taskId": 12345,
      "taskName": "Invoice Generation Approval",
      "taskStatus": "OPEN",
      "processInstanceId": 67890,
      "containerId": "string",
      "actualOwner": null,
      "createdBy": "string",
      "createdOn": "2026-04-22T10:00:00Z",
      "activationTime": "2026-04-22T10:00:00Z",
      "priority": 0,
      "processId": "string",
      "description": "string",
      "subject": "string"
    }
  ],
  "totalCount": 100
}
```

### 5.2 GET `/jbpm/tasks/group`

Fetch tasks in the GROUP queue (available to claim).

**Query Parameters**: Same as `/jbpm/alltasks`

**Response**: Same format as `/jbpm/alltasks`

### 5.3 GET `/jbpm/tasks/personal`

Fetch tasks in MY (personal) queue -- tasks claimed by current user.

**Query Parameters**: Same as `/jbpm/alltasks`

**Response**: Same format as `/jbpm/alltasks`

### 5.4 POST `/jbpm/tasks/{taskId}/claim-start`

Claim and start a task (atomic operation). Moves task from OPEN to IN_PROGRESS.

**Path Parameters**:
- `taskId` (int) - jBPM task ID

**Request**:
```json
{
  "userId": "string"
}
```

**Response** `200`:
```json
{
  "taskId": 12345,
  "taskStatus": "IN_PROGRESS",
  "actualOwner": "string",
  "message": "Task claimed and started successfully"
}
```

**Error Responses**:
- `409` - `"Task has been already claimed by other user..!!"` (note: two dots, two bangs)
- `403` - `"Document creator cannot approve the document. Please revert the task."`

### 5.5 POST `/jbpm/tasks/{taskId}/release`

Release a claimed task back to the group queue. Moves task from IN_PROGRESS back to OPEN.

**Path Parameters**:
- `taskId` (int)

**Request**:
```json
{
  "userId": "string"
}
```

**Response** `200`:
```json
{
  "taskId": 12345,
  "taskStatus": "OPEN",
  "actualOwner": null,
  "message": "Task released successfully"
}
```

### 5.6 GET `/jbpm/tasks/{taskId}/process-variable`

Fetch process variables (document data) for a task.

**Path Parameters**:
- `taskId` (int)

**Query Parameters**:
- `variableName` (string, optional) - Specific variable

**Response** `200`:
```json
{
  "processVariables": {
    "documentNo": "string",
    "documentType": "string",
    "invoiceData": {},
    "receiptData": {},
    "refundData": {},
    "patientId": "string",
    "uhid": "string",
    "unitCode": "string",
    "additionalData": {}
  }
}
```

---

## 6. AMB Service

Ambulatory / billing and finance operations.

### 6.1 GET `/amb/invoicelite`

Fetch lightweight invoice list.

**Query Parameters**:
- `patientId` (string, optional)
- `uhid` (string, optional)
- `encounterNo` (string, optional)
- `unitCode` (string, required)
- `status` (string, optional)
- `page` (int, default 0)
- `size` (int, default 20)

**Response** `200`:
```json
{
  "data": [
    {
      "invoiceNo": "string",
      "patientName": "string",
      "uhid": "string",
      "grossAmount": 10000.00,
      "netAmount": 9500.00,
      "patientPayable": 5000.00,
      "invoiceDate": "string",
      "invoiceStatus": "string"
    }
  ],
  "totalCount": 50
}
```

### 6.2 POST `/amb/invoice/discount`

Apply discount to an invoice. Triggers Discount Approval workflow.

**Request**:
```json
{
  "invoiceNo": "string",
  "discretionaryDiscount": 500.00,
  "nonDiscretionaryDiscount": 0,
  "totalUserDiscountPercentage": 5.0,
  "remarks": "string",
  "approvedBy": "string"
}
```

**Response** `200`:
```json
{
  "invoiceNo": "string",
  "updatedInvoiceAmt": 9500.00,
  "patientPayable": 4750.00,
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 6.3 POST `/amb/invoice/retrospect`

Initiate retrospective invoice adjustment. Triggers Retrospect Invoice Initiation workflow.

**Request**:
```json
{
  "invoiceNo": "string",
  "adjustmentType": "string",
  "adjustmentAmount": 1000.00,
  "reason": "string",
  "lineItems": [
    {
      "serviceCode": "string",
      "quantity": 1,
      "unitPrice": 1000.00
    }
  ]
}
```

**Response** `200`:
```json
{
  "invoiceNo": "string",
  "retrospectId": "string",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 6.4 GET `/amb/medication-request`

Fetch a single medication request by ID.

**Query Parameters**:
- `requestId` (string)

**Response** `200`: Returns `MedicationRequestModel` with full details.

### 6.5 GET `/amb/medication-requests`

Fetch list of medication requests.

**Query Parameters**:
- `patientId` (string, optional)
- `uhid` (string, optional)
- `unitCode` (string, required)
- `status` (string, optional)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "requestId": "string",
      "patientId": "string",
      "uhid": "string",
      "medicationName": "string",
      "dosage": "string",
      "amount": 5000.00,
      "status": "string",
      "isHighValue": true,
      "createdOn": "string"
    }
  ],
  "totalCount": 10
}
```

### 6.6 GET `/amb/receipts`

Fetch receipts for a patient or invoice.

**Query Parameters**:
- `invoiceNo` (string, optional)
- `patientId` (string, optional)
- `uhid` (string, optional)
- `unitCode` (string, required)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "receiptNo": "string",
      "invoiceNo": "string",
      "receiptAmount": 5000.00,
      "paymentMode": "string",
      "receiptDate": "string",
      "receiptStatus": "string"
    }
  ],
  "totalCount": 5
}
```

### 6.7 POST `/amb/receipt/cancel`

Cancel a receipt. Triggers Receipt Cancellation workflow.

**Request**:
```json
{
  "receiptNo": "string",
  "cancellationAmount": 5000.00,
  "reasonForCancellation": "string"
}
```

**Response** `200`:
```json
{
  "receiptNo": "string",
  "receiptStatus": "CANCELLATION_PENDING",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 6.8 GET `/amb/refunds`

Fetch refund records.

**Query Parameters**:
- `receiptNo` (string, optional)
- `invoiceNo` (string, optional)
- `patientId` (string, optional)
- `unitCode` (string, required)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "refundNo": "string",
      "receiptNo": "string",
      "refundAmount": 2000.00,
      "refundMode": "string",
      "refundStatus": "string",
      "reasonForRefund": "string"
    }
  ],
  "totalCount": 3
}
```

### 6.9 POST `/amb/app/refund`

Initiate a refund. Triggers Refund Approval workflow.

**Request**:
```json
{
  "receiptNo": "string",
  "refundAmount": 2000.00,
  "refundMode": "string",
  "reasonForRefund": "string"
}
```

**Response** `200`:
```json
{
  "refundNo": "string",
  "refundStatus": "APPROVAL_PENDING",
  "workflowTriggered": true,
  "taskId": 12345
}
```

**Validation Error**:
- `400` - `"Cannot approve document, Refund mode is not available. Please revert the task."`

### 6.10 GET `/amb/unbilled-documents`

Fetch unbilled document records.

**Query Parameters**:
- `patientId` (string, optional)
- `uhid` (string, optional)
- `encounterNo` (string, optional)
- `unitCode` (string, required)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "documentNo": "string",
      "patientName": "string",
      "uhid": "string",
      "unbilledAmount": 3000.00,
      "serviceDate": "string",
      "status": "string"
    }
  ],
  "totalCount": 8
}
```

### 6.11 POST `/amb/app/unbilled`

Process an unbilled document. Triggers UnBilled Invoice Approval workflow.

**Request**:
```json
{
  "documentNo": "string",
  "action": "APPROVE|REJECT",
  "remarks": "string"
}
```

**Response** `200`:
```json
{
  "documentNo": "string",
  "status": "APPROVED",
  "workflowTriggered": true,
  "taskId": 12345
}
```

### 6.12 GET `/amb/resource-calendars/over-booking`

Fetch overbooking work patterns for resource calendars.

**Query Parameters**:
- `unitCode` (string, required)
- `resourceId` (string, optional)
- `date` (string, optional) - ISO date

**Response** `200`:
```json
{
  "data": [
    {
      "workPatternId": "string",
      "resourceId": "string",
      "date": "string",
      "maxOverBooking": 5,
      "slots": [],
      "isActive": true
    }
  ]
}
```

### 6.13 POST `/amb/_create/appointments/external`

Create an external appointment.

**Request**:
```json
{
  "patientId": "string",
  "uhid": "string",
  "consultantId": "string",
  "appointmentDate": "string",
  "appointmentTime": "string",
  "unitCode": "string",
  "departmentCode": "string",
  "appointmentType": "string",
  "remarks": "string"
}
```

**Response** `201`:
```json
{
  "appointmentId": "string",
  "appointmentNo": "string",
  "status": "SCHEDULED",
  "message": "Appointment created successfully"
}
```

---

## 7. MPI Service

Master Patient Index -- patient search and demographics.

### 7.1 POST `/mpi/search/patients`

Search patients across the master index.

**Request**:
```json
{
  "searchText": "string",
  "uhid": "string (optional)",
  "mobileNumber": "string (optional)",
  "firstName": "string (optional)",
  "lastName": "string (optional)",
  "dateOfBirth": "string (optional)",
  "gender": "string (optional)",
  "unitCode": "string",
  "page": 0,
  "size": 20
}
```

**Response** `200`:
```json
{
  "content": [
    {
      "patientId": "string",
      "uhid": "string",
      "firstName": "string",
      "lastName": "string",
      "fullName": "string",
      "dateOfBirth": "string",
      "gender": "string",
      "mobileNumber": "string",
      "age": {
        "years": 45,
        "months": 3,
        "days": 12
      },
      "unitCode": "string",
      "registrationDate": "string",
      "status": "Active"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "page": 0,
  "size": 20
}
```

---

## 8. PRM Service

Patient Relationship Management -- chat, outreach, camps.

### Chat Endpoints

### 8.1 GET `/prm/chat-conversations/user/chats`

Fetch chat conversations assigned to the current user (MY conversations).

**Query Parameters**:
- `userId` (string, required)
- `status` (string, optional)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "threadId": "string",
      "conversationId": "string",
      "topic": "string",
      "patientName": "string",
      "uhid": "string",
      "assignedTo": "string",
      "assignedToName": "string",
      "lastMessage": "string",
      "lastMessageOn": "string",
      "unreadCount": 3,
      "status": "ACTIVE"
    }
  ],
  "totalCount": 25
}
```

### 8.2 POST `/prm/_search/user/all-chat-conversation`

Search all chat conversations (ALL conversations queue).

**Request**:
```json
{
  "searchText": "string (optional)",
  "status": "string (optional)",
  "assignedTo": "string (optional)",
  "unitCode": "string",
  "page": 0,
  "size": 20
}
```

**Response** `200`: Same format as 8.1.

### 8.3 POST `/prm/_send/message`

Send a text message to a chat thread.

**Request**:
```json
{
  "threadId": "string",
  "content": "string",
  "type": "text",
  "metadata": {
    "senderDisplayName": "string",
    "patientId": "string",
    "conversationId": "string"
  }
}
```

**Response** `200`:
```json
{
  "messageId": "string",
  "threadId": "string",
  "createdOn": "string",
  "status": "SENT"
}
```

### 8.4 POST `/prm/_send/attachment`

Send a file attachment to a chat thread.

**Request**: `multipart/form-data`
- `threadId` (string)
- `file` (binary)
- `fileName` (string)
- `mimeType` (string)
- `metadata` (JSON string)

**Response** `200`:
```json
{
  "messageId": "string",
  "attachmentId": "string",
  "fileUrl": "string",
  "threadId": "string",
  "createdOn": "string"
}
```

### 8.5 GET `/prm/_read/messages`

Read / fetch messages from a chat thread.

**Query Parameters**:
- `threadId` (string, required)
- `page` (int)
- `size` (int)
- `before` (string, optional) - ISO timestamp cursor

**Response** `200`:
```json
{
  "messages": [
    {
      "messageId": "string",
      "senderId": "string",
      "senderDisplayName": "string",
      "content": "string",
      "type": "text|attachment|system",
      "createdOn": "string",
      "deletedOn": null,
      "metadata": {}
    }
  ],
  "hasMore": true,
  "nextCursor": "string"
}
```

### 8.6 GET `/prm/_download/attachments`

Download a chat attachment.

**Query Parameters**:
- `attachmentId` (string, required)
- `threadId` (string, required)

**Response** `200`: Binary file stream with appropriate `Content-Type` header.

### 8.7 DELETE `/prm/_delete/message`

Delete a chat message.

**Query Parameters**:
- `messageId` (string, required)
- `threadId` (string, required)

**Response** `200`:
```json
{
  "messageId": "string",
  "deletedOn": "string",
  "status": "DELETED"
}
```

### 8.8 POST `/prm/_assign`

Assign a chat conversation to a user.

**Request**:
```json
{
  "conversationId": "string",
  "threadId": "string",
  "assignTo": "string (userId)",
  "assignType": "ASSIGN"
}
```

**Response** `200`:
```json
{
  "conversationId": "string",
  "assignedTo": "string",
  "assignedToName": "string",
  "status": "ASSIGNED"
}
```

### 8.9 POST `/prm/_delegate`

Delegate a chat conversation to another user.

**Request**:
```json
{
  "conversationId": "string",
  "threadId": "string",
  "delegateTo": "string (userId)",
  "assignType": "DELEGATE",
  "reason": "string (optional)"
}
```

**Response** `200`:
```json
{
  "conversationId": "string",
  "assignedTo": "string",
  "assignedToName": "string",
  "status": "DELEGATED"
}
```

### 8.10 POST `/prm/_reassign`

Reassign a chat conversation from one user to another.

**Request**:
```json
{
  "conversationId": "string",
  "threadId": "string",
  "reassignTo": "string (userId)",
  "assignType": "REASSIGN",
  "reason": "string (optional)"
}
```

**Response** `200`:
```json
{
  "conversationId": "string",
  "assignedTo": "string",
  "assignedToName": "string",
  "status": "REASSIGNED"
}
```

### 8.11 GET `/prm/_user/participant-info`

Fetch participant information for a chat thread.

**Query Parameters**:
- `threadId` (string, required)

**Response** `200`:
```json
{
  "participants": [
    {
      "userId": "string",
      "displayName": "string",
      "role": "string",
      "joinedOn": "string",
      "isActive": true
    }
  ]
}
```

### Outreach / Camp Endpoints

### 8.12 GET `/prm/outreach-health-camps`

Fetch outreach health camps.

**Query Parameters**:
- `unitCode` (string, required)
- `status` (string, optional) - CampStatus filter
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "campId": "string",
      "campName": "string",
      "campCode": "string",
      "status": "ACTIVE",
      "startDate": "string",
      "endDate": "string",
      "location": "string",
      "totalPatients": 150,
      "coordinators": []
    }
  ],
  "totalCount": 10
}
```

### 8.13 GET `/prm/outreach/patients`

Fetch patients registered in outreach camps.

**Query Parameters**:
- `campId` (string, required)
- `searchText` (string, optional)
- `page` (int)
- `size` (int)

**Response** `200`:
```json
{
  "data": [
    {
      "campPatientId": "string",
      "campId": "string",
      "patientName": "string",
      "mobileNumber": "string",
      "uhid": "string",
      "tempId": "string",
      "gender": "string",
      "age": {},
      "registeredAt": "string",
      "status": "string"
    }
  ],
  "totalCount": 150
}
```

### 8.14 GET `/prm/outreach/temp-numbers`

Fetch temporary registration numbers for a camp.

**Query Parameters**:
- `campId` (string, required)

**Response** `200`:
```json
{
  "data": [
    {
      "tempId": "string",
      "patientName": "string",
      "mobileNumber": "string",
      "campId": "string",
      "status": "string",
      "assignedUhid": null
    }
  ]
}
```

### 8.15 POST `/prm/outreach-camp/create/work-pattern`

Create a work pattern for an outreach camp.

**Request**:
```json
{
  "campId": "string",
  "unitCode": "string",
  "resourceId": "string",
  "date": "string",
  "slots": [],
  "maxOverBooking": 5
}
```

**Response** `201`:
```json
{
  "workPatternId": "string",
  "campId": "string",
  "status": "CREATED"
}
```

### 8.16 PUT `/prm/outreach-camp/update/coordinators`

Update coordinators assigned to a camp.

**Request**:
```json
{
  "campId": "string",
  "coordinators": [
    {
      "coordinatorId": "string",
      "name": "string",
      "role": "string"
    }
  ]
}
```

**Response** `200`:
```json
{
  "campId": "string",
  "coordinators": [],
  "message": "Coordinators updated successfully"
}
```

---

## 9. Additional Services

Services confirmed in the binary but missing from the primary service catalog.

### COM (Comments/Common Service)

#### 9.1 GET `/com/api/_search/comments`

Search comments associated with tasks or documents.

**Query Parameters**:
- `entityId` (string) - ID of the entity (task, document) to fetch comments for
- `entityType` (string, optional) - Type filter
- `page` (int)
- `size` (int)

**Response** `200`: Returns list of `Comment` objects (model has `fromJson`).

#### 9.2 POST `/com/api/_store/fcm-user-token`

Store FCM (Firebase Cloud Messaging) user token for push notifications.

**Request**:
```json
{
  "userId": "string",
  "fcmToken": "string",
  "deviceId": "string",
  "platform": "android|ios"
}
```

**Response** `200`: Confirmation of token storage.

### DMS (Document Management Service)

#### 9.3 GET `/dms/api/document-records/download`

Download a document record.

**Query Parameters**:
- `documentId` (string, required)

**Response** `200`: Binary file stream with appropriate `Content-Type` header.

#### 9.4 POST `/dms/api/document-records/upload`

Upload a document record.

**Request**: `multipart/form-data`
- `file` (binary)
- `documentType` (string)
- `entityId` (string)
- `entityType` (string)

**Response** `201`: Document metadata including `documentId` and `fileUrl`.

### UAA (User Account & Authentication)

#### 9.5 GET `/uaa/api/account`

Fetch the current authenticated user's account information.

**Response** `200`: Returns `UserAccount` model (has `fromJson` and toString with `{id:...}`).

#### 9.6 GET `/uaa/api/preferences`

Fetch user preferences.

**Response** `200`: User preference key-value data.

#### 9.7 GET `/uaa/api/preferences/currentuser`

Fetch preferences for the currently authenticated user.

**Response** `200`: Current user preference data.

### External (Veri5 Digital KYC)

#### 9.8 POST `https://sandbox.veri5digital.com/video-id-kyc/api/1.0/docInfoExtract`

External Aadhaar document information extraction via Veri5 Digital sandbox.

**Request**: Document image data for Aadhaar KYC verification.

**Response** `200`: Extracted Aadhaar details (name, DOB, address, etc.) used to populate `AadhaarResultModel`.

---

## 10. Common Patterns

### 10.1 Pagination

All list endpoints support cursor or offset-based pagination:

```json
{
  "page": 0,
  "size": 20,
  "totalElements": 100,
  "totalPages": 5
}
```

### 10.2 Error Response Format

All endpoints return errors in standard format:

```json
{
  "statusCode": 400,
  "errorCode": "VALIDATION_ERROR",
  "message": "Human-readable error description",
  "details": "Detailed error info",
  "timestamp": "2026-04-22T10:00:00Z",
  "path": "/api/amb/invoice/discount"
}
```

### 10.3 Workflow-Triggering Endpoints

The following endpoints trigger jBPM workflows and return `taskId` in response:

| Endpoint | Workflow / Task Type |
|----------|---------------------|
| `POST /amb/invoice/discount` | Discount Approval |
| `POST /amb/invoice/retrospect` | Retrospect Invoice Initiation |
| `POST /amb/receipt/cancel` | Receipt Cancellation |
| `POST /amb/app/refund` | Refund Approval |
| `POST /amb/app/unbilled` | UnBilled Invoice Approval |

### 10.4 Known Validation Messages

| Message | Context |
|---------|---------|
| `"Task has been already claimed by other user..!!"` | jBPM claim-start, concurrent claim (note: two dots, two bangs in actual binary) |
| `"Document creator cannot approve the document. Please revert the task."` | jBPM claim-start, self-approval guard |
| `"Cannot approve document, Refund mode is not available. Please revert the task."` | Refund approval, missing refund mode |
| `"Do you want to revert task?"` | UI confirmation before task release |
| `"Would you like to claim the task?"` | UI confirmation before task claim |

---

*End of API Reference*
