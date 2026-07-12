# コメント投稿・返信・削除 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-19
最終改訂: 2026-07-13（実装 `components/comment/CommentInput.tsx` / `hooks/use-comment-media.ts` / `lib/queries/comments.ts` の確認結果に基づき §2・§4・§5.2・§6 を全面改訂。旧仕様は画像添付を「MVP はボタン配置のみ・タップ時の実装は基本仕様として含める」という将来対応扱いにしていたが、**画像添付（最大2枚）・動画添付（プレミアムのみ最大1本）は既に実装済み**である。送信条件も「本文またはメディアのいずれかがあれば送信可」に是正した）
対象画面:
- `posts/[id]` — 投稿詳細画面（コメント投稿 UI はこの画面に内包）

前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §4.3（投稿詳細画面）・§5.2（戻る挙動）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-card.md`（PostCard コンポーネント）・`ugc-safety.md`（通報・ブロック）と連携する
- `post-composer.md` §8（ImageAttachmentGrid）・§9（VideoAttachmentArea）をメディア添付に流用する（§6.6 参照）
- 通報・ブロックの UI は `ugc-safety.md` §2.4（コメント通報導線）に委ねる。本仕様では投稿・削除に集中する

---

## 1. 概要・目的

投稿詳細画面（`posts/[id]`）において、コメントの閲覧・投稿・返信・削除を行う UI を定義する。
コメント入力バーは画面下部に固定表示し、キーボード表示時も入力バーがキーボード直上に追従する。

### 1.1 解決する問題

- モバイルでのコメント投稿 UX を、入力バーが常に見える形で実現する（Web と異なるモバイル固有の固定配置）
- 返信（parentId 指定）時の宛先表示を分かりやすくする
- 自分のコメントを安全に削除できる導線を提供する
- 画像・動画（プレミアムのみ）をコメントに添付できるようにする

---

## 2. 画面構成（ワイヤーフレーム）

### 2.1 投稿詳細画面の全体構成

> **改訂注記（2026-07-13）:** 入力バーの構成を実装 `components/comment/CommentInput.tsx` に合わせて更新した。画像添付ボタン（常時表示）・動画添付ボタン（プレミアムのみ表示）・選択済みメディアのプレビュー行を追加した。

```
┌─────────────────────────────────────────────────────────────┐
│ ← [セーフエリア上端]                                         │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「投稿」                                             │
│   右: （将来拡張用に空き）                                   │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  [PostCard（disableNavigation=true）]                    │ │
│ │  ← 投稿本文・画像・ジャンル・アクションバー             │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [コメントセクション見出し]                                   │
│ コメント {N}件                                              │
│                                                             │
│ [コメントリスト（FlatList）]                                 │
│   各 CommentCell:                                           │
│   ┌─────────────────────────────────────────────────────┐  │
│   │ [アバター 36pt] {ニックネーム}  {日時}  [⋮ 44pt]    │  │
│   │                {コメント本文}                         │  │
│   │                [↩ 返信する]  [♡ いいね]             │  │
│   └─────────────────────────────────────────────────────┘  │
│   （返信コメントは左にネストインデント 44pt）                │
│                                                             │
│   [ページ末尾スピナー / 「これ以上ありません」]             │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ [コメント入力バー（固定）]                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [宛先表示（返信時のみ）: ↩ @{nickname} への返信  [✕]] │ │
│ │ [選択済み画像サムネイル行（画像添付時のみ）]              │ │
│ │ [選択済み動画プレビュー（プレミアムかつ動画添付時のみ）]  │ │
│ │ [🖼][🎥*] ┌─────────────────────────────┐  [送信ボタン] │ │
│ │           │ コメントを入力...           │               │ │
│ │           └─────────────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ← [セーフエリア下端]                                         │
└─────────────────────────────────────────────────────────────┘

`*` 動画添付ボタンはプレミアムユーザーのみ表示。
```

### 2.2 コメント入力バー（キーボード表示時・文字数カウンタ）

```
┌─────────────────────────────────────────────────────────────┐
│ [キーボード]                                                 │
│                                                             │
│ [コメント入力バー（キーボード直上に追従）]                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [宛先表示（返信時のみ）]         [✕ 返信キャンセル]     │ │
│ │ [🖼][🎥] ┌──────────────────────────────┐ ┌──────────┐  │ │
│ │          │ コメントを入力...（多行対応）│ │  送信する │  │ │
│ │          └──────────────────────────────┘ └──────────┘  │ │
│ │            右下: {N} / 500                                │ │
│ │            （フォーカス中または入力ありのときのみ表示）    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

