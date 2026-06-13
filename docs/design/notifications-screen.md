# 通知一覧画面仕様 — Bon_Log Native

作成日: 2026-06-13
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `post-card.md` に準拠
Web 出典: `Bon_Log_cfw/components/notification/NotificationItem.tsx` / `NotificationList.tsx` / `NotificationBadge.tsx` / `types/notification.ts`
API: `GET /api/v1/notifications`（カーソルベース）/ `GET /api/v1/notifications/unread-count`
既読化 API: `PATCH /api/v1/notifications` — **cfw Batch 2b 未実装。UI 設計のみ先行策定し、接続は Batch 2b リリース後に行う。**

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
├── ScreenEmpty               ← 空状態（共通）
├── ScreenError               ← エラー状態（共通）
└── OfflineBanner             ← オフライン時（共通）
```

### NotificationCell props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `notification` | `NotificationItem` | API レスポンスの 1 件分（後述の型定義参照）|
| `onPress` | `() => void` | セルタップ時のコールバック（画面側で遷移ロジックを持つ）|
| `onMarkRead` | `(id: string) => void` | タップ時の既読化コールバック（後接続。Batch 2b 実装後に接続）|

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

### 5.3 既読化（後接続 — Batch 2b 実装後）

- **UI 設計のみ先行策定。API 接続は cfw Batch 2b（`PATCH /api/v1/notifications`）リリース後。**
- 接続前は `onMarkRead` コールバックを no-op として実装し、UI ロジックは完成させておく
- 既読化 API 接続後は下記の方針で動作させる:
  - 画面を開いた瞬間に全件既読化（Web の `NotificationList` と同一方針）
  - `markAllAsRead` 成功後に `notifications` クエリと `unreadCount` クエリを両方 invalidate
  - 「すべて既読にする」ボタンも同様に全件既読化を呼び出す

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
| `like` | Heart（filled） | `colorError`（`#c0392b`）| **{nickname}** さんがあなたの投稿にいいねしました | `posts/{postId}` |
| `comment_like` | Heart（filled） | `colorError`（`#c0392b`）| **{nickname}** さんがあなたのコメントにいいねしました | `posts/{postId}`（commentId がある場合 `posts/{postId}#comment-{commentId}` — モバイルはアンカーなし → 投稿詳細に着地）|
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
- バッジ背景: `colorError`（`#c0392b` — 朱色）
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
- 通知一覧を開いて全件既読化した後: `unreadCount` クエリを invalidate して即時ゼロに更新

---

## 8. 既読化のタイミング方針

**Web に準拠: 通知一覧を開いた瞬間に全件既読化する。**

理由: 個別タップでの既読化より「一覧を見た = すべて確認済み」という単純なモデルのほうがユーザーの認知負荷が低い（Web の `useEffect` による自動 `markAllAsRead` と同一判断）。

実装フロー（Batch 2b 接続後）:

```
画面マウント
  → markAllAsRead() を呼び出す（PATCH /api/v1/notifications/read-all 相当）
  → 成功後: notifications クエリ + unreadCount クエリを invalidate
  → UI のセル未読スタイルが既読スタイルに切り替わる
```

ただし、Batch 2b 接続前は既読化 API が存在しないため:

- セルの未読/既読スタイル表示は API が返す `isRead` フィールドをそのまま使う
- 画面マウント時の自動既読化は `no-op`（空関数）として実装しておく
- 「すべて既読にする」ボタンをタップしても API 未接続のためローカル状態のみ更新する（「後接続」の注記を実装コメントに残す。`comments.md` の WHY コメント規約に従う）

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
| タブバッジ背景 | `colorError`（`#c0392b`）|
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
| `NotificationList` の `useEffect` 自動全件既読化 | §8 に踏襲。Batch 2b 接続後に同方式で実装 |
| 未読セル背景 `bg-primary/5`（Web）| `colorSurface` + 左ボーダーに意匠変換。`bg-primary/5` の 5% 不透明は `#2e2e2e0d`（ほぼ白）のため視認性が低く、モバイルでは左ボーダーで視覚差を表現する |

---

## 16. 未確定事項・要判断

- **既読化 API 接続タイミング:** cfw Batch 2b が完成したら frontend に接続実装を依頼。
- **`follow_request` の遷移先:** MVP スコープにフォローリクエスト管理画面（`settings/follow-requests`）が含まれるか PM 判断が必要。含まれない場合は `users/{actorId}` への遷移で代替。
- **`message` type の通知:** メッセージ機能が MVP スコープ外のため、タップ時は遷移なし（現状この仕様）。将来のメッセージ機能追加時に遷移先を追加する。core に要相談: `message` type の通知が実際に発生する API パスはあるか確認要。
- **unread-count ポーリング vs Push:** 将来的に Push 通知受信時に `unreadCount` を invalidate するほうがポーリングより効率的。Push 実装（Batch 2b 以降）と合わせて検討。
