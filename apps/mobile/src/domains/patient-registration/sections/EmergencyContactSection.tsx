import { Text, TextInput, View } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';

import type { PatientFormValues } from '@/domains/patient-list/core/validation';
import { ButtonGroup } from '../components/ButtonGroup';
import { formStyles as s } from '../../../shared/ui/formStyles';

export function EmergencyContactSection() {
  const { control } = useFormContext<PatientFormValues>();

  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Emergency Contact</Text>
        <Text style={s.sectionSub}>Contact person for emergencies</Text>
      </View>

      <View style={s.row}>
        <View style={s.colLeft}>
          <Text style={s.label}>Contact Name</Text>
          <Controller
            name="emergencyContact.name"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="Full name"
                style={s.input}
              />
            )}
          />
        </View>

        <View style={s.col}>
          <Text style={s.label}>Relationship</Text>
          <Controller
            name="emergencyContact.relationship"
            control={control}
            render={({ field }) => (
              <ButtonGroup<string>
                options={[
                  { value: 'Spouse', label: 'Spouse' },
                  { value: 'Parent', label: 'Parent' },
                  { value: 'Child', label: 'Child' },
                  { value: 'Sibling', label: 'Sibling' },
                  { value: 'Other', label: 'Other' },
                ]}
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
        </View>
      </View>

      <View style={[s.row, { marginTop: 12 }]}>
        <View style={s.colLeft}>
          <Text style={s.label}>Phone</Text>
          <Controller
            name="emergencyContact.phone"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="+91-9876543210"
                style={s.input}
                keyboardType="phone-pad"
              />
            )}
          />
        </View>

        <View style={s.col}>
          <Text style={s.label}>Alt Phone</Text>
          <Controller
            name="emergencyContact.altPhone"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="+91-9876543210"
                style={s.input}
                keyboardType="phone-pad"
              />
            )}
          />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>Email</Text>
      <Controller
        name="emergencyContact.email"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="contact@email.com"
            style={s.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}
      />

      <Text style={[s.label, { marginTop: 12 }]}>Address</Text>
      <Controller
        name="emergencyContact.address.line1"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="Address Line 1"
            style={s.input}
          />
        )}
      />

      <View style={{ marginTop: 10 }}>
        <Controller
          name="emergencyContact.address.line2"
          control={control}
          render={({ field }) => (
            <TextInput
              value={field.value || ''}
              onChangeText={field.onChange}
              placeholder="Address Line 2 (Optional)"
              style={s.input}
            />
          )}
        />
      </View>

      <View style={[s.row, { marginTop: 12 }]}>
        <View style={s.colLeft}>
          <Controller
            name="emergencyContact.address.city"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="City"
                style={s.input}
              />
            )}
          />
        </View>

        <View style={s.colLeft}>
          <Controller
            name="emergencyContact.address.state"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="State"
                style={s.input}
              />
            )}
          />
        </View>

        <View style={s.col}>
          <Controller
            name="emergencyContact.address.postalCode"
            control={control}
            render={({ field }) => (
              <TextInput
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder="Postal Code"
                style={s.input}
              />
            )}
          />
        </View>
      </View>

      <Text style={[s.label, { marginTop: 12 }]}>Country</Text>
      <Controller
        name="emergencyContact.address.country"
        control={control}
        render={({ field }) => (
          <TextInput
            value={field.value || ''}
            onChangeText={field.onChange}
            placeholder="Country"
            style={s.input}
          />
        )}
      />
    </View>
  );
}
