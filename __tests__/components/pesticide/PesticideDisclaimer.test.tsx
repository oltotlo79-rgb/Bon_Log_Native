/**
 * components/pesticide/PesticideDisclaimer のコンポーネントテスト。
 * 免責文言の表示と accessibilityRole を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';

describe('PesticideDisclaimer', () => {
  it('農薬情報に関する免責文言が表示される', () => {
    render(<PesticideDisclaimer />);
    expect(
      screen.getByText(
        '農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。',
      ),
    ).toBeTruthy();
  });

  it('accessibilityRole が text である', () => {
    const { toJSON } = render(<PesticideDisclaimer />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"text"');
  });

  it('再レンダリングしてもエラーにならない', () => {
    const { rerender, getByText } = render(<PesticideDisclaimer />);
    rerender(<PesticideDisclaimer />);
    expect(
      getByText(
        '農薬情報は参考情報です。実際の使用に際しては必ず製品ラベルおよび農林水産省登録情報を確認してください。効果・安全性は個々の使用状況により異なります。',
      ),
    ).toBeTruthy();
  });
});
