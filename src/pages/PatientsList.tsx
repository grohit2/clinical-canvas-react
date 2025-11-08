import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { BottomBar } from "@/components/layout/BottomBar";
import { PatientCard } from "@/components/patient/PatientCard";
import { PatientGridCard } from "@/components/patient/PatientGridCard";
import { ViewToggle } from "@/components/patient/ViewToggle";
import { FilterPopup } from "@/components/patient/FilterPopup";
import { NotificationsPopup } from "@/components/notifications/NotificationsPopup";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import type { Patient, MrnHistoryEntry } from "@/types/api";
import { paths } from "@/app/navigation";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPinnedPatients } from "@/lib/pinnedPatients";
import { Plus } from "lucide-react";

// Initial empty list; will be populated from API
let mockPatients: Patient[] = [];

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
type SchemeOption = typeof SCHEME_OPTIONS[number];

const normalizeScheme = (value?: string): SchemeOption => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) {
    return raw as SchemeOption;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return 'OTHERS';
  }
  return raw ? (raw as SchemeOption) : 'OTHERS';
};

const coerceRoomNumber = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

const normalizeMrnHistory = (history?: MrnHistoryEntry[]): MrnHistoryEntry[] | undefined => {
  if (!history) return undefined;
  return history.map((entry) => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));
};

