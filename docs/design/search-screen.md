# 検索画面仕様 — Bon_Log Native

作成日: 2026-06-13
改訂: 2026-07-14（§4「最近の検索」の記述を是正 — 当初「MVP 外・AsyncStorage 禁止のため保存先がない」としていたが誤りだった。CLAUDE.md 核心ルール4「トークンは expo-secure-store のみ」が禁じるのは認証トークンの AsyncStorage 保存であり、検索クエリ文字列は対象外。実装 `hooks/use-recent-searches.ts` ＋ `components/search/RecentSearchesPanel.tsx` で実装済みのため実態に合わせて修正した。関連して §15・§16 の該当箇所も追従修正。同日、投稿・ユーザー・タグの 3 タブ実装と未入力時の人気タグ表示に合わせて更新）
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `post-card.md` に準拠
Web 出典: `Bon_Log_cfw/app/(main)/search/page.tsx` / `components/search/SearchBar.tsx` / `components/search/UserSearchResults.tsx` / `components/search/SearchResultsSkeleton.tsx`
API: `GET /api/v1/search/posts` / `GET /api/v1/search/users` / `GET /api/v1/search/hashtags` / `GET /api/v1/explore/trending-hashtags`

---

## 1. 概要・目的

投稿・ユーザー・タグを横断的に検索できる画面。盆栽仲間を探す・特定の投稿を見つける・興味あるジャンルやタグの投稿を発見するユースケースをカバーする。
Web 版に準拠した「投稿 / ユーザー / タグ」3 タブ構成とし、タブはクエリの有無に関わらず表示する。

---

## 2. 画面構成

### 2.1 全体レイアウト

```
┌──────────────────────────────────────────────────────┐
│  [ナビゲーションヘッダー]                              │  ← タブヘッダー / 中央: 「検索」
│                                                      │
│  [検索バー（上部固定）]                               │  ← §3 参照
│                                                      │
│  [セグメント: 投稿 | ユーザー | タグ]                 │  ← §5 参照（常時表示）
│                                                      │
│  [投稿/ユーザー: 初期状態または検索結果]               │  ← §4 / §6 / §7 参照
│  [タグ: 人気タグまたはタグ検索結果]                      │
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
| プレースホルダー | 「投稿・ユーザー・タグを検索...」/ `colorTextTertiary` |
| クリアボタン（✕）| 入力がある場合のみ表示 / X アイコン 16pt / `colorTextSecondary` / 44pt タップターゲット（`hitSlop`）|
| フォーカス時の枠 | `colorBorderFocus`（`#2e2e2e`）/ 枠を 2pt に太くする |
| フォーカス背景 | `colorBackground`（`#ffffff`）|

### 3.2 キーボードの return キー挙動

- `returnKeyType: "search"`（iOS: 「検索」ラベル / Android: 虫眼鏡アイコン）
- return 押下 → 検索実行（デバウンス経由ではなく即時実行）
- `blurOnSubmit: true`（return 押下でキーボードを閉じる）

### 3.3 クリアボタン（✕）

- タップ → 入力欄を空にする + 検索結果を消す。投稿・ユーザータブは初期状態、タグタブは人気タグ表示に戻る
- クリア後のフォーカス: クリアボタンタップ後もフォーカスを入力欄に残す（再入力しやすくするため）

### 3.4 デバウンス方針

- **UX 推奨値: 300ms**（300ms 入力無しの後に API リクエストを発行する）
- 根拠: 日本語 IME（仮名→漢字変換）の確定ラグを考慮し、250ms 未満は変換中に不要なリクエストが走るリスクがある。350ms 以上は入力に対する反応が遅く感じられる
- return キー / 入力欄からフォーカスアウト時はデバウンスを待たず即時実行
- 空文字への変更（クリア）は即時反映する。投稿・ユーザー検索 API は発行せず、タグタブでは人気タグクエリを表示する
- **frontend への実装依頼:** デバウンスの実装は `hooks/use-debounce.ts`（または相当フック）に分離することを推奨する。入力値の変化ごとに TanStack Query クエリキーを変える方式（`useDebounce(query, 300)` の結果をクエリキーに使う）を想定

