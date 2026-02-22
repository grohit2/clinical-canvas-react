import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ImagePlus, MoreVertical, Search, Share2, Trash2 } from 'lucide-react-native';
import type { DocumentsApi } from '../../api/documentsApi';
import type { DocCategory, DocumentItem } from '../../core/types';
import { isVideoByMimeOrExt } from '../../core/utils';
import { AlbumGrid } from '../components/AlbumGrid.native';
import { AllDocumentsBanner } from '../components/AllDocumentsBanner.native';
import { DocumentLightbox } from '../components/DocumentLightbox.native';
import { GalleryGrid } from '../components/GalleryGrid.native';
import { QuickActions } from '../components/QuickActions.native';
import { useAlbumCovers } from '../hooks/useAlbumCovers';
import { useDateGroups } from '../hooks/useDateGroups';
import { useDocumentActions } from '../hooks/useDocumentActions';
import { useDocumentFolders } from '../hooks/useDocumentFolders';
import { useDocumentSync } from '../hooks/useDocumentSync';
import { usePhotoCapture } from '../hooks/usePhotoCapture';

type RootTab = 'activity' | 'collections';

function computeSelection(documents: DocumentItem[], selectedIds: Set<string>): DocumentItem[] {
  const selected: DocumentItem[] = [];
  for (const doc of documents) {
    if (selectedIds.has(doc.id)) {
      selected.push(doc);
    }
  }
  return selected;
}

function resolveThumbnail(document: DocumentItem): string | undefined {
  if (document.geo) {
    return document.localUri || document.fileUrl || document.thumbUrl || document.localThumbUri;
  }
  return document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;
}

function needsOfflineDownload(document: DocumentItem): boolean {
  if (!document.localUri) return true;
  if (
    isVideoByMimeOrExt(document.contentType, document.name) &&
    !document.localThumbUri &&
    !document.thumbUrl
  ) {
    return true;
  }
  return document.offlineState !== 'available_offline';
}

