// NoteCard - Extracted from PatientNotes inline rendering

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { Note } from '../core/types';
import { getCategoryConfig, CATEGORY_COLORS } from '../core/types';
// TODO: Update imports after theme migration
// import { useTheme } from '@/theme';

interface NoteCardProps {
  note: Note;
  onPress?: (note: Note) => void;
  onEdit?: (note: Note) => void;
  compact?: boolean;
}

export function NoteCard({ note, onPress, onEdit, compact = false }: NoteCardProps) {
  const categoryConfig = getCategoryConfig(note.category);
  const colors = CATEGORY_COLORS[note.category];

  const handlePress = () => {
    onPress?.(note);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
          backgroundColor: '#fff',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#e5e7eb',
          marginBottom: 8,
        }}
      >
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: colors.bg,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: colors.text }}>
              {categoryConfig.label}
            </Text>
          </View>

          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {formatDate(note.createdAt)}
          </Text>
        </View>

        {/* Content */}
        <Text
          style={{
            fontSize: compact ? 14 : 15,
            color: '#374151',
            marginTop: 8,
            lineHeight: compact ? 20 : 22,
          }}
          numberOfLines={compact ? 2 : 4}
        >
          {note.content}
        </Text>

        {/* Footer */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
          }}
        >
          <Text style={{ fontSize: 12, color: '#6b7280' }}>
            {note.author}
          </Text>
          <Text style={{ fontSize: 11, color: '#9ca3af' }}>
            {formatTime(note.createdAt)}
          </Text>
        </View>

        {/* Attachments indicator */}
        {note.attachments && note.attachments.length > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#6b7280' }}>
              📎 {note.attachments.length} attachment{note.attachments.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
