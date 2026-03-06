import { createApiClient } from '@clinical-canvas/core';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const DEFAULT_REMOTE_API =
  'https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws';

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeForPlatform(url: string): string {
  if (Platform.OS !== 'android') return url;

  // Android emulator cannot reach localhost of host machine directly.
  return url
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2');
}

export function getApiBaseUrl(): string {
  if (Platform.OS === 'web') {
    // Web uses local proxy to avoid duplicate CORS headers from the lambda endpoint.
    return 'http://localhost:3001';
  }

  const configuredRaw =
    Constants.expoConfig?.extra?.apiBaseUrl ||
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    DEFAULT_REMOTE_API;

  const configured = String(configuredRaw).trim();

  // Native must use an absolute URL. Relative values (e.g. "/api") route to Metro (:8081).
  if (!isAbsoluteHttpUrl(configured)) {
    return normalizeForPlatform(DEFAULT_REMOTE_API);
  }

  return normalizeForPlatform(configured);
}

export const api = createApiClient({
  baseUrl: getApiBaseUrl(),
});
