import { Layers3 } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

export function StackBadge({ count }: { count: number }) {
  return (
    <View style={styles.container}>
      <Text style={styles.count}>{count}</Text>
      <Layers3 size={11} color="#ffffff" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  count: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
});
