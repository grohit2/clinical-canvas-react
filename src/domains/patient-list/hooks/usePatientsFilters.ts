import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Patient, MrnHistoryEntry } from "@/types/api";
import { getPinnedPatients } from "@shared/lib/pinnedPatients";

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

export const enrichPatient = (patient: Patient): Patient => {
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
const getPatientAddedTime = (p: Patient): number => {
  const allDates = (p.mrnHistory || [])
    .map((h) => Date.parse(h.date))
    .filter((n) => !Number.isNaN(n));
  if (allDates.length > 0) {
    return Math.min(...allDates);
  }
  const id = (p.id || "").toString();
  if (!id) return 0;
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  let acc = 0;
  for (let i = 0; i < Math.min(10, id.length); i++) {
    const ch = id[i];
    const idx = alphabet.indexOf(ch.toUpperCase());
    acc = acc * 32 + (idx >= 0 ? idx : 0);
  }
  return acc;
};

export type TabFilter = 'all' | 'my';

export interface UsePatientsFiltersReturn {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedPathway: string;
  setSelectedPathway: (pathway: string) => void;
  selectedStage: string;
  setSelectedStage: (stage: string) => void;
  showUrgentOnly: boolean;
  setShowUrgentOnly: (urgent: boolean) => void;
  activeTab: TabFilter;
  setActiveTab: (tab: TabFilter) => void;
  activeFiltersCount: number;
  clearFilters: () => void;
  filterPatients: (patients: Patient[]) => Patient[];
}

export function usePatientsFilters(): UsePatientsFiltersReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPathway, setSelectedPathway] = useState('all');
  const [selectedStage, setSelectedStage] = useState('all');
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  // Sync stage from URL params
  useEffect(() => {
    const stageParam = searchParams.get('stage');
    if (stageParam) {
      setSelectedStage(stageParam);
    }
  }, [searchParams]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedPathway !== 'all') count++;
    if (selectedStage !== 'all') count++;
    if (showUrgentOnly) count++;
    return count;
  }, [selectedPathway, selectedStage, showUrgentOnly]);

  const clearFilters = useCallback(() => {
    setSelectedPathway('all');
    setSelectedStage('all');
    setShowUrgentOnly(false);
  }, []);

  const filterPatients = useCallback((patients: Patient[]): Patient[] => {
    const pinnedPatientIds = getPinnedPatients().map(p => p.id);

    const stageAliases: Record<string, string[]> = {
      onboarding: ['onboarding'],
      preop: ['preop', 'pre-op'],
      intraop: ['intraop', 'intra-op', 'surgery'],
      postop: ['postop', 'post-op', 'recovery', 'stable'],
      'discharge-init': ['discharge-init', 'discharge init'],
      discharge: ['discharge'],
    };

    const filtered = patients.filter(patient => {
      const matchesSearch =
        (patient.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (patient.diagnosis ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPathway = selectedPathway === 'all' || patient.pathway === selectedPathway;
      const matchesStage =
        selectedStage === 'all' ||
        stageAliases[selectedStage]?.includes((patient.currentState || '').toLowerCase()) ||
        (patient.currentState || '').toLowerCase() === selectedStage;
      const matchesUrgent = !showUrgentOnly || patient.updateCounter > 5;

      let matchesTab = true;
      if (activeTab === 'my') {
        matchesTab = pinnedPatientIds.includes(patient.id);
      }

      return matchesSearch && matchesPathway && matchesStage && matchesUrgent && matchesTab;
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
  }, [searchQuery, selectedPathway, selectedStage, showUrgentOnly, activeTab]);

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
