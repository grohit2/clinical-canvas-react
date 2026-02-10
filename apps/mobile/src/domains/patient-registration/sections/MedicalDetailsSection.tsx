import { Pressable, Text, TextInput, View, StyleSheet } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import type { PatientFormValues } from '@/domains/patient-list/core/validation';
import {
  PATHWAY_OPTIONS,
  COMORBIDITY_OPTIONS,
} from '@/domains/patient-list/core/validation';
import { ButtonGroup } from '../components/ButtonGroup';
import { formStyles as s } from '../../../shared/ui/formStyles';

export function MedicalDetailsSection() {
  const {
    control,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<PatientFormValues>();

  const comorbidities = watch('comorbidities') || [];
  const includeOtherComorbidity = watch('includeOtherComorbidity');

  const toggleComorbidity = (value: string) => {
    if (value === 'OTHER') {
      setValue('includeOtherComorbidity', !includeOtherComorbidity, { shouldDirty: true });
      if (includeOtherComorbidity) {
        setValue('otherComorbidity', '', { shouldDirty: true });
      }
      return;
    }

    const normalized = value.toUpperCase();
    const exists = comorbidities.includes(normalized);
    const next = exists
      ? comorbidities.filter((item) => item !== normalized)
      : [...comorbidities, normalized];
    setValue('comorbidities', next, { shouldDirty: true });
  };

  const previewTokens = (() => {
    const tokens = [...comorbidities];
    if (includeOtherComorbidity) {
      const other = (watch('otherComorbidity') || '').trim().toUpperCase();
      if (other) tokens.push(other);
    }
    return tokens;
  })();

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Medical Details</Text>
        <Text style={s.sectionSub}>Treatment pathway and medical information</Text>
      </View>

      <View style={s.row}>
        <View style={s.colLeft}>
          <Text style={s.label}>
            Pathway <Text style={s.required}>*</Text>
          </Text>
          <Controller
            name="pathway"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={PATHWAY_OPTIONS.map((option) => ({
                  value: option,
                  label: option.charAt(0).toUpperCase() + option.slice(1),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.pathway?.message ? <Text style={s.error}>{String(errors.pathway.message)}</Text> : null}
        </View>

        <View style={s.col}>
          <Text style={s.label}>Assigned Doctor</Text>
          <Controller
            name="assignedDoctor"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="Dr. Smith"
                style={s.input}
              />
            )}
          />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>Diagnosis</Text>
      <Controller
        name="diagnosis"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="Primary diagnosis"
            style={[s.input, s.inputMultiline]}
            multiline
          />
        )}
      />

      <Text style={[s.label, { marginTop: 12 }]}>Comorbidities</Text>
      <View style={styles.chips}>
        {COMORBIDITY_OPTIONS.map((option) => {
          const isOther = option === 'OTHER';
          const isActive = isOther
            ? includeOtherComorbidity
            : comorbidities.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => toggleComorbidity(option)}
              style={[styles.chip, isActive ? styles.chipActive : styles.chipIdle]}
            >
              <Text style={[styles.chipText, isActive ? styles.txtActive : styles.txtIdle]}>
                {option === 'OTHER' ? 'Other' : option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {includeOtherComorbidity && (
        <View style={{ marginTop: 8 }}>
          <Controller
            name="otherComorbidity"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={(text) => field.onChange(text.toUpperCase())}
                placeholder="Specify other comorbidity"
                style={s.input}
              />
            )}
          />
          {errors.otherComorbidity?.message ? <Text style={s.error}>{String(errors.otherComorbidity.message)}</Text> : null}
        </View>
      )}

      {previewTokens.length > 0 ? (
        <Text style={s.helper}>
          Will be saved as{' '}
          <Text style={{ fontWeight: '900', color: '#111827' }}>{previewTokens.join(' + ')}</Text>
        </Text>
      ) : null}

      <Text style={[s.label, { marginTop: 12 }]}>Doctor ID</Text>
      <Controller
        name="assignedDoctorId"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="dr_smith_001"
            style={s.input}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipIdle: { backgroundColor: 'white', borderColor: '#d1d5db' },
  chipText: { fontSize: 12, fontWeight: '900' },
  txtActive: { color: 'white' },
  txtIdle: { color: '#374151' },
});
