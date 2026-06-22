/**
 * components/bonsai/BonsaiCard のコンポーネントテスト。
 * 名前・種・サムネイル・記録件数・相対時間表示・onPress を検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { BonsaiCard } from '@/components/bonsai/BonsaiCard';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

function makeBonsaiCardProps(overrides?: Partial<Parameters<typeof BonsaiCard>[0]>) {
  const now = new Date();
  // 3日前の ISO 文字列を生成
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'bonsai-1',
    name: '黒松',
    species: '松柏類',
    thumbnailUrl: null,
    recordCount: 5,
    updatedAt: threeDaysAgo,
    onPress: jest.fn(),
    ...overrides,
  };
}

describe('BonsaiCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('盆栽名が表示される', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps()} />);
    expect(screen.getByText('黒松')).toBeTruthy();
  });

  it('種名（species）が表示される', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ species: '雑木類' })} />);
    expect(screen.getByText('雑木類')).toBeTruthy();
  });

  it('species が null のとき種名テキストが表示されない', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ species: null })} />);
    expect(screen.queryByText('雑木類')).toBeNull();
  });

  it('species が空文字のとき種名テキストが表示されない', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ species: '' })} />);
    expect(screen.queryByText('')).toBeNull();
  });

  it('記録件数が表示される', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ recordCount: 12 })} />);
    expect(screen.getByText('記録 12 件')).toBeTruthy();
  });

  it('accessibilityRole=button が設定される', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps()} />);
    expect(screen.getByRole('button', { name: '黒松の詳細を見る' })).toBeTruthy();
  });

  it('タップすると onPress が呼ばれる', () => {
    const onPress = jest.fn();
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ onPress })} />);
    fireEvent.press(screen.getByRole('button', { name: '黒松の詳細を見る' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('相対時間「今日」が表示される', () => {
    const today = new Date().toISOString();
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps({ updatedAt: today })} />);
    expect(screen.getByText('最終更新 今日')).toBeTruthy();
  });

  it('3日前の相対時間「3日前」が表示される', () => {
    renderWithProviders(<BonsaiCard {...makeBonsaiCardProps()} />);
    expect(screen.getByText('最終更新 3日前')).toBeTruthy();
  });

  it('thumbnailUrl がある場合にプレースホルダーが表示されない', () => {
    renderWithProviders(
      <BonsaiCard
        {...makeBonsaiCardProps({ thumbnailUrl: 'https://example.com/img.jpg' })}
      />
    );
    // leaf-outline アイコン（プレースホルダー）は非表示
    expect(screen.queryByTestId('icon-leaf-outline')).toBeNull();
  });
});
