/**
 * @module __tests__/components/messages/MessageDateSeparator
 * MessageDateSeparator コンポーネントのユニットテスト。
 * 日付ラベルの表示（今日 / 昨日 / yyyy年M月d日）を検証する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { MessageDateSeparator } from '@/components/messages/MessageDateSeparator';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('MessageDateSeparator', () => {
  // MessageDateSeparator は accessibilityElementsHidden な View の中にテキストを持つため
  // includeHiddenElements: true で検索する。
  const opts = { includeHiddenElements: true };

  describe('今日', () => {
    it('今日の日付を渡すと「今日」と表示される', () => {
      const today = new Date().toISOString();
      renderWithProviders(<MessageDateSeparator dateStr={today} />);
      expect(screen.getByText('今日', opts)).toBeTruthy();
    });
  });

  describe('昨日', () => {
    it('昨日の日付を渡すと「昨日」と表示される', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      renderWithProviders(<MessageDateSeparator dateStr={yesterday.toISOString()} />);
      expect(screen.getByText('昨日', opts)).toBeTruthy();
    });
  });

  describe('それ以前の日付', () => {
    it('2 日以上前の日付は「yyyy年M月d日」形式で表示される', () => {
      renderWithProviders(<MessageDateSeparator dateStr="2025-06-01T10:00:00Z" />);
      // 環境のタイムゾーンに依存するため正規表現で検証する
      expect(screen.getByText(/\d{4}年\d{1,2}月\d{1,2}日/, opts)).toBeTruthy();
    });

    it('過去の特定日付がラベルテキストに含まれる（年を含む）', () => {
      renderWithProviders(<MessageDateSeparator dateStr="2024-01-15T00:00:00Z" />);
      // タイムゾーン差で日付が 14 or 15 になる可能性があるため年のみを厳密チェック
      expect(screen.getByText(/2024年/, opts)).toBeTruthy();
    });
  });
});
