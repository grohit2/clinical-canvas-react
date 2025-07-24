import { useState, useEffect, useMemo, useCallback } from "react";
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
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { patientService, authService } from "@/services";
import { SwipeableRow } from '@/components/SwipeableRow';
import { RightActions } from '@/components/RightActions';
import { FAB } from '@/components/ui/FAB';
import { toast } from '@/components/ui/use-toast';

// Mock data - replace with real API calls
let mockPatients: PatientMeta[] = [
  {
    id: "27e8d1ad",
    name: "Jane Doe",
    qrCode: `${window.location.origin}/qr/27e8d1ad`,
    pathway: "surgical",
    currentState: "post-op",
    diagnosis: "Cholecystitis",
    comorbidities: ["HTN", "DM"],
    updateCounter: 5,
    lastUpdated: "2025-07-19T14:30:09Z",
    assignedDoctor: "Dr. Sarah Wilson",
  },
  {
    id: "3b9f2c1e",
    name: "John Smith",
    qrCode: `${window.location.origin}/qr/3b9f2c1e`,
    pathway: "emergency",
    currentState: "ICU",
    diagnosis: "Acute MI",
    comorbidities: ["CAD", "HTN"],
    updateCounter: 12,
    lastUpdated: "2025-07-19T16:45:22Z",
    assignedDoctor: "Dr. Johnson",
  },
  {
    id: "8c4d5e2f",
    name: "Maria Garcia",
    qrCode: `${window.location.origin}/qr/8c4d5e2f`,
    pathway: "consultation",
    currentState: "stable",
    diagnosis: "Osteoarthritis",
    comorbidities: ["Obesity"],
    updateCounter: 2,
    lastUpdated: "2025-07-19T11:20:15Z",
    assignedDoctor: "Dr. Sarah Wilson",
  },
  {
    id: "9d6e7f3g",
    name: "Robert Wilson",
    qrCode: `${window.location.origin}/qr/9d6e7f3g`,
    pathway: "surgical",
    currentState: "pre-op",
    diagnosis: "Appendicitis",
    comorbidities: [],
    updateCounter: 8,
    lastUpdated: "2025-07-19T13:15:30Z",
    assignedDoctor: "Dr. Sarah Wilson",
  },
  {
    id: "1a2b3c4d",
    name: "Sarah Johnson",
    qrCode: `${window.location.origin}/qr/1a2b3c4d`,
    pathway: "emergency",
    currentState: "recovery",
    diagnosis: "Pneumonia",
    comorbidities: ["COPD", "HTN"],
    updateCounter: 3,
    lastUpdated: "2025-07-19T09:45:18Z",
    assignedDoctor: "Dr. Johnson",
  },
  {
    id: "6f7g8h9i",
    name: "Michael Brown",
    qrCode: `${window.location.origin}/qr/6f7g8h9i`,
    pathway: "consultation",
    currentState: "stable",
    diagnosis: "Diabetes Type 2",
    comorbidities: ["HTN", "Obesity"],
    updateCounter: 4,
    lastUpdated: "2025-07-19T10:20:30Z",
    assignedDoctor: "Dr. Emily Chen",
  },
  {
    id: "2j3k4l5m",
    name: "Lisa Davis",
    qrCode: `${window.location.origin}/qr/2j3k4l5m`,
    pathway: "emergency",
    currentState: "stable",
    diagnosis: "Chest Pain",
    comorbidities: [],
    updateCounter: 1,
    lastUpdated: "2025-07-19T15:45:12Z",
    assignedDoctor: "Dr. Emily Chen",
  },
];

