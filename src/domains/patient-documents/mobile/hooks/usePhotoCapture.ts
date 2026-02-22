import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import type { DocumentsApi } from '../../api/documentsApi';
import { DOC_CATEGORIES } from '../../core/categories';
import type { DocCategory } from '../../core/types';
import { inferFileName, inferMimeType } from '../../core/utils';
import { createLocalDocument, runSyncQueueOnce } from '../offline/sync';
import { getDocumentFoldersKey } from './useDocumentFolders';
import { getCategoryDocumentsKey } from './useCategoryDocuments';
import { getPatientDocumentsKey } from './useDateGroups';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, patientId: string) {
  queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  queryClient.invalidateQueries({ queryKey: getPatientDocumentsKey(patientId) });
  DOC_CATEGORIES.forEach((cat) => {
    queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, cat) });
  });
}

export function usePhotoCapture(
  patientId: string,
  category: DocCategory,
  documentsApi: DocumentsApi
) {
  const queryClient = useQueryClient();

  const persistAssets = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      for (const asset of assets) {
        const fileName = asset.fileName || inferFileName(asset.uri);
        await createLocalDocument({
          patientId,
          category,
          sourceUri: asset.uri,
          name: fileName,
          contentType: asset.mimeType || inferMimeType(fileName),
          size: asset.fileSize,
        });
      }

      invalidateAll(queryClient, patientId);
      await runSyncQueueOnce(documentsApi);
      invalidateAll(queryClient, patientId);
    },
    [category, documentsApi, patientId, queryClient]
  );

  const captureFromCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      await persistAssets(result.assets);
    } catch (error) {
      console.warn('camera capture failed', error);
      Alert.alert('Upload failed', 'Could not capture photo. Please try again.');
    }
  }, [persistAssets]);

  const pickFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library permission is required to attach documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: 8,
      });

      if (result.canceled || !result.assets?.length) return;

      await persistAssets(result.assets);
    } catch (error) {
      console.warn('gallery pick failed', error);
      Alert.alert('Upload failed', 'Could not import selected photo(s). Please try again.');
    }
  }, [persistAssets]);

  return {
    captureFromCamera,
    pickFromGallery,
  };
}
