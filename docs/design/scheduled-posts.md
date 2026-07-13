# 予約投稿画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
最終改訂: 2026-07-13（実装 `app/scheduled-posts/new/index.tsx` / `app/scheduled-posts/[id]/edit/index.tsx` の確認結果に基づき §5.1・§5.3・§5.5 を全面改訂。旧仕様の「日付・時刻の 2 フィールドをテキスト入力方式で受け付ける（`datetimepicker` 未導入のため）」は誤りで、実装は単一の `components/common/DateTimeField.tsx`（ネイティブ日時ピッカー）で公開予定日時を受け付ける。送信条件も「本文またはメディア（画像・動画）のいずれかがあれば送信可」に是正した）
同日追記（2026-07-13 第2回改訂・エラー色トークンの是正）: §3.3 StatusBadge の `colorError` 記載値を `#c0392b` から `#c21721` へ修正した。根拠は `design-tokens.md` §11 を参照
対象画面:
- `scheduled-posts/index` — 予約投稿一覧（プレミアム限定）
- `scheduled-posts/new` — 予約投稿作成フォーム
- `scheduled-posts/[id]/index` — 予約投稿詳細
- `scheduled-posts/[id]/edit` — 予約投稿編集フォーム
- `scheduled-posts/locked` — 非プレミアムユーザー向けロック画面

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-composer.md` の PostComposer コンポーネント群（`PostBodyInput` / `GenreSelector` / `ImageAttachmentGrid` / `VideoAttachmentArea`）と `hooks/use-post-composer.ts` を最大限流用する
- 公開予定日時の入力は `components/common/DateTimeField.tsx`（ネイティブの日付+時刻ピッカー）を使う（§5.3 参照。旧仕様のテキスト入力方式は撤回済み）
- **プレミアム必須機能**。非プレミアムユーザーはロック画面を表示する
- プレミアム判定: サーバー API から取得した `isPremium` を使用（RevenueCat クライアント SDK の entitlement を判定の正にしない。`billing.md` 準拠）
- `store-compliance.md` 準拠: プレミアム誘導は `routes.settingsSubscription`（アプリ内 Play Billing 購入）のみ。Stripe 等の外部決済への誘導禁止

---

## 1. 概要・目的

盆栽の記録を指定した日時に自動公開する「予約投稿」機能。プレミアムプランのみで利用可能。
`post-composer.md` の投稿作成フォームを流用し、日時ピッカー（`DateTimeField`）を追加したフォームを提供する。

**制約（クライアントの事前チェック。検証の正はサーバー）:**
- 予約日時: 現在から 30 日以内（`SCHEDULED_AT_DAYS_LIMIT = 30`）
- 保留中（pending）の上限: 10 件
- 本文文字数: 2000 文字以内（プレミアムと同一上限。`MAX_POST_CONTENT_PREMIUM`）

---

## 2. 非プレミアムユーザー向けロック画面（`scheduled-posts/locked`）

### 2.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「予約投稿」                                         │
│   右: なし                                                  │
│                                                             │
│                                                             │
│             [Crown アイコン（48pt / colorTextSecondary）]    │
│             [見出し: 「予約投稿はプレミアム機能です」]         │
│             [補足テキスト（2〜3行）]                         │
│                                                             │
│             [プレミアムプランに登録する]（ボタン）            │
│             colorActionPrimary / 高さ 48pt / 横幅 80%        │
│             → settings/subscription                        │
│                                                             │
│                                                             │
│ [セーフエリア下端]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 設計方針

- 非プレミアムユーザーが予約投稿機能にアクセスした際に表示する画面
- 機能の価値を伝え、プレミアムへの自然なアップグレード導線を提供する
- 誘導先は `settings/subscription`（アプリ内 Play Billing 購入画面）のみ。外部の Stripe ページへのリンクは一切含めない（`store-compliance.md` 準拠）

---

## 3. 予約投稿一覧画面（`scheduled-posts/index`）

### 3.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「予約投稿」                                         │
│   右: なし                                                  │
│                                                             │
│ [StatusFilterBar（固定 / スクロール外）]                     │
│   高さ: 44pt / 背景: colorSurfaceWashi / 下端: 1pt colorBorderLight│
│   [すべて][保留中][公開済み][失敗][キャンセル]               │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   contentContainerStyle: paddingHorizontal spacing4         │
│   paddingTop: spacing3 / paddingBottom: spacing24 + セーフ域 │
│                                                             │
│   [ScheduledPostCard × N]                                   │
│   ↓ pull-to-refresh                                        │
│   ↓ 末尾で次ページ取得                                      │
│                                                             │
│ [FAB（新規予約投稿）]                                        │
│   右下固定 / + アイコン / 直径 56pt                          │
│   保留中が 10 件未満の場合のみ有効                           │
│   10 件に達した場合: FAB を表示するが disabled（opacity: 0.4）│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 StatusFilterBar チップ仕様

- `post-composer.md` §7.2 GenreSelector チップスタイルを踏襲する
- フィルタ値（`status`）:

| ラベル | 値 | 説明 |
|--------|---|------|
| 「すべて」| （未指定）| 全ステータスを表示（デフォルト）|
| 「保留中」| `pending` | 予約公開を待っている |
| 「公開済み」| `published` | 予約通り公開された |
| 「失敗」| `failed` | 予約時刻に公開できなかった |
| 「キャンセル」| `cancelled` | ユーザーがキャンセルした |

### 3.3 ScheduledPostCard レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [StatusBadge] [予約日時 textSm colorTextSecondary]           │
│ [本文プレビュー（2行まで / textBase）]                        │
│ [メディアサムネイル（最大3枚 横並び / 任意）]                 │
└─────────────────────────────────────────────────────────────┘
```

