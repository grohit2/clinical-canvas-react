// NoteForm - Shared form between AddNoteScreen and EditNoteScreen

import React from 'react';
import { View, Text, TextInput, ScrollView } from 'react-native';
import type { NoteCategory } from '../core/types';
import { NOTE_CATEGORIES, CATEGORY_COLORS } from '../core/types';
// TODO: Update imports after shared migration
// import { Button } from '@/shared/ui/Button';
// import { Select } from '@/shared/ui/Select';

interface NoteFormProps {
  category: NoteCategory;
  content: string;
  author: string;
  onCategoryChange: (category: NoteCategory) => void;
  onContentChange: (content: string) => void;
  onAuthorChange: (author: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function NoteForm({
  category,
  content,
  author,
  onCategoryChange,
  onContentChange,
  onAuthorChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Note',
}: NoteFormProps) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Category Select */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Category
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {NOTE_CATEGORIES.map((cat) => {
            const isSelected = category === cat.value;
            const colors = CATEGORY_COLORS[cat.value];
            return (
              <View
                key={cat.value}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: isSelected ? colors.bg : '#fff',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isSelected ? colors.border : '#d1d5db',
                }}
                onTouchEnd={() => onCategoryChange(cat.value)}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: isSelected ? colors.text : '#6b7280',
                    fontWeight: isSelected ? '500' : '400',
                  }}
                >
                  {cat.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Content Textarea */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Note Content
        </Text>
        <TextInput
          value={content}
          onChangeText={onContentChange}
          placeholder="Enter note content..."
          multiline
          numberOfLines={8}
          style={{
            borderWidth: 1,
            borderColor: '#d1d5db',
            borderRadius: 8,
            padding: 12,
            fontSize: 15,
            minHeight: 160,
            textAlignVertical: 'top',
            backgroundColor: '#fff',
          }}
        />
      </View>

      {/* Author Input */}
      <View style={{ marginBottom: 24 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 }}>
          Author
        </Text>
        <TextInput
          value={author}
          onChangeText={onAuthorChange}
          placeholder="Enter author name..."
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
