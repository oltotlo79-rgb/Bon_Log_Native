/**
 * @module __tests__/app/(tabs)/more
 * app/(tabs)/more/index.tsx の画面テスト。
 * メニュー項目の表示・タップ遷移・ブラウザ起動・ログアウト確認ダイアログ・オフライン表示を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import MoreScreen from '@/app/(tabs)/more/index';
import { ROUTE_PROFILE, routes } from '@/lib/constants/routes';
import { HELP_URL } from '@/lib/constants/external-links';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockRouter = jest.requireMock('expo-router').router;

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

const mockLogoutMutate = jest.fn();
const mockIsLoggingOut = { value: false };

jest.mock('@/lib/queries/auth', () => ({
  useLogoutMutation: () => ({
    mutate: (...args: unknown[]) => mockLogoutMutate(...args),
    get isPending() {
      return mockIsLoggingOut.value;
    },
  }),
}));

// ---------------------------------------------------------------------------
// セットアップ
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
  mockIsLoggingOut.value = false;
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// メニュー項目の表示
// ---------------------------------------------------------------------------

describe('MoreScreen メニュー項目の表示', () => {
  it('ヘッダー「もっと見る」が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByRole('header', { name: 'もっと見る' })).toBeTruthy();
  });

  it('プロフィール項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('プロフィール')).toBeTruthy();
  });

  it('設定項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('設定')).toBeTruthy();
  });

  it('利用規約項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('利用規約')).toBeTruthy();
  });

  it('プライバシーポリシー項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('プライバシーポリシー')).toBeTruthy();
  });

  it('ヘルプ項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('ヘルプ')).toBeTruthy();
  });

  it('ログアウト項目が表示される', () => {
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('ログアウト')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 遷移
// ---------------------------------------------------------------------------

describe('MoreScreen 遷移', () => {
  it('「プロフィール」タップで ROUTE_PROFILE へ navigate する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('プロフィールを見る'));
    expect(mockRouter.navigate).toHaveBeenCalledWith(ROUTE_PROFILE);
  });

  it('「設定」タップで routes.settings へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('設定を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith(routes.settings);
  });
});

// ---------------------------------------------------------------------------
// ネイティブ遷移（法的文章）
// ---------------------------------------------------------------------------

describe('MoreScreen ネイティブ遷移（法的文章）', () => {
  it('「利用規約」タップで /legal/[slug]/index（terms）へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('利用規約を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]/index',
      params: { slug: 'terms' },
    });
  });

  it('「プライバシーポリシー」タップで /legal/[slug]/index（privacy）へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('プライバシーポリシーを開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]/index',
      params: { slug: 'privacy' },
    });
  });

  it('「特商法表記」タップで /legal/[slug]/index（tokushoho）へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('特商法表記を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/legal/[slug]/index',
      params: { slug: 'tokushoho' },
    });
  });
});

// ---------------------------------------------------------------------------
// 外部ブラウザ起動（ヘルプのみ）
// ---------------------------------------------------------------------------

describe('MoreScreen 外部ブラウザ起動', () => {
  it('「ヘルプ」タップで HELP_URL で openBrowserAsync が呼ばれる', async () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('ヘルプ（Web ページを開く）'));
    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(HELP_URL);
    });
  });
});

// ---------------------------------------------------------------------------
// 機能ネイティブ遷移
// ---------------------------------------------------------------------------

describe('MoreScreen 機能遷移', () => {
  it('「発見」タップで /explore/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('発見画面を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/explore/index' });
  });

  it('「盆栽用語辞典」タップで /dictionary/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('盆栽用語辞典を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/dictionary/index' });
  });

  it('「施肥ガイド」タップで /fertilizers/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('施肥ガイドを開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/fertilizers/index' });
  });

  it('「植物ホルモン」タップで /hormones/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('植物ホルモン情報を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/hormones/index' });
  });

  it('「農薬・病害虫」タップで /pesticides/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('農薬・病害虫図鑑を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pesticides/index' });
  });

  it('「投稿分析」タップで /analytics/index へ push する', () => {
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('投稿分析を開く'));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/analytics/index' });
  });
});

// ---------------------------------------------------------------------------
// ログアウト確認ダイアログ
// ---------------------------------------------------------------------------

describe('MoreScreen ログアウト', () => {
  it('ログアウト項目タップで Alert.alert が呼ばれる', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('ログアウト'));
    expect(alertSpy).toHaveBeenCalledWith(
      'ログアウト',
      'ログアウトしますか？',
      expect.arrayContaining([
        expect.objectContaining({ text: 'キャンセル', style: 'cancel' }),
        expect.objectContaining({ text: 'ログアウト', style: 'destructive' }),
      ])
    );
    alertSpy.mockRestore();
  });

  it('ダイアログで「キャンセル」を選択しても useLogoutMutation の mutate は呼ばれない', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((b) => b.style === 'cancel');
      cancelButton?.onPress?.();
    });
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('ログアウト'));
    expect(mockLogoutMutate).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('ダイアログで「ログアウト」を選択すると useLogoutMutation の mutate が呼ばれる', () => {
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const logoutButton = buttons?.find((b) => b.style === 'destructive');
      logoutButton?.onPress?.();
    });
    renderWithProviders(<MoreScreen />);
    fireEvent.press(screen.getByLabelText('ログアウト'));
    expect(mockLogoutMutate).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it('ログアウト中（isPending=true）は「ログアウト中...」と表示される', () => {
    mockIsLoggingOut.value = true;
    renderWithProviders(<MoreScreen />);
    expect(screen.getByText('ログアウト中...')).toBeTruthy();
  });

  it('ログアウト中（isPending=true）はログアウトボタンが disabled になる', () => {
    mockIsLoggingOut.value = true;
    renderWithProviders(<MoreScreen />);
    const logoutButton = screen.getByLabelText('ログアウト');
    expect(logoutButton.props.accessibilityState?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// オフライン状態
// ---------------------------------------------------------------------------

describe('MoreScreen オフライン', () => {
  it('オフライン時に OfflineBanner の accessibilityLabel が設定される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    const { toJSON } = renderWithProviders(<MoreScreen />);
    // OfflineBanner は isVisible=true のとき accessibilityLabel を設定する
    // Animated.View のため toJSON で検証する
    expect(JSON.stringify(toJSON())).toContain('"accessibilityLiveRegion":"assertive"');
  });

  it('オフライン時に ERR_OFFLINE メッセージが DOM に存在する', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<MoreScreen />);
    // ERR_OFFLINE メッセージのテキストは DOM に存在する
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });

  it('オンライン時は OfflineBanner に accessibilityLabel が設定されない', () => {
    mockUseOnlineStatus.mockReturnValue(true);
    renderWithProviders(<MoreScreen />);
    // isVisible=false のとき accessibilityLabel は undefined
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.queryByLabelText(ERR_OFFLINE)).toBeNull();
  });
});
