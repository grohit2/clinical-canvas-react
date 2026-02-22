import * as Location from 'expo-location';
import type { DocumentItem } from '../../core/types';
import { GEO_FLAGS } from './featureFlags';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

async function resolveAddress(
  latitude: number,
  longitude: number
): Promise<string | undefined> {
  if (!GEO_FLAGS.reverseGeocode) return undefined;

  try {
    const result = await withTimeout(
      Location.reverseGeocodeAsync({ latitude, longitude }),
      4000
    );
    const first = result[0];
    if (!first) return undefined;

    const parts = [first.name, first.street, first.city, first.region, first.country]
      .map((value) => value?.trim())
      .filter((value): value is string => !!value);

    return parts.length ? parts.join(', ') : undefined;
  } catch {
    return undefined;
  }
}

export async function getGeoTagForPhoto(): Promise<DocumentItem['geo'] | null> {
  if (!GEO_FLAGS.enabled) return null;

  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const lastKnown = await Location.getLastKnownPositionAsync({});
  let position = lastKnown;

  if (!position) {
    try {
      position = await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        6000
      );
    } catch {
      return null;
    }
  }

  if (!position) return null;

  const address = await resolveAddress(
    position.coords.latitude,
    position.coords.longitude
  );

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    address,
    capturedAt: new Date(position.timestamp).toISOString(),
  };
}

export function formatGeoStampText(geo: NonNullable<DocumentItem['geo']>): string {
  const title = geo.address?.trim() || 'Location captured';
  const coords = `Lat ${geo.latitude.toFixed(6)}, Long ${geo.longitude.toFixed(6)}`;

  let dateLine = '';
  if (geo.capturedAt) {
    const parsed = new Date(geo.capturedAt);
    dateLine = Number.isNaN(parsed.getTime())
      ? geo.capturedAt
      : parsed.toLocaleString();
  }

  return [title, coords, dateLine].filter(Boolean).join('\n');
}