### 3.5 iOS / Android 差異

| OS | 考慮事項 |
|----|---------|
| iOS | `keyboardAppearance: "light"` を設定（ライトモード前提）|
| Android | `underlineColorAndroid: "transparent"` を設定してデフォルト下線を消す |

---

## 4. 未入力時（投稿・ユーザーの初期状態）と「最近の検索」

### 4.1 表示内容（履歴なし、またはフォーカスなし）

```
[検索バー: 空]
─────────────────────────────────────────
[セグメント: 投稿 | ユーザー | タグ]
[初期状態エリア（スクロール可）]

  「検索してみましょう」  ← textLg / colorTextPrimary / 中央
  「ニックネーム、キーワード、#タグを入力してください」  ← textBase / colorTextSecondary
```

- 初期状態は `ScreenEmpty` コンポーネントを流用し、icon: Search 系 / 見出し・補足は上記文言を渡す
- 上記は「検索バーにフォーカスがない」または「フォーカスはあるが検索履歴が0件」の場合の表示。フォーカス中かつ検索履歴が1件以上ある場合は §4.2「最近の検索」パネルに置き換わる（実装 `app/(tabs)/search/index.tsx` の `showRecentSearches` 判定）
- タグタブを選択した場合、未入力でも初期案内には戻らず、`HashtagSearchResults` が人気タグ上位 10 件を表示する

### 4.2 「最近の検索」（実装済み）

**（2026-07-14 是正）: 本節は当初「MVP では『最近の検索』『トレンドタグ』『おすすめユーザー』は実装しない（Web には `localStorage` ベースの最近の検索機能があるが、モバイルは AsyncStorage 禁止・secure-store はトークン専用のため保存先がなく、Batch 2d 以降の検討事項とする）」としていたが誤りだった。**

**CLAUDE.md 核心ルール4「トークンは expo-secure-store のみ」が禁じているのは認証トークンの AsyncStorage 保存であり、検索クエリ文字列はトークンでも個人を特定する秘匿情報でもないため同ルールの対象外である。** 実際には Web 版と同等の「最近の検索」機能が AsyncStorage を保存先として実装済みである。以下は実装 `hooks/use-recent-searches.ts`・`components/search/RecentSearchesPanel.tsx`・`app/(tabs)/search/index.tsx` に基づく現状の記述。人気タグ表示も `HashtagSearchResults` と `useTrendingHashtagsQuery` で実装済み。おすすめユーザーはこれらとは別機能で、引き続き MVP スコープ外。

表示条件（`app/(tabs)/search/index.tsx` の `showRecentSearches`）: 投稿またはユーザータブで、検索バーが**フォーカス中** かつ 入力が**空** かつ 検索履歴が**1件以上**。

```
[検索バー: フォーカス中・空]
─────────────────────────────────────────
┌──────────────────────────────────────────────────────┐
│  最近の検索                          [すべて削除]     │  ← パネルヘッダー
├──────────────────────────────────────────────────────┤
│  🕐 黒松                                        [✕]  │  ← 履歴1件（タップで即検索）
├──────────────────────────────────────────────────────┤
│  🕐 #盆栽初心者                                  [✕]  │
├──────────────────────────────────────────────────────┤
│  ...（新しい順・最大 MAX_RECENT_SEARCHES 件）           │
└──────────────────────────────────────────────────────┘
```

**永続化:**

