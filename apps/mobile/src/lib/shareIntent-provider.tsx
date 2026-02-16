import type { ComponentType, ReactNode } from 'react';
import { Fragment } from 'react';

type ProviderProps = { children: ReactNode };

function getNativeProvider(): ComponentType<ProviderProps> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-share-intent') as {
      ShareIntentProvider?: ComponentType<ProviderProps>;
    };
    return mod.ShareIntentProvider ?? Fragment;
  } catch {
    return Fragment;
  }
}

export function SafeShareIntentProvider({ children }: { children: ReactNode }) {
  const Provider = getNativeProvider();
  return <Provider>{children}</Provider>;
}
