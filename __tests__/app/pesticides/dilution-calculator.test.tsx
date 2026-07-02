/**
 * app/pesticides/dilution-calculator/index のコンポーネントテスト。
 * モード切替・計算ロジック・プリセット選択・警告表示・免責事項を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import DilutionCalculatorScreen from '@/app/pesticides/dilution-calculator/index';
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
// 初期表示
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen 初期表示', () => {
  it('説明文が表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(
      screen.getByText('希釈倍率から薬剤量を計算、または薬剤量から必要な水量を逆算できます'),
    ).toBeTruthy();
  });

  it('「薬剤量を計算」モードタブが表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(screen.getByLabelText('薬剤量を計算')).toBeTruthy();
  });

  it('「必要水量を計算」モードタブが表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(screen.getByLabelText('必要水量を計算')).toBeTruthy();
  });

  it('デフォルトで「薬剤量を計算」モードが選択されている', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    const tab = screen.getByLabelText('薬剤量を計算');
    expect(tab.props.accessibilityState?.selected).toBe(true);
  });

  it('水量入力フィールドが表示される（正モード）', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(screen.getByLabelText('水量をミリリットルで入力')).toBeTruthy();
  });

  it('希釈倍率入力フィールドが表示される（正モード）', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(screen.getByLabelText('希釈倍率を入力')).toBeTruthy();
  });

  it('免責事項テキストが表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    expect(
      screen.getByText(
        '農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。',
      ),
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// モード切替
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen モード切替', () => {
  it('「必要水量を計算」タブをタップするとモードが切り替わる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    const reverseTab = screen.getByLabelText('必要水量を計算');
    expect(reverseTab.props.accessibilityState?.selected).toBe(true);
  });

  it('逆モード切替後に薬剤量入力フィールドが表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    expect(screen.getByLabelText('薬剤量をミリリットルで入力')).toBeTruthy();
  });

  it('逆モードに切り替えると「薬剤量を計算」タブの selected が false になる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    const normalTab = screen.getByLabelText('薬剤量を計算');
    expect(normalTab.props.accessibilityState?.selected).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 計算ロジック（正モード）: 薬剤量 = 水量 ÷ 希釈倍率
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen 正モード計算', () => {
  it('水量1000mL・倍率1000倍 → 薬剤量1.00mL が結果に表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '1000');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText('計算結果')).toBeTruthy();
    expect(screen.getByText(/1\.00mL/)).toBeTruthy();
  });

  it('水量500mL・倍率1000倍 → 薬剤量0.50mL が結果に表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '500');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText(/0\.50mL/)).toBeTruthy();
  });

  it('水量2000mL・倍率500倍 → 薬剤量4.00mL が結果に表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '2000');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '500');
    expect(screen.getByText(/4\.00mL/)).toBeTruthy();
  });

  it('結果にノート（水量・倍率の説明）が表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '1000');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText(/1000mL.*1000倍希釈/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 計算ロジック（逆モード）: 必要水量 = 薬剤量 × 希釈倍率
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen 逆モード計算', () => {
  it('薬剤量1mL・倍率1000倍 → 必要水量1000.00mL が結果に表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    fireEvent.changeText(screen.getByLabelText('薬剤量をミリリットルで入力'), '1');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText('計算結果')).toBeTruthy();
    expect(screen.getByText(/1000\.00mL/)).toBeTruthy();
  });

  it('薬剤量2mL・倍率500倍 → 必要水量1000.00mL が結果に表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    fireEvent.changeText(screen.getByLabelText('薬剤量をミリリットルで入力'), '2');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '500');
    expect(screen.getByText(/1000\.00mL/)).toBeTruthy();
  });

  it('結果に薬剤量と希釈倍率のノートが表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    fireEvent.changeText(screen.getByLabelText('薬剤量をミリリットルで入力'), '1');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText(/薬剤1mL.*1000倍に希釈/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 1mL 以上の水量でリットル表記が付く
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen L 表記', () => {
  it('必要水量が 1000mL 以上のとき L 表記が併記される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    fireEvent.changeText(screen.getByLabelText('薬剤量をミリリットルで入力'), '2');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText(/\/.*L/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 1mL 未満の滴数換算と警告
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen 極小量', () => {
  it('薬剤量が 0.5mL 未満のとき滴数が表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    // 水量 200mL・倍率 1000倍 → 0.20mL（20滴換算: 0.2 * 20 = 4滴）
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '200');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.getByText(/滴/)).toBeTruthy();
  });

  it('薬剤量が 0.1mL 未満のとき極小量の警告が表示される', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    // 水量 50mL・倍率 3000倍 → 0.0167mL < 0.1mL
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '50');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '3000');
    expect(screen.getByText(/未満のため正確な計量が困難/)).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// プリセット選択
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen プリセット', () => {
  it('水量プリセット「200mL」をタップすると水量入力が 200 になる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('200mLを設定'));
    const waterInput = screen.getByLabelText('水量をミリリットルで入力');
    expect(waterInput.props.value).toBe('200');
  });

  it('水量プリセット「1000mL」をタップすると水量入力が 1000 になる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('1000mLを設定'));
    const waterInput = screen.getByLabelText('水量をミリリットルで入力');
    expect(waterInput.props.value).toBe('1000');
  });

  it('希釈倍率プリセット「500倍」をタップすると倍率入力が 500 になる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('500倍を設定'));
    const ratioInput = screen.getByLabelText('希釈倍率を入力');
    expect(ratioInput.props.value).toBe('500');
  });

  it('希釈倍率プリセット「2000倍」をタップすると倍率入力が 2000 になる', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('2000倍を設定'));
    const ratioInput = screen.getByLabelText('希釈倍率を入力');
    expect(ratioInput.props.value).toBe('2000');
  });

  it('逆モードでも希釈倍率プリセットが使える', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.press(screen.getByLabelText('必要水量を計算'));
    fireEvent.press(screen.getByLabelText('1000倍を設定'));
    const ratioInput = screen.getByLabelText('希釈倍率を入力');
    expect(ratioInput.props.value).toBe('1000');
  });
});

// ---------------------------------------------------------------------------
// 無効な入力では結果を表示しない
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen 無効入力', () => {
  it('水量が空のとき計算結果が表示されない', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.queryByText('計算結果')).toBeNull();
  });

  it('倍率が 0 のとき計算結果が表示されない', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), '1000');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '0');
    expect(screen.queryByText('計算結果')).toBeNull();
  });

  it('非数値を入力したとき計算結果が表示されない', () => {
    renderWithProviders(<DilutionCalculatorScreen />);
    fireEvent.changeText(screen.getByLabelText('水量をミリリットルで入力'), 'abc');
    fireEvent.changeText(screen.getByLabelText('希釈倍率を入力'), '1000');
    expect(screen.queryByText('計算結果')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// オフライン
// ---------------------------------------------------------------------------

describe('DilutionCalculatorScreen オフライン', () => {
  it('オフライン時に ERR_OFFLINE メッセージが表示される', () => {
    mockUseOnlineStatus.mockReturnValue(false);
    renderWithProviders(<DilutionCalculatorScreen />);
    const { ERR_OFFLINE } = jest.requireActual('@/lib/constants/errors');
    expect(screen.getByText(ERR_OFFLINE)).toBeTruthy();
  });
});