| 項目 | 内容 |
|------|------|
| 保存先 | `AsyncStorage`（`@react-native-async-storage/async-storage`）。キー `STORAGE_KEY_RECENT_SEARCHES`（値: `bon_log_recent_searches`。`lib/constants/async-storage-keys.ts`）|
| 上限件数 | `MAX_RECENT_SEARCHES`（10 件。`lib/constants/limits/ui.ts`。Web 版 cfw の同名定数と同値）|
| 追加ルール | 検索実行（return 押下 / 履歴タップ）のたびに先頭へ追加し、既存の同じクエリを重複除去してから上限で切り詰める（cfw の `SearchBar.tsx`（`localStorage` 版）と同じ「先頭追加・重複除去・上限切り詰め」方針を非同期ストレージ向けに再現）|
| 破損データ・書き込み失敗 | クラッシュさせず握りつぶす（読込失敗は空配列に倒す。書込失敗はユーザー操作を継続させる）|

**行の挙動:**

- 時計アイコン（`time-outline`）+ クエリ文字列（1行省略）をタップ → 該当クエリで即検索を実行し、履歴の先頭へ再登録し、検索バーからフォーカスを外す
- 行右端の `✕` ボタン（44pt タップターゲット。`hitSlop`）→ その1件のみ履歴から削除
- パネルヘッダーの「すべて削除」→ 履歴を全消去（`AsyncStorage` のキー自体を削除）

**コピー:**

| 要素 | 文言 |
|------|------|
| パネル見出し | 「最近の検索」|
| 全削除ボタン | 「すべて削除」|
| 選択行 accessibilityLabel | 「{query}で検索」|
| 削除ボタン accessibilityLabel | 「{query}の履歴を削除」|
| 全削除ボタン accessibilityLabel | 「検索履歴をすべて削除」|

---

## 5. セグメント（タブ切替）

### 5.1 レイアウト

```
┌──────────────────────────────────────────────────────┐
│   [投稿]  |  [ユーザー]  |  [タグ]                  │
└──────────────────────────────────────────────────────┘
```

- 検索クエリの有無に関わらず、検索バー直下に常時表示する
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

- 初回表示時: 「投稿」タブをデフォルト選択
- セグメント切替時に入力値は保持したまま別タブで同じキーワードを検索
- 未入力でタグタブを選択すると人気タグを表示し、投稿・ユーザータブに戻ると初期案内を表示する

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
    ├ タグタブを選択 → [人気タグ表示]
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

- 「投稿」と「ユーザー」の切替: 現在の入力値で選択先の検索を実行する。未入力時はどちらも初期案内を表示する
- 「タグ」への切替: 入力がある場合は同じキーワードでタグ候補を検索し、未入力の場合は人気タグを表示する
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

各状態は投稿・ユーザー・タグの各タブで独立して発生する。タグタブは未入力時の人気タグ取得にもローディング・空・エラー状態を持つ。

| 状態 | 発生条件 | 表示 |
|------|---------|------|
| ローディング | 検索実行直後（`isLoading=true`）| `SearchResultsSkeleton`（後述 §9.1）|
| 空（結果なし） | `items.length === 0` かつ `isLoading=false` | `ScreenEmpty`（§9.2 参照）|
| エラー | API 失敗（`isError=true`）| `ScreenError`（§9.3 参照）|
| オフライン | NetInfo: オフライン | `OfflineBanner` + キャッシュあれば結果表示 / なければ `ScreenEmpty`（§9.4）|

### 9.1 ローディング — SearchResultsSkeleton

投稿タブ・ユーザータブで共通のスケルトンを使う（アイテム形状の共通化 — Web の `SearchResultsSkeleton.tsx` に準拠）。タグタブはコンパクトな `ActivityIndicator` を表示する。

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
| タグ（検索後） | 「「#{keyword}」に一致するタグはありません」| 「別のキーワードでお試しください」|
| タグ（未入力） | 「人気のタグはまだありません」| 「投稿が増えるとここに人気のタグが表示されます」|

- `ScreenEmpty` を流用。icon: Search 系アイコン / `actionLabel` なし

### 9.3 エラー

