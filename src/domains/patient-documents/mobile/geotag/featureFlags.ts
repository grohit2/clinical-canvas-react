function envFlag(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === '1' || raw === 'true') return true;
  if (raw === '0' || raw === 'false') return false;
  return defaultValue;
}

export const GEO_FLAGS = {
  enabled: envFlag('EXPO_PUBLIC_ENABLE_GEO_TAG', true),
  thumbExport: envFlag('EXPO_PUBLIC_ENABLE_GEO_THUMB_EXPORT', true),
  saveToGallery: envFlag('EXPO_PUBLIC_SAVE_TO_DEVICE_GALLERY', false),
  reverseGeocode: envFlag('EXPO_PUBLIC_REVERSE_GEOCODE', true),
  scrollScrubber: envFlag('EXPO_PUBLIC_ENABLE_DOCS_SCROLL_SCRUBBER', true),
} as const;