詳細:
- 高さ: 最小 80pt（`paddingVertical: spacing3`）
- `paddingHorizontal: spacing4`
- 下端区切り: `1pt solid colorBorderLight`
- 背景: `colorSurface`（`#fcfcfc`）/ 角丸: `radiusLg` / `shadowWashi`
- カード全体タップ → `scheduled-posts/[id]`

**StatusBadge 仕様:**

| status | 背景 | テキスト | ラベル |
|--------|------|---------|--------|
| `pending` | `colorSurfaceMuted`（`#f0f0f0`）| `colorTextPrimary` | 「予約中」|
| `published` | `colorSuccessBg`（`#e8f5e9` 相当）| `colorSuccess` | 「公開済み」|
| `failed` | `colorErrorBg`（`#fdf0ef`）| `colorError`（`#c21721`）| 「失敗」|
| `cancelled` | `colorSurfaceMuted` | `colorTextSecondary` | 「キャンセル済み」|

**（2026-07-13 第2回改訂）:** `failed` 行の `colorError` 値表記を `#c0392b` から `#c21721` に修正した（`design-tokens.md` §11 参照。実装 `lib/constants/design-tokens.ts` の実際の値に合わせた）。

- バッジ: `borderRadius: radiusSm`（6pt）/ `paddingHorizontal: spacing2`（8pt）/ `paddingVertical: 2pt`
- テキスト: `textXs`（10pt）/ `fontWeight: 600`
- **`colorSuccess` / `colorSuccessBg` の hex 値は `design-tokens.md` 後注の通り Web 実装との整合を core に要確認**

### 3.4 FAB の活性制御

- 保留中（`pending`）の投稿が 10 件未満: FAB を通常表示（タップ可）
- 保留中が 10 件: FAB を disabled 表示（`opacity: 0.4` / タップ不可）+ `accessibilityHint` で理由を伝える
- `accessibilityLabel`: 「予約投稿を作成する」
- disabled 時の `accessibilityHint`: 「保留中の予約投稿が上限の10件に達しています。」

---

## 4. 予約投稿詳細画面（`scheduled-posts/[id]/index`）

### 4.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「予約投稿の詳細」                                   │
│   右: 「⋮」（3点メニュー / pending 時のみ）                  │
│                                                             │
│ [ScrollView]                                                │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8 + セーフエリア下端                 │
│                                                             │
│   [StatusBadge + 予約日時]                                  │
│   [本文テキスト（textBase）]                                 │
│   [ジャンルタグ（PostGenreTags 流用）]                       │
│   [メディアグリッド（PostImageGallery 流用）]                │
│                                                             │
│   [failedメッセージ（status=failed の場合）]                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [AlertCircleアイコン] 予約時刻に公開できませんでした。│   │
│   │ 再度予約投稿を作成してください。                     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 3点メニュー（pending 時のみ）

