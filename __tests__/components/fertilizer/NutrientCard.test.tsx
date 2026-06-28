/**
 * components/fertilizer/NutrientCard のユニットテスト。
 * 元素記号・栄養素名・カテゴリバッジ・盆栽における役割・タップ動作を検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NutrientCard } from '@/components/fertilizer/NutrientCard';

// ---------------------------------------------------------------------------
// テスト用デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  symbol: 'N',
  name: '窒素',
  category: 'primary',
  bonsaiRole: '葉と枝の生長を促進する',
  slug: 'nitrogen',
  onPress: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 表示
// ---------------------------------------------------------------------------

describe('NutrientCard 表示', () => {
  it('元素記号が表示される', () => {
    render(<NutrientCard {...defaultProps} />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('栄養素名が表示される', () => {
    render(<NutrientCard {...defaultProps} />);
    expect(screen.getByText('窒素')).toBeTruthy();
  });

  it('bonsaiRole が設定されると役割テキストが表示される', () => {
    render(<NutrientCard {...defaultProps} />);
    expect(screen.getByText('葉と枝の生長を促進する')).toBeTruthy();
  });

  it('bonsaiRole が null の場合は役割テキストが表示されない', () => {
    render(<NutrientCard {...defaultProps} bonsaiRole={null} />);
    expect(screen.queryByText('葉と枝の生長を促進する')).toBeNull();
  });

  it('bonsaiRole が空文字の場合は役割テキストが表示されない', () => {
    render(<NutrientCard {...defaultProps} bonsaiRole="" />);
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// カテゴリバッジ
// ---------------------------------------------------------------------------

describe('NutrientCard カテゴリバッジ', () => {
  it('category が primary のとき「三大要素」バッジが表示される', () => {
    render(<NutrientCard {...defaultProps} category="primary" />);
    expect(screen.getByText('三大要素')).toBeTruthy();
  });

  it('category が secondary のとき「二次要素」バッジが表示される', () => {
    render(<NutrientCard {...defaultProps} category="secondary" />);
    expect(screen.getByText('二次要素')).toBeTruthy();
  });

  it('category が trace のとき「微量要素」バッジが表示される', () => {
    render(<NutrientCard {...defaultProps} category="trace" />);
    expect(screen.getByText('微量要素')).toBeTruthy();
  });

  it('未知のカテゴリでも「その他」バッジが表示される（フォールバック）', () => {
    render(<NutrientCard {...defaultProps} category="unknown" />);
    expect(screen.getByText('その他')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('NutrientCard アクセシビリティ', () => {
  it('accessibilityLabel に名前と記号が含まれる', () => {
    render(<NutrientCard {...defaultProps} />);
    expect(screen.getByLabelText('窒素（N）の詳細を見る')).toBeTruthy();
  });

  it('accessibilityRole="button" が設定される', () => {
    render(<NutrientCard {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ
// ---------------------------------------------------------------------------

describe('NutrientCard タップ', () => {
  it('タップで onPress が slug を引数に呼ばれる', () => {
    const onPress = jest.fn();
    render(<NutrientCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('窒素（N）の詳細を見る'));
    expect(onPress).toHaveBeenCalledWith('nitrogen');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('異なる slug のカードは対応する slug を渡す', () => {
    const onPress = jest.fn();
    render(<NutrientCard {...defaultProps} symbol="P" name="リン" slug="phosphorus" onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('リン（P）の詳細を見る'));
    expect(onPress).toHaveBeenCalledWith('phosphorus');
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('NutrientCard 複数 props 組合わせ', () => {
  it('記号・名前・バッジ・役割がすべて表示される', () => {
    render(<NutrientCard {...defaultProps} />);
    expect(screen.getByText('N')).toBeTruthy();
    expect(screen.getByText('窒素')).toBeTruthy();
    expect(screen.getByText('三大要素')).toBeTruthy();
    expect(screen.getByText('葉と枝の生長を促進する')).toBeTruthy();
  });

  it('trace カテゴリの微量元素カードが正しく表示される', () => {
    render(
      <NutrientCard
        symbol="Fe"
        name="鉄"
        category="trace"
        bonsaiRole="葉緑素の合成に関与する"
        slug="iron"
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText('Fe')).toBeTruthy();
    expect(screen.getByText('鉄')).toBeTruthy();
    expect(screen.getByText('微量要素')).toBeTruthy();
    expect(screen.getByText('葉緑素の合成に関与する')).toBeTruthy();
  });
});
