import { StyleSheet, Text, View } from 'react-native';

interface TaskBoardMobileScreenProps {
  patients?: unknown[];
}

export function TaskBoardMobileScreen(_props: TaskBoardMobileScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.body}>
        Task board is available in the native mobile app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
  },
});

export default TaskBoardMobileScreen;
