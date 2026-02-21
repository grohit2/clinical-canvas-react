import 'react-native-get-random-values';
import { Platform } from 'react-native';
import { installDebugDiagnostics } from '@patient-documents/mobile/debug/breadcrumbs';

const ENABLE_NATIVE_SCREENS = process.env.EXPO_PUBLIC_ENABLE_NATIVE_SCREENS === '1';

if (Platform.OS === 'android' && !ENABLE_NATIVE_SCREENS) {
  try {
    const screens = require('react-native-screens');
    screens.enableScreens?.(false);
    screens.enableFreeze?.(false);
  } catch {
    // Ignore if react-native-screens cannot be patched in this runtime.
  }
}

installDebugDiagnostics();

// Install diagnostics before bootstrapping Expo Router.
require('expo-router/entry');
