import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stage } from '../types/patient';

interface StageChipProps {
  stage?: Stage | string;
  size?: 'sm' | 'md' | 'lg';
}

const stageLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  preop: 'Pre-Op',
  intraop: 'OT',
  postop: 'Post-Op',
  'discharge-init': 'Discharge Init',
  discharge: 'Discharge',
};

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  onboarding: { bg: '#E0E7FF', text: '#3730A3', border: '#A5B4FC' },
  preop: { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  intraop: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  postop: { bg: '#FFEDD5', text: '#9A3412', border: '#FDBA74' },
  'discharge-init': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  discharge: { bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
  default: { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
};

export function StageChip({ stage, size = 'md' }: StageChipProps) {
  const stageKey = stage?.toLowerCase() || 'default';
  const colors = stageColors[stageKey] || stageColors.default;
  const label = stageLabels[stageKey] || stage || 'Unknown';

  const sizeStyles = {
    sm: { paddingHorizontal: 8, paddingVertical: 2, fontSize: 10 },
    md: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12 },
    lg: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
  };

  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
          paddingVertical: sizeStyles[size].paddingVertical,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: colors.text,
            fontSize: sizeStyles[size].fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: {
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});

export default StageChip;
