/**
 * components/fertilizer/FertilizerDisclaimer のコンポーネントテスト。
 * 免責文言の表示と accessibilityRole を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';

describe('FertilizerDisclaimer', () => {
  it('施肥情報に関する免責文言が表示される', () => {
    render(<FertilizerDisclaimer />);
    expect(
      screen.getByText(
        '施肥の情報は一般的な盆栽管理の知識に基づいた目安です。実際の施肥は樹の状態、用土、気候、環境に応じて調整してください。特定の肥料製品を推奨するものではありません。',
      ),
    ).toBeTruthy();
  });

  it('accessibilityRole が text である', () => {
    const { toJSON } = render(<FertilizerDisclaimer />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"text"');
  });

  it('再レンダリングしてもエラーにならない', () => {
    const { rerender, getByText } = render(<FertilizerDisclaimer />);
    rerender(<FertilizerDisclaimer />);
    expect(
      getByText(
        '施肥の情報は一般的な盆栽管理の知識に基づいた目安です。実際の施肥は樹の状態、用土、気候、環境に応じて調整してください。特定の肥料製品を推奨するものではありません。',
      ),
    ).toBeTruthy();
  });
});
