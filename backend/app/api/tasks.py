from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from ..models.base import Task, TaskCreateRequest, TaskUpdateRequest
from ..database.dynamodb import db_service
from ..auth.auth import get_current_user, require_any_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.post("/", response_model=Task)
async def create_task(
    task_request: TaskCreateRequest,
    current_user: Dict[str, Any] = Depends(require_any_role(['doctor', 'nurse', 'admin']))
):
    """Create a new task"""
    try:
        # Convert request to dict and create task
        task_data = task_request.dict()
        
        # Convert datetime to ISO string for DynamoDB
        if isinstance(task_data.get('due'), datetime):
            task_data['due'] = task_data['due'].isoformat() + 'Z'
        
        created_task = await db_service.create_task(task_data)
        
        return Task(**created_task)
        
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create task"
        )


@router.get("/", response_model=List[Task])
async def list_tasks(
    assignee_id: Optional[str] = Query(None, description="Filter by assignee"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    type_filter: Optional[str] = Query(None, alias="type", description="Filter by type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    patient_id: Optional[str] = Query(None, description="Filter by patient"),
    limit: int = Query(50, description="Maximum number of tasks to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List tasks with optional filtering"""
    try:
        tasks = []
        
        if assignee_id:
            # Use GSI-1 for efficient assignee-based queries
            tasks = await db_service.list_tasks_by_assignee(assignee_id, limit)
        elif patient_id:
            # Get tasks for specific patient
            tasks = await db_service.list_tasks_by_patient(patient_id)
        else:
            # For now, get tasks by current user as assignee
            # In production, you might want a different approach for admin users
            tasks = await db_service.list_tasks_by_assignee(current_user['user_id'], limit)
        
        # Apply additional filters
        if status_filter:
            tasks = [t for t in tasks if t.get('status') == status_filter]
        
        if type_filter:
            tasks = [t for t in tasks if t.get('type') == type_filter]
        
        if priority:
            tasks = [t for t in tasks if t.get('priority') == priority]
        
        # Convert to Task models and add patient names (would be more efficient with joins in production)
        result_tasks = []
        for task in tasks:
            task_dict = dict(task)
            
            # Get patient name for display
            if task_dict.get('patient_id'):
                patient = await db_service.get_patient(task_dict['patient_id'])
                if patient:
                    task_dict['patient_name'] = patient.get('name')
            
            result_tasks.append(Task(**task_dict))
        
        return result_tasks
        
    except Exception as e:
        logger.error(f"Error listing tasks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list tasks"
        )


@router.get("/patient/{patient_id}", response_model=List[Task])
async def get_tasks_by_patient(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all tasks for a specific patient"""
    try:
        # Check if patient exists
        patient = await db_service.get_patient(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        tasks = await db_service.list_tasks_by_patient(patient_id)
        return [Task(**task) for task in tasks]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tasks by patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tasks"
        )


@router.get("/due-today", response_model=List[Dict[str, Any]])
async def get_tasks_due_today(
    assignee_id: Optional[str] = Query(None, description="Filter by assignee"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get tasks due today"""
    try:
        # Use current user if no assignee specified
        target_assignee = assignee_id or current_user['user_id']
        
        # Get tasks for assignee
        tasks = await db_service.list_tasks_by_assignee(target_assignee, 100)
        
        # Filter for tasks due today
        today = datetime.utcnow().date()
        due_today_tasks = []
        
        for task in tasks:
            try:
                # Parse due date
                due_date_str = task.get('due', '')
                if due_date_str:
                    # Handle both ISO format with and without 'Z'
                    if due_date_str.endswith('Z'):
                        due_date = datetime.fromisoformat(due_date_str[:-1])
                    else:
                        due_date = datetime.fromisoformat(due_date_str)
                    
                    # Check if due today
                    if due_date.date() == today and task.get('status') != 'done':
                        # Get patient name
                        patient = await db_service.get_patient(task['patient_id'])
                        task_dict = dict(task)
                        task_dict['patient_name'] = patient.get('name', 'Unknown') if patient else 'Unknown'
                        due_today_tasks.append(task_dict)
            except (ValueError, TypeError) as e:
                logger.warning(f"Error parsing due date for task {task.get('task_id')}: {e}")
                continue
        
        # Sort by due time
        due_today_tasks.sort(key=lambda x: x.get('due', ''))
        
        return due_today_tasks
        
    except Exception as e:
        logger.error(f"Error getting tasks due today: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get tasks due today"
        )


@router.get("/completed-today", response_model=List[Dict[str, Any]])
async def get_completed_tasks_today(
    assignee_id: Optional[str] = Query(None, description="Filter by assignee"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get tasks completed today"""
    try:
        # Use current user if no assignee specified
        target_assignee = assignee_id or current_user['user_id']
        
        # Get tasks for assignee
        tasks = await db_service.list_tasks_by_assignee(target_assignee, 100)
        
        # Filter for tasks completed today
        today = datetime.utcnow().date()
        completed_today_tasks = []
        
        for task in tasks:
            if task.get('status') == 'done':
                try:
                    # Check if updated today (completion time)
                    updated_date_str = task.get('updated_at', '')
                    if updated_date_str:
                        if updated_date_str.endswith('Z'):
                            updated_date = datetime.fromisoformat(updated_date_str[:-1])
                        else:
                            updated_date = datetime.fromisoformat(updated_date_str)
                        
                        if updated_date.date() == today:
                            # Get patient name
                            patient = await db_service.get_patient(task['patient_id'])
                            task_dict = dict(task)
                            task_dict['patient_name'] = patient.get('name', 'Unknown') if patient else 'Unknown'
                            task_dict['completed_time'] = updated_date_str
                            completed_today_tasks.append(task_dict)
                except (ValueError, TypeError) as e:
                    logger.warning(f"Error parsing updated date for task {task.get('task_id')}: {e}")
                    continue
        
        return completed_today_tasks
        
    except Exception as e:
        logger.error(f"Error getting completed tasks today: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get completed tasks"
        )


@router.get("/urgent-alerts", response_model=List[Dict[str, Any]])
async def get_urgent_alerts(
    assignee_id: Optional[str] = Query(None, description="Filter by assignee"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get urgent alerts (tasks due within 10 minutes or marked urgent)"""
    try:
        # Use current user if no assignee specified
        target_assignee = assignee_id or current_user['user_id']
        
        # Get tasks for assignee
        tasks = await db_service.list_tasks_by_assignee(target_assignee, 100)
        
        # Filter for urgent tasks
        now = datetime.utcnow()
        urgent_threshold = now + timedelta(minutes=10)
        urgent_tasks = []
        
        for task in tasks:
            if task.get('status') in ['open', 'in-progress']:
                is_urgent = False
                time_remaining = None
                
                # Check if marked as urgent priority
                if task.get('priority') == 'urgent':
                    is_urgent = True
                    time_remaining = 'High Priority'
                
                # Check if due within 10 minutes
                due_date_str = task.get('due', '')
                if due_date_str:
                    try:
                        if due_date_str.endswith('Z'):
                            due_date = datetime.fromisoformat(due_date_str[:-1])
                        else:
                            due_date = datetime.fromisoformat(due_date_str)
                        
                        if due_date <= urgent_threshold:
                            is_urgent = True
                            # Calculate time remaining
                            time_diff = due_date - now
                            if time_diff.total_seconds() <= 0:
                                time_remaining = 'Overdue'
                            else:
                                minutes = int(time_diff.total_seconds() / 60)
                                time_remaining = f'{minutes} min'
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Error parsing due date for task {task.get('task_id')}: {e}")
                
                if is_urgent:
                    # Get patient name and room
                    patient = await db_service.get_patient(task['patient_id'])
                    task_dict = dict(task)
                    task_dict['patient_name'] = patient.get('name', 'Unknown') if patient else 'Unknown'
                    task_dict['room'] = 'Room 302'  # Would be stored in patient data
                    task_dict['time_remaining'] = time_remaining or 'Check due date'
                    urgent_tasks.append(task_dict)
        
        # Sort by due time
        urgent_tasks.sort(key=lambda x: x.get('due', ''))
        
        return urgent_tasks
        
    except Exception as e:
        logger.error(f"Error getting urgent alerts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get urgent alerts"
        )


@router.put("/{task_id}", response_model=Task)
async def update_task(
    task_id: str,
    task_update: TaskUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update a task"""
    try:
        # Find the task - we need to scan or have the patient_id and SK
        # For now, we'll implement a simple approach by scanning
        # In production, you might want to store task_id -> (patient_id, SK) mapping
        
        # This is inefficient - in production you'd want a GSI or different approach
        # For now, let's assume we can find the task
        
        # Get updates
        updates = {k: v for k, v in task_update.dict().items() if v is not None}
        
        if not updates:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No updates provided"
            )
        
        # Convert datetime to ISO string if present
        if 'due' in updates and isinstance(updates['due'], datetime):
            updates['due'] = updates['due'].isoformat() + 'Z'
        
        # For demo purposes, we'll need to implement a way to find tasks by task_id
        # This would be more efficient with a GSI in production
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Task update by task_id requires additional implementation for task lookup"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task"
        )


@router.put("/{task_id}/status")
async def update_task_status(
    task_id: str,
    status_update: Dict[str, str],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update task status"""
    try:
        new_status = status_update.get('status')
        if not new_status or new_status not in ['open', 'in-progress', 'done', 'cancelled']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid status. Must be one of: open, in-progress, done, cancelled"
            )
        
        # Same issue as update_task - need efficient task lookup
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Task status update by task_id requires additional implementation for task lookup"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update task status"
        )


@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: Dict[str, Any] = Depends(require_any_role(['doctor', 'nurse', 'admin']))
):
    """Delete a task"""
    try:
        # Same issue - need efficient task lookup by task_id
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Task deletion by task_id requires additional implementation for task lookup"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete task"
        )