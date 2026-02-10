import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { Patient } from '@clinical-canvas/core';

import { useToast } from '../../../shared/hooks/useToast';
import { formStyles as s } from '../../../shared/ui/formStyles';
import { api } from '../../../lib/api';

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;

const normalizeScheme = (value?: string): string => {
  const raw = (value || '').trim().toUpperCase();
  if ((SCHEME_OPTIONS as readonly string[]).includes(raw)) return raw;
  if (['UNKNOWN', 'GENERAL', 'OTHER', 'OTHERS'].includes(raw)) return 'OTHERS';
  return raw || 'OTHERS';
};

export function AddMrnScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const patientId = typeof id === 'string' ? id : '';

  const { toast } = useToast();
  const [patientName, setPatientName] = useState('');
  const [scheme, setScheme] = useState<string>('');
  const [mrn, setMrn] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;

    if (!patientId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    api.patients
      .get(patientId)
      .then((patient: Patient) => {
        if (!alive) return;
        setPatientName(patient?.name || '');
      })
      .catch(() => {})
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [patientId]);

  const onSubmit = async () => {
    if (!patientId || !mrn.trim() || !scheme) return;

    setSubmitting(true);
    try {
      const payload = { mrn: mrn.trim(), scheme: normalizeScheme(scheme) };
      await api.patients.switchRegistration(patientId, payload);

      toast({
        title: 'MRN added',
        description: `${mrn.trim()} added to ${patientName || 'patient'}`,
      });

      router.replace(`/patients/${patientId}` as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add MRN';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[s.screen, { padding: 16 }]}>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Add MRN</Text>
        <Text style={s.sectionSub}>{patientName ? `for ${patientName}` : ''}</Text>

        <Text style={[s.label, { marginTop: 12 }]}>Scheme</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {SCHEME_OPTIONS.map((option) => {
            const active = option === scheme;
            return (
              <Pressable
                key={option}
                onPress={() => setScheme(option)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? '#2563eb' : '#d1d5db',
                  backgroundColor: active ? '#2563eb' : 'white',
                  marginRight: 8,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: '900', color: active ? 'white' : '#374151' }}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[s.label, { marginTop: 12 }]}>MRN</Text>
        <TextInput
          value={mrn}
          onChangeText={setMrn}
          placeholder="Enter MRN (e.g., ABC-1234567)"
          style={s.input}
        />

        <View style={{ flexDirection: 'row', marginTop: 14 }}>
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={submitting || !mrn.trim() || !scheme}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              backgroundColor:
                submitting || !mrn.trim() || !scheme ? '#9ca3af' : '#111827',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            <Text style={{ color: 'white', fontWeight: '900' }}>
              {submitting ? 'Adding...' : 'Add MRN'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            style={{
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#d1d5db',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontWeight: '900', color: '#111827' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
