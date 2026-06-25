/**
 * components/auth/AuthHeroImage のユニットテスト。
 * 墨絵ヒーロー画像の描画と accessibilityLabel を確認する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { AuthHeroImage } from '@/components/auth/AuthHeroImage';

describe('AuthHeroImage', () => {
  it('正常にレンダリングされる', () => {
    const { toJSON } = render(<AuthHeroImage />);
    expect(toJSON()).not.toBeNull();
  });

  it('accessibilityLabel "盆栽の墨絵" を持つ', () => {
    render(<AuthHeroImage />);
    expect(screen.getByLabelText('盆栽の墨絵')).toBeTruthy();
  });

  it('accessibilityRole が "image" である', () => {
    render(<AuthHeroImage />);
    const image = screen.getByLabelText('盆栽の墨絵');
    expect(image.props.accessibilityRole).toBe('image');
  });

  it('welcome-bonsai.webp をソースとして使用する', () => {
    const { toJSON } = render(<AuthHeroImage />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('welcome-bonsai.webp');
  });
});