| 項目 | 動作 |
|------|------|
| 「編集する」| `scheduled-posts/[id]/edit` へ遷移（モーダル）|
| 「キャンセルする」| キャンセル確認ダイアログ → `PATCH /api/v1/scheduled-posts/{id}` で status を `cancelled` に変更 |
| 「削除する」| 削除確認ダイアログ → `DELETE /api/v1/scheduled-posts/{id}` → 一覧に戻る |

**キャンセル確認ダイアログ:**
```
タイトル: 「予約を取り消しますか？」
本文: 「この予約投稿の公開が取り消されます。下書きとして保持したい場合は編集画面から変更してください。」
ボタン: [キャンセル（閉じる）] [予約を取り消す（colorError）]
```

**削除確認ダイアログ:**
```
タイトル: 「予約投稿を削除しますか？」
本文: 「この予約投稿は完全に削除されます。この操作は取り消せません。」
ボタン: [キャンセル] [削除する（colorError）]
```

---

## 5. 予約投稿フォーム（`scheduled-posts/new` / `scheduled-posts/[id]/edit`）

### 5.1 全体レイアウト

> **改訂注記（2026-07-13）:** 旧仕様は「公開日時」を日付・時刻の 2 つのテキスト入力フィールドとしていたが、実装 `app/scheduled-posts/new/index.tsx` は単一の `DateTimeField`（`components/common/DateTimeField.tsx`）で日付と時刻をまとめて選択する。フィールド順序も実装に合わせ、公開予定日時を本文より先に配置する。

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「予約投稿を作成」または「予約投稿を編集」           │
│   右: 「予約する」または「保存する」                         │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8                                   │
│                                                             │
│   [ComposerFormError（エラー時のみ）]                        │
│                                                             │
│   [公開予定日時 ＊ — DateTimeField（日付+時刻・単一フィールド）]│
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 日時を選択                              [カレンダー] │   │
│   └─────────────────────────────────────────────────────┘   │
│   [ヒントテキスト: 「現在から30日以内の日時を選択してください」]│
│                                                             │
│   ═══════════════════════════════════════════════════════   │
│   § 投稿内容（post-composer.md の流用）                      │
│   ═══════════════════════════════════════════════════════   │
│                                                             │
│   [PostBodyInput]（本文テキストエリア + 文字数カウンタ）      │
│   [GenreSelector]（ジャンル選択トリガー→モーダル。任意）      │
│   [ImageAttachmentGrid]（画像選択グリッド）                  │
│   [VideoAttachmentArea]（動画。プレミアムのため常時表示）     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 投稿内容フィールドの仕様

`post-composer.md` の以下コンポーネントをそのまま流用する（内部状態は `hooks/use-post-composer.ts` の `usePostComposer` で管理する。新規投稿と共通）:
- `PostBodyInput`: 本文テキストエリア（2000字上限 / プレミアム固定）+ 文字数カウンタ
- `GenreSelector`: ジャンル選択（トリガー→モーダル。任意・最大 3 つ。`post-composer.md` §7 準拠）
- `ImageAttachmentGrid`: 画像選択グリッド（最大 6 枚 / プレミアム固定）
- `VideoAttachmentArea`: 動画選択エリア（プレミアム専用機能のため常時表示・常時有効）

予約投稿はプレミアム専用機能のため、文字数上限は常に 2000 字、画像は 6 枚で固定する。

### 5.3 公開予定日時入力（DateTimeField）

> **改訂注記（2026-07-13）:** 旧仕様は「日付フィールド + 時刻フィールドの 2 つをテキスト入力方式で受け付ける（`datetimepicker` 未導入のため）」としていたが誤りだった。`@react-native-community/datetimepicker` は導入済みで、実装は共通コンポーネント `components/common/DateTimeField.tsx` の**単一フィールド**で日付と時刻をまとめて選択する（`events.md` の開催日時・`bonsai.md` §6.7 の手入れログ実施日と同一コンポーネント）。

- ラベル: 「公開予定日時 ＊」
- **Android:** フィールドタップ → 日付ダイアログ（`DateTimePickerAndroid` `mode: 'date'`）→ 確定すると**連鎖して時刻ダイアログ（`mode: 'time'`・24時間表記）が自動的に開く**
- **iOS:** フィールドタップ → フィールド直下に `RNDateTimePicker`（`display="spinner"` / `mode="datetime"`）が**インライン展開**し、日付と時刻を 1 ステップで選べる。「完了」で閉じる
- 表示形式: 「{YYYY}年{M}月{D}日 {HH}:{MM}」（24時間表記）
- 未設定時のプレースホルダー: 「日時を選択」（`DateTimeField` のデフォルト値）
- `minimumDate`: 画面を開いた時点の現在日時（`now`）
- `maximumDate`: 現在から 30 日後（`SCHEDULED_AT_DAYS_LIMIT = 30` 日）
- 選択済みの場合、フィールド右に `close-circle` の削除ボタン（`accessibilityLabel="公開予定日時を削除"`）
- ヒントテキスト（フィールド直下）: 「現在から30日以内の日時を選択してください。」

