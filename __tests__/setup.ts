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
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    navigate: jest.fn(),
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
    ({ children }: { children: React.ReactNode }) => {
      const React = require('react');
      const { View } = require('react-native');
      return React.createElement(View, { testID: 'tabs' }, children);
    },
    {
      Screen: ({ name }: { name: string }) => {
        const React = require('react');
        return React.createElement(React.Fragment, { key: name });
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

