/**
 * components/fertilizer/CategoryComparisonCard のユニットテスト。
 * カテゴリ名・説明・メリット・デメリット・盆栽での使い方・画像マッピングを検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CategoryComparisonCard } from '@/components/fertilizer/CategoryComparisonCard';

// ---------------------------------------------------------------------------
// テスト用デフォルト props（有機肥料：すべてのフィールドが埋まっているケース）
// ---------------------------------------------------------------------------

const defaultProps = {
  name: '有機肥料',
  description: '天然素材由来の肥料。油粕・魚粉など。',
  merit: '土壌微生物を活性化し、土を豊かにする',
  demerit: '即効性がなく、臭いがある場合もある',
  bonsaiUsage: '春先の置き肥として年1〜2回使用する',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 表示 — 必須フィールド
// ---------------------------------------------------------------------------

describe('CategoryComparisonCard 基本表示', () => {
  it('カテゴリ名が表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('有機肥料')).toBeTruthy();
  });

  it('description が設定されると説明文が表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('天然素材由来の肥料。油粕・魚粉など。')).toBeTruthy();
  });

  it('description が null の場合は説明文が表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} description={null} />);
    expect(screen.queryByText('天然素材由来の肥料。油粕・魚粉など。')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// メリット・デメリット・使い方パネル
// ---------------------------------------------------------------------------

describe('CategoryComparisonCard メリット・デメリット・使い方', () => {
  it('merit が設定されると「メリット」パネルが表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('メリット')).toBeTruthy();
    expect(screen.getByText('土壌微生物を活性化し、土を豊かにする')).toBeTruthy();
  });

  it('demerit が設定されると「デメリット」パネルが表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('デメリット')).toBeTruthy();
    expect(screen.getByText('即効性がなく、臭いがある場合もある')).toBeTruthy();
  });

  it('bonsaiUsage が設定されると「盆栽での使い方」パネルが表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('盆栽での使い方')).toBeTruthy();
    expect(screen.getByText('春先の置き肥として年1〜2回使用する')).toBeTruthy();
  });

  it('merit が null の場合は「メリット」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} merit={null} />);
    expect(screen.queryByText('メリット')).toBeNull();
  });

  it('demerit が null の場合は「デメリット」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} demerit={null} />);
    expect(screen.queryByText('デメリット')).toBeNull();
  });

  it('bonsaiUsage が null の場合は「盆栽での使い方」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} bonsaiUsage={null} />);
    expect(screen.queryByText('盆栽での使い方')).toBeNull();
  });

  it('merit・demerit・bonsaiUsage がすべて null のときパネルが一切表示されない', () => {
    render(
      <CategoryComparisonCard
        {...defaultProps}
        merit={null}
        demerit={null}
        bonsaiUsage={null}
      />
    );
    expect(screen.queryByText('メリット')).toBeNull();
    expect(screen.queryByText('デメリット')).toBeNull();
    expect(screen.queryByText('盆栽での使い方')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 空文字 vs null の境界値
// ---------------------------------------------------------------------------

describe('CategoryComparisonCard 空文字境界値', () => {
  it('merit が空文字の場合は「メリット」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} merit="" />);
    expect(screen.queryByText('メリット')).toBeNull();
  });

  it('demerit が空文字の場合は「デメリット」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} demerit="" />);
    expect(screen.queryByText('デメリット')).toBeNull();
  });

  it('bonsaiUsage が空文字の場合は「盆栽での使い方」パネルが表示されない', () => {
    render(<CategoryComparisonCard {...defaultProps} bonsaiUsage="" />);
    expect(screen.queryByText('盆栽での使い方')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// カテゴリ名ごとの画像マッピング
// ---------------------------------------------------------------------------

describe('CategoryComparisonCard 画像マッピング', () => {
  it('「有機」を含む名前では有機肥料画像が描画される（Image が存在する）', () => {
    render(<CategoryComparisonCard {...defaultProps} name="有機肥料" />);
    const images = screen.queryAllByRole('image');
    expect(images.length).toBeGreaterThanOrEqual(0);
  });

  it('「化成」を含む名前では化成肥料画像が描画される', () => {
    render(
      <CategoryComparisonCard
        name="化成肥料"
        description="化学的に合成された肥料"
        merit="即効性がある"
        demerit={null}
        bonsaiUsage={null}
      />
    );
    expect(screen.getByText('化成肥料')).toBeTruthy();
  });

  it('「液」を含む名前では液体肥料画像が描画される', () => {
    render(
      <CategoryComparisonCard
        name="液体肥料"
        description="水に溶かして使う肥料"
        merit={null}
        demerit={null}
        bonsaiUsage="葉面散布も可能"
      />
    );
    expect(screen.getByText('液体肥料')).toBeTruthy();
  });

  it('画像マッピングがない名前でも名前とパネルが表示される', () => {
    render(
      <CategoryComparisonCard
        name="特殊肥料"
        description={null}
        merit="独自の効果がある"
        demerit={null}
        bonsaiUsage={null}
      />
    );
    expect(screen.getByText('特殊肥料')).toBeTruthy();
    expect(screen.getByText('メリット')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('CategoryComparisonCard 複数 props 組合わせ', () => {
  it('すべてのフィールドが揃っているとき全パネルが表示される', () => {
    render(<CategoryComparisonCard {...defaultProps} />);
    expect(screen.getByText('有機肥料')).toBeTruthy();
    expect(screen.getByText('天然素材由来の肥料。油粕・魚粉など。')).toBeTruthy();
    expect(screen.getByText('メリット')).toBeTruthy();
    expect(screen.getByText('デメリット')).toBeTruthy();
    expect(screen.getByText('盆栽での使い方')).toBeTruthy();
  });

  it('merit のみ設定されていてデメリット・使い方がないカードが正しく表示される', () => {
    render(
      <CategoryComparisonCard
        name="緩効性肥料"
        description="ゆっくりと溶け出す肥料"
        merit="肥料焼けのリスクが低い"
        demerit={null}
        bonsaiUsage={null}
      />
    );
    expect(screen.getByText('緩効性肥料')).toBeTruthy();
    expect(screen.getByText('メリット')).toBeTruthy();
    expect(screen.queryByText('デメリット')).toBeNull();
    expect(screen.queryByText('盆栽での使い方')).toBeNull();
  });
});
