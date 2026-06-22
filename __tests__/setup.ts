/**
 * @module __tests__/setup
 * Jest セットアップ — ネイティブモジュールの一元モック定義。
 * テストファイルごとの ad-hoc モックを散在させない（testing.md 規約）。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock のファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

import { Animated } from 'react-native';
import { notifyManager, timeoutManager } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Animated アニメーション同期化モック
// ---------------------------------------------------------------------------
// テスト環境（IS_REACT_ACT_ENVIRONMENT=true）では、requestAnimationFrame が
// setTimeout(cb, 0) に置き換えられているため、JS 駆動アニメーション
// （useNativeDriver: false）の ValueUpdate コールバックが act 外・非同期で呼ばれ、
// "An update to Animated(View) inside a test was not wrapped in act(...)" 警告が発生する。
// 以下の上書きで timing/spring/decay/sequence/parallel を即時・同期完了させ、
// loop を no-op にすることで警告を解消する。
// 本番コードの Animated 呼び出しが引き続き機能する（Value の最終値が即時セットされる）。
//
// 参考: react-native/Libraries/Animated/AnimatedMock.js（同じパターン）。
// ---------------------------------------------------------------------------

type AnimatedEndResult = { finished: boolean };
type AnimatedEndCallback = (result: AnimatedEndResult) => void;

type SyncCompositeAnimation = {
  start: (callback?: AnimatedEndCallback) => void;
  stop: () => void;
  reset: () => void;
  _startNativeLoop: (iterations?: number) => void;
  _isUsingNativeDriver: () => boolean;
};

// コールバックを即時同期呼び出しするラッパー
// 再帰呼び出し（アニメーションコールバック内から別のアニメーションを開始する場合）を
// ガードして無限ループを防ぐ（AnimatedMock.js と同じ保護）。
let inAnimationCallback = false;
function wrapImmediateStart(
  startFn: (cb?: AnimatedEndCallback) => void,
): (callback?: AnimatedEndCallback) => void {
  return (callback) => {
    if (callback == null) {
      startFn(callback);
      return;
    }
    const guarded: AnimatedEndCallback = (...args) => {
      if (inAnimationCallback) {
        return;
      }
      inAnimationCallback = true;
      try {
        callback(...args);
      } finally {
        inAnimationCallback = false;
      }
    };
    startFn(guarded);
  };
}

const noopAnimation: SyncCompositeAnimation = {
  start: () => {},
  stop: () => {},
  reset: () => {},
  _startNativeLoop: () => {},
  _isUsingNativeDriver: () => false,
};

function makeImmediateAnimation(
  immediateStart: (cb?: AnimatedEndCallback) => void,
): SyncCompositeAnimation {
  return {
    ...noopAnimation,
    start: wrapImmediateStart(immediateStart),
  };
}

// timing: コールバックのみ即時同期呼び出し（setValue は呼ばない）
// Animated.timing は TypeScript の型定義上 readonly だが、実行時は writable であるため
// Object.defineProperty で上書きする（型アサーション不使用）。
// setValue() は AnimatedValue サブスクライバを介して React 更新をスケジュールするため
// 呼ばない。act 外での setValue() が act 警告の直接原因となるため省略する。
Object.defineProperty(Animated, 'timing', {
  configurable: true,
  writable: true,
  value: (
    _value: Parameters<typeof Animated.timing>[0],
    _config: Parameters<typeof Animated.timing>[1],
  ): ReturnType<typeof Animated.timing> =>
    makeImmediateAnimation((cb) => {
      cb?.({ finished: true });
    }),
});

// spring: コールバックのみ即時同期呼び出し（setValue は呼ばない）
Object.defineProperty(Animated, 'spring', {
  configurable: true,
  writable: true,
  value: (
    _value: Parameters<typeof Animated.spring>[0],
    _config: Parameters<typeof Animated.spring>[1],
  ): ReturnType<typeof Animated.spring> =>
    makeImmediateAnimation((cb) => {
      cb?.({ finished: true });
    }),
});

// decay: no-op（toValue がないため即時セット不可）
Object.defineProperty(Animated, 'decay', {
  configurable: true,
  writable: true,
  value: (
    _value: Parameters<typeof Animated.decay>[0],
    _config: Parameters<typeof Animated.decay>[1],
  ): ReturnType<typeof Animated.decay> => noopAnimation,
});

// sequence: 各アニメーションを順次 start して最後にコールバック
Object.defineProperty(Animated, 'sequence', {
  configurable: true,
  writable: true,
  value: (
    animations: Parameters<typeof Animated.sequence>[0],
  ): ReturnType<typeof Animated.sequence> =>
    makeImmediateAnimation((cb) => {
      animations.forEach((anim) => anim.start());
      cb?.({ finished: true });
    }),
});

// parallel: 全アニメーションを start して最後にコールバック
Object.defineProperty(Animated, 'parallel', {
  configurable: true,
  writable: true,
  value: (
    animations: Parameters<typeof Animated.parallel>[0],
    _config?: Parameters<typeof Animated.parallel>[1],
  ): ReturnType<typeof Animated.parallel> =>
    makeImmediateAnimation((cb) => {
      animations.forEach((anim) => anim.start());
      cb?.({ finished: true });
    }),
});

// loop: no-op（無限ループを防ぐ。テストで loop アニメーションの完了は検証しない）
Object.defineProperty(Animated, 'loop', {
  configurable: true,
  writable: true,
  value: (
    _animation: Parameters<typeof Animated.loop>[0],
    _config?: Parameters<typeof Animated.loop>[1],
  ): ReturnType<typeof Animated.loop> => noopAnimation,
});

// notifyManager の内部スケジューラを同期化する。
// デフォルトは setTimeout(cb, 0) で非同期バッチするため、テスト終了後に残留タイマーが
// 残り「Jest did not exit」を引き起こす。cb() を直接呼ぶことで残留を防ぐ。
// @testing-library/react-query 系の定番パターン（testing.md）。
// cleanup() は @testing-library/react-native の index.js が自動 afterEach で呼ぶため不要。
notifyManager.setScheduler((cb) => cb());

// timeoutManager に unref() 付きプロバイダーを設定する。
// staleTime / gcTime / refetchInterval は timeoutManager.setTimeout / setInterval 経由で
// Node.js の setTimeout / setInterval に登録される。テスト終了後も残留するタイマーが
// プロセス終了をブロックしないよう、.unref() を呼んでイベントループから切り離す。
type UnrefableTimer = ReturnType<typeof setTimeout> & { unref?: () => void };
timeoutManager.setTimeoutProvider({
  setTimeout: (cb, delay) => {
    const id = setTimeout(cb, delay) as UnrefableTimer;
    id.unref?.();
    return id;
  },
  clearTimeout: (id) => clearTimeout(id as UnrefableTimer),
  setInterval: (cb, delay) => {
    const id = setInterval(cb, delay) as UnrefableTimer;
    id.unref?.();
    return id;
  },
  clearInterval: (id) => clearInterval(id as UnrefableTimer),
});

// expo-router のモック
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useSegments: jest.fn(() => [] as string[]),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  })),
  useNavigation: jest.fn(() => ({
    addListener: jest.fn(() => jest.fn()),
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
    canGoBack: jest.fn(() => true),
  })),
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
  },
  Redirect: ({ href }: { href: string }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, { testID: 'redirect' }, `Redirect:${href}`);
  },
  Link: ({ href, children }: { href: string; children: React.ReactNode; accessibilityRole?: string }) => {
    const React = require('react');
    const { TouchableOpacity } = require('react-native');
    return React.createElement(TouchableOpacity, { testID: `link-${href}`, accessibilityRole: 'link' }, children);
  },
  Tabs: Object.assign(
    ({ children, screenOptions: _screenOptions }: { children: React.ReactNode; screenOptions?: unknown }) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { testID: 'tabs' }, children);
    },
    {
      Screen: ({
        name,
        options,
      }: {
        name: string;
        options?: {
          tabBarLabel?: (props: { focused: boolean; color: string }) => React.ReactNode;
          tabBarIcon?: (props: { color: string; focused: boolean; size: number }) => React.ReactNode;
          [key: string]: unknown;
        };
      }) => {
        const React = require('react');
        const { View } = require('react-native');
        const labelEl = options?.tabBarLabel?.({ focused: false, color: '#000' }) ?? null;
        const iconEl = options?.tabBarIcon?.({ color: '#000', focused: false, size: 20 }) ?? null;
        return React.createElement(
          View,
          { testID: `tab-screen-${name}` },
          labelEl,
          iconEl
        );
      },
    }
  ),
  Stack: Object.assign(
    ({ children }: { children: React.ReactNode }) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { testID: 'stack' }, children);
    },
    {
      Screen: ({ name }: { name: string }) => {
        const React = require('react');
        return React.createElement(React.Fragment, { key: name });
      },
    }
  ),
}));

// react-native-safe-area-context のモック
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'safe-area-provider' }, children),
    SafeAreaView: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(View, { testID: 'safe-area-view', ...props }, children),
    useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
    useSafeAreaFrame: jest.fn(() => ({ x: 0, y: 0, width: 375, height: 812 })),
    initialWindowMetrics: {
      frame: { x: 0, y: 0, width: 375, height: 812 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  };
});

// react-native-gesture-handler のモック
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, { testID: 'gesture-handler-root' }, children),
    Gesture: {
      Tap: jest.fn(() => ({ onEnd: jest.fn(), runOnJS: jest.fn() })),
    },
  };
});

// @expo/vector-icons のモック（Ionicons）
// accessibilityElementsHidden / importantForAccessibility はテスト要素の検索に影響しないよう除外する
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({
    name,
    size,
    color,
    testID,
    accessibilityElementsHidden: _hidden,
    importantForAccessibility: _importance,
    ...rest
  }: {
    name: string;
    size?: number;
    color?: string;
    testID?: string;
    accessibilityElementsHidden?: boolean;
    importantForAccessibility?: string;
    [key: string]: unknown;
  }) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(
      Text,
      { testID: testID ?? `icon-${name}`, ...rest },
      name
    );
  },
}));

// expo-status-bar のモック
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// @sentry/react-native のデフォルトモック
// sentry.test.ts は jest.resetModules() + 個別 mock で上書きするため、
// ここでは他テストへの副作用（実ネイティブモジュール呼び出し）を防ぐ最小モックを置く
jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  withScope: jest.fn(),
}));

// expo-secure-store のモック
// トークンを実際のキーストアに書き込まないよう、in-memory ストアで代替する
jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string): Promise<string | null> => {
      return store.get(key) ?? null;
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    _store: store,
  };
});

// lib/auth/use-auth のモック
// LoginScreen 等が useAuth() を呼ぶため、テスト環境では安定したデフォルト値を返す
jest.mock('@/lib/auth/use-auth', () => ({
  useAuth: jest.fn(() => ({
    status: 'signedOut' as const,
    isSignedIn: false,
    isLoading: false,
    lastAuthFailureReason: null,
  })),
}));

// expo-notifications のモック
// Push 通知の OS ダイアログ・ネイティブチャネル API をテスト環境で安全に代替する
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(async () => ({
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  })),
  requestPermissionsAsync: jest.fn(async () => ({
    granted: false,
    canAskAgain: false,
    status: 'denied',
  })),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: 'ExponentPushToken[test-token-xxx]',
    type: 'expo',
  })),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

// expo-device のモック
// デフォルトは物理デバイス（isDevice: true）として扱う。
// エミュレータ動作を検証するテストでは mockExpoDeviceIsDevice ヘルパーを使い
// jest.replaceProperty(require('expo-device'), 'isDevice', false) などで切り替える。
// isDevice はゲッターとして定義し、_isDevice 変数経由で動的変更可能にする。
jest.mock('expo-device', () => {
  let _isDevice = true;
  return {
    get isDevice() {
      return _isDevice;
    },
    set isDevice(value: boolean) {
      _isDevice = value;
    },
    deviceName: 'Test Device',
    osName: 'Android',
    osVersion: '14.0',
  };
});

// expo-constants のモック（projectId 解決用）
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    },
  },
}));

// expo-web-browser のモック
// openBrowserAsync はアプリ内ブラウザを起動するネイティブ API。テスト環境では no-op にする。
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(async () => ({ type: 'opened' })),
  dismissBrowser: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(async () => ({ type: 'dismiss' })),
}));

// KeyboardAvoidingView のモック
// RN の KeyboardAvoidingView.componentDidMount は _setBottom で setState を呼ぶ。
// react-test-renderer の commitLayoutEffectOnFiber 直後に同期で setState が走るため
// IS_REACT_ACT_ENVIRONMENT=true 環境では act 外更新警告になる。
// テスト環境ではキーボード回避ロジックは不要なため、シンプルな View に置き換えて警告を除去する。
jest.mock('react-native/Libraries/Components/Keyboard/KeyboardAvoidingView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      style,
      testID,
      ...rest
    }: {
      children?: React.ReactNode;
      style?: unknown;
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(View, { style, testID, ...rest }, children),
  };
});

// expo-image のモック
jest.mock('expo-image', () => {
  const React = require('react');
  const { Image } = require('react-native');
  return {
    Image: ({
      source,
      style,
      contentFit: _contentFit,
      transition: _transition,
      recyclingKey: _recyclingKey,
      placeholder: _placeholder,
      accessibilityLabel,
      accessibilityRole,
      testID,
      ...rest
    }: {
      source?: unknown;
      style?: unknown;
      contentFit?: string;
      transition?: number;
      recyclingKey?: string;
      placeholder?: unknown;
      accessibilityLabel?: string;
      accessibilityRole?: string;
      testID?: string;
      [key: string]: unknown;
    }) =>
      React.createElement(Image, {
        source,
        style,
        accessibilityLabel,
        accessibilityRole,
        testID,
        ...rest,
      }),
  };
});

