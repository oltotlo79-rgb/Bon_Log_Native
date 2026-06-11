/**
 * routes の動的ヘルパー関数のユニットテスト。
 * 静的定数は型チェックで担保するためここでは動的関数のみ検証する。
 */

import {
  routePostDetail,
  routePostEdit,
  routeUserDetail,
  routes,
} from '@/lib/constants/routes';

describe('routePostDetail', () => {
  it('投稿IDからパスを生成する', () => {
    expect(routePostDetail('abc123')).toBe('/posts/abc123');
  });

  it('routes.postDetail として呼び出せる', () => {
    expect(routes.postDetail('xyz')).toBe('/posts/xyz');
  });
});

describe('routePostEdit', () => {
  it('投稿IDから編集パスを生成する', () => {
    expect(routePostEdit('abc123')).toBe('/posts/abc123/edit');
  });

  it('routes.postEdit として呼び出せる', () => {
    expect(routes.postEdit('xyz')).toBe('/posts/xyz/edit');
  });
});

describe('routeUserDetail', () => {
  it('ユーザーIDからパスを生成する', () => {
    expect(routeUserDetail('user99')).toBe('/users/user99');
  });

  it('routes.userDetail として呼び出せる', () => {
    expect(routes.userDetail('user99')).toBe('/users/user99');
  });
});

describe('routes オブジェクト（静的パス）', () => {
  it('ログインパスが正しい', () => {
    expect(routes.login).toBe('/(auth)/login');
  });

  it('フィードパスが正しい', () => {
    expect(routes.feed).toBe('/(tabs)/feed');
  });

  it('設定パスが正しい', () => {
    expect(routes.settings).toBe('/settings');
  });
});
