import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText } from 'lucide-react-native';
import { usePatient } from '../../../../src/hooks/usePatients';
import { TAB_BAR_HIDDEN_STYLE, TAB_BAR_VISIBLE_STYLE } from '../../../../src/navigation/tabBarStyle';

const SCROLL_DELTA_THRESHOLD = 10;
const SCROLL_TOP_RESET_OFFSET = 8;
const SCROLL_COLLAPSE_OFFSET = 32;

export default function PatientDetailRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = typeof id === 'string' ? id : '';
  const safePatientId = patientId || '';
  const { data: patient } = usePatient(safePatientId);
  const [isTopChromeCollapsed, setIsTopChromeCollapsed] = useState(false);
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);
  const lastScrollOffsetRef = useRef(0);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isTabBarHidden ? TAB_BAR_HIDDEN_STYLE : TAB_BAR_VISIBLE_STYLE,
    });
  }, [isTabBarHidden, navigation]);

  useEffect(() => {
    return () => {
      navigation.setOptions({ tabBarStyle: TAB_BAR_VISIBLE_STYLE });
    };
  }, [navigation]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = Math.max(event.nativeEvent.contentOffset.y, 0);
      const delta = offsetY - lastScrollOffsetRef.current;

      if (offsetY <= SCROLL_TOP_RESET_OFFSET) {
        if (isTopChromeCollapsed) {
          setIsTopChromeCollapsed(false);
        }
        if (isTabBarHidden) {
          setIsTabBarHidden(false);
        }
        lastScrollOffsetRef.current = offsetY;
        return;
      }

      if (delta > SCROLL_DELTA_THRESHOLD && offsetY > SCROLL_COLLAPSE_OFFSET) {
        if (!isTopChromeCollapsed) {
          setIsTopChromeCollapsed(true);
        }
        if (!isTabBarHidden) {
          setIsTabBarHidden(true);
        }
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        if (isTopChromeCollapsed) {
          setIsTopChromeCollapsed(false);
        }
        if (isTabBarHidden) {
          setIsTabBarHidden(false);
        }
      }

      lastScrollOffsetRef.current = offsetY;
    },
    [isTabBarHidden, isTopChromeCollapsed],
  );

  const contentBottomPadding = isTabBarHidden
    ? Math.max(insets.bottom + 20, 24)
    : Math.max(insets.bottom + 80, 96);

  if (!patientId) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: contentBottomPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, isTopChromeCollapsed && styles.headerCollapsed]}>
          <Text style={[styles.title, isTopChromeCollapsed && styles.titleCollapsed]}>
            {patient?.name || 'Patient'}
          </Text>
          {!isTopChromeCollapsed ? (
            <Text style={styles.subtitle}>ID: {patientId}</Text>
          ) : null}
        </View>

        <Pressable style={styles.card} onPress={() => router.push(`/patients/${patientId}/edit` as never)}>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Edit Patient</Text>
            <Text style={styles.cardSubtitle}>Update demographics, registration, and clinical details</Text>
          </View>
        </Pressable>

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
    marginTop: 12,
    marginBottom: 8,
  },
  headerCollapsed: {
    marginTop: 6,
    marginBottom: 4,
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
