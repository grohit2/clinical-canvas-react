import { useState, useCallback, useMemo } from 'react';
import {
  filterPatients as coreFilterPatients,
  countActiveFilters,
} from '@clinical-canvas/core';
import type { Patient, TabFilter } from '@clinical-canvas/core';
import { usePinnedPatients } from './usePinnedPatients';

export function usePatientsFilters() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const { pinnedIds } = usePinnedPatients();

  const activeFiltersCount = useMemo(
    () => countActiveFilters(selectedPathway, selectedStage, showUrgentOnly),
    [selectedPathway, selectedStage, showUrgentOnly]
  );

  const clearFilters = useCallback(() => {
    setSelectedPathway('all');
    setSelectedStage('all');
    setShowUrgentOnly(false);
  }, []);

  const filterPatients = useCallback(
    (patients: Patient[]): Patient[] => {
      return coreFilterPatients(patients, {
        searchQuery,
        selectedPathway,
        selectedStage,
        showUrgentOnly,
        activeTab,
        pinnedPatientIds: pinnedIds,
      });
    },
    [searchQuery, selectedPathway, selectedStage, showUrgentOnly, activeTab, pinnedIds]
  );

  return {
    searchQuery,
    setSearchQuery,
    selectedPathway,
    setSelectedPathway,
    selectedStage,
    setSelectedStage,
    showUrgentOnly,
    setShowUrgentOnly,
    activeTab,
    setActiveTab,
    activeFiltersCount,
    clearFilters,
    filterPatients,
  };
}
