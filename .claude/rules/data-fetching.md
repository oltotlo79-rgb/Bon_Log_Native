---
globs: "lib/queries/**/*.ts, hooks/**/*.ts"
---

# データフェッチング・キャッシュルール (TanStack Query)

## 原則

- サーバー状態は **TanStack Query が唯一の保持者**。useState / Context へコピーしない（フォームの初期値展開のみ例外）
- クライアント状態（入力中テキスト・UI の開閉等）は useState / Context
- Web の `revalidatePath` / `revalidateTag` は**モバイルに効かない**。キャッシュ更新は `invalidateQueries` で自前管理する（計画書 リスク#2）

## クエリキー

- `lib/queries/keys.ts` に**全キーを集約**（インライン配列キーの直書き禁止）
- 階層設計でプレフィックス無効化を可能にする:

```typescript
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    feed: (filter: FeedFilter) => ['posts', 'feed', filter] as const,
    detail: (id: string) => ['posts', 'detail', id] as const,
  },
  comments: {
    byPost: (postId: string) => ['comments', postId] as const,
  },
  // ...
} as const
```

## ミューテーション → invalidation 対応表

- すべてのミューテーションフックは**どのクエリキーを無効化するかを宣言**する
- 対応表を `lib/queries/invalidation-map.md` に維持し、ミューテーション追加・変更時に必ず更新する（計画書 Phase 3 で整備する成果物）

| ミューテーション例 | 無効化するキー |
|------------------|--------------|
| 投稿作成 | `posts.feed`, 自分の `users.detail` |
| いいね | `posts.detail(id)`（楽観更新 + 整合用 invalidate） |
| フォロー | 対象 `users.detail`, `posts.feed` |

（上記は形式の例。実際の対応表は実装時に整備する）

## 無限スクロール（カーソルベース）

```typescript
useInfiniteQuery({
  queryKey: queryKeys.posts.feed(filter),
  queryFn: ({ pageParam }) => api.getFeed({ cursor: pageParam, limit: FEED_PAGE_SIZE }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
})
```

- ページサイズは `lib/constants/limits/` の定数
- offset は使わない（サーバー API もカーソルのみ提供）

## 楽観更新

- 対象は「結果が自明で失敗が稀」な高頻度・軽量操作（いいね・フォロー等）に限る
- パターン: `onMutate`（cancelQueries → snapshot → 楽観反映）→ `onError`（ロールバック）→ `onSettled`（invalidate）
- 投稿作成などの重い操作は楽観更新せず、送信中 UI + 成功後 invalidate

## RN 固有のセットアップ

- `focusManager` を `AppState` に接続（フォアグラウンド復帰で refetch）
- `onlineManager` を NetInfo に接続（オフライン検知・復帰時 refetch）
- pull-to-refresh は対象クエリの `refetch` を呼ぶ（新規クエリを生やさない）

## staleTime / gcTime

- 既定値は `lib/constants/` で定数化し、QueryClient 生成時に設定
- データ特性で上書きする: フィード・通知は短め、マスタ系（ジャンル一覧等）は長め
- 無期限 stale にしない（通知タップやフォアグラウンド復帰時の鮮度に影響する）