**送信時の追加バリデーション（`handleSave` 内・画面ローカル）:** `DateTimeField` の `minimumDate`/`maximumDate` は選択 UI 上の制約であり、実際の送信直前にも以下を再チェックしてエラーメッセージを `ComposerFormError` に表示する（フォームエラー定数ではなく画面内のインライン文字列）:

| 状況 | 表示文言（画面ローカル文字列） |
|------|--------------------------|
| 未選択のまま送信しようとした | 「公開予定日時を選択してください。」|
| 現在時刻以前 | 「公開予定日時は現在より未来に設定してください。」|
| 30日超過 | 「公開予定日時は30日以内に設定してください。」|

### 5.4 保留中の上限チェック（事前バリデーション）

- フォームマウント時に保留中の件数を取得する
- 保留中が 10 件に達している場合: `ComposerFormError` に「保留中の予約投稿が上限（10件）に達しています。既存の予約投稿をキャンセルまたは削除してから新規作成してください。」を表示し、「予約する」ボタンを disabled にする
- **core に要確認:** 上限チェック用に現在の保留中件数を返す API が必要かどうか確認する（一覧取得でカウントする方法でも可）

### 5.5 フォームの保存ボタン活性条件

> **改訂注記（2026-07-13）:** 旧仕様は「本文 1 文字以上 OR 画像 1 枚以上」のみを条件としていたが、実装の `hasContent` は**動画添付も条件に含む**（`content.trim().length > 0 || images.length > 0 || videoUri !== null`）。「本文またはメディア（画像・動画のいずれか）があれば送信可」という Web `ScheduledPostForm` と同一の条件が正しい。

**新規作成（`scheduled-posts/new`）:**

`canSubmit = hasRequiredFields && !isPending && contentLength <= maxContent`
（`hasRequiredFields = hasContent && hasScheduledAt`）

- 本文が 1 文字以上 **または** 画像が 1 枚以上 **または** 動画が添付されている（`hasContent`）
- 公開予定日時が選択されている（`hasScheduledAt`）
- 本文文字数が 2000 字以内
- 保存処理中でない

**編集（`scheduled-posts/[id]/edit`）:**

新規作成の条件に加えて、**変更があること**を要求する:

`canSubmit = hasContent && hasScheduledAt && !isPending && contentLength <= maxContent && (isDirty || scheduledAt !== initialScheduledAt)`

- `isDirty` は本文・ジャンル・画像・動画のいずれかが初期値から変わったかを表す（`usePostComposer` が管理）
- 公開予定日時のみが変更された場合も `scheduledAt !== initialScheduledAt` で活性化する（`isDirty` は日時の変更を含まないため、この項が別途必要）

保留中の件数上限・30日以内という制約（§5.4・§5.3）は `canSubmit` そのものには含まれず、送信時（`handleSave`）にチェックしてエラー表示する。

### 5.6 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示（`presentation: "modal"`）|
| 遷移元（新規）| `scheduled-posts/index` の FAB タップ |
| 遷移元（編集）| `scheduled-posts/[id]` の 3点メニュー「編集する」（pending のみ）|
| 遷移先（成功・新規）| `router.replace('/scheduled-posts')` で一覧へ遷移し、`scheduledPosts.list` が invalidation で更新される |
| 遷移先（成功・編集）| モーダルを閉じ、`scheduled-posts/[id]` が invalidation で更新される |
| 遷移先（キャンセル）| 変更がある場合は破棄確認（本文「入力した内容は失われます。」）→ モーダルを閉じる |

**iOS / Android 差異（post-composer.md §3 を踏襲）:**
- iOS: スワイプダウン → 入力ありなら破棄確認ダイアログ
- Android: バックボタン → 入力ありなら破棄確認ダイアログ

---

## 6. ナビゲーション全体

### 6.1 プレミアム判定フロー

