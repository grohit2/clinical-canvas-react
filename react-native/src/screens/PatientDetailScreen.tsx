import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Header, StageChip } from '../components';
import { Patient } from '../types/patient';
import patientApi from '../services/api';

interface PatientDetailScreenProps {
  route: {
    params: {
      patientId: string;
    };
  };
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
}

// Stage label mapping
const stageLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  preop: 'Pre-Op',
  intraop: 'OT',
  postop: 'Post-Op',
  'discharge-init': 'Discharge Init',
  discharge: 'Discharge',
};

// Pathway label mapping
const pathwayLabels: Record<string, string> = {
  surgical: 'Surgical',
  consultation: 'Consultation',
  emergency: 'Emergency',
};

export function PatientDetailScreen({ route, navigation }: PatientDetailScreenProps) {
  const { patientId } = route.params;

  // State
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPinned, setIsPinned] = useState(false);

  // Fetch patient
  const fetchPatient = useCallback(async () => {
    try {
      setError(null);
      const data = await patientApi.getPatient(patientId);
      if (data) {
        setPatient(data);
      } else {
        setError('Patient not found');
      }
    } catch (err) {
      setError('Failed to load patient details');
      console.error('Error fetching patient:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPatient();
  }, [fetchPatient]);

  // Toggle pin
  const handlePinToggle = useCallback(() => {
    setIsPinned(prev => !prev);
    // In a real app, this would persist to AsyncStorage or backend
  }, []);

  // Calculate days since surgery
  const daysSinceSurgery = React.useMemo(() => {
    if (!patient?.surgeryDate) return null;
    const surgeryDate = new Date(patient.surgeryDate);
    if (isNaN(surgeryDate.getTime())) return null;
    const now = new Date();
    const diffTime = now.getTime() - surgeryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : null;
  }, [patient?.surgeryDate]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading patient...</Text>
      </View>
    );
  }

  // Error state
  if (error || !patient) {
    return (
      <View style={styles.errorContainer}>
        <Header title="Patient Detail" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.errorContent}>
          <Text style={styles.errorText}>{error || 'Patient not found'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPatient}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Scheme label
  const schemeLabel = patient.scheme?.toUpperCase() || '—';
  const pathwayLabel = pathwayLabels[patient.pathway || ''] || patient.pathway || '—';
  const stageLabel = stageLabels[patient.currentState || ''] || patient.currentState || '—';

  // Comorbidities
  const comorbidities =
    patient.comorbidities
      ?.flatMap(item =>
        String(item)
          .split(/\s*\+\s*|\s*,\s*/)
          .map(token => token.trim())
          .filter(Boolean)
      )
      .map(token => token.toUpperCase()) || [];

  return (
    <View style={styles.container}>
      <Header
        title="Patient Detail"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightElement={
          <TouchableOpacity onPress={handlePinToggle} style={styles.pinButton}>
            <Text style={styles.pinIcon}>{isPinned ? '📌' : '📍'}</Text>
            <Text style={styles.pinText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Patient Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryLeft}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.summaryMeta}>
                MRN: {patient.latestMrn || '—'} {'\u2022'} Scheme: {schemeLabel}
              </Text>
              <Text style={styles.summaryMeta}>Pathway: {pathwayLabel}</Text>
            </View>
            <View style={styles.summaryRight}>
              <StageChip stage={patient.currentState} size="md" />
              {daysSinceSurgery !== null && (
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>D+{daysSinceSurgery}</Text>
                </View>
              )}
            </View>
          </View>

          {patient.isUrgent && (
            <View style={styles.urgentBanner}>
              <Text style={styles.urgentIcon}>⚠️</Text>
              <View style={styles.urgentContent}>
                <Text style={styles.urgentTitle}>Urgent Patient</Text>
                {patient.urgentReason && (
                  <Text style={styles.urgentReason}>{patient.urgentReason}</Text>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Diagnosis Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnosis</Text>
          <View style={styles.sectionContent}>
            <Text style={styles.diagnosisText}>
              {patient.diagnosis || 'No diagnosis recorded'}
            </Text>
          </View>
        </View>

        {/* Patient Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>
          <View style={styles.sectionContent}>
            <View style={styles.infoGrid}>
              <InfoItem label="Age" value={patient.age ? `${patient.age} years` : '—'} />
              <InfoItem label="Sex" value={patient.sex || '—'} />
              <InfoItem label="Room" value={patient.roomNumber || '—'} />
              <InfoItem label="Department" value={patient.department || '—'} />
              <InfoItem label="Assigned Doctor" value={patient.assignedDoctor || '—'} />
              <InfoItem
                label="Surgery Date"
                value={
                  patient.surgeryDate
                    ? new Date(patient.surgeryDate).toLocaleDateString()
                    : '—'
                }
              />
              <InfoItem label="Procedure" value={patient.procedureName || '—'} />
              <InfoItem label="Surgery Code" value={patient.surgeryCode || '—'} />
            </View>
          </View>
        </View>

        {/* Comorbidities Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comorbidities</Text>
          <View style={styles.sectionContent}>
            {comorbidities.length > 0 ? (
              <View style={styles.comorbiditiesList}>
                {comorbidities.map((condition, index) => (
                  <View key={`${condition}-${index}`} style={styles.comorbidityBadge}>
                    <Text style={styles.comorbidityText}>{condition}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No comorbidities recorded</Text>
            )}
          </View>
        </View>

        {/* Vitals Section */}
        {patient.vitals && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vitals</Text>
            <View style={styles.sectionContent}>
              <View style={styles.vitalsGrid}>
                <VitalItem
                  label="Heart Rate"
                  value={patient.vitals.hr}
                  unit="bpm"
                  icon="❤️"
                />
                <VitalItem
                  label="Blood Pressure"
                  value={
                    patient.vitals.systolic && patient.vitals.diastolic
                      ? `${patient.vitals.systolic}/${patient.vitals.diastolic}`
                      : undefined
                  }
                  unit="mmHg"
                  icon="💓"
                />
                <VitalItem
                  label="SpO2"
                  value={patient.vitals.spo2}
                  unit="%"
                  icon="💨"
                />
                <VitalItem
                  label="Temperature"
                  value={patient.vitals.temp || patient.vitals.temperature}
                  unit="°F"
                  icon="🌡️"
                />
              </View>
              {patient.vitals.updatedAt && (
                <Text style={styles.vitalsUpdated}>
                  Last updated: {new Date(patient.vitals.updatedAt).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Emergency Contact Section */}
        {patient.emergencyContact && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Emergency Contact</Text>
            <View style={styles.sectionContent}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{patient.emergencyContact.name}</Text>
                {patient.emergencyContact.relationship && (
                  <Text style={styles.contactDetail}>
                    Relationship: {patient.emergencyContact.relationship}
                  </Text>
                )}
                {patient.emergencyContact.phone && (
                  <TouchableOpacity>
                    <Text style={styles.contactPhone}>
                      📞 {patient.emergencyContact.phone}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionButton
              icon="📄"
              label="Documents"
              onPress={() =>
                navigation.navigate('PatientDocuments', { patientId: patient.id })
              }
            />
            <ActionButton
              icon="✏️"
              label="Edit"
              onPress={() =>
                navigation.navigate('EditPatient', { patientId: patient.id })
              }
            />
            <ActionButton
              icon="📋"
              label="Workflow"
              onPress={() =>
                navigation.navigate('PatientWorkflow', { patientId: patient.id })
              }
            />
            <ActionButton
              icon="📝"
              label="Notes"
              onPress={() =>
                navigation.navigate('PatientNotes', { patientId: patient.id })
              }
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// Info Item Component
interface InfoItemProps {
  label: string;
  value: string;
}

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

// Vital Item Component
interface VitalItemProps {
  label: string;
  value?: number | string;
  unit: string;
  icon: string;
}

function VitalItem({ label, value, unit, icon }: VitalItemProps) {
  return (
    <View style={styles.vitalItem}>
      <Text style={styles.vitalIcon}>{icon}</Text>
      <View>
        <Text style={styles.vitalLabel}>{label}</Text>
        <Text style={styles.vitalValue}>
          {value !== undefined ? `${value} ${unit}` : '—'}
        </Text>
      </View>
    </View>
  );
}

// Action Button Component
interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function ActionButton({ icon, label, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
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
    backgroundColor: '#F3F4F6',
  },
  errorContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  pinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pinIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  pinText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryLeft: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  summaryMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  daysBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  daysBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  urgentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  urgentIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  urgentContent: {
    flex: 1,
  },
  urgentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991B1B',
  },
  urgentReason: {
    fontSize: 12,
    color: '#B91C1C',
    marginTop: 2,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  diagnosisText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
  },
  comorbiditiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  comorbidityBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  comorbidityText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '45%',
    marginBottom: 8,
  },
  vitalIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  vitalLabel: {
    fontSize: 11,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  vitalsUpdated: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 12,
    textAlign: 'right',
  },
  contactInfo: {
    gap: 4,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  contactDetail: {
    fontSize: 13,
    color: '#6B7280',
  },
  contactPhone: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginTop: 4,
  },
  actionsSection: {
    marginTop: 24,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '47%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
});

export default PatientDetailScreen;