| 場面 | タイトル | 補足 | アクション |
|------|---------|------|----------|
| 投稿検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED`（`errors.ts` 定数）| 「再試行」→ `refetch()`|
| ユーザー検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED` | 「再試行」→ `refetch()`|
| タグ検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED` | 「再試行」→ `refetch()`|
| 人気タグ取得失敗 | 「読み込めませんでした」| `ERR_EXPLORE_LOAD_FAILED` | 「再試行」→ `refetch()`|

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
├── SearchSegmentTabs         ← 投稿/ユーザー/タグ切替セグメント（常時表示）
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
├── HashtagSearchResults      ← タグタブ内コンテンツ（未入力: 人気タグ / 入力後: タグ候補）
├── SearchInitialView         ← 投稿・ユーザータブの未入力時初期状態（ScreenEmpty の薄い版）
├── RecentSearchesPanel       ← 「最近の検索」パネル（検索バーフォーカス中・未入力・履歴1件以上のときに SearchInitialView と入れ替わる。§4.2 参照。実装 `components/search/RecentSearchesPanel.tsx`）
└── OfflineBanner              ← オフライン時（共通）
```

### SearchBar props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `value` | `string` | 外部から制御する入力値（controlled）|
| `onChangeText` | `(text: string) => void` | 入力変化コールバック |
| `onSubmit` | `(text: string) => void` | return / 確定時コールバック |
| `onClear` | `() => void` | ✕ ボタン押下コールバック |
| `placeholder` | `string` | デフォルト: 「投稿・ユーザー・タグを検索...」|
| `autoFocus` | `boolean` | 任意。モーダル内検索用（将来）|

### UserResultItem props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `user` | `SearchUserItem` | `{ id, nickname, avatarUrl, bio, followersCount, followingCount }`|
| `onPress` | `(userId: string) => void` | タップ時のコールバック（画面側で遷移ロジックを持つ）|

### RecentSearchesPanel props 概要（§4.2）

| prop | 型 | 説明 |
|------|-----|------|
| `searches` | `string[]` | 新しい順・最大 `MAX_RECENT_SEARCHES` 件の検索履歴（`hooks/use-recent-searches.ts` の `searches`）|
| `onSelect` | `(query: string) => void` | 履歴行タップ時のコールバック（即検索実行）|
| `onRemove` | `(query: string) => void` | 個別削除ボタン押下時のコールバック |
| `onClearAll` | `() => void` | 「すべて削除」ボタン押下時のコールバック |

---

## 11. 文言一覧（コピー案）

