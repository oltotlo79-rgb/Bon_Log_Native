# 通知一覧画面仕様 — Bon_Log Native

作成日: 2026-06-13
更新日: 2026-06-14（Batch 2b リリースに伴い §8 の既読化方針を確定。API エンドポイント名を修正）
追記（2026-07-13・エラー色トークンの是正）: §6.1 type別対応表（`like`・`comment_like`）・§7.1 未読バッジ背景・§13 使用デザイントークンの `colorError` 記載値を `#c0392b` から `#c21721` へ修正した。旧値は `design-tokens.md` の旧誤記に起因するもので、実装 `lib/constants/design-tokens.ts` の実際の値は `#c21721`。根拠は `design-tokens.md` §11 を参照。
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `post-card.md` に準拠
Web 出典: `Bon_Log_cfw/components/notification/NotificationItem.tsx` / `NotificationList.tsx` / `NotificationBadge.tsx` / `types/notification.ts`
API: `GET /api/v1/notifications`（カーソルベース）/ `GET /api/v1/notifications/unread-count`
既読化 API: `PATCH /api/v1/notifications/read`（Batch 2b で実装済み。本仕様 §8 で確定）

---

## 1. 概要・目的

いいね・コメント・フォロー・メンション等のインタラクション通知をまとめて確認できる画面。
ユーザーが自分に向けた反応を見逃さずに済み、続けて盆栽の記録を投稿・交流するきっかけを作る。

---

## 2. 画面構成

### 2.1 ナビゲーションヘッダー

```
┌──────────────────────────────────────┐
│  [戻る不要（タブ画面）]               │
│  中央: 「通知」                       │
│  右: [✓✓ すべて既読にする] ← 未読があるときのみ表示  │
└──────────────────────────────────────┘
```

- 「すべて既読にする」は `CheckCheck` 系アイコン + テキスト（`textSm` / `colorTextLink`）
- タップターゲット: 最小 44pt（`hitSlop` で補完）
- **未読がゼロのときはボタンを非表示にする**（Web の `hasUnread` 判定に準拠）

### 2.2 通知リスト

```
┌──────────────────────────────────────────────────┐
│ [未読ドット(8pt)]                                 │  ← 未読時のみ左端に表示
│                                                  │
│  [アバター 44pt]  [本文テキスト]                  │
│  +アイコンバッジ  [コンテンツプレビュー（任意）] │
│  (右下重ね)       [日時]                         │
│                                                  │
└──────────────────────────────────────────────────┘
```

- 各セルの高さ: 最小 72pt（コンテンツプレビューがある場合は可変）
- セル間セパレータ: 1pt / `colorBorderLight`
- 未読セル背景: `colorSurface`（`#fcfcfc`）+ 左端 3pt の `colorActionPrimary` ボーダー
- 既読セル背景: `colorBackground`（`#ffffff`）
- タップ領域: セル全体（44pt 以上確保済み）

### 2.3 ページ末尾

```
┌──────────────────────────────────────┐
│  [スピナー] 読み込み中...             │  ← 追加フェッチ中
│  または                              │
│  これ以上通知はありません             │  ← 終端到達時
└──────────────────────────────────────┘
```

---

## 3. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `(tabs)/notifications`（ボトムタブ 3 番目）|
| 遷移元 | ボトムタブバーのベルアイコン |
| 遷移先 | 通知タップ → 種別ごとの遷移先（§6 参照）|
| ディープリンク | Push 通知タップ → `bonlog://notifications` または `bonlog://posts/{id}` 等（`navigation-structure.md` §7 準拠）|
| スタック | タブ画面。戻るボタンは不要。スタック積みは通知タップ先の画面で発生 |

---

## 4. コンポーネント分割

```
NotificationsScreen           ← 画面ルート。TanStack Query フック・unread-count フック統合
├── NotificationCell          ← 1 件の通知セル（memo 化）
│   ├── NotificationAvatar    ← アバター + 種別アイコンバッジ
│   ├── NotificationBody      ← 本文テキスト + コンテンツプレビュー + 日時
│   └── UnreadDot             ← 未読インジケータドット
├── ScreenLoading             ← variant="skeleton" / skeletonCount=4（共通）
├── ScreenEmpty                ← 空状態（共通）
├── ScreenError                ← エラー状態（共通）
└── OfflineBanner              ← オフライン時（共通）
```

