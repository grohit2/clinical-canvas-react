import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { PatientCard } from "@/components/patient/PatientCard";
import { PatientGridCard } from "@/components/patient/PatientGridCard";
import { ViewToggle } from "@/components/patient/ViewToggle";
import { FilterPopup } from "@/components/patient/FilterPopup";
import { AddPatientForm } from "@/components/patient/AddPatientForm";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import type { Patient } from "@/types/api";
import { useNavigate, useSearchParams } from "react-router-dom";

// Initial empty list; will be populated from API
let mockPatients: Patient[] = [];

export default function PatientsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('patientViewMode') as 'list' | 'grid') || 'list'
  );
  const currentDoctorId = 'doc-abc123';

  useEffect(() => {
    api.patients
      .list()
      .then((data) => {
        const withUi = data.map((p) => ({
          ...p,
          id: p.id,
          qrCode: `${window.location.origin}/qr/${p.id}`,
          updateCounter: 0,
          comorbidities: p.comorbidities || [],
        }));
        setPatients(withUi);
        mockPatients = withUi;
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    localStorage.setItem('patientViewMode', viewMode);
  }, [viewMode]);

  // Handle URL parameters for stage filtering
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      // Map dashboard stage names to patient states
      const stageMapping: { [key: string]: string } = {
        'preop': 'pre-op',
        'surgery': 'surgery',
        'postop': 'post-op',
        'recovery': 'recovery',
        'discharge': 'discharge'
      };
      
      const mappedStage = stageMapping[stageParam] || stageParam;
      setSelectedStage(mappedStage);
    }
  }, [searchParams]);

  const handleAddPatient = (patient: Patient) => {
    const withUi = {
      ...patient,
      id: patient.id,
      qrCode: `${window.location.origin}/qr/${patient.id}`,
      updateCounter: 0,
      comorbidities: patient.comorbidities || [],
    };
    setPatients((prev) => [...prev, withUi]);
    mockPatients = [...mockPatients, withUi];
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedPathway !== 'all') count++;
    if (selectedStage !== 'all') count++;
    if (showUrgentOnly) count++;
    return count;
  };

  const clearFilters = () => {
    setSelectedPathway('all');
    setSelectedStage('all');
    setShowUrgentOnly(false);
  };

  const getFilteredPatients = (tabFilter: string) => {
    return patients.filter(patient => {
      const matchesSearch =
        (patient.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.diagnosis ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPathway = selectedPathway === 'all' || patient.pathway === selectedPathway;
      const matchesStage = selectedStage === 'all' || patient.currentState === selectedStage;
      const matchesUrgent = !showUrgentOnly || patient.updateCounter > 5;
      
      // Fix doctor filtering - ensure exact name match
      const matchesDoctor =
        tabFilter === 'all' || patient.assignedDoctorId === currentDoctorId;
      
      return matchesSearch && matchesPathway && matchesStage && matchesUrgent && matchesDoctor;
    });
  };

  const filteredPatients = getFilteredPatients(activeTab);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header 
        title="Patients" 
        showSearch
        showAdd
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        onAdd={() => setShowAddPatientForm(true)}
        notificationCount={3}
        onNotificationClick={() => setShowNotifications(true)}
      />
      
      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Patients</TabsTrigger>
            <TabsTrigger value="my">My Patients</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-4 mt-4">
            {/* Filter Controls */}
            <div className="flex items-center justify-between">
              <FilterPopup
                selectedPathway={selectedPathway}
                selectedStage={selectedStage}
                showUrgentOnly={showUrgentOnly}
                onPathwayChange={setSelectedPathway}
                onStageChange={setSelectedStage}
                onUrgentToggle={setShowUrgentOnly}
                onClearFilters={clearFilters}
                activeFiltersCount={getActiveFiltersCount()}
              />
              <div className="flex items-center gap-2">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
                <Badge variant="secondary">
                  {getFilteredPatients('all').length} patients
                </Badge>
              </div>
            </div>

            {/* Patients */}
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {getFilteredPatients('all').map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getFilteredPatients('all').slice(0, 8).map((patient) => (
                  <PatientGridCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  />
                ))}
              </div>
            )}

            {getFilteredPatients('all').length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No patients found matching your criteria</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    clearFilters();
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="my" className="space-y-4 mt-4">
            {/* Filter Controls */}
            <div className="flex items-center justify-between">
              <FilterPopup
                selectedPathway={selectedPathway}
                selectedStage={selectedStage}
                showUrgentOnly={showUrgentOnly}
                onPathwayChange={setSelectedPathway}
                onStageChange={setSelectedStage}
                onUrgentToggle={setShowUrgentOnly}
                onClearFilters={clearFilters}
                activeFiltersCount={getActiveFiltersCount()}
              />
              <div className="flex items-center gap-2">
                <ViewToggle mode={viewMode} onChange={setViewMode} />
                <Badge variant="secondary">
                  {getFilteredPatients('my').length} patients
                </Badge>
              </div>
            </div>

            {/* My Patients */}
            {viewMode === 'list' ? (
              <div className="space-y-3">
                {getFilteredPatients('my').map((patient) => (
                  <PatientCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getFilteredPatients('my').slice(0, 8).map((patient) => (
                  <PatientGridCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  />
                ))}
              </div>
            )}

            {getFilteredPatients('my').length === 0 && (
              <div className="text-center py-12">
                {getActiveFiltersCount() > 0 || searchQuery ? (
                  <>
                    <p className="text-muted-foreground">No patients assigned to you matching your criteria</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => {
                        setSearchQuery('');
                        clearFilters();
                      }}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">No patients allocated to you</p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <AddPatientForm 
        open={showAddPatientForm}
        onOpenChange={setShowAddPatientForm}
        onAddPatient={handleAddPatient}
      />

      <NotificationsPopup 
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />

      <BottomBar />
    </div>
  );
}