| 場面 | 文言 |
|------|------|
| ヘッダータイトル | 「検索」|
| プレースホルダー | 「投稿・ユーザー・タグを検索...」|
| 初期状態 見出し | 「検索してみましょう」|
| 初期状態 補足 | 「ニックネーム、キーワード、#タグを入力してください」|
| セグメント タブ 1 | 「投稿」|
| セグメント タブ 2 | 「ユーザー」|
| セグメント タブ 3 | 「タグ」|
| タグ未入力時 見出し | 「人気のタグ」|
| 投稿 空状態 見出し | 「「{keyword}」の投稿は見つかりませんでした」|
| ユーザー 空状態 見出し | 「「{keyword}」に一致するユーザーはいません」|
| 空状態 補足 | 「別のキーワードでお試しください」|
| エラー タイトル | 「検索できませんでした」|
| エラー 補足 | 「もう一度お試しください。」|
| 追加フェッチ中 | 「読み込み中...」|
| 終端 | 「これ以上結果はありません」|
| オフライン入力抑制 | 「オフライン中のため検索できません。」|
| フォロワー数表示 | 「{N}フォロワー」|
| 最近の検索 パネル見出し | 「最近の検索」（§4.2）|
| 最近の検索 全削除ボタン | 「すべて削除」（§4.2）|

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 検索バー入力欄 | `accessibilityRole="search"` / `accessibilityLabel`: 「投稿・ユーザー・タグを検索」|
| クリアボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「検索をクリア」/ タップターゲット 44pt（`hitSlop`）|
| セグメント「投稿」 | `accessibilityRole="tab"` / `accessibilityState: { selected: isActive }`|
| セグメント「ユーザー」 | `accessibilityRole="tab"` / `accessibilityState: { selected: isActive }`|
| セグメント「タグ」 | `accessibilityRole="tab"` / `accessibilityState: { selected: isActive }`|
| タグ候補・人気タグ行 | `accessibilityRole="button"` / `accessibilityLabel`: 「#{name} {count}件の投稿を見る」|
| ユーザー結果アイテム | `accessibilityRole="button"` / `accessibilityLabel`: 「{nickname}。{bio の先頭 50 文字}。{フォロワー数}フォロワー。プロフィールを表示」|
| ユーザーアバター | `accessibilityRole="image"` / `accessibilityLabel`: 「{nickname}のプロフィール画像」/ `accessibilityElementsHidden={true}`（アイテム全体の label に含まれるため）|
| スケルトン | `accessibilityElementsHidden={true}` + コンテナに `accessibilityLabel`: 「読み込み中」|
| 最近の検索・選択行 | `accessibilityRole="button"` / `accessibilityLabel`: 「{query}で検索」（§4.2）|
| 最近の検索・削除ボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「{query}の履歴を削除」/ タップターゲット 44pt（`hitSlop`）（§4.2）|
| 最近の検索・全削除ボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「検索履歴をすべて削除」（§4.2）|

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
| `SearchBar.tsx`（最近の検索機能込み） | `value`/`onChangeText`/`onSubmit`/`onClear` の controlled 入力バーとして再実装（デバウンスは呼び出し側 `SearchScreen` で管理）。**最近の検索機能も実装済み**（cfw は `localStorage`、Native は `AsyncStorage` を保存先として使う。§4.2 参照。**2026-07-14 是正**: 旧稿は「MVP外」としていたが誤りだった）|
| `SearchTabs`（Web: 投稿/ユーザー/タグ 3 タブ）| `SearchSegmentTabs` として 3 タブを実装。Web 同様に常時表示し、未入力のタグタブでは `HashtagSearchResults` が人気タグを表示する|
| `UserSearchResults.tsx` の `User` 型 | §7.3 の `SearchUserItem` として踏襲（`followingCount` も含む — 将来の「フォロー」ボタン追加時に使用）|
| Web 空状態文言「${query}」に一致するユーザーはいません | §11 の同文言に踏襲 |
| `STALE_TIME_SEARCH_MS` 定数 | モバイルの `lib/constants/` に同値で定義（frontend に実装依頼）|

---

## 16. 未確定事項・要判断

- **ジャンルフィルター:** Web 版の投稿検索には `genre` フィルターがある（`GenreFilter` / `AdvancedSearchFilters`）。モバイルでの提供可否は PM 判断。提供する場合、フィルターシートのUI仕様を別途策定する。
- **最近の検索: （2026-07-14 解決済み）** §4.2 参照。AsyncStorage を保存先として実装済み。当初「保存先がなく Batch 2d 以降の検討事項」としていたのは誤りだった（CLAUDE.md 核心ルール4が禁じるのはトークンの AsyncStorage 保存であり、検索語は対象外）。人気タグはタグタブの未入力表示として実装済み。おすすめユーザーは別軸の機能で、引き続き MVP スコープ外。
- **検索バーをヘッダーに埋め込む案:** 一部の SNS アプリではボトムタブの検索タブに直接フォーカスした状態でヘッダー内にバーを表示するパターンがある。現仕様は「ヘッダー直下に固定」としているが、iOS / Android のナビゲーションヘッダー標準（`searchBar` prop）を使うかどうかは frontend に実装判断を委ねる。
- **`followingCount` の使い道:** `SearchUsersResponse` に含まれているが、MVP の UI（ユーザーアイテム）には表示しない。将来の「フォロー中 / フォロワー」一覧表示時に使用する想定。
