import type { Patient, TabFilter } from './types';
import { getPatientAddedTime } from './normalize';
import { matchesStage } from './stage';

export interface FilterOptions {
  searchQuery: string;
  selectedPathway: string;
  selectedStage: string;
  showUrgentOnly: boolean;
  activeTab: TabFilter;
  pinnedPatientIds: string[];
}

export function filterPatients(patients: Patient[], options: FilterOptions): Patient[] {
  const {
    searchQuery,
    selectedPathway,
    selectedStage,
    showUrgentOnly,
    activeTab,
    pinnedPatientIds,
  } = options;

  const filtered = patients.filter((patient) => {
    const matchesSearch =
      (patient.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.diagnosis ?? '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPathway = selectedPathway === 'all' || patient.pathway === selectedPathway;
    const matchesStageFilter = matchesStage(patient.currentState, selectedStage);
    const matchesUrgent = !showUrgentOnly || (patient.updateCounter ?? 0) > 5;

    let matchesTab = true;
    if (activeTab === 'my') {
      matchesTab = pinnedPatientIds.includes(patient.id);
    }

    return matchesSearch && matchesPathway && matchesStageFilter && matchesUrgent && matchesTab;
  });

  // Sort: pinned first, then by added time (newest first)
  return filtered.sort((a, b) => {
    const aIsPinned = pinnedPatientIds.includes(a.id);
    const bIsPinned = pinnedPatientIds.includes(b.id);
    if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;

    const aAdded = getPatientAddedTime(a);
    const bAdded = getPatientAddedTime(b);
    if (aAdded !== bAdded) return bAdded - aAdded;

    return b.id.localeCompare(a.id);
  });
}

export function countActiveFilters(
  selectedPathway: string,
  selectedStage: string,
  showUrgentOnly: boolean
): number {
  let count = 0;
  if (selectedPathway !== 'all') count++;
  if (selectedStage !== 'all') count++;
  if (showUrgentOnly) count++;
  return count;
}
