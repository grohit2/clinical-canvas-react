import { useShareIntentContext as useNativeShareIntentContext } from 'expo-share-intent';

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

export function useSafeShareIntentContext(): ShareIntentContextValue {
  try {
    return useNativeShareIntentContext() as ShareIntentContextValue;
  } catch {
    return FALLBACK_CONTEXT;
  }
}
