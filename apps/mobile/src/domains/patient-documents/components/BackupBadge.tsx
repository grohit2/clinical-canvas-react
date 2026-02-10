import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, Cloud, CloudOff, CloudUpload, Pin } from 'lucide-react-native';
import type { BackupState, OfflineState } from '../core/types';

interface BadgeConfig {
  label: string;
  backgroundColor: string;
  textColor: string;
  icon: typeof Cloud;
}

function getConfig(state: BackupState): BadgeConfig {
  switch (state) {
    case 'backed_up':
      return {
        label: 'Backed up',
        backgroundColor: '#dcfce7',
        textColor: '#15803d',
        icon: Cloud,
      };
    case 'device_only':
      return {
        label: 'Not backed up',
        backgroundColor: '#ffedd5',
        textColor: '#b45309',
        icon: CloudOff,
      };
    case 'pending_backup':
      return {
        label: 'Backup pending',
        backgroundColor: '#dbeafe',
        textColor: '#1d4ed8',
        icon: CloudUpload,
      };
    case 'error':
      return {
        label: 'Backup error',
        backgroundColor: '#fee2e2',
        textColor: '#b91c1c',
        icon: AlertTriangle,
      };
  }
}

export function BackupBadge({
  backupState,
  offlineState,
}: {
  backupState: BackupState;
  offlineState: OfflineState;
}) {
  const config = getConfig(backupState);
  const Icon = config.icon;

  return (
    <View style={[styles.pill, { backgroundColor: config.backgroundColor }]}> 
      <Icon size={12} color={config.textColor} />
      <Text style={[styles.text, { color: config.textColor }]}>{config.label}</Text>
      {offlineState === 'available_offline' ? <Pin size={12} color={config.textColor} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
    maxWidth: '100%',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