文字数カウンタはテキストフィールドの**内側**（`inputWrapper` の下部）に表示され、常時表示ではなく「フォーカス中、または 1 文字以上入力済み」のときのみ表示される。

---

## 3. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `posts/[id]`（タブ外スタック）|
| 遷移元 | フィードの PostCard タップ / 通知タップ / ディープリンク（`bonlog://posts/{id}`）|
| 遷移先 | 「← 戻る」でスタックをポップ / アバタータップ → `users/[id]` |
| ディープリンク | 必要（Push 通知のコメント・いいね等から遷移。`lib/push/` の対応表で管理）|

**iOS / Android 差異:**
- iOS: ヘッダー左 "<" タップまたは画面左端からのスワイプでスタックをポップ
- Android: ハードウェアバックボタンでスタックをポップ（Expo Router が処理）

**BottomTabBar の表示:** このスタック画面ではタブバーを非表示にする（`navigation-structure.md` §5.3 準拠）。
その代わりコメント入力バーが画面下部に固定表示される。

---

## 4. コンポーネント分割

```
PostDetailScreen               ← 画面全体
├── PostCard                   ← post-card.md の既存コンポーネント（disableNavigation=true）
├── CommentSectionHeader       ← 「コメント {N}件」見出し
├── CommentList                ← FlatList（コメントセル + ページング）
│   └── CommentCell            ← 1件のコメント表示（返信インデント含む）
│       ├── CommentAvatar      ← アバター（36pt）+ タップで users/[id] へ遷移
│       ├── CommentBody        ← ニックネーム / 日時 / 本文 / アクション行
│       └── CommentActions     ← いいね・返信ボタン
├── CommentInput                ← 入力バーコンテナ（キーボード追従 / 宛先表示 / メディア添付 / テキスト入力 / 送信）
│   ├── ReplyTargetBanner       ← 返信先表示行（返信モード時のみ）
│   ├── ImageAttachmentGrid     ← post-composer.md §8 流用（選択済み画像が1枚以上のときのみ表示。最大2枚）
│   ├── VideoAttachmentArea     ← post-composer.md §9 流用（プレミアムかつ動画添付時のみ表示。最大1本）
│   ├── 画像添付ボタン           ← 常時表示（44×44pt）
│   ├── 動画添付ボタン           ← プレミアムユーザーのみ表示（44×44pt）
│   ├── CommentTextInput        ← テキスト入力フィールド + 文字数カウンタ
│   └── CommentSubmitButton     ← 送信ボタン（活性 / 非活性 / 送信中）
└── CommentDeleteDialog        ← 削除確認ダイアログ（Alert / カスタム Modal）
```

### 4.1 props 概要

**CommentCell**

| prop 名 | 意味 |
|---------|------|
| `comment` | コメントデータ（`{ id, content, createdAt, user, parentId, likeCount, isLiked }` 相当）|
| `currentUserId` | 閲覧者のユーザー ID（自分のコメント判定用）|
| `depth` | ネストの深さ（0=トップレベル / 1=返信。現状は最大 1 段）|
| `onReply` | 「返信する」タップコールバック（`parentId`・`nickname` を渡す）|
| `onDelete` | 削除コールバック（`commentId` を渡す）|

**CommentInput**（実装 `components/comment/CommentInput.tsx` の実際の props）

| prop 名 | 型 | 意味 |
|---------|-----|------|
| `replyTarget` | `{ parentId: string; nickname: string } \| null` | 返信先情報 |
| `onCancelReply` | `() => void` | 返信キャンセルコールバック |
| `onSubmit` | `(params: CommentSubmitParams) => void` | 送信コールバック。`CommentSubmitParams = { content: string; parentId?: string; mediaUrls: string[]; mediaTypes: ('image' \| 'video')[] }` |
| `onUploadError` | `(message: string) => void` | メディアアップロード失敗時のコールバック（送信自体はまだ行われていない状態で呼ばれる）|
| `isSubmitting` | `boolean` | 送信中フラグ（ボタン disabled 化・連打防止）|
| `isPremium` | `boolean` | プレミアムユーザーか（動画添付ボタンの表示・画像/動画の枚数上限判定に使用）|

