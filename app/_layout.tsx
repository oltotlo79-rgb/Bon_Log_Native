import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '@/lib/queries/query-client';
import { setupOnlineManager, setupFocusManager } from '@/lib/queries/managers';
import { initSentry, captureException } from '@/lib/monitoring/sentry';
import { ScreenError } from '@/components/common/ScreenError';

// Sentry はモジュールロード時（アプリ起動最初期）に1回だけ初期化する
initSentry();

// ---------------------------------------------------------------------------
// ErrorBoundary（ルートレベル）
// ---------------------------------------------------------------------------

export function ErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  // ErrorBoundary が捕捉した例外は予期しないエラーとして Sentry へ送信する
  captureException(error);

  return (
    <ScreenError
      title="エラーが発生しました"
      onRetry={retry}
      debugMessage={error.message}
    />
  );
}

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  // StrictMode の二重発火でも再生成されないよう lazy init で保持する
  const [queryClient] = useState<QueryClient>(() => createQueryClient());

  useEffect(() => {
    const cleanupOnline = setupOnlineManager();
    const cleanupFocus = setupFocusManager();
    return () => {
      cleanupOnline();
      cleanupFocus();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
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
