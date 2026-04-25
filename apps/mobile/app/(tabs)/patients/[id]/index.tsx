import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  BackHandler,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, Plus, X } from 'lucide-react-native';
import { PatientActionsSheet } from '../../../../src/components/PatientActionsSheet';
import { usePatient } from '../../../../src/hooks/usePatients';
import { TAB_BAR_HIDDEN_STYLE, getTabBarVisibleStyle } from '../../../../src/navigation/tabBarStyle';

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
  const [actionsVisible, setActionsVisible] = useState(false);
  const lastScrollOffsetRef = useRef(0);
  const tabBarVisibleStyle = useMemo(
    () => getTabBarVisibleStyle(insets.bottom),
    [insets.bottom],
  );

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: isTabBarHidden ? TAB_BAR_HIDDEN_STYLE : tabBarVisibleStyle,
    });
  }, [isTabBarHidden, navigation, tabBarVisibleStyle]);

  useEffect(() => {
    return () => {
      navigation.setOptions({ tabBarStyle: tabBarVisibleStyle });
    };
  }, [navigation, tabBarVisibleStyle]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/patients' as never);
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [router]);

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

  const handleAction = useCallback(
    (actionId: string, pid: string) => {
      setActionsVisible(false);
      switch (actionId) {
        case 'progress-notes':
        case 'discharge-summary':
        case 'initial-assessment':
        case 'ot-notes':
        case 'past-records':
        case 'results':
          router.push(`/patient/${pid}/documents` as never);
          break;
        default:
          Alert.alert(
            'Coming Soon',
            `The "${actionId.replace(/-/g, ' ')}" feature is not available yet.`,
          );
          break;
      }
    },
    [router],
  );

  const contentBottomPadding = isTabBarHidden
    ? Math.max(insets.bottom + 20, 24)
    : Math.max(insets.bottom + 80, 96);
  const { height: screenHeight } = useWindowDimensions();
  // FAB fixed at 120px from screen bottom — never moves regardless of tab bar
  const fabTop = screenHeight - insets.top - 120;

  if (!patientId) return null;

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: contentBottomPadding }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
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

      <Pressable
        style={[styles.fab, { top: fabTop }]}
        onPress={() => setActionsVisible((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={actionsVisible ? 'Close actions' : 'Open actions'}
      >
        {actionsVisible ? <X size={24} color="#fff" /> : <Plus size={24} color="#fff" />}
      </Pressable>

      <PatientActionsSheet
        visible={actionsVisible}
        patientId={patientId}
        onClose={() => setActionsVisible(false)}
        onAction={handleAction}
      />
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
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