---

## 5. データの流れ

### 5.1 コメント一覧の取得

- `GET /api/v1/posts/{id}/comments`（想定エンドポイント。正本は OpenAPI）
- カーソルベースページネーション（`useInfiniteQuery` + `nextCursor`）
- `queryKeys.comments.byPost(postId)` でキャッシュ管理
- 表示順: 古い順（先頭が最古、末尾が最新）

### 5.2 コメント送信（本文またはメディアのいずれかがあれば送信可）

> **改訂注記（2026-07-13）:** 送信条件を実装に合わせて是正した。`canSubmit = (text.trim().length > 0 || hasMedia) && !isOverLimit && !isBusy`（`hasMedia = images.length > 0 || videoUri !== null`）。本文が空でも画像または動画のみで送信できる（Web `CommentForm` と同一条件）。

1. テキスト入力 + 任意で画像（最大2枚）・動画（プレミアムのみ最大1本）を選択する
2. 送信タップ時、選択済みメディアがあれば `uploadImage()` / `uploadVideo()` で presigned URL 取得 → R2 アップロード（`hooks/use-post-composer.ts` と同じ画像選択フロー。§6.6 参照）。**この間は入力・添付操作をすべて disabled にする**（`isUploading` 状態）
3. アップロード成功後、`POST /api/v1/posts/{id}/comments`（実装確認済み）
   - リクエストボディ: `{ content: string; parentId?: string; mediaUrls: string[]; mediaTypes: ('image' | 'video')[] }`
4. 成功後: `queryKeys.comments.byPost(postId)` および `queryKeys.posts.detail(postId)` を invalidate（コメント数が増えるため）
5. アップロード失敗時: `onUploadError` 経由でエラーメッセージ（`ERR_MEDIA_UPLOAD_FAILED`）を呼び出し元（`PostDetailScreen`）へ伝え、送信自体は行わない（テキスト・選択済みメディアは保持される）

### 5.3 コメント削除

- `DELETE /api/v1/comments/{commentId}`（想定エンドポイント。正本は OpenAPI）
- 成功後: `queryKeys.comments.byPost(postId)` および `queryKeys.posts.detail(postId)` を invalidate

### 5.4 コメントのいいね

- `POST /api/v1/comments/{id}/like`（実装確認済み。`lib/queries/comments.ts`）

### 5.5 必要なデータ項目（コメント 1 件）

| 項目 | 意味 |
|------|------|
| `id` | コメント ID |
| `content` | コメント本文 |
| `createdAt` | 投稿日時 |
| `user` | 投稿者（`{ id, nickname, avatarUrl }`）|
| `parentId` | 返信先コメント ID（`null` はトップレベル）|
| `likeCount` | いいね数 |
| `isLiked` | 閲覧者がいいね済みか |

---

## 6. コメント入力バー（CommentInput）の詳細仕様

### 6.1 固定配置とキーボード追従

- 画面下部に固定する（`KeyboardAvoidingView` の配下に置き、`paddingBottom: Math.max(insets.bottom, spacing3)` でセーフエリアを確保する）
- セーフエリア下端（ホームインジケータ / ナビゲーションバー）の余白は `useSafeAreaInsets().bottom` で確保する
- 入力バーが表示される分だけ、`CommentList` の `contentContainerStyle` に下端の `paddingBottom` を加算して最後のコメントが入力バーに隠れないようにする

### 6.2 テキスト入力フィールド

