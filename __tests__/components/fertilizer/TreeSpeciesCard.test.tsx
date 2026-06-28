/**
 * components/fertilizer/TreeSpeciesCard のユニットテスト。
 * 樹種名・カテゴリバッジ・施肥方針・タップ動作・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { TreeSpeciesCard } from '@/components/fertilizer/TreeSpeciesCard';

// ---------------------------------------------------------------------------
// テスト用デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  name: '黒松',
  category: 'conifer',
  fertilizingPolicy: '春と秋に施肥する',
  slug: 'kuromatsu',
  onPress: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 表示
// ---------------------------------------------------------------------------

describe('TreeSpeciesCard 表示', () => {
  it('樹種名が表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} />);
    expect(screen.getByText('黒松')).toBeTruthy();
  });

  it('fertilizingPolicy が設定されると施肥方針が表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} />);
    expect(screen.getByText('春と秋に施肥する')).toBeTruthy();
  });

  it('fertilizingPolicy が null の場合は施肥方針が表示されない', () => {
    render(<TreeSpeciesCard {...defaultProps} fertilizingPolicy={null} />);
    expect(screen.queryByText('春と秋に施肥する')).toBeNull();
  });

  it('fertilizingPolicy が空文字の場合は施肥方針が表示されない', () => {
    render(<TreeSpeciesCard {...defaultProps} fertilizingPolicy="" />);
    expect(screen.queryByText('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// カテゴリバッジ
// ---------------------------------------------------------------------------

describe('TreeSpeciesCard カテゴリバッジ', () => {
  it('category が conifer のとき「松柏類」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="conifer" />);
    expect(screen.getByText('松柏類')).toBeTruthy();
  });

  it('category が deciduous のとき「雑木類」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="deciduous" />);
    expect(screen.getByText('雑木類')).toBeTruthy();
  });

  it('category が flowering のとき「花物」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="flowering" />);
    expect(screen.getByText('花物')).toBeTruthy();
  });

  it('category が fruiting のとき「実物」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="fruiting" />);
    expect(screen.getByText('実物')).toBeTruthy();
  });

  it('category が grass のとき「草物」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="grass" />);
    expect(screen.getByText('草物')).toBeTruthy();
  });

  it('category が evergreen のとき「常緑広葉樹」バッジが表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} category="evergreen" />);
    expect(screen.getByText('常緑広葉樹')).toBeTruthy();
  });

  it('未知のカテゴリでも「その他」バッジが表示される（フォールバック）', () => {
    render(<TreeSpeciesCard {...defaultProps} category="unknown" />);
    expect(screen.getByText('その他')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('TreeSpeciesCard アクセシビリティ', () => {
  it('accessibilityLabel に樹種名が含まれる', () => {
    render(<TreeSpeciesCard {...defaultProps} />);
    expect(screen.getByLabelText('黒松の施肥スケジュールを見る')).toBeTruthy();
  });

  it('accessibilityRole="button" が設定される', () => {
    render(<TreeSpeciesCard {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ
// ---------------------------------------------------------------------------

describe('TreeSpeciesCard タップ', () => {
  it('タップで onPress が slug と name を引数に呼ばれる', () => {
    const onPress = jest.fn();
    render(<TreeSpeciesCard {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('黒松の施肥スケジュールを見る'));
    expect(onPress).toHaveBeenCalledWith('kuromatsu', '黒松');
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('異なるカードは対応する slug と name を渡す', () => {
    const onPress = jest.fn();
    render(
      <TreeSpeciesCard
        name="欅"
        category="deciduous"
        fertilizingPolicy={null}
        slug="keyaki"
        onPress={onPress}
      />
    );
    fireEvent.press(screen.getByLabelText('欅の施肥スケジュールを見る'));
    expect(onPress).toHaveBeenCalledWith('keyaki', '欅');
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('TreeSpeciesCard 複数 props 組合わせ', () => {
  it('名前・バッジ・施肥方針がすべて表示される', () => {
    render(<TreeSpeciesCard {...defaultProps} />);
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('松柏類')).toBeTruthy();
    expect(screen.getByText('春と秋に施肥する')).toBeTruthy();
  });

  it('花物の樹種カードが正しく表示される', () => {
    render(
      <TreeSpeciesCard
        name="梅"
        category="flowering"
        fertilizingPolicy="花後に施肥を開始し秋に控える"
        slug="ume"
        onPress={jest.fn()}
      />
    );
    expect(screen.getByText('梅')).toBeTruthy();
    expect(screen.getByText('花物')).toBeTruthy();
    expect(screen.getByText('花後に施肥を開始し秋に控える')).toBeTruthy();
  });
});
