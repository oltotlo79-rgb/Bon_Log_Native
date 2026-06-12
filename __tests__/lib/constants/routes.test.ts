/**
 * routes の動的ヘルパー関数のユニットテスト。
 * 静的定数は型チェックで担保するためここでは動的関数のみ検証する。
 */

import {
  routePostDetail,
  routePostEdit,
  routeUserDetail,
  routeSearchByQuery,
  routeSearchByGenre,
  routes,
  ROUTE_TWO_FACTOR_VERIFY,
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

  it('2FA 確認パスが正しい（ROUTE_TWO_FACTOR_VERIFY 定数と routes.twoFactorVerify が一致する）', () => {
    expect(ROUTE_TWO_FACTOR_VERIFY).toBe('/(auth)/two-factor-verify');
    expect(routes.twoFactorVerify).toBe(ROUTE_TWO_FACTOR_VERIFY);
  });
});

describe('routeSearchByQuery', () => {
  it('通常の文字列クエリで { pathname, params } オブジェクトを返す', () => {
    expect(routeSearchByQuery('松')).toEqual({
      pathname: '/(tabs)/search',
      params: { q: '松' },
    });
  });

  it('空文字でも正しい形式を返す', () => {
    expect(routeSearchByQuery('')).toEqual({
      pathname: '/(tabs)/search',
      params: { q: '' },
    });
  });

  it('スペースや特殊文字を含む文字列をそのまま params に渡す（エンコードは Expo Router に委ねる）', () => {
    const result = routeSearchByQuery('五葉松 黒松');
    expect(result.pathname).toBe('/(tabs)/search');
    expect(result.params.q).toBe('五葉松 黒松');
  });

  it('記号・英数字混在クエリを含む文字列をそのまま返す', () => {
    const result = routeSearchByQuery('bonsai & 盆栽 #1');
    expect(result.pathname).toBe('/(tabs)/search');
    expect(result.params.q).toBe('bonsai & 盆栽 #1');
  });

  it('routes.searchByQuery として呼び出せる', () => {
    expect(routes.searchByQuery('test')).toEqual({
      pathname: '/(tabs)/search',
      params: { q: 'test' },
    });
  });
});

describe('routeSearchByGenre', () => {
  it('ジャンル ID で { pathname, params } オブジェクトを返す', () => {
    expect(routeSearchByGenre('pine')).toEqual({
      pathname: '/(tabs)/search',
      params: { genre: 'pine' },
    });
  });

  it('空文字でも正しい形式を返す', () => {
    expect(routeSearchByGenre('')).toEqual({
      pathname: '/(tabs)/search',
      params: { genre: '' },
    });
  });

  it('特殊文字を含むジャンル ID をそのまま params に渡す（エンコードは Expo Router に委ねる）', () => {
    const result = routeSearchByGenre('grass-like & others');
    expect(result.pathname).toBe('/(tabs)/search');
    expect(result.params.genre).toBe('grass-like & others');
  });

  it('routes.searchByGenre として呼び出せる', () => {
    expect(routes.searchByGenre('deciduous')).toEqual({
      pathname: '/(tabs)/search',
      params: { genre: 'deciduous' },
    });
  });
});