- `TextInput` の `multiline: true`
- 最小高さ: 40pt（`TEXT_INPUT_MIN_HEIGHT`）/ 最大高さ: 120pt（`TEXT_INPUT_MAX_HEIGHT`）→ それ以上は内部スクロール
- 背景: `colorSurface`（`#fcfcfc`）/ 角丸 `radiusLg`（10pt）/ ボーダー 1pt `colorBorder`
- フォーカス時ボーダー: 2pt `colorBorderFocus`（`#2e2e2e`）
- 内側パディング: `paddingHorizontal: spacing3`（12pt）/ `paddingVertical: spacing2`（8pt）
- `placeholder`: 「コメントを入力...」/ `placeholderTextColor`: `colorTextTertiary`
- `textBase`（14pt / lineHeight 22pt）/ `colorTextPrimary`
- `returnKeyType: "default"`（改行を許容）
- `keyboardType: "default"` / `autoCapitalize: "sentences"`
- `testID="comment-input"`（E2E 用）

### 6.3 文字数カウンタ

- 位置: テキスト入力フィールドの内側下部（`inputWrapper` 内。フィールドの外ではない）
- 表示条件: **フォーカス中、または 1 文字以上入力済みのときのみ**表示する（未フォーカス・空文字のときは非表示）
- `{N} / 500`（`textSm`）
- 通常色: `colorTextTertiary`
- 残り 50 文字以下（`isNearLimit`）: `colorWarning` に変化
- 500 字超過（`isOverLimit`）: `colorError` に変化・送信ボタンを disabled

### 6.4 返信先表示（ReplyTargetBanner）

返信モード（`replyTarget` が non-null）のときのみ、入力フィールドの上部に表示する。

```
┌─────────────────────────────────────────────────────────────┐
│ ↩ @{nickname} への返信                         [✕ キャンセル] │
└─────────────────────────────────────────────────────────────┘
```

- 高さ: 36pt（`REPLY_BANNER_HEIGHT`）/ 角丸 `radiusMd`
- 背景: `colorSurfaceMuted`（`#f0f0f0`）
- 左端: `spacing3` パディング / `return-down-forward-outline` アイコン（Ionicons・12pt / `colorTextSecondary`）+ テキスト `textSm` / `colorTextSecondary`
- `@{nickname}` 部分は `colorTextLink` / `fontWeight: 600`
- 右端: ✕ アイコンボタン（44pt タップターゲット）で返信をキャンセル
- `accessibilityLiveRegion="polite"` / `accessibilityLabel`: 「@{nickname} への返信モード。キャンセルするには ✕ を押してください」

### 6.5 送信ボタン（CommentSubmitButton）

- サイズ: 高さ 44pt（`SUBMIT_BUTTON_HEIGHT`）/ 幅 72pt（最小・`SUBMIT_BUTTON_MIN_WIDTH`）
- テキスト: 「送信する」/ `textSm`（12pt）/ `fontWeight: 600`
- 角丸: `radiusMd`（8pt）

| 状態 | 背景 | テキスト |
|------|------|---------|
| 活性 | `colorActionPrimary`（`#2e2e2e`）| `colorActionPrimaryText`（`#ffffff`）|
| 非活性（未入力・メディアなし / 超過 / 送信中orアップロード中）| `colorSurfaceMuted` | `colorTextTertiary` |
| 送信中・アップロード中 | `colorActionPrimary`（背景は活性時と同じ）| テキスト非表示 + `ActivityIndicator`（白）|

`accessibilityLabel="コメントを送信する"` / `accessibilityState: { disabled: !canSubmit }`

### 6.6 メディア添付（画像・動画）

> **改訂注記（2026-07-13）:** 旧仕様は「MVP では `ImageAttachButton` の配置のみ定義し、実装は基本仕様として含める」という将来対応の位置づけだったが、**画像添付・動画添付は既に実装済み**である（`hooks/use-comment-media.ts`）。

**画像添付ボタン:**
- 常時表示。44 × 44pt（`MEDIA_BUTTON_SIZE`）/ `image-outline` アイコン（Ionicons・20pt / `colorTextTertiary`）
- 上限（`MAX_COMMENT_IMAGES` = **2枚**）に達している、または送信中・アップロード中のときは disabled（`opacity: 0.4`）
- タップ → `expo-image-picker` を起動（複数選択可・残り枚数分まで）。権限がない場合は `Alert.alert()` で設定アプリへの誘導を表示（`post-composer.md` の画像選択エラーフローと同一）
- `accessibilityLabel`: 「画像を添付」

