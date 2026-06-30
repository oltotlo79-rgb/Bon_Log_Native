/**
 * components/post/PollDisplay のコンポーネントテスト。
 * 正常なアンケートデータの表示・票数・割合計算・期限表示・型ガード（不正データ非表示）を網羅する。
 */

import React from 'react';
import { screen } from '@testing-library/react-native';
import { PollDisplay } from '@/components/post/PollDisplay';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

function makePollData(overrides?: {
  id?: string;
  expiresAt?: string;
  options?: { id: string; text: string; _count: { votes: number } }[];
  _count?: { votes: number };
}) {
  return {
    id: overrides?.id ?? 'poll-1',
    expiresAt:
      overrides?.expiresAt ??
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    options: overrides?.options ?? [
      { id: 'opt-1', text: '松柏類', _count: { votes: 6 } },
      { id: 'opt-2', text: '雑木類', _count: { votes: 4 } },
    ],
    _count: overrides?._count ?? { votes: 10 },
  };
}

describe('PollDisplay', () => {
  describe('型ガード（不正データ）', () => {
    it('poll が null のとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll={null} />);
      expect(toJSON()).toBeNull();
    });

    it('poll が undefined のとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll={undefined} />);
      expect(toJSON()).toBeNull();
    });

    it('poll が文字列のとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll="invalid" />);
      expect(toJSON()).toBeNull();
    });

    it('poll が数値のとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll={42} />);
      expect(toJSON()).toBeNull();
    });

    it('poll.id がない場合は何も表示しない', () => {
      const invalidPoll = {
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        options: [{ id: 'opt-1', text: 'テスト', _count: { votes: 1 } }],
        _count: { votes: 1 },
      };
      const { toJSON } = renderWithProviders(<PollDisplay poll={invalidPoll} />);
      expect(toJSON()).toBeNull();
    });

    it('poll.expiresAt がない場合は何も表示しない', () => {
      const invalidPoll = {
        id: 'poll-1',
        options: [{ id: 'opt-1', text: 'テスト', _count: { votes: 1 } }],
        _count: { votes: 1 },
      };
      const { toJSON } = renderWithProviders(<PollDisplay poll={invalidPoll} />);
      expect(toJSON()).toBeNull();
    });

    it('poll.options が配列でない場合は何も表示しない', () => {
      const invalidPoll = {
        id: 'poll-1',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        options: 'not-an-array',
        _count: { votes: 0 },
      };
      const { toJSON } = renderWithProviders(<PollDisplay poll={invalidPoll} />);
      expect(toJSON()).toBeNull();
    });

    it('options の要素に _count.votes がない場合は何も表示しない', () => {
      const invalidPoll = {
        id: 'poll-1',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        options: [{ id: 'opt-1', text: 'テスト', _count: {} }],
        _count: { votes: 1 },
      };
      const { toJSON } = renderWithProviders(<PollDisplay poll={invalidPoll} />);
      expect(toJSON()).toBeNull();
    });

    it('poll._count がない場合は何も表示しない', () => {
      const invalidPoll = {
        id: 'poll-1',
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        options: [{ id: 'opt-1', text: 'テスト', _count: { votes: 1 } }],
      };
      const { toJSON } = renderWithProviders(<PollDisplay poll={invalidPoll} />);
      expect(toJSON()).toBeNull();
    });

    it('空オブジェクトのとき何も表示しない', () => {
      const { toJSON } = renderWithProviders(<PollDisplay poll={{}} />);
      expect(toJSON()).toBeNull();
    });
  });

  describe('選択肢の表示', () => {
    it('選択肢テキストが全て表示される', () => {
      renderWithProviders(<PollDisplay poll={makePollData()} />);
      expect(screen.getByText('松柏類')).toBeTruthy();
      expect(screen.getByText('雑木類')).toBeTruthy();
    });

    it('選択肢が1件の場合でも表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [{ id: 'opt-1', text: '唯一の選択肢', _count: { votes: 5 } }],
            _count: { votes: 5 },
          })}
        />
      );
      expect(screen.getByText('唯一の選択肢')).toBeTruthy();
    });

    it('選択肢が4件の場合は全て表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [
              { id: 'opt-1', text: '選択肢A', _count: { votes: 1 } },
              { id: 'opt-2', text: '選択肢B', _count: { votes: 2 } },
              { id: 'opt-3', text: '選択肢C', _count: { votes: 3 } },
              { id: 'opt-4', text: '選択肢D', _count: { votes: 4 } },
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
    it('totalVotes が 0 のとき全選択肢の割合が 0% になる', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [
              { id: 'opt-1', text: '松柏類', _count: { votes: 0 } },
              { id: 'opt-2', text: '雑木類', _count: { votes: 0 } },
            ],
            _count: { votes: 0 },
          })}
        />
      );
      const percentages = screen.getAllByText('0%');
      expect(percentages.length).toBe(2);
    });

    it('合計10票のとき60%/40%が正しく計算される', () => {
      renderWithProviders(<PollDisplay poll={makePollData()} />);
      expect(screen.getByText('60%')).toBeTruthy();
      expect(screen.getByText('40%')).toBeTruthy();
    });

    it('合計票数がフッターに表示される', () => {
      renderWithProviders(<PollDisplay poll={makePollData({ _count: { votes: 10 } })} />);
      expect(screen.getByText('10票')).toBeTruthy();
    });

    it('totalVotes=0 のとき「0票」が表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [{ id: 'opt-1', text: '松柏類', _count: { votes: 0 } }],
            _count: { votes: 0 },
          })}
        />
      );
      expect(screen.getByText('0票')).toBeTruthy();
    });

    it('割合は Math.round で丸められる（1/3 ≈ 33%）', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [
              { id: 'opt-1', text: '選択肢A', _count: { votes: 1 } },
              { id: 'opt-2', text: '選択肢B', _count: { votes: 2 } },
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
        <PollDisplay poll={makePollData({ expiresAt: expiredAt })} />
      );
      expect(screen.getByText('終了済み')).toBeTruthy();
    });

    it('残り時間が 24 時間未満のとき「残り約 N 時間」が表示される', () => {
      const soonAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePollData({ expiresAt: soonAt })} />
      );
      expect(screen.getByText('残り約 2 時間')).toBeTruthy();
    });

    it('残り時間が 24 時間以上のとき「残り約 N 日」が表示される', () => {
      const futureAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePollData({ expiresAt: futureAt })} />
      );
      expect(screen.getByText('残り約 3 日')).toBeTruthy();
    });

    it('期限が来ていない場合「投票機能は近日対応予定」が表示される', () => {
      const futureAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePollData({ expiresAt: futureAt })} />
      );
      expect(screen.getByText('投票機能は近日対応予定')).toBeTruthy();
    });

    it('期限切れの場合「投票機能は近日対応予定」が表示されない', () => {
      const expiredAt = new Date(Date.now() - 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePollData({ expiresAt: expiredAt })} />
      );
      expect(screen.queryByText('投票機能は近日対応予定')).toBeNull();
    });
  });

  describe('境界値', () => {
    it('100票のとき「100票」が表示される', () => {
      renderWithProviders(
        <PollDisplay
          poll={makePollData({
            options: [{ id: 'opt-1', text: '松柏類', _count: { votes: 100 } }],
            _count: { votes: 100 },
          })}
        />
      );
      expect(screen.getByText('100票')).toBeTruthy();
    });

    it('残り1時間のとき「残り約 1 時間」が表示される', () => {
      // Math.ceil(diffMs / 3600000) === 1 になるよう、ちょうど 60 分後を指定する
      const oneHourLater = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      renderWithProviders(
        <PollDisplay poll={makePollData({ expiresAt: oneHourLater })} />
      );
      expect(screen.getByText('残り約 1 時間')).toBeTruthy();
    });
  });
});
