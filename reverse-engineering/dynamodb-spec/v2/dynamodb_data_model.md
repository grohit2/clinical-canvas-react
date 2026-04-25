

## Cost Report

> **Disclaimer:** This estimate covers **read/write request costs** and **storage costs** only,
> based on DynamoDB Standard table class on-demand pricing for the **US East (N. Virginia) /
> us-east-1** region. Prices were last verified in **January 2026**. Additional features such as
> Point-in-Time Recovery (PITR), backups, streams, and data transfer may incur additional costs.
> Actual costs may also vary based on your AWS region, pricing model (on-demand vs. provisioned),
> reserved capacity, and real-world traffic patterns. This report assumes constant RPS and average
> item sizes. For the most current pricing, refer to the
> [Amazon DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/) page.

**Total Monthly Cost: $4521.58**

| Source                  | Monthly Cost |
| ----------------------- | ------------ |
| Storage                 | $353.03      |
| Read and write requests | $4168.56     |

### Storage Costs

**Monthly Cost:** $353.03

| Resource          | Type  | Storage (GB) | Monthly Cost |
| ----------------- | ----- | ------------ | ------------ |
| UserStaffTable    | Table | 0.02         | $0.01        |
| GSI1              | GSI   | 0.01         | $0.00        |
| GSI2              | GSI   | 0.01         | $0.00        |
| GSI3              | GSI   | 0.00         | $0.00        |
| PatientTable      | Table | 0.98         | $0.24        |
| GSI1              | GSI   | 0.98         | $0.24        |
| GSI2              | GSI   | 0.98         | $0.24        |
| GSI3              | GSI   | 0.14         | $0.03        |
| EncounterTable    | Table | 5.77         | $1.44        |
| GSI1              | GSI   | 5.77         | $1.44        |
| GSI2              | GSI   | 5.77         | $1.44        |
| GSI3              | GSI   | 5.77         | $1.44        |
| ClinicalTable     | Table | 984.41       | $246.10      |
| GSI1              | GSI   | 332.48       | $83.12       |
| GSI2              | GSI   | 0.20         | $0.05        |
| GSI3              | GSI   | 1.40         | $0.35        |
| MessageTable      | Table | 30.73        | $7.68        |
| GSI1              | GSI   | 0.06         | $0.01        |
| GSI2              | GSI   | 0.06         | $0.01        |
| GSI3              | GSI   | 0.03         | $0.01        |
| TaskWorkflowTable | Table | 3.91         | $0.98        |
| GSI1              | GSI   | 0.98         | $0.24        |
| GSI2              | GSI   | 0.98         | $0.24        |
| BillingTable      | Table | 14.44        | $3.61        |
| GSI1              | GSI   | 14.44        | $3.61        |
| GSI2              | GSI   | 1.12         | $0.28        |
| CampOutreachTable | Table | 0.30         | $0.07        |
| GSI1              | GSI   | 0.01         | $0.00        |
| GSI2              | GSI   | 0.17         | $0.04        |
| PlatformTable     | Table | 0.20         | $0.05        |

### Read and Write Request Costs

**Monthly Cost:** $4168.56

| Resource          | Type  | Monthly Cost |
| ----------------- | ----- | ------------ |
| UserStaffTable    | Table | $16.47       |
| GSI1              | GSI   | $0.00        |
| GSI2              | GSI   | $26.35       |
| GSI3              | GSI   | $0.00        |
| PatientTable      | Table | $65.88       |
| GSI1              | GSI   | $49.41       |
| GSI2              | GSI   | $32.94       |
| GSI3              | GSI   | $16.47       |
| EncounterTable    | Table | $115.29      |
| GSI1              | GSI   | $49.41       |
| GSI2              | GSI   | $230.58      |
| GSI3              | GSI   | $415.04      |
| ClinicalTable     | Table | $823.50      |
| GSI1              | GSI   | $1070.55     |
| GSI2              | GSI   | $65.88       |
| GSI3              | GSI   | $82.35       |
| MessageTable      | Table | $477.63      |
| GSI1              | GSI   | $82.35       |
| GSI2              | GSI   | $82.35       |
| GSI3              | GSI   | $0.00        |
| TaskWorkflowTable | Table | $16.47       |
| GSI1              | GSI   | $39.53       |
| GSI2              | GSI   | $123.52      |
| BillingTable      | Table | $88.94       |
| GSI1              | GSI   | $49.41       |
| GSI2              | GSI   | $16.47       |
| CampOutreachTable | Table | $32.94       |
| GSI1              | GSI   | $0.00        |
| GSI2              | GSI   | $0.00        |
| PlatformTable     | Table | $98.82       |