**動画添付ボタン（プレミアムユーザーのみ表示）:**
- `isPremium === true` のときのみ表示。44 × 44pt / `videocam-outline` アイコン（20pt / `colorTextTertiary`）
- 動画が 1 本（`MAX_COMMENT_VIDEOS_PREMIUM` = **1本**）既に選択されている、または送信中・アップロード中のときは disabled
- 無料ユーザーは動画添付ボタン自体が表示されない（`MAX_COMMENT_VIDEOS_FREE` = **0本**。post-composer のようなロックメッセージ表示は行わず、ボタンごと非表示にする点が `VideoAttachmentArea`（post-composer.md §9.1）と異なる）
- `accessibilityLabel`: 「動画を添付」

**選択済みメディアのプレビュー:**
- 画像が 1 枚以上選択されている場合、入力行の上に `post-composer.md` §8 の `ImageAttachmentGrid` をそのまま表示する（追加・削除・上限 2 枚の挙動も同一）
- 動画が選択されている場合（プレミアムのみ）、`post-composer.md` §9.2 の `VideoAttachmentArea` をそのまま表示する

**アップロード失敗時:** `ERR_MEDIA_UPLOAD_FAILED` を `onUploadError` 経由で呼び出し元へ伝える（§5.2 参照）。

---

## 7. CommentCell の詳細仕様

### 7.1 トップレベルコメント

```
┌─────────────────────────────────────────────────────────────┐
│  [アバター 36pt]  {ニックネーム（textMd/fontWeight:600）}   │
│                   {日時（textSm/colorTextSecondary）}   [⋮] │
│                                                             │
│                   {コメント本文（textBase/colorTextPrimary）}│
│                                                             │
│                   [↩ 返信する]  [♡ いいね {N}]             │
└─────────────────────────────────────────────────────────────┘
```

- セルの左右パディング: `spacing4`（16pt）
- セルの上下パディング: `spacing3`（12pt）
- セル間セパレータ: 1pt `colorBorderLight`
- アバターとコメント本文の左揃えのための `marginLeft`: 36pt + `spacing2`（8pt）= 44pt

### 7.2 返信コメント（depth=1）

トップレベルと同じ構造だが、全体を `marginLeft: 44pt`（アバター幅 + 間隔）でインデントする。

```
┌─────────────────────────────────────────────────────────────┐
│  [縦線 2pt colorBorderLight]                                │
│      [アバター 32pt]  {ニックネーム}  {日時}  [⋮]          │
│                       {コメント本文}                         │
│                       [↩ 返信する]  [♡ いいね {N}]         │
└─────────────────────────────────────────────────────────────┘
```

- 返信コメントのアバター: 32pt（トップレベルより小さくして階層を示す）
- 左端に縦線（2pt / `colorBorderLight`）を `marginLeft: 44pt` の位置に描く

**ネスト深さについて:** 現状のコメント構造はフラット（最大 1 段）とする（`navigation-structure.md` §9 未確定事項）。`parentId` があれば depth=1 として表示する。

### 7.3 アバター

- サイズ: 36pt × 36pt（タップ領域は `hitSlop` で 44pt 確保）
- `borderRadius: radiusFull`
- 枠線: 1pt `colorBorder`
- フォールバック: ニックネームの先頭 1 文字 + `colorSurfaceMuted` 背景（`post-card.md` §5.1 と同仕様）
- `accessibilityRole="imagebutton"` / `accessibilityLabel="{nickname}のプロフィールを表示"`
- タップ → `users/[id]` へ遷移

### 7.4 本文テキスト

- `textBase`（14pt / lineHeight 22pt）/ `colorTextPrimary`
- コメントは折り返し全文表示（投稿本文のような「続きを読む」は設けない）
- 最大文字数: 500 文字（サーバー制約。クライアントは送信時にチェック）
- コメントに添付された画像・動画がある場合、本文の下にメディアグリッドを表示する（`post-card.md` の `PostImageGallery` に準ずるサムネイル表示。詳細仕様は投稿カードの画像表示を踏襲）

### 7.5 アクション行（CommentActions）

- 「↩ 返信する」ボタン:
  - テキストボタン / `textSm` / `colorTextSecondary`
  - タップ → `CommentInput` の返信モードを起動（`replyTarget` をセット）し、入力バーにフォーカス
  - `accessibilityRole="button"` / `accessibilityLabel="{nickname}のコメントに返信する"`
