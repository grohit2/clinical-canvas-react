import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FileText } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePatient } from '../../../src/hooks/usePatients';

const SCROLL_DELTA_THRESHOLD = 10;
const SCROLL_TOP_RESET_OFFSET = 8;
const SCROLL_COLLAPSE_OFFSET = 32;

export default function PatientDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const safePatientId = patientId || '';
  const { data: patient } = usePatient(safePatientId);
  const [isTopChromeCollapsed, setIsTopChromeCollapsed] = useState(false);
  const lastScrollOffsetRef = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = Math.max(event.nativeEvent.contentOffset.y, 0);
      const delta = offsetY - lastScrollOffsetRef.current;

      if (offsetY <= SCROLL_TOP_RESET_OFFSET) {
        if (isTopChromeCollapsed) {
          setIsTopChromeCollapsed(false);
        }
        lastScrollOffsetRef.current = offsetY;
        return;
      }

      if (delta > SCROLL_DELTA_THRESHOLD && offsetY > SCROLL_COLLAPSE_OFFSET) {
        if (!isTopChromeCollapsed) {
          setIsTopChromeCollapsed(true);
        }
      } else if (delta < -SCROLL_DELTA_THRESHOLD && isTopChromeCollapsed) {
        setIsTopChromeCollapsed(false);
      }

      lastScrollOffsetRef.current = offsetY;
    },
    [isTopChromeCollapsed],
  );

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/patients' as never);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

  if (!patientId) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, isTopChromeCollapsed && styles.headerCollapsed]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isTopChromeCollapsed && styles.titleCollapsed]} numberOfLines={1}>
            {patient?.name || 'Patient'}
          </Text>
        </View>
        {!isTopChromeCollapsed ? (
          <Text style={styles.subtitle}>ID: {patientId}</Text>
        ) : null}
      </View>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.card}
          onPress={() => router.push(`/patient/${patientId}/documents` as never)}
        >
          <View style={styles.iconWrap}>
            <FileText size={20} color="#2563eb" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Documents</Text>
            <Text style={styles.cardSubtitle}>Offline-first patient document folders and uploads</Text>
          </View>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  headerCollapsed: {
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  titleCollapsed: {
    fontSize: 21,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
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
  cardContent: {
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
