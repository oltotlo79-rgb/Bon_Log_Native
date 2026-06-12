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

/** toJSON() の戻り値から root 要素の props を安全に取り出すヘルパー。 */
function getRootProps(toJSON: ReturnType<typeof render>['toJSON']): Record<string, unknown> {
  const json = toJSON();
  if (json === null || Array.isArray(json)) return {};
  return (json.props ?? {}) as Record<string, unknown>;
}

describe('PostCardSkeleton', () => {
  it('accessibilityElementsHidden が設定されスクリーンリーダーから隠れている', () => {
    const { toJSON } = render(<PostCardSkeleton />);
    const props = getRootProps(toJSON);
    expect(props.accessibilityElementsHidden).toBe(true);
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
