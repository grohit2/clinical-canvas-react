from fastapi import APIRouter, HTTPException, status, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from ..models.base import KPIData, UpcomingProcedure, StageHeatMapItem
from ..database.dynamodb import db_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpi", response_model=KPIData)
async def get_kpi_data(
    doctor_id: Optional[str] = Query(None, description="Filter KPIs by doctor"),
):
    """Get KPI data for dashboard"""
    try:
        # Get total patients count
        patients = await db_service.list_patients(limit=1000)  # In production, use count operation
        total_patients = len(patients)
        
        # Filter by doctor if specified
        if doctor_id:
            patients = [p for p in patients if p.get('assigned_doctor') == doctor_id]
            total_patients = len(patients)
        
        # Get tasks for specified doctor if provided
        tasks = (
            await db_service.list_tasks_by_assignee(doctor_id, 1000)
            if doctor_id
            else []
        )
        
        # Calculate KPIs
        now = datetime.utcnow()
        today = now.date()
        
        tasks_due = 0
        urgent_alerts = 0
        completed_today = 0
        
        for task in tasks:
            task_status = task.get('status', '')
            
            # Count completed today
            if task_status == 'done':
                try:
                    updated_date_str = task.get('updated_at', '')
                    if updated_date_str:
                        if updated_date_str.endswith('Z'):
                            updated_date = datetime.fromisoformat(updated_date_str[:-1])
                        else:
                            updated_date = datetime.fromisoformat(updated_date_str)
                        
                        if updated_date.date() == today:
                            completed_today += 1
                except (ValueError, TypeError):
                    continue
            
            # Count tasks due and urgent alerts for open/in-progress tasks
            elif task_status in ['open', 'in-progress']:
                due_date_str = task.get('due', '')
                if due_date_str:
                    try:
                        if due_date_str.endswith('Z'):
                            due_date = datetime.fromisoformat(due_date_str[:-1])
                        else:
                            due_date = datetime.fromisoformat(due_date_str)
                        
                        # Tasks due within next 24 hours
                        if due_date.date() <= (today + timedelta(days=1)):
                            tasks_due += 1
                        
                        # Urgent alerts (due within 10 minutes or marked urgent)
                        if (due_date <= now + timedelta(minutes=10) or 
                            task.get('priority') == 'urgent'):
                            urgent_alerts += 1
                    except (ValueError, TypeError):
                        continue
        
        return KPIData(
            total_patients=total_patients,
            tasks_due=tasks_due,
            urgent_alerts=urgent_alerts,
            completed_today=completed_today
        )
        
    except Exception as e:
        logger.error(f"Error getting KPI data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get KPI data"
        )


@router.get("/procedures/upcoming", response_model=List[UpcomingProcedure])
async def get_upcoming_procedures(
    limit: int = Query(10, description="Maximum number of procedures to return"),
    doctor_id: Optional[str] = Query(None, description="Filter by surgeon"),
):
    """Get upcoming procedures"""
    try:
        # Get procedure tasks from all assignees or specific doctor
        if doctor_id:
            tasks = await db_service.list_tasks_by_assignee(doctor_id, 100)
        else:
            tasks = []
        
        # Filter for procedure tasks that are upcoming
        now = datetime.utcnow()
        upcoming_procedures = []
        
        for task in tasks:
            if (task.get('type') == 'procedure' and 
                task.get('status') in ['open', 'in-progress']):
                
                due_date_str = task.get('due', '')
                if due_date_str:
                    try:
                        if due_date_str.endswith('Z'):
                            due_date = datetime.fromisoformat(due_date_str[:-1])
                        else:
                            due_date = datetime.fromisoformat(due_date_str)
                        
                        # Only include future procedures
                        if due_date > now:
                            # Get patient name
                            patient = await db_service.get_patient(task['patient_id'])
                            patient_name = patient.get('name', 'Unknown') if patient else 'Unknown'
                            
                            # Get surgeon name (assignee)
                            surgeon_user = await db_service.get_user(task['assignee_id'])
                            surgeon_name = surgeon_user.get('name', 'Unknown') if surgeon_user else 'Unknown'
                            
                            procedure = UpcomingProcedure(
                                id=task['task_id'],
                                patient_id=task['patient_id'],
                                patient_name=patient_name,
                                procedure=task.get('title', 'Unknown Procedure'),
                                time=due_date.strftime('%H:%M'),
                                surgeon=surgeon_name
                            )
                            upcoming_procedures.append(procedure)
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Error parsing due date for procedure {task.get('task_id')}: {e}")
                        continue
        
        # Sort by due time and limit results
        upcoming_procedures.sort(key=lambda x: x.time)
        return upcoming_procedures[:limit]
        
    except Exception as e:
        logger.error(f"Error getting upcoming procedures: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get upcoming procedures"
        )


@router.get("/stage-heatmap", response_model=List[StageHeatMapItem])
async def get_stage_heatmap(
    pathway: Optional[str] = Query(None, description="Filter by pathway"),
):
    """Get stage heat map data showing patient distribution across care states"""
    try:
        # Get patients, optionally filtered by pathway
        patients = await db_service.list_patients(pathway=pathway, limit=1000)
        
        # Count patients by current state
        state_counts = {}
        for patient in patients:
            current_state = patient.get('current_state', 'unknown')
            state_counts[current_state] = state_counts.get(current_state, 0) + 1
        
        # Map states to display names and variants
        state_mapping = {
            'pre-op': {'display': 'Pre-Op', 'variant': 'caution'},
            'surgery': {'display': 'Surgery', 'variant': 'urgent'},
            'post-op': {'display': 'Post-Op', 'variant': 'stable'},
            'ICU': {'display': 'ICU', 'variant': 'urgent'},
            'recovery': {'display': 'Recovery', 'variant': 'default'},
            'stable': {'display': 'Stable', 'variant': 'stable'},
            'discharge': {'display': 'Discharge', 'variant': 'default'},
            'unknown': {'display': 'Unknown', 'variant': 'default'}
        }
        
        # Create heat map items
        heatmap_items = []
        for state, count in state_counts.items():
            mapping = state_mapping.get(state, {'display': state.title(), 'variant': 'default'})
            
            heatmap_items.append(StageHeatMapItem(
                stage=mapping['display'],
                count=count,
                variant=mapping['variant']
            ))
        
        # Sort by count (descending) for better visualization
        heatmap_items.sort(key=lambda x: x.count, reverse=True)
        
        return heatmap_items
        
    except Exception as e:
        logger.error(f"Error getting stage heatmap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get stage heatmap"
        )