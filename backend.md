DynamoDB item shape (single‑table)
Task item (one per task)
Partitioned with the patient; sortable by a stable task id.

ini
Copy
Edit
PK             = PATIENT#{mrn}
SK             = TASK#{task_id}

# GSI for dashboards (ONLY ONE GSI as requested)
GSI2PK         = TASK#{STATUS}#DEPT#{department}           # e.g., TASK#OPEN#DEPT#Cardiology
GSI2SK         = ASSIGNEE#{assignee_id}#RECURRING#{YES|NO}#TASK#{task_id}
Attributes

task_id, patient_id (mrn), title, type (lab|medication|procedure|assessment|discharge)

due (ISO), assignee_id

status (open|in-progress|done|cancelled)

priority (low|medium|high|urgent)

recurring (bool)

recurrence (object) → { frequency: 'daily'|'weekly'|'monthly'|'custom', until?: ISO, daysOfWeek?: string[] }

details (map)

created_at, updated_at

denorm for routing: department (so we can build GSI2PK without an extra read)

Note: I normalized the sort key to a single ASSIGNEE#... segment; your sample had ASSIGNEE twice—happy to put it back if you truly want the duplicate.

GSI Definition (create once)

Name: TaskDeptAssignee

PK: GSI2PK (String)

SK: GSI2SK (String)

2) API surface
Patient‑scoped

GET /patients/{mrn}/tasks?status=&limit= — list tasks for a patient

POST /patients/{mrn}/tasks — create task

PATCH /patients/{mrn}/tasks/{taskId} — update task (any mutable fields)

DELETE /patients/{mrn}/tasks/{taskId} — soft cancel (sets status=cancelled)

Department/doctor dashboard

GET /tasks?department=Cardiology&status=open&assigneeId=doctor-123&limit=50
Uses GSI2; if assigneeId present we begins_with(GSI2SK, ASSIGNEE#doctor-123).

Recurring EOD job (later)

GET /tasks/recurring?department=Cardiology&date=2025-07-20 (helper for your cron)
Returns active, recurring tasks for the dept; your separate Lambda can clone/advance them.

