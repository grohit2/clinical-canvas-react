import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Patient } from '../types/patient';
import { StageChip } from './StageChip';

interface PatientCardProps {
  patient: Patient;
  onPress?: () => void;
}

const getStageColor = (stage?: string): string => {
  switch (stage?.toLowerCase()) {
    case 'intraop':
    case 'icu':
    case 'critical':
      return '#EF4444'; // red
    case 'postop':
    case 'recovery':
      return '#F59E0B'; // amber
    case 'discharge':
    case 'discharge-init':
      return '#10B981'; // green
    case 'preop':
      return '#3B82F6'; // blue
    default:
      return '#6366F1'; // indigo
  }
};

export function PatientCard({ patient, onPress }: PatientCardProps) {
  const stageColor = getStageColor(patient.currentState);

  // Calculate days since surgery
  const daysSinceSurgery = React.useMemo(() => {
    if (!patient.surgeryDate) return 0;
    const surgeryDate = new Date(patient.surgeryDate);
    if (isNaN(surgeryDate.getTime())) return 0;
    const now = new Date();
    const diffTime = now.getTime() - surgeryDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [patient.surgeryDate]);

  // Get scheme label
  const schemeLabel = React.useMemo(() => {
    if (patient.scheme) return patient.scheme.toUpperCase();
    const latestEntry = patient.mrnHistory?.find(
      entry => entry.mrn === patient.latestMrn
    );
    return latestEntry?.scheme?.toUpperCase() || null;
  }, [patient.scheme, patient.mrnHistory, patient.latestMrn]);

  // Parse comorbidities
  const comorbidities = React.useMemo(() => {
    if (!patient.comorbidities || patient.comorbidities.length === 0) return [];
    return patient.comorbidities
      .flatMap(item =>
        String(item)
          .split(/\s*\+\s*|\s*,\s*/)
          .map(token => token.trim())
          .filter(Boolean)
      )
      .map(token => token.toUpperCase());
  }, [patient.comorbidities]);

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: stageColor }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {/* Update Ring */}
          {patient.updateCounter !== undefined && patient.updateCounter > 0 && (
            <View style={styles.updateRing}>
              <Text style={styles.updateRingText}>{patient.updateCounter}</Text>
            </View>
          )}

          <View style={styles.nameSection}>
            <Text style={styles.name} numberOfLines={1}>
              {patient.name}
            </Text>
            <Text style={styles.mrnText}>
              MRN: {patient.latestMrn || '—'}
              {schemeLabel && (
                <Text style={styles.schemeText}> {'\u2022'} {schemeLabel}</Text>
              )}
              {patient.roomNumber && (
                <Text style={styles.roomText}> {'\u2022'} R# {patient.roomNumber}</Text>
              )}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {daysSinceSurgery > 0 && (
            <View style={styles.daysBadge}>
              <Text style={styles.daysBadgeText}>D+{daysSinceSurgery}</Text>
            </View>
          )}
          <StageChip stage={patient.currentState} size="sm" />
          {patient.isUrgent && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>!</Text>
            </View>
          )}
        </View>
      </View>

      {/* Diagnosis Row */}
      <View style={styles.diagnosisRow}>
        <Text style={styles.diagnosisIcon}>{"📋"}</Text>
        <Text style={styles.diagnosis} numberOfLines={1}>
          {patient.diagnosis || 'No diagnosis recorded'}
        </Text>
      </View>

      {/* Comorbidities Section */}
      <View style={styles.comorbiditiesSection}>
        <Text style={styles.comorbiditiesLabel}>Comorbidities</Text>
        {comorbidities.length > 0 ? (
          <View style={styles.comorbiditiesList}>
            {comorbidities.map((condition, index) => (
              <View key={`${condition}-${index}`} style={styles.comorbidityBadge}>
                <Text style={styles.comorbidityText}>{condition}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noComorbiditiesText}>Not recorded</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: 12,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  updateRing: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  updateRingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  mrnText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  schemeText: {
    color: '#059669',
    fontWeight: '600',
  },
  roomText: {
    color: '#6B7280',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  daysBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  daysBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
  },
  urgentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  urgentText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  diagnosisRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  diagnosisIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  diagnosis: {
    fontSize: 12,
    color: '#374151',
    flex: 1,
  },
  comorbiditiesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    marginHorizontal: -12,
    marginBottom: -12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  comorbiditiesLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  comorbiditiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  comorbidityBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  comorbidityText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#1D4ED8',
  },
  noComorbiditiesText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
});

export default PatientCard;
