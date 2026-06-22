import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
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
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { initializeAuth } from '@/lib/auth';
import { useAuth } from '@/lib/auth/use-auth';
import { ROUTE_LOGIN, ROUTE_FEED } from '@/lib/constants/routes';
import { setupPushNotifications } from '@/lib/push';
import { usePushRegistration } from '@/hooks/use-push-registration';

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
// AuthGuard — 認証状態に応じてルーティングを制御する
// ---------------------------------------------------------------------------

function AuthGuard() {
  const { status } = useAuth();
  const segments = useSegments();

  usePushRegistration({ status });

  useEffect(() => {
    if (status === 'loading') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'signedOut' && !inAuthGroup) {
      router.replace(ROUTE_LOGIN);
    } else if (status === 'signedIn' && inAuthGroup) {
      router.replace(ROUTE_FEED);
    }
  }, [status, segments]);

  return null;
}

// ---------------------------------------------------------------------------
// Root Layout
// ---------------------------------------------------------------------------

export default function RootLayout() {
  // StrictMode の二重発火でも再生成されないよう lazy init で保持する
  const [queryClient] = useState<QueryClient>(() => createQueryClient());
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const cleanupOnline = setupOnlineManager();
    const cleanupFocus = setupFocusManager();
    return () => {
      cleanupOnline();
      cleanupFocus();
    };
  }, []);

  useEffect(() => {
    // 通知ハンドラと Android チャネルの初期化。例外でも起動を止めない。
    void setupPushNotifications().catch(() => undefined);
  }, []);

  useEffect(() => {
    void initializeAuth({ queryClient }).then(() => {
      setAuthInitialized(true);
    });
    // queryClient は lazy init で安定しているため依存配列から除外する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authInitialized) {
    return (
      <SafeAreaProvider>
        <ScreenLoading variant="spinner" accessibilityLabel="認証情報を確認中" />
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        {/* AuthGuard は QueryClientProvider 配下で useAuth を使うため Stack と並置する */}
        <AuthGuard />
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
          {/* ウェーブ1 閲覧系スタック画面 */}
          <Stack.Screen
            name="dictionary/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="dictionary/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="fertilizers/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="fertilizers/nutrients/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="fertilizers/tree-species/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="hormones/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="hormones/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="pesticides/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="pesticides/disease-pests/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="pesticides/products/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="pesticides/ingredients/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="explore/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="explore/posts/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="legal/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="legal/[slug]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="analytics/index"
            options={{ headerShown: false }}
          />
          {/* ウェーブ2 操作系スタック画面 */}
          <Stack.Screen
            name="bookmarks/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="bonsai/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="bonsai/care-logs/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="bonsai/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="bonsai/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="bonsai/[id]/edit/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="bonsai/[id]/records/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="bonsai/[id]/records/[recordId]/edit/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="scheduled-posts/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="scheduled-posts/locked/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="scheduled-posts/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="scheduled-posts/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="scheduled-posts/[id]/edit/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/* ウェーブ2 イベント */}
          <Stack.Screen
            name="events/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="events/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="events/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="events/[id]/edit/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          {/* ウェーブ2 盆栽園マップ */}
          <Stack.Screen
            name="shops/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="shops/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="shops/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="shops/[id]/edit/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="shops/[id]/reviews/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="shops/[id]/reviews/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
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
