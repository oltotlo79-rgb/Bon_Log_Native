/**
 * components/post/PollDisplay のコンポーネントテスト。
 * 正常なアンケートデータの表示・票数・割合計算・期限表示・null ガード（poll=null 非表示）を網羅する。
 * テストデータは新 PostPoll 実形（id/postId/duration/expiresAt/createdAt/options[pollId+sortOrder+_count]/votes/_ count）に準拠する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { PollDisplay } from '@/components/post/PollDisplay';
import { makePostPoll } from '@/__tests__/utils/data-factories';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

jest.mock('@/lib/queries/posts', () => ({
  useVotePollMutation: jest.fn(() => ({
    mutate: jest.fn(),
    isPending: false,
  })),
}));

describe('PollDisplay', () => {
  describe('null ガード', () => {
    it('poll が null のとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll={null} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('選択肢の表示', () => {
    it('選択肢テキストが全て表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
            ],
            _count: { votes: 10 },
          })}
        />
      );
      expect(screen.getByText('松柏類')).toBeTruthy();
      expect(screen.getByText('雑木類')).toBeTruthy();
    });

    it('選択肢が1件の場合でも表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '唯一の選択肢', sortOrder: 0, _count: { votes: 5 } },
            ],
            _count: { votes: 5 },
          })}
        />
      );
      expect(screen.getByText('唯一の選択肢')).toBeTruthy();
    });

    it('選択肢が4件の場合は全て表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '選択肢A', sortOrder: 0, _count: { votes: 1 } },
              { id: 'opt-2', pollId: 'poll-1', text: '選択肢B', sortOrder: 1, _count: { votes: 2 } },
              { id: 'opt-3', pollId: 'poll-1', text: '選択肢C', sortOrder: 2, _count: { votes: 3 } },
              { id: 'opt-4', pollId: 'poll-1', text: '選択肢D', sortOrder: 3, _count: { votes: 4 } },
            ],
            _count: { votes: 10 },
          })}
        />
      );
      expect(screen.getByText('選択肢A')).toBeTruthy();
      expect(screen.getByText('選択肢B')).toBeTruthy();
      expect(screen.getByText('選択肢C')).toBeTruthy();
      expect(screen.getByText('選択肢D')).toBeTruthy();
    });
  });

  describe('票数・割合の計算', () => {
    it('totalVotes が 0 のとき全選択肢の割合が 0% になる（期限切れポール）', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: expiredAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 0 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 0 } },
            ],
            _count: { votes: 0 },
          })}
        />
      );
      const percentages = screen.getAllByText('0%');
      expect(percentages.length).toBe(2);
    });

    it('合計10票のとき60%/40%が正しく計算される（期限切れポール）', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: expiredAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
            ],
            _count: { votes: 10 },
          })}
        />
      );
      expect(screen.getByText('60%')).toBeTruthy();
      expect(screen.getByText('40%')).toBeTruthy();
    });

    it('合計票数がフッターに表示される', () => {
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ _count: { votes: 10 } })} />
      );
      expect(screen.getByText('10票')).toBeTruthy();
    });

    it('totalVotes=0 のとき「0票」が表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 0 } },
            ],
            _count: { votes: 0 },
          })}
        />
      );
      expect(screen.getByText('0票')).toBeTruthy();
    });

    it('割合は Math.round で丸められる（1/3 ≈ 33%）（期限切れポール）', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: expiredAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '選択肢A', sortOrder: 0, _count: { votes: 1 } },
              { id: 'opt-2', pollId: 'poll-1', text: '選択肢B', sortOrder: 1, _count: { votes: 2 } },
            ],
            _count: { votes: 3 },
          })}
        />
      );
      expect(screen.getByText('33%')).toBeTruthy();
      expect(screen.getByText('67%')).toBeTruthy();
    });
  });

  describe('期限ラベル', () => {
    it('期限切れの場合「終了済み」が表示される', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ expiresAt: expiredAt })} />
      );
      expect(screen.getByText('終了済み')).toBeTruthy();
    });

    it('残り時間が 24 時間未満のとき「残り約 N 時間」が表示される', () => {
      const soonAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ expiresAt: soonAt })} />
      );
      expect(screen.getByText('残り約 2 時間')).toBeTruthy();
    });

    it('残り時間が 24 時間以上のとき「残り約 N 日」が表示される', () => {
      const futureAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ expiresAt: futureAt })} />
      );
      expect(screen.getByText('残り約 3 日')).toBeTruthy();
    });

    it('未投票かつ未期限のとき「投票する」ボタンが表示される', () => {
      const futureAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ expiresAt: futureAt, votes: [] })} />
      );
      expect(screen.getByRole('button', { name: '投票する' })).toBeTruthy();
    });

    it('未投票かつ未期限のとき割合（%）は表示されない', () => {
      const futureAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: futureAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
            ],
            _count: { votes: 10 },
            votes: [],
          })}
        />
      );
      expect(screen.queryByText('60%')).toBeNull();
      expect(screen.queryByText('40%')).toBeNull();
    });

    it('期限切れの場合「終了済み」が表示され割合が出る', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: expiredAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 6 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 4 } },
            ],
            _count: { votes: 10 },
          })}
        />
      );
      expect(screen.getByText('終了済み')).toBeTruthy();
      expect(screen.getByText('60%')).toBeTruthy();
    });
  });

  describe('投票済み（votes で判定）', () => {
    it('votes[0].optionId があるとき結果表示になる（投票ボタンが表示されない）', () => {
      const futureAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: futureAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 7 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 3 } },
            ],
            _count: { votes: 10 },
            votes: [
              { id: 'vote-1', pollId: 'poll-1', optionId: 'opt-1', userId: 'user-1', createdAt: '2025-06-01T10:00:00Z' },
            ],
          })}
        />
      );
      expect(screen.queryByRole('button', { name: '投票する' })).toBeNull();
      expect(screen.getByText('70%')).toBeTruthy();
      expect(screen.getByText('30%')).toBeTruthy();
    });

    it('votes[0].optionId があるとき当該選択肢の accessibilityLabel に「あなたの選択」が含まれる', () => {
      const futureAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            expiresAt: futureAt,
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 7 } },
              { id: 'opt-2', pollId: 'poll-1', text: '雑木類', sortOrder: 1, _count: { votes: 3 } },
            ],
            _count: { votes: 10 },
            votes: [
              { id: 'vote-1', pollId: 'poll-1', optionId: 'opt-1', userId: 'user-1', createdAt: '2025-06-01T10:00:00Z' },
            ],
          })}
        />
      );
      expect(screen.getByLabelText('松柏類 70% あなたの選択')).toBeTruthy();
    });
  });

  describe('境界値', () => {
    it('100票のとき「100票」が表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePostPoll({
            options: [
              { id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 100 } },
            ],
            _count: { votes: 100 },
          })}
        />
      );
      expect(screen.getByText('100票')).toBeTruthy();
    });

    it('残り1時間のとき「残り約 1 時間」が表示される', () => {
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePostPoll({ expiresAt: oneHourLater })} />
      );
      expect(screen.getByText('残り約 1 時間')).toBeTruthy();
    });
  });
});
