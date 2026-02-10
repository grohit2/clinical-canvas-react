import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDocumentsDb } from '../src/domains/patient-documents/offline/db';
import { SafeShareIntentProvider } from '../src/lib/shareIntent-provider';
import { useSafeShareIntentContext } from '../src/lib/shareIntent-context';

onlineManager.setEventListener((setOnline) => {
  return NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  });
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
    },
  },
});

function RootLayoutInner() {
  const router = useRouter();
  const shareIntent = useSafeShareIntentContext();
  const handledRef = useRef(false);

  useEffect(() => {
    const files = shareIntent.shareIntent.files || [];
    if (!shareIntent.hasShareIntent || files.length === 0) {
      handledRef.current = false;
      return;
    }
    if (handledRef.current) return;
    handledRef.current = true;

    router.push('/import-shared' as never);
  }, [router, shareIntent.hasShareIntent, shareIntent.shareIntent.files]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#fff' },
          }}
        >
          <Stack.Screen name="import-shared" options={{ presentation: 'modal' }} />
        </Stack>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void initDocumentsDb();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeShareIntentProvider>
        <RootLayoutInner />
      </SafeShareIntentProvider>
    </GestureHandlerRootView>
  );
}
