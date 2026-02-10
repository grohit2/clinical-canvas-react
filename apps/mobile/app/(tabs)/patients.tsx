import { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Search, Plus, Filter, X, FileText, Pin, MoreVertical } from 'lucide-react-native';
import { usePatients } from '../../src/hooks/usePatients';
import { usePatientsFilters } from '../../src/hooks/usePatientsFilters';
import { usePinnedPatients } from '../../src/hooks/usePinnedPatients';
import {
  parseComorbidities,
  getDaysSinceSurgery,
  getStageLabel,
  getStageVariant,
} from '@clinical-canvas/core';
import type { Patient } from '@clinical-canvas/core';

type TabFilter = 'all' | 'my';

const stageColors: Record<string, { bg: string; text: string }> = {
  default: { bg: '#dbeafe', text: '#1e40af' },
  urgent: { bg: '#fee2e2', text: '#991b1b' },
  caution: { bg: '#fef3c7', text: '#92400e' },
  stable: { bg: '#dcfce7', text: '#166534' },
};

const borderColors: Record<string, string> = {
  default: '#3b82f6',
  urgent: '#ef4444',
  caution: '#f59e0b',
  stable: '#22c55e',
};

function PatientCard({
  patient,
  isPinned,
  onPress,
}: {
  patient: Patient;
  isPinned: boolean;
  onPress: () => void;
}) {
  const activeScheme = (() => {
    const candidates = [
      patient.scheme,
      patient.mrnHistory?.find((e) => e.mrn === patient.latestMrn)?.scheme,
      patient.mrnHistory?.[0]?.scheme,
    ];
    const resolved = candidates.find(Boolean);
    return resolved ? resolved.toUpperCase() : undefined;
  })();

  const roomNumber = patient.roomNumber?.trim();
  const showRoom = roomNumber && activeScheme && ['EHS', 'PAID'].includes(activeScheme);
  const daysSinceSurgery = getDaysSinceSurgery(patient.surgeryDate);
  const comorbidities = parseComorbidities(patient.comorbidities);
  const stageLabel = getStageLabel(patient.currentState || '');
  const variant = getStageVariant(patient.currentState || '');
  const stageStyle = stageColors[variant];
  const borderColor = borderColors[variant];

  return (
    <Pressable onPress={onPress}>
      <View style={[styles.patientCard, { borderLeftColor: borderColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.patientName} numberOfLines={1}>
              {patient.name}
            </Text>
            <Text style={styles.patientMrn}>
              MRN: {patient.latestMrn ?? ''}
              {activeScheme && (
                <Text style={styles.schemeText}> • {activeScheme}</Text>
              )}
              {showRoom && ` • R# ${roomNumber}`}
            </Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {daysSinceSurgery > 0 && (
              <View style={styles.daysBadge}>
                <Text style={styles.daysText}>D+{daysSinceSurgery}</Text>
              </View>
            )}
            <View style={[styles.stageBadge, { backgroundColor: stageStyle.bg }]}>
              <Text style={[styles.stageText, { color: stageStyle.text }]}>
                {stageLabel}
              </Text>
            </View>
            {isPinned && <Pin size={16} color="#3b82f6" fill="#3b82f6" />}
          </View>
        </View>

        <View style={styles.diagnosisRow}>
          <FileText size={16} color="#9ca3af" />
          <Text style={styles.diagnosisText} numberOfLines={1}>
            {patient.diagnosis || 'No diagnosis recorded'}
          </Text>
        </View>

        <View style={styles.comorbiditySection}>
          <Text style={styles.comorbidityLabel}>Comorbidities</Text>
          {comorbidities.length > 0 ? (
            <View style={styles.comorbidityList}>
              {comorbidities.slice(0, 4).map((c) => (
                <View key={c} style={styles.comorbidityBadge}>
                  <Text style={styles.comorbidityText}>{c}</Text>
                </View>
              ))}
              {comorbidities.length > 4 && (
                <Text style={styles.moreText}>+{comorbidities.length - 4}</Text>
              )}
            </View>
          ) : (
            <Text style={styles.emptyComorbidity}>Not recorded</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export default function PatientsScreen() {
  const router = useRouter();
  const { data: patients = [], isLoading, refetch, isRefetching } = usePatients();
  const filters = usePatientsFilters();
  const { isPinned, togglePin } = usePinnedPatients();
  const [activeTab, setActiveTab] = useState<TabFilter>('all');

  const filteredPatients = useMemo(() => {
    return filters.filterPatients(patients as Patient[]);
  }, [patients, filters]);

  const hasFilters = filters.activeFiltersCount > 0 || filters.searchQuery !== '';

  const handleClearAll = () => {
    filters.setSearchQuery('');
    filters.clearFilters();
  };

  const renderPatient = ({ item }: { item: Patient }) => (
    <View style={styles.patientItem}>
      <PatientCard
        patient={item}
        isPinned={isPinned(item.id)}
        onPress={() => router.push(`/patients/${item.id}` as never)}
      />
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>
        {hasFilters ? 'No patients match your filters' : 'No patients found'}
      </Text>
      {hasFilters && (
        <Pressable onPress={handleClearAll}>
          <Text style={styles.clearFiltersText}>Clear all filters</Text>
        </Pressable>
      )}
      {!hasFilters && (
        <Pressable
          style={styles.sandboxButton}
          onPress={() => router.push('/patient/local-demo/documents' as never)}
        >
          <Text style={styles.sandboxButtonText}>Open Documents Sandbox</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Patients</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search patients..."
            placeholderTextColor="#9ca3af"
            value={filters.searchQuery}
            onChangeText={filters.setSearchQuery}
          />
          {filters.searchQuery.length > 0 && (
            <Pressable onPress={() => filters.setSearchQuery('')}>
              <X size={20} color="#6b7280" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.tabContainer}>
        <Pressable
          onPress={() => {
            setActiveTab('all');
            filters.setActiveTab('all');
          }}
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Patients
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setActiveTab('my');
            filters.setActiveTab('my');
          }}
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Patients
          </Text>
        </Pressable>
      </View>

      <View style={styles.filterBar}>
        <Text style={styles.countText}>
          {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </Text>
        {filters.activeFiltersCount > 0 && (
          <Pressable onPress={filters.clearFilters}>
            <Text style={styles.clearText}>Clear filters</Text>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/patients/register' as never)}
      >
        <Plus size={24} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontWeight: '500',
    color: '#4b5563',
  },
  activeTabText: {
    color: '#fff',
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  countText: {
    fontSize: 14,
    color: '#64748b',
  },
  clearText: {
    fontSize: 14,
    color: '#2563eb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  patientItem: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  patientCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  patientMrn: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  schemeText: {
    color: '#059669',
    fontWeight: '600',
  },
  daysBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  daysText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1e40af',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  stageText: {
    fontSize: 10,
    fontWeight: '600',
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  diagnosisText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#374151',
  },
  comorbiditySection: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  comorbidityLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comorbidityList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  comorbidityBadge: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  comorbidityText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1e40af',
  },
  moreText: {
    fontSize: 11,
    color: '#64748b',
    alignSelf: 'center',
  },
  emptyComorbidity: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4b5563',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 16,
  },
  sandboxButton: {
    marginTop: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sandboxButtonText: {
    color: '#1d4ed8',
    fontWeight: '700',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