```
ユーザーが予約投稿機能にアクセス
    ↓
isPremium を確認（サーバー取得ユーザー情報から）
    ├─ isPremium === true  → scheduled-posts/index を表示
    └─ isPremium === false → scheduled-posts/locked を表示
```

**isPremium 取得中（ローディング）:** `ScreenLoading`（variant="spinner"）を表示し、判定完了後に適切な画面に切り替える。

### 6.2 画面遷移表

| 画面 | ルート | 遷移元 |
|------|--------|--------|
| ロック画面 | `scheduled-posts/locked` | `(tabs)/more`「予約投稿」/ 非プレミアムユーザー |
| 一覧 | `scheduled-posts/index` | `(tabs)/more`「予約投稿」/ プレミアムユーザー |
| 詳細 | `scheduled-posts/[id]/index` | `scheduled-posts/index` のカードタップ |
| 作成 | `scheduled-posts/new` | `scheduled-posts/index` の FAB タップ |
| 編集 | `scheduled-posts/[id]/edit` | `scheduled-posts/[id]` の 3点メニュー（pending のみ）|

---

## 7. コンポーネント分割

```
ScheduledPostsLockedScreen            ← 非プレミアム用ロック画面
PremiumLockedBanner                   ← ロック UI（他画面でも流用可能）

ScheduledPostsScreen (index)
├── StatusFilterBar                   ← ステータスフィルタチップ群
├── ScheduledPostList                 ← FlatList ラッパー
│   └── ScheduledPostCard             ← 各予約投稿カード
│       └── StatusBadge              ← ステータスバッジ
├── ScheduledPostFAB                  ← 新規作成 FAB（pending 上限で disabled）
└── （common-states.md コンポーネント群）

ScheduledPostDetailScreen ([id])
├── StatusBadge                       ← ステータスバッジ（流用）
├── FailedMessage                     ← 失敗時の案内バナー（status=failed のみ）
├── PostGenreTags                     ← post-card.md 流用
└── PostImageGallery                  ← post-card.md 流用

ScheduledPostFormScreen (new / edit)
├── DateTimeField                     ← 公開予定日時（§5.3。post-composer.md には存在しない専用フィールド）
├── PostBodyInput                     ← post-composer.md 流用（2000字固定）
├── GenreSelector                     ← post-composer.md 流用
├── ImageAttachmentGrid               ← post-composer.md 流用（最大6枚固定）
├── VideoAttachmentArea               ← post-composer.md 流用（常時有効）
└── ComposerFormError                 ← post-composer.md 流用
```

---

## 8. データの流れ

### 8.1 予約投稿一覧

- `GET /api/v1/scheduled-posts?status={status}&cursor={cursor}`
- `useInfiniteQuery`（`queryKeys.scheduledPosts.list(status)` 相当）

### 8.2 予約投稿詳細

- `GET /api/v1/scheduled-posts/{id}` — content / scheduledAt / genreIds / mediaUrls / mediaTypes / status を含む

### 8.3 予約投稿の CRUD

| 操作 | エンドポイント | 条件 | invalidation |
|------|-------------|------|-------------|
| 作成 | `POST /api/v1/scheduled-posts` | pending < 10 件 | `scheduledPosts.list` |
| 更新 | `PATCH /api/v1/scheduled-posts/{id}` | status=pending のみ | `scheduledPosts.detail(id)` / `scheduledPosts.list` |
| キャンセル | `PATCH /api/v1/scheduled-posts/{id}` で `status: "cancelled"` | status=pending のみ | `scheduledPosts.detail(id)` / `scheduledPosts.list` |
| 削除 | `DELETE /api/v1/scheduled-posts/{id}` | — | `scheduledPosts.list` → 一覧に戻る |

**画像アップロード:** `post-composer.md` §5.3 の presigned URL → R2 直接 PUT フローを使う。

---

## 9. エッジケース

### 9.1 ローディング

| 画面 | ローディング表示 |
|------|--------------|
| 一覧 | `ScreenLoading`（variant="skeleton" / ScheduledPostCardSkeleton × 3）|
| 詳細 | `ScreenLoading`（variant="spinner"）|
| フォーム（編集）| `ScreenLoading`（variant="spinner"）|
| isPremium 判定中 | `ScreenLoading`（variant="spinner"）|

### 9.2 空状態

**一覧（0件）:**
```
アイコン: CalendarPlus / colorTextSecondary
見出し: 「予約投稿はありません」
補足: 「右下のボタンから投稿を予約してみましょう。」
```

