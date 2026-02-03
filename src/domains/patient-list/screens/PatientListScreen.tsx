import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Header } from "@shared/components/layout/Header";
import { BottomBar } from "@shared/components/layout/BottomBar";
import { Button } from "@shared/components/ui/button";
import { PatientCard, PatientGridCard } from "@entities/patient/ui";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import api from "@shared/lib/api";
import type { Patient } from "@/types/api";
import { paths } from "@app/navigation";

import { usePatientsFilters, enrichPatient } from "../model/usePatientsFilters";
import { PatientsListTabs } from "./PatientsListTabs";
import { PatientsListFilters } from "./PatientsListFilters";
import { PatientsListEmpty } from "./PatientsListEmpty";

// Scroll restoration keys
const SCROLL_KEY = 'patientsListScrollY';
const SCROLL_RESTORE_FLAG = 'patientsListRestore';

export function PatientsListPage() {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('patientViewMode') as 'list' | 'grid') || 'list'
  );

  const filters = usePatientsFilters();

  // Scroll restoration
  const [restorePending, setRestorePending] = useState<boolean>(
    () => sessionStorage.getItem(SCROLL_RESTORE_FLAG) === '1'
  );
  const savedScroll = Number(sessionStorage.getItem(SCROLL_KEY) || '0');

  useEffect(() => {
    api.patients
      .list()
      .then((data) => {
        const withUi = data.map((p) => {
          const normalized = enrichPatient(p);
          return {
            ...normalized,
            id: normalized.id,
            qrCode: `${window.location.origin}/qr/${normalized.id}`,
            updateCounter: normalized.updateCounter ?? 0,
            comorbidities: normalized.comorbidities || [],
          };
        });
        setPatients(withUi);

        // Cache for Dashboard reuse
        try {
          localStorage.setItem('patientsCache', JSON.stringify({ ts: Date.now(), items: withUi }));
        } catch {}

        // Scroll restoration
        if (restorePending && !Number.isNaN(savedScroll) && savedScroll > 0) {
          requestAnimationFrame(() => {
            window.scrollTo(0, savedScroll);
            sessionStorage.removeItem(SCROLL_KEY);
            sessionStorage.removeItem(SCROLL_RESTORE_FLAG);
            setRestorePending(false);
          });
        }
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    localStorage.setItem('patientViewMode', viewMode);
  }, [viewMode]);

  const filteredPatients = filters.filterPatients(patients);

  // Navigate helper that saves scroll before moving to patient details
  const openPatient = (id: string) => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
      sessionStorage.setItem(SCROLL_RESTORE_FLAG, '1');
    } catch {}
    navigate(paths.patient(id));
  };

  const handleClearAll = () => {
    filters.setSearchQuery('');
    filters.clearFilters();
  };

  const hasFilters = filters.activeFiltersCount > 0 || filters.searchQuery !== '';

  const renderPatientsList = (patientsToRender: Patient[]) => {
    if (patientsToRender.length === 0) {
      return (
        <PatientsListEmpty
          hasFilters={hasFilters}
          isMyPatientsTab={filters.activeTab === 'my'}
          onClearFilters={handleClearAll}
        />
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="space-y-3">
          {patientsToRender.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onClick={() => openPatient(patient.id)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-3">
        {patientsToRender.map((patient) => (
          <PatientGridCard
            key={patient.id}
            patient={patient}
            onClick={() => openPatient(patient.id)}
          />
        ))}
      </div>
    );
  };

  const renderTabContent = () => (
    <>
      <PatientsListFilters
        selectedPathway={filters.selectedPathway}
        selectedStage={filters.selectedStage}
        showUrgentOnly={filters.showUrgentOnly}
        onPathwayChange={filters.setSelectedPathway}
        onStageChange={filters.setSelectedStage}
        onUrgentToggle={filters.setShowUrgentOnly}
        onClearFilters={filters.clearFilters}
        activeFiltersCount={filters.activeFiltersCount}
        patientCount={filteredPatients.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {renderPatientsList(filteredPatients)}
    </>
  );

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header
        title="Patients"
        showSearch
        searchValue={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        notificationCount={3}
        onNotificationClick={() => setShowNotifications(true)}
      />

      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        <PatientsListTabs
          activeTab={filters.activeTab}
          onTabChange={filters.setActiveTab}
          allPatientsContent={renderTabContent()}
          myPatientsContent={renderTabContent()}
        />
      </div>

      <NotificationsPopup
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />

      {/* Floating Action Button */}
      <Button
        onClick={() => navigate(paths.patientsAdd())}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BottomBar />
    </div>
  );
}
