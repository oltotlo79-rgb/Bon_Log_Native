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
| 確認メール再送（`useResendVerificationMutation`） | なし（状態変更なし。常に 200 = キャッシュ無効化不要） | 429 のみ ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED として throw する |

## フィード・投稿系

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 投稿作成（`useCreatePostMutation`） | `queryKeys.posts.feed()` / 自分の `queryKeys.users.detail(currentUserId)`（onSettled） | フィードと自分のプロフィールの投稿カウントが変わるため。楽観更新なし |
| 投稿更新（`useUpdatePostMutation`） | `queryKeys.posts.detail(id)` / `queryKeys.posts.feed()`（onSettled） | 詳細とフィードの内容を同期するため。楽観更新なし |
| 投稿削除（`useDeletePostMutation`） | `queryKeys.posts.all` / 自分の `queryKeys.users.detail(currentUserId)`（onSettled） | 投稿系を一括 invalidate し、プロフィールのカウントも更新するため |
| いいね・いいね取り消し（`useToggleLikeMutation`） | `queryKeys.posts.detail(id)` のみ（onSettled で invalidate） | フィード・検索は楽観更新 + onSuccess で setQueryData による確定反映を優先。フィード再取得は重いため invalidate しない |
| リポスト・リポスト解除（`useToggleRepostMutation`） | `queryKeys.posts.detail(postId)` のみ（onSettled で invalidate） | フィード・詳細の isReposted / repostCount は onMutate で楽観更新、onError でロールバック。フィード再取得は重いため invalidate しない |
| 引用投稿作成（`useQuotePostMutation`） | `queryKeys.posts.feed()` / 自分の `queryKeys.users.posts(currentUserId)`（onSettled） | 楽観更新なし。自分の投稿一覧（ユーザー投稿タブ）に新規引用投稿が追加されるため users.posts も invalidate |
| アンケート投票（`useVotePollMutation`） | `queryKeys.posts.detail(postId)`（postId あり時・onSettled）/ `queryKeys.posts.all`（postId なし時・onSettled） | 楽観更新なし（二重投票・期限切れ・不正 optionId の拒否があるため）。投票後の最新集計は投稿詳細のリフェッチで反映する |
| コメント作成（`useCreateCommentMutation`） | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)`（onSettled） | コメント数カウントも投稿詳細に含まれるため。楽観更新なし |
| コメント削除（`useDeleteCommentMutation`） | `queryKeys.comments.byPost(postId)` / `queryKeys.posts.detail(postId)`（onSettled） | 同上 |
| フォロー・フォロー解除（`useToggleFollowMutation`） | 対象の `queryKeys.users.detail(targetId)` / `queryKeys.posts.feed()`（onSettled で invalidate） | onMutate で users.detail の following/requested/followersCount と search.users キャッシュ内の該当 item を楽観更新。onSuccess で FollowResponse 確定値（following/requested/followerCount）を users.detail と search.users item に書き込む。onSettled で users.detail と posts.feed を invalidate |
| フォローリクエスト承認（`useApproveFollowRequestMutation`） | `queryKeys.users.detail(requesterId)` / `queryKeys.notifications.unreadCount` / `queryKeys.notifications.list()`（onSuccess で invalidate） | onSuccess で followRequests.list() のキャッシュから該当 id を setQueryData で除去（承認後は pending 一覧に出ないため）。承認でフォロー関係が成立するため users.detail と notifications も invalidate |
| フォローリクエスト拒否（`useRejectFollowRequestMutation`） | なし（setQueryData のみ） | onSuccess で followRequests.list() のキャッシュから該当 id を setQueryData で除去。拒否は通知なし・フォロー関係変化なしのため invalidate 不要 |
| プロフィール更新（`useUpdateProfileMutation`） | `queryKeys.users.me` / `queryKeys.users.meProfile` / 自分の `queryKeys.users.detail(currentUserId)`（onSuccess で setQueryData + invalidate） | onSuccess で users.me（基本情報）・users.meProfile（全フィールド）・users.detail（プロフィール全体）を setQueryData で即時反映し、その後 invalidate で整合させる |
| アカウント削除（`useDeleteAccountMutation`） | なし（onSettled で `signOut(queryClient)` を呼び、`queryClient.clear()` が全キャッシュを消去） | fail-safe: サーバー削除成功・失敗いずれの場合も signOut を実行してローカル撤収する |
| 通知既読（`useMarkNotificationsReadMutation`） | invalidate なし（setQueryData のみ） | onSuccess で通知一覧の isRead と unreadCount を setQueryData で即時反映。サーバーとの整合はリスト再フェッチ（pull-to-refresh・フォアグラウンド復帰）に委ねる |
| 通知設定更新（`useUpdateNotificationSettingsMutation`） | `queryKeys.notifications.settings`（onSuccess で invalidate） | 部分更新（PATCH）のため整合性を保つため invalidate を選択。楽観更新は行わない（設定ミスのロールバック処理が複雑になるため） |
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

## ブックマーク系（lib/queries/bookmarks.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| ブックマーク追加・解除（`useToggleBookmarkMutation`） | `queryKeys.posts.detail(postId)` / `queryKeys.bookmarks.list()`（onSettled） | onMutate でフィード・詳細・ブックマーク一覧・検索を楽観更新（isBookmarked 反転）。ブックマーク解除時はブックマーク一覧から除去。onSettled で詳細と一覧を invalidate |

## マイ盆栽系（lib/queries/bonsai.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 盆栽作成（`useCreateBonsaiMutation`） | `queryKeys.bonsai.list()`（onSettled） | 楽観更新なし |
| 盆栽更新（`useUpdateBonsaiMutation`） | `queryKeys.bonsai.detail(id)` / `queryKeys.bonsai.list()`（onSettled） | 楽観更新なし |
| 盆栽削除（`useDeleteBonsaiMutation`） | `queryKeys.bonsai.list()`（onSettled） | 楽観更新なし |
| 成長記録追加（`useCreateBonsaiRecordMutation`） | `queryKeys.bonsai.records(bonsaiId)` / `queryKeys.bonsai.detail(bonsaiId)` / `queryKeys.bonsai.list()`（onSettled） | latestRecord が更新されるため list も invalidate |
| 成長記録更新（`useUpdateBonsaiRecordMutation`） | `queryKeys.bonsai.records(bonsaiId)` / `queryKeys.bonsai.detail(bonsaiId)`（onSettled） | 楽観更新なし |
| 成長記録削除（`useDeleteBonsaiRecordMutation`） | `queryKeys.bonsai.records(bonsaiId)` / `queryKeys.bonsai.detail(bonsaiId)`（onSettled） | recordCount が変わるため detail も invalidate |

## イベント系（lib/queries/events.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| イベント作成（`useCreateEventMutation`） | `queryKeys.events.all`（onSettled） | 全フィルタのリストを一括 invalidate |
| イベント更新（`useUpdateEventMutation`） | `queryKeys.events.detail(id)` / `queryKeys.events.all`（onSettled） | 楽観更新なし。403 作成者でない / 404 はそのまま伝播 |
| イベント削除（`useDeleteEventMutation`） | `queryKeys.events.all`（onSettled） | 204 No Content。楽観更新なし |

## 盆栽園マップ系（lib/queries/shops.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 盆栽園登録（`useCreateShopMutation`） | `queryKeys.shops.all`（onSettled） | 409 CONFLICT（同一住所重複）はそのまま伝播 |
| 盆栽園更新（`useUpdateShopMutation`） | `queryKeys.shops.detail(id)` / `queryKeys.shops.all`（onSettled） | 楽観更新なし。403 権限なし / 404 はそのまま伝播 |
| レビュー投稿（`useCreateReviewMutation`） | `queryKeys.shops.reviews(shopId)` / `queryKeys.shops.detail(shopId)`（onSettled） | averageRating / reviewCount が変わるため detail も invalidate。409 CONFLICT（二重投稿）はそのまま伝播 |

## 予約投稿系（lib/queries/scheduled-posts.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 予約投稿作成（`useCreateScheduledPostMutation`） | `queryKeys.scheduledPosts.list()`（onSettled） | 400 pending 上限超過 / 403 PREMIUM_REQUIRED はそのまま伝播。retry: false |
| 予約投稿更新（`useUpdateScheduledPostMutation`） | `queryKeys.scheduledPosts.detail(id)` / `queryKeys.scheduledPosts.list()`（onSettled） | 400 pending 以外の編集 / 403 PREMIUM_REQUIRED はそのまま伝播 |
| 予約投稿削除（`useDeleteScheduledPostMutation`） | `queryKeys.scheduledPosts.list()`（onSettled） | 400 published 状態は削除不可。楽観更新なし |
| 予約投稿キャンセル（`useCancelScheduledPostMutation`） | `queryKeys.scheduledPosts.detail(id)` / `queryKeys.scheduledPosts.list()`（onSettled） | ソフトキャンセル（status→cancelled）。400 pending 以外はそのまま伝播 |

## 課金・サブスクリプション系（lib/queries/subscription.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| プレミアム購入（`usePurchasePremiumMutation`） | `queryKeys.users.me`（onSettled） | 購入結果に関わらず常に invalidate する（成功・キャンセル・エラー）。RevenueCat Webhook 経由の反映遅延があるため、invalidate 後は users.me の isFetching を UI で表示する。RevenueCat entitlement は判定の正にしない（billing.md 絶対規則 1） |
| 購入復元（`useRestorePurchasesMutation`） | `queryKeys.users.me`（onSettled） | 復元後の購読状態はサーバーの isPremium で確認する。同上 |

## 手入れログ系（lib/queries/bonsai-care-logs.ts）

| ミューテーション | 無効化するキー | 備考 |
|----------------|--------------|------|
| 手入れログ作成（`useCreateCareLogMutation`） | `queryKeys.bonsai.all`（onSettled） | 全 CareLogsParams パターンのキャッシュを一括 invalidate |
| 手入れログ更新（`useUpdateCareLogMutation`） | `queryKeys.bonsai.all`（onSettled） | 同上 |
| 手入れログ削除（`useDeleteCareLogMutation`） | `queryKeys.bonsai.all`（onSettled） | 同上 |

## 読み取り系クエリの参照（lib/queries/ 各フック）

無効化が必要な場面のために対応表を記録する。

| クエリキー | フック | 無効化タイミング |
|-----------|--------|----------------|
| `queryKeys.posts.feed()` | `useFeedQuery` | 投稿作成・削除・フォロー変更・ブロック・ミュート・引用投稿作成時 |
| `queryKeys.posts.detail(id)` | `usePostQuery` | 投稿更新・削除・いいね後の整合・リポスト後の整合・アンケート投票後 |
| `queryKeys.users.posts(userId)` | `useUserPostsQuery` | 引用投稿作成後（自分の投稿一覧タブに表示されるため） |
| `queryKeys.comments.byPost(postId)` | `useCommentsQuery` | コメント作成・削除時 |
| `queryKeys.users.meProfile` | `useCurrentUserProfileQuery` | プロフィール更新成功時（useUpdateProfileMutation の onSuccess で setQueryData + invalidate） |
| `queryKeys.users.detail(id)` | `useUserProfileQuery` | フォロー変更・プロフィール更新・ブロック・ミュート時 |
| `queryKeys.users.blocks` | `useBlockedUsersQuery` | ブロック・ブロック解除時 |
| `queryKeys.users.mutes` | `useMutedUsersQuery` | ミュート・ミュート解除時 |
| `queryKeys.search.posts(q)` | `useSearchPostsQuery` | 投稿削除・大幅更新時（検索キャッシュは低優先） |
| `queryKeys.search.users(q)` | `useSearchUsersQuery` | ユーザー名変更・削除・ブロック時（低優先） |
| `queryKeys.notifications.list()` | `useNotificationsQuery` | 通知既読操作時（Batch 2b）・ブロック・ミュート時・フォローリクエスト承認時 |
| `queryKeys.notifications.unreadCount` | `useUnreadCountQuery` | 通知既読操作・新規通知受信時（Batch 2b）・フォローリクエスト承認時 |
| `queryKeys.notifications.settings` | `useNotificationSettingsQuery` | 通知設定更新時 |
| `queryKeys.followRequests.list()` | `useFollowRequestsQuery` | フォローリクエスト承認・拒否時（setQueryData で即時除去） |
| `queryKeys.explore.trendingHashtags` | `useTrendingHashtagsQuery` | 将来のハッシュタグ作成系ミューテーション時（現在は読み取り専用） |
| `queryKeys.explore.trendingGenres` | `useTrendingGenresQuery` | 同上 |
| `queryKeys.explore.recommendedUsers` | `useRecommendedUsersQuery` | フォロー変更時（現在は `queryKeys.posts.feed()` 経由で間接的に更新） |
| `queryKeys.explore.posts(params)` | `useExplorePostsQuery` | 投稿作成・削除・ブロック・ミュート時（高頻度更新のため自動で stale になる） |
| `queryKeys.dictionary.list(params)` | `useDictionaryListQuery` | マスタ系（変更なし想定） |
| `queryKeys.dictionary.detail(slug)` | `useDictionaryDetailQuery` | マスタ系（変更なし想定） |
| `queryKeys.fertilizers.*` | `useFertilizer*Query` 各種 | マスタ系（変更なし想定） |
| `queryKeys.hormones.*` | `useHormone*Query` 各種 | マスタ系（変更なし想定） |
| `queryKeys.pesticides.*` | `usePesticide*Query` 各種 | マスタ系（変更なし想定） |
| `queryKeys.legal.list` / `queryKeys.legal.document(slug)` | `useLegalListQuery` / `useLegalDocumentQuery` | マスタ系（変更なし想定） |
| `queryKeys.analytics.summary(days)` | `useAnalyticsSummaryQuery` | 投稿・フォロワー変動後に invalidate すると最新値に追従できる（任意） |
| `queryKeys.bookmarks.list()` | `useBookmarksQuery` | ブックマーク追加・解除時 |
| `queryKeys.bonsai.list()` | `useBonsaiListQuery` | 盆栽作成・削除・成長記録追加時 |
| `queryKeys.bonsai.detail(id)` | `useBonsaiDetailQuery` | 盆栽更新・成長記録追加・更新・削除時 |
| `queryKeys.bonsai.records(bonsaiId)` | `useBonsaiRecordsQuery` | 成長記録追加・更新・削除時 |
| `queryKeys.bonsai.careLogs(params)` | `useCareLogsQuery` | 手入れログ作成・更新・削除時（bonsai.all で一括 invalidate） |
| `queryKeys.events.list(filter)` | `useEventsListQuery` | イベント作成・更新・削除時（all で一括 invalidate）|
| `queryKeys.events.detail(id)` | `useEventDetailQuery` | イベント更新時 |
| `queryKeys.shops.list(params)` | `useShopsListQuery` | 盆栽園登録・更新時（all で一括 invalidate）|
| `queryKeys.shops.detail(id)` | `useShopDetailQuery` | 盆栽園更新・レビュー投稿時 |
| `queryKeys.shops.reviews(shopId)` | `useShopReviewsQuery` | レビュー投稿時 |
| `queryKeys.genres.list(type)` | `useGenresQuery` | マスタ系（変更なし想定） |
| `queryKeys.scheduledPosts.list()` | `useScheduledPostsQuery` | 予約投稿作成・更新・削除・キャンセル時 |
| `queryKeys.scheduledPosts.detail(id)` | `useScheduledPostDetailQuery` | 予約投稿更新・キャンセル時 |
