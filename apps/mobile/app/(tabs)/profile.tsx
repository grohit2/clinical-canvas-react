import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react-native';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.userSection}>
        <View style={styles.card}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <User size={32} color="#fff" />
            </View>
            <View style={styles.userText}>
              <Text style={styles.userName}>Dr. User</Text>
              <Text style={styles.userRole}>Orthopedic Surgery</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuLabel}>Settings</Text>
        <View style={styles.card}>
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Settings size={20} color="#6b7280" />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <LogOut size={20} color="#dc2626" />
              <Text style={[styles.menuItemText, { color: '#dc2626' }]}>Sign Out</Text>
            </View>
            <ChevronRight size={20} color="#9ca3af" />
          </Pressable>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>Clinical Canvas v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  userSection: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userText: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  userRole: {
    fontSize: 14,
    color: '#64748b',
  },
  menuSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  menuLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