- 「♡ いいね {N}」ボタン:
  - 楽観更新（`post-card.md` §10.2 のいいね仕様に準拠）
  - 済み: `colorError`（`#c0392b`）塗りアイコン / 未: `colorTextSecondary` 線アイコン
  - `accessibilityLabel`: 「いいねする。現在 {N} 件」または「いいねを取り消す。現在 {N} 件」
- 各ボタンの最小タップターゲット: 44pt（`hitSlop` で確保）
- ボタン間の `gap`: `spacing3`（12pt）

### 7.6 コメントの「⋮」メニュー

`post-card.md` §13 と `ugc-safety.md` §2.4 に準拠する。

| 閲覧者と投稿者の関係 | メニュー項目 |
|------------------|------------|
| 自分のコメント | 「削除」（`colorError`）|
| 他人のコメント（ログイン済み） | 「コメントを通報」「コメント投稿者をブロック」「コメント投稿者をミュート」|
| 未認証 | ⋮ボタン非表示 |

---

## 8. コメント削除フロー

### 8.1 削除確認ダイアログ

コメントの「⋮ メニュー → 削除」をタップ後に確認ダイアログを表示する。

```
タイトル: 「コメントを削除しますか？」
本文:     「この操作は取り消せません。」
ボタン:
  [キャンセル]  — テキストボタン / colorTextSecondary
  [削除する]    — 塗りつぶし / colorError / colorTextInverse / 高さ 44pt
```

**iOS / Android 差異:**
- iOS: `Alert.alert()`（destructive アクションは OS が赤色で表示）
- Android: カスタムモーダルダイアログ（`colorError` 背景のボタン）

### 8.2 削除処理フロー

```
「削除する」をタップ
  → ダイアログを閉じる
  → コメントセルをグレーアウト（ローカル一時フィードバック）
  → DELETE /api/v1/comments/{commentId}
  → 成功:
      queryKeys.comments.byPost(postId) を invalidate
      queryKeys.posts.detail(postId) を invalidate（コメント数を更新）
      成功トーストは表示しない（セルが消えることで完了が分かる）
  → 失敗:
      コメントセルのグレーアウトを解除する
      エラートーストを表示する（ERR_COMMENT_DELETE_FAILED 相当の定数を使用）
```

**楽観更新の方針:** 削除は影響が確実なため、楽観的にセルを削除（リストから除外）してから API を呼ぶことも可能。ただし失敗時の復元処理を要するため、MVP ではローカルグレーアウト + invalidate の方式を採用する。

---

## 9. コメントリストの仕様

### 9.1 FlatList の構成

- リスト先頭に `PostCard`（`ListHeaderComponent`）を配置し、コメントと同一スクロールに乗せる
- コメント数が多い場合の無限スクロール: `useInfiniteQuery` + `nextCursor` + `onEndReached` でページング
- `keyExtractor`: `comment.id`（安定した ID を使用）
- セパレータ: `ItemSeparatorComponent` で 1pt `colorBorderLight`

### 9.2 スクロール後の入力バーフォーカス

- 「返信する」タップ後: 入力バーを自動フォーカスし、キーボードを表示する
- `ScrollView.scrollToEnd()` でリスト末尾に自動スクロールし、返信対象が見える状態を維持する（実装は frontend が判断）

### 9.3 送信後のリスト反映

- `invalidateQueries` でリスト全体を再フェッチする（自動的に最新コメントが末尾に追加される）
- 楽観更新は行わない（コメント ID がサーバー採番のため、ローカルで代替 ID を使うより invalidate で正確なデータを表示する方が安全）
- 送信成功後: テキスト入力をクリアする（`setText('')`）/ 選択済みメディアをクリアする（`resetMedia()`）/ 返信モードの解除はコールバック側（`PostDetailScreen`）の責務

---

## 10. エッジケース

### 10.1 ローディング

- 投稿詳細取得中: `PostCard` の位置に `PostCardSkeleton` を表示する
- コメント取得中: `NotificationCellSkeleton`（または専用スケルトン）を 3 件表示する
- 2 つのローディングは独立して管理する（コメントがロード中でも投稿本文は表示できれば先に表示する）

