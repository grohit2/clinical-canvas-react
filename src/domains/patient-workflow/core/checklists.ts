// Workflow Checklists
// Pure TypeScript (NO React/RN imports)
// Extracted from inline arrays in each workflow screen

import type { ChecklistItem, ChecklistSection } from './types';

// Admission Checklist
export const ADMISSION_CHECKLIST: ChecklistItem[] = [
  { id: 'adm-1', label: 'Patient identity verified', required: true, completed: false },
  { id: 'adm-2', label: 'Insurance/payment verified', required: true, completed: false },
  { id: 'adm-3', label: 'Consent forms signed', required: true, completed: false },
  { id: 'adm-4', label: 'Allergies documented', required: true, completed: false },
  { id: 'adm-5', label: 'Current medications listed', required: true, completed: false },
  { id: 'adm-6', label: 'Vitals recorded', required: true, completed: false },
  { id: 'adm-7', label: 'Room/bed assigned', required: false, completed: false },
];

// Pre-Op Checklist
export const PRE_OP_CHECKLIST: ChecklistItem[] = [
  { id: 'pre-1', label: 'NPO status confirmed', required: true, completed: false },
  { id: 'pre-2', label: 'Pre-op labs reviewed', required: true, completed: false },
  { id: 'pre-3', label: 'Anesthesia clearance obtained', required: true, completed: false },
  { id: 'pre-4', label: 'Surgical site marked', required: true, completed: false },
  { id: 'pre-5', label: 'Blood products arranged (if needed)', required: false, completed: false },
  { id: 'pre-6', label: 'Pre-op medications given', required: false, completed: false },
  { id: 'pre-7', label: 'IV access established', required: true, completed: false },
];

// OT Safety Checklist (WHO Surgical Safety)
export const OT_SAFETY_CHECKLIST: ChecklistSection[] = [
  {
    id: 'sign-in',
    title: 'Sign In (Before Induction)',
    items: [
      { id: 'ot-1', label: 'Patient identity confirmed', required: true, completed: false },
      { id: 'ot-2', label: 'Site marked / not applicable', required: true, completed: false },
      { id: 'ot-3', label: 'Anesthesia safety check complete', required: true, completed: false },
      { id: 'ot-4', label: 'Pulse oximeter functioning', required: true, completed: false },
      { id: 'ot-5', label: 'Known allergy?', required: true, completed: false },
      { id: 'ot-6', label: 'Difficult airway / aspiration risk?', required: true, completed: false },
      { id: 'ot-7', label: 'Risk of blood loss > 500ml?', required: true, completed: false },
    ],
  },
  {
    id: 'time-out',
    title: 'Time Out (Before Incision)',
    items: [
      { id: 'ot-8', label: 'All team members introduced', required: true, completed: false },
      { id: 'ot-9', label: 'Patient name, procedure, site confirmed', required: true, completed: false },
      { id: 'ot-10', label: 'Antibiotic prophylaxis given', required: false, completed: false },
      { id: 'ot-11', label: 'Critical steps reviewed', required: true, completed: false },
      { id: 'ot-12', label: 'Sterility confirmed', required: true, completed: false },
    ],
  },
  {
    id: 'sign-out',
    title: 'Sign Out (Before Patient Leaves OT)',
    items: [
      { id: 'ot-13', label: 'Procedure name recorded', required: true, completed: false },
      { id: 'ot-14', label: 'Instrument/sponge/needle count correct', required: true, completed: false },
      { id: 'ot-15', label: 'Specimen labeled', required: false, completed: false },
      { id: 'ot-16', label: 'Equipment problems addressed', required: false, completed: false },
      { id: 'ot-17', label: 'Recovery concerns communicated', required: true, completed: false },
    ],
  },
];

// Post-Op Orders Checklist
export const POST_OP_CHECKLIST: ChecklistItem[] = [
  { id: 'post-1', label: 'Vitals stable', required: true, completed: false },
  { id: 'post-2', label: 'Pain management ordered', required: true, completed: false },
  { id: 'post-3', label: 'IV fluids ordered', required: true, completed: false },
  { id: 'post-4', label: 'Diet ordered', required: true, completed: false },
  { id: 'post-5', label: 'Activity level specified', required: true, completed: false },
  { id: 'post-6', label: 'Wound care instructions', required: false, completed: false },
  { id: 'post-7', label: 'DVT prophylaxis ordered', required: false, completed: false },
  { id: 'post-8', label: 'Follow-up labs ordered', required: false, completed: false },
];

// Discharge Checklist
export const DISCHARGE_CHECKLIST: ChecklistItem[] = [
  { id: 'dis-1', label: 'Discharge summary completed', required: true, completed: false },
  { id: 'dis-2', label: 'Prescriptions given', required: true, completed: false },
  { id: 'dis-3', label: 'Follow-up appointment scheduled', required: true, completed: false },
  { id: 'dis-4', label: 'Wound care instructions given', required: false, completed: false },
  { id: 'dis-5', label: 'Warning signs explained', required: true, completed: false },
  { id: 'dis-6', label: 'Activity restrictions explained', required: true, completed: false },
  { id: 'dis-7', label: 'Diet instructions given', required: false, completed: false },
  { id: 'dis-8', label: 'Patient/family questions answered', required: true, completed: false },
  { id: 'dis-9', label: 'Transport arranged', required: false, completed: false },
];
