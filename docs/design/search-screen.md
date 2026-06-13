# 検索画面仕様 — Bon_Log Native

作成日: 2026-06-13
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `post-card.md` に準拠
Web 出典: `Bon_Log_cfw/app/(main)/search/page.tsx` / `components/search/SearchBar.tsx` / `components/search/UserSearchResults.tsx` / `components/search/SearchResultsSkeleton.tsx`
API: `GET /api/v1/search/posts` / `GET /api/v1/search/users`（いずれもカーソルベース・Bearer 必須）

---

## 1. 概要・目的

ユーザーと投稿を横断的に検索できる画面。盆栽仲間を探す・特定の投稿を見つける・興味あるジャンルの投稿を発見するユースケースをカバーする。
Web 版の「投稿 / ユーザー / タグ」3 タブ構成から、MVP スコープで現実的な 2 タブ（投稿 / ユーザー）に絞る（タグ検索は将来検討 — §16 参照）。

---

## 2. 画面構成

### 2.1 全体レイアウト

```
┌──────────────────────────────────────────────────────┐
│  [ナビゲーションヘッダー]                              │  ← タブヘッダー / 中央: 「検索」
│                                                      │
│  [検索バー（上部固定）]                               │  ← §3 参照
│                                                      │
│  ─ ─ ─ ─ 入力前（初期状態）─ ─ ─ ─ ─ ─              │
│  [初期状態コンテンツ]                                 │  ← §4 参照
│                                                      │
│  ─ ─ ─ ─ 入力後（検索状態）─ ─ ─ ─ ─ ─              │
│  [セグメント: 投稿 | ユーザー]                        │  ← §5 参照
│  [検索結果リスト（FlatList / 無限スクロール）]         │  ← §6 / §7 参照
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 2.2 検索バーの位置

検索バーはナビゲーションヘッダー直下に固定表示する。スクロール時もヘッダーとともに画面上部に残る。

```
[セーフエリア上端]
[ナビゲーションヘッダー: 「検索」 / 高さ 44pt]
[検索バーコンテナ: padding spacing4 / 背景 colorBackground]
  [SearchBar]
[セパレータ: 1pt / colorBorderLight]
[スクロール可能エリア]
```

---

## 3. 検索バー（SearchBar コンポーネント）

### 3.1 見た目

```
┌──────────────────────────────────────────────────┐
│  [🔍 アイコン]  [テキスト入力 / プレースホルダー]  [✕]│
└──────────────────────────────────────────────────┘
```

| 要素 | 仕様 |
|------|------|
| 外形 | 角丸 `radiusMd`（8pt）/ 背景 `colorSurface` / 枠 1pt `colorBorder` |
| 高さ | 44pt（タップターゲット基準を兼ねる）|
| 左アイコン | Search 系 / 20pt / `colorTextSecondary` / `padding-left: spacing3` |
| テキスト入力 | `textBase`（14pt）/ `colorTextPrimary` / `keyboardType: "default"` |
| プレースホルダー | 「ユーザーや投稿を検索...」/ `colorTextTertiary` |
| クリアボタン（✕）| 入力がある場合のみ表示 / X アイコン 16pt / `colorTextSecondary` / 44pt タップターゲット（`hitSlop`）|
| フォーカス時の枠 | `colorBorderFocus`（`#2e2e2e`）/ 枠を 2pt に太くする |
| フォーカス背景 | `colorBackground`（`#ffffff`）|

### 3.2 キーボードの return キー挙動

- `returnKeyType: "search"`（iOS: 「検索」ラベル / Android: 虫眼鏡アイコン）
- return 押下 → 検索実行（デバウンス経由ではなく即時実行）
- `blurOnSubmit: true`（return 押下でキーボードを閉じる）

### 3.3 クリアボタン（✕）

- タップ → 入力欄を空にする + 検索結果を消して初期状態に戻す
- クリア後のフォーカス: クリアボタンタップ後もフォーカスを入力欄に残す（再入力しやすくするため）

