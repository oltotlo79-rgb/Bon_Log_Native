/**
 * components/browse/CatalogListItem のユニットテスト。
 * 表示・タップ・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CatalogListItem } from '@/components/browse/CatalogListItem';

// ---------------------------------------------------------------------------
// テスト用デフォルト props
// ---------------------------------------------------------------------------

const defaultProps = {
  title: '黒松',
  onPress: jest.fn(),
  accessibilityLabel: '黒松の詳細を見る',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 表示
// ---------------------------------------------------------------------------

describe('CatalogListItem 表示', () => {
  it('title テキストが表示される', () => {
    render(<CatalogListItem {...defaultProps} />);
    expect(screen.getByText('黒松')).toBeTruthy();
  });

  it('subtitle が設定されると補助テキストが表示される', () => {
    render(<CatalogListItem {...defaultProps} subtitle="くろまつ" />);
    expect(screen.getByText('くろまつ')).toBeTruthy();
  });

  it('subtitle が undefined の場合は表示されない', () => {
    render(<CatalogListItem {...defaultProps} />);
    expect(screen.queryByText('くろまつ')).toBeNull();
  });

  it('categoryLabel が設定されるとカテゴリチップが表示される', () => {
    render(<CatalogListItem {...defaultProps} categoryLabel="松柏類" />);
    expect(screen.getByText('松柏類')).toBeTruthy();
  });

  it('categoryLabel が undefined の場合はチップが表示されない', () => {
    render(<CatalogListItem {...defaultProps} />);
    expect(screen.queryByText('松柏類')).toBeNull();
  });

  it('prefix が設定されると左端プレフィックスが表示される', () => {
    render(<CatalogListItem {...defaultProps} prefix="N" />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('prefix が空文字の場合は表示されない', () => {
    render(<CatalogListItem {...defaultProps} prefix="" />);
    expect(screen.queryByText('')).toBeNull();
  });

  it('シェブロンアイコンが表示される', () => {
    render(<CatalogListItem {...defaultProps} />);
    // TouchableOpacity（accessible）の内部要素は includeHiddenElements で探索する
    expect(
      screen.getByTestId('icon-chevron-forward', { includeHiddenElements: true })
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('CatalogListItem アクセシビリティ', () => {
  it('accessibilityLabel が設定される', () => {
    render(<CatalogListItem {...defaultProps} />);
    expect(screen.getByLabelText('黒松の詳細を見る')).toBeTruthy();
  });

  it('accessibilityRole="button" が設定される', () => {
    render(<CatalogListItem {...defaultProps} />);
    const button = screen.getByRole('button');
    expect(button).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// タップ
// ---------------------------------------------------------------------------

describe('CatalogListItem タップ', () => {
  it('タップで onPress が呼ばれる', () => {
    const onPress = jest.fn();
    render(<CatalogListItem {...defaultProps} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('黒松の詳細を見る'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('タップは accessibilityLabel で取得できる', () => {
    const onPress = jest.fn();
    render(
      <CatalogListItem
        title="五葉松"
        onPress={onPress}
        accessibilityLabel="五葉松の詳細を見る"
      />
    );
    fireEvent.press(screen.getByLabelText('五葉松の詳細を見る'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 複数 props の組合わせ
// ---------------------------------------------------------------------------

describe('CatalogListItem 複数 props 組合わせ', () => {
  it('subtitle・categoryLabel・prefix すべて設定されても正常に表示される', () => {
    render(
      <CatalogListItem
        title="窒素"
        subtitle="Nitrogen"
        categoryLabel="多量栄養素"
        prefix="N"
        onPress={jest.fn()}
        accessibilityLabel="窒素の詳細を見る"
      />
    );
    expect(screen.getByText('窒素')).toBeTruthy();
    expect(screen.getByText('Nitrogen')).toBeTruthy();
    expect(screen.getByText('多量栄養素')).toBeTruthy();
    expect(screen.getByText('N')).toBeTruthy();
  });
});