### NotificationCell props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `notification` | `NotificationItem` | API レスポンスの 1 件分（後述の型定義参照）|
| `onPress` | `() => void` | セルタップ時のコールバック（画面側で遷移ロジックを持つ）|

### NotificationAvatar props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `actor` | `{ id, nickname, avatarUrl } \| null` | null の場合はシステムアイコン表示 |
| `notificationType` | `NotificationType` | 種別アイコンバッジの種類決定に使用 |

---

## 5. データの流れ

### 5.1 通知一覧取得

- `GET /api/v1/notifications`（Bearer 必須・ゲスト不可 → 403）
- カーソルベース無限スクロール（`useInfiniteQuery` + `nextCursor`）
- `staleTime`: `STALE_TIME_REALTIME_MS`（Web と同値。30 秒相当。`lib/constants/` に定数化）

### 5.2 未読件数取得

- `GET /api/v1/notifications/unread-count` → `{ count: number }`
- `refetchInterval`: `REFETCH_INTERVAL_MS`（30,000ms — Web の `NotificationBadge` と同値）
- アプリがフォアグラウンドに戻ったとき `focusManager` 連携で refetch（`data-fetching.md` 準拠）

### 5.3 既読化（Batch 2b 接続済み）

**確定済み API: `PATCH /api/v1/notifications/read`**

- リクエストボディ: `{ ids?: string[] }`（省略または空配列 = 全件既読化）
- レスポンス: `{ success: true, unreadCount: number }`（`unreadCount` はミュートユーザーを除く操作後の未読数）
- `ids` の最大件数: 100 件（`MAX_NOTIFICATION_READ_IDS`）

既読化の呼び出しタイミングは §8 で確定。

### 5.4 通知アイテムの型定義

```
NotificationItem:
  id: string
  type: NotificationType     // 後述 §6 の 13 種
  isRead: boolean
  createdAt: string          // ISO 8601
  actorId: string | null
  postId: string | null
  commentId: string | null
  actor: { id, nickname, avatarUrl: string | null } | null
  post: { id, content: string } | null
  comment: { id, content: string } | null
```

`type` の取り得る値（`types/notification.ts` より抽出・全 13 種）:
`like`, `comment`, `follow`, `quote`, `reply`, `comment_like`, `follow_request`, `follow_request_approved`, `mention`, `message`, `repost`, `system`, `subscription_expiring`

---

## 6. 通知 type 別の表示仕様

Web の `NotificationItem.tsx`（`getNotificationIcon` / `getNotificationMessage` / `getNotificationLink`）を出典として、モバイル向けに規定する。

### 6.1 type 別対応表

| type | アイコン（Lucide 系）| アイコン色 | 本文テンプレート | 遷移先 |
|------|---------------------|-----------|--------------|-------|
| `like` | Heart（filled） | `colorError`（`#c21721`）| **{nickname}** さんがあなたの投稿にいいねしました | `posts/{postId}` |
| `comment_like` | Heart（filled） | `colorError`（`#c21721`）| **{nickname}** さんがあなたのコメントにいいねしました | `posts/{postId}`（commentId がある場合 `posts/{postId}#comment-{commentId}` — モバイルはアンカーなし → 投稿詳細に着地）|
| `comment` | MessageCircle | `colorTextSecondary` | **{nickname}** さんがあなたの投稿にコメントしました | `posts/{postId}` |
| `reply` | CornerUpLeft（Reply 系）| `colorTextSecondary` | **{nickname}** さんがあなたのコメントに返信しました | `posts/{postId}` |
| `follow` | UserPlus | `colorSuccess`（`#3a6b42`）| **{nickname}** さんがあなたをフォローしました | `users/{actorId}` |
| `follow_request` | UserPlus | `colorTextSecondary` | **{nickname}** さんからフォローリクエストが届きました | `settings/follow-requests`（MVP スコープ外 — core に要相談。MVP では `users/{actorId}` 代替）|
| `follow_request_approved` | UserPlus | `colorSuccess`（`#3a6b42`）| **{nickname}** さんがフォローリクエストを承認しました | `users/{actorId}` |
| `quote` | Repeat2 | `colorTextSecondary` | **{nickname}** さんがあなたの投稿を引用しました | `posts/{postId}` |
| `repost` | Repeat2 | `colorTextSecondary` | **{nickname}** さんがあなたの投稿をリポストしました | `posts/{postId}` |
| `mention` | AtSign | `colorTextSecondary` | **{nickname}** さんがあなたをメンションしました | `posts/{postId}` |
| `message` | Mail | `colorTextSecondary` | **{nickname}** さんからメッセージが届きました | MVP スコープ外のため通知一覧に留まる（タップしても遷移しない。将来のメッセージ機能で対応）|
| `subscription_expiring` | Crown（王冠系）| `colorWarning`（`#b8860b`）| プレミアム会員の有効期限が近づいています | `settings/subscription` |
| `system` | Bell | `colorTextSecondary` | 運営からのお知らせがあります | 通知一覧に留まる（タップしても遷移しない）|

