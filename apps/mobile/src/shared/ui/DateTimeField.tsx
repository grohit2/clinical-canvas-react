import { useMemo, useState } from 'react';
import { Platform, Pressable, Text, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import { formStyles as s } from './formStyles';

const pad = (n: number) => String(n).padStart(2, '0');
const formatLocalDateTime = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

function parseLocalDateTime(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), 0);
}

function safeDateTime(value?: string) {
  if (!value) return new Date();
  const local = parseLocalDateTime(value);
  if (local) return local;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function DateTimeField({
  value,
  onChange,
  placeholder = 'Select date & time',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const dateValue = useMemo(() => safeDateTime(value), [value]);

  const [showIOS, setShowIOS] = useState(false);
  const [showAndroidDate, setShowAndroidDate] = useState(false);
  const [showAndroidTime, setShowAndroidTime] = useState(false);
  const [temp, setTemp] = useState<Date>(new Date());

  const open = () => {
    if (Platform.OS === 'android') {
      setTemp(dateValue);
      setShowAndroidDate(true);
    } else {
      setShowIOS(true);
    }
  };

  const display = value?.trim() ? value : placeholder;

  return (
    <View>
      <View style={[s.input, styles.row]}>
        <Pressable style={{ flex: 1 }} onPress={open}>
          <Text style={{ color: value ? '#111827' : '#6b7280' }}>{display}</Text>
        </Pressable>
        <Pressable onPress={open} hitSlop={8}>
          <Calendar size={16} color="#4b5563" />
        </Pressable>
      </View>

      {Platform.OS === 'ios' && showIOS && (
        <DateTimePicker
          value={dateValue}
          mode="datetime"
          display="spinner"
          onChange={(event, selected) => {
            if ((event as { type?: string } | undefined)?.type === 'dismissed') {
              setShowIOS(false);
              return;
            }
            if (!selected) return;
            onChange(formatLocalDateTime(selected));
          }}
        />
      )}

      {Platform.OS === 'android' && showAndroidDate && (
        <DateTimePicker
          value={temp}
          mode="date"
          display="default"
          onChange={(event, selected) => {
            setShowAndroidDate(false);
            if ((event as { type?: string } | undefined)?.type === 'dismissed') return;
            if (!selected) return;

            const next = new Date(
              selected.getFullYear(),
              selected.getMonth(),
              selected.getDate(),
              temp.getHours(),
              temp.getMinutes()
            );
            setTemp(next);
            setShowAndroidTime(true);
          }}
        />
      )}

      {Platform.OS === 'android' && showAndroidTime && (
        <DateTimePicker
          value={temp}
          mode="time"
          display="default"
          onChange={(event, selected) => {
            setShowAndroidTime(false);
            if ((event as { type?: string } | undefined)?.type === 'dismissed') return;
            if (!selected) return;

            const next = new Date(
              temp.getFullYear(),
              temp.getMonth(),
              temp.getDate(),
              selected.getHours(),
              selected.getMinutes()
            );
            onChange(formatLocalDateTime(next));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
