import { forwardRef, useMemo } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent, SectionList as SectionListType } from 'react-native';
import { Pressable, SectionList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'lucide-react-native';
import type { DateSection } from '../../core';
import type { DocumentItem } from '../../core/types';
import { DateSectionHeader } from './DateSectionHeader.native';
import { ThumbnailRow } from './ThumbnailRow.native';

const TILE_GAP = 2;
const CONTENT_HORIZONTAL_PADDING = 12;
const CAPTURE_CARD_WIDTH = 172;
const CAPTURE_CARD_HEIGHT = 214;

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
  selectionMode: boolean;
  selectedIds: Set<string>;
  onPressDocument: (doc: DocumentItem) => void;
  onLongPressDocument: (doc: DocumentItem) => void;
  onToggleDocument: (docId: string) => void;
  onToggleSection: (docIds: string[]) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onCapturePress?: () => void;
}>(function GalleryGrid(
  {
    sections,
    selectionMode,
    selectedIds,
    onPressDocument,
    onLongPressDocument,
    onToggleDocument,
    onToggleSection,
    onRefresh,
    refreshing,
    onScroll,
    onCapturePress,
  },
  ref
) {
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
      ref={ref}
      sections={gridSections}
      keyExtractor={(row) => row.rowKey}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.content}
      onRefresh={onRefresh}
      refreshing={!!refreshing}
      onScroll={onScroll}
      scrollEventThrottle={16}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      windowSize={5}
      removeClippedSubviews
      ListHeaderComponent={
        onCapturePress ? (
          <View style={styles.captureWrap}>
            <Pressable onPress={onCapturePress} style={styles.captureCardPressable}>
              <LinearGradient
                colors={['#4a7fb5', '#87CEEB', '#B0C4DE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.captureCard}
              >
                <View style={styles.captureContent}>
                  <View style={styles.captureIconWrap}>
                    <Camera size={28} color="#ffffff" />
                    <View style={styles.plusBadge}>
                      <Text style={styles.plusText}>+</Text>
                    </View>
                  </View>
                  <Text style={styles.captureTitle}>Capture</Text>
                  <Text style={styles.captureSubTitle}>Open camera</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>
        ) : null
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
  captureWrap: {
    marginTop: 12,
    marginBottom: 14,
  },
  captureCardPressable: {
    width: CAPTURE_CARD_WIDTH,
    height: CAPTURE_CARD_HEIGHT,
  },
  captureCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 14,
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  captureContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 10,
  },
  captureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  plusBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  plusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 12,
  },
  captureTitle: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 8,
    textShadowColor: 'rgba(15,23,42,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  captureSubTitle: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '700',
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
