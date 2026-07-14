/**
 * @module hooks/use-push-registration
 * ログイン後、既に通知許可済みの端末だけ Push デバイス登録を試みる UI フック。
 * push-notifications.md: 初回起動では許可ダイアログを出さない。
 * signedIn になった瞬間に 1 回だけ実行し、多重発火を useRef で防ぐ。
 */

import { useEffect, useRef } from 'react';
import {
  createPushRegistrationGuard,
  getPushPermissionStatus,
  registerDeviceForPushNotifications,
} from '@/lib/push';
import type { AuthStatus } from '@/lib/auth/auth-store';

type UsePushRegistrationOptions = {
  status: AuthStatus;
};

/**
 * signedIn に遷移した直後、既に通知許可済みなら Push デバイス登録を試みる。
 * 未許可の場合は設定画面の明示操作に許可要求を委ねる。
 * 失敗しても通知が届かないだけでアプリは継続する。
 * 許可拒否・エミュレータ環境は core 側（registerDeviceForPushNotifications）が吸収する。
 */
export function usePushRegistration({ status }: UsePushRegistrationOptions): void {
  // セッション単位で "登録を試みた" かを追跡する。
  // signedOut → signedIn への再サインインでもリセットされる必要があるため
  // status が signedOut に戻った時点でフラグをリセットする。
  const hasRegisteredRef = useRef(false);

  useEffect(() => {
    if (status === 'signedOut') {
      hasRegisteredRef.current = false;
      return;
    }

    if (status !== 'signedIn' || hasRegisteredRef.current) {
      return;
    }

    hasRegisteredRef.current = true;
    const isCurrentRegistration = createPushRegistrationGuard();
    let cancelled = false;

    void (async () => {
      try {
        const permission = await getPushPermissionStatus();
        if (cancelled || !isCurrentRegistration() || !permission.granted) {
          return;
        }
        await registerDeviceForPushNotifications();
      } catch {
        // 権限確認・登録失敗はアプリ継続を妨げない。
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);
}