**{nickname} 太字ルール:** 本文の actorName 部分は `fontWeight: 700` で強調する（Web の `<strong>` 相当）。

### 6.2 アイコンバッジの配置

アバター画像の右下に 20pt の円形アイコンバッジを重ねて表示する。

```
┌─────┐
│     │
│ AVT │
│   ╔═╗│
│   ║🔔║│  ← バッジ: 20pt × 20pt / radiusFull / 背景 colorSurface / border 1pt colorBorderLight
└─────┘
```

- バッジ内アイコン: 12pt
- アイコン色: type 別対応表の「アイコン色」カラムに従う

### 6.3 actor が null の場合のフォールバック

`system` / `subscription_expiring` はアクターが存在しない。

| 要素 | フォールバック |
|------|--------------|
| アバター | アプリロゴ（Bon_Log 葉マーク / 44pt / `colorSurfaceMuted` 背景）または Bell アイコン＋`colorSurfaceMuted` 背景の円 |
| 本文の {nickname} | actorName 部分をそのまま省略し、本文テンプレートのみ表示（上記テンプレート参照）|

`actor` が null かつ type が上記以外の場合（将来の型追加時のデフォルト）:

| 要素 | フォールバック |
|------|--------------|
| アバター | 「?」文字 + `colorSurfaceMuted` 背景の円 |
| 本文 | 「お知らせがあります」|
| 遷移先 | 遷移なし（タップ無効）|

### 6.4 コンテンツプレビュー

`post.content` または `comment.content` が存在する場合、本文テキストの下に 1 行で表示する。

```
【本文テキスト行】
[コンテンツプレビュー 1行 / ellipsizeMode: "tail"]   ← textSm / colorTextSecondary
[日時]
```

- プレビューテキスト: `textSm`（12pt）/ `colorTextSecondary` / 1 行 / `ellipsizeMode: "tail"`
- `follow` / `follow_request` / `follow_request_approved` / `system` / `subscription_expiring` はプレビューなし（`post`/`comment` が null）

---

## 7. 未読バッジ（タブアイコン）

### 7.1 表示仕様

```
[🔔 Bell アイコン]
        [99+]   ← 右上にバッジ
```

- バッジサイズ: 最小 18pt × 18pt（文字 1 桁）/ 文字 2 桁以上で幅が伸びる
- バッジ背景: `colorError`（`#c21721` — 朱色）
- バッジテキスト: `textXs`（10pt）/ `colorTextInverse`（`#ffffff`）/ `fontWeight: 700`
- `borderRadius: radiusFull`
- バッジ位置: アイコン右上 / オフセット `top: -4pt, right: -4pt`

### 7.2 数値上限表示

| count | 表示 | Web 出典 |
|-------|------|---------|
| 0 | バッジ非表示 | `NotificationBadge: count === 0 → return null` |
| 1 〜 99 | そのまま数値表示 | `BADGE_OVERFLOW_THRESHOLD = 99`（`limits/ui.ts`）|
| 100 以上 | 「99+」 | 同上 |

### 7.3 取得タイミング

- アプリ起動時・フォアグラウンド復帰時に取得（`focusManager` 連携）
- `refetchInterval: 30,000ms`（バックグラウンドポーリング。`REFETCH_INTERVAL_MS` 定数）
- 既読化成功後: レスポンスの `unreadCount` を直接使ってバッジを即時更新する（`unreadCount` クエリを invalidate するか、ローカルで値を上書きするかは frontend の実装判断に委ねる）

---

## 8. 既読化のタイミング方針（確定）

**確定方式: (a) 画面表示時の自動全件既読化 + (c) 「すべて既読にする」ボタン の併用。(b) 個別タップ既読化は採用しない。**

### 8.1 方式の比較と採用根拠

