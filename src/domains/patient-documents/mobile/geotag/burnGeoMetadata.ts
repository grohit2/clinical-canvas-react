import { Platform } from 'react-native';
import { File as ExpoFile } from 'expo-file-system';
import Marker, { ImageFormat, TextBackgroundType, type TextMarkOptions } from 'react-native-image-marker';
import type { GeoTagContext } from './geoTagPhoto';
import {
  debugBreadcrumb,
  debugBreadcrumbError,
} from '../debug/breadcrumbs';

function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;

  return dt.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeFileUri(uri: string): string {
  if (!uri) return uri;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(uri)) return uri;
  if (uri.startsWith('/')) return `file://${uri}`;
  return uri;
}

export async function burnGeoMetadataOnImage(
  sourceUri: string,
  geo: GeoTagContext | null
): Promise<string> {
  const normalizedSourceUri = normalizeFileUri(sourceUri);

  if (!geo) {
    debugBreadcrumb('geotag_burn.skipped', {
      reason: 'geo_context_unavailable',
      sourceUri: normalizedSourceUri,
    });
    return normalizedSourceUri;
  }

  if (Platform.OS === 'web') {
    debugBreadcrumb('geotag_burn.skipped', {
      reason: 'platform_web',
      sourceUri: normalizedSourceUri,
    });
    return normalizedSourceUri;
  }

  try {
    const title = geo.locationLabel || 'Location captured';
    const lineLatLng = `Lat ${geo.latitude.toFixed(6)}, Long ${geo.longitude.toFixed(6)}`;
    const lineDate = formatDateTime(geo.capturedAtIso);

    debugBreadcrumb('geotag_burn.started', {
      sourceUri: normalizedSourceUri,
      hasLocationLabel: Boolean(geo.locationLabel),
    });

    const options: TextMarkOptions = {
      backgroundImage: { src: normalizedSourceUri },
      watermarkTexts: [
        {
          text: `GeoTag: ${title}`,
          position: { X: '4%', Y: '84%' },
          style: {
            color: '#ffffff',
            fontSize: 22,
            bold: true,
            textBackgroundStyle: {
              color: '#0f172a99',
              type: TextBackgroundType.none,
              paddingX: 10,
              paddingY: 6,
            },
          },
        },
        {
          text: lineLatLng,
          position: { X: '4%', Y: '90%' },
          style: {
            color: '#e2e8f0',
            fontSize: 16,
            textBackgroundStyle: {
              color: '#0f172a99',
              type: TextBackgroundType.none,
              paddingX: 10,
              paddingY: 4,
            },
          },
        },
        {
          text: lineDate,
          position: { X: '4%', Y: '94%' },
          style: {
            color: '#cbd5e1',
            fontSize: 15,
            textBackgroundStyle: {
              color: '#0f172a99',
              type: TextBackgroundType.none,
              paddingX: 10,
              paddingY: 4,
            },
          },
        },
      ],
      saveFormat: ImageFormat.jpg,
      quality: 95,
    };

    const burnedOutput = await Marker.markText(options);
    const burnedUri = normalizeFileUri(burnedOutput || '');

    if (!burnedUri) {
      debugBreadcrumb('geotag_burn.fallback', {
        reason: 'marker_empty_output',
        sourceUri: normalizedSourceUri,
      });
      return normalizedSourceUri;
    }

    const burnedFile = new ExpoFile(burnedUri);
    if (!burnedFile.exists) {
      debugBreadcrumb('geotag_burn.fallback', {
        reason: 'burned_file_missing',
        sourceUri: normalizedSourceUri,
        burnedUri,
      });
      return normalizedSourceUri;
    }

    debugBreadcrumb('geotag_burn.success', {
      sourceUri: normalizedSourceUri,
      burnedUri,
    });

    return burnedUri;
  } catch (error) {
    debugBreadcrumbError('geotag_burn.fallback', error, {
      reason: 'marker_exception',
      sourceUri: normalizedSourceUri,
    });

    return normalizedSourceUri;
  }
}
