# ミューテーション → invalidation 対応表

ミューテーション追加・変更時は必ずこのファイルを更新する（data-fetching.md 規約）。

## 認証系（lib/queries/auth.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| ログイン成功（requires2FA: false） | なし（lib/auth が queryClient.clear() を呼ばない。新セッションは全クエリ初期状態のため invalidate 不要） | — |
| ログイン成功（2FA 経由: verifyTwoFactor） | なし（上記と同様） | — |
| ログアウト（signOut） | なし（lib/auth が `queryClient.clear()` を呼ぶ。全キャッシュを一括消去） | 前ユーザーのデータ残留防止のため全消去を選択 |
| onAuthFailure（リフレッシュ失敗・再利用検知） | なし（lib/auth が `queryClient.clear()` を呼ぶ） | — |
| パスワードリセット要求 | なし（状態変更なし） | — |
| パスワードリセット確定 | なし（ログインし直すため、その後のログインで解決） | — |
| Google サインイン | なし（ログイン成功と同等） | — |
| 新規登録（register） | なし（201 = メール確認待ち。ログインしないため状態変更なし） | 成功後は verify-email-sent 画面へ遷移するのみ |

## フィード・投稿系

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 投稿作成 | `queryKeys.posts.feed()` / 自分の `queryKeys.users.detail(userId)` | フィードと自分のプロフィールの投稿カウントが変わるため |
| 投稿更新 | `queryKeys.posts.detail(id)` / `queryKeys.posts.feed()` | 詳細とフィードの内容を同期するため |
| 投稿削除 | `queryKeys.posts.all` / 自分の `queryKeys.users.detail(userId)` | 投稿系を一括 invalidate し、プロフィールのカウントも更新するため |
| いいね・いいね取り消し（`useToggleLikeMutation`） | `queryKeys.posts.detail(id)` のみ（onSettled で invalidate） | フィード・検索は楽観更新 + onSuccess で setQueryData による確定反映を優先。フィード再取得は重いため invalidate しない |
| コメント作成 | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)` | コメント数カウントも投稿詳細に含まれるため |
| コメント削除 | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)` | 同上 |
| フォロー・フォロー解除（`useToggleFollowMutation`） | 対象の `queryKeys.users.detail(targetId)` / `queryKeys.posts.feed()`（onSettled で invalidate） | followersCount の楽観更新 + onSuccess で setQueryData（followersCount 確定値 + followState）。onSettled で profile と feed を invalidate |
| プロフィール更新 | 自分の `queryKeys.users.detail(userId)` | 表示名・アバターを即時反映するため |
| 通知既読（`useMarkNotificationsReadMutation`） | invalidate なし（setQueryData のみ） | onSuccess で通知一覧の isRead と unreadCount を setQueryData で即時反映。サーバーとの整合はリスト再フェッチ（pull-to-refresh・フォアグラウンド復帰）に委ねる |

## Batch 2b 追加キー・専用管理

| クエリキー | 管理方法 | 説明 |
|-----------|---------|------|
| `queryKeys.users.followState(userId)` | ミューテーション結果のみ（フェッチなし / staleTime: Infinity） | UserProfileResponse に following/requested が存在しないため専用キーで管理。useToggleFollowMutation の onSuccess でのみ更新される。frontend は useFollowStateQuery でフォローボタンの状態を取得すること |

## 読み取り系クエリの参照（lib/queries/ 各フック）

無効化が必要な場面のために対応表を記録する。

| クエリキー | フック | 無効化タイミング |
|-----------|--------|----------------|
| `queryKeys.posts.feed()` | `useFeedQuery` | 投稿作成・削除・フォロー変更時 |
| `queryKeys.posts.detail(id)` | `usePostQuery` | 投稿更新・削除・いいね後の整合時 |
| `queryKeys.comments.byPost(postId)` | `useCommentsQuery` | コメント作成・削除時 |
| `queryKeys.users.detail(id)` | `useUserProfileQuery` | フォロー変更・プロフィール更新時 |
| `queryKeys.search.posts(q)` | `useSearchPostsQuery` | 投稿削除・大幅更新時（検索キャッシュは低優先） |
| `queryKeys.search.users(q)` | `useSearchUsersQuery` | ユーザー名変更・削除時（低優先） |
| `queryKeys.notifications.list()` | `useNotificationsQuery` | 通知既読操作時（Batch 2b） |
| `queryKeys.notifications.unreadCount` | `useUnreadCountQuery` | 通知既読操作・新規通知受信時（Batch 2b） |
