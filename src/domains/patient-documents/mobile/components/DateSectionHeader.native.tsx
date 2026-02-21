import { Pressable, StyleSheet, Text, View } from 'react-native';

export function DateSectionHeader({
  label,
  documentCount,
  selectionMode,
  allSelected,
  onToggleAll,
}: {
  label: string;
  documentCount: number;
  selectionMode: boolean;
  allSelected: boolean;
  onToggleAll: () => void;
}) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.count}>{documentCount}</Text>
      </View>

      {selectionMode ? (
        <Pressable onPress={onToggleAll} style={[styles.checkbox, allSelected && styles.checkboxSelected]}>
          <Text style={[styles.checkText, allSelected && styles.checkTextSelected]}>
            {allSelected ? '✓' : ''}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  checkboxSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  checkText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '700',
  },
  checkTextSelected: {
    color: '#ffffff',
  },
});
