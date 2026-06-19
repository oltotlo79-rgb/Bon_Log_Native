# コメント投稿・返信・削除 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-19
対象画面:
- `posts/[id]` — 投稿詳細画面（コメント投稿 UI はこの画面に内包）

前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §4.3（投稿詳細画面）・§5.2（戻る挙動）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-card.md`（PostCard コンポーネント）・`ugc-safety.md`（通報・ブロック）と連携する
- 通報・ブロックの UI は `ugc-safety.md` §2.4（コメント通報導線）に委ねる。本仕様では投稿・削除に集中する

---

## 1. 概要・目的

投稿詳細画面（`posts/[id]`）において、コメントの閲覧・投稿・返信・削除を行う UI を定義する。
コメント入力バーは画面下部に固定表示し、キーボード表示時も入力バーがキーボード直上に追従する。

### 1.1 解決する問題

- モバイルでのコメント投稿 UX を、入力バーが常に見える形で実現する（Web と異なるモバイル固有の固定配置）
- 返信（parentId 指定）時の宛先表示を分かりやすくする
- 自分のコメントを安全に削除できる導線を提供する

---

## 2. 画面構成（ワイヤーフレーム）

### 2.1 投稿詳細画面の全体構成

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
│ │ ┌─────────────────────────────────────┐  [送信ボタン] │ │
│ │ │ コメントを入力...                   │               │ │
│ │ └─────────────────────────────────────┘               │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ← [セーフエリア下端]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 コメント入力バー（キーボード表示時）

```
┌─────────────────────────────────────────────────────────────┐
│ [キーボード]                                                 │
│                                                             │
│ [コメント入力バー（キーボード直上に追従）]                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [宛先表示（返信時のみ）]         [✕ 返信キャンセル]     │ │
│ │ ┌──────────────────────────────┐ ┌──────────┐          │ │
│ │ │ コメントを入力...（多行対応）│ │  送信する │          │ │
│ │ └──────────────────────────────┘ └──────────┘          │ │
│ │ 右下: {N} / 500  [画像アイコン]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

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
├── CommentInput               ← 入力バーコンテナ（キーボード追従 / 宛先表示 / テキスト入力 / 送信）
│   ├── ReplyTargetBanner      ← 返信先表示行（返信モード時のみ）
│   ├── CommentTextInput       ← テキスト入力フィールド + 文字数カウンタ
│   ├── ImageAttachButton      ← 画像添付ボタン（将来対応 / MVP は配置のみ）
│   └── CommentSubmitButton    ← 送信ボタン（活性 / 非活性 / 送信中）
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

**CommentInput**

| prop 名 | 意味 |
|---------|------|
| `replyTarget` | 返信先情報（`{ parentId: string; nickname: string } | null`）|
| `onCancelReply` | 返信キャンセルコールバック |
| `onSubmit` | 送信コールバック（`{ content: string; parentId?: string; images?: string[] }` を渡す）|
| `isSubmitting` | 送信中フラグ（ボタン disabled 化・連打防止）|
| `isPremium` | プレミアムユーザーか（画像制限の判定に使用）|

---

## 5. データの流れ

### 5.1 コメント一覧の取得

- `GET /api/v1/posts/{id}/comments`（想定エンドポイント。正本は OpenAPI）
- カーソルベースページネーション（`useInfiniteQuery` + `nextCursor`）
- `queryKeys.comments.byPost(postId)` でキャッシュ管理
- 表示順: 古い順（先頭が最古、末尾が最新）

### 5.2 コメント送信

1. テキスト入力 + 任意で画像選択（画像は presigned URL → R2 アップロード）
2. `POST /api/v1/posts/{id}/comments`（想定エンドポイント）
   - リクエスト body（想定）: `{ content: string; parentId?: string; mediaUrls?: string[] }`
3. 成功後: `queryKeys.comments.byPost(postId)` および `queryKeys.posts.detail(postId)` を invalidate（コメント数が増えるため）

### 5.3 コメント削除

- `DELETE /api/v1/comments/{commentId}`（想定エンドポイント。正本は OpenAPI）
- 成功後: `queryKeys.comments.byPost(postId)` および `queryKeys.posts.detail(postId)` を invalidate

### 5.4 必要なデータ項目（コメント 1 件）

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

- `position: absolute` + `bottom: 0` で画面下部に固定する
- `KeyboardAvoidingView`（iOS: `behavior="padding"` / Android: `behavior="height"`）でキーボード表示時に入力バーが押し上げられるようにする
- セーフエリア下端（ホームインジケータ / ナビゲーションバー）の余白は `useSafeAreaInsets().bottom` で確保する
- 入力バーが表示される分だけ、`CommentList` の `contentContainerStyle` に下端の `paddingBottom` を加算して最後のコメントが入力バーに隠れないようにする

### 6.2 テキスト入力フィールド

