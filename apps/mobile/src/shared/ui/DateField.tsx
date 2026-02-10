import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, X } from 'lucide-react-native';
import { formStyles as s } from './formStyles';

const pad = (n: number) => String(n).padStart(2, '0');
const formatDateLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function safeDate(value?: string) {
  if (!value) return new Date();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function DateField({
  value,
  onChange,
  placeholder = 'Select date',
  allowClear,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  allowClear?: boolean;
}) {
  const [show, setShow] = useState(false);
  const dateValue = useMemo(() => safeDate(value), [value]);
  const display = value?.trim() ? value : placeholder;

  return (
    <View>
      <View style={[s.input, styles.row]}>
        <Pressable style={{ flex: 1 }} onPress={() => setShow(true)}>
          <Text style={{ color: value ? '#111827' : '#6b7280' }}>{display}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (allowClear && value) onChange('');
            else setShow(true);
          }}
          hitSlop={8}
        >
          {allowClear && value ? <X size={16} color="#4b5563" /> : <Calendar size={16} color="#4b5563" />}
        </Pressable>
      </View>

      {show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selected) => {
            setShow(false);
            if ((event as { type?: string } | undefined)?.type === 'dismissed') return;
            if (!selected) return;
            onChange(formatDateLocal(selected));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
