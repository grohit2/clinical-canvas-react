import * as Location from 'expo-location';

export interface GeoTagContext {
  latitude: number;
  longitude: number;
  capturedAtIso: string;
  locationLabel?: string;
}

export interface ParsedGeoTag {
  latitude: number;
  longitude: number;
  capturedAtIso: string;
  locationLabel?: string;
}

const GEO_TAG_MARKER = '__geotag_';

function toSafeChunk(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48);
}

function fromSafeChunk(value: string): string {
  return value.replace(/_/g, ' ').trim();
}

function splitFileName(fileName: string): { base: string; ext: string } {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex <= 0) return { base: fileName, ext: 'jpg' };
  return {
    base: fileName.slice(0, dotIndex),
    ext: fileName.slice(dotIndex + 1),
  };
}

function compactIso(iso: string): string {
  return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function expandIso(value: string): string {
  const normalized = value.endsWith('Z') ? value.slice(0, -1) : value;
  if (normalized.length < 15) return new Date().toISOString();

  const yyyy = normalized.slice(0, 4);
  const mm = normalized.slice(4, 6);
  const dd = normalized.slice(6, 8);
  const hh = normalized.slice(9, 11);
  const min = normalized.slice(11, 13);
  const ss = normalized.slice(13, 15);
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.000Z`;
}

export function buildGeoTaggedName(fileName: string, geo: GeoTagContext): string {
  const { base, ext } = splitFileName(fileName);
  const lat = geo.latitude.toFixed(5);
  const lng = geo.longitude.toFixed(5);
  const stamp = compactIso(geo.capturedAtIso);
  const locationPart = geo.locationLabel ? `_${toSafeChunk(geo.locationLabel)}` : '';
  return `${base}${GEO_TAG_MARKER}${lat}_${lng}_${stamp}${locationPart}.${ext}`;
}

export function parseGeoTagFromName(fileName?: string): ParsedGeoTag | null {
  if (!fileName) return null;

  const markerIndex = fileName.indexOf(GEO_TAG_MARKER);
  if (markerIndex < 0) return null;

  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const taggedPart = withoutExt.slice(markerIndex + GEO_TAG_MARKER.length);
  const parts = taggedPart.split('_');
  if (parts.length < 3) return null;

  const latitude = Number(parts[0]);
  const longitude = Number(parts[1]);
  const capturedAtIso = expandIso(parts[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const locationLabelRaw = parts.slice(3).join('_');
  return {
    latitude,
    longitude,
    capturedAtIso,
    locationLabel: locationLabelRaw ? fromSafeChunk(locationLabelRaw) : undefined,
  };
}

export function formatGeoTagSummary(geo: ParsedGeoTag): string {
  const lat = geo.latitude.toFixed(4);
  const lng = geo.longitude.toFixed(4);
  return `📍 ${lat}, ${lng}`;
}

export async function resolveGeoTagContext(): Promise<GeoTagContext | null> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted) return null;

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let label: string | undefined;
  try {
    const [place] = await Location.reverseGeocodeAsync({
      latitude: current.coords.latitude,
      longitude: current.coords.longitude,
    });
    if (place) {
      label = [place.city, place.region, place.country].filter(Boolean).join(', ');
    }
  } catch {
    // Best-effort only.
  }

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    capturedAtIso: new Date().toISOString(),
    locationLabel: label,
  };
}
