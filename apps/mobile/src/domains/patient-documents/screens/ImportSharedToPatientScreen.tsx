import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { usePatients } from '../../../hooks/usePatients';
import type { DocCategory } from '../core/types';
import { DOC_CATEGORIES, CATEGORY_FULL_LABELS } from '../core/types';
import { createLocalDocument, runSyncQueueOnce } from '../offline/sync';
import { useSafeShareIntentContext } from '../../../lib/shareIntent-context';

function inferName(path: string): string {
  const parts = path.split('/');
  return parts[parts.length - 1] || `shared-${Date.now()}`;
}

function inferMimeType(fileName: string, fallback?: string): string {
  if (fallback) return fallback;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function normalizePath(path: string): string {
  if (path.startsWith('file://') || path.startsWith('content://')) return path;
  return `file://${path}`;
}

export function ImportSharedToPatientScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ patientId?: string | string[] }>();
  const patientIdFromParams = Array.isArray(params.patientId)
    ? params.patientId[0]
    : params.patientId;
  const shareContext = useSafeShareIntentContext();
  const { data: patients = [], isLoading } = usePatients();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    patientIdFromParams || null
  );
  const [selectedCategory, setSelectedCategory] = useState<DocCategory>('preop_pics');
  const [submitting, setSubmitting] = useState(false);

  const sharedFiles = useMemo(
    () => shareContext.shareIntent.files || [],
    [shareContext.shareIntent.files]
  );
  const isExpoGo =
    Constants.executionEnvironment === 'storeClient' ||
    Constants.appOwnership === 'expo';

  const availablePatients = patients || [];

  const patientId = selectedPatientId || availablePatients[0]?.id;

  useEffect(() => {
    // In Expo Go, this route should only open for explicit in-app navigation or share intent.
    if (!isExpoGo) return;
    if (patientIdFromParams) return;
    if (sharedFiles.length > 0) return;

    router.replace('/(tabs)' as never);
  }, [isExpoGo, patientIdFromParams, router, sharedFiles.length]);

  const handleImport = async () => {
    if (!patientId) {
      Alert.alert('Select patient', 'Please choose a patient before importing files.');
      return;
    }

    if (!sharedFiles.length) {
      Alert.alert('No shared files', 'Open this screen from the device share sheet to import files.');
      return;
    }

    setSubmitting(true);
    try {
      for (const file of sharedFiles) {
        const sourcePath = normalizePath(file.path);
        const fileName = file.fileName || inferName(sourcePath);

        await createLocalDocument({
          patientId,
          category: selectedCategory,
          sourceUri: sourcePath,
          name: fileName,
          contentType: inferMimeType(fileName, file.mimeType),
          size: file.size,
        });
      }

      await runSyncQueueOnce();
      shareContext.resetShareIntent();

      router.replace(`/patient/${patientId}/documents/${selectedCategory}` as never);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to import shared files';
      Alert.alert('Import failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Import Shared Files</Text>
        <Text style={styles.subtitle}>Attach files from WhatsApp or other apps to a patient folder.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Shared files ({sharedFiles.length})</Text>
        {sharedFiles.length === 0 ? (
          <Text style={styles.emptyText}>No files detected. Open via your device share sheet.</Text>
        ) : (
          <FlatList
            data={sharedFiles}
            keyExtractor={(item) => item.path}
            style={styles.fileList}
            renderItem={({ item }) => (
              <View style={styles.fileRow}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {item.fileName || inferName(item.path)}
                </Text>
                <Text style={styles.fileMeta}>{item.mimeType || 'unknown type'}</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Patient</Text>
        {isLoading ? (
          <ActivityIndicator color="#2563eb" />
        ) : (
          <FlatList
            data={availablePatients.slice(0, 12)}
            horizontal
            contentContainerStyle={styles.patientList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const active = patientId === item.id;
              return (
                <Pressable
                  style={[styles.patientChip, active ? styles.patientChipActive : undefined]}
                  onPress={() => setSelectedPatientId(item.id)}
                >
                  <Text
                    style={[styles.patientChipText, active ? styles.patientChipTextActive : undefined]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryWrap}>
          {DOC_CATEGORIES.map((category) => {
            const active = selectedCategory === category;
            return (
              <Pressable
                key={category}
                style={[styles.categoryChip, active ? styles.categoryChipActive : undefined]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, active ? styles.categoryTextActive : undefined]}>
                  {CATEGORY_FULL_LABELS[category]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Pressable
        style={[styles.primaryButton, submitting ? styles.disabled : undefined]}
        disabled={submitting}
        onPress={handleImport}
      >
        <Text style={styles.primaryButtonText}>{submitting ? 'Importing...' : 'Add to Patient'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
    gap: 12,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 12,
    gap: 8,
  },
  label: {
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
  fileList: {
    maxHeight: 150,
  },
  fileRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  fileName: {
    color: '#0f172a',
    fontWeight: '600',
  },
  fileMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  patientList: {
    gap: 8,
  },
  patientChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 160,
  },
  patientChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  patientChipText: {
    color: '#334155',
    fontWeight: '600',
  },
  patientChipTextActive: {
    color: '#1e40af',
  },
  categoryWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  categoryChipActive: {
    borderColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  categoryText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#166534',
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.55,
  },
});
