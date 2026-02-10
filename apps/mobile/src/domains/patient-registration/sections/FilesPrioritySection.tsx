import { Text, TextInput, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import type { PatientFormValues } from '@/domains/patient-list/core/validation';
import { ButtonGroup } from '../components/ButtonGroup';
import { formStyles as s } from '../../../shared/ui/formStyles';
import { DateTimeField } from '../../../shared/ui/DateTimeField';

export function FilesPrioritySection() {
  const { control, watch } = useFormContext<PatientFormValues>();
  const isUrgent = watch('isUrgent');

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Files & Priority</Text>
        <Text style={s.sectionSub}>Documents and urgency settings</Text>
      </View>

      <Text style={s.label}>Files URL</Text>
      <Controller
        name="filesUrl"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="https://example.com/documents"
            style={s.input}
            autoCapitalize="none"
          />
        )}
      />

      <Text style={[s.label, { marginTop: 12 }]}>Priority Level</Text>
      <Controller
        name="isUrgent"
        control={control}
        render={({ field }) => (
          <ButtonGroup
            options={[
              { value: false, label: 'Standard' },
              { value: true, label: 'Urgent' },
            ]}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />

      {isUrgent && (
        <View
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#fecaca',
            backgroundColor: '#fef2f2',
          }}
        >
          <Text style={[s.label, { color: '#b91c1c' }]}>Urgent Reason</Text>
          <Controller
            name="urgentReason"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="Why is this urgent?"
                style={[s.input, s.inputMultiline, { borderColor: '#fca5a5' }]}
                multiline
              />
            )}
          />

          <Text style={[s.label, { color: '#b91c1c', marginTop: 12 }]}>Urgent Until</Text>
          <Controller
            name="urgentUntil"
            control={control}
            render={({ field }) => (
              <DateTimeField value={field.value || ''} onChange={field.onChange} />
            )}
          />
        </View>
      )}
    </View>
  );
}
