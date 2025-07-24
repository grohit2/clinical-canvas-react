from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
import uuid


class BaseEntity(BaseModel):
    """Base entity with common fields"""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientMeta(BaseEntity):
    """Patient metadata model"""
    patient_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    qr_code: Optional[str] = None
    pathway: Literal['surgical', 'consultation', 'emergency']
    current_state: str
    diagnosis: str
    comorbidities: List[str] = []
    update_counter: int = 0
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    assigned_doctor: Optional[str] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat() + 'Z'
        }


class TimelineEntry(BaseEntity):
    """Patient timeline entry"""
    patient_id: str
    state: str
    date_in: datetime
    date_out: Optional[datetime] = None
    checklist_in: List[str] = []
    checklist_out: List[str] = []


class Task(BaseEntity):
    """Task model"""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    title: str
    type: Literal['lab', 'medication', 'procedure', 'assessment', 'discharge']
    due: datetime
    assignee_id: str
    status: Literal['open', 'in-progress', 'done', 'cancelled'] = 'open'
    priority: Literal['low', 'medium', 'high', 'urgent'] = 'medium'
    recurring: bool = False
    details: Optional[Dict[str, Any]] = None


class Medication(BaseEntity):
    """Medication model"""
    med_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    name: str
    dose: str
    route: str
    freq: str
    start: datetime
    end: datetime
    priority: Literal['routine', 'important', 'critical'] = 'routine'
    schedule_times: List[str] = []


class LabResult(BaseEntity):
    """Lab result model"""
    lab_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    name: str
    values: List[Dict[str, Any]]
    abnormal_flag: bool = False
    result_status: Literal['pending', 'completed', 'cancelled'] = 'pending'
    reported_at: Optional[datetime] = None
    details: Optional[Dict[str, Any]] = None


class Note(BaseEntity):
    """Note model"""
    note_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    author_id: str
    category: Literal['doctorNote', 'nurseNote', 'pharmacy', 'discharge']
    content: str


class MediaFile(BaseEntity):
    """Media file model"""
    file_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    patient_id: str
    url: str
    mime: str
    uploaded_by: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = []


class StaffProfile(BaseEntity):
    """Staff profile model"""
    user_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: Literal['doctor', 'nurse', 'pharmacist', 'technician', 'admin']
    avatar: Optional[str] = None
    contact_info: Dict[str, str] = {}
    permissions: List[str] = []
    email: str
    password_hash: Optional[str] = None


# Request/Response models
class PatientCreateRequest(BaseModel):
    name: str
    pathway: Literal['surgical', 'consultation', 'emergency']
    current_state: str
    diagnosis: str
    comorbidities: List[str] = []
    assigned_doctor: Optional[str] = None


class PatientUpdateRequest(BaseModel):
    name: Optional[str] = None
    pathway: Optional[Literal['surgical', 'consultation', 'emergency']] = None
    current_state: Optional[str] = None
    diagnosis: Optional[str] = None
    comorbidities: Optional[List[str]] = None
    assigned_doctor: Optional[str] = None


class TaskCreateRequest(BaseModel):
    patient_id: str
    title: str
    type: Literal['lab', 'medication', 'procedure', 'assessment', 'discharge']
    due: datetime
    assignee_id: str
    priority: Literal['low', 'medium', 'high', 'urgent'] = 'medium'
    recurring: bool = False
    details: Optional[Dict[str, Any]] = None


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = None
    type: Optional[Literal['lab', 'medication', 'procedure', 'assessment', 'discharge']] = None
    due: Optional[datetime] = None
    assignee_id: Optional[str] = None
    status: Optional[Literal['open', 'in-progress', 'done', 'cancelled']] = None
    priority: Optional[Literal['low', 'medium', 'high', 'urgent']] = None
    recurring: Optional[bool] = None
    details: Optional[Dict[str, Any]] = None


class NoteCreateRequest(BaseModel):
    patient_id: str
    author_id: str
    category: Literal['doctorNote', 'nurseNote', 'pharmacy', 'discharge']
    content: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: StaffProfile


class KPIData(BaseModel):
    total_patients: int
    tasks_due: int
    urgent_alerts: int
    completed_today: int


class UpcomingProcedure(BaseModel):
    id: str
    patient_id: str
    patient_name: str
    procedure: str
    time: str
    surgeon: str


class StageHeatMapItem(BaseModel):
    stage: str
    count: int
    variant: Literal['caution', 'urgent', 'stable', 'default']