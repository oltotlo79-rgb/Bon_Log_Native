/**
 * components/post/PostGenreTags のコンポーネントテスト。
 * genres=[] で null、タップで遷移を確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PostGenreTags } from '@/components/post/PostGenreTags';
import { makeGenre } from '@/__tests__/utils/post-card-factory';

const mockRouter = jest.requireMock('expo-router').router;

describe('PostGenreTags', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('genres=[] のとき何もレンダリングしない（null）', () => {
    const { toJSON } = render(<PostGenreTags genres={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('1件のジャンルタグが表示される', () => {
    const genres = [makeGenre({ name: '松柏類' })];
    render(<PostGenreTags genres={genres} />);
    expect(screen.getByRole('button', { name: '松柏類で検索' })).toBeTruthy();
  });

  it('複数のジャンルタグがすべて表示される', () => {
    const genres = [
      makeGenre({ id: 'g1', name: '松柏類' }),
      makeGenre({ id: 'g2', name: '雑木類' }),
      makeGenre({ id: 'g3', name: '草もの' }),
    ];
    render(<PostGenreTags genres={genres} />);
    expect(screen.getByRole('button', { name: '松柏類で検索' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '雑木類で検索' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '草もので検索' })).toBeTruthy();
  });

  it('タグをタップすると検索画面へ遷移する', () => {
    const genre = makeGenre({ id: 'genre-abc', name: '松柏類' });
    render(<PostGenreTags genres={[genre]} />);
    fireEvent.press(screen.getByRole('button', { name: '松柏類で検索' }));
    expect(mockRouter.push).toHaveBeenCalledWith(
      { pathname: '/(tabs)/search', params: { genre: 'genre-abc' } }
    );
  });

  it('genre.name がタグテキストとして表示される', () => {
    const genre = makeGenre({ name: '用品・道具' });
    render(<PostGenreTags genres={[genre]} />);
    expect(screen.getByText('用品・道具')).toBeTruthy();
  });
});
