// useZoneData - Assembles zone-specific checklist/form data

import { useMemo } from 'react';
import type { ZoneData, ChecklistItem } from '../core/types';

type ZoneType = 'blue' | 'yellow' | 'red' | 'green';

// TODO: Replace with actual data fetching
const MOCK_CHECKLISTS: Record<ZoneType, ChecklistItem[]> = {
  blue: [
    { id: '1', label: 'Patient registered', completed: false, required: true },
    { id: '2', label: 'Insurance verified', completed: false, required: true },
    { id: '3', label: 'Consent forms signed', completed: false, required: true },
  ],
  yellow: [
    { id: '1', label: 'Pre-op assessment', completed: false, required: true },
    { id: '2', label: 'NPO status confirmed', completed: false, required: true },
    { id: '3', label: 'Site marking done', completed: false, required: true },
  ],
  red: [
    { id: '1', label: 'Time out completed', completed: false, required: true },
    { id: '2', label: 'Anesthesia started', completed: false, required: true },
    { id: '3', label: 'Surgery started', completed: false, required: false },
  ],
  green: [
    { id: '1', label: 'Discharge summary', completed: false, required: true },
    { id: '2', label: 'Follow-up scheduled', completed: false, required: true },
    { id: '3', label: 'Medications prescribed', completed: false, required: true },
  ],
};

export function useZoneData(zone: ZoneType, patientId: string): ZoneData {
  // TODO: Fetch actual checklist data based on patient and zone

  return useMemo(() => {
    const checklist = MOCK_CHECKLISTS[zone];
    const completedCount = checklist.filter((item) => item.completed).length;

    return {
      zone,
      checklist,
      completedCount,
      totalCount: checklist.length,
    };
  }, [zone, patientId]);
}
