import type { TaskPriority, TaskStatus } from '../core/types';

export interface HospitalDoctor {
  name: string;
  initials: string;
  color: string;
  specialty: string;
}

export interface HospitalNurse {
  name: string;
  initials: string;
  color: string;
}

export interface HospitalTaskTemplate {
  id: string;
  name: string;
  patient: string;
  doctor: string;
  nurse: string;
  statusLabel: string;
  priorityLabel: string;
  time: string;
  day: string;
  recurrence: string;
  place: string;
  type: string;
  notes: string;
}

export interface HospitalTaskGroupTemplate {
  id: string;
  name: string;
  color: string;
  tasks: HospitalTaskTemplate[];
}

export interface HospitalTone {
  bg: string;
  text: string;
}

export interface HospitalPriorityTone extends HospitalTone {
  icon: string;
}

export const TASK_STATUS_TONES: Record<string, HospitalTone> = {
  Scheduled: { bg: '#579bfc', text: '#fff' },
  'In Progress': { bg: '#fdab3d', text: '#fff' },
  Completed: { bg: '#00c875', text: '#fff' },
  Cancelled: { bg: '#999999', text: '#fff' },
  Urgent: { bg: '#df2f4a', text: '#fff' },
  'On Hold': { bg: '#9d6ec1', text: '#fff' },
  '': { bg: '#c4c4c4', text: '#fff' },
};

export const PRIORITY_TONES: Record<string, HospitalPriorityTone> = {
  Critical: { bg: '#df2f4a', text: '#fff', icon: '⚠' },
  High: { bg: '#fdab3d', text: '#fff', icon: '↑' },
  Medium: { bg: '#579bfc', text: '#fff', icon: '−' },
  Low: { bg: '#00c875', text: '#fff', icon: '↓' },
  '': { bg: '#c4c4c4', text: '#fff', icon: '' },
};

