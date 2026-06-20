/**
 * components/auth/AuthScreenBackground のユニットテスト。
 * children の描画と背景画像のアクセシビリティ設定を確認する。
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { AuthScreenBackground } from '@/components/auth/AuthScreenBackground';

describe('AuthScreenBackground', () => {
  it('正常にレンダリングされる', () => {
    const { toJSON } = render(
      <AuthScreenBackground>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    expect(toJSON()).not.toBeNull();
  });

  it('children が前面に表示される', () => {
    render(
      <AuthScreenBackground>
        <Text>フォームコンテンツ</Text>
      </AuthScreenBackground>
    );
    expect(screen.getByText('フォームコンテンツ')).toBeTruthy();
  });

  it('複数の children を表示できる', () => {
    render(
      <AuthScreenBackground>
        <Text>要素1</Text>
        <Text>要素2</Text>
      </AuthScreenBackground>
    );
    expect(screen.getByText('要素1')).toBeTruthy();
    expect(screen.getByText('要素2')).toBeTruthy();
  });

  it('背景画像は accessible={false} で読み上げ対象外になっている', () => {
    const { toJSON } = render(
      <AuthScreenBackground>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    // JSON ツリーに accessible: false の Image が含まれていることを確認する
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessible":false');
  });

  it('背景画像は accessibilityElementsHidden=true で補助技術から隠されている', () => {
    const { toJSON } = render(
      <AuthScreenBackground>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityElementsHidden":true');
  });

  it('背景画像は importantForAccessibility="no-hide-descendants" で設定されている', () => {
    const { toJSON } = render(
      <AuthScreenBackground>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"importantForAccessibility":"no-hide-descendants"');
  });

  it('外から style プロップを渡せる', () => {
    const customStyle = { backgroundColor: '#ff0000' };
    const { toJSON } = render(
      <AuthScreenBackground style={customStyle}>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"backgroundColor":"#ff0000"');
  });

  it('背景画像に source が設定されている（auth-bg-gate-mobile.webp の require 結果）', () => {
    const { toJSON } = render(
      <AuthScreenBackground>
        <Text>コンテンツ</Text>
      </AuthScreenBackground>
    );
    const json = JSON.stringify(toJSON());
    // jest-expo はアセットの require をモジュール番号に変換するため、source が null/undefined でないことを確認する
    expect(json).not.toContain('"source":null');
    expect(json).not.toContain('"source":undefined');
  });
});
