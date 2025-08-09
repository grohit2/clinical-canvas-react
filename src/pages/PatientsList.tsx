import { useState, useEffect, useMemo, useCallback } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { PatientCard } from "@/components/patient/PatientCard";
import { FilterPopup } from "@/components/patient/FilterPopup";
import { AddPatientForm } from "@/components/patient/AddPatientForm";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { FloatingActionButton } from "@/components/ui/FloatingActionButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientMeta } from "@/types/models";
import { useNavigate, useSearchParams } from "react-router-dom";
import { patientService } from "@/services";
import { Plus } from "lucide-react";

export default function PatientsList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patients, setPatients] = useState<PatientMeta[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPathway, setSelectedPathway] = useState("all");
  const [selectedStage, setSelectedStage] = useState("all");
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [showAddPatientForm, setShowAddPatientForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const params =
          selectedDepartment !== "all"
            ? { department: selectedDepartment }
            : undefined;
        const data = await patientService.getPatients(params);
        setPatients(data);
      } catch (error) {
        console.error("Failed to load patients:", error);
        setPatients([]);
      }
    };

    loadPatients();
  }, [selectedDepartment]);

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
  const handleAddPatient = useCallback(
    async (newPatient: { mrn: string; name: string; department: string }) => {
      try {
        const payload = {
          mrn: newPatient.mrn,
          name: newPatient.name,
          department: newPatient.department,
        };

      await patientService.createPatient(payload);
      const refreshed = await patientService.getPatients(
        selectedDepartment !== "all" ? { department: selectedDepartment } : undefined,
      );
      setPatients(refreshed);
      setShowAddPatientForm(false);
    } catch (error) {
      console.error("Failed to create patient:", error);
    }
  }, [selectedDepartment]);

  const clearFilters = useCallback(() => {
    setSelectedPathway("all");
    setSelectedStage("all");
    setShowUrgentOnly(false);
    setSelectedDepartment("all");
    setShowInactive(false);
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
    if (selectedDepartment !== "all") count++;
    if (showInactive) count++;
    return count;
  }, [selectedPathway, selectedStage, showUrgentOnly, selectedDepartment, showInactive]);

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
      const matchesDepartment =
        selectedDepartment === "all" || patient.department === selectedDepartment;
      const matchesActive = showInactive || patient.status !== "INACTIVE";

      return (
        matchesSearch &&
        matchesPathway &&
        matchesStage &&
        matchesUrgent &&
        matchesDepartment &&
        matchesActive
      );
    });
  }, [patients, searchQuery, selectedPathway, selectedStage, showUrgentOnly, selectedDepartment, showInactive]);

  // Memoized filtered results
  const allFilteredPatients = useMemo(() => {
    return baseFilteredPatients;
  }, [baseFilteredPatients]);

  // Memoized empty state check
  const hasActiveFiltersOrSearch = useMemo(() => {
    return activeFiltersCount > 0 || searchQuery.length > 0;
  }, [activeFiltersCount, searchQuery]);

  return (
    <div className="min-h-screen bg-background pb-20 overflow-x-hidden">
      <Header
        title="Patients"
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        notificationCount={3}
        onNotificationClick={() => setShowNotifications(true)}
      />

      <div className="p-4 space-y-4 max-w-full overflow-x-hidden">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">All Patients</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {/* Filter Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <select
                  className="border rounded-md h-9 px-2 text-sm"
                  value={selectedDepartment}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedDepartment(value);
                    const params = Object.fromEntries(
                      searchParams.entries(),
                    );
                    if (value !== "all") {
                      params.department = value;
                    } else {
                      delete params.department;
                    }
                    setSearchParams(params);
                  }}
                >
                  <option value="all">All Departments</option>
                  <option value="surgery1">Surgery 1</option>
                  <option value="surgery2">Surgery 2</option>
                  <option value="cardiology">Cardiology</option>
                  <option value="orthopedics">Orthopedics</option>
                  <option value="emergency">Emergency</option>
                  <option value="icu">ICU</option>
                </select>
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
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showInactive}
                    onChange={(e) => setShowInactive(e.target.checked)}
                  />
                  Show inactive
                </label>
              </div>
              <Badge variant="secondary">
                {allFilteredPatients.length} patients
              </Badge>
            </div>

            {/* Patients Grid */}
            <div className="grid gap-3">
              {allFilteredPatients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => handlePatientClick(patient.id)}
                  onDelete={async (p) => {
                    try {
                      await patientService.deletePatient(p.mrn);
                      setPatients(prev => prev.filter(x => x.mrn !== p.mrn));
                    } catch (e) {
                      console.error("Failed to delete patient", e);
                    }
                  }}
                />
              ))}
            </div>

            {allFilteredPatients.length === 0 && (
                             <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No patients found matching your criteria
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <Button
                    variant="outline"
                    onClick={handleClearFiltersAndSearch}
                  >
                    Clear Filters
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={showInactive}
                      onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Show inactive
                  </label>
                </div>
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

      <FloatingActionButton
        icon={<Plus className="h-6 w-6" />}
        label="Add Patient"
        onClick={() => setShowAddPatientForm(true)}
      />

      <BottomBar />
    </div>
  );
}
