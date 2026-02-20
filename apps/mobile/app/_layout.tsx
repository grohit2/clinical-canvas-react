import 'expo-sqlite/localStorage/install';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDocumentsDb } from '@patient-documents/mobile';
import { SafeShareIntentProvider } from '../src/lib/shareIntent-provider';

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
