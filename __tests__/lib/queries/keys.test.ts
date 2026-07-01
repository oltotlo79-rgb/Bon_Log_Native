/**
 * queryKeys のキー生成・階層構造のユニットテスト。
 */

import { queryKeys } from '@/lib/queries/keys';

describe('queryKeys.posts', () => {
  it('all は固定の配列を返す', () => {
    expect(queryKeys.posts.all).toEqual(['posts']);
  });

  it('feed はフィルタなしで正しいキーを生成する', () => {
    expect(queryKeys.posts.feed()).toEqual(['posts', 'feed', {}]);
  });

  it('feed はフィルタありで正しいキーを生成する', () => {
    const filter = { genre: 'pine', sort: 'latest' };
    expect(queryKeys.posts.feed(filter)).toEqual(['posts', 'feed', filter]);
  });

  it('detail は id を含むキーを生成する', () => {
    expect(queryKeys.posts.detail('post-1')).toEqual(['posts', 'detail', 'post-1']);
  });

  it('detail は異なる id で異なるキーを生成する', () => {
    const key1 = queryKeys.posts.detail('post-1');
    const key2 = queryKeys.posts.detail('post-2');
    expect(key1).not.toEqual(key2);
  });

  it('feed と all はプレフィックス一致でグループ化できる', () => {
    const feedKey = queryKeys.posts.feed();
    expect(feedKey[0]).toBe(queryKeys.posts.all[0]);
  });
});

describe('queryKeys.comments', () => {
  it('all は固定の配列を返す', () => {
    expect(queryKeys.comments.all).toEqual(['comments']);
  });

  it('byPost は postId を含むキーを生成する', () => {
    expect(queryKeys.comments.byPost('post-42')).toEqual(['comments', 'post-42']);
  });

  it('異なる postId で異なるキーを生成する', () => {
    const key1 = queryKeys.comments.byPost('post-1');
    const key2 = queryKeys.comments.byPost('post-2');
    expect(key1).not.toEqual(key2);
  });
});

describe('queryKeys.users', () => {
  it('all は固定の配列を返す', () => {
    expect(queryKeys.users.all).toEqual(['users']);
  });

  it('detail は id を含むキーを生成する', () => {
    expect(queryKeys.users.detail('user-99')).toEqual(['users', 'detail', 'user-99']);
  });
});

describe('queryKeys.notifications', () => {
  it('all は固定の配列を返す', () => {
    expect(queryKeys.notifications.all).toEqual(['notifications']);
  });

  it('list は正しいキーを生成する', () => {
    expect(queryKeys.notifications.list()).toEqual(['notifications', 'list']);
  });
});

describe('queryKeys.search', () => {
  it('all は固定の配列を返す', () => {
    expect(queryKeys.search.all).toEqual(['search']);
  });

  it('posts は query を含むキーを生成する', () => {
    expect(queryKeys.search.posts('松')).toEqual(['search', 'posts', '松', {}]);
  });

  it('users は query を含むキーを生成する', () => {
    expect(queryKeys.search.users('盆栽太郎')).toEqual(['search', 'users', '盆栽太郎']);
  });

  it('posts と users のキーは異なる', () => {
    const postsKey = queryKeys.search.posts('keyword');
    const usersKey = queryKeys.search.users('keyword');
    expect(postsKey).not.toEqual(usersKey);
  });

  it('空文字クエリでも正しいキーを生成する', () => {
    expect(queryKeys.search.posts('')).toEqual(['search', 'posts', '', {}]);
  });
});

describe('キーの階層整合性（invalidateQueries のプレフィックス一致を担保）', () => {
  it('posts.feed は posts.all のプレフィックスで始まる', () => {
    const [root] = queryKeys.posts.all;
    const feedKey = queryKeys.posts.feed();
    expect(feedKey[0]).toBe(root);
  });

  it('posts.detail は posts.all のプレフィックスで始まる', () => {
    const [root] = queryKeys.posts.all;
    const detailKey = queryKeys.posts.detail('x');
    expect(detailKey[0]).toBe(root);
  });

  it('comments.byPost は comments.all のプレフィックスで始まる', () => {
    const [root] = queryKeys.comments.all;
    const byPostKey = queryKeys.comments.byPost('p');
    expect(byPostKey[0]).toBe(root);
  });

  it('notifications.list は notifications.all のプレフィックスで始まる', () => {
    const [root] = queryKeys.notifications.all;
    const listKey = queryKeys.notifications.list();
    expect(listKey[0]).toBe(root);
  });

  it('search.posts は search.all のプレフィックスで始まる', () => {
    const [root] = queryKeys.search.all;
    const searchPostsKey = queryKeys.search.posts('q');
    expect(searchPostsKey[0]).toBe(root);
  });
});