export default function PatientsList() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patients, setPatients] = useState<PatientMeta[]>(mockPatients);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPathway, setSelectedPathway] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await patientService.getPatients();
        setPatients(data);
      } catch (error) {
        console.error("Failed to load patients:", error);
        setPatients(mockPatients);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const stageParam = searchParams.get("stage");
    if (stageParam) {
      const stageMapping: Record<string, string> = {
        icu: "ICU",
        "post-op": "post-op",
        recovery: "recovery",
        stable: "stable",
        "pre-op": "pre-op",
        discharge: "discharge",
      };

      const mappedStage = stageMapping[stageParam] || stageParam;
      setSelectedStage(mappedStage);
    }
  }, [searchParams]);

  // Memoized handlers for stable references
  const handleAddPatient = useCallback(async (newPatient: any) => {
    try {
      const patientData = {
        name: newPatient.name,
        pathway: newPatient.pathway,
        currentState: "stable" as const,
        diagnosis: newPatient.diagnosis,
        comorbidities: newPatient.comorbidities
          ? newPatient.comorbidities.split(",").map((c: string) => c.trim())
          : [],
        updateCounter: 1,
        lastUpdated: new Date().toISOString(),
        assignedDoctor: newPatient.assignedDoctor,
      };

      const createdPatient = await patientService.createPatient(patientData);
      setPatients((prev) => [...prev, createdPatient]);
      setShowAddPatientForm(false);
    } catch (error) {
      console.error("Failed to create patient:", error);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedPathway("all");
    setSelectedStage("all");
    setShowUrgentOnly(false);
  }, []);

  const handlePatientClick = useCallback(
    (patientId: string) => {
      navigate(`/patients/${patientId}`);
    },
    [navigate],
  );

  const handleClearFiltersAndSearch = useCallback(() => {
    setSearchQuery("");
    clearFilters();
  }, [clearFilters]);

  // Memoized filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPathway !== "all") count++;
    if (selectedStage !== "all") count++;
    if (showUrgentOnly) count++;
    return count;
  }, [selectedPathway, selectedStage, showUrgentOnly]);

  // Memoized base filtering logic
  const baseFilteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPathway =
        selectedPathway === "all" || patient.pathway === selectedPathway;
      const matchesStage =
        selectedStage === "all" || patient.currentState === selectedStage;
      const matchesUrgent = !showUrgentOnly || patient.updateCounter > 5;

      return matchesSearch && matchesPathway && matchesStage && matchesUrgent;
    });
  }, [patients, searchQuery, selectedPathway, selectedStage, showUrgentOnly]);

  // Memoized filtered results for each tab
  const allFilteredPatients = useMemo(() => {
    return baseFilteredPatients;
  }, [baseFilteredPatients]);

  const myFilteredPatients = useMemo(() => {
    if (!currentUser?.doctor?.name) return [];
    return baseFilteredPatients.filter(
      (patient) =>
        patient.assignedDoctor.trim() === currentUser.doctor.name.trim(),
    );
  }, [baseFilteredPatients, currentUser?.doctor?.name]);

  // Memoized empty state check
  const hasActiveFiltersOrSearch = useMemo(() => {
    return activeFiltersCount > 0 || searchQuery.length > 0;
  }, [activeFiltersCount, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header
        title="Patients"
        showSearch
        showAdd
        addButtonText="Add Patient"
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
                activeFiltersCount={activeFiltersCount}
              />
              <Badge variant="secondary">
                {allFilteredPatients.length} patients
              </Badge>
            </div>

            {/* Patients Grid */}
            <div className="grid gap-3">
              {allFilteredPatients.map((patient) => (
                <SwipeableRow
                  key={patient.id}
                  renderRightActions={() => (
                    <RightActions
                      mrn={patient.id}
                      close={() => {}}
                      showToast={(msg) => toast({ title: msg })}
                    />
                  )}
                >
                  <PatientCard
                    patient={patient}
                    onClick={() => handlePatientClick(patient.id)}
                  />
                </SwipeableRow>
              ))}
            </div>

            {allFilteredPatients.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No patients found matching your criteria
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleClearFiltersAndSearch}
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
                activeFiltersCount={activeFiltersCount}
              />
              <Badge variant="secondary">
                {myFilteredPatients.length} patients
              </Badge>
            </div>

            {/* My Patients Grid */}
            <div className="grid gap-3">
              {myFilteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => handlePatientClick(patient.id)}
                />
              ))}
            </div>

            {myFilteredPatients.length === 0 && (
              <div className="text-center py-12">
                {hasActiveFiltersOrSearch ? (
                  <>
                    <p className="text-muted-foreground">
                      No patients assigned to you matching your criteria
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={handleClearFiltersAndSearch}
                    >
                      Clear Filters
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    No patients allocated to you
                  </p>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <FAB
        icon={<span className="text-2xl">＋</span>}
        label="Add Patient"
        onClick={() => setShowAddPatientForm(true)}
        ariaLabel="Add Patient"
      />

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
