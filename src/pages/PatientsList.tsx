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
import { useNavigate } from "react-router-dom";

// Mock data - replace with real API calls
const mockPatients: PatientMeta[] = [
  {
    id: '27e8d1ad',
    name: 'Jane Doe',
    qrCode: 'https://qrc.c/27e8d1ad',
    pathway: 'surgical',
    currentState: 'post-op',
    diagnosis: 'Cholecystitis',
    comorbidities: ['HTN', 'DM'],
    updateCounter: 5,
    lastUpdated: '2025-07-19T14:30:09Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '3b9f2c1e',
    name: 'John Smith',
    qrCode: 'https://qrc.c/3b9f2c1e',
    pathway: 'emergency',
    currentState: 'ICU',
    diagnosis: 'Acute MI',
    comorbidities: ['CAD', 'HTN'],
    updateCounter: 12,
    lastUpdated: '2025-07-19T16:45:22Z',
    assignedDoctor: 'Dr. Johnson'
  },
  {
    id: '8c4d5e2f',
    name: 'Maria Garcia',
    qrCode: 'https://qrc.c/8c4d5e2f',
    pathway: 'consultation',
    currentState: 'stable',
    diagnosis: 'Osteoarthritis',
    comorbidities: ['Obesity'],
    updateCounter: 2,
    lastUpdated: '2025-07-19T11:20:15Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '9d6e7f3g',
    name: 'Robert Wilson',
    qrCode: 'https://qrc.c/9d6e7f3g',
    pathway: 'surgical',
    currentState: 'pre-op',
    diagnosis: 'Appendicitis',
    comorbidities: [],
    updateCounter: 8,
    lastUpdated: '2025-07-19T13:15:30Z',
    assignedDoctor: 'Dr. Smith'
  },
  {
    id: '1a2b3c4d',
    name: 'Sarah Johnson',
    qrCode: 'https://qrc.c/1a2b3c4d',
    pathway: 'emergency',
    currentState: 'recovery',
    diagnosis: 'Pneumonia',
    comorbidities: ['COPD', 'HTN'],
    updateCounter: 3,
    lastUpdated: '2025-07-19T09:45:18Z',
    assignedDoctor: 'Dr. Johnson'
  }
];

// Mock current logged-in doctor
const currentDoctor = 'Dr. Smith';

export default function PatientsList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

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
    return mockPatients.filter(patient => {
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
      />

      <NotificationsPopup 
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />

      <BottomBar />
    </div>
  );
}