const enrichPatient = (patient: Patient): Patient => {
  const normalizedHistory = normalizeMrnHistory(patient.mrnHistory);
  const schemeCandidates: Array<string | undefined> = [
    patient.scheme,
    normalizedHistory?.find((entry) => entry.mrn === patient.latestMrn)?.scheme,
    normalizedHistory?.[0]?.scheme,
    (patient as unknown as { registration?: { scheme?: string } }).registration?.scheme,
  ];
  const resolvedScheme = normalizeScheme(schemeCandidates.find(Boolean));
  const roomCandidate = (patient as unknown as {
    roomNumber?: string;
    room_number?: string;
    room?: string;
    registration?: { roomNumber?: string; room_number?: string };
  });
  const resolvedRoom = coerceRoomNumber(
    patient.roomNumber ??
      roomCandidate?.roomNumber ??
      roomCandidate?.room_number ??
      roomCandidate?.room ??
      roomCandidate?.registration?.roomNumber ??
      roomCandidate?.registration?.room_number,
  );
  const procedureName = (patient as any).procedureName ?? (patient as any)?.procedure_name ?? undefined;
  const comorbidityTokens = (patient.comorbidities ?? [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());

  return {
    ...patient,
    scheme: resolvedScheme,
    roomNumber: resolvedRoom,
    mrnHistory: normalizedHistory,
    comorbidities: comorbidityTokens,
    procedureName,
  };
};

// Best-effort timestamp (ms) for when the patient was added
// Priority: earliest MRN history date -> ULID timestamp order (via id lex order)
const getPatientAddedTime = (p: Patient): number => {
  // 1) Earliest MRN history date if present
  const allDates = (p.mrnHistory || [])
    .map((h) => Date.parse(h.date))
    .filter((n) => !Number.isNaN(n));
  if (allDates.length > 0) {
    return Math.min(...allDates);
  }
  // 2) ULID ordering: lexicographic order correlates with time
  // Using the string itself ensures newest first when using localeCompare later
  // Convert to a pseudo-number by hashing first few chars to keep stable ordering
  const id = (p.id || "").toString();
  // Fallback: if id absent, return 0
  if (!id) return 0;
  // Take first 10 chars (time portion for ULID) and map to a numeric value
  // Using base32-like mapping to keep rough chronological order
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let acc = 0;
  for (let i = 0; i < Math.min(10, id.length); i++) {
    const ch = id[i];
    const idx = alphabet.indexOf(ch.toUpperCase());
    acc = acc * 32 + (idx >= 0 ? idx : 0);
  }
  return acc;
};

export default function PatientsList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showNotifications, setShowNotifications] = useState(false);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>(
    () => (localStorage.getItem('patientViewMode') as 'list' | 'grid') || 'list'
  );
  const currentDoctorId = 'doc-abc123';

  // Scroll restoration between list and details
  const SCROLL_KEY = 'patientsListScrollY';
  const SCROLL_RESTORE_FLAG = 'patientsListRestore';
  const [restorePending, setRestorePending] = useState<boolean>(() => sessionStorage.getItem(SCROLL_RESTORE_FLAG) === '1');
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
        mockPatients = withUi;
        // Cache for Dashboard reuse
        try {
          localStorage.setItem('patientsCache', JSON.stringify({ ts: Date.now(), items: withUi }));
        } catch {}

        // If user navigated back from a patient details page, restore scroll
        if (restorePending && !Number.isNaN(savedScroll) && savedScroll > 0) {
          // Use rAF to ensure DOM is painted
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

  // Handle URL parameters for stage filtering (new compact stage names)
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      // Accept compact tokens directly
      const mappedStage = stageParam;
      setSelectedStage(mappedStage);
    }
  }, [searchParams]);


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
    const pinnedPatientIds = getPinnedPatients().map(p => p.id);
    
    const filtered = patients.filter(patient => {
      const matchesSearch =
        (patient.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.diagnosis ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPathway = selectedPathway === 'all' || patient.pathway === selectedPathway;
      // Stage alias matching from compact tokens to legacy/current values
      const stageAliases: Record<string, string[]> = {
        onboarding: ['onboarding'],
        preop: ['preop', 'pre-op'],
        intraop: ['intraop', 'intra-op', 'surgery'],
        postop: ['postop', 'post-op', 'recovery', 'stable'],
        'discharge-init': ['discharge-init', 'discharge init'],
        discharge: ['discharge'],
      };
      const matchesStage =
        selectedStage === 'all' ||
        stageAliases[selectedStage]?.includes((patient.currentState || '').toLowerCase()) ||
        (patient.currentState || '').toLowerCase() === selectedStage;
      const matchesUrgent = !showUrgentOnly || patient.updateCounter > 5;
      
      // Filter logic based on tab
      let matchesTab = true;
      if (tabFilter === 'my') {
        // Show pinned patients in My Patients tab
        matchesTab = pinnedPatientIds.includes(patient.id);
      }
      
      return matchesSearch && matchesPathway && matchesStage && matchesUrgent && matchesTab;
    });

    // Sort: pinned first, then by added time (newest first)
    return filtered.sort((a, b) => {
      const aIsPinned = pinnedPatientIds.includes(a.id);
      const bIsPinned = pinnedPatientIds.includes(b.id);
      if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;

      // Within same pin group, sort by added time desc (newest first)
      const aAdded = getPatientAddedTime(a);
      const bAdded = getPatientAddedTime(b);
      if (aAdded !== bAdded) return bAdded - aAdded;

      // Stable fallback: id desc (ULID chronological)
      return b.id.localeCompare(a.id);
    });
  };

  const filteredPatients = getFilteredPatients(activeTab);

  // Navigate helper that saves scroll before moving to patient details
  const openPatient = (id: string) => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY || window.pageYOffset || 0));
      sessionStorage.setItem(SCROLL_RESTORE_FLAG, '1');
    } catch {}
    navigate(paths.patient(id));
  };

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
                    onClick={() => openPatient(patient.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getFilteredPatients('all').map((patient) => (
                  <PatientGridCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => openPatient(patient.id)}
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
                    onClick={() => openPatient(patient.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {getFilteredPatients('my').map((patient) => (
                  <PatientGridCard
                    key={patient.id}
                    patient={patient}
                    onClick={() => openPatient(patient.id)}
                  />
                ))}
              </div>
            )}

            {getFilteredPatients('my').length === 0 && (
              <div className="text-center py-12">
                {getActiveFiltersCount() > 0 || searchQuery ? (
                  <>
                    <p className="text-muted-foreground">No pinned patients matching your criteria</p>
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
                  <>
                    <p className="text-muted-foreground mb-2">No patients pinned yet</p>
                    <p className="text-sm text-muted-foreground">Pin patients you care about using the 3-dot menu on any patient card</p>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
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
