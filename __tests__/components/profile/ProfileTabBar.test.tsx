/**
 * @module __tests__/components/profile/ProfileTabBar
 * ProfileTabBar コンポーネントのユニットテスト。
 * 投稿・コメントタブの表示、選択状態、タップでの onSelect 呼び出しを検証する。
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { ProfileTabBar, type ProfileTab } from '@/components/profile/ProfileTabBar';

function renderTabBar(activeTab: ProfileTab, onSelect: (tab: ProfileTab) => void) {
  return renderWithProviders(<ProfileTabBar activeTab={activeTab} onSelect={onSelect} />);
}

describe('ProfileTabBar', () => {
  it('「投稿」「コメント」タブが表示される', () => {
    renderTabBar('posts', jest.fn());
    expect(screen.getByRole('tab', { name: '投稿' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'コメント' })).toBeTruthy();
  });

  it('activeTab="posts" のとき投稿タブが selected になる', () => {
    renderTabBar('posts', jest.fn());
    const postsTab = screen.getByRole('tab', { name: '投稿' });
    const commentsTab = screen.getByRole('tab', { name: 'コメント' });
    expect(postsTab.props.accessibilityState.selected).toBe(true);
    expect(commentsTab.props.accessibilityState.selected).toBe(false);
  });

  it('activeTab="comments" のときコメントタブが selected になる', () => {
    renderTabBar('comments', jest.fn());
    const postsTab = screen.getByRole('tab', { name: '投稿' });
    const commentsTab = screen.getByRole('tab', { name: 'コメント' });
    expect(postsTab.props.accessibilityState.selected).toBe(false);
    expect(commentsTab.props.accessibilityState.selected).toBe(true);
  });

  it('コメントタブをタップすると onSelect("comments") が呼ばれる', () => {
    const onSelect = jest.fn();
    renderTabBar('posts', onSelect);
    fireEvent.press(screen.getByRole('tab', { name: 'コメント' }));
    expect(onSelect).toHaveBeenCalledWith('comments');
  });

  it('投稿タブをタップすると onSelect("posts") が呼ばれる', () => {
    const onSelect = jest.fn();
    renderTabBar('comments', onSelect);
    fireEvent.press(screen.getByRole('tab', { name: '投稿' }));
    expect(onSelect).toHaveBeenCalledWith('posts');
  });

  it('タブバー全体が tablist ロールを持つ', () => {
    renderTabBar('posts', jest.fn());
    expect(screen.root.findByProps({ accessibilityRole: 'tablist' })).toBeTruthy();
  });
});
