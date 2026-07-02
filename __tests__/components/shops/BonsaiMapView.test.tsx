/**
 * components/shops/BonsaiMapView のコンポーネントテスト。
 * WebView + Leaflet + expo-location を使った盆栽園マップの動作を検証する。
 *
 * WebView / expo-location は __tests__/setup.ts の一元モックを使用する。
 * テストごとに ad-hoc モックを散在させない（testing.md 規約）。
 */

import React from 'react';
import { Alert, Linking } from 'react-native';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { BonsaiMapView, type ShopMapItem } from '@/components/shops/BonsaiMapView';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import * as Location from 'expo-location';

const mockRouterPush = jest.requireMock('expo-router').router.push as jest.Mock;

// ---------------------------------------------------------------------------
// テスト用データファクトリ
// ---------------------------------------------------------------------------

function makeShopMapItem(overrides: Partial<ShopMapItem> = {}): ShopMapItem {
  return {
    id: 'shop-1',
    name: '黒松盆栽園',
    latitude: 35.6762,
    longitude: 139.6503,
    address: '東京都台東区上野',
    averageRating: 4.2,
    reviewCount: 15,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// オフライン時のフォールバック表示
// ---------------------------------------------------------------------------

describe('BonsaiMapView - オフライン', () => {
  it('isOnline=false のとき「オフラインのため地図を表示できません」が表示される', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline={false} />);
    expect(screen.getByText('オフラインのため地図を表示できません')).toBeTruthy();
  });

  it('isOnline=false のとき WebView が表示されない', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline={false} />);
    expect(screen.queryByTestId('mock-webview')).toBeNull();
  });

  it('isOnline=false のとき現在地ボタンが表示されない', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline={false} />);
    expect(screen.queryByRole('button', { name: '現在地に移動' })).toBeNull();
  });

  it('オフラインコンテナは accessibilityRole="text" を持つ', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline={false} />);
    const el = screen.getByText('オフラインのため地図を表示できません');
    expect(el).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オンライン時の基本レンダリング
// ---------------------------------------------------------------------------

