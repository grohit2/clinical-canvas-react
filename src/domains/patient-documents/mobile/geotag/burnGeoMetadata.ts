import { Platform } from 'react-native';
import type { GeoTagContext } from './geoTagPhoto';

function formatDateTime(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;

  return dt.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function mapPreviewUrl(lat: number, lng: number): string {
  const clampedLat = Math.max(-85, Math.min(85, lat));
  const clampedLng = Math.max(-180, Math.min(180, lng));
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${clampedLat},${clampedLng}&zoom=15&size=220x140&markers=${clampedLat},${clampedLng},red-pushpin`;
}

export async function burnGeoMetadataOnImage(
  sourceUri: string,
  geo: GeoTagContext | null
): Promise<string> {
  if (!geo || Platform.OS === 'web') return sourceUri;

  try {
    const Marker = (await import('react-native-image-marker')) as {
      markText: (options: Record<string, unknown>) => Promise<string>;
      markImage: (options: Record<string, unknown>) => Promise<string>;
    };

    let currentUri = sourceUri;

    // Step 1: add mini map thumbnail at bottom-left (similar to GPS camera apps).
    try {
      currentUri = await Marker.markImage({
        backgroundImage: { src: currentUri },
        watermarkImages: [
          {
            src: mapPreviewUrl(geo.latitude, geo.longitude),
            scale: 1,
            alpha: 0.92,
            position: { X: '4%', Y: '77%' },
          },
        ],
        quality: 95,
      });
    } catch (error) {
      console.warn('Map thumbnail burn failed; continuing without map', error);
    }

    const title = geo.locationLabel || 'Location captured';
    const lineLatLng = `Lat ${geo.latitude.toFixed(6)}, Long ${geo.longitude.toFixed(6)}`;
    const lineDate = formatDateTime(geo.capturedAtIso);
    const lineNote = 'Note: Captured by Clinical Canvas';

    // Step 2: add semi-transparent metadata panel lines at bottom.
    currentUri = await Marker.markText({
      backgroundImage: { src: currentUri },
      watermarkTexts: [
        {
          text: `📍 ${title}`,
          positionOptions: { X: '29%', Y: '76.5%' },
          style: {
            color: '#ffffff',
            fontSize: 22,
            bold: true,
            textBackgroundStyle: {
              color: 'rgba(15, 23, 42, 0.62)',
              paddingX: 10,
              paddingY: 6,
            },
          },
        },
        {
          text: lineLatLng,
          positionOptions: { X: '29%', Y: '82.2%' },
          style: {
            color: '#e2e8f0',
            fontSize: 17,
            textBackgroundStyle: {
              color: 'rgba(15, 23, 42, 0.62)',
              paddingX: 10,
              paddingY: 6,
            },
          },
        },
        {
          text: lineDate,
          positionOptions: { X: '29%', Y: '87.1%' },
          style: {
            color: '#cbd5e1',
            fontSize: 16,
            textBackgroundStyle: {
              color: 'rgba(15, 23, 42, 0.62)',
              paddingX: 10,
              paddingY: 6,
            },
          },
        },
        {
          text: lineNote,
          positionOptions: { X: '29%', Y: '91.8%' },
          style: {
            color: '#cbd5e1',
            fontSize: 15,
            textBackgroundStyle: {
              color: 'rgba(15, 23, 42, 0.62)',
              paddingX: 10,
              paddingY: 6,
            },
          },
        },
      ],
      quality: 95,
    });

    return currentUri;
  } catch (error) {
    console.warn('Failed to burn geo metadata on image', error);
    return sourceUri;
  }
}