### 3.4 デバウンス方針

- **UX 推奨値: 300ms**（300ms 入力無しの後に API リクエストを発行する）
- 根拠: 日本語 IME（仮名→漢字変換）の確定ラグを考慮し、250ms 未満は変換中に不要なリクエストが走るリスクがある。350ms 以上は入力に対する反応が遅く感じられる
- return キー / 入力欄からフォーカスアウト時はデバウンスを待たず即時実行
- 空文字への変更（クリア）は即時初期状態に遷移し、API リクエストは発行しない
- **frontend への実装依頼:** デバウンスの実装は `hooks/use-debounce.ts`（または相当フック）に分離することを推奨する。入力値の変化ごとに TanStack Query クエリキーを変える方式（`useDebounce(query, 300)` の結果をクエリキーに使う）を想定

### 3.5 iOS / Android 差異

| OS | 考慮事項 |
|----|---------|
| iOS | `keyboardAppearance: "light"` を設定（ライトモード前提）|
| Android | `underlineColorAndroid: "transparent"` を設定してデフォルト下線を消す |

---

## 4. 未入力時（初期状態）

### 4.1 表示内容

```
[検索バー: 空]
─────────────────────────────────────────
[初期状態エリア（スクロール可）]

  「ユーザーや投稿を検索してみましょう」  ← textLg / colorTextPrimary / 中央
  「ニックネームやキーワードを入力してください」  ← textBase / colorTextSecondary
```

- MVP では「最近の検索」「トレンドタグ」「おすすめユーザー」は実装しない（Web では `localStorage` ベースの最近の検索機能があるが、モバイルは AsyncStorage 禁止・secure-store はトークン専用のため保存先がなく、Batch 2d 以降の検討事項とする）
- 初期状態は `ScreenEmpty` コンポーネントを流用し、icon: Search 系 / 見出し・補足は上記文言を渡す

### 4.2 PM へ要判断

「最近の検索」をモバイルでも提供するかどうか。提供する場合、保存先として MMKV 等のローカルストレージを追加導入する必要がある（AsyncStorage は禁止 — CLAUDE.md 核心ルール4）。MVP スコープ外として設計しているが、PM の判断次第で別仕様として追加可能。

---

## 5. セグメント（タブ切替）

### 5.1 レイアウト

```
┌──────────────────────────────────────────────────────┐
│   [投稿]  |  [ユーザー]                              │
└──────────────────────────────────────────────────────┘
```

- 検索バーへの入力が開始された（または確定された）段階で表示する
- セグメントは画面幅いっぱい（`flex: 1` の均等分割）
- 高さ: 44pt（タップターゲット確保）
- 上部にセパレータ 1pt / `colorBorderLight`

### 5.2 アクティブ・非アクティブスタイル

| 状態 | ラベル色 | ボーダー |
|------|---------|---------|
| アクティブ | `colorTextPrimary`（`#1a1a1a`）/ `fontWeight: 700` | 下部 2pt / `colorActionPrimary`（`#2e2e2e`）|
| 非アクティブ | `colorTextSecondary`（`#5c5c5c`）/ `fontWeight: 400` | なし |

- ラベル: `textMd`（15pt）/ `letterSpacingTight`（0.5）
- タップ時の押下フィードバック: 背景 `colorSurfaceMuted` にフェード（`durationFast: 200ms`）
- アクティブ切替アニメーション: ボーダーが `durationNormal: 300ms` でスライド

### 5.3 デフォルト選択

- 初回フォーカス時: 「投稿」タブをデフォルト選択
- セグメント切替時に入力値は保持したまま別タブで同じキーワードを検索

---

## 6. 投稿タブ — 検索結果

### 6.1 レイアウト

`PostCard` コンポーネントをそのまま流用する（`post-card.md` 準拠）。