| 方式 | 内容 | 採用 |
|------|------|------|
| (a) 画面を開いたら全件既読化（自動）| `PATCH /api/v1/notifications/read`（body 省略 = 全件）を画面マウント時に呼び出す | **採用（主方式）** |
| (b) 個別タップで既読化 | 通知セルをタップした時点でその ID を既読化する | **不採用** |
| (c) 「すべて既読にする」ボタン | ヘッダーボタンをタップした時点で全件既読化する | **採用（補助機能）** |

**(a) を主方式とする根拠:**

- Web 版（`NotificationList.tsx`）の `useEffect` が画面マウント時に `markAllAsRead()` を自動呼び出しする実装と同一判断。Web とトーンを揃える
- 「一覧を開いた = すべて確認した意思がある」という単純なメンタルモデルがユーザーの認知負荷を最も下げる
- サーバー API が `ids` 省略で全件既読化をサポートしているため、実装コストが低い

**(b) を不採用とする根拠:**

- 一覧を見ながら「どれが既読になったか」を管理させる必要が生じ、UX が複雑になる
- スクロール位置や表示範囲の管理が必要になり、実装コストが高い
- 「バッジが残り続ける」問題が起きやすく、ユーザーが混乱する

**(c) を補助機能として残す根拠:**

- 画面を開いた直後に API 呼び出しが失敗した場合（オフライン等）の手動トリガーになる
- 「意識して全件既読にしたい」ユーザーの明示的な操作を受け付けるためのセーフティネット
- Web 版と同じ「すべて既読にする」ボタンを配置することで Web との体験を揃える

### 8.2 自動既読化の実装フロー

```
画面マウント（初回のみ / unreadCount > 0 の場合）
  → PATCH /api/v1/notifications/read（body なし = 全件既読化）を呼び出す
  → 成功:
      レスポンスの unreadCount（= 0）でバッジを即時更新
      notifications クエリを invalidate（セルの未読スタイルを既読スタイルに切り替え）
  → 失敗（オフライン等）:
      セルの未読スタイルは維持したまま（既読化はできていないため）
      バッジも更新しない
      「すべて既読にする」ボタンを活用してもらう（エラートーストは表示しない — 静かに失敗する）
```

`unreadCount === 0` の場合は API を呼び出さない（無駄な通信を避ける）。

### 8.3 「すべて既読にする」ボタンの挙動

- 配置: ナビゲーションヘッダー右端（§2.1 参照）
- 表示条件: `unreadCount > 0` の時のみ表示（§2.1 と同条件）
- 確認ダイアログ: **不要**（全件既読化は可逆的でなく影響が大きいが、ボタンラベルが自明であり、誤タップのリスクより UX の滑らかさを優先する。Web 版も確認なし）
- タップ時のフロー:

```
タップ
  → ボタンを disabled にする
  → PATCH /api/v1/notifications/read（body なし = 全件既読化）を呼び出す
  → 成功:
      レスポンスの unreadCount でバッジを更新（= 0 になる）
      ボタンを非表示にする（unreadCount === 0）
      notifications クエリを invalidate（セルスタイル更新）
  → 失敗:
      ボタンを re-enable する
      エラートーストを表示:「既読にできませんでした。もう一度お試しください。」
```

### 8.4 タブバッジの即時反映

既読化成功後のバッジ即時反映は、サーバーレスポンスの `unreadCount` フィールドを使う。

- `PATCH /api/v1/notifications/read` のレスポンス: `{ success: true, unreadCount: number }`
- この `unreadCount` をタブバッジの表示値として直接使用する
- ポーリングを待たずに即時反映できる（Web の `invalidateTag('unread-count')` 相当の即時更新）

---

## 9. リスト挙動

### 9.1 pull-to-refresh

- 引き下げで `refetch()`（最初のページの再取得）
- 成功後は `unreadCount` も invalidate
- リフレッシュ中のインジケータ: React Native の `RefreshControl` 標準（`colorActionPrimary`）

### 9.2 無限スクロール

- `useInfiniteQuery` + `getNextPageParam: (lastPage) => lastPage.nextCursor`
- リスト末尾付近（残り 3 件程度）で `fetchNextPage` を呼び出す
- 追加フェッチ中: リスト末尾にスピナー表示（`colorActionPrimary`）
- `nextCursor === null`（終端）: 「これ以上通知はありません」（`textSm` / `colorTextSecondary`）

### 9.3 スクロール後の「すべて既読にする」ボタン

ヘッダー固定（`position: sticky` 相当はモバイルではヘッダーコンポーネントで対応）。スクロールしても常に表示する。

---

