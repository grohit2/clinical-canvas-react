import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Directory, File as ExpoFile, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import type { DocumentsApi } from '../../api/documentsApi';
import { DOC_CATEGORIES } from '../../core/categories';
import type { DocCategory } from '../../core/types';
import { inferFileName, inferMimeType } from '../../core/utils';
import {
  buildGeoTaggedName,
  burnGeoMetadataOnImage,
  resolveGeoTagContext,
  type GeoTagContext,
} from '../geotag';
import {
  debugBreadcrumb,
  debugBreadcrumbError,
} from '../debug/breadcrumbs';
import { createLocalDocument, runSyncQueueOnce } from '../offline/sync';
import { getDocumentFoldersKey } from './useDocumentFolders';
import { getCategoryDocumentsKey } from './useCategoryDocuments';
import { getPatientDocumentsKey } from './useDateGroups';

const STAGING_DIR = new Directory(Paths.cache, 'patient-documents-capture-staging');

function normalizeUri(uri: string): string {
  if (!uri) return uri;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

function safeFileExists(uri: string): boolean {
  if (!uri) return false;

  try {
    return new ExpoFile(uri).exists;
  } catch {
    return false;
  }
}

function ensureStagingDir(): void {
  try {
    STAGING_DIR.create({ idempotent: true, intermediates: true });
  } catch {
    // Best-effort directory creation.
  }
}

function inferExtension(fileNameHint: string, mimeType?: string, uri?: string): string {
  const dotIndex = fileNameHint.lastIndexOf('.');
  if (dotIndex > 0 && dotIndex < fileNameHint.length - 1) {
    return fileNameHint.slice(dotIndex + 1).toLowerCase();
  }

  if (mimeType?.includes('/')) {
    return mimeType.split('/')[1].toLowerCase();
  }

  const normalizedUri = normalizeUri(uri || '');
  const uriName = normalizedUri.split('/').pop() || '';
  const uriDot = uriName.lastIndexOf('.');
  if (uriDot > 0 && uriDot < uriName.length - 1) {
    return uriName.slice(uriDot + 1).toLowerCase();
  }

  return 'jpg';
}

async function materializeLocalAsset(
  rawUri: string,
  fileNameHint: string,
  mimeType?: string
): Promise<{ uri: string; mode: 'original' | 'copied'; exists: boolean }> {
  const normalizedUri = normalizeUri(rawUri);
  const existsAsIs = safeFileExists(normalizedUri);

  if (normalizedUri.startsWith('file://') && existsAsIs) {
    return { uri: normalizedUri, mode: 'original', exists: true };
  }

  ensureStagingDir();

  const extension = inferExtension(fileNameHint, mimeType, normalizedUri);
  const stagedName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  try {
    const source = new ExpoFile(normalizedUri);
    const target = new ExpoFile(STAGING_DIR, stagedName);
    source.copy(target);

    const stagedUri = normalizeUri(target.uri);
    const stagedExists = safeFileExists(stagedUri);

    if (stagedExists) {
      return { uri: stagedUri, mode: 'copied', exists: true };
    }
  } catch (error) {
    debugBreadcrumbError('photo_capture.materialize_copy_failed', error, {
      rawUri,
      normalizedUri,
      stagedName,
    });
  }

  return { uri: normalizedUri, mode: 'original', exists: existsAsIs };
}

async function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, patientId: string) {
  const invalidations: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) }),
    queryClient.invalidateQueries({ queryKey: getPatientDocumentsKey(patientId) }),
  ];

  DOC_CATEGORIES.forEach((cat) => {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, cat) })
    );
  });

  await Promise.all(invalidations);
}