#### UserStaffTable Table

**Monthly Cost:** $16.47

| Pattern  | Operation | RPS  | RRU / WRU | Monthly Cost |
| -------- | --------- | ---- | --------- | ------------ |
| get-user | GetItem   | 50.0 | 1.00      | $16.47       |

#### UserStaffTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### UserStaffTable Table / GSI2 GSI

**Monthly Cost:** $26.35

| Pattern       | Operation | RPS  | RRU / WRU | Monthly Cost |
| ------------- | --------- | ---- | --------- | ------------ |
| users-by-unit | Query     | 20.0 | 4.00      | $26.35       |

#### UserStaffTable Table / GSI3 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### PatientTable Table

**Monthly Cost:** $65.88

| Pattern        | Operation | RPS   | RRU / WRU | Monthly Cost |
| -------------- | --------- | ----- | --------- | ------------ |
| get-patient    | GetItem   | 100.0 | 1.00      | $32.94       |
| create-patient | PutItem   | 10.0  | 2.00      | $32.94       |

#### PatientTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern         | Operation | RPS   | RRU / WRU | Monthly Cost |
| --------------- | --------- | ----- | --------- | ------------ |
| patient-by-mrn  | Query     | 100.0 | 0.50      | $16.47       |
| create-patient¹ | PutItem   | 10.0  | 2.00      | $32.94       |

#### PatientTable Table / GSI2 GSI

**Monthly Cost:** $32.94

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-patient¹ | PutItem   | 10.0 | 2.00      | $32.94       |

#### PatientTable Table / GSI3 GSI

**Monthly Cost:** $16.47

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-patient¹ | PutItem   | 10.0 | 1.00      | $16.47       |

#### EncounterTable Table

**Monthly Cost:** $115.29

| Pattern          | Operation  | RPS   | RRU / WRU | Monthly Cost |
| ---------------- | ---------- | ----- | --------- | ------------ |
| get-encounter    | GetItem    | 200.0 | 1.00      | $65.88       |
| update-encounter | UpdateItem | 10.0  | 3.00      | $49.41       |

#### EncounterTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern           | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ---- | --------- | ------------ |
| update-encounter¹ | UpdateItem | 10.0 | 3.00      | $49.41       |

#### EncounterTable Table / GSI2 GSI

**Monthly Cost:** $230.58

| Pattern           | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ---- | --------- | ------------ |
| doctor-patients   | Query      | 50.0 | 11.00     | $181.17      |
| update-encounter¹ | UpdateItem | 10.0 | 3.00      | $49.41       |

#### EncounterTable Table / GSI3 GSI

**Monthly Cost:** $415.04

| Pattern           | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ---- | --------- | ------------ |
| active-by-unit    | Query      | 30.0 | 37.00     | $365.63      |
| update-encounter¹ | UpdateItem | 10.0 | 3.00      | $49.41       |

#### ClinicalTable Table

**Monthly Cost:** $823.50

| Pattern          | Operation | RPS   | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ----- | --------- | ------------ |
| list-meds        | Query     | 100.0 | 3.00      | $98.82       |
| create-med       | PutItem   | 50.0  | 2.00      | $164.70      |
| list-results     | Query     | 100.0 | 3.00      | $98.82       |
| store-result     | PutItem   | 50.0  | 2.00      | $164.70      |
| list-notes       | Query     | 50.0  | 6.50      | $107.05      |
| create-note      | PutItem   | 20.0  | 5.00      | $164.70      |
| record-vitals    | PutItem   | 10.0  | 1.00      | $16.47       |
| encounter-vitals | Query     | 50.0  | 0.50      | $8.23        |

#### ClinicalTable Table / GSI1 GSI

**Monthly Cost:** $1070.55

