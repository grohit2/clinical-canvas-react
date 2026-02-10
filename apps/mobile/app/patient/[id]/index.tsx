import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { usePatient } from '../../../src/hooks/usePatients';

export default function PatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const safePatientId = patientId || '';
  const { data: patient } = usePatient(safePatientId);

  if (!patientId) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{patient?.name || 'Patient'}</Text>
        <Text style={styles.subtitle}>ID: {patientId}</Text>
      </View>

      <Pressable
        style={styles.card}
        onPress={() => router.push(`/patient/${patientId}/documents` as never)}
      >
        <View style={styles.iconWrap}>
          <FileText size={20} color="#2563eb" />
        </View>
        <View style={styles.content}>
          <Text style={styles.cardTitle}>Documents</Text>
          <Text style={styles.cardSubtitle}>Offline-first patient document folders and uploads</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    gap: 12,
  },
  header: {
    marginTop: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontWeight: '800',
    color: '#0f172a',
    fontSize: 16,
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: 12,
  },
});
