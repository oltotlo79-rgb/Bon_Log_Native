/**
 * components/hormone/HormoneCard のユニットテスト。
 * 名前・英名・カテゴリバッジ・化学式タグ・説明文・サムネイル有無・
 * タップ動作・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { HormoneCard } from '@/components/hormone/HormoneCard';

// ---------------------------------------------------------------------------
// テスト用デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  name: 'オーキシン',
  nameEn: 'Auxin',
  slug: 'auxin',
  category: 'major',
  description: '根の成長を促進するホルモン。',
  chemicalFormula: 'C10H9NO2',
  onPress: jest.fn(),
  accessibilityLabel: 'オーキシン（Auxin）の詳細を見る',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 名前・英名表示
// ---------------------------------------------------------------------------

describe('HormoneCard 名前・英名', () => {
  it('ホルモン名が表示される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByText('オーキシン')).toBeTruthy();
  });

  it('英名が表示される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByText('Auxin')).toBeTruthy();
  });

  it('nameEn が null のとき英名が表示されない', () => {
    render(<HormoneCard {...defaultProps} nameEn={null} />);
    expect(screen.queryByText('Auxin')).toBeNull();
  });

  it('nameEn が空文字のとき英名が表示されない', () => {
    render(<HormoneCard {...defaultProps} nameEn="" />);
    expect(screen.queryByText('Auxin')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// カテゴリバッジ
// ---------------------------------------------------------------------------

describe('HormoneCard カテゴリバッジ', () => {
  it('category が major のとき「五大ホルモン」バッジが表示される', () => {
    render(<HormoneCard {...defaultProps} category="major" />);
    expect(screen.getByText('五大ホルモン')).toBeTruthy();
  });

  it('category が secondary のとき「二次ホルモン」バッジが表示される', () => {
    render(<HormoneCard {...defaultProps} category="secondary" />);
    expect(screen.getByText('二次ホルモン')).toBeTruthy();
  });

  it('未知のカテゴリはカテゴリ文字列をそのまま表示するフォールバックになる', () => {
    render(<HormoneCard {...defaultProps} category="unknown-category" />);
    expect(screen.getByText('unknown-category')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 化学式タグ
// ---------------------------------------------------------------------------

describe('HormoneCard 化学式タグ', () => {
  it('化学式が表示される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByText('C10H9NO2')).toBeTruthy();
  });

  it('chemicalFormula が null のとき化学式が表示されない', () => {
    render(<HormoneCard {...defaultProps} chemicalFormula={null} />);
    expect(screen.queryByText('C10H9NO2')).toBeNull();
  });

  it('chemicalFormula が空文字のとき化学式が表示されない', () => {
    render(<HormoneCard {...defaultProps} chemicalFormula="" />);
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 説明文
// ---------------------------------------------------------------------------

describe('HormoneCard 説明文', () => {
  it('説明文が表示される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByText('根の成長を促進するホルモン。')).toBeTruthy();
  });

  it('description が null のとき説明文が表示されない', () => {
    render(<HormoneCard {...defaultProps} description={null} />);
    expect(screen.queryByText('根の成長を促進するホルモン。')).toBeNull();
  });

  it('description が空文字のとき説明文が表示されない', () => {
    render(<HormoneCard {...defaultProps} description="" />);
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// サムネイル有無（五大ホルモン vs 非五大ホルモン）
// ---------------------------------------------------------------------------

describe('HormoneCard サムネイル', () => {
  it('五大ホルモン(auxin)はサムネイル画像が表示される', () => {
    render(<HormoneCard {...defaultProps} slug="auxin" />);
    // expo-image モックは accessibilityLabel を持つ Image を描画する
    expect(screen.getByLabelText('オーキシン')).toBeTruthy();
  });

  it('五大ホルモン(gibberellin)はサムネイル画像が表示される', () => {
    render(
      <HormoneCard
        {...defaultProps}
        slug="gibberellin"
        name="ジベレリン"
        nameEn="Gibberellin"
        accessibilityLabel="ジベレリン（Gibberellin）の詳細を見る"
      />,
    );
    expect(screen.getByLabelText('ジベレリン')).toBeTruthy();
  });

  it('五大ホルモン(cytokinin)はサムネイル画像が表示される', () => {
    render(
      <HormoneCard
        {...defaultProps}
        slug="cytokinin"
        name="サイトカイニン"
        nameEn={null}
        accessibilityLabel="サイトカイニンの詳細を見る"
      />,
    );
    expect(screen.getByLabelText('サイトカイニン')).toBeTruthy();
  });

  it('五大ホルモン(abscisic-acid)はサムネイル画像が表示される', () => {
    render(
      <HormoneCard
        {...defaultProps}
        slug="abscisic-acid"
        name="アブシジン酸"
        nameEn="Abscisic Acid"
        accessibilityLabel="アブシジン酸（Abscisic Acid）の詳細を見る"
      />,
    );
    expect(screen.getByLabelText('アブシジン酸')).toBeTruthy();
  });

  it('五大ホルモン(ethylene)はサムネイル画像が表示される', () => {
    render(
      <HormoneCard
        {...defaultProps}
        slug="ethylene"
        name="エチレン"
        nameEn="Ethylene"
        accessibilityLabel="エチレン（Ethylene）の詳細を見る"
      />,
    );
    expect(screen.getByLabelText('エチレン')).toBeTruthy();
  });

  it('五大ホルモン以外（二次ホルモン）はサムネイル画像が表示されない', () => {
    render(
      <HormoneCard
        {...defaultProps}
        slug="brassinolide"
        name="ブラシノライド"
        nameEn="Brassinolide"
        category="secondary"
        accessibilityLabel="ブラシノライド（Brassinolide）の詳細を見る"
      />,
    );
    // サムネイルがないため「ブラシノライド」という accessibilityLabel の Image が存在しない
    expect(screen.queryByLabelText('ブラシノライド')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('HormoneCard アクセシビリティ', () => {
  it('accessibilityLabel が設定される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByLabelText('オーキシン（Auxin）の詳細を見る')).toBeTruthy();
  });

  it('accessibilityRole="button" が設定される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByRole('button')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ
// ---------------------------------------------------------------------------

describe('HormoneCard タップ', () => {
  it('タップで onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(<HormoneCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('オーキシン（Auxin）の詳細を見る'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('異なる accessibilityLabel のカードもタップで onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(
      <HormoneCard
        name="ジベレリン"
        nameEn="Gibberellin"
        slug="gibberellin"
        category="major"
        description="茎の伸長を促進する"
        chemicalFormula="C19H22O6"
        onPress={onPress}
        accessibilityLabel="ジベレリン（Gibberellin）の詳細を見る"
      />,
    );
    fireEvent.press(screen.getByLabelText('ジベレリン（Gibberellin）の詳細を見る'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('HormoneCard 複数 props 組合わせ', () => {
  it('すべての props が設定されたとき正常に表示される', () => {
    render(<HormoneCard {...defaultProps} />);
    expect(screen.getByText('オーキシン')).toBeTruthy();
    expect(screen.getByText('Auxin')).toBeTruthy();
    expect(screen.getByText('五大ホルモン')).toBeTruthy();
    expect(screen.getByText('C10H9NO2')).toBeTruthy();
    expect(screen.getByText('根の成長を促進するホルモン。')).toBeTruthy();
  });

  it('オプション props がすべて null でも名前とバッジは表示される', () => {
    render(
      <HormoneCard
        name="サイトカイニン"
        nameEn={null}
        slug="cytokinin"
        category="major"
        description={null}
        chemicalFormula={null}
        onPress={jest.fn()}
        accessibilityLabel="サイトカイニンの詳細を見る"
      />,
    );
    expect(screen.getByText('サイトカイニン')).toBeTruthy();
    expect(screen.getByText('五大ホルモン')).toBeTruthy();
    expect(screen.queryByText('Auxin')).toBeNull();
  });
});