| Pattern        | Operation | RPS  | RRU / WRU | Monthly Cost |
| -------------- | --------- | ---- | --------- | ------------ |
| create-med¹    | PutItem   | 50.0 | 5.00      | $411.75      |
| store-result¹  | PutItem   | 50.0 | 5.00      | $411.75      |
| create-note¹   | PutItem   | 20.0 | 5.00      | $164.70      |
| record-vitals¹ | PutItem   | 10.0 | 5.00      | $82.35       |

#### ClinicalTable Table / GSI2 GSI

**Monthly Cost:** $65.88

| Pattern      | Operation | RPS  | RRU / WRU | Monthly Cost |
| ------------ | --------- | ---- | --------- | ------------ |
| create-note¹ | PutItem   | 20.0 | 2.00      | $65.88       |

#### ClinicalTable Table / GSI3 GSI

**Monthly Cost:** $82.35

| Pattern     | Operation | RPS  | RRU / WRU | Monthly Cost |
| ----------- | --------- | ---- | --------- | ------------ |
| create-med¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### MessageTable Table

**Monthly Cost:** $477.63

| Pattern          | Operation | RPS   | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ----- | --------- | ------------ |
| patient-messages | Query     | 100.0 | 6.50      | $214.11      |
| send-message     | PutItem   | 50.0  | 1.00      | $82.35       |
| chat-messages    | Query     | 100.0 | 3.00      | $98.82       |
| send-chat        | PutItem   | 50.0  | 1.00      | $82.35       |

#### MessageTable Table / GSI1 GSI

**Monthly Cost:** $82.35

| Pattern    | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------- | --------- | ---- | --------- | ------------ |
| send-chat¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### MessageTable Table / GSI2 GSI

**Monthly Cost:** $82.35

| Pattern    | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------- | --------- | ---- | --------- | ------------ |
| send-chat¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### MessageTable Table / GSI3 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### TaskWorkflowTable Table

**Monthly Cost:** $16.47

| Pattern  | Operation | RPS  | RRU / WRU | Monthly Cost |
| -------- | --------- | ---- | --------- | ------------ |
| get-task | GetItem   | 50.0 | 1.00      | $16.47       |

#### TaskWorkflowTable Table / GSI1 GSI

**Monthly Cost:** $39.53

| Pattern  | Operation | RPS  | RRU / WRU | Monthly Cost |
| -------- | --------- | ---- | --------- | ------------ |
| my-tasks | Query     | 30.0 | 4.00      | $39.53       |

#### TaskWorkflowTable Table / GSI2 GSI

**Monthly Cost:** $123.52

| Pattern    | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------- | --------- | ---- | --------- | ------------ |
| unit-tasks | Query     | 30.0 | 12.50     | $123.52      |

#### BillingTable Table

**Monthly Cost:** $88.94

| Pattern          | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ---- | --------- | ------------ |
| patient-invoices | Query     | 30.0 | 4.00      | $39.53       |
| create-invoice   | PutItem   | 10.0 | 3.00      | $49.41       |

#### BillingTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-invoice¹ | PutItem   | 10.0 | 3.00      | $49.41       |

#### BillingTable Table / GSI2 GSI

**Monthly Cost:** $16.47

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-invoice¹ | PutItem   | 10.0 | 1.00      | $16.47       |

#### CampOutreachTable Table

**Monthly Cost:** $32.94

| Pattern       | Operation | RPS  | RRU / WRU | Monthly Cost |
| ------------- | --------- | ---- | --------- | ------------ |
| camp-patients | Query     | 20.0 | 5.00      | $32.94       |

#### CampOutreachTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### CampOutreachTable Table / GSI2 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### PlatformTable Table

**Monthly Cost:** $98.82

| Pattern    | Operation | RPS   | RRU / WRU | Monthly Cost |
| ---------- | --------- | ----- | --------- | ------------ |
| get-config | GetItem   | 100.0 | 0.50      | $16.47       |
| audit      | PutItem   | 50.0  | 1.00      | $82.35       |

¹ **GSI additional writes** - When a table write changes attributes projected into a GSI,
DynamoDB performs an additional write to that index, incurring extra WRUs. If the GSI partition
key value changes, the cost doubles (delete + insert) - this estimate assumes single writes only.
[Learn more](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html#GSI.ThroughputConsiderations.Writes)

<!-- end-cost-report -->