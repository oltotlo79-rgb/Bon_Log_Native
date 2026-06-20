/**
 * @module __tests__/setup
 * Jest セットアップ — ネイティブモジュールの一元モック定義。
 * テストファイルごとの ad-hoc モックを散在させない（testing.md 規約）。
 */

/* eslint-disable @typescript-eslint/no-require-imports */
// jest.mock のファクトリ内では ES import が使えないため require を使用する（Jest 制約）。

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