### 10.2 空（コメント 0 件）

```
ScreenEmpty（common-states.md 準拠）
  icon: MessageCircle 系アイコン
  title: 「まだコメントはありません」
  description: 「最初のコメントをしてみましょう」
  actionLabel: なし（入力バーが常時表示されているため誘導ボタンは不要）
```

### 10.3 エラー

| エラー種別 | 表示 |
|-----------|------|
| 投稿詳細取得失敗 | `ScreenError`（title: 「投稿を読み込めませんでした」/ `ERR_POST_LOAD_FAILED`）|
| 投稿が存在しない (404) | `ScreenError`（title: 「投稿が見つかりません」/ `ERR_POST_NOT_FOUND` / subLink: 「フィードに戻る」）|
| コメント取得失敗 | 投稿本文は表示したまま、コメントリスト部分に `ScreenError`（インライン表示）|
| コメント送信失敗 | 入力バー上部に `ComposerFormError`（背景 `colorErrorBg` / 左端ボーダー `colorError`）|
| メディアアップロード失敗 | `onUploadError` 経由で `ERR_MEDIA_UPLOAD_FAILED` を表示（§5.2・§6.6 参照）|
| コメント削除失敗 | エラートースト（`ERR_COMMENT_DELETE_FAILED` 相当）|

### 10.4 オフライン

- `OfflineBanner` を画面上部に表示する
- 既存コメントはキャッシュから表示する
- コメント入力バーのテキスト入力・メディア選択は可能だが、送信ボタンタップ時にオフライン検知 → `ComposerFormError` に `ERR_OFFLINE_ACTION` を表示する
- 返信モード中にオフラインになった場合も同じ挙動

### 10.5 権限なし（未認証ユーザー）

- コメントリストは閲覧可能
- コメント入力バーをタップするとログイン誘導のモーダル（または `(auth)/login` への遷移）を表示する
- 「返信する」ボタンも同様にログイン誘導

### 10.6 コメント上限（1 投稿 100 件）

- サーバーが 400 または 429 を返した場合に `ComposerFormError` に文言を表示する
- `ERR_COMMENT_LIMIT_REACHED` 相当の定数を使用
- 既存コメントの閲覧・削除は引き続き可能

### 10.7 ブロック中ユーザーのコメント

- サーバー側でフィルタリング済みのため、コメントリストには表示されない
- クライアント側での個別フィルタは不要

---

## 11. コピー案（文言一覧）

