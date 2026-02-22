import { forwardRef, useCallback, useMemo, useRef, type MutableRefObject } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, SectionList as SectionListType, ViewToken } from 'react-native';
import { SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { DateSection, YearSummary } from '../../core';
import type { DocumentItem } from '../../core/types';
import { DateSectionHeader } from './DateSectionHeader.native';
import { ThumbnailRow } from './ThumbnailRow.native';
import { YearCardsStrip } from './YearCardsStrip.native';

const TILE_GAP = 2;
const CONTENT_HORIZONTAL_PADDING = 12;

function resolveColumns(width: number): 3 | 4 {
  if (width >= 1100) return 4;
  if (width >= 700) return 3;
  return 3;
}

export interface GridRow {
  rowKey: string;
  items: DocumentItem[];
}

export interface GridSection {
  key: string;
  label: string;
  year: number;
  month: number;
  documentCount: number;
  allDocumentIds: string[];
  data: GridRow[];
}

export type GallerySectionListRef = SectionListType<GridRow, GridSection>;

function chunkIntoRows(documents: DocumentItem[], columns: number): GridRow[] {
  const rows: GridRow[] = [];
  for (let index = 0; index < documents.length; index += columns) {
    const rowItems = documents.slice(index, index + columns);
    rows.push({
      rowKey: `${rowItems[0]?.id || `row-${index}`}-${index}`,
      items: rowItems,
    });
  }
  return rows;
}

export const GalleryGrid = forwardRef<GallerySectionListRef, {
  sections: DateSection[];
  years: YearSummary[];
  currentYear: number;
  selectionMode: boolean;
  selectedIds: Set<string>;
  onPressDocument: (doc: DocumentItem) => void;
  onLongPressDocument: (doc: DocumentItem) => void;
  onToggleDocument: (docId: string) => void;
  onToggleSection: (docIds: string[]) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onVisibleSectionChange?: (sectionIndex: number) => void;
  onYearCardHaptic?: () => void;
  onCurrentYearAction?: () => void;
}>(function GalleryGrid(
  {
    sections,
    years,
    currentYear,
    selectionMode,
    selectedIds,
    onPressDocument,
    onLongPressDocument,
    onToggleDocument,
    onToggleSection,
    onRefresh,
    refreshing,
    onScroll,
    onVisibleSectionChange,
    onYearCardHaptic,
    onCurrentYearAction,
  },
  ref
) {
  const listRef = useRef<SectionListType<GridRow, GridSection> | null>(null) as MutableRefObject<
    SectionListType<GridRow, GridSection> | null
  >;
  const { width } = useWindowDimensions();
  const columns = resolveColumns(width);
  const tileSize = Math.max(
    64,
    (width - CONTENT_HORIZONTAL_PADDING * 2 - TILE_GAP * (columns - 1)) / columns
  );

  const gridSections = useMemo(() => {
    return sections.map<GridSection>((section) => {
      return {
        key: section.key,
        label: section.label,
        year: section.year,
        month: section.month,
        documentCount: section.documents.length,
        allDocumentIds: section.documents.map((item) => item.id),
        data: chunkIntoRows(section.documents, columns),
      };
    });
  }, [columns, sections]);

  const sectionIndexByKeyRef = useRef(new Map<string, number>());
  sectionIndexByKeyRef.current = new Map(gridSections.map((section, index) => [section.key, index]));

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken & { section?: GridSection }> }) => {
      if (!onVisibleSectionChange) return;
      const first = viewableItems.find((item) => item.section?.key);
      if (!first?.section?.key) return;
      const sectionIndex = sectionIndexByKeyRef.current.get(first.section.key);
      if (typeof sectionIndex === 'number') {
        onVisibleSectionChange(sectionIndex);
      }
    }
  );

  const setListRef = useCallback(
    (node: SectionListType<GridRow, GridSection> | null) => {
      listRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref && 'current' in ref) {
        (ref as { current: SectionListType<GridRow, GridSection> | null }).current = node;
      }
    },
    [ref]
  );

  const scrollToYear = useCallback(
    (year: number) => {
      const summary = years.find((item) => item.year === year);
      if (!summary || !listRef.current) return;
      onYearCardHaptic?.();
      listRef.current.scrollToLocation({
        sectionIndex: summary.firstSectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    },
    [onYearCardHaptic, years]
  );

  if (!gridSections.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>No documents yet</Text>
        <Text style={styles.emptySubtitle}>Capture from camera or import from gallery.</Text>
      </View>
    );
  }

  return (
    <SectionList
      ref={setListRef}
      sections={gridSections}
      keyExtractor={(row) => row.rowKey}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.content}
      onRefresh={onRefresh}
      refreshing={!!refreshing}
      onScroll={onScroll}
      scrollEventThrottle={16}
      windowSize={5}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged.current}
      viewabilityConfig={{ itemVisiblePercentThreshold: 35 }}
      ListHeaderComponent={
        <YearCardsStrip
          years={years}
          currentYear={currentYear}
          onYearPress={scrollToYear}
          onCurrentYearAction={onCurrentYearAction}
        />
      }
      renderSectionHeader={({ section }) => {
        const allSelected =
          section.allDocumentIds.length > 0 &&
          section.allDocumentIds.every((docId) => selectedIds.has(docId));

        return (
          <DateSectionHeader
            label={section.label}
            documentCount={section.documentCount}
            selectionMode={selectionMode}
            allSelected={allSelected}
            onToggleAll={() => onToggleSection(section.allDocumentIds)}
          />
        );
      }}
      renderItem={({ item: row }) => (
        <ThumbnailRow
          items={row.items}
          columns={columns}
          tileSize={tileSize}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onPress={onPressDocument}
          onLongPress={onLongPressDocument}
          onToggleDocument={onToggleDocument}
        />
      )}
    />
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: CONTENT_HORIZONTAL_PADDING,
    paddingTop: 6,
    paddingBottom: 32,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
