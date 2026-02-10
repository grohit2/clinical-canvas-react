import { Pressable, Text, View, StyleSheet } from 'react-native';

type ButtonGroupOption<T> = { value: T; label: string };

export function ButtonGroup<T extends string | boolean>({
  options,
  value,
  onChange,
}: {
  options: ButtonGroupOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            style={[styles.btn, active ? styles.active : styles.idle]}
          >
            <Text style={[styles.txt, active ? styles.txtActive : styles.txtIdle]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  btn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  active: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  idle: { backgroundColor: 'white', borderColor: '#d1d5db' },
  txt: { fontSize: 12, fontWeight: '900' },
  txtActive: { color: 'white' },
  txtIdle: { color: '#374151' },
});
