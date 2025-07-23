import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { PatientCard } from "@/components/patient/PatientCard";
import { FilterPopup } from "@/components/patient/FilterPopup";
import { AddPatientForm } from "@/components/patient/AddPatientForm";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientMeta } from "@/types/models";
import { mockPatients as initialMockPatients } from "@/data/mockData";
import { useNavigate } from "react-router-dom";

// Mock current logged-in doctor
const currentDoctor = 'Dr. Sarah Wilson';

export default function PatientsList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<PatientMeta[]>(initialMockPatients);

  const handleAddPatient = (newPatient: any) => {
    const patient: PatientMeta = {
      id: Math.random().toString(36).substr(2, 8),
      name: newPatient.name,
      qrCode: `QR${Math.random().toString(36).substr(2, 8)}`,
      pathway: newPatient.pathway,
      currentState: 'onboard',
      diagnosis: newPatient.diagnosis,
      comorbidities: newPatient.comorbidities ? newPatient.comorbidities.split(',').map((c: string) => c.trim()) : [],
      updateCounter: 1,
      lastUpdated: new Date().toISOString(),
      assignedDoctor: newPatient.assignedDoctor,
      room: 'TBD',
      age: newPatient.age || 0,
      mrn: `MRN${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      allergies: [],
      admissionDate: new Date().toISOString(),
      priority: 'medium'
    };
    setPatients(prev => [...prev, patient]);
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
      const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           patient.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPathway = selectedPathway === 'all' || patient.pathway === selectedPathway;
      const matchesStage = selectedStage === 'all' || patient.currentState === selectedStage;
      const matchesUrgent = !showUrgentOnly || patient.updateCounter > 5;
      const matchesDoctor = tabFilter === 'all' || patient.assignedDoctor === currentDoctor;
      
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
              <Badge variant="secondary">
                {getFilteredPatients('all').length} patients
              </Badge>
            </div>

            {/* Patients Grid */}
            <div className="grid gap-3">
              {getFilteredPatients('all').map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                />
              ))}
            </div>

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
              <Badge variant="secondary">
                {getFilteredPatients('my').length} patients
              </Badge>
            </div>

            {/* My Patients Grid */}
            <div className="grid gap-3">
              {getFilteredPatients('my').map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                />
              ))}
            </div>

            {getFilteredPatients('my').length === 0 && (
              <div className="text-center py-12">
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