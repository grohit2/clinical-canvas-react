// MedicationCard - Extracted from PatientMeds inline rendering

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Medication } from '../core/types';
import { getRouteConfig, getFrequencyConfig } from '../core/types';
import { getPriorityConfig, PRIORITY_COLORS } from '../core/priorities';
// TODO: Update imports after theme migration
// import { useTheme } from '@/theme';

interface MedicationCardProps {
  medication: Medication;
  onPress?: (medication: Medication) => void;
  onEdit?: (medication: Medication) => void;
  compact?: boolean;
}

export function MedicationCard({ medication, onPress, onEdit, compact = false }: MedicationCardProps) {
  const priorityConfig = getPriorityConfig(medication.priority);
  const priorityColors = PRIORITY_COLORS[medication.priority];
  const routeConfig = getRouteConfig(medication.route);
  const freqConfig = getFrequencyConfig(medication.frequency);

  const handlePress = () => {
    onPress?.(medication);
  };

  const isDiscontinued = medication.status === 'discontinued';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          padding: compact ? 12 : 16,
          backgroundColor: isDiscontinued ? '#f9fafb' : '#fff',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isDiscontinued ? '#e5e7eb' : '#d1d5db',
          marginBottom: 8,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: compact ? 15 : 16,
                fontWeight: '600',
                color: isDiscontinued ? '#9ca3af' : '#111827',
                textDecorationLine: isDiscontinued ? 'line-through' : 'none',
              }}
            >
              {medication.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 }}>
              {medication.dose} {medication.unit}
            </Text>
          </View>

          {/* Priority Badge */}
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: priorityColors.bg,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: priorityColors.border,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: priorityColors.text }}>
              {priorityConfig.label}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Route: </Text>
            <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>
              {routeConfig.abbreviation}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Freq: </Text>
            <Text style={{ fontSize: 12, color: '#374151', fontWeight: '500' }}>
              {freqConfig.label}
            </Text>
          </View>
        </View>

        {/* Schedule Times */}
        {medication.scheduleTimes && medication.scheduleTimes.length > 0 && !compact && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
            {medication.scheduleTimes.map((time, idx) => (
              <View
                key={idx}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: '#f3f4f6',
                  borderRadius: 4,
                }}
              >
                <Text style={{ fontSize: 11, color: '#4b5563' }}>{time}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        {medication.instructions && !compact && (
          <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 8, fontStyle: 'italic' }}>
            {medication.instructions}
          </Text>
        )}

        {/* Status indicator for discontinued */}
        {isDiscontinued && (
          <View
            style={{
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 1,
              borderTopColor: '#e5e7eb',
            }}
          >
            <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '500' }}>
              Discontinued
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
