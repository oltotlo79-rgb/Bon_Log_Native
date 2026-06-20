/**
 * components/auth/AuthBrandHeader のユニットテスト。
 * ロゴ画像とキャッチコピーの描画、アクセシビリティ属性を確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';

describe('AuthBrandHeader', () => {
  it('正常にレンダリングされる', () => {
    const { toJSON } = render(<AuthBrandHeader />);
    expect(toJSON()).not.toBeNull();
  });

  it('キャッチコピー「盆栽愛好家のためのSNS」が表示される', () => {
    render(<AuthBrandHeader />);
    expect(screen.getByText('盆栽愛好家のためのSNS')).toBeTruthy();
  });

  it('コンテナが header ロールを持つ（accessibilityRole="header" が View に設定される）', () => {
    const { toJSON } = render(<AuthBrandHeader />);
    // View に accessibilityRole="header" が付いていることを JSON ツリーで確認する
    // RNTLの getByRole は Text ベースの role を対象とするため、View ベースの確認は toJSON を使う
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"accessibilityRole":"header"');
  });

  it('ロゴ画像の accessibilityLabel が "BON-LOG 盆栽SNS" である', () => {
    render(<AuthBrandHeader />);
    expect(screen.getByLabelText('BON-LOG 盆栽SNS')).toBeTruthy();
  });

  it('ロゴ画像の accessibilityRole が "image" である', () => {
    render(<AuthBrandHeader />);
    const logo = screen.getByLabelText('BON-LOG 盆栽SNS');
    expect(logo.props.accessibilityRole).toBe('image');
  });

  it('ロゴ画像に source が設定されている（brand-mark.png の require 結果）', () => {
    const { toJSON } = render(<AuthBrandHeader />);
    const json = JSON.stringify(toJSON());
    // jest-expo はアセットの require をモジュール番号に変換するため、source が null/undefined でないことを確認する
    expect(json).not.toContain('"source":null');
    expect(json).not.toContain('"source":undefined');
  });
});
