import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { TaskBoardMetrics } from '../../models/types';

export interface StatsBarNativeProps {
  metrics: TaskBoardMetrics;
}

export function StatsBarNative(props: StatsBarNativeProps) {
  const { metrics } = props;
  const cards = [
    { key: 'total', label: 'Total', value: metrics.total, color: '#579bfc', bg: 'rgba(87,155,252,0.14)' },
    { key: 'urgent', label: 'Urgent', value: metrics.urgent, color: '#df2f4a', bg: 'rgba(223,47,74,0.14)' },
    { key: 'active', label: 'Active', value: metrics.active, color: '#fdab3d', bg: 'rgba(253,171,61,0.14)' },
    {
      key: 'scheduled',
      label: 'Scheduled',
      value: metrics.scheduled,
      color: '#579bfc',
      bg: 'rgba(87,155,252,0.1)',
    },
    { key: 'done', label: 'Done', value: metrics.done, color: '#00c875', bg: 'rgba(0,200,117,0.14)' },
  ] as const;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {cards.map((card) => (
        <View key={card.key} style={[styles.card, { backgroundColor: card.bg }]}> 
          <Text style={[styles.value, { color: card.color }]}>{card.value}</Text>
          <Text style={[styles.label, { color: card.color }]}>{card.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 96,
  },
  value: {
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '900',
  },
  label: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default StatsBarNative;
