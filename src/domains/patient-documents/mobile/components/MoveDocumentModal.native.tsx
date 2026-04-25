import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ArrowRight, Check } from 'lucide-react-native';
import type { DocCategory, DocumentItem } from '../../core/types';
import { DOC_CATEGORIES, CATEGORY_FULL_LABELS } from '../../core/categories';
import { CATEGORY_META } from '../../core/categoryMeta';
import { CATEGORY_CONFIG } from '../categoryConfig.native';

interface MoveDocumentModalProps {
  visible: boolean;
  document: DocumentItem | null;
  onMove: (doc: DocumentItem, toCategory: DocCategory) => void;
  onClose: () => void;
}

export function MoveDocumentModal({ visible, document, onMove, onClose }: MoveDocumentModalProps) {
  const [selected, setSelected] = useState<DocCategory | null>(null);

  const currentCategory = document?.category ?? null;
  const availableCategories = DOC_CATEGORIES.filter((c) => c !== currentCategory);
  const thumbUri = document?.localThumbUri || document?.thumbUrl || document?.localUri || document?.fileUrl;

  const handleMove = () => {
    if (!document || !selected) return;
    onMove(document, selected);
    setSelected(null);
    onClose();
  };

  const handleClose = () => {
    setSelected(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose} />

      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Move to...</Text>

        {/* Document preview */}
        {document ? (
          <View style={styles.previewRow}>
            {thumbUri && document.isImage ? (
              <Image source={{ uri: thumbUri }} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={styles.thumbFallback}>
                <Text style={styles.thumbFallbackText}>FILE</Text>
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.docName} numberOfLines={1}>
                {document.name}
              </Text>
              {currentCategory ? (
                <View style={styles.currentCategoryRow}>
                  <Text style={styles.currentCategoryLabel}>
                    Current: {CATEGORY_FULL_LABELS[currentCategory]}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Category list */}
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {availableCategories.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            const meta = CATEGORY_META[cat];
            const isSelected = selected === cat;
            const IconComponent = config.icon;

            return (
              <Pressable
                key={cat}
                style={[styles.categoryRow, isSelected ? styles.categoryRowSelected : undefined]}
                onPress={() => setSelected(cat)}
              >
                <View style={[styles.iconWrap, { backgroundColor: meta.gradientFrom }]}>
                  <IconComponent size={18} color="#ffffff" />
                </View>
                <Text style={[styles.categoryLabel, isSelected ? styles.categoryLabelSelected : undefined]}>
                  {config.title}
                </Text>
                {isSelected ? (
                  <View style={styles.checkWrap}>
                    <Check size={18} color="#2563eb" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.moveButton, !selected ? styles.moveButtonDisabled : undefined]}
            disabled={!selected}
            onPress={handleMove}
          >
            <Text style={[styles.moveText, !selected ? styles.moveTextDisabled : undefined]}>
              Move
            </Text>
            <ArrowRight size={16} color={selected ? '#ffffff' : '#94a3b8'} />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 24,
    maxHeight: '85%',
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  thumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbFallbackText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  previewInfo: {
    flex: 1,
    gap: 2,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  currentCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentCategoryLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    paddingHorizontal: 16,
    gap: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  categoryRowSelected: {
    backgroundColor: '#eff6ff',
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
  },
  categoryLabelSelected: {
    color: '#1d4ed8',
  },
  checkWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
  },
  moveButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  moveButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  moveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  moveTextDisabled: {
    color: '#94a3b8',
  },
});