export const RECURRENCE = ['None', 'Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'As needed'];

export const PLACES = [
  'Room 101',
  'Room 102',
  'Room 103',
  'Room 201',
  'Room 202',
  'ICU Bay 1',
  'ICU Bay 2',
  'ICU Bay 3',
  'OR Suite A',
  'OR Suite B',
  'OR Suite C',
  'ER Bay 1',
  'ER Bay 2',
  'ER Bay 3',
  'Lab',
  'Radiology',
  'PT Room 1',
  'PT Room 2',
  'Consultation A',
  'Consultation B',
  'Pharmacy',
  'Discharge Lounge',
];

export const GROUP_COLORS = [
  '#579bfc',
  '#a25ddc',
  '#00c875',
  '#fdab3d',
  '#df2f4a',
  '#66ccff',
  '#ff642e',
  '#7f5347',
  '#037f4c',
  '#bb3354',
];

export const DOCTORS: HospitalDoctor[] = [
  { name: 'Dr. Patel', initials: 'VP', color: '#1f6feb', specialty: 'Cardiology' },
  { name: 'Dr. Chen', initials: 'LC', color: '#a25ddc', specialty: 'Neurology' },
  { name: 'Dr. Williams', initials: 'RW', color: '#00c875', specialty: 'Orthopedics' },
  { name: 'Dr. Garcia', initials: 'MG', color: '#df2f4a', specialty: 'General' },
  { name: 'Dr. Kim', initials: 'SK', color: '#fdab3d', specialty: 'Pediatrics' },
  { name: 'Dr. Brooks', initials: 'AB', color: '#037f4c', specialty: 'Oncology' },
];

export const NURSES: HospitalNurse[] = [
  { name: 'RN Sarah M.', initials: 'SM', color: '#e8518d' },
  { name: 'RN James T.', initials: 'JT', color: '#579bfc' },
  { name: 'RN Maria L.', initials: 'ML', color: '#a25ddc' },
  { name: 'RN David K.', initials: 'DK', color: '#00c875' },
  { name: 'RN Emily R.', initials: 'ER', color: '#fdab3d' },
  { name: 'RN Carlos P.', initials: 'CP', color: '#037f4c' },
];

export const TASK_TYPES = [
  'Checkup',
  'Medication',
  'Lab Work',
  'Imaging',
  'Surgery',
  'Physical Therapy',
  'Consultation',
  'Discharge Planning',
  'Vital Signs',
  'Wound Care',
  'IV Change',
  'Blood Draw',
  'Patient Education',
  'Follow-up',
  'Diet Review',
];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const HOSPITAL_DEMO_GROUPS: HospitalTaskGroupTemplate[] = [
  {
    id: 'g1',
    name: 'Ward A — Cardiology',
    color: '#1f6feb',
    tasks: [
      {
        id: 't1',
        name: 'Post-op vitals check',
        patient: 'Robert Johnson',
        doctor: 'Dr. Patel',
        nurse: 'RN Sarah M.',
        statusLabel: 'In Progress',
        priorityLabel: 'High',
        time: '08:00',
        day: 'Monday',
        recurrence: 'Daily',
        place: 'Room 101',
        type: 'Vital Signs',
        notes: 'Monitor BP every 2hrs',
      },
      {
        id: 't2',
        name: 'Echocardiogram review',
        patient: 'Robert Johnson',
        doctor: 'Dr. Patel',
        nurse: 'RN James T.',
        statusLabel: 'Scheduled',
        priorityLabel: 'Medium',
        time: '10:30',
        day: 'Monday',
        recurrence: 'None',
        place: 'Radiology',
        type: 'Imaging',
        notes: '',
      },
      {
        id: 't3',
        name: 'Medication adjustment',
        patient: 'Linda Davis',
        doctor: 'Dr. Patel',
        nurse: 'RN Sarah M.',
        statusLabel: 'Urgent',
        priorityLabel: 'Critical',
        time: '07:00',
        day: 'Monday',
        recurrence: 'Daily',
        place: 'Room 102',
        type: 'Medication',
        notes: 'Switch IV to oral anticoagulants',
      },
      {
        id: 't4',
        name: 'Discharge assessment',
        patient: 'Mark Thompson',
        doctor: 'Dr. Patel',
        nurse: 'RN Maria L.',
        statusLabel: 'Scheduled',
        priorityLabel: 'Medium',
        time: '14:00',
        day: 'Tuesday',
        recurrence: 'None',
        place: 'Room 103',
        type: 'Discharge Planning',
        notes: 'Prepare home care instructions',
      },
    ],
  },
  {
    id: 'g2',
    name: 'Ward B — Neurology',
    color: '#a25ddc',
    tasks: [
      {
        id: 't5',
        name: 'MRI brain scan',
        patient: 'Susan Clark',
        doctor: 'Dr. Chen',
        nurse: 'RN Emily R.',
        statusLabel: 'Scheduled',
        priorityLabel: 'High',
        time: '09:00',
        day: 'Monday',
        recurrence: 'None',
        place: 'Radiology',
        type: 'Imaging',
        notes: 'With contrast',
      },
      {
        id: 't6',
        name: 'Neuro exam follow-up',
        patient: 'Susan Clark',
        doctor: 'Dr. Chen',
        nurse: 'RN Emily R.',
        statusLabel: 'In Progress',
        priorityLabel: 'Medium',
        time: '15:00',
        day: 'Monday',
        recurrence: 'Weekly',
        place: 'Consultation A',
        type: 'Consultation',
        notes: 'Track motor function',
      },
      {
        id: 't7',
        name: 'Physical therapy session',
        patient: 'James Wilson',
        doctor: 'Dr. Chen',
        nurse: 'RN David K.',
        statusLabel: 'Scheduled',
        priorityLabel: 'Medium',
        time: '11:00',
        day: 'Wednesday',
        recurrence: 'Bi-weekly',
        place: 'PT Room 1',
        type: 'Physical Therapy',
        notes: 'Post-stroke rehab',
      },
    ],
  },
  {
    id: 'g3',
    name: 'ICU — Critical Care',
    color: '#df2f4a',
    tasks: [
      {
        id: 't8',
        name: 'Ventilator check',
        patient: 'George Adams',
        doctor: 'Dr. Garcia',
        nurse: 'RN James T.',
        statusLabel: 'In Progress',
        priorityLabel: 'Critical',
        time: '06:00',
        day: 'Monday',
        recurrence: 'Daily',
        place: 'ICU Bay 1',
        type: 'Vital Signs',
        notes: 'Weaning protocol',
      },
      {
        id: 't9',
        name: 'Blood panel draw',
        patient: 'George Adams',
        doctor: 'Dr. Garcia',
        nurse: 'RN Carlos P.',
        statusLabel: 'Scheduled',
        priorityLabel: 'High',
        time: '05:30',
        day: 'Monday',
        recurrence: 'Daily',
        place: 'ICU Bay 1',
        type: 'Blood Draw',
        notes: 'CBC, BMP, coagulation',
      },
      {
        id: 't10',
        name: 'Wound care & dressing',
        patient: 'Patricia Moore',
        doctor: 'Dr. Garcia',
        nurse: 'RN Maria L.',
        statusLabel: 'Urgent',
        priorityLabel: 'High',
        time: '08:00',
        day: 'Monday',
        recurrence: 'Daily',
        place: 'ICU Bay 2',
        type: 'Wound Care',
        notes: 'Watch for infection',
      },
    ],
  },
  {
    id: 'g4',
    name: 'Outpatient — Follow-ups',
    color: '#00c875',
    tasks: [
      {
        id: 't11',
        name: 'Post-surgery checkup',
        patient: 'Emily Watson',
        doctor: 'Dr. Williams',
        nurse: 'RN David K.',
        statusLabel: 'Completed',
        priorityLabel: 'Low',
        time: '10:00',
        day: 'Thursday',
        recurrence: 'None',
        place: 'Consultation B',
        type: 'Follow-up',
        notes: 'Cleared for PT',
      },
      {
        id: 't12',
        name: 'Lab results review',
        patient: 'Tom Anderson',
        doctor: 'Dr. Brooks',
        nurse: 'RN Carlos P.',
        statusLabel: 'Completed',
        priorityLabel: 'Medium',
        time: '11:30',
        day: 'Thursday',
        recurrence: 'Monthly',
        place: 'Consultation A',
        type: 'Lab Work',
        notes: 'WBC trending up',
      },
    ],
  },
];

const BOARD_STATUS_MAP: Record<string, TaskStatus> = {
  Scheduled: 'pending',
  'In Progress': 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
  Urgent: 'in_progress',
  'On Hold': 'pending',
};

const BOARD_PRIORITY_MAP: Record<string, TaskPriority> = {
  Critical: 'urgent',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
};

const STATUS_TO_BOARD_MAP: Record<TaskStatus, string> = {
  pending: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const PRIORITY_TO_BOARD_MAP: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Critical',
};

const DAY_TO_OFFSET: Record<string, number> = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6,
};

