// MedicationForm - Shared form between AddMedicationScreen and EditMedicationScreen

import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import type { MedRoute, MedFrequency, MedPriority } from '../core/types';
import { ROUTES, FREQUENCIES } from '../core/types';
import { PRIORITY_ORDER, PRIORITY_COLORS, getPriorityConfig } from '../core/priorities';
// TODO: Update imports after shared migration
// import { Button } from '@/shared/ui/Button';
// import { Select } from '@/shared/ui/Select';

interface MedicationFormProps {
  name: string;
  dose: string;
  unit: string;
  route: MedRoute;
  frequency: MedFrequency;
  priority: MedPriority;
  instructions: string;
  onNameChange: (value: string) => void;
  onDoseChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onRouteChange: (value: MedRoute) => void;
  onFrequencyChange: (value: MedFrequency) => void;
  onPriorityChange: (value: MedPriority) => void;
  onInstructionsChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function MedicationForm({
  name,
  dose,
  unit,
  route,
  frequency,
  priority,
  instructions,
  onNameChange,
  onDoseChange,
  onUnitChange,
  onRouteChange,
  onFrequencyChange,
  onPriorityChange,
  onInstructionsChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Medication',
}: MedicationFormProps) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Medication Name */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Medication Name *
        </Text>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          placeholder="Enter medication name"
          style={{
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            padding: 12,
            fontSize: 15,
            backgroundColor: '#fff',
          }}
        />
      </View>

      {/* Dose and Unit */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Dose *
          </Text>
          <TextInput
            value={dose}
            onChangeText={onDoseChange}
            placeholder="e.g., 500"
            keyboardType="numeric"
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              backgroundColor: '#fff',
            }}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
            Unit *
          </Text>
          <TextInput
            value={unit}
            onChangeText={onUnitChange}
            placeholder="e.g., mg"
            style={{
              borderWidth: 1,
              borderColor: '#d1d5db',
              borderRadius: 8,
              padding: 12,
              fontSize: 15,
              backgroundColor: '#fff',
            }}
          />
        </View>
      </View>

      {/* Route */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Route *
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {ROUTES.slice(0, 6).map((r) => {
            const isSelected = route === r.value;
            return (
              <View
                key={r.value}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: isSelected ? '#dbeafe' : '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? '#93c5fd' : '#d1d5db',
                }}
                onTouchEnd={() => onRouteChange(r.value)}
              >
                <Text style={{ fontSize: 13, color: isSelected ? '#1d4ed8' : '#6b7280' }}>
                  {r.abbreviation}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Frequency */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Frequency *
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {FREQUENCIES.slice(0, 8).map((f) => {
            const isSelected = frequency === f.value;
            return (
              <View
                key={f.value}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: isSelected ? '#dbeafe' : '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? '#93c5fd' : '#d1d5db',
                }}
                onTouchEnd={() => onFrequencyChange(f.value)}
              >
                <Text style={{ fontSize: 13, color: isSelected ? '#1d4ed8' : '#6b7280' }}>
                  {f.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Priority */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Priority *
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PRIORITY_ORDER.map((p) => {
            const isSelected = priority === p;
            const config = getPriorityConfig(p);
            const colors = PRIORITY_COLORS[p];
            return (
              <View
                key={p}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  backgroundColor: isSelected ? colors.bg : '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.border : '#d1d5db',
                  alignItems: 'center',
                }}
                onTouchEnd={() => onPriorityChange(p)}
              >
                <Text style={{ fontSize: 13, fontWeight: '500', color: isSelected ? colors.text : '#6b7280' }}>
                  {config.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Instructions */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Special Instructions
        </Text>
        <TextInput
          value={instructions}
          onChangeText={onInstructionsChange}
          placeholder="e.g., Take with food"
          multiline
          numberOfLines={3}
          style={{
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            padding: 12,
            fontSize: 15,
            minHeight: 80,
            textAlignVertical: 'top',
            backgroundColor: '#fff',
          }}
        />
      </View>

      {/* Action Buttons */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            backgroundColor: '#f3f4f6',
            borderRadius: 8,
            alignItems: 'center',
          }}
          onTouchEnd={onCancel}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#374151' }}>Cancel</Text>
        </View>

        <View
          style={{
            flex: 1,
            paddingVertical: 12,
            backgroundColor: isSubmitting ? '#93c5fd' : '#2563eb',
            borderRadius: 8,
            alignItems: 'center',
            opacity: isSubmitting ? 0.7 : 1,
          }}
          onTouchEnd={isSubmitting ? undefined : onSubmit}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#fff' }}>
            {isSubmitting ? 'Saving...' : submitLabel}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