export function usePhotoCapture(
  patientId: string,
  category: DocCategory,
  documentsApi: DocumentsApi
) {
  const queryClient = useQueryClient();

  const persistAssets = useCallback(
    async (
      assets: ImagePicker.ImagePickerAsset[],
      options?: {
        geotagByAssetUri?: Map<string, GeoTagContext | null>;
        sourceUriByAssetUri?: Map<string, string>;
      }
    ) => {
      debugBreadcrumb('photo_capture.persist_assets.start', {
        patientId,
        category,
        assetCount: assets.length,
      });

      for (const asset of assets) {
        const initialName = asset.fileName || inferFileName(asset.uri);
        const geoTag = options?.geotagByAssetUri?.get(asset.uri);
        const fileName = geoTag ? buildGeoTaggedName(initialName, geoTag) : initialName;
        const preferredSourceUri = options?.sourceUriByAssetUri?.get(asset.uri) || asset.uri;

        const materialized = await materializeLocalAsset(
          preferredSourceUri,
          fileName,
          asset.mimeType || undefined
        );

        let sourceUri = materialized.uri;
        if (!materialized.exists) {
          const fallbackAssetUri = normalizeUri(asset.uri);
          if (safeFileExists(fallbackAssetUri)) {
            sourceUri = fallbackAssetUri;
            debugBreadcrumb('photo_capture.persist_assets.fallback_asset_uri', {
              assetUri: asset.uri,
              preferredSourceUri,
              fallbackAssetUri,
            });
          }
        }

        if (!safeFileExists(sourceUri)) {
          throw new Error(
            `Selected image is not readable on device storage (${sourceUri}).`
          );
        }

        debugBreadcrumb('photo_capture.persist_assets.asset', {
          assetUri: asset.uri,
          sourceUri,
          sourceMode: materialized.mode,
          hasGeoTag: Boolean(geoTag),
        });

        try {
          await createLocalDocument({
            patientId,
            category,
            sourceUri,
            name: fileName,
            contentType: asset.mimeType || inferMimeType(fileName),
            size: asset.fileSize,
            geo: geoTag
              ? {
                  latitude: geoTag.latitude,
                  longitude: geoTag.longitude,
                  address: geoTag.locationLabel,
                  capturedAt: geoTag.capturedAtIso,
                }
              : undefined,
          });
        } catch (error) {
          debugBreadcrumbError('photo_capture.persist_assets.create_local_failed', error, {
            assetUri: asset.uri,
            sourceUri,
            fileName,
          });
          throw error;
        }
      }

      await invalidateAll(queryClient, patientId);

      try {
        await runSyncQueueOnce(documentsApi);
      } catch (error) {
        // Local document creation succeeded. Keep UI updated even if sync fails.
        debugBreadcrumbError('photo_capture.persist_assets.sync_failed', error, {
          patientId,
          category,
        });
      }

      await invalidateAll(queryClient, patientId);
      debugBreadcrumb('photo_capture.persist_assets.completed', {
        patientId,
        category,
        assetCount: assets.length,
      });
    },
    [category, documentsApi, patientId, queryClient]
  );

  const captureFromCamera = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      debugBreadcrumb('photo_capture.camera.permission', {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      });

      if (!permission.granted) {
        Alert.alert('Permission required', 'Camera permission is required to capture documents.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });

      debugBreadcrumb('photo_capture.camera.launch_result', {
        canceled: result.canceled,
        assetCount: result.assets?.length ?? 0,
      });

      if (result.canceled || !result.assets?.length) return;

      const geotagByAssetUri = new Map<string, GeoTagContext | null>();
      const sourceUriByAssetUri = new Map<string, string>();

      let geoTag: GeoTagContext | null = null;
      try {
        geoTag = await resolveGeoTagContext();
        debugBreadcrumb('photo_capture.camera.geotag_context', {
          hasGeoTag: Boolean(geoTag),
          latitude: geoTag?.latitude,
          longitude: geoTag?.longitude,
        });
      } catch (error) {
        debugBreadcrumbError('photo_capture.camera.geotag_context_failed', error);
      }

      for (const asset of result.assets) {
        const fileName = asset.fileName || inferFileName(asset.uri);
        geotagByAssetUri.set(asset.uri, geoTag);

        const materializedInput = await materializeLocalAsset(
          asset.uri,
          fileName,
          asset.mimeType || undefined
        );

        const burnInputUri = materializedInput.uri;
        const burnedUri = await burnGeoMetadataOnImage(burnInputUri, geoTag);
        const materializedOutput = await materializeLocalAsset(
          burnedUri,
          fileName,
          asset.mimeType || undefined
        );

        const finalSourceUri = materializedOutput.exists ? materializedOutput.uri : burnInputUri;
        sourceUriByAssetUri.set(asset.uri, finalSourceUri);

        debugBreadcrumb('photo_capture.camera.asset_processed', {
          assetUri: asset.uri,
          burnInputUri,
          burnedUri,
          finalSourceUri,
          finalExists: safeFileExists(finalSourceUri),
          mimeType: asset.mimeType,
          fileSize: asset.fileSize,
        });
      }

      if (!geoTag) {
        Alert.alert('Location unavailable', 'Photo was captured without location metadata.');
      }

      await persistAssets(result.assets, { geotagByAssetUri, sourceUriByAssetUri });
    } catch (error) {
      debugBreadcrumbError('photo_capture.camera.failed', error, {
        patientId,
        category,
      });
      const message = error instanceof Error ? error.message : 'Could not capture photo. Please try again.';
      Alert.alert('Upload failed', message);
    }
  }, [category, patientId, persistAssets]);

  const pickFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      debugBreadcrumb('photo_capture.gallery.permission', {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      });

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

      debugBreadcrumb('photo_capture.gallery.launch_result', {
        canceled: result.canceled,
        assetCount: result.assets?.length ?? 0,
      });

      if (result.canceled || !result.assets?.length) return;

      await persistAssets(result.assets);
    } catch (error) {
      debugBreadcrumbError('photo_capture.gallery.failed', error, {
        patientId,
        category,
      });
      const message =
        error instanceof Error
          ? error.message
          : 'Could not import selected photo(s). Please try again.';
      Alert.alert('Upload failed', message);
    }
  }, [category, patientId, persistAssets]);

  return {
    captureFromCamera,
    pickFromGallery,
  };
}
