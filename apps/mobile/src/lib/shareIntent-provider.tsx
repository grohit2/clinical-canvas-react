import type { ReactNode } from 'react';
import { ShareIntentProvider as NativeShareIntentProvider } from 'expo-share-intent';

export function SafeShareIntentProvider({ children }: { children: ReactNode }) {
  return <NativeShareIntentProvider>{children}</NativeShareIntentProvider>;
}