export function DocumentsRootScreen({
  patientId,
  documentsApi,
  patientName,
}: {
  patientId: string;
  documentsApi: DocumentsApi;
  patientName?: string;
}) {
  const router = useRouter();
  const foldersQuery = useDocumentFolders(patientId);
  const dateGroupsQuery = useDateGroups(patientId);
  const coversQuery = useAlbumCovers(patientId);
  const { syncNow, isOnline } = useDocumentSync(patientId, documentsApi);
  const {
    openDocument: openExternalDocument,
    shareDocuments,
    deleteDocuments,
    downloadForOffline,
    downloadProgress,
  } = useDocumentActions(patientId, documentsApi);
  const { captureFromCamera, pickFromGallery } = usePhotoCapture(patientId, 'preop_pics', documentsApi);

  const documents = useMemo(() => dateGroupsQuery.documents || [], [dateGroupsQuery.documents]);
  const imageDocuments = useMemo(
    () => documents.filter((doc) => doc.isImage),
    [documents]
  );
  const sections = dateGroupsQuery.sections;

  const [activeTab, setActiveTab] = useState<RootTab>('activity');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const isTopChromeCollapsed = false;
  const autoDownloadAttemptedIdsRef = useRef<Set<string>>(new Set());

  const selectedDocs = useMemo(
    () => computeSelection(documents, selectedIds),
    [documents, selectedIds]
  );

  const totalDocCount = documents.length;
  const offlineCount = useMemo(
    () => documents.filter((doc) => doc.offlineState === 'available_offline').length,
    [documents]
  );

  const recentThumbs = useMemo(
    () =>
      documents
        .filter((doc) => doc.isImage)
        .map(resolveThumbnail)
        .filter((uri): uri is string => !!uri)
        .slice(0, 5),
    [documents]
  );

  useEffect(() => {
    if (activeTab !== 'activity' && selectionMode) {
      setSelectionMode(false);
      setSelectedIds(new Set());
    }
  }, [activeTab, selectionMode]);

  useEffect(() => {
    if (lightboxIndex === null) return;
    if (lightboxIndex < imageDocuments.length) return;
    setLightboxIndex(null);
  }, [imageDocuments.length, lightboxIndex]);

  useEffect(() => {
    autoDownloadAttemptedIdsRef.current = new Set();
  }, [patientId]);

  useEffect(() => {
    if (!isOnline) return;
    if (downloadProgress.isDownloading) return;
    if (!documents.length) return;

    const pending = documents.filter(
      (doc) => needsOfflineDownload(doc) && !autoDownloadAttemptedIdsRef.current.has(doc.id)
    );
    if (!pending.length) return;

    pending.forEach((doc) => autoDownloadAttemptedIdsRef.current.add(doc.id));
    void downloadForOffline(pending, { silent: true });
  }, [documents, downloadForOffline, downloadProgress.isDownloading, isOnline]);

  const refreshing =
    dateGroupsQuery.isFetching ||
    foldersQuery.isFetching ||
    coversQuery.isFetching;

  const openCategory = useCallback(
    (category: DocCategory) => {
      router.push(`/patient/${patientId}/documents/${category}` as never);
    },
    [patientId, router]
  );

  const clearSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((docId: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  }, []);

  const toggleSection = useCallback((docIds: string[]) => {
    if (!docIds.length) return;
    setSelectionMode(true);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = docIds.every((id) => next.has(id));

      if (allSelected) {
        docIds.forEach((id) => next.delete(id));
      } else {
        docIds.forEach((id) => next.add(id));
      }

      return next;
    });
  }, []);

  const handleDeleteSelected = useCallback(async () => {
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
  }, [clearSelection, deleteDocuments, selectedDocs]);

  const handleShareSelected = useCallback(async () => {
    if (!selectedDocs.length) return;
    await shareDocuments(selectedDocs);
    clearSelection();
  }, [clearSelection, selectedDocs, shareDocuments]);

  const handleDocPress = useCallback(
    async (doc: DocumentItem) => {
      if (selectionMode) {
        toggleSelected(doc.id);
        return;
      }

      if (!doc.isImage) {
        await openExternalDocument(doc);
        return;
      }

      if (!doc.localUri) {
        const result = await downloadForOffline([doc]);
        if (result.failed > 0) return;
      }

      const index = imageDocuments.findIndex((item) => item.id === doc.id);
      if (index >= 0) {
        setLightboxIndex(index);
      }
    },
    [downloadForOffline, imageDocuments, openExternalDocument, selectionMode, toggleSelected]
  );

  const handleDownloadAll = useCallback(async () => {
    await downloadForOffline(documents);
  }, [documents, downloadForOffline]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.header, isTopChromeCollapsed && styles.headerCollapsed]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isTopChromeCollapsed && styles.titleCollapsed]}>Documents</Text>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton} onPress={() => undefined}>
              <Search size={18} color="#0f172a" />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => undefined}>
              <MoreVertical size={18} color="#0f172a" />
            </Pressable>
          </View>
        </View>
        {!isTopChromeCollapsed ? (
          <Text style={styles.subtitle}>{patientName || patientId}</Text>
        ) : null}
      </View>

      {!isTopChromeCollapsed ? (
        <View style={styles.tabs}>
          <Pressable
            style={styles.tab}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Activity</Text>
            {activeTab === 'activity' ? <View style={styles.tabIndicator} /> : null}
          </Pressable>

          <Pressable
            style={styles.tab}
            onPress={() => setActiveTab('collections')}
          >
            <Text style={[styles.tabText, activeTab === 'collections' && styles.tabTextActive]}>
              Collections
            </Text>
            {activeTab === 'collections' ? <View style={styles.tabIndicator} /> : null}
          </Pressable>
        </View>
      ) : null}

      {downloadProgress.isDownloading ? (
        <View style={styles.downloadBanner}>
          <Text style={styles.downloadTitle}>Downloading offline files...</Text>
          <Text style={styles.downloadMeta}>
            {downloadProgress.completed}/{downloadProgress.total}
          </Text>
        </View>
      ) : null}

      {activeTab === 'activity' && selectionMode ? (
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
              style={[
                styles.selectionButton,
                styles.deleteButton,
                selectedDocs.length === 0 ? styles.disabled : undefined,
              ]}
              disabled={selectedDocs.length === 0}
              onPress={handleDeleteSelected}
            >
              <Trash2 size={16} color="#ffffff" />
              <Text style={styles.selectionButtonText}>Delete</Text>
            </Pressable>
            <Pressable style={styles.cancelButton} onPress={clearSelection}>
              <Text style={styles.cancelText}>Done</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeTab === 'activity' ? (
        <View style={styles.activityWrap}>
          {dateGroupsQuery.isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#2563eb" />
            </View>
          ) : sections.length ? (
            <GalleryGrid
              sections={sections}
              selectionMode={selectionMode}
              selectedIds={selectedIds}
              onPressDocument={handleDocPress}
              onLongPressDocument={(doc) => toggleSelected(doc.id)}
              onToggleDocument={toggleSelected}
              onToggleSection={toggleSection}
              onRefresh={syncNow}
              refreshing={refreshing}
              onCapturePress={captureFromCamera}
            />
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📷</Text>
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptySubtitle}>Capture from camera or import from gallery.</Text>
              <View style={styles.emptyActions}>
                <Pressable style={styles.emptyActionButton} onPress={captureFromCamera}>
                  <Camera size={16} color="#1e293b" />
                  <Text style={styles.emptyActionText}>Camera</Text>
                </Pressable>
                <Pressable style={styles.emptyActionButton} onPress={pickFromGallery}>
                  <ImagePlus size={16} color="#1e293b" />
                  <Text style={styles.emptyActionText}>Gallery</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={syncNow} />}
          contentContainerStyle={styles.collectionsContent}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <AllDocumentsBanner
            totalCount={totalDocCount}
            recentThumbs={recentThumbs}
            lastUpdatedAt={documents[0]?.uploadedAt}
            onPress={() => setActiveTab('activity')}
          />

          <AlbumGrid
            summaries={foldersQuery.data || []}
            coverMap={coversQuery.data}
            onOpen={openCategory}
          />

          <QuickActions
            onImportShare={() =>
              router.push(`/import-shared?patientId=${encodeURIComponent(patientId)}` as never)
            }
            onDownloadOffline={handleDownloadAll}
            offlineCount={offlineCount}
            totalCount={totalDocCount}
          />
        </ScrollView>
      )}

      <DocumentLightbox
        visible={lightboxIndex !== null}
        document={lightboxIndex !== null ? imageDocuments[lightboxIndex] : null}
        currentIndex={lightboxIndex || 0}
        totalCount={imageDocuments.length}
        canPrev={lightboxIndex !== null && lightboxIndex > 0}
        canNext={lightboxIndex !== null && lightboxIndex < imageDocuments.length - 1}
        onClose={() => setLightboxIndex(null)}
        onNavigate={(direction) => {
          setLightboxIndex((prev) => {
            if (prev === null) return null;
            if (direction === 'prev') return Math.max(0, prev - 1);
            return Math.min(imageDocuments.length - 1, prev + 1);
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
    justifyContent: 'space-between',
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
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 6,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '24%',
    right: '24%',
    height: 4,
    backgroundColor: '#3b82f6',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  downloadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  downloadTitle: {
    color: '#1e40af',
    fontWeight: '700',
    fontSize: 12,
  },
  downloadMeta: {
    color: '#2563eb',
    fontWeight: '700',
    fontSize: 12,
  },
  selectionBar: {
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
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
    borderRadius: 10,
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  selectionButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancelText: {
    color: '#334155',
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
  activityWrap: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionsContent: {
    paddingTop: 12,
    paddingBottom: 24,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
  },
  emptyActions: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 8,
  },
  emptyActionButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyActionText: {
    color: '#1e293b',
    fontWeight: '700',
  },
});
