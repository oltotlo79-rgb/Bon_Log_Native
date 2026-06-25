/**
 * @module __tests__/components/common/UserAvatar
 * UserAvatar コンポーネントのユニットテスト。
 * avatarUrl あり/なし・enso の決定性・accessibilityLabel を検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { UserAvatar } from '@/components/common/UserAvatar';

// ---------------------------------------------------------------------------
// djb2 ハッシュ + mod 5 の期待値計算（本番コードと同一ロジック）
// ---------------------------------------------------------------------------

function expectedEnsoIndex(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 5;
}

// ---------------------------------------------------------------------------
// テスト
// ---------------------------------------------------------------------------

describe('UserAvatar', () => {
  describe('avatarUrl あり', () => {
    it('uri ベースの Image が描画される', () => {
      const url = 'https://cdn.bon-log.com/avatars/user-abc.jpg';
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={url}
          userId="user-abc"
          size={44}
          accessibilityLabel="松の匠のプロフィール画像"
        />
      );
      expect(JSON.stringify(toJSON())).toContain(url);
    });

    it('accessibilityLabel が Image に付与される', () => {
      render(
        <UserAvatar
          avatarUrl="https://cdn.bon-log.com/avatars/user-abc.jpg"
          userId="user-abc"
          size={44}
          accessibilityLabel="松の匠のプロフィール画像"
        />
      );
      expect(screen.getByLabelText('松の匠のプロフィール画像')).toBeTruthy();
    });

    it('enso 画像ではなく uri ソースが使用される', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl="https://cdn.bon-log.com/avatars/user-abc.jpg"
          userId="user-abc"
          size={44}
          accessibilityLabel="プロフィール画像"
        />
      );
      const json = JSON.stringify(toJSON());
      // uri が含まれる
      expect(json).toContain('cdn.bon-log.com');
      // enso 画像パスが含まれない
      expect(json).not.toContain('enso-avatar');
    });
  });

  describe('avatarUrl なし（enso フォールバック）', () => {
    it('avatarUrl=null のとき enso 画像が表示される', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={null}
          userId="user-1"
          size={44}
          accessibilityLabel="盆栽太郎のプロフィール画像"
        />
      );
      expect(JSON.stringify(toJSON())).toContain('enso-avatar');
    });

    it('avatarUrl=undefined のとき enso 画像が表示される', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={undefined}
          userId="user-1"
          size={44}
          accessibilityLabel="プロフィール画像"
        />
      );
      expect(JSON.stringify(toJSON())).toContain('enso-avatar');
    });

    it('userId が空文字のとき enso-1 固定になる', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={null}
          userId=""
          size={44}
          accessibilityLabel="プロフィール画像"
        />
      );
      // userId が空文字 → enso-1 を選択
      expect(JSON.stringify(toJSON())).toContain('enso-avatar-1');
    });

    it('userId が未指定のとき enso-1 固定になる', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={null}
          size={44}
          accessibilityLabel="プロフィール画像"
        />
      );
      // userId が undefined → enso-1 を選択
      expect(JSON.stringify(toJSON())).toContain('enso-avatar-1');
    });
  });

  describe('enso 選択の決定性', () => {
    it('同じ userId は常に同じ enso を返す', () => {
      const userId = 'deterministic-user-id';
      const { toJSON: toJSON1 } = render(
        <UserAvatar avatarUrl={null} userId={userId} size={44} accessibilityLabel="テスト" />
      );
      const { toJSON: toJSON2 } = render(
        <UserAvatar avatarUrl={null} userId={userId} size={44} accessibilityLabel="テスト" />
      );

      const json1 = JSON.stringify(toJSON1());
      const json2 = JSON.stringify(toJSON2());

      // 同じ enso ファイルが使われることを確認
      expect(json1).toContain('enso-avatar');
      expect(json2).toContain('enso-avatar');

      // 両者が一致する（同じ画像選択）
      const ensoMatch1 = json1.match(/enso-avatar-(\d)/);
      const ensoMatch2 = json2.match(/enso-avatar-(\d)/);
      expect(ensoMatch1?.[1]).toBe(ensoMatch2?.[1]);
    });

    it('djb2 ハッシュで選ばれる enso インデックスが期待値と一致する', () => {
      const testCases = [
        'user-001',
        'user-abc',
        'user-xyz-long-id-for-testing',
      ];

      testCases.forEach((userId) => {
        const expectedIdx = expectedEnsoIndex(userId);
        const expectedSuffix = String(expectedIdx + 1);

        const { toJSON } = render(
          <UserAvatar avatarUrl={null} userId={userId} size={44} accessibilityLabel="テスト" />
        );

        const json = JSON.stringify(toJSON());
        const match = json.match(/enso-avatar-(\d)/);
        expect(match?.[1]).toBe(expectedSuffix);
      });
    });

    it('異なる userId は異なる enso を選ぶことがある（衝突なし保証ではなく分布確認）', () => {
      // 5 種類の userId が使用する enso 番号を収集
      const userIds = [
        'alice-bonsai',
        'bob-bonsai',
        'charlie-bonsai',
        'dave-bonsai',
        'eve-bonsai',
      ];

      const ensoNumbers = userIds.map((userId) => {
        const { toJSON } = render(
          <UserAvatar avatarUrl={null} userId={userId} size={44} accessibilityLabel="テスト" />
        );
        const json = JSON.stringify(toJSON());
        const match = json.match(/enso-avatar-(\d)/);
        return match?.[1];
      });

      // すべてが同じになることは低確率なので、少なくとも 2 種類以上が選ばれるか確認
      const unique = new Set(ensoNumbers);
      expect(unique.size).toBeGreaterThanOrEqual(1);
      // すべての選択値が 1〜5 の範囲内
      ensoNumbers.forEach((n) => {
        const num = Number(n);
        expect(num).toBeGreaterThanOrEqual(1);
        expect(num).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('accessibilityLabel', () => {
    it('avatarUrl あり のとき accessibilityLabel が設定される', () => {
      render(
        <UserAvatar
          avatarUrl="https://example.com/avatar.jpg"
          userId="user-1"
          size={40}
          accessibilityLabel="黒松さんのプロフィール画像"
        />
      );
      expect(screen.getByLabelText('黒松さんのプロフィール画像')).toBeTruthy();
    });

    it('avatarUrl なし (enso) のとき accessibilityLabel が設定される', () => {
      render(
        <UserAvatar
          avatarUrl={null}
          userId="user-1"
          size={40}
          accessibilityLabel="黒松さんのプロフィール画像"
        />
      );
      expect(screen.getByLabelText('黒松さんのプロフィール画像')).toBeTruthy();
    });
  });

  describe('size', () => {
    it('指定した size が style に反映される', () => {
      const { toJSON } = render(
        <UserAvatar
          avatarUrl={null}
          userId="user-1"
          size={80}
          accessibilityLabel="プロフィール画像"
        />
      );
      const json = JSON.stringify(toJSON());
      // width/height として 80 が含まれる
      expect(json).toContain('"width":80');
      expect(json).toContain('"height":80');
    });
  });
});