```
[PostCard 1件]  ← disableNavigation=false（タップで posts/[id]）
[PostCard 2件]
...（FlatList / 無限スクロール）
```

- コンテナの左右パディング: `spacing4`（16pt）
- PostCard 間のマージン: `spacing4`

### 6.2 データ

- `GET /api/v1/search/posts?q={keyword}&cursor={cursor}&limit={limit}`
- レスポンス形式: `{ items: PostCardItem[], nextCursor: string | null }`（フィードと同一 PostCard 形式）
- クエリキー: `['search', 'posts', keyword]`（keyword が変わるたびに別クエリとして扱う）
- `staleTime`: `STALE_TIME_SEARCH_MS`（Web の `UserSearchResults` と同値。`lib/constants/` に定数化）

---

## 7. ユーザータブ — 検索結果

### 7.1 ユーザー結果アイテムのレイアウト

```
┌──────────────────────────────────────────────────────┐  padding: spacing4
│  [アバター 44pt]  [ニックネーム]                      │
│                   [bio 1行省略]（省略可）              │
│                   [{N}フォロワー]                    │
└──────────────────────────────────────────────────────┘
```

**詳細:**

| 要素 | 仕様 |
|------|------|
| アバター | 44pt × 44pt / `borderRadius: radiusFull` / `expo-image` / フォールバック: 先頭 1 文字 + `colorSurfaceMuted` 背景 |
| アバター `accessibilityLabel` | 「{nickname}のプロフィール画像」|
| ニックネーム | `textMd`（15pt）/ `fontWeight: 600` / `colorTextPrimary` / 1 行 / `ellipsizeMode: "tail"` |
| bio | `textBase`（14pt）/ `colorTextSecondary` / 1 行 / `ellipsizeMode: "tail"` / bio が null または空文字の場合は非表示 |
| フォロワー数 | `textSm`（12pt）/ `colorTextSecondary` / 「{N}フォロワー」/ フォロワー数が 0 のときも「0フォロワー」と表示 |
| 行全体 | `colorSurface` 背景 / `radiusLg` 角丸 / `shadow-washi` / タップで `users/{id}` |
| 行間隔 | `spacing3`（12pt）|

### 7.2 ユーザーアイテムのタップ挙動

- アイテム全体タップ → `users/{id}`（他ユーザープロフィール画面）
- タップ領域: 行全体（最小 72pt 高さ以上）

### 7.3 データ

- `GET /api/v1/search/users?q={keyword}&cursor={cursor}&limit={limit}`
- レスポンス `SearchUsersResponse.items[]`: `{ id, nickname, avatarUrl, bio, followersCount, followingCount }`
- クエリキー: `['search', 'users', keyword]`
- `staleTime`: `STALE_TIME_SEARCH_MS`

---

## 8. 状態とインタラクション

### 8.1 検索フロー全体

```
[初期状態]
    ↓ 入力開始（フォーカス）
[入力中 / デバウンス待ち]
    ↓ 300ms 入力なし or return 押下
[検索実行中（ローディング）]
    ↓
[検索結果表示] / [空（結果なし）] / [エラー]
    ↓ ✕ ボタン or 入力をすべて削除
[初期状態に戻る]
```

### 8.2 セグメント切替

- 「投稿」→「ユーザー」: 現在の入力値で即時ユーザー検索を実行
- 「ユーザー」→「投稿」: 現在の入力値で即時投稿検索を実行
- 切替時: 前のタブのスクロール位置はリセットしない（`SectionList` / `FlatList` の `ref` で制御。frontend 実装判断に委ねる）

### 8.3 pull-to-refresh

- 投稿タブ・ユーザータブ、それぞれのアクティブな FlatList で `refetch()` を呼び出す
- リフレッシュ中インジケータ: `RefreshControl` 標準（`colorActionPrimary`）

### 8.4 無限スクロール