## 10. エッジケース（4 状態）

| 状態 | 表示 |
|------|------|
| ローディング | `NotificationCellSkeleton` × 4（`ScreenLoading` の画面別スケルトン構成 — `common-states.md` §2.3）|
| 空 | `ScreenEmpty` / icon: Bell / 見出し: 「まだ通知はありません」/ 補足: 「いいねやコメントが届くとここに表示されます」|
| エラー | `ScreenError` / title: 「読み込めませんでした」/ description: `ERR_NOTIFICATIONS_LOAD_FAILED` / onRetry: refetch |
| オフライン | `OfflineBanner` + キャッシュデータあればリスト表示（キャッシュなしの場合は `ScreenError` で `ERR_OFFLINE` 相当）|

### 10.1 ゲストアクセス（403）

`GET /api/v1/notifications` は Bearer 必須。未認証状態では 403 が返る。

- ルートレイアウトの認証ガードにより通知タブ自体が非表示（または押下時にログイン画面へリダイレクト）
- 万一 403 が返った場合は `ScreenError`（description: `ERR_AUTH_REQUIRED` / onSubLink: 「ログインする」 → `(auth)/login`）

### 10.2 actor が削除済みユーザーの場合

サーバーが `actor: null` を返す可能性がある（アカウント削除後の古い通知）。
§6.3 のフォールバック表示を適用する。遷移先が `users/{actorId}` の type の場合は遷移を無効化し、タップは no-op とする。

### 10.3 post / comment が削除済みの場合

`post: null` / `comment: null` が返る可能性がある。
- コンテンツプレビューは表示しない（null チェックで非表示）
- 遷移先が `posts/{postId}` の type の場合でも `postId` が残っていれば遷移を試みる。サーバーが 404 を返した際は投稿詳細画面の 404 状態が処理する

---

## 11. コピー案（文言一覧）

| 場面 | 文言 |
|------|------|
| ヘッダータイトル | 「通知」|
| すべて既読にするボタン | 「すべて既読にする」|
| 空状態 見出し | 「まだ通知はありません」|
| 空状態 補足 | 「いいねやコメントが届くとここに表示されます」|
| エラー タイトル | 「読み込めませんでした」|
| エラー 補足 | 「通知の取得に失敗しました。もう一度お試しください。」|
| 追加フェッチ中 | 「読み込み中...」（スピナーと併用）|
| 終端 | 「これ以上通知はありません」|
| ゲスト 403 | 「通知を表示するにはログインが必要です」|
| 全件既読化ボタン失敗 | 「既読にできませんでした。もう一度お試しください。」|
| type: `like` | 「**{nickname}** さんがあなたの投稿にいいねしました」|
| type: `comment_like` | 「**{nickname}** さんがあなたのコメントにいいねしました」|
| type: `comment` | 「**{nickname}** さんがあなたの投稿にコメントしました」|
| type: `reply` | 「**{nickname}** さんがあなたのコメントに返信しました」|
| type: `follow` | 「**{nickname}** さんがあなたをフォローしました」|
| type: `follow_request` | 「**{nickname}** さんからフォローリクエストが届きました」|
| type: `follow_request_approved` | 「**{nickname}** さんがフォローリクエストを承認しました」|
| type: `quote` | 「**{nickname}** さんがあなたの投稿を引用しました」|
| type: `repost` | 「**{nickname}** さんがあなたの投稿をリポストしました」|
| type: `mention` | 「**{nickname}** さんがあなたをメンションしました」|
| type: `message` | 「**{nickname}** さんからメッセージが届きました」|
| type: `subscription_expiring` | 「プレミアム会員の有効期限が近づいています」|
| type: `system` | 「運営からのお知らせがあります」|
| type: 不明（デフォルト）| 「お知らせがあります」|

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 通知セル全体 | `accessibilityRole="button"` / `accessibilityLabel`: 「{本文テキスト}。{日時}。{既読・未読}」|
| 未読ドット | `accessibilityElementsHidden={true}`（本文 label に含まれるため非表示）|
| アバター | `accessibilityRole="image"` / `accessibilityLabel`: 「{nickname}のプロフィール画像」/ actor が null なら `accessibilityLabel`: 「システム通知」|
| 「すべて既読にする」ボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「すべての通知を既読にする」|
| タブバッジ | `accessibilityLabel`: 「未読通知 {count} 件」（`NotificationBadge.tsx` の `aria-label` と同一）|
| スケルトン | `accessibilityElementsHidden={true}`（`ScreenLoading` 仕様に準拠）|