**ステータスフィルタ選択時（0件）:**
```
見出し: 「{ステータス名}の投稿はありません」
補足: 「他のステータスに切り替えてご確認ください。」
```

### 9.3 エラー

| エラー種別 | 表示箇所 |
|-----------|---------|
| 一覧取得失敗 | `ScreenError`（onRetry: refetch）|
| 詳細取得失敗 | `ScreenError` |
| 404（存在しない）| `ScreenError`（title: 「予約投稿が見つかりません」）|
| 作成 / 更新失敗 | `ComposerFormError`（post-composer.md §12.3 に準拠）|
| 保留上限超過（422 / 400）| `ComposerFormError`「保留中の予約投稿が上限（10件）に達しています。既存の予約投稿をキャンセルまたは削除してから新規作成してください。」|
| 予約期間超過（送信前チェック）| `ComposerFormError`「公開予定日時は30日以内に設定してください。」（§5.3 参照）|
| pending でない投稿の編集試行（409 / 400）| `ComposerFormError`「この予約投稿は編集できません。公開済みまたはキャンセル済みの投稿は変更できません。」|
| プレミアム解除後のアクセス（403）| `ScreenError`（title: 「プレミアム機能です」/ `onRetry` でロック画面へ誘導）|
| ネットワークエラー | `ScreenError`（ERR_NETWORK）|
| 5xx | `ScreenError`（ERR_SERVER）|

### 9.4 オフライン

- `OfflineBanner` を各画面上部に表示
- 一覧・詳細はキャッシュ表示を維持
- 作成 / 更新 / キャンセル / 削除はオフライン時にブロックし `ComposerFormError` に `ERR_OFFLINE_ACTION` を表示

---

## 10. コピー案

| 箇所 | 文言 |
|------|------|
| ロック画面ヘッダー | 「予約投稿」|
| ロック画面 見出し | 「予約投稿はプレミアム機能です」|
| ロック画面 補足 | 「プレミアムプランに加入すると、投稿を指定した日時に自動公開できます。最大 10 件の予約が可能です。」|
| ロック画面 ボタン | 「プレミアムプランに登録する」|
| 一覧ヘッダー | 「予約投稿」|
| 詳細ヘッダー | 「予約投稿の詳細」|
| 新規フォームヘッダー | 「予約投稿を作成」|
| 編集フォームヘッダー | 「予約投稿を編集」|
| 新規「予約する」ボタン | 「予約する」|
| 編集「保存する」ボタン | 「保存する」|
| ステータスバッジ「pending」| 「予約中」|
| ステータスバッジ「published」| 「公開済み」|
| ステータスバッジ「failed」| 「失敗」|
| ステータスバッジ「cancelled」| 「キャンセル済み」|
| ステータスフィルタ「全部」| 「すべて」|
| ステータスフィルタ「pending」| 「保留中」|
| ステータスフィルタ「published」| 「公開済み」|
| ステータスフィルタ「failed」| 「失敗」|
| ステータスフィルタ「cancelled」| 「キャンセル」|
| 公開予定日時ラベル | 「公開予定日時 ＊」|
| 公開予定日時 placeholder | 「日時を選択」|
| 公開予定日時 削除ボタン | `accessibilityLabel="公開予定日時を削除"` |
| 公開予定日時 ヒントテキスト | 「現在から30日以内の日時を選択してください。」|
| 送信前バリデーション（未選択）| 「公開予定日時を選択してください。」|
| 送信前バリデーション（過去日時）| 「公開予定日時は現在より未来に設定してください。」|
| 送信前バリデーション（30日超過）| 「公開予定日時は30日以内に設定してください。」|
| FAB accessibilityLabel（有効）| 「予約投稿を作成する」|
| FAB accessibilityHint（disabled）| 「保留中の予約投稿が上限の10件に達しています。」|
| 失敗バナー本文 | 「予約時刻に公開できませんでした。再度予約投稿を作成してください。」|
| キャンセル確認 タイトル | 「予約を取り消しますか？」|
| キャンセル確認 本文 | 「この予約投稿の公開が取り消されます。下書きとして保持したい場合は編集画面から変更してください。」|
| キャンセル確認 実行ボタン | 「予約を取り消す」|
| 削除確認 タイトル | 「予約投稿を削除しますか？」|
| 削除確認 本文 | 「この予約投稿は完全に削除されます。この操作は取り消せません。」|
| 削除確認 削除ボタン | 「削除する」|
| 空（全件）見出し | 「予約投稿はありません」|
| 空（全件）補足 | 「右下のボタンから投稿を予約してみましょう。」|
| 作成成功トースト | 「予約投稿を設定しました」|
| 編集成功トースト | 「予約投稿を更新しました」|
| キャンセル成功トースト | 「予約を取り消しました」|
| 削除成功トースト | 「予約投稿を削除しました」|
| 破棄確認 タイトル | 「変更を破棄しますか？」|
| 破棄確認 本文 | 「入力した内容は失われます。」|
| 破棄確認（続ける）| 「編集を続ける」|
| 破棄確認（破棄）| 「破棄する」|

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| ScheduledPostCard | `accessibilityRole="button"` / `accessibilityLabel` にステータス・予約日時・本文プレビューを含める |
| StatusBadge | `accessibilityRole="text"` / `accessibilityLabel="{ステータス名}"` |
| FAB（有効）| `accessibilityRole="button"` / `accessibilityLabel="予約投稿を作成する"` |
| FAB（disabled）| `accessibilityState: { disabled: true }` / `accessibilityHint` で理由を伝える |
| StatusFilterBar チップ | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 公開予定日時 DateTimeField | `accessibilityRole="button"` / `accessibilityLabel="公開予定日時：{選択済み日時 または 「日時を選択」}"` |
| ロック画面ボタン | `accessibilityRole="button"` / `accessibilityLabel="プレミアムプランに登録する"` / 高さ 48pt |
| 失敗バナー | `accessibilityRole="alert"` |