export function mapBoardStatusToTaskStatus(label: string): TaskStatus {
  return BOARD_STATUS_MAP[label] ?? 'pending';
}

export function mapBoardPriorityToTaskPriority(label: string): TaskPriority {
  return BOARD_PRIORITY_MAP[label] ?? 'medium';
}

export function mapTaskStatusToBoardStatus(status: TaskStatus, boardStatusLabel?: string | null): string {
  if (boardStatusLabel && boardStatusLabel.length > 0) {
    return boardStatusLabel;
  }
  return STATUS_TO_BOARD_MAP[status] ?? 'Scheduled';
}

export function mapTaskPriorityToBoardPriority(priority: TaskPriority): string {
  return PRIORITY_TO_BOARD_MAP[priority] ?? 'Medium';
}

export function toIsoFromBoardSchedule(
  day: string,
  time: string,
  baseMondayIso = '2026-02-16T00:00:00.000Z',
): string {
  const offset = DAY_TO_OFFSET[day] ?? 0;
  const [hoursRaw, minutesRaw] = time.split(':');
  const hours = Number.parseInt(hoursRaw ?? '9', 10);
  const minutes = Number.parseInt(minutesRaw ?? '0', 10);

  const base = new Date(baseMondayIso);
  const due = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth(),
      base.getUTCDate() + offset,
      Number.isFinite(hours) ? hours : 9,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    ),
  );

  return due.toISOString();
}

export function initialsFromName(name: string): string {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '?';
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}
