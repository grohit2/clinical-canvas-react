import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import type { DocCategory } from '../core/types';
import { FolderSummaryGrid } from '../components/FolderSummaryGrid';
import { useDocumentFolders } from '../hooks/useDocumentFolders';
import { useDocumentSync } from '../hooks/useDocumentSync';
import { usePatient } from '../../../hooks/usePatients';

const SCROLL_DELTA_THRESHOLD = 10;
const SCROLL_TOP_RESET_OFFSET = 8;
const SCROLL_COLLAPSE_OFFSET = 40;

export function DocumentsRootScreen({ patientId }: { patientId: string }) {
  const router = useRouter();
  const { data: patient } = usePatient(patientId);
  const foldersQuery = useDocumentFolders(patientId);
  const { syncNow, isOnline } = useDocumentSync(patientId);
  const [isTopChromeCollapsed, setIsTopChromeCollapsed] = useState(false);
  const lastScrollOffsetRef = useRef(0);

  const pendingCount = useMemo(
    () => (foldersQuery.data || []).reduce((sum, item) => sum + item.pendingBackupCount, 0),
    [foldersQuery.data]
  );
  const firstPendingCategory = useMemo(
    () => (foldersQuery.data || []).find((item) => item.pendingBackupCount > 0)?.category,
    [foldersQuery.data]
  );

  const openCategory = (category: DocCategory) => {
    router.push(`/patient/${patientId}/documents/${category}` as never);
  };

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
      } else if (delta < -SCROLL_DELTA_THRESHOLD) {
        if (isTopChromeCollapsed) {
          setIsTopChromeCollapsed(false);
        }
      }

      lastScrollOffsetRef.current = offsetY;
    },
    [isTopChromeCollapsed],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={foldersQuery.isFetching} onRefresh={syncNow} />}
      onScroll={handleScroll}
      scrollEventThrottle={16}
    >
      <View style={[styles.header, isTopChromeCollapsed && styles.headerCollapsed]}>
        <Text style={[styles.title, isTopChromeCollapsed && styles.titleCollapsed]}>
          Patient Documents
        </Text>
        {!isTopChromeCollapsed ? (
          <Text style={styles.subtitle}>{patient?.name || patientId}</Text>
        ) : null}
      </View>

      {!isTopChromeCollapsed ? (
        <View style={[styles.onlineBadge, isOnline ? styles.online : styles.offline]}>
          <Text style={styles.onlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </View>
      ) : null}

      {!isTopChromeCollapsed && pendingCount > 0 ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>{pendingCount} items pending backup</Text>
          <Pressable
            onPress={() =>
              router.push(
                `/patient/${patientId}/documents/${firstPendingCategory || 'preop_pics'}` as never
              )
            }
          >
            <Text style={styles.pendingAction}>Open folder</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Folders</Text>
        <Pressable onPress={syncNow}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      </View>

      {foldersQuery.isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#2563eb" size="large" />
        </View>
      ) : (
        <FolderSummaryGrid summaries={foldersQuery.data || []} onOpen={openCategory} />
      )}

      <Pressable
        style={styles.importButton}
        onPress={() => router.push(`/import-shared?patientId=${encodeURIComponent(patientId)}` as never)}
      >
        <Text style={styles.importButtonText}>Import from Share Sheet</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    gap: 4,
  },
  headerCollapsed: {
    gap: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  titleCollapsed: {
    fontSize: 20,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  onlineBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  online: {
    backgroundColor: '#dcfce7',
  },
  offline: {
    backgroundColor: '#fee2e2',
  },
  onlineText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 12,
  },
  pendingBanner: {
    borderRadius: 12,
    backgroundColor: '#ffedd5',
    borderWidth: 1,
    borderColor: '#fdba74',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingText: {
    color: '#9a3412',
    fontWeight: '700',
  },
  pendingAction: {
    color: '#7c2d12',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  refreshText: {
    color: '#2563eb',
    fontWeight: '700',
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  importButton: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
});
