/**
 * @module __tests__/components/search/RecentSearchesPanel
 * RecentSearchesPanel のコンポーネントテスト。
 * ヘッダー・全削除・各行の表示/タップ選択/個別削除を検証する。
 * データ永続化は持たない表示専用コンポーネントのため QueryClient は不要（plain render）。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RecentSearchesPanel } from '@/components/search/RecentSearchesPanel';

function renderPanel(
  searches: string[] = ['黒松', '五葉松'],
  overrides: {
    onSelect?: jest.Mock;
    onRemove?: jest.Mock;
    onClearAll?: jest.Mock;
  } = {}
) {
  const onSelect = overrides.onSelect ?? jest.fn();
  const onRemove = overrides.onRemove ?? jest.fn();
  const onClearAll = overrides.onClearAll ?? jest.fn();
  render(
    <RecentSearchesPanel
      searches={searches}
      onSelect={onSelect}
      onRemove={onRemove}
      onClearAll={onClearAll}
    />
  );
  return { onSelect, onRemove, onClearAll };
}

describe('RecentSearchesPanel: ヘッダー', () => {
  it('「最近の検索」見出しが表示される', () => {
    renderPanel();
    expect(screen.getByText('最近の検索')).toBeTruthy();
  });

  it('「すべて削除」ボタンが表示される', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: '検索履歴をすべて削除' })).toBeTruthy();
  });

  it('「すべて削除」ボタンタップで onClearAll が呼ばれる', () => {
    const { onClearAll } = renderPanel();
    fireEvent.press(screen.getByRole('button', { name: '検索履歴をすべて削除' }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});

describe('RecentSearchesPanel: 履歴行の表示', () => {
  it('各検索語が表示される', () => {
    renderPanel(['黒松', '五葉松', 'もみじ']);
    expect(screen.getByText('黒松')).toBeTruthy();
    expect(screen.getByText('五葉松')).toBeTruthy();
    expect(screen.getByText('もみじ')).toBeTruthy();
  });

  it('searches が空配列のとき行は表示されないがヘッダーは残る', () => {
    renderPanel([]);
    expect(screen.getByText('最近の検索')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /で検索$/ })).toBeNull();
  });

  it('1件のみでも表示される', () => {
    renderPanel(['黒松']);
    expect(screen.getByText('黒松')).toBeTruthy();
  });
});

describe('RecentSearchesPanel: 行タップで再検索', () => {
  it('行タップで onSelect が該当の検索語で呼ばれる', () => {
    const { onSelect } = renderPanel(['黒松', '五葉松']);
    fireEvent.press(screen.getByRole('button', { name: '黒松で検索' }));
    expect(onSelect).toHaveBeenCalledWith('黒松');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('別の行をタップすると別の検索語で onSelect が呼ばれる', () => {
    const { onSelect } = renderPanel(['黒松', '五葉松']);
    fireEvent.press(screen.getByRole('button', { name: '五葉松で検索' }));
    expect(onSelect).toHaveBeenCalledWith('五葉松');
  });
});

describe('RecentSearchesPanel: 個別削除', () => {
  it('削除ボタンタップで onRemove が該当の検索語で呼ばれる', () => {
    const { onRemove } = renderPanel(['黒松', '五葉松']);
    fireEvent.press(screen.getByRole('button', { name: '黒松の履歴を削除' }));
    expect(onRemove).toHaveBeenCalledWith('黒松');
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('削除ボタンタップでは onSelect は呼ばれない', () => {
    const { onSelect, onRemove } = renderPanel(['黒松']);
    fireEvent.press(screen.getByRole('button', { name: '黒松の履歴を削除' }));
    expect(onRemove).toHaveBeenCalledWith('黒松');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