- リスト末尾付近（残り 3 件）で `fetchNextPage`
- 追加フェッチ中: リスト末尾にスピナー（`colorActionPrimary`）
- 終端: 「これ以上結果はありません」（`textSm` / `colorTextSecondary`）

### 8.5 キーボード / スクロール

- 検索結果をスクロールしたらキーボードを閉じる（`keyboardDismissMode: "on-drag"` を FlatList に設定）

---

## 9. エッジケース（4 状態）

各状態は投稿タブ・ユーザータブそれぞれに独立して発生する。

| 状態 | 発生条件 | 表示 |
|------|---------|------|
| ローディング | 検索実行直後（`isLoading=true`）| `SearchResultsSkeleton`（後述 §9.1）|
| 空（結果なし） | `items.length === 0` かつ `isLoading=false` | `ScreenEmpty`（§9.2 参照）|
| エラー | API 失敗（`isError=true`）| `ScreenError`（§9.3 参照）|
| オフライン | NetInfo: オフライン | `OfflineBanner` + キャッシュあれば結果表示 / なければ `ScreenEmpty`（§9.4）|

### 9.1 ローディング — SearchResultsSkeleton

投稿タブ・ユーザータブで共通のスケルトンを使う（アイテム形状の共通化 — Web の `SearchResultsSkeleton.tsx` に準拠）。

```
┌────────────────────────────────────────┐  padding: spacing4 / animate-pulse
│  [Circle 44x44]  [Rect 100x14]         │  ← アバター + テキスト行 1
│                  [Rect 80x12]          │  ← テキスト行 2
├────────────────────────────────────────┤
│  [Rect 100% x 14]                      │  ← 本文行 1（投稿タブのみ）
│  [Rect 75% x 14]                       │  ← 本文行 2
└────────────────────────────────────────┘
```

- 表示件数: 3 件（`ScreenLoading` の `skeletonCount=3` 相当）
- `useNativeDriver: true` のシマーアニメーション

### 9.2 空状態

| タブ | 見出し | 補足 |
|------|--------|------|
| 投稿（検索後） | 「「{keyword}」の投稿は見つかりませんでした」| 「別のキーワードでお試しください」|
| ユーザー（検索後） | 「「{keyword}」に一致するユーザーはいません」| 「別のキーワードでお試しください」|

- `ScreenEmpty` を流用。icon: Search 系アイコン / `actionLabel` なし

### 9.3 エラー

| 場面 | タイトル | 補足 | アクション |
|------|---------|------|----------|
| 投稿検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED`（`errors.ts` 定数）| 「再試行」→ `refetch()`|
| ユーザー検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED` | 「再試行」→ `refetch()`|

- `ScreenError` コンポーネントを流用（`common-states.md` 準拠）

### 9.4 オフライン

- `OfflineBanner` を画面最上部に表示
- オフライン状態で検索バーに入力 → デバウンス後の API リクエストを発行しない（`isOffline` フラグで抑制。frontend 実装判断）
- 「オフラインのため検索できません。接続を確認してください。」のメッセージを `ScreenEmpty` 相当で表示（`OfflineBanner` のメッセージと重複しないよう簡略化してよい）

---

## 10. コンポーネント分割

```
SearchScreen                  ← 画面ルート。検索状態・セグメント状態・クエリフック統合
├── SearchBar                 ← 検索バー（再利用可能コンポーネント / 他画面でも使い回し可）
├── SearchSegmentTabs         ← 投稿/ユーザー切替セグメント
├── PostSearchResults         ← 投稿タブ内コンテンツ（FlatList + PostCard）
│   ├── PostCard              ← 流用（post-card.md）
│   ├── SearchResultsSkeleton ← ローディング状態
│   ├── ScreenEmpty           ← 空状態（共通）
│   └── ScreenError           ← エラー状態（共通）
├── UserSearchResults         ← ユーザータブ内コンテンツ（FlatList + UserResultItem）
│   ├── UserResultItem        ← ユーザー 1 件（memo 化）
│   ├── SearchResultsSkeleton ← ローディング状態（投稿タブと共用）
│   ├── ScreenEmpty           ← 空状態（共通）
│   └── ScreenError           ← エラー状態（共通）
├── SearchInitialView         ← 未入力時の初期状態（ScreenEmpty の薄い版）
└── OfflineBanner             ← オフライン時（共通）
```

