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

## フィード・投稿系

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 投稿作成 | `queryKeys.posts.feed()` / 自分の `queryKeys.users.detail(userId)` | フィードと自分のプロフィールの投稿カウントが変わるため |
| 投稿更新 | `queryKeys.posts.detail(id)` / `queryKeys.posts.feed()` | 詳細とフィードの内容を同期するため |
| 投稿削除 | `queryKeys.posts.all` / 自分の `queryKeys.users.detail(userId)` | 投稿系を一括 invalidate し、プロフィールのカウントも更新するため |
| いいね・いいね取り消し | `queryKeys.posts.detail(id)` | 楽観更新後の整合のため（onSettled で invalidate） |
| コメント作成 | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)` | コメント数カウントも投稿詳細に含まれるため |
| コメント削除 | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)` | 同上 |
| フォロー・フォロー解除 | 対象の `queryKeys.users.detail(targetId)` / `queryKeys.posts.feed()` | フォロワー数とフィード内容が変わるため |
| プロフィール更新 | 自分の `queryKeys.users.detail(userId)` | 表示名・アバターを即時反映するため |
| 通知既読 | `queryKeys.notifications.list()` | 未読バッジカウントを更新するため |