タップターゲット: セル全体が 72pt 以上のため 44pt 基準を満たす。ヘッダーボタンは `hitSlop` で補完。

---

## 13. 使用デザイントークン

| 要素 | トークン |
|------|---------|
| 未読セル背景 | `colorSurface`（`#fcfcfc`）|
| 未読左ボーダー | 3pt / `colorActionPrimary`（`#2e2e2e`）|
| 既読セル背景 | `colorBackground`（`#ffffff`）|
| アバターサイズ | 44pt × 44pt |
| アバター枠 | 1.5pt solid `colorBorder` |
| アイコンバッジ背景 | `colorSurface`（`#fcfcfc`）|
| アイコンバッジ枠 | 1pt solid `colorBorderLight` |
| 本文テキスト | `textBase`（14pt）/ `colorTextPrimary` |
| アクター名 | `fontWeight: 700`（太字強調）|
| プレビューテキスト | `textSm`（12pt）/ `colorTextSecondary` |
| 日時テキスト | `textSm`（12pt）/ `colorTextSecondary` |
| セパレータ | 1pt / `colorBorderLight` |
| タブバッジ背景 | `colorError`（`#c21721`）|
| タブバッジテキスト | `textXs` / `colorTextInverse` |

---

## 14. NotificationCellSkeleton 構成

`ScreenLoading` の `skeletonCount=4` 相当として使うスケルトン。各セルの形状:

```
┌────────────────────────────────────┐  padding: spacing4
│  [Circle 44x44]  [Rect 180x14]     │  ← アバター + 本文行
│  +バッジ         [Rect 120x12]     │  ← プレビュー行
│                  [Rect 80x10]      │  ← 日時行
└────────────────────────────────────┘
```

- Circle: 44pt × 44pt / `borderRadius: radiusFull` / 背景 `colorSurfaceMuted`
- Rect: 高さ・幅は上記の近似値 / 背景 `colorSurfaceMuted`
- シマーアニメーション: `useNativeDriver: true`（`common-states.md` §2.6 準拠）

---

## 15. 既存との一貫性メモ

| Web 要素 | モバイル対応 |
|---------|-----------|
| `getNotificationMessage()` 関数 | §11 文言一覧として仕様に取り込む。実装は `lib/utils/notification-message.ts` に置く（frontend に実装依頼）|
| `getNotificationIcon()` 関数 | §6.1 type 別対応表として仕様に取り込む |
| `getNotificationLink()` 関数 | §6.1 遷移先列として仕様に取り込む。`lib/push/` の通知→ルート対応表（`navigation-structure.md` §7）にも反映 |
| `BADGE_OVERFLOW_THRESHOLD = 99` | §7.2 に踏襲。モバイルの `lib/constants/limits/` に同値で定義 |
| `REFETCH_INTERVAL_MS = 30000` | §5.2 に踏襲。同値で定義 |
| `NotificationList` の `useEffect` 自動全件既読化 | §8 で確定。`unreadCount > 0` の場合のみ API を呼び出す点は Web に同じ判断 |
| 未読セル背景 `bg-primary/5`（Web）| `colorSurface` + 左ボーダーに意匠変換。`bg-primary/5` の 5% 不透明は `#2e2e2e0d`（ほぼ白）のため視認性が低く、モバイルでは左ボーダーで視覚差を表現する |

---

## 16. 未確定事項・要判断

- **`follow_request` の遷移先:** MVP スコープにフォローリクエスト管理画面（`settings/follow-requests`）が含まれるか PM 判断が必要。含まれない場合は `users/{actorId}` への遷移で代替。
- **`message` type の通知:** メッセージ機能が MVP スコープ外のため、タップ時は遷移なし（現状この仕様）。将来のメッセージ機能追加時に遷移先を追加する。core に要相談: `message` type の通知が実際に発生する API パスはあるか確認要。
- **unread-count ポーリング vs Push:** 将来的に Push 通知受信時に `unreadCount` を invalidate するほうがポーリングより効率的。Push 実装（Batch 2c 以降）と合わせて検討。
- **自動既読化の失敗時の沈黙方針:** 画面マウント時の自動既読化失敗をサイレントにする（エラートーストを出さない）判断をここで確定した。理由はユーザーが意図していない操作の失敗を前面に出すと混乱させるため。PM 追認が必要な場合はこの箇所を確認してほしい。
