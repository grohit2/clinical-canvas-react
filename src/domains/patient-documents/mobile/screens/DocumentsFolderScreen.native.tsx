import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, RefreshCcw, Share2, Trash2 } from 'lucide-react-native';
import type { DocumentsApi } from '../../api/documentsApi';
import type { DocCategory, DocumentItem } from '../../core/types';
import { CATEGORY_CONFIG } from '../categoryConfig.native';
import { DocumentGrid } from '../components/DocumentGrid.native';
import { DocumentLightbox } from '../components/DocumentLightbox.native';
import { PhotoUploader } from '../components/PhotoUploader.native';
import { useCategoryDocuments } from '../hooks/useCategoryDocuments';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { useDocumentSync } from '../hooks/useDocumentSync';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

const SCROLL_DELTA_THRESHOLD = 10;
const SCROLL_TOP_RESET_OFFSET = 8;
const SCROLL_COLLAPSE_OFFSET = 36;

function computeSelection(documents: DocumentItem[], selectedIds: Set<string>): DocumentItem[] {
  const selected: DocumentItem[] = [];
  for (const doc of documents) {
    if (selectedIds.has(doc.id)) {
      selected.push(doc);
    }
  }
  return selected;
}

export function DocumentsFolderScreen({
  patientId,
  category,
  documentsApi,
}: {
  patientId: string;
  category: DocCategory;
  documentsApi: DocumentsApi;
}) {
  const router = useRouter();
  const docsQuery = useCategoryDocuments(patientId, category);
  const { syncNow, isOnline } = useDocumentSync(patientId, documentsApi);
  const { shareDocument, shareDocuments, deleteDocuments, downloadForOffline, retryFailedUploads } =
    useDocumentActions(patientId, documentsApi, category);
  const { captureFromCamera, pickFromGallery } = usePhotoCapture(patientId, category, documentsApi);

  const documents = useMemo(() => docsQuery.data || [], [docsQuery.data]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isTopChromeCollapsed, setIsTopChromeCollapsed] = useState(false);
  const lastScrollOffsetRef = useRef(0);

  const selectedDocs = useMemo(
    () => computeSelection(documents, selectedIds),
    [documents, selectedIds]
  );

  const config = CATEGORY_CONFIG[category];

  useEffect(() => {
    if (!selectionMode) {
      return;
    }
    setIsTopChromeCollapsed(false);
  }, [selectionMode]);

  const handleGridScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (selectionMode) {
        return;
      }

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
    [isTopChromeCollapsed, selectionMode],
  );

  const toggleSelected = (docId: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (!selectedDocs.length) return;

    Alert.alert('Delete documents', `Delete ${selectedDocs.length} selected file(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteDocuments(selectedDocs);
          clearSelection();
        },
      },
    ]);
  };

  const handleShareSelected = async () => {
    if (!selectedDocs.length) return;
    await shareDocuments(selectedDocs);
    clearSelection();
  };

  const openDocument = async (doc: DocumentItem, index: number) => {
    if (!doc.isImage) {
      await shareDocument(doc);
      return;
    }

    let nextIndex = index;

    if (!doc.localUri) {
      const result = await downloadForOffline([doc]);
      if (result.failed > 0 && !doc.fileUrl) {
        Alert.alert('Preview unavailable', 'Could not download this image for viewing.');
        return;
      }

      if (result.succeeded > 0) {
        const refreshed = await docsQuery.refetch();
        const refreshedDocs = refreshed.data || [];
        const refreshedIndex = refreshedDocs.findIndex((item) => item.id === doc.id);
        if (refreshedIndex >= 0) {
          nextIndex = refreshedIndex;
        }
      }
    }

    setLightboxIndex(nextIndex);
  };

  const failedCount = documents.filter((item) => item.backupState === 'error').length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, isTopChromeCollapsed && styles.headerCollapsed]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#334155" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>{config.title}</Text>
          {!isTopChromeCollapsed ? (
            <Text style={styles.subtitle}>
              {documents.length} documents • {isOnline ? 'Online' : 'Offline'}
            </Text>
          ) : null}
        </View>
        <Pressable
          style={styles.selectButton}
          onPress={() => {
            if (selectionMode) {
              clearSelection();
            } else {
              setSelectionMode(true);
            }
          }}
        >
          <Text style={styles.selectButtonText}>{selectionMode ? 'Done' : 'Select'}</Text>
        </Pressable>
      </View>

      {!isTopChromeCollapsed ? (
        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={async () => {
              await downloadForOffline(documents);
            }}
          >
            <Download size={16} color="#334155" />
            <Text style={styles.actionText}>Download Offline</Text>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={syncNow}>
            <RefreshCcw size={16} color="#334155" />
            <Text style={styles.actionText}>Sync</Text>
          </Pressable>

          {failedCount > 0 ? (
            <Pressable
              style={styles.actionButton}
              onPress={async () => {
                const retried = await retryFailedUploads();
                if (retried > 0) {
                  Alert.alert('Retry started', `Queued ${retried} failed items for retry.`);
                }
              }}
            >
              <Text style={[styles.actionText, styles.warnText]}>Retry Failed ({failedCount})</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {selectionMode ? (
        <View style={styles.selectionBar}>
          <Text style={styles.selectionCount}>{selectedDocs.length} selected</Text>
          <View style={styles.selectionActions}>
            <Pressable
              style={[styles.selectionButton, selectedDocs.length === 0 ? styles.disabled : undefined]}
              disabled={selectedDocs.length === 0}
              onPress={handleShareSelected}
            >
              <Share2 size={16} color="#ffffff" />
              <Text style={styles.selectionButtonText}>Share</Text>
            </Pressable>
            <Pressable
              style={[styles.selectionButton, styles.deleteButton, selectedDocs.length === 0 ? styles.disabled : undefined]}
              disabled={selectedDocs.length === 0}
              onPress={handleDeleteSelected}
            >
              <Trash2 size={16} color="#ffffff" />
              <Text style={styles.selectionButtonText}>Delete</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {!isTopChromeCollapsed ? (
        <PhotoUploader onCamera={captureFromCamera} onGallery={pickFromGallery} />
      ) : null}

      {docsQuery.isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <DocumentGrid
          documents={documents}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleDocument={toggleSelected}
          onPressDocument={openDocument}
          onRefresh={syncNow}
          refreshing={docsQuery.isFetching}
          onScroll={handleGridScroll}
        />
      )}

      <DocumentLightbox
        visible={lightboxIndex !== null}
        document={lightboxIndex !== null ? documents[lightboxIndex] : null}
        currentIndex={lightboxIndex || 0}
        totalCount={documents.length}
        canPrev={lightboxIndex !== null && lightboxIndex > 0}
        canNext={lightboxIndex !== null && lightboxIndex < documents.length - 1}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(direction) => {
          setLightboxIndex((prev) => {
            if (prev === null) return null;
            if (direction === 'prev') return Math.max(0, prev - 1);
            return Math.min(documents.length - 1, prev + 1);
          });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  headerCollapsed: {
    paddingBottom: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  selectButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexWrap: 'wrap',
  },
  actionButton: {
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
  warnText: {
    color: '#b45309',
  },
  selectionBar: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  selectionCount: {
    color: '#334155',
    fontWeight: '700',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  selectionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
