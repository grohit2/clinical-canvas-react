import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import type { DocumentsApi } from '../../api/documentsApi';
import { DOC_CATEGORIES } from '../../core/categories';
import type { DocCategory, DocumentItem } from '../../core/types';
import { inferFileName, inferMimeType, isImageByMimeOrExt } from '../../core/utils';
import { debugBreadcrumbError } from '../debug/breadcrumbs';
import { GEO_FLAGS } from '../geotag/featureFlags';
import { formatGeoStampText, getGeoTagForPhoto, useGeoStampCapture } from '../geotag';
import { patchDocument } from '../offline/db';
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
  const captureStampedImage = useGeoStampCapture();

  const persistAssets = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      geo: DocumentItem['geo'] | null
    ) => {
      for (const asset of assets) {
        const fileName = asset.fileName || inferFileName(asset.uri);
        const contentType = inferMimeType(
          fileName,
          asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : asset.type === 'video' ? 'video/mp4' : undefined)
        );
        const isImageAsset = isImageByMimeOrExt(contentType, fileName);
        const created = await createLocalDocument({
          patientId,
          category,
          sourceUri: asset.uri,
          name: fileName,
          contentType,
          size: asset.fileSize,
          geo: isImageAsset ? geo || undefined : undefined,
        });

        if (
          captureStampedImage &&
          GEO_FLAGS.thumbExport &&
          geo &&
          created.isImage &&
          created.localUri
        ) {
          try {
            const thumbUri = await captureStampedImage({
              imageUri: created.localUri,
              stampText: formatGeoStampText(geo),
              targetWidth: 720,
              quality: 0.8,
            });

            await patchDocument(created.id, { localThumbUri: thumbUri });
          } catch (error) {
            debugBreadcrumbError('photo_capture.thumb_stamp_failed', error, {
              patientId,
              category,
              documentId: created.id,
            });
          }
        }
      }

      invalidateAll(queryClient, patientId);
      await runSyncQueueOnce(documentsApi);
      invalidateAll(queryClient, patientId);
    },
    [captureStampedImage, category, documentsApi, patientId, queryClient]
  );

  const captureFromCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.9,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.length) return;

      let geo = null;
      if (GEO_FLAGS.enabled) {
        try {
          geo = await getGeoTagForPhoto();
        } catch (error) {
          debugBreadcrumbError('photo_capture.camera.geotag_failed', error, {
            patientId,
            category,
          });
        }
      }

      await persistAssets(result.assets, geo);
    } catch (error) {
      console.warn('camera capture failed', error);
      Alert.alert('Upload failed', 'Could not capture photo. Please try again.');
    }
  }, [category, patientId, persistAssets]);

  const pickFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission required', 'Photo library permission is required to attach documents.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        quality: 0.9,
        allowsMultipleSelection: true,
        selectionLimit: 8,
      });

      if (result.canceled || !result.assets?.length) return;

      let geo = null;
      if (GEO_FLAGS.enabled) {
        try {
          geo = await getGeoTagForPhoto();
        } catch (error) {
          debugBreadcrumbError('photo_capture.gallery.geotag_failed', error, {
            patientId,
            category,
          });
        }
      }

      await persistAssets(result.assets, geo);
    } catch (error) {
      console.warn('gallery pick failed', error);
      Alert.alert('Upload failed', 'Could not import selected file(s). Please try again.');
    }
  }, [category, patientId, persistAssets]);

  return {
    captureFromCamera,
    pickFromGallery,
  };
}
