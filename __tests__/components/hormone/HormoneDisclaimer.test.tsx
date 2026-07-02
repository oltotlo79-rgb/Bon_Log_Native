/**
 * components/hormone/HormoneDisclaimer のコンポーネントテスト。
 * 免責文言の表示と accessibilityRole を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { HormoneDisclaimer } from '@/components/hormone/HormoneDisclaimer';

describe('HormoneDisclaimer', () => {
  it('植物ホルモン情報に関する免責文言が表示される', () => {
    render(<HormoneDisclaimer />);
    expect(
      screen.getByText(
        '植物ホルモンの情報は一般的な植物生理学・盆栽管理の知識に基づく解説です。実際のホルモン処理（発根促進剤・植物成長調整剤等の使用）は樹の状態、種類、時期、環境に応じて異なります。特定の薬剤・処理法を推奨するものではありません。',
      ),
    ).toBeTruthy();
  });

  it('accessibilityRole が text である', () => {
    const { toJSON } = render(<HormoneDisclaimer />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"text"');
  });

  it('再レンダリングしてもエラーにならない', () => {
    const { rerender, getByText } = render(<HormoneDisclaimer />);
    rerender(<HormoneDisclaimer />);
    expect(
      getByText(
        '植物ホルモンの情報は一般的な植物生理学・盆栽管理の知識に基づく解説です。実際のホルモン処理（発根促進剤・植物成長調整剤等の使用）は樹の状態、種類、時期、環境に応じて異なります。特定の薬剤・処理法を推奨するものではありません。',
      ),
    ).toBeTruthy();
  });
});
