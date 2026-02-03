// usePatientTabs - Tab navigation state for patient detail

import { useState, useCallback } from 'react';

export type PatientTab = 'overview' | 'blue' | 'yellow' | 'red' | 'green' | 'labs' | 'meds' | 'notes' | 'tasks';

export interface TabConfig {
  id: PatientTab;
  label: string;
  icon?: string;
}

export const TAB_CONFIG: TabConfig[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'blue', label: 'Admission' },
  { id: 'yellow', label: 'Pre-Op' },
  { id: 'red', label: 'OT' },
  { id: 'green', label: 'Discharge' },
  { id: 'labs', label: 'Labs' },
  { id: 'meds', label: 'Meds' },
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
];

export function usePatientTabs(initialTab: PatientTab = 'overview') {
  const [activeTab, setActiveTab] = useState<PatientTab>(initialTab);

  const goToTab = useCallback((tab: PatientTab) => {
    setActiveTab(tab);
  }, []);

  const goToNextTab = useCallback(() => {
    const currentIndex = TAB_CONFIG.findIndex((t) => t.id === activeTab);
    const nextIndex = (currentIndex + 1) % TAB_CONFIG.length;
    setActiveTab(TAB_CONFIG[nextIndex].id);
  }, [activeTab]);

  const goToPrevTab = useCallback(() => {
    const currentIndex = TAB_CONFIG.findIndex((t) => t.id === activeTab);
    const prevIndex = (currentIndex - 1 + TAB_CONFIG.length) % TAB_CONFIG.length;
    setActiveTab(TAB_CONFIG[prevIndex].id);
  }, [activeTab]);

  return {
    activeTab,
    tabs: TAB_CONFIG,
    goToTab,
    goToNextTab,
    goToPrevTab,
  };
}
