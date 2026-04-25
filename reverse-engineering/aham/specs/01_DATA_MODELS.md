# AHAM Data Models -- Complete Data Dictionary

> Engineering Reference | 67 Models | Last updated 2026-04-22

---

## Table of Contents

1. [Patient & Registration Models](#1-patient--registration-models)
2. [Camp & Outreach Models](#2-camp--outreach-models)
3. [Chat & Messaging Models](#3-chat--messaging-models)
4. [Consultant & Coordinator Models](#4-consultant--coordinator-models)
5. [Billing & Finance Models](#5-billing--finance-models)
6. [Task & Workflow Models](#6-task--workflow-models)
7. [Address & Geography Models](#7-address--geography-models)
8. [Configuration & System Models](#8-configuration--system-models)
9. [Enums](#9-enums)

---

## 1. Patient & Registration Models

### 1.1 PatientModel

Primary patient record used across MPI, billing, and outreach modules.

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `String` | Unique patient identifier (MPI-assigned) |
| `uhid` | `String` | Universal Health ID |
| `firstName` | `String` | Patient first name |
| `lastName` | `String` | Patient last name |
| `fullName` | `String` | Concatenated display name |
| `dateOfBirth` | `String` | ISO-8601 date string |
| `age` | `AgeDTO` | Structured age object |
| `gender` | `String` | M / F / O |
| `mobileNumber` | `String` | Primary contact number |
| `email` | `String?` | Email address (optional) |
| `address` | `AddressModel?` | Structured address |
| `aadhaarNumber` | `String?` | Aadhaar ID (masked in UI) |
| `patientType` | `PatientType` | Enum: type classification |
| `registrationDate` | `String` | Registration timestamp |
| `status` | `String` | Active / Inactive |
| `unitCode` | `String` | Hospital unit code |
| `organizationId` | `String` | Parent organization |
| `photo` | `String?` | Base64 or URL of patient photo |
| `bloodGroup` | `String?` | Blood group |
| `maritalStatus` | `String?` | Marital status |
| `nationality` | `String?` | Nationality |
| `emergencyContactName` | `String?` | Emergency contact name |
| `emergencyContactNumber` | `String?` | Emergency contact phone |
| `insuranceDetails` | `Map<String, dynamic>?` | Insurance info blob |

### 1.2 SearchPatientModel

Lightweight model returned from MPI patient search.

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `String` | Patient ID |
| `uhid` | `String` | Universal Health ID |
| `firstName` | `String` | First name |
| `lastName` | `String` | Last name |
| `fullName` | `String` | Display name |
| `dateOfBirth` | `String` | DOB |
| `gender` | `String` | Gender |
| `mobileNumber` | `String` | Phone |
| `age` | `AgeDTO` | Age object |
| `unitCode` | `String` | Unit code |
| `registrationDate` | `String` | Registration date |
| `status` | `String` | Patient status |

### 1.3 AgeDTO

Structured age representation.

| Field | Type | Description |
|-------|------|-------------|
| `years` | `int` | Years component |
| `months` | `int` | Months component |
| `days` | `int` | Days component |

### 1.4 RegistrationTempIdModel

Temporary ID assigned during camp registration before formal MPI registration.

| Field | Type | Description |
|-------|------|-------------|
| `tempId` | `String` | Temporary registration ID |
| `patientName` | `String` | Patient name |
| `mobileNumber` | `String` | Contact number |
| `campId` | `String` | Associated camp ID |
| `createdAt` | `String` | Creation timestamp |
| `status` | `String` | Temp registration status |
| `assignedUhid` | `String?` | UHID once formally registered |

### 1.5 AadhaarResultModel

Result from Aadhaar verification / KYC flow.

| Field | Type | Description |
|-------|------|-------------|
| `aadhaarNumber` | `String` | Aadhaar number (masked) |
| `name` | `String` | Name as on Aadhaar |
| `dateOfBirth` | `String` | DOB from Aadhaar |
| `gender` | `String` | Gender from Aadhaar |
| `address` | `String` | Address from Aadhaar |
| `photo` | `String?` | Photo from Aadhaar (Base64) |
| `verified` | `bool` | Verification success flag |
| `verificationTimestamp` | `String` | When verification occurred |

### 1.6 PatientDocumentModel

Document metadata for patient-uploaded files.

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `String` | Unique document ID |
| `patientId` | `String` | Owning patient |
| `documentType` | `String` | Type classification |
| `fileName` | `String` | Original file name |
| `fileUrl` | `String` | Download URL |
| `mimeType` | `String` | MIME type |
| `fileSize` | `int?` | Size in bytes |
| `uploadedAt` | `String` | Upload timestamp |
| `uploadedBy` | `String` | User who uploaded |
| `description` | `String?` | Optional description |
| `tags` | `List<String>?` | Search tags |

### 1.7 PatientDocumentUploadDto

DTO for uploading a patient document.

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | `String` | Target patient |
| `documentType` | `String` | Type classification |
| `fileName` | `String` | File name |
| `fileData` | `String` | Base64-encoded file content |
| `mimeType` | `String` | MIME type |
| `description` | `String?` | Optional description |
| `tags` | `List<String>?` | Tags |

---

## 2. Camp & Outreach Models

### 2.1 CampModel

Health camp definition for outreach programs.

| Field | Type | Description |
|-------|------|-------------|
| `campId` | `String` | Unique camp identifier |
| `campName` | `String` | Camp display name |
| `campCode` | `String` | Short code |
| `campType` | `String` | Camp type classification |
| `status` | `CampStatus` | Current camp status enum |
| `startDate` | `String` | Camp start date |
| `endDate` | `String` | Camp end date |
| `location` | `String` | Camp location description |
| `address` | `AddressModel?` | Structured address |
| `organizationId` | `String` | Parent organization |
| `unitCode` | `String` | Hospital unit |
| `coordinators` | `List<CoordinatorModel>` | Assigned coordinators |
| `consultants` | `List<ConsultantModel>?` | Assigned doctors |
| `totalPatients` | `int` | Total registered patients |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `updatedAt` | `String` | Last update timestamp |
| `workPatternId` | `String?` | Associated work pattern |

### 2.2 CampPatientsModel

Patient record within a specific camp context.

| Field | Type | Description |
|-------|------|-------------|
| `campPatientId` | `String` | Camp-patient link ID |
| `campId` | `String` | Parent camp |
| `patientId` | `String` | Patient reference |
| `uhid` | `String?` | UHID (may be null for temp) |
| `tempId` | `String?` | Temp ID (pre-registration) |
| `patientName` | `String` | Patient name |
| `mobileNumber` | `String` | Contact number |
| `age` | `AgeDTO?` | Age |
| `gender` | `String` | Gender |
| `registeredAt` | `String` | Camp registration time |
| `registeredBy` | `String` | Registering user |
| `status` | `String` | Registration status |
| `consultationStatus` | `String?` | Consultation progress |
| `notes` | `String?` | Camp-specific notes |

### 2.3 OverBookingWorkPatternModel

Work pattern configuration for overbooking slots.

| Field | Type | Description |
|-------|------|-------------|
| `workPatternId` | `String` | Work pattern ID |
| `unitCode` | `String` | Unit code |
| `resourceId` | `String` | Resource (doctor/room) ID |
| `date` | `String` | Applicable date |
| `slots` | `List<Map<String, dynamic>>` | Slot configuration |
| `maxOverBooking` | `int` | Max overbooking count |
| `isActive` | `bool` | Active flag |

---

## 3. Chat & Messaging Models

### 3.1 ChatConversationModel

Represents a chat conversation / thread in the care assistant system.

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | ACS thread identifier |
| `conversationId` | `String` | Internal conversation ID |
| `topic` | `String` | Thread topic / title |
| `patientId` | `String?` | Associated patient |
| `patientName` | `String?` | Patient display name |
| `uhid` | `String?` | Patient UHID |
| `assignedTo` | `String?` | Currently assigned user ID |
| `assignedToName` | `String?` | Assigned user display name |
| `assignType` | `ChatAssignType?` | ASSIGN / DELEGATE / REASSIGN |
| `status` | `String` | Conversation status |
| `createdOn` | `String` | Creation timestamp |
| `lastMessageOn` | `String?` | Last message timestamp |
| `lastMessage` | `String?` | Last message preview |
| `unreadCount` | `int` | Unread message count |
| `participants` | `List<String>?` | Participant IDs |
| `metadata` | `Map<String, dynamic>?` | Additional metadata |

### 3.2 ChatDataModel

Composite model holding full chat data for a thread view.

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | Thread identifier |
| `topic` | `String` | Thread topic |
| `messages` | `List<ChatMessageDTO>` | All messages in thread |
| `participants` | `List<ChatParticipantsModel>` | Thread participants |
| `conversationDetails` | `ChatConversationModel` | Parent conversation |
| `accessToken` | `ChatAccessTokenModel?` | ACS access token |

### 3.3 ChatAccessTokenModel

Azure Communication Services access token for real-time chat.

| Field | Type | Description |
|-------|------|-------------|
| `token` | `String` | ACS access token |
| `expiresOn` | `String` | Token expiry timestamp |
| `userId` | `String` | ACS user ID |
| `endpoint` | `String` | ACS endpoint URL |

### 3.4 ChatMessageDTO (Java)

Core message data transfer object used across the native plugin layer and Flutter.

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | `CustomChatMessageType` | Event type identifier |
| `threadId` | `String` | Parent thread ID |
| `groupId` | `String` | Group identifier |
| `payload` | `Object` | Message payload (not necessarily String) |
| `metadata` | `Object` | Metadata (in Java, type is `Object`, not `Map<String, String>`) |

### 3.5 ChatMessageReceived (Java)

Parsed structure for a received chat message event.

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | `String` | Sender's ACS user ID |
| `messageId` | `String` | Unique message identifier |
| `content` | `String` | Message body text |
| `type` | `String` | Message content type |
| `createdOn` | `String` | Message creation timestamp |
| `deletedOn` | `String?` | Deletion timestamp (null if active) |
| `senderDisplayName` | `String` | Sender's display name |

### 3.6 ChatMessageDeleted (Java)

Event structure for a deleted message notification.

| Field | Type | Description |
|-------|------|-------------|
| `messageId` | `String` | ID of deleted message |
| `deletedOn` | `String` | Deletion timestamp |

### 3.7 ChatParticipantsModel (Java)

Participant information within a chat thread.

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | `String` | Participant's sender ID |
| `messageId` | `String` | Associated message ID |
| `content` | `List<String>` | Participant content list |
| `type` | `String` | Participant type |
| `createdOn` | `String` | Join timestamp |

### 3.8 ChatThreadDeletedModel (Java)

Event structure for thread deletion.

| Field | Type | Description |
|-------|------|-------------|
| `versionNumber` | `String` | Thread version at deletion |
| `content` | `String` | Deletion content / reason |

### 3.9 StoreChatDataModel

ObjectBox entity for local persistence of chat messages.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `int` | ObjectBox auto-increment ID |
| `threadId` | `String` | Thread identifier |
| `messageId` | `String` | Message ID |
| `senderId` | `String` | Sender ID |
| `senderDisplayName` | `String` | Sender name |
| `content` | `String` | Message content |
| `type` | `String` | Message type |
| `createdOn` | `String` | Creation timestamp |
| `deletedOn` | `String?` | Deletion timestamp |
| `metadata` | `String?` | JSON metadata string |
| `isRead` | `bool` | Read status |
| `isSynced` | `bool` | Server sync status |

### 3.10 ChatMessageSendDto

DTO for sending a chat message.

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | Target thread |
| `content` | `String` | Message body |
| `type` | `String` | Content type (text/attachment) |
| `metadata` | `ChatSendMetadata?` | Send metadata |
| `attachments` | `List<ChatAttachments>?` | Attached files |

### 3.11 ChatSendMetadata

Metadata attached to outgoing messages.

| Field | Type | Description |
|-------|------|-------------|
| `senderDisplayName` | `String` | Display name of sender |
| `patientId` | `String?` | Associated patient |
| `conversationId` | `String?` | Conversation reference |
| `priority` | `String?` | Message priority |
| `customType` | `String?` | Custom message type tag |

### 3.12 ChatAttachments

File attachment on a chat message.

| Field | Type | Description |
|-------|------|-------------|
| `attachmentId` | `String` | Attachment identifier |
| `fileName` | `String` | Original file name |
| `fileUrl` | `String` | Download URL |
| `mimeType` | `String` | MIME type |
| `fileSize` | `int` | Size in bytes |
| `thumbnailUrl` | `String?` | Thumbnail for images |

---

## 4. Consultant & Coordinator Models

### 4.1 ConsultantModel

Doctor / consultant profile.

| Field | Type | Description |
|-------|------|-------------|
| `consultantId` | `String` | Consultant ID |
| `name` | `String` | Full name |
| `displayName` | `String` | Display name |
| `specialization` | `String` | Medical specialization |
| `department` | `String` | Department |
| `unitCode` | `String` | Unit code |
| `organizationId` | `String` | Organization |
| `mobileNumber` | `String?` | Contact number |
| `email` | `String?` | Email |
| `isActive` | `bool` | Active status |
| `photo` | `String?` | Photo URL |
| `designation` | `String?` | Designation / title |
| `qualifications` | `String?` | Qualifications string |

### 4.2 CoordinatorModel

Camp / outreach coordinator profile.

| Field | Type | Description |
|-------|------|-------------|
| `coordinatorId` | `String` | Coordinator ID |
| `name` | `String` | Full name |
| `mobileNumber` | `String` | Contact number |
| `email` | `String?` | Email |
| `role` | `String` | Role classification |
| `unitCode` | `String` | Unit code |
| `organizationId` | `String` | Organization |
| `isActive` | `bool` | Active status |
| `assignedCamps` | `List<String>?` | Assigned camp IDs |

### 4.3 FcmUserInfoModel

Firebase Cloud Messaging user token registration.

| Field | Type | Description |
|-------|------|-------------|
| `userId` | `String` | User identifier |
| `fcmToken` | `String` | FCM device token |
| `deviceId` | `String` | Device identifier |
| `platform` | `String` | android / ios |
| `appVersion` | `String` | App version string |
| `lastUpdated` | `String` | Token update timestamp |
| `isActive` | `bool` | Token active status |

---

## 5. Billing & Finance Models

### 5.1 Invoice

Full invoice model with all billing computation fields.

| Field | Type | Description |
|-------|------|-------------|
| `invoiceId` | `String` | Internal invoice ID |
| `invoiceNo` | `String` | Display invoice number |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `patientName` | `String` | Patient name |
| `encounterNo` | `String` | Encounter / visit number |
| `unitCode` | `String` | Hospital unit |
| `departmentCode` | `String` | Department code |
| `invoiceDate` | `String` | Invoice creation date |
| `invoiceStatus` | `String` | Current status |
| `invoiceType` | `String` | Invoice type classification |
| `grossAmount` | `double` | Gross total before discounts |
| `grossAmtWithAuth` | `double` | Gross amount with authorization |
| `hospitalTariff` | `double` | Hospital tariff amount |
| `taxAmount` | `double` | Tax amount |
| `originalInvoiceAmt` | `double` | Original invoice amount |
| `updatedInvoiceAmt` | `double` | Updated invoice amount (post-edit) |
| `netAmount` | `double` | Net amount after adjustments |
| `patientDiscount` | `double` | Patient-side discount |
| `patientDiscountWithAuth` | `double` | Patient discount with auth |
| `sponsorDiscount` | `double` | Sponsor-side discount |
| `sponsorDiscountWithAuth` | `double` | Sponsor discount with auth |
| `discretionaryDiscount` | `double` | Discretionary discount amount |
| `nonDiscretionaryDiscount` | `double` | Non-discretionary discount |
| `planDiscountAmount` | `double` | Plan-based discount |
| `totalUserDiscountPercentage` | `double` | Total user discount as percentage |
| `patientPayable` | `double` | Amount patient must pay |
| `patientPayableWithAuth` | `double` | Patient payable with authorization |
| `sponsorAmount` | `double` | Sponsor contribution |
| `sponsorPayable` | `double` | Sponsor payable amount |
| `sponsorNetAmtWithAuth` | `double` | Sponsor net with authorization |
| `totalSponsorAmount` | `double` | Total sponsor amount |
| `patientAmount` | `double` | Total patient amount |
| `totalAmount` | `double` | Final total amount |
| `lineItems` | `List<TaskLineItem>?` | Invoice line items |
| `createdBy` | `String` | Creator user ID |
| `createdAt` | `String` | Creation timestamp |
| `approvedBy` | `String?` | Approver user ID |
| `approvedAt` | `String?` | Approval timestamp |
| `remarks` | `String?` | Remarks / notes |

### 5.2 Receipt

Payment receipt against an invoice.

| Field | Type | Description |
|-------|------|-------------|
| `receiptId` | `String` | Receipt ID |
| `receiptNo` | `String` | Display receipt number |
| `invoiceNo` | `String` | Linked invoice number |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `receiptAmount` | `double` | Receipt amount |
| `paymentMode` | `String` | Payment mode |
| `receiptDate` | `String` | Receipt date |
| `receiptStatus` | `String` | Status |
| `cancellationAmount` | `double?` | Cancellation amount (if cancelled) |
| `reasonForCancellation` | `String?` | Cancellation reason |
| `cancelledBy` | `String?` | User who cancelled |
| `cancelledAt` | `String?` | Cancellation timestamp |
| `createdBy` | `String` | Creator |
| `createdAt` | `String` | Creation timestamp |
| `unitCode` | `String` | Unit code |

### 5.3 Refund

Refund record against a receipt.

| Field | Type | Description |
|-------|------|-------------|
| `refundId` | `String` | Refund ID |
| `refundNo` | `String` | Display refund number |
| `receiptNo` | `String` | Linked receipt |
| `invoiceNo` | `String` | Linked invoice |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `refundAmount` | `double` | Refund amount |
| `refundMode` | `String` | Refund mode |
| `refundDate` | `String` | Refund date |
| `refundStatus` | `String` | Status |
| `reasonForRefund` | `String` | Refund reason |
| `approvedBy` | `String?` | Approver |
| `approvedAt` | `String?` | Approval timestamp |
| `createdBy` | `String` | Creator |
| `createdAt` | `String` | Creation timestamp |
| `unitCode` | `String` | Unit code |

### 5.4 UnbilledDocument

Document for unbilled services pending invoice generation.

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `String` | Document ID |
| `documentNo` | `String` | Display number |
| `patientId` | `String` | Patient reference |
| `uhid` | `String` | Patient UHID |
| `patientName` | `String` | Patient name |
| `encounterNo` | `String` | Encounter number |
| `unbilledAmount` | `double` | Total unbilled amount |
| `serviceDate` | `String` | Service date |
| `departmentCode` | `String` | Department |
| `unitCode` | `String` | Unit code |
| `status` | `String` | Document status |
| `lineItems` | `List<TaskLineItem>?` | Service line items |
| `createdBy` | `String` | Creator |
| `createdAt` | `String` | Creation timestamp |

---

## 6. Task & Workflow Models

### 6.1 Task

jBPM task representation. Constructed via `fromJson` factory.

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | `int` | jBPM task ID |
| `taskName` | `String` | Task type name |
| `taskStatus` | `String` | OPEN / CLAIMED / IN_PROGRESS / DONE / CLOSED |
| `processInstanceId` | `int` | jBPM process instance |
| `containerId` | `String` | jBPM container |
| `actualOwner` | `String?` | Claimed by user |
| `createdBy` | `String` | Task creator |
| `createdOn` | `String` | Creation timestamp |
| `activationTime` | `String` | Activation timestamp |
| `priority` | `int` | Task priority |
| `processId` | `String` | Process definition ID |
| `description` | `String?` | Task description |
| `subject` | `String?` | Task subject |
| `documentNo` | `String?` | Linked document number |
| `patientId` | `String?` | Linked patient |
| `uhid` | `String?` | Patient UHID |
| `unitCode` | `String?` | Unit code |
| `processVariables` | `Map<String, dynamic>?` | jBPM process variables |

### 6.2 TaskLineItem

Individual line item within a billing document task.

| Field | Type | Description |
|-------|------|-------------|
| `lineItemId` | `String` | Line item ID |
| `serviceCode` | `String` | Service code |
| `serviceName` | `String` | Service description |
| `quantity` | `int` | Quantity |
| `unitPrice` | `double` | Unit price |
| `amount` | `double` | Line total |
| `discount` | `double?` | Discount amount |
| `netAmount` | `double` | Net line amount |
| `taxAmount` | `double?` | Tax amount |
| `departmentCode` | `String?` | Department |
| `remarks` | `String?` | Remarks |

---

## 7. Address & Geography Models

### 7.1 AddressModel

Composite address structure.

| Field | Type | Description |
|-------|------|-------------|
| `addressLine1` | `String` | Address line 1 |
| `addressLine2` | `String?` | Address line 2 |
| `city` | `String` | City name |
| `cityCode` | `String?` | City code |
| `district` | `String?` | District name |
| `districtCode` | `String?` | District code |
| `state` | `String` | State name |
| `stateCode` | `String?` | State code |
| `country` | `String` | Country name |
| `countryCode` | `String?` | Country code |
| `zipcode` | `String` | Postal code |
| `landmark` | `String?` | Landmark |

### 7.2 CityModel

| Field | Type | Description |
|-------|------|-------------|
| `cityCode` | `String` | City code |
| `cityName` | `String` | City name |
| `districtCode` | `String` | Parent district |
| `stateCode` | `String` | Parent state |
| `isActive` | `bool` | Active flag |

### 7.3 StateModel

| Field | Type | Description |
|-------|------|-------------|
| `stateCode` | `String` | State code |
| `stateName` | `String` | State name |
| `countryCode` | `String` | Parent country |
| `isActive` | `bool` | Active flag |

### 7.4 DistrictModel

| Field | Type | Description |
|-------|------|-------------|
| `districtCode` | `String` | District code |
| `districtName` | `String` | District name |
| `stateCode` | `String` | Parent state |
| `isActive` | `bool` | Active flag |

### 7.5 CountryModel

| Field | Type | Description |
|-------|------|-------------|
| `countryCode` | `String` | Country code |
| `countryName` | `String` | Country name |
| `isActive` | `bool` | Active flag |

### 7.6 ZipcodeModel

| Field | Type | Description |
|-------|------|-------------|
| `zipcode` | `String` | Postal / zip code |
| `area` | `String` | Area name |
| `cityCode` | `String` | City code |
| `districtCode` | `String` | District code |
| `stateCode` | `String` | State code |
| `countryCode` | `String` | Country code |
| `isActive` | `bool` | Active flag |

---

## 8. Configuration & System Models

### 8.1 AppRemoteConfigModel

Remote configuration fetched at app startup.

| Field | Type | Description |
|-------|------|-------------|
| `configId` | `String` | Config identifier |
| `appVersion` | `String` | Minimum app version |
| `forceUpdate` | `bool` | Force update flag |
| `maintenanceMode` | `bool` | Maintenance mode flag |
| `maintenanceMessage` | `String?` | Maintenance message |
| `features` | `Map<String, bool>` | Feature toggles |
| `apiBaseUrl` | `String` | API base URL |
| `acsEndpoint` | `String?` | ACS endpoint |
| `chatEnabled` | `bool` | Chat feature flag |
| `campEnabled` | `bool` | Camp feature flag |
| `lastUpdated` | `String` | Config update timestamp |

### 8.2 ErrorResponseModel

Standard API error response.

| Field | Type | Description |
|-------|------|-------------|
| `statusCode` | `int` | HTTP status code |
| `errorCode` | `String` | Application error code |
| `message` | `String` | Human-readable error message |
| `details` | `String?` | Detailed error info |
| `timestamp` | `String` | Error timestamp |
| `path` | `String?` | Request path |

---

## 9. Enums

### 9.1 PatientType

Patient classification enum.

| Value | Description |
|-------|-------------|
| `GENERAL` | General / walk-in patient |
| `EMERGENCY` | Emergency patient |
| `CAMP` | Camp / outreach patient |
| `REFERRED` | Referred patient |

### 9.2 CampStatus

Health camp lifecycle status.

| Value | Description |
|-------|-------------|
| `PLANNED` | Camp planned, not started |
| `ACTIVE` | Camp currently active |
| `COMPLETED` | Camp completed |
| `CANCELLED` | Camp cancelled |

### 9.3 ChatAssignType

Chat conversation assignment action.

| Value | Description |
|-------|-------------|
| `ASSIGN` | Initial assignment to a user |
| `DELEGATE` | Delegate to another user |
| `REASSIGN` | Reassign from one user to another |

### 9.4 CustomChatMessageType

Event types for real-time chat processing. 8 values used in the native plugin layer.

| Value | Description |
|-------|-------------|
| `TOPIC_UPDATED` | Thread topic was updated |
| `CHAT_MESSAGE_RECEIVED` | New message received in thread |
| `CHAT_MESSAGE_EDITED` | Existing message was edited |
| `CHAT_MESSAGE_DELETED` | Message was deleted |
| `CHAT_THREAD_CREATED` | New chat thread was created |
| `CHAT_THREAD_DELETED` | Chat thread was deleted |
| `PARTICIPANTS_ADDED` | Participants added to thread |
| `PARTICIPANTS_REMOVED` | Participants removed from thread |

### 9.5 AuthorizationStatus

Authorization request lifecycle.

| Value | Description |
|-------|-------------|
| `PENDING` | Authorization pending review |
| `APPROVED` | Authorization approved |
| `REJECTED` | Authorization rejected |
| `EXPIRED` | Authorization expired |
| `CANCELLED` | Authorization cancelled |

---

## Model Relationships

```
PatientModel ──┬── CampPatientsModel ── CampModel
               ├── Invoice ── Receipt ── Refund
               ├── UnbilledDocument
               ├── PatientDocumentModel
               ├── ChatConversationModel ── ChatDataModel ── ChatMessageDTO
               └── Task ── TaskLineItem

CampModel ──┬── CoordinatorModel
            └── OverBookingWorkPatternModel

ChatConversationModel ── ChatAccessTokenModel
                      ── StoreChatDataModel (ObjectBox)

AddressModel ── CityModel ── DistrictModel ── StateModel ── CountryModel
                                                          ── ZipcodeModel
```

---

## Complete Model Inventory (67 Models)

| # | Model | Category |
|---|-------|----------|
| 1 | PatientModel | Patient |
| 2 | SearchPatientModel | Patient |
| 3 | AgeDTO | Patient |
| 4 | RegistrationTempIdModel | Patient |
| 5 | AadhaarResultModel | Patient |
| 6 | PatientDocumentModel | Patient |
| 7 | PatientDocumentUploadDto | Patient |
| 8 | CampModel | Camp |
| 9 | CampPatientsModel | Camp |
| 10 | OverBookingWorkPatternModel | Camp |
| 11 | ChatConversationModel | Chat |
| 12 | ChatDataModel | Chat |
| 13 | ChatAccessTokenModel | Chat |
| 14 | ChatMessageDTO | Chat |
| 15 | ChatMessageReceived | Chat |
| 16 | ChatMessageDeleted | Chat |
| 17 | ChatParticipantsModel | Chat |
| 18 | ChatThreadDeletedModel | Chat |
| 19 | StoreChatDataModel | Chat |
| 20 | ChatMessageSendDto | Chat |
| 21 | ChatSendMetadata | Chat |
| 22 | ChatAttachments | Chat |
| 23 | ConsultantModel | Staff |
| 24 | CoordinatorModel | Staff |
| 25 | FcmUserInfoModel | System |
| 26 | Invoice | Billing |
| 27 | Receipt | Billing |
| 28 | Refund | Billing |
| 29 | UnbilledDocument | Billing |
| 30 | Task | Workflow |
| 31 | TaskLineItem | Workflow |
| 32 | AddressModel | Geography |
| 33 | CityModel | Geography |
| 34 | StateModel | Geography |
| 35 | DistrictModel | Geography |
| 36 | CountryModel | Geography |
| 37 | ZipcodeModel | Geography |
| 38 | AppRemoteConfigModel | Config |
| 39 | ErrorResponseModel | System |
| 40 | PatientType | Enum |
| 41 | CampStatus | Enum |
| 42 | ChatAssignType | Enum |
| 43 | CustomChatMessageType | Enum |
| 44 | AuthorizationStatus | Enum |
| 45 | TaskFilter | Workflow |
| 46 | TaskListModel | Workflow |
| 47 | TaskDetailModel | Workflow |
| 48 | LoginRequestModel | Auth |
| 49 | LoginResponseModel | Auth |
| 50 | TokenRefreshModel | Auth |
| 51 | UserModel | Auth |
| 52 | UserRoleModel | Auth |
| 53 | OrganizationModel | MDM |
| 54 | UnitModel | MDM |
| 55 | DepartmentModel | MDM |
| 56 | DomainConfigModel | Config |
| 57 | MedicationRequestModel | Billing |
| 58 | AuthorizationModel | Billing |
| 59 | HighValueModel | Billing |
| 60 | LchmModel | Billing |
| 61 | AppointmentModel | Scheduling |
| 62 | ResourceCalendarModel | Scheduling |
| 63 | NotificationModel | System |
| 64 | ChatHistoryModel | Chat |
| 65 | InvoiceDiscountModel | Billing |
| 66 | RetrospectInvoiceModel | Billing |
| 67 | ReversalInvoiceModel | Billing |

---

## Additional Models Found in Binary

Models with `fromJson` confirmed in the compiled binary (`libapp.so` string table):

| # | Model | Notes |
|---|-------|-------|
| 1 | `Patient` | Distinct from `PatientModel`; fields: `id`; toString pattern: `{id: ...}` |
| 2 | `OutreachCamp` / `OutreachCamps` (wrapper) | `fromJson` confirmed |
| 3 | `Comment` | `fromJson` confirmed; used with `/com/api/_search/comments` |
| 4 | `HighValue` | Actual binary name (not `HighValueModel`); `fromJson` confirmed |
| 5 | `HighValueItem` | Sub-model of `HighValue` |
| 6 | `Lchm` | Actual binary name (not `LchmModel`); `fromJson` confirmed |
| 7 | `LchmItem` | Sub-model of `Lchm` |
| 8 | `TeamMember` | `fromJson` confirmed |
| 9 | `AssignedBy` | `fromJson` confirmed |
| 10 | `Payload` | `fromJson` confirmed |
| 11 | `Content` | `fromJson` confirmed |
| 12 | `Metadata` | `fromJson` confirmed (note: in Java `ChatMessageDTO`, metadata is `Object` type, not `Map<String, String>`) |
| 13 | `Resource` | `fromJson` confirmed |
| 14 | `UserAccount` | `fromJson` confirmed; has toString with `{id:...}` |
| 15 | `PatientChat` | Found at `repos/model/patient_chat_model.dart` |
| 16 | `AddressDTO` | Distinct from `AddressModel` |
| 17 | `FAQCategory` | Found at `repos/model/faq_category.dart` |
| 18 | `TempNumberRequestModel` | Found at `repos/model/temp_number_request_model.dart` |
| 19 | `PatientRegistrationRequestModel` | Found at `repos/model/patient_registration_request_model.dart` |
| 20 | `UpdateCoordinatorRequest` | Found at `repos/model/update_coordinator_request.dart` |
| 21 | `BaseRequest` | HTTP layer base class |
| 22 | `BaseResponse` | HTTP layer base class |
| 23 | `BaseResponseWithUrl` | HTTP layer base class |

## Additional Enums

Enums confirmed in binary but missing from section 9:

### ChatContentType

| Value | Description |
|-------|-------------|
| `IMAGE` | Image attachment |
| `ATTACHMENT` | Generic file attachment |
| `VOICE_RECORD` | Voice recording |
| `TEXT` | Plain text message |

### BillingDocType

| Value | Description |
|-------|-------------|
| `PRE_BILLING` | Pre-billing document |
| `UNBILL` | Unbilled document |
| `UNBILLED_INVOICE` | Unbilled invoice |
| `INVOICE` | Standard invoice |
| `RECEIPT` | Payment receipt |
| `REFUND` | Refund document |
| `INVOICE_AUTHORIZATION` | Invoice with authorization |
| `CANCELLED_RECEIPT` | Cancelled receipt |

### RegistrationSource

| Value | Description |
|-------|-------------|
| `WALK_IN` | Walk-in patient registration |
| `OUTREACH` | Outreach camp registration |
| `DIRECT` | Direct registration |

### FlavorConfig

| Value | Description |
|-------|-------------|
| `AHAM_DEV` | Development environment |
| `AHAM_SQA` | Software QA environment |
| `AHAM_UAT` | User acceptance testing environment |
| `AHAM_PROD` | Production environment |

---

*End of Data Dictionary*
