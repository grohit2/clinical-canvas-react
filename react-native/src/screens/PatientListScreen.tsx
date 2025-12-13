import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Header, PatientCard, FilterChip } from '../components';
import { Patient, Stage, Pathway } from '../types/patient';
import patientApi from '../services/api';

// Types
type TabType = 'all' | 'my';

interface PatientListScreenProps {
  navigation: {
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// Stages for filtering
const stages: { value: Stage; label: string }[] = [
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'preop', label: 'Pre-Op' },
  { value: 'intraop', label: 'OT' },
  { value: 'postop', label: 'Post-Op' },
  { value: 'discharge-init', label: 'Discharge Init' },
  { value: 'discharge', label: 'Discharge' },
];

// Pathways for filtering
const pathways: { value: Pathway; label: string }[] = [
  { value: 'surgical', label: 'Surgical' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'emergency', label: 'Emergency' },
];

export function PatientListScreen({ navigation }: PatientListScreenProps) {
  // State
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const [showUrgentOnly, setShowUrgentOnly] = useState(false);

  // Pinned patients (for "My Patients" tab)
  const [pinnedPatientIds, setPinnedPatientIds] = useState<Set<string>>(new Set());

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      setError(null);
      const data = await patientApi.getPatients();
      setPatients(data);
    } catch (err) {
      setError('Failed to load patients. Please try again.');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatients();
  }, [fetchPatients]);

  // Filter patients
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Filter by tab
    if (activeTab === 'my') {
      result = result.filter(p => pinnedPatientIds.has(p.id));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.latestMrn?.toLowerCase().includes(query) ||
          p.diagnosis?.toLowerCase().includes(query)
      );
    }

    // Filter by stage
    if (selectedStage) {
      result = result.filter(p => p.currentState === selectedStage);
    }

    // Filter by pathway
    if (selectedPathway) {
      result = result.filter(p => p.pathway === selectedPathway);
    }

    // Filter by urgent
    if (showUrgentOnly) {
      result = result.filter(p => p.isUrgent);
    }

    return result;
  }, [patients, activeTab, pinnedPatientIds, searchQuery, selectedStage, selectedPathway, showUrgentOnly]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSelectedStage(null);
    setSelectedPathway(null);
    setShowUrgentOnly(false);
  }, []);

  // Navigate to patient details
  const handlePatientPress = useCallback(
    (patient: Patient) => {
      navigation.navigate('PatientDetail', { patientId: patient.id });
    },
    [navigation]
  );

  // Toggle pin
  const togglePin = useCallback((patientId: string) => {
    setPinnedPatientIds(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  }, []);

  // Render patient item
  const renderPatient = useCallback(
    ({ item }: { item: Patient }) => (
      <PatientCard patient={item} onPress={() => handlePatientPress(item)} />
    ),
    [handlePatientPress]
  );

  // Render empty state
  const renderEmptyState = () => {
    const hasFilters = searchQuery || selectedStage || selectedPathway || showUrgentOnly;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{"📋"}</Text>
        <Text style={styles.emptyTitle}>
          {activeTab === 'my'
            ? 'No Pinned Patients'
            : hasFilters
            ? 'No Results Found'
            : 'No Patients'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'my'
            ? 'Pin patients from the All Patients tab to see them here'
            : hasFilters
            ? 'Try adjusting your filters or search query'
            : 'Patients will appear here once added'}
        </Text>
        {hasFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedStage) count++;
    if (selectedPathway) count++;
    if (showUrgentOnly) count++;
    return count;
  }, [selectedStage, selectedPathway, showUrgentOnly]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading patients...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchPatients}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title="Patients"
        showSearch
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Patients
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my' && styles.activeTab]}
          onPress={() => setActiveTab('my')}
        >
          <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
            My Patients
          </Text>
          {pinnedPatientIds.size > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{pinnedPatientIds.size}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {/* Urgent Filter */}
          <FilterChip
            label={showUrgentOnly ? 'Urgent ✓' : 'Urgent'}
            isActive={showUrgentOnly}
            onPress={() => setShowUrgentOnly(!showUrgentOnly)}
          />

          {/* Stage Filters */}
          {stages.map(stage => (
            <FilterChip
              key={stage.value}
              label={stage.label}
              isActive={selectedStage === stage.value}
              onPress={() =>
                setSelectedStage(selectedStage === stage.value ? null : stage.value)
              }
            />
          ))}

          {/* Pathway Filters */}
          {pathways.map(pathway => (
            <FilterChip
              key={pathway.value}
              label={pathway.label}
              isActive={selectedPathway === pathway.value}
              onPress={() =>
                setSelectedPathway(selectedPathway === pathway.value ? null : pathway.value)
              }
            />
          ))}
        </ScrollView>

        {/* Results count */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
          </Text>
          {activeFiltersCount > 0 && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>
                Clear {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Patient List */}
      <FlatList
        data={filteredPatients}
        keyExtractor={item => item.id}
        renderItem={renderPatient}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        contentContainerStyle={[
          styles.listContent,
          filteredPatients.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Add Patient */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddPatient')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  tabBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  filtersSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersScroll: {
    paddingHorizontal: 16,
  },
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100, // Space for FAB
  },
  emptyListContent: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  clearButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
    lineHeight: 32,
  },
});

export default PatientListScreen;
