import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Users, AlertTriangle, Clock, Calendar } from 'lucide-react-native';
import { useMemo } from 'react';
import { usePatients } from '../../src/hooks/usePatients';
import type { Patient } from '@clinical-canvas/core';

export default function DashboardScreen() {
  const router = useRouter();
  const { data: patients = [], isLoading } = usePatients();

  const kpiData = useMemo(() => {
    const totalPatients = patients.length;
    const urgentAlerts = patients.filter((p: Patient) => p.isUrgent).length;
    return { totalPatients, urgentAlerts };
  }, [patients]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard</Text>
          <Text style={styles.subtitle}>{today}</Text>
        </View>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiRow}>
            <Pressable style={styles.kpiCard} onPress={() => router.push('/patients')}>
              <View style={[styles.iconContainer, { backgroundColor: '#dbeafe' }]}>
                <Users size={20} color="#2563eb" />
              </View>
              <Text style={styles.kpiValue}>
                {isLoading ? '...' : kpiData.totalPatients}
              </Text>
              <Text style={styles.kpiLabel}>Total Patients</Text>
            </Pressable>

            <Pressable style={styles.kpiCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
                <Clock size={20} color="#d97706" />
              </View>
              <Text style={styles.kpiValue}>0</Text>
              <Text style={styles.kpiLabel}>Tasks Due</Text>
            </Pressable>
          </View>

          <View style={styles.kpiRow}>
            <Pressable style={[styles.kpiCard, styles.urgentCard]}>
              <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                <AlertTriangle size={20} color="#dc2626" />
              </View>
              <Text style={[styles.kpiValue, { color: '#dc2626' }]}>
                {isLoading ? '...' : kpiData.urgentAlerts}
              </Text>
              <Text style={styles.kpiLabel}>Urgent Alerts</Text>
            </Pressable>

            <Pressable style={styles.kpiCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
                <Calendar size={20} color="#16a34a" />
              </View>
              <Text style={styles.kpiValue}>-</Text>
              <Text style={styles.kpiLabel}>Procedures Today</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.buttonRow}>
            <Pressable
              style={styles.primaryButton}
              onPress={() => router.push('/patients/register' as never)}
            >
              <Text style={styles.primaryButtonText}>Add Patient</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryButton}
              onPress={() => router.push('/patients')}
            >
              <Text style={styles.secondaryButtonText}>View All</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
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
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  kpiContainer: {
    padding: 16,
    gap: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  quickActions: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#0f172a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '500',
  },
});
