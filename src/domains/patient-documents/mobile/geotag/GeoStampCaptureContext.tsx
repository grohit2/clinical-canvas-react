import type { PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';
import type { GeoStampCaptureHandle } from './GeoStampCapture';

type GeoStampCaptureFn = GeoStampCaptureHandle['captureStampedImage'];

const GeoStampCaptureContext = createContext<GeoStampCaptureFn | null>(null);

export function GeoStampCaptureProvider({
  value,
  children,
}: PropsWithChildren<{ value: GeoStampCaptureFn | null }>) {
  return (
    <GeoStampCaptureContext.Provider value={value}>
      {children}
    </GeoStampCaptureContext.Provider>
  );
}

export function useGeoStampCapture(): GeoStampCaptureFn | null {
  return useContext(GeoStampCaptureContext);
}
