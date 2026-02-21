// PriorityBadge - Extracted from inline duplication across 4+ files

import React from 'react';
import { View, Text } from 'react-native';
import type { TaskPriority } from '../../core/types';
import { getPriorityConfig } from '../../core/priorities';
// TODO: Update imports after theme migration
// import { useTheme } from '@/theme';

interface PriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SIZE_STYLES = {
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    borderRadius: 4,
  },
  md: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    borderRadius: 6,
  },
  lg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
    borderRadius: 8,
  },
};

// Map Tailwind classes to RN colors
const PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string; border: string }> = {
  urgent: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  high: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  medium: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
  low: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

export function PriorityBadge({ priority, size = 'md', showLabel = true }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);
  const sizeStyle = SIZE_STYLES[size];
  const colors = PRIORITY_COLORS[priority];

  return (
    <View
      style={{
        paddingHorizontal: sizeStyle.paddingHorizontal,
        paddingVertical: sizeStyle.paddingVertical,
        backgroundColor: colors.bg,
        borderRadius: sizeStyle.borderRadius,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: sizeStyle.fontSize,
          fontWeight: '500',
          color: colors.text,
          textTransform: 'capitalize',
        }}
      >
        {showLabel ? config.label : priority.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}