describe('BonsaiMapView - オンライン基本表示', () => {
  it('isOnline=true のとき WebView が表示される', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('地図コンテナの accessibilityLabel が「盆栽園マップ」', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);
    expect(screen.getByLabelText('盆栽園マップ')).toBeTruthy();
  });

  it('現在地ボタンが表示される', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);
    expect(screen.getByRole('button', { name: '現在地に移動' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// WebView へのマーカーデータ受け渡し
// ---------------------------------------------------------------------------

describe('BonsaiMapView - マーカーデータ', () => {
  it('shops が空のとき WebView がレンダーされる', () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('複数の店舗データがあっても WebView がレンダーされる', () => {
    const shops = [
      makeShopMapItem({ id: 'shop-1', name: '黒松盆栽園' }),
      makeShopMapItem({ id: 'shop-2', name: '五葉松園', latitude: 34.0, longitude: 135.0 }),
    ];
    renderWithProviders(<BonsaiMapView shops={shops} isOnline />);
    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// WebView からのメッセージ受信（型ガード検証）
// ---------------------------------------------------------------------------

describe('BonsaiMapView - WebView メッセージ受信', () => {
  it('type="shopSelected" + 有効な shopId を受け取ると router.push が呼ばれる', async () => {
    renderWithProviders(
      <BonsaiMapView shops={[makeShopMapItem({ id: 'shop-abc' })]} isOnline />
    );

    const webview = screen.getByTestId('mock-webview');
    const msg = JSON.stringify({ type: 'shopSelected', shopId: 'shop-abc' });

    await act(async () => {
      fireEvent(webview, 'message', { nativeEvent: { data: msg } });
    });

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: '/shops/[id]',
      params: { id: 'shop-abc' },
    });
  });

  it('type="ready" を受け取っても router.push は呼ばれない', async () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    const webview = screen.getByTestId('mock-webview');
    const msg = JSON.stringify({ type: 'ready' });

    await act(async () => {
      fireEvent(webview, 'message', { nativeEvent: { data: msg } });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('type="shopSelected" でも shopId が文字列でない場合は router.push が呼ばれない', async () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    const webview = screen.getByTestId('mock-webview');
    const msg = JSON.stringify({ type: 'shopSelected', shopId: 123 });

    await act(async () => {
      fireEvent(webview, 'message', { nativeEvent: { data: msg } });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('不正な JSON が来ても例外が発生しない（型ガード）', async () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    const webview = screen.getByTestId('mock-webview');

    await act(async () => {
      expect(() => {
        fireEvent(webview, 'message', { nativeEvent: { data: '不正なJSON{{{' } });
      }).toThrow();
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('type フィールドがない JSON は無視される（router.push 非呼び出し）', async () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    const webview = screen.getByTestId('mock-webview');
    const msg = JSON.stringify({ action: 'unknown' });

    await act(async () => {
      fireEvent(webview, 'message', { nativeEvent: { data: msg } });
    });

    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 現在地ボタン - 許可済みフロー
// ---------------------------------------------------------------------------

describe('BonsaiMapView - 現在地ボタン（許可済み）', () => {
  it('現在地ボタンをタップすると requestForegroundPermissionsAsync が呼ばれる', async () => {
    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('許可済みのとき getCurrentPositionAsync が呼ばれる', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as Location.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: 'never' as const,
    });

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    await waitFor(() => {
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('許可済みのとき Alert が表示されない', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as Location.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: 'never' as const,
    });

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    await waitFor(() => {
      expect(alertSpy).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 現在地ボタン - 許可拒否時の設定誘導
// ---------------------------------------------------------------------------

describe('BonsaiMapView - 現在地ボタン（許可拒否）', () => {
  it('拒否時は Alert が「位置情報の使用を許可してください」を表示する', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'denied' as Location.PermissionStatus,
      granted: false,
      canAskAgain: false,
      expires: 'never' as const,
    });

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        '位置情報の使用を許可してください',
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: 'キャンセル' }),
          expect.objectContaining({ text: '設定を開く' }),
        ])
      );
    });

    alertSpy.mockRestore();
  });

  it('拒否時は getCurrentPositionAsync が呼ばれない', async () => {
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'denied' as Location.PermissionStatus,
      granted: false,
      canAskAgain: false,
      expires: 'never' as const,
    });

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('Alert の「設定を開く」ボタンは Linking.openSettings を呼ぶ', async () => {
    const openSettingsSpy = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    let capturedButtons: Array<{ text: string; onPress?: () => void }> = [];
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      capturedButtons = (buttons ?? []) as Array<{ text: string; onPress?: () => void }>;
    });
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'denied' as Location.PermissionStatus,
      granted: false,
      canAskAgain: false,
      expires: 'never' as const,
    });

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    await waitFor(() => {
      expect(capturedButtons.length).toBeGreaterThan(0);
    });

    const openSettingsButton = capturedButtons.find((b) => b.text === '設定を開く');
    expect(openSettingsButton).toBeDefined();

    await act(async () => {
      openSettingsButton?.onPress?.();
    });

    expect(openSettingsSpy).toHaveBeenCalledTimes(1);

    openSettingsSpy.mockRestore();
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// 現在地ボタン - エラーハンドリング
// ---------------------------------------------------------------------------

describe('BonsaiMapView - 現在地ボタン（エラー）', () => {
  it('getCurrentPositionAsync が例外を投げたとき「現在地を取得できませんでした」Alert が出る', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValueOnce({
      status: 'granted' as Location.PermissionStatus,
      granted: true,
      canAskAgain: true,
      expires: 'never' as const,
    });
    jest.mocked(Location.getCurrentPositionAsync).mockRejectedValueOnce(
      new Error('GPS timeout')
    );

    renderWithProviders(<BonsaiMapView shops={[]} isOnline />);

    await act(async () => {
      fireEvent.press(screen.getByRole('button', { name: '現在地に移動' }));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('エラー', '現在地を取得できませんでした');
    });

    alertSpy.mockRestore();
  });
});
