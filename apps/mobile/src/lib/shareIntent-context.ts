export interface SharedFile {
  path: string;
  mimeType?: string;
  fileName?: string;
  size?: number;
}

export interface ShareIntentContextValue {
  hasShareIntent: boolean;
  shareIntent: {
    files?: SharedFile[];
  };
  resetShareIntent: () => void;
}

const FALLBACK_CONTEXT: ShareIntentContextValue = {
  hasShareIntent: false,
  shareIntent: { files: [] },
  resetShareIntent: () => undefined,
};

function getNativeShareIntentHook():
  | (() => ShareIntentContextValue)
  | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-share-intent') as {
      useShareIntentContext?: () => ShareIntentContextValue;
    };
    return mod.useShareIntentContext ?? null;
  } catch {
    return null;
  }
}

export function useSafeShareIntentContext(): ShareIntentContextValue {
  const nativeHook = getNativeShareIntentHook();
  if (!nativeHook) return FALLBACK_CONTEXT;

  try {
    return nativeHook();
  } catch {
    return FALLBACK_CONTEXT;
  }
}
