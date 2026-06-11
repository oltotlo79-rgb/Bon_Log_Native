import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/queries/query-client';
import { setupOnlineManager, setupFocusManager } from '@/lib/queries/managers';

export default function RootLayout() {
  // React の StrictMode 二重発火で重複生成しないよう ref で保持する
  const queryClientRef = useRef<QueryClient | null>(null);
  if (queryClientRef.current === null) {
    queryClientRef.current = createQueryClient();
  }

  useEffect(() => {
    const cleanupOnline = setupOnlineManager();
    const cleanupFocus = setupFocusManager();
    return () => {
      cleanupOnline();
      cleanupFocus();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClientRef.current}>
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="posts/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="posts/[id]/edit/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="posts/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="users/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/profile/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/account/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/notifications/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/subscription/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/blocked/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/muted/index"
            options={{ headerShown: false }}
          />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