### SearchBar props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `value` | `string` | 外部から制御する入力値（controlled）|
| `onChangeText` | `(text: string) => void` | 入力変化コールバック |
| `onSubmit` | `(text: string) => void` | return / 確定時コールバック |
| `onClear` | `() => void` | ✕ ボタン押下コールバック |
| `placeholder` | `string` | デフォルト: 「ユーザーや投稿を検索...」|
| `autoFocus` | `boolean` | 任意。モーダル内検索用（将来）|

### UserResultItem props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `user` | `SearchUserItem` | `{ id, nickname, avatarUrl, bio, followersCount, followingCount }`|
| `onPress` | `(userId: string) => void` | タップ時のコールバック（画面側で遷移ロジックを持つ）|

---

## 11. 文言一覧（コピー案）

| 場面 | 文言 |
|------|------|
| ヘッダータイトル | 「検索」|
| プレースホルダー | 「ユーザーや投稿を検索...」|
| 初期状態 見出し | 「検索してみましょう」|
| 初期状態 補足 | 「ニックネームやキーワードを入力してください」|
| セグメント タブ 1 | 「投稿」|
| セグメント タブ 2 | 「ユーザー」|
| 投稿 空状態 見出し | 「「{keyword}」の投稿は見つかりませんでした」|
| ユーザー 空状態 見出し | 「「{keyword}」に一致するユーザーはいません」|
| 空状態 補足 | 「別のキーワードでお試しください」|
| エラー タイトル | 「検索できませんでした」|
| エラー 補足 | 「もう一度お試しください。」|
| 追加フェッチ中 | 「読み込み中...」|
| 終端 | 「これ以上結果はありません」|
| オフライン入力抑制 | 「オフライン中のため検索できません。」|
| フォロワー数表示 | 「{N}フォロワー」|

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 検索バー入力欄 | `accessibilityRole="search"` / `accessibilityLabel`: 「ユーザーや投稿を検索」|
| クリアボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「検索をクリア」/ タップターゲット 44pt（`hitSlop`）|
| セグメント「投稿」 | `accessibilityRole="tab"` / `accessibilityState: { selected: isActive }`|
| セグメント「ユーザー」 | `accessibilityRole="tab"` / `accessibilityState: { selected: isActive }`|
| ユーザー結果アイテム | `accessibilityRole="button"` / `accessibilityLabel`: 「{nickname}。{bio の先頭 50 文字}。{フォロワー数}フォロワー。プロフィールを表示」|
| ユーザーアバター | `accessibilityRole="image"` / `accessibilityLabel`: 「{nickname}のプロフィール画像」/ `accessibilityElementsHidden={true}`（アイテム全体の label に含まれるため）|
| スケルトン | `accessibilityElementsHidden={true}` + コンテナに `accessibilityLabel`: 「読み込み中」|

タップターゲット: ユーザーアイテム全体（最小 72pt 高さ）+ 検索バー 44pt + セグメントタブ 44pt でいずれも基準を満たす。

---

## 13. 使用デザイントークン

