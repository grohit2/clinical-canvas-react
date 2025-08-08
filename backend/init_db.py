import asyncio
import json
from datetime import datetime, timedelta
from app.database.dynamodb import db_service
import logging

logger = logging.getLogger(__name__)


async def create_sample_users():
    """Create sample users for testing"""
    users = [
        {
            "user_id": "doc-001",
            "name": "Dr. Sarah Wilson",
            "role": "doctor",
            "email": "sarah.wilson@hospital.com",
            "avatar": "https://avatars.dicebear.com/api/personas/sarah.svg",
            "contact_info": {"phone": "+1-555-0101", "pager": "101"},
            "permissions": ["prescribe", "approve", "discharge"]
        },
        {
            "user_id": "nurse-001",
            "name": "Emily Johnson",
            "role": "nurse",
            "email": "emily.johnson@hospital.com",
            "avatar": "https://avatars.dicebear.com/api/personas/emily.svg",
            "contact_info": {"phone": "+1-555-0102"},
            "permissions": ["assess", "medicate"]
        },
        {
            "user_id": "lab-001",
            "name": "Michael Chen",
            "role": "technician",
            "email": "michael.chen@hospital.com",
            "avatar": "https://avatars.dicebear.com/api/personas/michael.svg",
            "contact_info": {"phone": "+1-555-0103"},
            "permissions": ["lab_results"]
        }
    ]
    
    for user_data in users:
        try:
            await db_service.create_user(user_data)
            logger.info(f"Created user: {user_data['name']}")
        except Exception as e:
            logger.error(f"Error creating user {user_data['name']}: {e}")


async def create_sample_patients():
    """Create sample patients for testing"""
    patients = [
        {
            "patient_id": "patient-001",
            "name": "Jane Doe",
            "pathway": "surgical",
            "current_state": "post-op",
            "diagnosis": "Cholecystitis",
            "comorbidities": ["HTN", "DM"],
            "assigned_doctor": "Dr. Sarah Wilson"
        },
        {
            "patient_id": "patient-002",
            "name": "John Smith",
            "pathway": "emergency",
            "current_state": "ICU",
            "diagnosis": "Acute MI",
            "comorbidities": ["CAD", "HTN"],
            "assigned_doctor": "Dr. Sarah Wilson"
        },
        {
            "patient_id": "patient-003",
            "name": "Maria Garcia",
            "pathway": "consultation",
            "current_state": "stable",
            "diagnosis": "Osteoarthritis",
            "comorbidities": ["Obesity"],
            "assigned_doctor": "Dr. Sarah Wilson"
        }
    ]
    
    for patient_data in patients:
        try:
            await db_service.create_patient(patient_data)
            logger.info(f"Created patient: {patient_data['name']}")
        except Exception as e:
            logger.error(f"Error creating patient {patient_data['name']}: {e}")


async def create_sample_tasks():
    """Create sample tasks for testing"""
    now = datetime.utcnow()
    tasks = [
        {
            "task_id": "task-001",
            "patient_id": "patient-001",
            "title": "Review CBC results",
            "type": "lab",
            "due": (now + timedelta(hours=2)).isoformat() + 'Z',
            "assignee_id": "doc-001",
            "priority": "high",
            "recurring": False
        },
        {
            "task_id": "task-002",
            "patient_id": "patient-002",
            "title": "Administer medication",
            "type": "medication",
            "due": (now + timedelta(minutes=30)).isoformat() + 'Z',
            "assignee_id": "nurse-001",
            "priority": "urgent",
            "recurring": True
        },
        {
            "task_id": "task-003",
            "patient_id": "patient-003",
            "title": "Pre-op assessment",
            "type": "assessment",
            "due": (now + timedelta(days=1)).isoformat() + 'Z',
            "assignee_id": "doc-001",
            "priority": "medium",
            "recurring": False
        },
        {
            "task_id": "task-004",
            "patient_id": "patient-001",
            "title": "Appendectomy",
            "type": "procedure",
            "due": (now + timedelta(hours=4)).isoformat() + 'Z',
            "assignee_id": "doc-001",
            "priority": "high",
            "recurring": False
        }
    ]
    
    for task_data in tasks:
        try:
            await db_service.create_task(task_data)
            logger.info(f"Created task: {task_data['title']}")
        except Exception as e:
            logger.error(f"Error creating task {task_data['title']}: {e}")


async def create_sample_notes():
    """Create sample notes for testing"""
    notes = [
        {
            "note_id": "note-001",
            "patient_id": "patient-001",
            "author_id": "doc-001",
            "category": "doctorNote",
            "content": "Patient recovering well from surgery. Vitals stable. Plan to discharge tomorrow."
        },
        {
            "note_id": "note-002",
            "patient_id": "patient-002",
            "author_id": "nurse-001",
            "category": "nurseNote",
            "content": "Patient alert and oriented. Pain controlled with medication. No acute distress."
        }
    ]
    
    for note_data in notes:
        try:
            await db_service.create_note(note_data)
            logger.info(f"Created note for patient: {note_data['patient_id']}")
        except Exception as e:
            logger.error(f"Error creating note: {e}")


async def initialize_database():
    """Initialize database with sample data"""
    logger.info("Starting database initialization...")
    
    try:
        # Create sample data
        await create_sample_users()
        await create_sample_patients()
        await create_sample_tasks()
        await create_sample_notes()
        
        logger.info("Database initialization completed successfully!")
        return {"status": "success", "message": "Database initialized with sample data"}
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return {"status": "error", "message": str(e)}


def handler(event, context):
    """AWS Lambda handler for database initialization"""
    try:
        # Run the async initialization
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(initialize_database())
        loop.close()
        
        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
    except Exception as e:
        logger.error(f"Lambda handler error: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"status": "error", "message": str(e)})
        }


if __name__ == "__main__":
    # For local testing
    import os
    os.environ["DYNAMODB_TABLE_NAME"] = "clinical-canvas"
    os.environ["AWS_REGION"] = "us-east-1"
    
    result = asyncio.run(initialize_database())
    print(json.dumps(result, indent=2))