import { Text, TextInput, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import type { PatientFormValues } from '@/domains/patient-list/core/validation';
import { ButtonGroup } from '../components/ButtonGroup';
import { formStyles as s } from '../../../shared/ui/formStyles';

export function PatientIdentitySection() {
  const {
    control,
    formState: { errors },
  } = useFormContext<PatientFormValues>();

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Patient Details</Text>
        <Text style={s.sectionSub}>Basic patient information</Text>
      </View>

      <Text style={s.label}>
        Full Name <Text style={s.required}>*</Text>
      </Text>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            placeholder="Enter patient's full name"
            style={s.input}
          />
        )}
      />
      {errors.name?.message ? <Text style={s.error}>{String(errors.name.message)}</Text> : null}

      <View style={[s.row, { marginTop: 12 }]}>
        <View style={s.colLeft}>
          <Text style={s.label}>
            Age <Text style={s.required}>*</Text>
          </Text>
          <Controller
            name="age"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value === undefined || field.value === null ? '' : String(field.value)}
                onChangeText={(txt) => {
                  const n = parseInt(txt, 10);
                  field.onChange(Number.isNaN(n) ? undefined : n);
                }}
                placeholder="Age"
                keyboardType="number-pad"
                style={s.input}
              />
            )}
          />
          {errors.age?.message ? <Text style={s.error}>{String(errors.age.message)}</Text> : null}
        </View>

        <View style={s.col}>
          <Text style={s.label}>
            Sex <Text style={s.required}>*</Text>
          </Text>
          <Controller
            name="sex"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={[
                  { value: 'M' as const, label: 'Male' },
                  { value: 'F' as const, label: 'Female' },
                  { value: 'OTHER' as const, label: 'Other' },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.sex?.message ? <Text style={s.error}>{String(errors.sex.message)}</Text> : null}
        </View>
      </View>
    </View>
  );
}