| 要素 | トークン |
|------|---------|
| 検索バー背景（通常）| `colorSurface`（`#fcfcfc`）|
| 検索バー背景（フォーカス）| `colorBackground`（`#ffffff`）|
| 検索バー枠（通常）| 1pt / `colorBorder`（`#c8c8c8`）|
| 検索バー枠（フォーカス）| 2pt / `colorBorderFocus`（`#2e2e2e`）|
| 検索アイコン | `colorTextSecondary`（`#5c5c5c`）|
| プレースホルダー | `colorTextTertiary`（`#8a8a8a`）|
| 入力テキスト | `textBase` / `colorTextPrimary` |
| セグメント背景 | `colorBackground` |
| セグメントボーダー（アクティブ）| 2pt / `colorActionPrimary`（`#2e2e2e`）|
| セグメントラベル（アクティブ）| `textMd` / `fontWeight: 700` / `colorTextPrimary` |
| セグメントラベル（非アクティブ）| `textMd` / `fontWeight: 400` / `colorTextSecondary` |
| ユーザーアイテム背景 | `colorSurface` |
| ユーザーアイテム枠 | `shadow-washi`（iOS: opacity 0.06 / Android: elevation 2）|
| ニックネーム | `textMd` / `fontWeight: 600` / `colorTextPrimary` |
| bio | `textBase` / `colorTextSecondary` |
| フォロワー数 | `textSm` / `colorTextSecondary` |

---

## 14. パフォーマンス

- `UserResultItem` を `React.memo` 化する（FlatList 内での再レンダリング抑制）
- `PostCard` はすでに `memo` 化済み（`post-card.md` §18 参照）
- FlatList: `removeClippedSubviews={true}`・`maxToRenderPerBatch={10}`（推奨初期値 — 実機計測後に調整）
- ユーザーアイテムの `getItemLayout` または `estimatedItemSize`（推奨: 72pt）を設定してスクロールのジャンクを防ぐ
- クエリキーに `keyword` を含めることで、入力が変わるたびに古いキャッシュを使わず独立したクエリとして管理する（連続入力でリクエストが多発しないようデバウンスが必須）

---

## 15. 既存との一貫性メモ

| Web 要素 | モバイル対応 |
|---------|-----------|
| `SearchBar.tsx`（最近の検索機能込み） | 最近の検索は MVP 外。`value`/`onChangeText`/`onSubmit`/`onClear` の controlled 入力バーとして再実装。デバウンスは呼び出し側（`SearchScreen`）で管理 |
| `SearchTabs`（Web: 投稿/ユーザー/タグ 3 タブ）| タグ検索は MVP 外として 2 タブに絞る（`SearchSegmentTabs` として実装）|
| `UserSearchResults.tsx` の `User` 型 | §7.3 の `SearchUserItem` として踏襲（`followingCount` も含む — 将来の「フォロー」ボタン追加時に使用）|
| Web 空状態文言「${query}」に一致するユーザーはいません | §11 の同文言に踏襲 |
| `STALE_TIME_SEARCH_MS` 定数 | モバイルの `lib/constants/` に同値で定義（frontend に実装依頼）|

---

## 16. 未確定事項・要判断

- **タグ検索のスコープ:** Web 版には `tab=tags` が存在するが、MVP のモバイル版では省いた。提供する場合は `SearchSegmentTabs` に 3 タブ目を追加し、`GET /api/v1/search/posts?q=#{tag}` 相当の API が必要（core に要確認）。
- **ジャンルフィルター:** Web 版の投稿検索には `genre` フィルターがある（`GenreFilter` / `AdvancedSearchFilters`）。モバイルでの提供可否は PM 判断。提供する場合、フィルターシートのUI仕様を別途策定する。
- **最近の検索:** §4 参照。LocalStorage の代替保存先（MMKV 等）の追加導入が必要。PM 判断次第。
- **検索バーをヘッダーに埋め込む案:** 一部の SNS アプリではボトムタブの検索タブに直接フォーカスした状態でヘッダー内にバーを表示するパターンがある。現仕様は「ヘッダー直下に固定」としているが、iOS / Android のナビゲーションヘッダー標準（`searchBar` prop）を使うかどうかは frontend に実装判断を委ねる。
- **`followingCount` の使い道:** `SearchUsersResponse` に含まれているが、MVP の UI（ユーザーアイテム）には表示しない。将来の「フォロー中 / フォロワー」一覧表示時に使用する想定。
