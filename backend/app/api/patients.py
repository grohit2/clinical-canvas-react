from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Dict, Any, Optional
import logging

from ..models.base import (
    PatientMeta, PatientCreateRequest, PatientUpdateRequest,
    TimelineEntry, Note, NoteCreateRequest
)
from ..database.dynamodb import db_service
from ..auth.auth import get_current_user, require_any_role

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("/", response_model=PatientMeta)
async def create_patient(
    patient_request: PatientCreateRequest,
    current_user: Dict[str, Any] = Depends(require_any_role(['doctor', 'nurse', 'admin']))
):
    """Create a new patient"""
    try:
        # Convert request to dict and create patient
        patient_data = patient_request.dict()
        created_patient = await db_service.create_patient(patient_data)
        
        # Convert to PatientMeta model
        return PatientMeta(**created_patient)
        
    except Exception as e:
        logger.error(f"Error creating patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create patient"
        )


@router.get("/", response_model=List[PatientMeta])
async def list_patients(
    pathway: Optional[str] = Query(None, description="Filter by pathway"),
    state: Optional[str] = Query(None, description="Filter by current state"),
    doctor_id: Optional[str] = Query(None, description="Filter by assigned doctor"),
    urgent: Optional[bool] = Query(None, description="Filter urgent patients"),
    search: Optional[str] = Query(None, description="Search by name or diagnosis"),
    limit: int = Query(50, description="Maximum number of patients to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List patients with optional filtering"""
    try:
        # Get patients from database
        patients = await db_service.list_patients(
            pathway=pathway,
            state=state,
            limit=limit
        )
        
        # Apply additional filters (these would be more efficient with GSIs in production)
        if doctor_id:
            patients = [p for p in patients if p.get('assigned_doctor') == doctor_id]
        
        if search:
            search_lower = search.lower()
            patients = [
                p for p in patients 
                if search_lower in p.get('name', '').lower() or 
                   search_lower in p.get('diagnosis', '').lower()
            ]
        
        # Convert to PatientMeta models
        return [PatientMeta(**patient) for patient in patients]
        
    except Exception as e:
        logger.error(f"Error listing patients: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list patients"
        )


@router.get("/{patient_id}", response_model=PatientMeta)
async def get_patient(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get patient details"""
    try:
        patient = await db_service.get_patient(patient_id)
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        return PatientMeta(**patient)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient"
        )


@router.put("/{patient_id}", response_model=PatientMeta)
async def update_patient(
    patient_id: str,
    patient_update: PatientUpdateRequest,
    current_user: Dict[str, Any] = Depends(require_any_role(['doctor', 'nurse', 'admin']))
):
    """Update patient information"""
    try:
        # Check if patient exists
        existing_patient = await db_service.get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Update patient with non-None values
        updates = {k: v for k, v in patient_update.dict().items() if v is not None}
        
        if not updates:
            return PatientMeta(**existing_patient)
        
        updated_patient = await db_service.update_patient(patient_id, updates)
        return PatientMeta(**updated_patient)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update patient"
        )


@router.delete("/{patient_id}")
async def delete_patient(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(require_any_role(['doctor', 'admin']))
):
    """Delete patient and all related data"""
    try:
        # Check if patient exists
        existing_patient = await db_service.get_patient(patient_id)
        if not existing_patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        await db_service.delete_patient(patient_id)
        return {"message": "Patient deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting patient: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete patient"
        )


@router.get("/{patient_id}/qr")
async def get_patient_qr_data(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get patient QR code data for bedside scanning"""
    try:
        patient = await db_service.get_patient(patient_id)
        
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Return extended patient summary for QR view
        qr_data = {
            "patient_id": patient['patient_id'],
            "name": patient['name'],
            "age": 45,  # Would calculate from DOB in real implementation
            "gender": "M",  # Would be stored in patient data
            "pathway": patient['pathway'],
            "current_state": patient['current_state'],
            "diagnosis": patient['diagnosis'],
            "comorbidities": patient.get('comorbidities', []),
            "assigned_doctor": patient.get('assigned_doctor'),
            "room": "Room 302",  # Would be stored in patient data
            "vitals": {
                "temperature": "98.6°F",
                "blood_pressure": "120/80",
                "heart_rate": "72 bpm",
                "oxygen_saturation": "98%"
            },
            "recent_updates": [
                {
                    "time": "14:30",
                    "note": "Post-op vitals stable",
                    "type": "assessment"
                }
            ],
            "update_counter": patient.get('update_counter', 0),
            "last_updated": patient.get('last_updated')
        }
        
        return qr_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient QR data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient QR data"
        )


@router.get("/{patient_id}/timeline", response_model=List[TimelineEntry])
async def get_patient_timeline(
    patient_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get patient timeline entries"""
    try:
        # Check if patient exists
        patient = await db_service.get_patient(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # In a real implementation, you would query timeline entries from the database
        # For now, return mock data that matches the expected structure
        timeline_entries = [
            {
                "patient_id": patient_id,
                "state": "ICU",
                "date_in": "2025-07-18T10:00:00Z",
                "date_out": "2025-07-19T09:30:00Z",
                "checklist_in": ["intubation-check", "antibiotics-started"],
                "checklist_out": ["extubated", "pain-controlled"],
                "created_at": "2025-07-18T10:00:00Z",
                "updated_at": "2025-07-19T09:30:00Z"
            }
        ]
        
        return [TimelineEntry(**entry) for entry in timeline_entries]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient timeline: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient timeline"
        )


@router.get("/{patient_id}/notes", response_model=List[Note])
async def get_patient_notes(
    patient_id: str,
    after: Optional[str] = Query(None, description="Get notes after this timestamp"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get patient notes"""
    try:
        # Check if patient exists
        patient = await db_service.get_patient(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        notes = await db_service.list_notes_by_patient(patient_id)
        
        # Filter by timestamp if provided
        if after:
            notes = [note for note in notes if note.get('created_at', '') > after]
        
        return [Note(**note) for note in notes]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient notes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient notes"
        )


@router.post("/{patient_id}/notes", response_model=Note)
async def create_patient_note(
    patient_id: str,
    note_request: NoteCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new note for a patient"""
    try:
        # Check if patient exists
        patient = await db_service.get_patient(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Patient not found"
            )
        
        # Ensure the note is for the correct patient
        if note_request.patient_id != patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient ID mismatch"
            )
        
        # Create note
        note_data = note_request.dict()
        created_note = await db_service.create_note(note_data)
        
        return Note(**created_note)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating patient note: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create note"
        )


@router.get("/assignments")
async def get_patient_assignments(
    doctor_id: str = Query(..., description="Doctor ID to get assignments for"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get patients assigned to a specific doctor"""
    try:
        # Get all patients and filter by assigned doctor
        # In production, this would use a GSI for efficiency
        all_patients = await db_service.list_patients(limit=100)
        assigned_patients = [
            patient for patient in all_patients 
            if patient.get('assigned_doctor') == doctor_id
        ]
        
        return [PatientMeta(**patient) for patient in assigned_patients]
        
    except Exception as e:
        logger.error(f"Error getting patient assignments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get patient assignments"
        )