import { Text, TextInput, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import type { PatientFormValues } from '@/domains/patient-list/core/validation';
import { SCHEME_OPTIONS } from '@/domains/patient-list/core/validation';
import { ButtonGroup } from '../components/ButtonGroup';
import { formStyles as s } from '../../../shared/ui/formStyles';
import { DateField } from '../../../shared/ui/DateField';

export function RegistrationSection({ isEditMode }: { isEditMode: boolean }) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<PatientFormValues>();
  const surgeryDate = watch('surgeryDate');

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Registration Details</Text>
        <Text style={s.sectionSub}>Hospital registration and department information</Text>
      </View>

      <View style={s.row}>
        <View style={s.colLeft}>
          <Text style={s.label}>
            Scheme <Text style={s.required}>*</Text>
          </Text>
          <Controller
            name="scheme"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={SCHEME_OPTIONS.map((option) => ({
                  value: option,
                  label: option,
                }))}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          {errors.scheme?.message ? <Text style={s.error}>{String(errors.scheme.message)}</Text> : null}
        </View>

        <View style={s.col}>
          <Text style={s.label}>Room Number (R#)</Text>
          <Controller
            name="roomNumber"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="Optional"
                style={s.input}
              />
            )}
          />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>Procedure Name</Text>
      <Controller
        name="procedureName"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="Optional"
            style={s.input}
          />
        )}
      />

      <View style={[s.row, { marginTop: 12 }]}>
        <View style={s.colLeft}>
          <Text style={s.label}>Surgery Code</Text>
          <Controller
            name="surgeryCode"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="e.g., KNEE-ARTHRO"
                style={s.input}
              />
            )}
          />
        </View>

        <View style={s.col}>
          <Text style={s.label}>Surgery Date</Text>
          <Controller
            name="surgeryDate"
            control={control}
            render={({ field }) => (
              <DateField
                value={field.value || ''}
                onChange={field.onChange}
                allowClear={isEditMode && Boolean(surgeryDate)}
              />
            )}
          />
        </View>
      </View>

      <View style={[s.row, { marginTop: 12 }]}>
        <View style={s.colLeft}>
          <Text style={s.label}>Theatre ID (TID)</Text>
          <Controller
            name="tidNumber"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="e.g., TID-12345"
                style={s.input}
              />
            )}
          />
        </View>

        <View style={s.col}>
          <Text style={s.label}>TID Status</Text>
          <Controller
            name="tidStatus"
            control={control}
            render={({ field }) => (
              <ButtonGroup<string>
                options={[
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'DONE', label: 'Done' },
                ]}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      </View>

      {!isEditMode ? (
        <View style={[s.row, { marginTop: 12 }]}>
          <View style={s.colLeft}>
            <Text style={s.label}>
              MRN <Text style={s.required}>*</Text>
            </Text>
            <Controller
              name="mrn"
              control={control}
              render={({ field }) => (
                <TextInput
                  value={field.value || ''}
                  onChangeText={field.onChange}
                  placeholder="ABC-1234567"
                  style={s.input}
                />
              )}
            />
            {errors.mrn?.message ? <Text style={s.error}>{String(errors.mrn.message)}</Text> : null}
          </View>

          <View style={s.col}>
            <Text style={s.label}>Status</Text>
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <ButtonGroup
                  options={[
                    { value: 'ACTIVE' as const, label: 'Active' },
                    { value: 'INACTIVE' as const, label: 'Inactive' },
                  ]}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </View>
        </View>
      ) : (
        <View style={{ marginTop: 12 }}>
          <Text style={s.label}>Status</Text>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <ButtonGroup
                options={[
                  { value: 'ACTIVE' as const, label: 'Active' },
                  { value: 'INACTIVE' as const, label: 'Inactive' },
                ]}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Text style={s.helper}>MRN editing is handled in the Add MRN screen.</Text>
        </View>
      )}

      <Text style={[s.label, { marginTop: 12 }]}>Department <Text style={s.required}>*</Text></Text>
      <Controller
        name="department"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="e.g., Cardiology, Orthopedics"
            style={s.input}
          />
        )}
      />
      {errors.department?.message ? <Text style={s.error}>{String(errors.department.message)}</Text> : null}
    </View>
  );
}