- `TextInput` の `multiline: true`
- 最小高さ: 40pt（1 行）/ 最大高さ: 120pt（約 5 行）→ それ以上は内部スクロール
- 背景: `colorSurface`（`#fcfcfc`）/ 角丸 `radiusLg`（10pt）/ ボーダー 1pt `colorBorder`
- フォーカス時ボーダー: 2pt `colorBorderFocus`（`#2e2e2e`）
- 内側パディング: `paddingHorizontal: spacing3`（12pt）/ `paddingVertical: spacing2`（8pt）
- `placeholder`: 「コメントを入力...」/ `placeholderTextColor`: `colorTextTertiary`
- `textBase`（14pt / lineHeight 22pt）/ `colorTextPrimary`
- `returnKeyType: "default"`（改行を許容）
- `keyboardType: "default"` / `autoCapitalize: "sentences"`

### 6.3 文字数カウンタ

- テキスト入力フィールド右下（フィールド外・入力バー内）
- `{N} / 500`（`textSm` / `colorTextSecondary`）
- 残り 50 文字以下: `colorWarning` に変化
- 500 字超過: `colorError` に変化・送信ボタンを disabled

### 6.4 返信先表示（ReplyTargetBanner）

返信モード（`replyTarget` が non-null）のときのみ、入力フィールドの上部に表示する。

```
┌─────────────────────────────────────────────────────────────┐
│ ↩ @{nickname} への返信                         [✕ キャンセル] │
└─────────────────────────────────────────────────────────────┘
```

- 高さ: 36pt
- 背景: `colorSurfaceMuted`（`#f0f0f0`）
- 左端: `spacing3` パディング / ↩ アイコン（12pt / `colorTextSecondary`）+ テキスト `textSm` / `colorTextSecondary`
- `@{nickname}` 部分は `colorTextLink`（`#2e2e2e`）/ `fontWeight: 600`
- 右端: ✕ アイコンボタン（44pt タップターゲット）で返信をキャンセル
- `accessibilityLabel`: 「@{nickname} への返信モード。キャンセルするには ✕ を押してください」

### 6.5 送信ボタン（CommentSubmitButton）

- サイズ: 高さ 44pt / 幅 72pt（最小）
- テキスト: 「送信する」/ `textSm`（12pt）/ `fontWeight: 600`
- 角丸: `radiusMd`（8pt）

| 状態 | 背景 | テキスト |
|------|------|---------|
| 活性 | `colorActionPrimary`（`#2e2e2e`）| `colorActionPrimaryText`（`#ffffff`）|
| 非活性（未入力 / 超過）| `colorSurfaceMuted` | `colorTextTertiary` |
| 送信中 | `colorActionPrimary` | テキスト非表示 + スピナー（白）|

### 6.6 画像添付ボタン

- 入力フィールド左下またはツールバーエリアにカメラアイコンボタン（44pt × 44pt）
- `accessibilityLabel`: 「画像を添付」
- MVP では `ImageAttachButton` の配置のみ定義し、タップ時の実装（`expo-image-picker` 起動）は基本仕様として含める
- 画像添付後はサムネイル行を入力バー上部に横スクロールで表示する（仕様詳細は `post-composer.md` §8 の ImageAttachmentGrid に準拠する）

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
- 送信成功後: キーボードを閉じる / テキスト入力をクリアする / 返信モードを解除する

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
| コメント削除失敗 | エラートースト（`ERR_COMMENT_DELETE_FAILED` 相当）|

### 10.4 オフライン

- `OfflineBanner` を画面上部に表示する
- 既存コメントはキャッシュから表示する
- コメント入力バーのテキスト入力は可能だが、送信ボタンタップ時にオフライン検知 → `ComposerFormError` に `ERR_OFFLINE_ACTION` を表示する
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
| `ugc-safety.md` §2.4（コメントの通報導線）| ⋮ メニューの「通報」「ブロック」「ミュート」項目の設計は ugc-safety.md に委ねる。本仕様では削除のみを扱う |
| `auth-forms.md` §0.3（FormErrorMessage）| `ComposerFormError` は同仕様（`colorErrorBg` / 左端ボーダー）で実装する |
| `auth-forms.md` §0.7（KeyboardAvoidingView）| iOS: `behavior="padding"` / Android: `behavior="height"` の設定を踏襲する |
| `common-states.md`（ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner）| 既存 4 コンポーネントをすべて再利用する |
| `navigation-structure.md` §4.3（投稿詳細画面）| `navigation-structure.md` が定義したコメント入力バー仕様（「コメント入力バー（画面下部 / キーボード上に追従）」「アバター（小）/ テキスト入力 / 送信ボタン」）をより詳細に具体化したのが本仕様 |

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| コメントのいいね API | `POST /api/v1/comments/{id}/like` が存在するか。または投稿いいねと共通のエンドポイントか | core（要確認）|
| 返信コメントの取得方法 | `parentId` ありのコメントが同一リストに含まれるか（フラット取得）、別途取得（ネスト取得）か | core（要確認）|
| 画像添付の MVP 対応 | コメントへの画像添付（最大 2 枚）は MVP に含めるか後続フェーズか。入力バーの画像ボタン配置の有無に影響する | PM（要判断）|
| 削除の楽観更新 | MVP で楽観的セル削除 vs グレーアウト + invalidate のどちらを採用するか | frontend（要判断）|
| スクロール位置の管理 | 返信タップ後に入力バーのフォーカスのみ行うか、返信先コメントの位置を表示するスクロールも行うか | frontend（要判断）|
| コメントの絵文字リアクション | Web 版に存在するか確認。モバイル MVP スコープに含めるか | PM（要判断）|
