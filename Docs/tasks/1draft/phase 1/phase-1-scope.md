I would actually move **recurring tasks into Phase 1**.

Not because of AI.

Because recurring work is one of the core workflows of a junior doctor.

Examples:

* Daily wound photo
* Daily CBC follow-up
* Daily drain output update
* Vitals every 6 hours
* Follow culture report until received
* Daily dressing review
* Daily post-op review
* Follow biopsy report every day until available

Without recurrence, juniors will keep recreating the same task manually every day.

---

# Revised Phase 1

## Add Recurrence Definition

New item:

```json
{
  "PK":"PATIENT#01JABC",
  "SK":"TASKRECURRENCE#rec_123",

  "taskType":"photo_upload",
  "title":"Daily wound photo",

  "frequency":"daily",

  "timeOfDay":"08:00",

  "assigneeId":"jr_123",

  "active":true
}
```

---

## API

Create recurring task

```http
POST /patients/:id/tasks/recurrences
```

Example:

```json
{
  "title":"Daily wound photo",
  "type":"photo_upload",
  "frequency":"daily",
  "timeOfDay":"08:00",
  "assigneeId":"jr_123"
}
```

---

Get recurrences

```http
GET /patients/:id/tasks/recurrences
```

---

Pause recurrence

```http
PATCH /patients/:id/tasks/recurrences/:recurrenceId
```

```json
{
  "active":false
}
```

---

Delete recurrence

```http
DELETE /patients/:id/tasks/recurrences/:recurrenceId
```

---

# Occurrences

The actual work item should still be a normal task.

Every day:

```text
TASKRECURRENCE
    ↓
generate
    ↓
TASK
```

Example:

```text
Daily wound photo
```

creates

```text
TASK#task_001
occurrence_date=2026-06-10
```

Tomorrow:

```text
TASK#task_002
occurrence_date=2026-06-11
```

---

# User Experience

Doctor tells AI:

> Add wound photo as recurring daily task.

AI creates:

```json
{
  "frequency":"daily"
}
```

recurrence.

Tomorrow's task appears automatically.

---

# Minimal Scheduler

For Phase 1 we don't need EventBridge.

Just add:

```http
POST /tasks/recurrences/run?date=2026-06-10
```

The UI or cron can call it.

Later:

* EventBridge
* Lambda scheduler
* Reminder engine

can automate it.

---

# Updated Phase 1 Scope

### Keep

✅ Directory APIs

✅ Task CRUD

✅ Task Updates

✅ Task History

✅ TASKSYNC

✅ Timeline

✅ Versioning

✅ Idempotency

✅ Basic Agent Context

### Add

✅ Recurrence Definitions

✅ Recurrence Runner

✅ Occurrence Generation

### Still Skip

❌ Duty Board

❌ Reminder Engine

❌ Proposal System

❌ Verification Workflow

❌ Alert Engine

❌ WhatsApp Copy

❌ Advanced Projections

This is probably the right cut because **recurring tasks are part of the core clinical workflow**, whereas reminders, proposals, and duty projections are productivity layers that can be added later.