---

## 12. store-compliance.md との対応確認

| 要件 | 対応状況 |
|------|---------|
| 外部決済ページへの誘導禁止 | ロック画面のボタン遷移先は `settings/subscription`（アプリ内 Play Billing）のみ。Stripe・外部サイトへのリンクは一切含まない |
| プレミアム機能の正当な判定 | `isPremium` はサーバー API から取得（`billing.md` 準拠）。RevenueCat クライアント SDK の entitlement は判定の正にしない |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-composer.md`（PostBodyInput / GenreSelector / ImageAttachmentGrid / VideoAttachmentArea / ComposerFormError）| フォームの投稿内容部分をすべて流用する（`hooks/use-post-composer.ts` の `usePostComposer` 経由）|
| `post-composer.md` §12.1（破棄確認）| フォームの破棄確認を踏襲する |
| `post-composer.md` §11.2（送信中の UI）| 「予約する」ボタンのスピナー状態を踏襲する |
| `components/common/DateTimeField.tsx` | 公開予定日時の入力に使う（§5.3）。`bonsai.md` §6.7 の手入れログ実施日・`events.md` の開催日時と同一コンポーネント |
| `post-card.md`（PostGenreTags / PostImageGallery）| 詳細画面のジャンルタグ・メディア表示に流用する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| `more-menu.md` §3.4「予約投稿」行 | プレミアムユーザーは一覧へ、非プレミアムはロック画面へ遷移（ネイティブ遷移に切り替える frontend 申し送り）|
| `bonsai.md` / `events.md` / `shops.md` の FAB デザイン | 直径 56pt / `colorActionPrimary` / `shadowWashi` を踏襲する |

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| 保留中件数の取得方法 | 上限チェックのために保留中件数を取得する API が別途必要か、または一覧取得のレスポンスに含まれるかを確認する | core | 未解決 |
| `colorSuccess` / `colorSuccessBg` の hex 値 | `design-tokens.md` 後注の通り Web 実装との整合を確認する | core | 未解決 |
| `scheduledAt` の型とタイムゾーン | クライアントは `Date#toISOString()`（UTC）で送信する。サーバー側の解釈・表示側のタイムゾーン変換方針を確認する | core | 未解決 |
| 「近い順」ソートの実現 | `location` ソートは端末の現在位置が必要。位置情報権限を要求するかスコープ外にするかは PM が判断する | PM | 未解決 |
| 日時ピッカーライブラリ | `@react-native-community/datetimepicker`（`DateTimeField`）を採用済み | frontend | **解決済み（2026-07-13）** |
| `more-menu.md` 「予約投稿」遷移先 | ネイティブ画面実装後の切り替えタイミング。プレミアム判定をアプリ側でルーティング時に行うか、遷移先に委ねるか | frontend | 未解決 |
