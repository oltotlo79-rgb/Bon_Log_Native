# ミューテーション → invalidation 対応表

ミューテーション追加・変更時は必ずこのファイルを更新する（data-fetching.md 規約）。

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
