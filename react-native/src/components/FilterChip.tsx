import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface FilterChipProps {
  label: string;
  isActive?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, isActive = false, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, isActive && styles.activeChip]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, isActive && styles.activeLabel]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 8,
  },
  activeChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  activeLabel: {
    color: '#FFFFFF',
  },
});

export default FilterChip;
