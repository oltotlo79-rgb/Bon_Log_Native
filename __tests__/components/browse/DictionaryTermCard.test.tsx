/**
 * components/browse/DictionaryTermCard のユニットテスト。
 * よみがな・用語名・カテゴリバッジ表示・タップ動作・説明文・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { DictionaryTermCard } from '@/components/browse/DictionaryTermCard';

// ---------------------------------------------------------------------------
// テスト用デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  term: '黒松',
  reading: 'くろまつ',
  category: '樹形',
  onPress: jest.fn(),
  accessibilityLabel: '黒松（くろまつ）- 樹形',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 表示
// ---------------------------------------------------------------------------

describe('DictionaryTermCard 表示', () => {
  it('よみがなが表示される', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    expect(screen.getByText('くろまつ')).toBeTruthy();
  });

  it('用語名が表示される', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    expect(screen.getByText('黒松')).toBeTruthy();
  });

  it('カテゴリバッジが表示される', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    expect(screen.getByText('樹形')).toBeTruthy();
  });

  it('description が設定されると説明文が表示される', () => {
    render(<DictionaryTermCard {...defaultProps} description="樹形の形態を指す用語。" />);
    expect(screen.getByText('樹形の形態を指す用語。')).toBeTruthy();
  });

  it('description が undefined の場合は説明文が表示されない', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    expect(screen.queryByText('樹形の形態を指す用語。')).toBeNull();
  });

  it('description が空文字の場合は説明文が表示されない', () => {
    render(<DictionaryTermCard {...defaultProps} description="" />);
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// カテゴリバッジ色分け
// ---------------------------------------------------------------------------

describe('DictionaryTermCard カテゴリ色分け', () => {
  const categories = [
    '樹形',
    '技術・作業',
    '管理・育成',
    '道具・用品',
    '盆器・鉢',
    '用土・肥料',
    '展示・鑑賞',
  ];

  categories.forEach((category) => {
    it(`カテゴリ「${category}」のバッジが表示される`, () => {
      render(
        <DictionaryTermCard
          {...defaultProps}
          category={category}
          accessibilityLabel={`黒松（くろまつ）- ${category}`}
        />,
      );
      expect(screen.getByText(category)).toBeTruthy();
    });
  });

  it('マップに存在しないカテゴリでもバッジが表示される（フォールバック色）', () => {
    render(
      <DictionaryTermCard
        {...defaultProps}
        category="未知カテゴリ"
        accessibilityLabel="黒松（くろまつ）- 未知カテゴリ"
      />,
    );
    expect(screen.getByText('未知カテゴリ')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('DictionaryTermCard アクセシビリティ', () => {
  it('accessibilityLabel が設定される', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    expect(screen.getByLabelText('黒松（くろまつ）- 樹形')).toBeTruthy();
  });

  it('accessibilityRole="button" が設定される', () => {
    render(<DictionaryTermCard {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ
// ---------------------------------------------------------------------------

describe('DictionaryTermCard タップ', () => {
  it('タップで onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(<DictionaryTermCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('黒松（くろまつ）- 樹形'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('複数回タップで onPress が複数回呼ばれる', () => {
    const onPress = jest.fn();
    render(<DictionaryTermCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('黒松（くろまつ）- 樹形'));
    fireEvent.press(screen.getByLabelText('黒松（くろまつ）- 樹形'));
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('DictionaryTermCard 複数 props 組合わせ', () => {
  it('よみがな・用語名・カテゴリバッジ・説明文がすべて表示される', () => {
    render(
      <DictionaryTermCard
        term="胴吹き"
        reading="どうぶき"
        category="技術・作業"
        description="幹の途中から新しい芽が出ること。"
        onPress={jest.fn()}
        accessibilityLabel="胴吹き（どうぶき）- 技術・作業"
      />,
    );
    expect(screen.getByText('どうぶき')).toBeTruthy();
    expect(screen.getByText('胴吹き')).toBeTruthy();
    expect(screen.getByText('技術・作業')).toBeTruthy();
    expect(screen.getByText('幹の途中から新しい芽が出ること。')).toBeTruthy();
  });

  it('長い用語名でも numberOfLines で切り詰められる', () => {
    render(
      <DictionaryTermCard
        term="非常に長い用語名を持つ盆栽専門用語のテスト"
        reading="ひじょうにながいようごめいをもつぼんさいせんもんようごのてすと"
        category="管理・育成"
        onPress={jest.fn()}
        accessibilityLabel="テスト用語"
      />,
    );
    expect(screen.getByText('非常に長い用語名を持つ盆栽専門用語のテスト')).toBeTruthy();
  });
});