| 箇所 | 文言 |
|------|------|
| ヘッダータイトル | 「投稿」|
| コメント入力 placeholder | 「コメントを入力...」|
| 送信ボタン（通常）| 「送信する」|
| 送信ボタン（送信中）| （スピナーのみ）|
| 画像添付ボタン（accessibilityLabel）| 「画像を添付」|
| 動画添付ボタン（accessibilityLabel）| 「動画を添付」（プレミアムのみ表示）|
| 返信バナー | 「↩ @{nickname} への返信」|
| 返信キャンセルボタン（accessibilityLabel）| 「返信をキャンセル」|
| 「返信する」ボタン | 「返信する」|
| セクション見出し | 「コメント {N}件」|
| 空状態見出し | 「まだコメントはありません」|
| 空状態補足 | 「最初のコメントをしてみましょう」|
| リスト終端 | 「これ以上コメントはありません」|
| 削除確認タイトル | 「コメントを削除しますか？」|
| 削除確認本文 | 「この操作は取り消せません。」|
| 削除確認ボタン（続ける）| 「キャンセル」|
| 削除確認ボタン（削除）| 「削除する」|
| 文字数超過エラー | 「500文字以内で入力してください」|
| コメント上限エラー | 「このスレッドのコメント上限に達しています。」|
| 投稿読み込みエラー | 「投稿を読み込めませんでした」|
| メディアアップロード失敗 | `ERR_MEDIA_UPLOAD_FAILED` の文言（`post-composer.md` と共通の定数）|
| コメント削除エラートースト | 「削除できませんでした。もう一度お試しください。」|
| 未認証誘導文言 | 「コメントするにはログインが必要です。」|

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| コメントセル全体 | `accessibilityLabel`: 「{nickname}、{N}{単位}前、{コメント本文の先頭50文字}」|
| アバター | `accessibilityRole="imagebutton"` / `accessibilityLabel="{nickname}のプロフィールを表示"`|
| 「↩ 返信する」| `accessibilityRole="button"` / `accessibilityLabel="{nickname}のコメントに返信する"` |
| いいねボタン | `accessibilityRole="button"` / `accessibilityLabel="いいねする。現在 {N} 件"` または `"いいねを取り消す"` |
| コメント入力フィールド | `accessibilityLabel="コメントを入力"` / `accessibilityHint="最大500文字"` |
| 画像添付ボタン | `accessibilityRole="button"` / `accessibilityLabel="画像を添付"` / `accessibilityState: { disabled }` |
| 動画添付ボタン | `accessibilityRole="button"` / `accessibilityLabel="動画を添付"` / `accessibilityState: { disabled }` |
| 送信ボタン | `accessibilityRole="button"` / `accessibilityState: { disabled }` / `accessibilityLabel="コメントを送信する"` |
| 返信バナー | `accessibilityLiveRegion="polite"` で返信モード突入を読み上げる |
| フォームエラー | `accessibilityRole="alert"` / `accessibilityLiveRegion="assertive"` |
| 削除確認ダイアログ | `accessibilityRole="alert"` / フォーカスをタイトルに移動 |
| ⋮ メニューボタン | `accessibilityRole="button"` / `accessibilityLabel="コメントのオプションを開く"` |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-card.md`（PostCard）| PostDetail 画面の先頭コンポーネントとして `disableNavigation=true` で流用する |
| `post-card.md` §10（PostCardActions のいいね仕様）| コメントのいいね（CommentActions）も同じ楽観更新 + アニメーション仕様を適用する |
| `post-composer.md` §8（ImageAttachmentGrid）| コメント入力バーの画像添付（最大2枚）にそのまま流用する（§6.6）|
| `post-composer.md` §9（VideoAttachmentArea）| コメント入力バーの動画添付（プレミアムのみ最大1本）に流用する。ただし無料ユーザー向けの「ロックメッセージ表示」は行わず、ボタン自体を非表示にする点が異なる（§6.6）|
| `hooks/use-post-composer.ts` の画像選択フロー | `hooks/use-comment-media.ts` がコメント用の上限値（`MAX_COMMENT_IMAGES` 等）で同じ選択・権限確認フローを提供する |
| `ugc-safety.md` §2.4（コメントの通報導線）| ⋮ メニューの「通報」「ブロック」「ミュート」項目の設計は ugc-safety.md に委ねる。本仕様では削除のみを扱う |
| `auth-forms.md` §0.3（FormErrorMessage）| `ComposerFormError` は同仕様（`colorErrorBg` / 左端ボーダー）で実装する |
| `auth-forms.md` §0.7（KeyboardAvoidingView）| iOS: `behavior="padding"` / Android: `behavior="height"` の設定を踏襲する |
| `common-states.md`（ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner）| 既存 4 コンポーネントをすべて再利用する |
| `navigation-structure.md` §4.3（投稿詳細画面）| `navigation-structure.md` が定義したコメント入力バー仕様をより詳細に具体化したのが本仕様 |

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| コメントのいいね API | `POST /api/v1/comments/{id}/like` が存在するか | core | **解決済み（2026-07-13）**: `lib/queries/comments.ts` で実装確認済み |
| 返信コメントの取得方法 | `parentId` ありのコメントが同一リストに含まれるか（フラット取得）、別途取得（ネスト取得）か | core | 未解決 |
| 画像・動画添付の MVP 対応 | コメントへの画像添付（最大2枚）・動画添付（プレミアムのみ最大1本）は MVP に含めるか | PM | **解決済み（2026-07-13）**: 実装済み。§6.6 参照 |
| 削除の楽観更新 | MVP で楽観的セル削除 vs グレーアウト + invalidate のどちらを採用するか | frontend | 未解決 |
| スクロール位置の管理 | 返信タップ後に入力バーのフォーカスのみ行うか、返信先コメントの位置を表示するスクロールも行うか | frontend | 未解決 |
| コメントの絵文字リアクション | Web 版に存在するか確認。モバイル MVP スコープに含めるか | PM | 未解決 |
