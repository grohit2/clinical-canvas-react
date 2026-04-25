import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import type { DocumentsApi } from '../../api/documentsApi';
import { DOC_CATEGORIES, CATEGORY_LABELS } from '../../core/categories';
import { CATEGORY_META } from '../../core/categoryMeta';
import type { DocCategory, DocumentItem } from '../../core/types';
import { getDocumentKind, isVideoByMimeOrExt } from '../../core/utils';
import { useCategoryDocuments } from '../hooks/useCategoryDocuments';
import { useDocumentFolders } from '../hooks/useDocumentFolders';
import { MoveDocumentModal } from '../components/MoveDocumentModal.native';

// ---------------------------------------------------------------------------
// Abbreviations for left-panel labels
// ---------------------------------------------------------------------------

const CATEGORY_ABBREVIATIONS: Record<DocCategory, string> = {
  preop_pics: 'PRE',
  lab_reports: 'LAB',
  radiology: 'RAD',
  intraop_pics: 'INT',
  ot_notes: 'OT',
  postop_pics: 'POST',
  discharge_pics: 'DIS',
  unorganized: 'UNS',
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LEFT_PANEL_WIDTH = 60;
const TILE_GAP = 2;
const SECTION_HORIZONTAL_PADDING = 4;
const GRID_COLUMNS = 3;
const SCROLL_OFFSET_THRESHOLD = 40;
const PROGRAMMATIC_SCROLL_LOCK_MS = 500;
const SCROLL_THROTTLE_MS = 80;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveThumbUri(document: DocumentItem): string | undefined {
  if (document.geo) {
    return document.localUri || document.fileUrl || document.thumbUrl || document.localThumbUri;
  }
  return document.localThumbUri || document.thumbUrl || document.localUri || document.fileUrl;
}

function toKindLabel(document: DocumentItem): string {
  const kind = getDocumentKind(document.contentType, document.name);
  if (kind === 'video') return 'VIDEO';
  if (kind === 'pdf') return 'PDF';
  if (kind === 'word') return 'WORD';
  if (kind === 'spreadsheet') return 'SHEET';
  if (kind === 'presentation') return 'SLIDE';
  if (kind === 'dicom') return 'DICOM';
  if (kind === 'text') return 'TEXT';
  return 'FILE';
}

// ---------------------------------------------------------------------------
// Hook: fetch documents for all categories
// ---------------------------------------------------------------------------

function useAllCategoryDocuments(patientId: string) {
  const preopQuery = useCategoryDocuments(patientId, 'preop_pics');
  const labQuery = useCategoryDocuments(patientId, 'lab_reports');
  const radioQuery = useCategoryDocuments(patientId, 'radiology');
  const intraQuery = useCategoryDocuments(patientId, 'intraop_pics');
  const otQuery = useCategoryDocuments(patientId, 'ot_notes');
  const postQuery = useCategoryDocuments(patientId, 'postop_pics');
  const dischargeQuery = useCategoryDocuments(patientId, 'discharge_pics');
  const unorgQuery = useCategoryDocuments(patientId, 'unorganized');

  const queries: Record<DocCategory, ReturnType<typeof useCategoryDocuments>> = {
    preop_pics: preopQuery,
    lab_reports: labQuery,
    radiology: radioQuery,
    intraop_pics: intraQuery,
    ot_notes: otQuery,
    postop_pics: postQuery,
    discharge_pics: dischargeQuery,
    unorganized: unorgQuery,
  };

  const isLoading = Object.values(queries).some((q) => q.isLoading);
  const isFetching = Object.values(queries).some((q) => q.isFetching);

  const documentsByCategory = useMemo(() => {
    const map: Record<DocCategory, DocumentItem[]> = {} as Record<DocCategory, DocumentItem[]>;
    for (const category of DOC_CATEGORIES) {
      map[category] = queries[category].data || [];
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preopQuery.data,
    labQuery.data,
    radioQuery.data,
    intraQuery.data,
    otQuery.data,
    postQuery.data,
    dischargeQuery.data,
    unorgQuery.data,
  ]);

  return { documentsByCategory, isLoading, isFetching };
}

// ---------------------------------------------------------------------------
// Mini thumbnail card (inline, simplified from DocumentCard)
// ---------------------------------------------------------------------------

function MiniDocumentCard({
  document,
  tileSize,
  onPress,
  onLongPress,
}: {
  document: DocumentItem;
  tileSize: number;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const sourceUri = resolveThumbUri(document);
  const isVideo = isVideoByMimeOrExt(document.contentType, document.name);
  const hasVisualPreview = !!sourceUri && (document.isImage || isVideo);
  const kindLabel = toKindLabel(document);

  return (
    <Pressable
      style={[styles.thumbnailCard, { width: tileSize, height: tileSize }]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {hasVisualPreview ? (
        <Image source={{ uri: sourceUri }} style={styles.thumbnailImage} contentFit="cover" />
      ) : (
        <View style={styles.thumbnailFallback}>
          <Text style={styles.thumbnailFileType}>{kindLabel}</Text>
          <Text style={styles.thumbnailFileName} numberOfLines={2}>
            {document.name}
          </Text>
        </View>
      )}

      {isVideo && hasVisualPreview ? (
        <View pointerEvents="none" style={styles.playBadge}>
          <Text style={styles.playIcon}>&#9654;</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Document grid for a single category section
// ---------------------------------------------------------------------------

function CategorySection({
  category,
  documents,
  tileSize,
  onDocumentPress,
  onDocumentLongPress,
  onLayout,
}: {
  category: DocCategory;
  documents: DocumentItem[];
  tileSize: number;
  onDocumentPress?: (doc: DocumentItem) => void;
  onDocumentLongPress?: (doc: DocumentItem) => void;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const meta = CATEGORY_META[category];
  const label = CATEGORY_LABELS[category] || meta.title;
  const count = documents.length;

  return (
    <View style={styles.section} onLayout={onLayout}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: meta.gradientFrom }]} />
        <Text style={styles.sectionTitle}>{label}</Text>
        <View style={styles.sectionCountBadge}>
          <Text style={styles.sectionCountText}>{count}</Text>
        </View>
      </View>

      {count > 0 ? (
        <View style={styles.grid}>
          {documents.map((doc) => (
            <MiniDocumentCard
              key={doc.id}
              document={doc}
              tileSize={tileSize}
              onPress={() => onDocumentPress?.(doc)}
              onLongPress={() => onDocumentLongPress?.(doc)}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptySectionText}>No documents</Text>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Left panel tab item
// ---------------------------------------------------------------------------

function CategoryTab({
  category,
  count,
  isActive,
  onPress,
}: {
  category: DocCategory;
  count: number;
  isActive: boolean;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[category];
  const abbreviation = CATEGORY_ABBREVIATIONS[category];

  return (
    <Pressable
      style={[styles.tabItem, styles.tabItemBorder, isActive ? styles.tabItemActive : undefined]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Jump to ${meta.title}`}
    >
      <View
        style={[
          styles.tabIndicatorStrip,
          isActive
            ? { backgroundColor: meta.gradientFrom }
            : { backgroundColor: 'transparent' },
        ]}
      />
      <Text
        style={[
          styles.tabLabel,
          isActive ? { color: meta.gradientFrom, fontWeight: '800' } : undefined,
        ]}
      >
        {abbreviation}
      </Text>
      {count > 0 ? (
        <View
          style={[
            styles.tabBadge,
            isActive ? { backgroundColor: meta.gradientFrom } : undefined,
          ]}
        >
          <Text style={[styles.tabBadgeText, isActive ? { color: '#ffffff' } : undefined]}>
            {count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DocumentCollectionView({
  patientId,
  documentsApi: _documentsApi,
  onDocumentPress,
  onMoveDocument,
}: {
  patientId: string;
  documentsApi: DocumentsApi;
  onDocumentPress?: (doc: DocumentItem, category: DocCategory) => void;
  onMoveDocument?: (doc: DocumentItem, toCategory: DocCategory) => void;
}) {
  const [moveModalDoc, setMoveModalDoc] = useState<DocumentItem | null>(null);
  const { width } = useWindowDimensions();
  const rightPanelWidth = width - LEFT_PANEL_WIDTH;
  const tileSize = Math.max(
    48,
    Math.floor(
      (rightPanelWidth - SECTION_HORIZONTAL_PADDING * 2 - TILE_GAP * (GRID_COLUMNS - 1)) /
        GRID_COLUMNS
    )
  );

  // Data fetching
  const foldersQuery = useDocumentFolders(patientId);
  const { documentsByCategory, isLoading } = useAllCategoryDocuments(patientId);

  const folderCountMap = useMemo(() => {
    const map: Record<DocCategory, number> = {} as Record<DocCategory, number>;
    for (const category of DOC_CATEGORIES) {
      map[category] = 0;
    }
    if (foldersQuery.data) {
      for (const folder of foldersQuery.data) {
        map[folder.category] = folder.count;
      }
    }
    return map;
  }, [foldersQuery.data]);

  // Scroll sync state
  const scrollViewRef = useRef<ScrollView | null>(null);
  const sectionPositions = useRef<Map<DocCategory, number>>(new Map());
  const isProgrammaticScroll = useRef(false);
  const lockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const throttleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRecomputeRef = useRef(0);
  const [activeCategory, setActiveCategory] = useState<DocCategory>(DOC_CATEGORIES[0]);
  const activeCategoryRef = useRef<DocCategory>(activeCategory);

  // Keep ref in sync
  activeCategoryRef.current = activeCategory;

  const registerSectionPosition = useCallback(
    (category: DocCategory) => (event: LayoutChangeEvent) => {
      sectionPositions.current.set(category, event.nativeEvent.layout.y);
    },
    []
  );

  const clearProgrammaticLock = useCallback(() => {
    isProgrammaticScroll.current = false;
  }, []);

  const computeActiveCategory = useCallback(
    (scrollY: number) => {
      if (isProgrammaticScroll.current) return;

      const threshold = scrollY + SCROLL_OFFSET_THRESHOLD;
      let nextCategory = activeCategoryRef.current;
      let highestY = -Infinity;

      for (const category of DOC_CATEGORIES) {
        const sectionY = sectionPositions.current.get(category);
        if (sectionY === undefined) continue;
        if (sectionY <= threshold && sectionY > highestY) {
          highestY = sectionY;
          nextCategory = category;
        }
      }

      if (nextCategory !== activeCategoryRef.current) {
        activeCategoryRef.current = nextCategory;
        setActiveCategory(nextCategory);
      }
    },
    []
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = event.nativeEvent.contentOffset.y;
      const now = Date.now();

      if (now - lastRecomputeRef.current >= SCROLL_THROTTLE_MS) {
        lastRecomputeRef.current = now;
        computeActiveCategory(scrollY);
        return;
      }

      if (throttleRef.current) clearTimeout(throttleRef.current);
      const waitMs = SCROLL_THROTTLE_MS - (now - lastRecomputeRef.current);
      throttleRef.current = setTimeout(() => {
        lastRecomputeRef.current = Date.now();
        computeActiveCategory(scrollY);
        throttleRef.current = null;
      }, Math.max(waitMs, 0));
    },
    [computeActiveCategory]
  );

  const handleScrollEnd = useCallback(() => {
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }
    clearProgrammaticLock();
  }, [clearProgrammaticLock]);

  const scrollToCategory = useCallback(
    (category: DocCategory) => {
      const sectionY = sectionPositions.current.get(category);
      if (sectionY === undefined || !scrollViewRef.current) return;

      isProgrammaticScroll.current = true;
      activeCategoryRef.current = category;
      setActiveCategory(category);
      scrollViewRef.current.scrollTo({ y: Math.max(sectionY, 0), animated: true });

      if (lockTimeoutRef.current) clearTimeout(lockTimeoutRef.current);
      lockTimeoutRef.current = setTimeout(() => {
        clearProgrammaticLock();
      }, PROGRAMMATIC_SCROLL_LOCK_MS);
    },
    [clearProgrammaticLock]
  );

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Left panel: vertical category tabs */}
      <View style={styles.leftPanel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.leftPanelContent}
          bounces={false}
        >
          {DOC_CATEGORIES.map((category) => (
            <CategoryTab
              key={category}
              category={category}
              count={folderCountMap[category]}
              isActive={activeCategory === category}
              onPress={() => scrollToCategory(category)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Right panel: scrollable document sections */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.rightPanel}
        contentContainerStyle={styles.rightPanelContent}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
      >
        {DOC_CATEGORIES.map((category, index) => (
          <View key={category}>
            <CategorySection
              category={category}
              documents={documentsByCategory[category]}
              tileSize={tileSize}
              onDocumentPress={
                onDocumentPress
                  ? (doc: DocumentItem) => onDocumentPress(doc, category)
                  : undefined
              }
              onDocumentLongPress={onMoveDocument ? setMoveModalDoc : undefined}
              onLayout={registerSectionPosition(category)}
            />
            {index < DOC_CATEGORIES.length - 1 && <View style={styles.sectionDivider} />}
          </View>
        ))}
      </ScrollView>

      <MoveDocumentModal
        visible={!!moveModalDoc}
        document={moveModalDoc}
        onMove={(doc, toCategory) => {
          onMoveDocument?.(doc, toCategory);
          setMoveModalDoc(null);
        }}
        onClose={() => setMoveModalDoc(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },

  // Left panel
  leftPanel: {
    width: LEFT_PANEL_WIDTH,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  leftPanelContent: {
    paddingVertical: 12,
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    flexDirection: 'row',
    gap: 0,
    minHeight: 56,
  },
  tabItemActive: {
    backgroundColor: '#eff6ff',
  },
  tabItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  tabIndicatorStrip: {
    width: 3,
    height: '100%',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  tabLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    letterSpacing: 1,
  },
  tabBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },

  // Right panel
  rightPanel: {
    flex: 1,
  },
  rightPanelContent: {
    paddingTop: 4,
    paddingBottom: 60,
  },

  // Section
  section: {
    paddingHorizontal: SECTION_HORIZONTAL_PADDING,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
  },
  sectionCountBadge: {
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
  },
  emptySection: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 12,
  },

  // Mini document card
  thumbnailCard: {
    borderRadius: 10,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailFallback: {
    flex: 1,
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 2,
  },
  thumbnailFileType: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  thumbnailFileName: {
    fontSize: 9,
    color: '#334155',
    textAlign: 'center',
    fontWeight: '600',
  },
  playBadge: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 24,
    height: 24,
    marginLeft: -12,
    marginTop: -12,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
