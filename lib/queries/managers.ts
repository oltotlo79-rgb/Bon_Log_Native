/**
 * @module lib/queries/managers
 * TanStack Query の onlineManager / focusManager をネイティブ OS に接続するセットアップ関数。
 * React コンポーネント・JSX には依存しない。
 * frontend が app/_layout.tsx でこれらを呼び出し、戻り値の解除関数を cleanup で実行する。
 */

import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';

/**
 * NetInfo を onlineManager に接続する。
 * ネットワーク断線・復帰を検知し、復帰時に自動 refetch が走るようにする（data-fetching.md）。
 * @returns 購読を解除する cleanup 関数
 */
export function setupOnlineManager(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    onlineManager.setOnline(state.isConnected === true && state.isInternetReachable !== false);
  });

  return unsubscribe;
}

/**
 * AppState を focusManager に接続する。
 * アプリがフォアグラウンドに戻ったときに stale なクエリを refetch する（data-fetching.md）。
 * @returns AppState リスナーを解除する cleanup 関数
 */
export function setupFocusManager(): () => void {
  function handleAppStateChange(status: AppStateStatus): void {
    focusManager.setFocused(status === 'active');
  }

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => subscription.remove();
}
