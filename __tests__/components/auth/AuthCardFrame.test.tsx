/**
 * components/auth/AuthCardFrame のユニットテスト。
 * 子要素の描画、墨筆枠（post-frame）画像の描画とアクセシビリティ設定、
 * 外部からの style 差し込みを確認する。
 * 仕様: docs/design/sumi-e-theme-parity-2026-07-06.md §4 P3 / §6.3
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AuthCardFrame } from '@/components/auth/AuthCardFrame';

describe('AuthCardFrame', () => {
  it('children が描画される', () => {
    render(
      <AuthCardFrame>
        <Text>フォームコンテンツ</Text>
      </AuthCardFrame>
    );
    expect(screen.getByText('フォームコンテンツ')).toBeTruthy();
  });

  it('複数の children を表示できる', () => {
    render(
      <AuthCardFrame>
        <Text>要素1</Text>
        <Text>要素2</Text>
      </AuthCardFrame>
    );
    expect(screen.getByText('要素1')).toBeTruthy();
    expect(screen.getByText('要素2')).toBeTruthy();
  });

  it('post-frame 画像が墨筆枠として描画される', () => {
    const { toJSON } = render(
      <AuthCardFrame>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain('post-frame.svg');
  });

  it('post-frame 画像は accessible={false} で読み上げ対象外になっている', () => {
    const { toJSON } = render(
      <AuthCardFrame>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain('"accessible":false');
  });

  it('post-frame 画像は accessibilityElementsHidden=true で補助技術から隠されている', () => {
    const { toJSON } = render(
      <AuthCardFrame>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain('"accessibilityElementsHidden":true');
  });

  it('post-frame 画像は importantForAccessibility="no-hide-descendants" が設定されている', () => {
    const { toJSON } = render(
      <AuthCardFrame>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain(
      '"importantForAccessibility":"no-hide-descendants"'
    );
  });

  it('カードが Web の card-washi と同じ 1deg の傾きを持つ', () => {
    const { toJSON } = render(
      <AuthCardFrame>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain('"rotate":"1deg"');
  });

  it('外から style プロップを渡せる', () => {
    const customStyle = { marginTop: 40 };
    const { toJSON } = render(
      <AuthCardFrame style={customStyle}>
        <Text>コンテンツ</Text>
      </AuthCardFrame>
    );
    expect(JSON.stringify(toJSON())).toContain('"marginTop":40');
  });
});
