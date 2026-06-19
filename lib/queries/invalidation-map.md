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
| 投稿作成（`useCreatePostMutation`） | `queryKeys.posts.feed()` / 自分の `queryKeys.users.detail(currentUserId)`（onSettled） | フィードと自分のプロフィールの投稿カウントが変わるため。楽観更新なし |
| 投稿更新（`useUpdatePostMutation`） | `queryKeys.posts.detail(id)` / `queryKeys.posts.feed()`（onSettled） | 詳細とフィードの内容を同期するため。楽観更新なし |
| 投稿削除（`useDeletePostMutation`） | `queryKeys.posts.all` / 自分の `queryKeys.users.detail(currentUserId)`（onSettled） | 投稿系を一括 invalidate し、プロフィールのカウントも更新するため |
| いいね・いいね取り消し（`useToggleLikeMutation`） | `queryKeys.posts.detail(id)` のみ（onSettled で invalidate） | フィード・検索は楽観更新 + onSuccess で setQueryData による確定反映を優先。フィード再取得は重いため invalidate しない |
| コメント作成（`useCreateCommentMutation`） | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)`（onSettled） | コメント数カウントも投稿詳細に含まれるため。楽観更新なし |
| コメント削除（`useDeleteCommentMutation`） | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)`（onSettled） | 同上 |
| フォロー・フォロー解除（`useToggleFollowMutation`） | 対象の `queryKeys.users.detail(targetId)` / `queryKeys.posts.feed()`（onSettled で invalidate） | onMutate で users.detail の following/requested/followersCount と search.users キャッシュ内の該当 item を楽観更新。onSuccess で FollowResponse 確定値（following/requested/followerCount）を users.detail と search.users item に書き込む。onSettled で users.detail と posts.feed を invalidate |
| プロフィール更新（`useUpdateProfileMutation`） | `queryKeys.users.me` / `queryKeys.users.meProfile` / 自分の `queryKeys.users.detail(currentUserId)`（onSuccess で setQueryData + invalidate） | onSuccess で users.me（基本情報）・users.meProfile（全フィールド）・users.detail（プロフィール全体）を setQueryData で即時反映し、その後 invalidate で整合させる |
| アカウント削除（`useDeleteAccountMutation`） | なし（onSettled で `signOut(queryClient)` を呼び、`queryClient.clear()` が全キャッシュを消去） | fail-safe: サーバー削除成功・失敗いずれの場合も signOut を実行してローカル撤収する |
| 通知既読（`useMarkNotificationsReadMutation`） | invalidate なし（setQueryData のみ） | onSuccess で通知一覧の isRead と unreadCount を setQueryData で即時反映。サーバーとの整合はリスト再フェッチ（pull-to-refresh・フォアグラウンド復帰）に委ねる |
| 画像アップロード（`useUploadImageMutation` / `uploadImage`） | なし（アップロードはキャッシュを持たない。投稿/プロフィール更新ミューテーションに URL を渡す） | — |
| 動画アップロード（`useUploadVideoMutation` / `uploadVideo`） | なし（同上） | — |

## モデレーション系（lib/queries/moderation.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| ブロック（`useBlockUserMutation`） | `queryKeys.users.detail(userId)` / `queryKeys.posts.feed()` / `queryKeys.search.all` / `queryKeys.notifications.all` / `queryKeys.users.blocks`（onSettled）| onSuccess で users.detail の isBlocked=true / following=false / requested=false を setQueryData で即時反映。ブロック時に双方向フォロー解除されるため following/requested も楽観反映 |
| ブロック解除（`useUnblockUserMutation`） | `queryKeys.users.blocks` / `queryKeys.posts.feed()` / `queryKeys.search.all`（onSettled） | onSuccess で users.detail の isBlocked=false を setQueryData で即時反映 |
| ミュート（`useMuteUserMutation`） | `queryKeys.posts.feed()` / `queryKeys.notifications.all` / `queryKeys.search.all` / `queryKeys.users.mutes`（onSettled） | onSuccess で users.detail の isMuted=true を setQueryData で即時反映 |
| ミュート解除（`useUnmuteUserMutation`） | `queryKeys.users.mutes` / `queryKeys.posts.feed()` / `queryKeys.notifications.all`（onSettled） | onSuccess で users.detail の isMuted=false を setQueryData で即時反映 |
| 通報（`useReportMutation`） | なし（キャッシュ変更なし） | サーバー側でモデレーション処理される。成功トーストのみ表示 |

## 読み取り系クエリの参照（lib/queries/ 各フック）

無効化が必要な場面のために対応表を記録する。

| クエリキー | フック | 無効化タイミング |
|-----------|--------|----------------|
| `queryKeys.posts.feed()` | `useFeedQuery` | 投稿作成・削除・フォロー変更・ブロック・ミュート時 |
| `queryKeys.posts.detail(id)` | `usePostQuery` | 投稿更新・削除・いいね後の整合時 |
| `queryKeys.comments.byPost(postId)` | `useCommentsQuery` | コメント作成・削除時 |
| `queryKeys.users.meProfile` | `useCurrentUserProfileQuery` | プロフィール更新成功時（useUpdateProfileMutation の onSuccess で setQueryData + invalidate） |
| `queryKeys.users.detail(id)` | `useUserProfileQuery` | フォロー変更・プロフィール更新・ブロック・ミュート時 |
| `queryKeys.users.blocks` | `useBlockedUsersQuery` | ブロック・ブロック解除時 |
| `queryKeys.users.mutes` | `useMutedUsersQuery` | ミュート・ミュート解除時 |
| `queryKeys.search.posts(q)` | `useSearchPostsQuery` | 投稿削除・大幅更新時（検索キャッシュは低優先） |
| `queryKeys.search.users(q)` | `useSearchUsersQuery` | ユーザー名変更・削除・ブロック時（低優先） |
| `queryKeys.notifications.list()` | `useNotificationsQuery` | 通知既読操作時（Batch 2b）・ブロック・ミュート時 |
| `queryKeys.notifications.unreadCount` | `useUnreadCountQuery` | 通知既読操作・新規通知受信時（Batch 2b） |
