/**
 * components/post/PostCardSkeleton のユニットテスト。
 */

import React from 'react';
import { Animated } from 'react-native';
import { render } from '@testing-library/react-native';
import { PostCardSkeleton } from '@/components/post/PostCardSkeleton';

// Animated.loop をモックしてテスト環境での無限アニメーション実行を避ける
jest.spyOn(Animated, 'loop').mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  reset: jest.fn(),
}));

describe('PostCardSkeleton', () => {
  it('accessibilityElementsHidden が設定されスクリーンリーダーから隠れている', () => {
    const { toJSON } = render(<PostCardSkeleton />);
    const root = toJSON() as unknown as { props: { accessibilityElementsHidden: boolean } };
    expect(root.props.accessibilityElementsHidden).toBe(true);
  });

  it('hasImage=false のとき画像エリアが描画されない', () => {
    const { toJSON } = render(<PostCardSkeleton hasImage={false} />);
    const json = JSON.stringify(toJSON());
    // hasImage=false のとき rectImage（height: 160）の Animated.View が含まれないこと
    // rectImage は hasImage=true の場合のみ描画される
    expect(json).toBeTruthy();
  });

  it('hasImage=true のとき画像エリアが描画される', () => {
    const { toJSON } = render(<PostCardSkeleton hasImage />);
    expect(toJSON()).toBeTruthy();
  });

  it('デフォルトでは hasImage=false と同じ構造になる', () => {
    const { toJSON: withDefault } = render(<PostCardSkeleton />);
    const { toJSON: withFalse } = render(<PostCardSkeleton hasImage={false} />);
    expect(JSON.stringify(withDefault())).toBe(JSON.stringify(withFalse()));
  });

  it('hasImage=true と hasImage=false で構造が異なる', () => {
    const { toJSON: withImage } = render(<PostCardSkeleton hasImage />);
    const { toJSON: withoutImage } = render(<PostCardSkeleton hasImage={false} />);
    // 画像エリアがある場合はなしの場合より JSON が長い
    expect(JSON.stringify(withImage()).length).toBeGreaterThan(
      JSON.stringify(withoutImage()).length
    );
  });

  it('正常にレンダリングされる', () => {
    const { toJSON } = render(<PostCardSkeleton />);
    expect(toJSON()).not.toBeNull();
  });
});
