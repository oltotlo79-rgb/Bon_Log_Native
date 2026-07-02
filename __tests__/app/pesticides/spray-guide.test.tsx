/**
 * app/pesticides/spray-guide/index のコンポーネントテスト。
 * 希釈対応表・4ガイドセクション・免責事項の表示を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import SprayGuideScreen from '@/app/pesticides/spray-guide/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockUseOnlineStatus = jest.fn(() => true);
jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseOnlineStatus.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// 希釈対応表
// ---------------------------------------------------------------------------

describe('SprayGuideScreen 希釈対応表', () => {
  it('「希釈の基本」セクションが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText('希釈の基本')).toBeTruthy();
  });

  it('計算式の説明文が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(
      screen.getByText('薬剤量（mL）= 水量（mL）÷ 希釈倍率'),
    ).toBeTruthy();
  });

  it('計算例のノートが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText(/例:.*1,000mL.*1,000倍/)).toBeTruthy();
  });

  it('希釈対応表が accessibilityLabel 付きで表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByLabelText('希釈倍率と水量の対応表')).toBeTruthy();
  });

  it('対応表の注記が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText(/1mL未満.*計量が困難/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// ガイドセクション
// ---------------------------------------------------------------------------

describe('SprayGuideScreen ガイドセクション', () => {
  it('「散布のタイミング」セクションが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText('散布のタイミング')).toBeTruthy();
  });

  it('「散布方法のポイント」セクションが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText('散布方法のポイント')).toBeTruthy();
  });

  it('「安全対策」セクションが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText('安全対策')).toBeTruthy();
  });

  it('「盆栽特有の注意点」セクションが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText('盆栽特有の注意点')).toBeTruthy();
  });

  it('散布タイミングの内容が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText(/早朝か夕方が最適/)).toBeTruthy();
  });

  it('安全対策の内容が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText(/ゴーグル・マスク・手袋・長袖/)).toBeTruthy();
  });

  it('盆栽特有の注意点の内容が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(screen.getByText(/鉢が小さいため薬剤が土壌に過剰に入りやすい/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 説明文・免責
// ---------------------------------------------------------------------------

describe('SprayGuideScreen 説明文と免責', () => {
  it('画面説明文が表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(
      screen.getByText('農薬を安全かつ効果的に使用するための実践ガイド'),
    ).toBeTruthy();
  });

  it('免責事項テキストが表示される', () => {
    renderWithProviders(<SprayGuideScreen />);
    expect(
      screen.getByText(
        '農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。',
      ),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('SprayGuideScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<SprayGuideScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
