/**
 * @module hooks/use-online-status
 * TanStack Query の onlineManager を購読し、オンライン状態を返す UI フック。
 * 新規依存追加不要（@react-native-community/netinfo は lib/queries/managers が使用済み）。
 */

import { useState, useEffect } from 'react';
import { onlineManager } from '@tanstack/react-query';

/**
 * アプリのオンライン状態をリアクティブに返す。
 * onlineManager.subscribe を使うことで NetInfo の購読を重複させずに済む。
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(onlineManager.isOnline());

  useEffect(() => {
    const unsubscribe = onlineManager.subscribe((newIsOnline) => {
      setIsOnline(newIsOnline);
    });
    return unsubscribe;
  }, []);

  return isOnline;
}
