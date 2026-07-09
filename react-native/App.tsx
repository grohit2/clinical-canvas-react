/**
 * Clinical Canvas - React Native App
 *
 * Patient List and Patient Details Module
 *
 * This React Native implementation provides:
 * - Patient List screen with search and filtering
 * - Patient Detail screen with comprehensive patient information
 * - Stage-based color coding and badges
 * - Pinned patients (My Patients) functionality
 * - Pull to refresh
 * - Mock API service for development
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <RootNavigator />
    </>
  );
}
