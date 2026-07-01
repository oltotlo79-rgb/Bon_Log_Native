/**
 * @module __tests__/components/post/PollDisplayVoting
 * PollDisplay コンポーネントの投票操作テスト。
 * 既存の PollDisplay.test.tsx（null ガード・表示確認）とは別に、
 * 投票ミューテーション呼び出し・投票済み/期限切れの結果表示・エラー文言を検証する。
 * モック境界: useVotePollMutation をモック。ネットワークに出ない。
 */

import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react-native';
import { PollDisplay } from '@/components/post/PollDisplay';
import {
  ERR_POLL_VOTE_FAILED,
  ERR_POLL_ALREADY_VOTED,
  ERR_POLL_ENDED,
} from '@/lib/constants/errors';
import { ApiError } from '@/lib/api/errors';
import { renderWithProviders } from '@/__tests__/utils/test-utils';
import { makePollVoteResponse, makePostPoll } from '@/__tests__/utils/data-factories';

// ---------------------------------------------------------------------------
// モック設定
// ---------------------------------------------------------------------------

const mockMutate = jest.fn();

jest.mock('@/lib/queries/posts', () => ({
  useVotePollMutation: jest.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

// ---------------------------------------------------------------------------
// テストデータ
// ---------------------------------------------------------------------------

function makeActivePoll(overrides?: {
  id?: string;
  options?: { id: string; pollId: string; text: string; sortOrder: number; _count: { votes: number } }[];
  _count?: { votes: number };
}) {
  return makePostPoll({
    id: overrides?.id ?? 'poll-1',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    options: overrides?.options ?? [
      { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
      { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
    ],
    _count: overrides?._count ?? { votes: 10 },
    votes: [],
  });
}

function makeExpiredPoll() {
  return makePostPoll({
    id: 'poll-expired',
    expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
    options: [
      { id: 'opt-1', pollId: 'poll-expired', text: '松柏類', sortOrder: 0, _count: { votes: 7 } },
      { id: 'opt-2', pollId: 'poll-expired', text: '雑木類', sortOrder: 1, _count: { votes: 3 } },
    ],
    _count: { votes: 10 },
    votes: [],
  });
}

function makeVotedPoll(votedOptionId: string) {
  return makePostPoll({
    id: 'poll-voted',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    options: [
      { id: 'opt-1', pollId: 'poll-voted', text: '松柏類', sortOrder: 0, _count: { votes: 7 } },
      { id: 'opt-2', pollId: 'poll-voted', text: '雑木類', sortOrder: 1, _count: { votes: 3 } },
    ],
    _count: { votes: 10 },
    votes: [
      { id: 'vote-1', pollId: 'poll-voted', optionId: votedOptionId, userId: 'user-1', createdAt: '2025-06-01T10:00:00Z' },
    ],
  });
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('PollDisplay 投票操作', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 未投票・未期限の投票 UI
  // -------------------------------------------------------------------------

  describe('未投票・未期限の投票 UI', () => {
    it('選択肢が radio ボタンとして表示される', () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      expect(
        screen.getByRole('radio', { name: '松柏類' })
      ).toBeTruthy();
      expect(
        screen.getByRole('radio', { name: '雑木類' })
      ).toBeTruthy();
    });

    it('「投票する」ボタンが表示される', () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      expect(
        screen.getByRole('button', { name: '投票する' })
      ).toBeTruthy();
    });

    it('初期状態で「投票する」ボタンが disabled', () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      const voteButton = screen.getByRole('button', { name: '投票する' });
      expect(voteButton.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true })
      );
    });

    it('選択肢を選ぶと「投票する」ボタンが enabled になる', async () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      await waitFor(() => {
        const voteButton = screen.getByRole('button', { name: '投票する' });
        expect(voteButton.props.accessibilityState).toEqual(
          expect.objectContaining({ disabled: false })
        );
      });
    });

    it('選択肢を選ぶと accessibilityState.checked が true になる', async () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      await waitFor(() => {
        const radioBtn = screen.getByRole('radio', { name: '松柏類' });
        expect(radioBtn.props.accessibilityState).toEqual(
          expect.objectContaining({ checked: true })
        );
      });
    });

    it('選択肢を変更すると前の選択の checked が false に戻る', async () => {
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '雑木類' }));
      });
      await waitFor(() => {
        expect(
          screen.getByRole('radio', { name: '松柏類' }).props.accessibilityState
        ).toEqual(expect.objectContaining({ checked: false }));
        expect(
          screen.getByRole('radio', { name: '雑木類' }).props.accessibilityState
        ).toEqual(expect.objectContaining({ checked: true }));
      });
    });

    it('「投票する」ボタンを押すと useVotePollMutation.mutate が呼ばれる', async () => {
      renderWithProviders(
        <PollDisplay poll={makeActivePoll({ id: 'poll-abc' })} postId="post-xyz" />
      );
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledTimes(1);
        expect(mockMutate).toHaveBeenCalledWith(
          { pollId: 'poll-abc', optionId: 'opt-1', postId: 'post-xyz' },
          expect.any(Object)
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // 投票成功後の結果表示
  // -------------------------------------------------------------------------

  describe('投票成功後の結果表示', () => {
    it('投票成功後に結果（割合）が表示される', async () => {
      const voteResult = makePollVoteResponse({
        id: 'poll-1',
        isExpired: false,
        totalVotes: 10,
        userVoteOptionId: 'opt-1',
        options: [
          { id: 'opt-1', text: '松柏類', voteCount: 7, percentage: 70.0 },
          { id: 'opt-2', text: '雑木類', voteCount: 3, percentage: 30.0 },
        ],
      });

      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onSuccess?: (data: typeof voteResult) => void }) => {
          callbacks?.onSuccess?.(voteResult);
        }
      );

      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      expect(await screen.findByText('70%')).toBeTruthy();
      expect(await screen.findByText('30%')).toBeTruthy();
    });

    it('投票済み（votes[0].optionId あり）の場合は最初から結果表示になる', () => {
      renderWithProviders(<PollDisplay poll={makeVotedPoll('opt-1')} />);
      expect(screen.queryByRole('button', { name: '投票する' })).toBeNull();
      expect(screen.getByText('70%')).toBeTruthy();
      expect(screen.getByText('30%')).toBeTruthy();
    });

    it('投票済みのアイテムに accessibilityLabel で「あなたの選択」が含まれる', () => {
      renderWithProviders(<PollDisplay poll={makeVotedPoll('opt-1')} />);
      const voteLabel = screen.getByLabelText('松柏類 70% あなたの選択');
      expect(voteLabel).toBeTruthy();
    });

    it('投票していない選択肢の accessibilityLabel に「あなたの選択」が含まれない', () => {
      renderWithProviders(<PollDisplay poll={makeVotedPoll('opt-1')} />);
      const notVotedLabel = screen.getByLabelText('雑木類 30%');
      expect(notVotedLabel).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 期限切れの結果表示
  // -------------------------------------------------------------------------

  describe('期限切れの結果表示', () => {
    it('期限切れアンケートは投票 UI を表示しない', () => {
      renderWithProviders(<PollDisplay poll={makeExpiredPoll()} />);
      expect(screen.queryByRole('button', { name: '投票する' })).toBeNull();
    });

    it('期限切れアンケートは割合が表示される', () => {
      renderWithProviders(<PollDisplay poll={makeExpiredPoll()} />);
      expect(screen.getByText('70%')).toBeTruthy();
      expect(screen.getByText('30%')).toBeTruthy();
    });

    it('期限切れアンケートは「終了済み」が表示される', () => {
      renderWithProviders(<PollDisplay poll={makeExpiredPoll()} />);
      expect(screen.getByText('終了済み')).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // エラー文言
  // -------------------------------------------------------------------------

  describe('エラー文言', () => {
    it('CONFLICT → ERR_POLL_ALREADY_VOTED が表示される（二重投票）', async () => {
      const conflictError = new ApiError({
        code: 'CONFLICT',
        status: 409,
        message: 'already voted',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(conflictError);
        }
      );
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      expect(await screen.findByText(ERR_POLL_ALREADY_VOTED)).toBeTruthy();
    });

    it('NOT_FOUND → ERR_POLL_ENDED が表示される（期限切れ）', async () => {
      const notFoundError = new ApiError({
        code: 'NOT_FOUND',
        status: 404,
        message: 'poll not found or ended',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(notFoundError);
        }
      );
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      expect(await screen.findByText(ERR_POLL_ENDED)).toBeTruthy();
    });

    it('その他のエラー → ERR_POLL_VOTE_FAILED が表示される', async () => {
      const serverError = new ApiError({
        code: 'INTERNAL_ERROR',
        status: 500,
        message: 'server error',
      });
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(serverError);
        }
      );
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      expect(await screen.findByText(ERR_POLL_VOTE_FAILED)).toBeTruthy();
    });

    it('非 ApiError → ERR_POLL_VOTE_FAILED が表示される', async () => {
      mockMutate.mockImplementation(
        (_params: unknown, callbacks: { onError?: (e: Error) => void }) => {
          callbacks?.onError?.(new Error('network error'));
        }
      );
      renderWithProviders(<PollDisplay poll={makeActivePoll()} />);
      act(() => {
        fireEvent.press(screen.getByRole('radio', { name: '松柏類' }));
      });
      act(() => {
        fireEvent.press(screen.getByRole('button', { name: '投票する' }));
      });
      expect(await screen.findByText(ERR_POLL_VOTE_FAILED)).toBeTruthy();
    });
  });

  // -------------------------------------------------------------------------
  // 境界値
  // -------------------------------------------------------------------------

  describe('境界値', () => {
    it('投票合計が0のとき全選択肢の割合が0%になる', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            id: 'poll-voted',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            options: [
              { id: 'opt-1', pollId: 'poll-voted', text: '松柏類', sortOrder: 0, _count: { votes: 0 } },
              { id: 'opt-2', pollId: 'poll-voted', text: '雑木類', sortOrder: 1, _count: { votes: 0 } },
            ],
            _count: { votes: 0 },
            votes: [
              { id: 'vote-1', pollId: 'poll-voted', optionId: 'opt-1', userId: 'user-1', createdAt: '2025-06-01T10:00:00Z' },
            ],
          })}
        />
      );
      const zeros = screen.getAllByText('0%');
      expect(zeros.length).toBe(2);
    });
  });
});
