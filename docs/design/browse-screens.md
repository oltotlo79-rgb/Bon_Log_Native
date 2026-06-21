# 閲覧系画面仕様（ウェーブ1）— Bon_Log Native

作成日: 2026-06-22
対象画面: explore / dictionary / fertilizers / hormones / pesticides / legal / analytics
前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `common-states.md`（ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner）に準拠
- `navigation-structure.md`（スタック・タブ構造・文言トーン）に準拠
- `more-menu.md` の項目タップから遷移する画面群（育成ガイド / プレミアム / その他グループ）

---

## 共通パターン（全閲覧系画面）

### C-1. カタログ一覧画面の共通レイアウト

検索バーを持つ一覧画面（dictionary・pesticides など）で繰り返し使うパターン。

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー（戻る ← ）「{タイトル}」]  │
│                                           │
│ [OfflineBanner（オフライン時のみ）]         │
│                                           │
│ [SearchBar / フィルタバー（任意）]         │  ← 固定（スクロール外）
│ [セパレータ 1pt colorBorderLight]          │
│                                           │
│ [FlatList（無限スクロール）]               │
│   各セル → 詳細画面へ push               │
│   [フッター: 追加読み込みスピナー]          │
│                                           │
└───────────────────────────────────────────┘
```

セルの共通スタイル:
- 高さ: 最小 56pt（`paddingVertical: spacing3` × 2 + コンテンツ）
- `paddingHorizontal: spacing4`（16pt）
- 下端区切り: `1pt solid colorBorderLight`
- タップ: `TouchableOpacity activeOpacity: 0.7`
- 右端: `ChevronRight` 16pt / `colorTextTertiary`
- タップターゲット: 行全体（最小 44pt 高さ）

### C-2. カタログ詳細画面の共通レイアウト

詳細を縦スクロールで表示する画面（dictionary 詳細・fertilizer 詳細など）。

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー（戻る ← ）「{用語名}」]   │
│                                           │
│ [OfflineBanner（オフライン時のみ）]         │
│                                           │
│ [ScrollView]                              │
│   paddingHorizontal: spacing4             │
│   paddingBottom: spacing8 + セーフ域      │
│                                           │
│   [メインコンテンツ（各画面で定義）]        │
│                                           │
└───────────────────────────────────────────┘
```

### C-3. タブ切替パターン

複数カテゴリを切り替える画面（fertilizers・pesticides）で使うパターン。

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー]                          │
│                                           │
│ [TabBar（水平）]                           │  ← 上部固定
│   [タブ 1][タブ 2][タブ 3]                 │
│   アクティブ: 下線インジケータ              │
│                                           │
│ [各タブのコンテンツ（FlatList）]            │
└───────────────────────────────────────────┘
```

TabBar 仕様:
- 高さ: 44pt
- 背景: `colorSurfaceWashi`
- 下端境界: `1pt solid colorBorderLight`
- アクティブタブ: テキスト `colorTextPrimary` / `fontWeight: 700` / 下線 2pt `colorActionPrimary`
- 非アクティブタブ: テキスト `colorTextSecondary`
- フォント: `textMd`（15pt）
- タップターゲット: 幅は均等割り（`flex: 1`）、高さ 44pt

### C-4. 4 状態（全画面共通）

| 状態 | 表示コンポーネント | 備考 |
|------|-----------------|------|
| ローディング | `ScreenLoading variant="spinner"` | スケルトンが定義しにくいカタログ系は spinner |
| 空（0 件） | `ScreenEmpty` | 検索結果 0 件の場合に使用 |
| エラー | `ScreenError onRetry={refetch}` | TanStack Query の `isError` 時 |
| オフライン | `OfflineBanner` | ネットワーク切断時は全画面上部に表示 |

---

## 1. 発見画面（explore）

### 1.1 概要・目的

トレンドのハッシュタグ・ジャンル・おすすめユーザーを一画面に集めた「発見」エントリポイント。
`(tabs)/more` の「発見」行をタップしたとき、Web 版の `/explore` に代わるネイティブ画面として表示する。
新規ユーザーがフォローを広げるきっかけを作ることが主な目的。

### 1.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `app/explore/index.tsx`（タブ外スタック画面）|
| 遷移元 | `(tabs)/more` の「発見」行タップ |
| 遷移先 | `users/[id]`（おすすめユーザー行タップ）|
| ヘッダー種別 | スタックヘッダー（戻る ← ）|
| ヘッダータイトル | 「発見」|
| BottomTabBar | 非表示（タブ外スタック）|
| ディープリンク | 不要（MVP では `bonlog://explore` は設けない）|

**タグ・ジャンルのタップ挙動について:** 現時点でトレンドタグ・ジャンルをタップした際に遷移する「タグ別投稿一覧 API」がサーバー側に提供されていない。当面はタップを無効（`disabled`）にし、将来 API が追加されたときに検索画面へ遷移する実装を追加する。`core に要相談`: タグ・ジャンル別の投稿一覧エンドポイントが必要。

### 1.3 画面構成

```
┌───────────────────────────────────────────┐
│ ← 「発見」                                 │  ← スタックヘッダー
│                                           │
│ [OfflineBanner（オフライン時のみ）]         │
│                                           │
│ [ScrollView]                              │
│   paddingHorizontal: spacing4             │
│   paddingBottom: spacing8 + セーフ域      │
│                                           │
│  ┌──── セクション 1: トレンドタグ ────────┐ │
│  │ 「トレンド」（セクション見出し）         │ │
│  │ [タグチップ横スクロール]                │ │
│  │  [#松] [#黒松] [#五葉松] [#盆栽展] …  │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌──── セクション 2: トレンドジャンル ────┐ │
│  │ 「ジャンル」（セクション見出し）         │ │
│  │ [ジャンルチップ横スクロール]            │ │
│  │  [松柏類] [雑木類] [草もの] …          │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌──── セクション 3: おすすめユーザー ────┐ │
│  │ 「おすすめユーザー」（セクション見出し） │ │
│  │ [UserRow × 最大 10 件]                 │ │
│  │   [Avatar] [ニックネーム]  [フォローボタン]│ │
│  │   [bio 1 行]              [フォロワー数] │ │
│  └─────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### 1.4 コンポーネント分割

```
ExploreScreen
├── ExploreSection              ← セクション見出し + コンテンツ（汎用）
│   props: title: string, children: ReactNode
├── TrendingTagsRow             ← タグチップの横スクロール
│   props: items: { id, name, count }[]
│   └── TagChip                 ← 個別タグチップ
│       props: name: string, count: number, disabled: boolean
├── TrendingGenresRow           ← ジャンルチップの横スクロール
│   props: items: { id, name, category, postCount }[]
│   └── GenreChip               ← 個別ジャンルチップ
│       props: name: string, postCount: number, disabled: boolean
└── RecommendedUserList         ← おすすめユーザーの縦リスト
    props: items: { id, nickname, avatarUrl, bio, followersCount, following, requested, isPublic }[]
    └── UserRow                 ← 既存コンポーネントを流用（follow-and-engagement.md 参照）
        props: user: {...}, onPress: () => void
```

**UserRow / FollowButton は `follow-and-engagement.md` で仕様化済みの既存コンポーネントを流用する。**

### 1.5 タグチップ・ジャンルチップの仕様

```
┌──────────────────┐
│  #黒松 (238)     │
└──────────────────┘
```

| 属性 | 値 |
|------|----|
| 背景 | `colorSurface`（`#fcfcfc`）|
| 枠線 | `1pt solid colorBorderLight` |
| 角丸 | `radiusFull`（9999pt、ピル形）|
| 水平パディング | `spacing4`（16pt）|
| 垂直パディング | `spacing2`（8pt）|
| テキスト（名称） | `textSm`（12pt）/ `colorTextPrimary` |
| テキスト（件数） | `textSm`（12pt）/ `colorTextSecondary` |
| 最小タップ高さ | 44pt（`hitSlop` で補完）|
| 無効状態 | `opacity: 0.5`、タップ不可 |
| 間隔 | チップ間 `spacing2`（8pt）|

横スクロールは `ScrollView horizontal showsHorizontalScrollIndicator={false}` で実装する。`FlatList horizontal` でも可（frontend 判断）。

### 1.6 UserRow の仕様

| 要素 | 仕様 |
|------|------|
| アバター | 44pt 丸形 / expo-image / `accessibilityLabel: "{nickname}のアバター"` |
| ニックネーム | `textMd`（15pt）/ `colorTextPrimary` / `fontWeight: 600` |
| bio | `textSm`（12pt）/ `colorTextSecondary` / 1 行 `numberOfLines: 1` で切る |
| フォロワー数 | `textSm` / `colorTextSecondary` / 「{N}人がフォロー中」|
| フォローボタン | `follow-and-engagement.md` の `FollowButton` をそのまま使用 |
| 行全体のタップ | `users/[id]` へ push（ボタン領域外のタップ）|
| 行の高さ | 最小 64pt |
| 区切り線 | `1pt solid colorBorderLight` |

### 1.7 データの流れ

| データ | API | 取得フック（lib/queries/ に配置）|
|--------|-----|-------------------------------|
| トレンドタグ | `GET /api/v1/explore/trending-hashtags` | `useExploreTrendingHashtagsQuery` |
| トレンドジャンル | `GET /api/v1/explore/trending-genres` | `useExploreTrendingGenresQuery` |
| おすすめユーザー | `GET /api/v1/explore/recommended-users` | `useExploreRecommendedUsersQuery` |

- いずれもカーソルなし（上位最大 10 件を 1 回取得）
- ゲスト可能（Bearer 不要）。ただしフォローボタンはゲスト時は「ログインしてフォロー」の挙動に（`follow-and-engagement.md` 参照）
- 3 クエリは独立して並列取得する（1 つの失敗が他のセクション表示を妨げない）

### 1.8 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| タグチップタップ | 当面は `disabled`。将来: 検索画面へ遷移（core に要相談）|
| ジャンルチップタップ | 当面は `disabled`。将来: ジャンル別投稿一覧へ遷移（core に要相談）|
| UserRow タップ | `users/[id]` へ push |
| フォローボタンタップ | `follow-and-engagement.md` 仕様に準ずる（楽観更新）|
| Pull-to-refresh | ScrollView の `refreshControl` で 3 クエリを全再取得 |

### 1.9 エッジケース

| 状態 | 表示 |
|------|------|
| 各セクションのローディング | セクション内スピナー（`ScreenLoading variant="spinner"` 小サイズ）|
| 各セクションのエラー | セクション内 `ScreenError`（セクション全体を置き換え）|
| タグ 0 件 | トレンドタグセクション自体を非表示 |
| ジャンル 0 件 | トレンドジャンルセクション自体を非表示 |
| ユーザー 0 件 | `ScreenEmpty icon={Users} title="おすすめユーザーはいません"` |
| オフライン | 画面上部 `OfflineBanner` + キャッシュがあれば表示継続 |

### 1.10 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダータイトル | 「発見」|
| セクション見出し（タグ） | 「トレンド」|
| セクション見出し（ジャンル） | 「ジャンル」|
| セクション見出し（ユーザー） | 「おすすめユーザー」|
| フォロワー数表示 | 「{N}人がフォロー中」|
| タグ件数表示 | 「{N}件」|
| ユーザー空状態見出し | 「おすすめユーザーはいません」|
| ユーザー空状態補足 | 「しばらくしてから再度お試しください」|
| タグ無効時 `accessibilityLabel` | 「{タグ名}（現在選択できません）」|

### 1.11 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| セクション見出し | `accessibilityRole="header"` |
| タグチップ | `accessibilityRole="button"` / `accessibilityLabel="#{ name }（{count}件）"` |
| ジャンルチップ | `accessibilityRole="button"` / `accessibilityLabel="{name}（{postCount}件）"` |
| UserRow | `accessibilityRole="button"` / `accessibilityLabel="{nickname}のプロフィールを見る"` |
| アバター（装飾） | `accessibilityElementsHidden={true}` |
| タップターゲット | タグ・ジャンルは `hitSlop` で 44pt 確保 |

### 1.12 既存との一貫性メモ

- `UserRow` / `FollowButton`: `follow-and-engagement.md` で定義済みのコンポーネントをそのまま使う
- セクション見出し・グループスタイル: `more-menu.md` の `MoreSectionHeader` と同一スタイル
- `OfflineBanner`: `common-states.md` §5 に準拠

---

## 2. 盆栽用語辞典（dictionary）

### 2.1 概要・目的

盆栽に関する専門用語を「用語・読み・本文・関連語・前後ナビ」付きで参照できるリファレンス画面。
`(tabs)/more` の「盆栽用語辞典」行をタップすると表示する。
索引（50 音・カテゴリ）と検索の両方でアクセスできる構成にする。

### 2.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| 一覧画面 | `app/dictionary/index.tsx` |
| 詳細画面 | `app/dictionary/[slug]/index.tsx` |
| 遷移元（一覧） | `(tabs)/more` の「盆栽用語辞典」タップ |
| 遷移元（詳細） | 一覧画面の各行タップ、関連語タップ、前後ナビタップ |
| ヘッダー種別 | スタックヘッダー（戻る ← ）|
| BottomTabBar | 非表示 |
| ディープリンク | `bonlog://dictionary/{slug}` — 将来のプッシュ通知連携用に予約（MVP では実装不要）|

### 2.3 一覧画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「盆栽用語辞典」                          │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [SearchBar]（固定）                        │
│   プレースホルダー: 「用語を検索...」       │
│                                           │
│ [フィルタバー]（固定）                     │
│  [カテゴリ][五十音] タブ切替               │
│                                           │
│  ── カテゴリタブ選択時 ──                 │
│  [カテゴリフィルタ チップ横スクロール]      │
│   [すべて][樹木管理][道具][病害虫]…        │
│                                           │
│  ── 五十音タブ選択時 ──                   │
│  [50 音行ボタン横スクロール]               │
│   [ア][カ][サ][タ][ナ][ハ][マ][ヤ][ラ][ワ]│
│                                           │
│ [FlatList（無限スクロール）]               │
│   各行:                                   │
│   [用語] [読み]                    [›]    │
│   [カテゴリタグ]                          │
└───────────────────────────────────────────┘
```

フィルタバーの状態は画面内ローカル state（`useState`）で管理する。カテゴリ・50 音フィルタが変わるたびに API クエリパラメータを更新して再取得する。

#### カテゴリ・50 音フィルタチップの仕様

| 属性 | 未選択 | 選択中 |
|------|--------|--------|
| 背景 | `colorSurface` | `colorActionPrimary`（`#2e2e2e`）|
| テキスト | `colorTextPrimary` | `colorActionPrimaryText`（`#ffffff`）|
| 枠線 | `1pt solid colorBorderLight` | なし |
| 角丸 | `radiusFull` | `radiusFull` |
| 高さ | 34pt（`hitSlop` で 44pt 確保）| 同左 |

#### 一覧セルの仕様

| 要素 | 仕様 |
|------|------|
| 用語テキスト | `textMd`（15pt）/ `colorTextPrimary` / `fontWeight: 600` |
| 読みテキスト | `textSm`（12pt）/ `colorTextSecondary` |
| カテゴリタグ | 小チップ / `colorSurfaceMuted` 背景 / `textXs`（10pt）/ `colorTextSecondary` |
| ChevronRight | `colorTextTertiary` 16pt |
| 行の高さ | 最小 60pt |

### 2.4 詳細画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「{用語名}」                             │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [ScrollView]                              │
│   padding: spacing4                       │
│                                           │
│   [用語見出し]                             │  ← textXl / colorTextPrimary
│   [読み]                                  │  ← textBase / colorTextSecondary
│   [カテゴリチップ]                         │
│                                           │
│   [セパレータ]                             │
│                                           │
│   [本文テキスト]                           │  ← textBase / colorTextPrimary / lineHeight 22pt
│                                           │
│   ── 関連語（あれば）──                   │
│   [「関連語」ラベル]                       │
│   [関連語チップ × N]                      │  ← タップで詳細へ push
│                                           │
│   [セパレータ]                             │
│                                           │
│   [前後ナビゲーション]                     │
│    ← [前の用語]     [次の用語] →          │
└───────────────────────────────────────────┘
```

#### 前後ナビゲーションの仕様

```
[← 前の用語名]                    [次の用語名 →]
```

| 属性 | 値 |
|------|----|
| 前ボタン | `ChevronLeft` + 用語名（省略 `numberOfLines: 1`）/ 左寄せ |
| 次ボタン | 用語名（省略）+ `ChevronRight` / 右寄せ |
| テキスト | `textSm`（12pt）/ `colorTextLink` |
| タップターゲット | 高さ 44pt / 幅は 50%（flex: 1）|
| prev/next が null | 該当ボタンを非表示（`null` を返す） |

### 2.5 コンポーネント分割

```
DictionaryScreen（一覧）
├── SearchBar                    ← search-screen.md の SearchBar を流用
├── DictionaryFilterBar          ← カテゴリ / 50音 タブ切替 + フィルタチップ
│   ├── FilterTabToggle          ← 「カテゴリ」「五十音」切り替え 2 タブ
│   ├── CategoryFilterChips      ← カテゴリ選択チップ（横スクロール）
│   └── KanaRowButtons           ← 50音行ボタン（ア/カ/サ/タ/ナ/ハ/マ/ヤ/ラ/ワ）
└── DictionaryList（FlatList）
    └── DictionaryCell           ← 各行（用語・読み・カテゴリタグ）

DictionaryDetailScreen（詳細）
├── DictionaryHeader             ← 用語名・読み・カテゴリチップ
├── DictionaryBody               ← 本文テキスト
├── DictionaryRelatedTerms       ← 関連語チップ一覧
└── DictionaryPrevNextNav        ← 前後ナビゲーション
```

### 2.6 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| 用語一覧 | `GET /api/v1/dictionary?search={q}&category={c}&kanaRow={k}&cursor={c}&limit=30` | `useDictionaryQuery` (useInfiniteQuery) |
| 用語詳細 | `GET /api/v1/dictionary/{slug}` | `useDictionaryDetailQuery` |

- ゲスト可能（Bearer 不要）
- 一覧: カーソルベース無限スクロール / limit: 30
- 詳細レスポンス: `{ term, reading, category, body, prev: {slug, term} | null, next: {slug, term} | null, related: {slug, term}[] }`

### 2.7 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| 検索テキスト入力 | デバウンス 400ms 後に再取得（カーソルをリセット）|
| カテゴリ選択 | フィルタ変更 → 一覧を先頭から再取得 |
| 50 音行選択 | フィルタ変更 → 一覧を先頭から再取得 |
| フィルタとカテゴリの同時使用 | AND 条件として API に渡す |
| セル行タップ | `dictionary/[slug]` へ push |
| 関連語チップタップ | `dictionary/[slug]` へ push（スタックに積む）|
| 前後ナビタップ | `dictionary/[slug]` へ push |
| Pull-to-refresh | 一覧クエリを先頭から再取得 |
| 無限スクロール | `onEndReached` で次ページを `fetchNextPage` |

### 2.8 エッジケース

| 状態 | 表示 |
|------|------|
| 初期ローディング | `ScreenLoading variant="spinner"` |
| 追加ページロード中 | FlatList フッターにスピナー |
| 検索結果 0 件 | `ScreenEmpty title="「{q}」に一致する用語はありません" description="別のキーワードでお試しください"` |
| 全件 0 件 | `ScreenEmpty title="用語がありません"` |
| エラー | `ScreenError onRetry={refetch}` |
| 詳細ローディング | `ScreenLoading variant="spinner"` |
| 詳細 404 | `ScreenError title="この用語は見つかりません"` / 戻るリンク |
| オフライン | `OfflineBanner` / キャッシュがあれば表示継続 |

### 2.9 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダー（一覧） | 「盆栽用語辞典」|
| 検索バープレースホルダー | 「用語を検索...」|
| フィルタタブ（カテゴリ） | 「カテゴリ」|
| フィルタタブ（50音） | 「五十音」|
| 50 音ボタン | 「ア」「カ」「サ」「タ」「ナ」「ハ」「マ」「ヤ」「ラ」「ワ」|
| 関連語セクション見出し | 「関連語」|
| 検索 0 件 | 「「{q}」に一致する用語はありません」|
| 検索 0 件 補足 | 「別のキーワードでお試しください」|
| エラー | 「用語を読み込めませんでした。」|
| 詳細 404 | 「この用語は見つかりません。」|

### 2.10 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| セクションヘッダー | `accessibilityRole="header"` |
| 一覧セル | `accessibilityRole="button"` / `accessibilityLabel="{term}（{reading}）"` |
| 関連語チップ | `accessibilityRole="button"` / `accessibilityLabel="{term}の詳細を見る"` |
| 前後ナビボタン | `accessibilityLabel="前の用語: {term}"` / `"次の用語: {term}"` |
| フィルタタブ | `accessibilityRole="tab"` / `accessibilityState: { selected: bool }` |

---

## 3. 施肥ガイド（fertilizers）

### 3.1 概要・目的

盆栽の施肥に必要な「栄養素・カテゴリ・樹種別の施肥スケジュール」を参照できるガイド画面。
`(tabs)/more` の「施肥ガイド」行から遷移する。3 つのタブ（栄養素 / カテゴリ / 樹種）で情報を整理する。

### 3.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| トップ画面 | `app/fertilizers/index.tsx`（3 タブ）|
| 栄養素詳細 | `app/fertilizers/nutrients/[slug]/index.tsx` |
| 樹種スケジュール | `app/fertilizers/tree-species/[slug]/index.tsx` |
| 遷移元 | `(tabs)/more` の「施肥ガイド」タップ |
| ヘッダー種別 | スタックヘッダー |
| BottomTabBar | 非表示 |

### 3.3 トップ画面レイアウト（3 タブ）

```
┌───────────────────────────────────────────┐
│ ← 「施肥ガイド」                            │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [TabBar]                                  │
│   [栄養素] [カテゴリ] [樹種]               │
│                                           │
│ ── 栄養素タブ ──                          │
│ [FlatList]                                │
│   各行:                                   │
│   [N] 窒素 (N)                    [›]    │
│       「葉と茎の成長を促す」               │
│   [P] リン (P)                            │
│       「根と花の発達に必要」               │
│                                           │
│ ── カテゴリタブ ──                        │
│ [カテゴリ別グループリスト（SectionList）]  │
│   セクション見出し: 「三要素」等           │
│   各行: カテゴリ名                        │
│                                           │
│ ── 樹種タブ ──                            │
│ [FlatList]                                │
│   各行: 樹種名                     [›]   │
└───────────────────────────────────────────┘
```

#### 栄養素セルの仕様

| 要素 | 仕様 |
|------|------|
| シンボル（N/P/K 等） | `text2xl`（24pt）/ `colorTextPrimary` / `fontWeight: 700` / 幅 40pt 固定 |
| 名称 | `textMd`（15pt）/ `colorTextPrimary` / `fontWeight: 600` |
| 説明 | `textSm`（12pt）/ `colorTextSecondary` / `numberOfLines: 1` |
| 行の高さ | 最小 64pt |

#### カテゴリタブ

カテゴリはグルーピングされたリストとして表示（SectionList または FlatList + セクションヘッダーセル）。カテゴリをタップしても詳細なし（情報は栄養素一覧のフィルタとして機能する想定。`core に要相談`）。

#### 樹種タブ

樹種名のシンプルなリスト。タップで `fertilizers/tree-species/[slug]` へ push。

### 3.4 栄養素詳細画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「{栄養素名}」                           │
│                                           │
│ [ScrollView]                              │
│                                           │
│   [ヘッダー]                               │
│     [N] 窒素 (Nitrogen)                   │  ← シンボル + 名称 + 英名
│     [カテゴリタグ]                         │
│                                           │
│   [説明テキスト]                           │
│                                           │
│   [セパレータ]                             │
│   「欠乏症状」セクション                   │
│   [症状テキスト]                           │
│                                           │
│   「過剰症状」セクション                   │
│   [症状テキスト]                           │
│                                           │
│   「多く含む肥料・資材」セクション          │
│   [foodSources のリスト（箇条書き）]       │
│                                           │
└───────────────────────────────────────────┘
```

#### 情報セクションのスタイル

| 要素 | 仕様 |
|------|------|
| セクション見出し | `textLg`（17pt）/ `colorTextPrimary` / `fontWeight: 600` / `marginBottom: spacing2` |
| 本文 | `textBase`（14pt）/ `colorTextPrimary` / `lineHeight: 22pt` |
| 箇条書き | 「・{item}」形式のテキスト行 / `textBase` / `colorTextSecondary` |
| セクション間区切り | `spacing4` の縦マージン |
| 上端ボーダー（セクション）| `2pt solid colorBorderLight` |

### 3.5 樹種スケジュール画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「{樹種名}の施肥スケジュール」            │
│                                           │
│ [ScrollView]                              │
│                                           │
│   [樹種名見出し]                           │
│                                           │
│   [月別スケジュールグリッド]               │
│                                           │
│   1月  2月  3月  4月  5月  6月           │
│   [●] [○] [●] [●] [●] [○]            │  ← 月セル
│   なし 少し 標準 多め 少し なし           │
│                                           │
│   7月  8月  9月 10月 11月 12月           │
│   [○] [○] [●] [●] [○] [○]            │
│   なし なし 少し 標準 なし なし           │
│                                           │
│   [凡例]                                  │
│   ● 施肥あり  ○ 施肥なし               │
│                                           │
│   [月別詳細（タップした月のみ展開）]        │
│   [月別メモ（任意）]                       │
└───────────────────────────────────────────┘
```

#### 月別スケジュールグリッドの仕様

月は 2 行 × 6 列のグリッドで表示する（`View` ベースで実装。外部チャートライブラリ不使用）。

| 要素 | 仕様 |
|------|------|
| グリッドコンテナ | `flexDirection: "row"` `flexWrap: "wrap"` |
| 月セル | 幅 `(画面幅 - spacing4×2) / 6` / 最小 44pt 高さ |
| 月ラベル | `textXs`（10pt）/ `colorTextSecondary` / 中央寄せ |
| 施肥インジケータ | 円形 24pt / 施肥あり: `colorActionPrimary` 塗り / なし: `colorSurfaceMuted` 塗り |
| 施肥強度テキスト | `textXs`（10pt）/ 施肥あり: `colorTextPrimary` / なし: `colorTextTertiary` |

施肥の有無・強度は API レスポンスの `months[]: { month, level, note }` から得る（`level` 値は `core に要相談`）。

### 3.6 コンポーネント分割

```
FertilizersScreen（トップ / 3 タブ）
├── FertilizerTabBar             ← 共通 C-3 パターン使用
├── NutrientsList（FlatList）    ← 栄養素タブ
│   └── NutrientCell
├── CategoryList（SectionList）  ← カテゴリタブ
│   └── CategoryCell
└── TreeSpeciesList（FlatList）  ← 樹種タブ
    └── TreeSpeciesCell

NutrientDetailScreen
├── NutrientHeader
└── NutrientInfoSection（× 複数: deficiency / excess / foodSources）

TreeSpeciesScheduleScreen
├── TreeSpeciesScheduleHeader
├── MonthlyScheduleGrid          ← View ベース月別グリッド
└── ScheduleLegend
```

### 3.7 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| 栄養素一覧 | `GET /api/v1/fertilizers/nutrients` | `useFertilizerNutrientsQuery` |
| 栄養素詳細 | `GET /api/v1/fertilizers/nutrients/{slug}` | `useFertilizerNutrientDetailQuery` |
| カテゴリ一覧 | `GET /api/v1/fertilizers/categories` | `useFertilizerCategoriesQuery` |
| 樹種一覧 | `GET /api/v1/fertilizers/tree-species` | `useFertilizerTreeSpeciesQuery` |
| 樹種スケジュール | `GET /api/v1/fertilizers/tree-species/{slug}/schedule` | `useFertilizerScheduleQuery` |

- ゲスト可能
- 一覧系はカーソルなし（全件取得。件数が少ない静的マスタ想定）
- タブ切り替え時に遅延取得（アクティブなタブのデータのみ取得する）

### 3.8 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| タブ切り替え | ローカル state で管理。タブコンテンツは遅延取得 |
| 栄養素行タップ | `fertilizers/nutrients/[slug]` へ push |
| 樹種行タップ | `fertilizers/tree-species/[slug]` へ push |
| Pull-to-refresh | 現在アクティブなタブのクエリを再取得 |

### 3.9 エッジケース

| 状態 | 表示 |
|------|------|
| ローディング | `ScreenLoading variant="spinner"` |
| 空 | `ScreenEmpty title="データがありません"` |
| エラー | `ScreenError onRetry={refetch}` |
| オフライン | `OfflineBanner` |
| スケジュールデータなし | `ScreenEmpty title="スケジュール情報がありません"` |

### 3.10 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダー | 「施肥ガイド」|
| タブ（栄養素） | 「栄養素」|
| タブ（カテゴリ） | 「カテゴリ」|
| タブ（樹種） | 「樹種」|
| スケジュール画面ヘッダー | 「{樹種名}の施肥スケジュール」|
| 施肥あり（凡例） | 「施肥あり」|
| 施肥なし（凡例） | 「施肥なし」|
| 欠乏症状セクション | 「欠乏症状」|
| 過剰症状セクション | 「過剰症状」|
| 含む資材セクション | 「多く含む肥料・資材」|
| エラー | 「施肥情報を読み込めませんでした。」|

### 3.11 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| タブバー | `accessibilityRole="tablist"` / 各タブ `accessibilityRole="tab"` |
| 月セル | `accessibilityLabel="{N}月: 施肥{あり/なし}（{level}）"` |
| 月グリッドコンテナ | `accessibilityLabel="月別施肥スケジュール"` |

---

## 4. 植物ホルモン（hormones）

### 4.1 概要・目的

植物ホルモンの種類・効果・季節的変動・実践のコツを参照できる図鑑画面。
`(tabs)/more` の「植物ホルモン」行から遷移する。一覧 → 詳細の 2 階層構成。

### 4.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| 一覧画面 | `app/hormones/index.tsx` |
| 詳細画面 | `app/hormones/[slug]/index.tsx` |
| 遷移元 | `(tabs)/more` の「植物ホルモン」タップ |
| ヘッダー種別 | スタックヘッダー |
| BottomTabBar | 非表示 |

### 4.3 一覧画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「植物ホルモン」                          │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [FlatList]                                │
│   各行:                                   │
│   [ホルモン名]  [英名]              [›]   │
│   [カテゴリタグ]                          │
│   [説明 1 行]                             │
└───────────────────────────────────────────┘
```

#### ホルモンセルの仕様

| 要素 | 仕様 |
|------|------|
| ホルモン名 | `textMd`（15pt）/ `colorTextPrimary` / `fontWeight: 600` |
| 英名 | `textSm`（12pt）/ `colorTextSecondary` |
| カテゴリタグ | 小チップ（dictionary と同じスタイル）|
| 説明 | `textSm`（12pt）/ `colorTextSecondary` / `numberOfLines: 1` |
| 行の高さ | 最小 64pt |

### 4.4 詳細画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「{ホルモン名}」                         │
│                                           │
│ [ScrollView]                              │
│                                           │
│   [ホルモン名 + 英名 + カテゴリタグ]       │
│                                           │
│   [説明テキスト]                           │
│                                           │
│   ── 主な効果 ──                          │
│   ・{効果 1}                              │  ← effects[] の箇条書き
│   ・{効果 2}                              │
│                                           │
│   ── 季節的変動 ──                        │
│   [月別レベルバー（View ベース）]           │
│                                           │
│    1  2  3  4  5  6  7  8  9 10 11 12月  │
│    ▓  ▓  █  █  █  ▓  ▓  ▓  ░  ░  ░  ░   │  ← 高さで変動を表現
│                                           │
│   ── 実践のコツ ──                        │
│   ・{コツ 1}                              │  ← practicalTips[] の箇条書き
│   ・{コツ 2}                              │
│                                           │
└───────────────────────────────────────────┘
```

#### 季節的変動バーの仕様

月別レベルを高さ可変の View バーで表現する（外部チャートライブラリ不使用）。

| 要素 | 仕様 |
|------|------|
| バーコンテナ | `flexDirection: "row"` / `alignItems: "flex-end"` / 高さ 60pt |
| バー幅 | `(画面幅 - spacing4×2) / 12 - 2pt`（間隔 2pt を除く）|
| バー高さ | `level / maxLevel × 60pt`（level は 0〜10 の想定。`core に要相談`）|
| バー色 | `colorActionPrimary`（`#2e2e2e`）/ 透明度は level に応じて変化（0.2〜1.0）|
| 月ラベル | バー下 / `textXs`（10pt）/ `colorTextSecondary` / 中央寄せ |
| アクセシビリティ | `accessibilityLabel="季節的変動グラフ"` + 各バーに `accessibilityLabel="{N}月: レベル {level}"` |

### 4.5 コンポーネント分割

```
HormonesScreen（一覧）
└── HormoneList（FlatList）
    └── HormoneCell

HormoneDetailScreen（詳細）
├── HormoneHeader
├── HormoneDescription
├── HormoneEffects              ← effects[] 箇条書き
├── HormoneSeasonalChart        ← 月別バーグラフ（View ベース）
└── HormonePracticalTips        ← practicalTips[] 箇条書き
```

### 4.6 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| ホルモン一覧 | `GET /api/v1/hormones` | `useHormonesQuery` |
| ホルモン詳細 | `GET /api/v1/hormones/{slug}` | `useHormoneDetailQuery` |

- ゲスト可能
- 一覧はカーソルなし（全件取得）

### 4.7 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| セル行タップ | `hormones/[slug]` へ push |
| Pull-to-refresh | 一覧クエリを再取得 |

### 4.8 エッジケース

| 状態 | 表示 |
|------|------|
| ローディング | `ScreenLoading variant="spinner"` |
| 空 | `ScreenEmpty title="ホルモン情報はありません"` |
| エラー | `ScreenError onRetry={refetch}` |
| 詳細 404 | `ScreenError title="このホルモンは見つかりません"` |
| オフライン | `OfflineBanner` |

### 4.9 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダー（一覧） | 「植物ホルモン」|
| 主な効果セクション | 「主な効果」|
| 季節的変動セクション | 「季節的変動」|
| 実践のコツセクション | 「実践のコツ」|
| エラー | 「植物ホルモン情報を読み込めませんでした。」|
| 詳細 404 | 「このホルモンは見つかりません。」|

### 4.10 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| セル | `accessibilityRole="button"` / `accessibilityLabel="{name}（{nameEn}）の詳細を見る"` |
| 季節的変動バー | `accessibilityRole="image"` / `accessibilityLabel="季節的変動グラフ。{month}月はレベル{level}。"` |
| 効果・コツのリスト | `accessibilityRole="text"` |

---

## 5. 農薬・病害虫図鑑（pesticides）

### 5.1 概要・目的

「病害虫 / 農薬製品 / 農薬成分」の 3 カタログを参照できる図鑑画面。
`(tabs)/more` の「農薬・病害虫」行から遷移する。タブ切り替えで 3 カタログを切り替える。

### 5.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| トップ画面 | `app/pesticides/index.tsx`（3 タブ）|
| 病害虫詳細 | `app/pesticides/disease-pests/[slug]/index.tsx` |
| 農薬製品詳細 | `app/pesticides/products/[slug]/index.tsx` |
| 農薬成分詳細 | `app/pesticides/ingredients/[slug]/index.tsx` |
| 遷移元 | `(tabs)/more` の「農薬・病害虫」タップ |
| ヘッダー種別 | スタックヘッダー |
| BottomTabBar | 非表示 |

### 5.3 トップ画面レイアウト（3 タブ）

```
┌───────────────────────────────────────────┐
│ ← 「農薬・病害虫図鑑」                      │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [TabBar]                                  │
│   [病害虫] [農薬製品] [農薬成分]           │
│                                           │
│ [各タブの FlatList（無限スクロール）]       │
│   各行: 名称 + 概要 1 行         [›]      │
│                                           │
└───────────────────────────────────────────┘
```

#### 共通セルの仕様（3 タブ共通）

| 要素 | 仕様 |
|------|------|
| 名称 | `textMd`（15pt）/ `colorTextPrimary` / `fontWeight: 600` |
| 概要 | `textSm`（12pt）/ `colorTextSecondary` / `numberOfLines: 1` |
| カテゴリタグ（任意） | 小チップ / `colorSurfaceMuted` 背景 |
| 行の高さ | 最小 60pt |
| ChevronRight | `colorTextTertiary` |

### 5.4 詳細画面レイアウト（3 カタログ共通構造）

```
┌───────────────────────────────────────────┐
│ ← 「{名称}」                               │
│                                           │
│ [ScrollView]                              │
│                                           │
│   [名称 + カテゴリタグ]                    │
│                                           │
│   [説明テキスト]                           │
│                                           │
│   [カタログ固有セクション]                  │
│   （病害虫: 症状・防除法 / 製品: 成分・希釈 / 成分: 製品一覧）│
│                                           │
└───────────────────────────────────────────┘
```

#### 病害虫詳細の追加セクション

| セクション | 内容 |
|-----------|------|
| 「症状」 | 症状の説明テキスト |
| 「発生時期」 | 月リストまたはテキスト |
| 「防除方法」 | 箇条書きまたは段落テキスト |
| 「関連農薬製品」 | 製品名リスト（各行タップで製品詳細へ）|

#### 農薬製品詳細の追加セクション

| セクション | 内容 |
|-----------|------|
| 「有効成分」 | 成分名リスト（各行タップで成分詳細へ）|
| 「希釈倍率・使用量」 | テキスト |
| 「使用上の注意」 | 箇条書き |
| 「対象病害虫」 | 病害虫名リスト（各行タップで病害虫詳細へ）|

#### 農薬成分詳細の追加セクション

| セクション | 内容 |
|-----------|------|
| 「作用機序」 | テキスト |
| 「含む製品」 | 製品名リスト（各行タップで製品詳細へ）|

### 5.5 コンポーネント分割

```
PesticidesScreen（トップ / 3 タブ）
├── PesticideTabBar              ← C-3 パターン使用
├── DiseasePestList（FlatList）  ← 病害虫タブ
│   └── DiseasePestCell
├── ProductList（FlatList）      ← 農薬製品タブ
│   └── ProductCell
└── IngredientList（FlatList）   ← 農薬成分タブ
    └── IngredientCell

DiseasePestDetailScreen
ProductDetailScreen
IngredientDetailScreen
  各: DetailHeader + 複数の InfoSection + RelatedItemList
```

`RelatedItemList` は詳細画面間の相互リンク（製品 ↔ 成分 ↔ 病害虫）を担う。
各リスト行のタップで対応する詳細画面へ push する（スタックに積み上がる）。

### 5.6 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| 病害虫一覧 | `GET /api/v1/pesticides/disease-pests?cursor=&limit=30` | `useDiseasePestsQuery` |
| 病害虫詳細 | `GET /api/v1/pesticides/disease-pests/{slug}` | `useDiseasePestDetailQuery` |
| 農薬製品一覧 | `GET /api/v1/pesticides/products?cursor=&limit=30` | `usePesticideProductsQuery` |
| 農薬製品詳細 | `GET /api/v1/pesticides/products/{slug}` | `usePesticideProductDetailQuery` |
| 農薬成分一覧 | `GET /api/v1/pesticides/ingredients?cursor=&limit=30` | `usePesticideIngredientsQuery` |
| 農薬成分詳細 | `GET /api/v1/pesticides/ingredients/{slug}` | `usePesticideIngredientDetailQuery` |

- ゲスト可能
- 一覧: カーソルベース無限スクロール / limit: 30
- タブ切り替え時に遅延取得

### 5.7 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| タブ切り替え | ローカル state / 遅延取得 |
| 各行タップ | 対応する詳細画面へ push |
| 相互リンクタップ | 相互に詳細画面へ push（スタックに積み上がる）|
| Pull-to-refresh | 現在アクティブなタブのクエリを再取得 |
| 無限スクロール | `onEndReached` で `fetchNextPage` |

### 5.8 エッジケース

各カタログ（タブ）が個別にローディング / エラー / 空の状態を持つ。切り替え先タブが未ロードの場合はタブ切り替え時にローディングを表示する。

| 状態 | 表示 |
|------|------|
| ローディング | `ScreenLoading variant="spinner"` |
| 空 | `ScreenEmpty title="データがありません"` |
| エラー | `ScreenError onRetry={refetch}` |
| 詳細 404 | `ScreenError title="この情報は見つかりません"` |
| オフライン | `OfflineBanner` |

### 5.9 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダー | 「農薬・病害虫図鑑」|
| タブ（病害虫） | 「病害虫」|
| タブ（農薬製品） | 「農薬製品」|
| タブ（農薬成分） | 「農薬成分」|
| 症状セクション | 「症状」|
| 発生時期セクション | 「発生時期」|
| 防除方法セクション | 「防除方法」|
| 関連製品セクション | 「関連農薬製品」|
| 有効成分セクション | 「有効成分」|
| 対象病害虫セクション | 「対象病害虫」|
| 作用機序セクション | 「作用機序」|
| 含む製品セクション | 「含む製品」|
| エラー | 「図鑑を読み込めませんでした。」|
| 詳細 404 | 「この情報は見つかりません。」|

### 5.10 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| タブバー | `accessibilityRole="tablist"` |
| 各タブ | `accessibilityRole="tab"` / `accessibilityState: { selected }` |
| セル行 | `accessibilityRole="button"` / `accessibilityLabel="{名称}の詳細を見る"` |
| 相互リンク | `accessibilityRole="button"` / `accessibilityLabel="{名称}の詳細を見る"` |

---

## 6. 法的文章（legal）

### 6.1 概要・目的

利用規約・プライバシーポリシー・特商法表記などの法的ドキュメントを表示する画面群。
`(tabs)/more` の「その他」グループから遷移する。
現時点では `more-menu.md` の仕様では `openBrowserAsync`（Web ページを開く）で対応しているが、本仕様はそれをネイティブ表示に移行した場合の仕様として定義する。

**実装優先度について:** MVP では `openBrowserAsync` で Web ページを開く方式を維持し、ネイティブ画面は Phase 3 以降のタスクとして検討する。本セクションはネイティブ化判断時の参考仕様として位置づける。`PM に要判断`。

### 6.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| 一覧画面 | `app/legal/index.tsx` |
| 詳細画面 | `app/legal/[slug]/index.tsx` |
| 遷移元 | `(tabs)/more` の「利用規約」「プライバシーポリシー」「特商法表記」タップ（直接詳細へ遷移も可）|
| ヘッダー種別 | スタックヘッダー |
| BottomTabBar | 非表示 |

### 6.3 一覧画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「法的情報」                              │
│                                           │
│ [FlatList]                                │
│   [利用規約]             2026-01-01  [›] │
│   [プライバシーポリシー]  2026-01-01  [›] │
│   [特商法表記]           2026-01-01  [›] │
└───────────────────────────────────────────┘
```

一覧セル:
- タイトル: `textMd`（15pt）/ `colorTextPrimary`
- 更新日: `textSm`（12pt）/ `colorTextSecondary`（`更新日: YYYY/MM/DD` 形式）
- 行の高さ: 最小 56pt

### 6.4 詳細画面レイアウト

```
┌───────────────────────────────────────────┐
│ ← 「{タイトル}」                            │
│                                           │
│ [ScrollView]                              │
│   padding: spacing4                       │
│                                           │
│   [ドキュメントタイトル]                    │  ← text2xl / colorTextPrimary
│   [更新日: YYYY/MM/DD]                    │  ← textSm / colorTextSecondary
│                                           │
│   [セクション 1]                           │
│     [見出し: sections[0].heading]         │  ← textLg / colorTextPrimary / fontWeight: 600
│     [本文: sections[0].body]              │  ← textBase / colorTextPrimary / lineHeight: 22pt
│                                           │
│   [セクション 2]                           │
│     [見出し]                              │
│     [本文（\n 改行をレンダリング）]         │
│   ...                                    │
└───────────────────────────────────────────┘
```

#### body テキストの改行処理

`sections[].body` は `\n` 改行のプレーンテキスト。
React Native の `<Text>` コンポーネントは `\n` を自動的に改行として扱うため、**特別な加工不要**で表示できる。frontend はそのまま `<Text>{body}</Text>` で実装してよい。

#### セクション見出しのスタイル

| 要素 | 仕様 |
|------|------|
| 見出し（heading） | `textLg`（17pt）/ `colorTextPrimary` / `fontWeight: 600` / `marginBottom: spacing2` / `marginTop: spacing4` |
| 本文（body） | `textBase`（14pt）/ `colorTextPrimary` / `lineHeight: 22pt` |
| セクション間余白 | `spacing4` |

### 6.5 コンポーネント分割

```
LegalListScreen（一覧）
└── LegalDocumentList（FlatList）
    └── LegalDocumentCell

LegalDetailScreen（詳細）
├── LegalDocumentHeader         ← タイトル + 更新日
└── LegalSectionList
    └── LegalSection            ← heading + body
```

### 6.6 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| 法的文書一覧 | `GET /api/v1/legal` | `useLegalDocumentsQuery` |
| 法的文書詳細 | `GET /api/v1/legal/{slug}` | `useLegalDocumentDetailQuery` |

- ゲスト可能（認証不要）
- 一覧はカーソルなし（固定件数）
- 詳細レスポンス: `{ slug, title, updatedAt, sections: { heading: string, body: string }[] }`

### 6.7 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| セル行タップ | `legal/[slug]` へ push |
| スクロール | 自然なスクロール（ScrollView）|

### 6.8 エッジケース

| 状態 | 表示 |
|------|------|
| ローディング | `ScreenLoading variant="spinner"` |
| 一覧空 | `ScreenEmpty title="法的情報がありません"` |
| 詳細エラー | `ScreenError onRetry={refetch}` |
| 詳細 404 | `ScreenError title="このページは見つかりません"` / 戻るリンク |
| オフライン | `OfflineBanner` |

### 6.9 コピー案

| 箇所 | 文言 |
|------|------|
| 一覧ヘッダー | 「法的情報」|
| 更新日表示 | 「更新日: {YYYY}/{MM}/{DD}」|
| エラー | 「ページを読み込めませんでした。」|
| 詳細 404 | 「このページは見つかりません。」|

### 6.10 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 一覧セル | `accessibilityRole="button"` / `accessibilityLabel="{title}（更新日: {date}）"` |
| セクション見出し | `accessibilityRole="header"` |
| 本文 | `accessibilityRole="text"` |

---

## 7. 投稿分析（analytics）

### 7.1 概要・目的

プレミアム会員が自分の投稿のパフォーマンスを確認できるダッシュボード画面。
`(tabs)/more` の「投稿分析」行から遷移する（プレミアム会員のみ表示）。
非プレミアム会員がこの画面に直接アクセスした場合は 403 を受け取り、プレミアム誘導 UI を表示する。

**store-compliance.md 準拠:** プレミアム誘導 UI には「Google Play の購読管理」への導線は設けてよいが、Stripe など外部決済ページへのリンク・文言は一切表示しない。

### 7.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| 画面 | `app/analytics/index.tsx` |
| 遷移元 | `(tabs)/more` の「投稿分析」タップ（プレミアム会員のみグループ表示）|
| ヘッダー種別 | スタックヘッダー |
| ヘッダータイトル | 「投稿分析」|
| BottomTabBar | 非表示 |
| ディープリンク | 不要 |

**`more-menu.md` との整合:** `more-menu.md` §3.4 でグループ 4（プレミアム機能）は `isPremium === true` のときのみ表示される。非プレミアムユーザーが直接 URL で到達した場合にも 403 を想定して誘導 UI を用意する。

### 7.3 画面構成（プレミアム会員）

```
┌───────────────────────────────────────────┐
│ ← 「投稿分析」                              │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [期間切替バー]                              │  ← 上部固定
│   [7日] [30日] [90日]                     │
│                                           │
│ [ScrollView]                              │
│                                           │
│  ┌── カード 1: 投稿サマリ ──────────────┐ │
│  │ 「投稿」（カードタイトル）              │ │
│  │                                       │ │
│  │ [総投稿数] [総いいね数] [総コメント数]  │ │
│  │   {N}件     {N}件       {N}件         │ │
│  │                                       │ │
│  │ 平均エンゲージメント率: {N}%           │ │
│  │                                       │ │
│  │ 「人気投稿トップ 3」                    │ │
│  │ [投稿サムネイル/テキスト] いいね:{N}   │ │
│  │ [投稿サムネイル/テキスト] いいね:{N}   │ │
│  │ [投稿サムネイル/テキスト] いいね:{N}   │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌── カード 2: フォロワー ──────────────┐ │
│  │ 「フォロワー」（カードタイトル）         │ │
│  │                                       │ │
│  │ 現在: {N}人   期間内増加: +{N}人       │ │
│  │                                       │ │
│  │ 「フォロワー推移」                      │ │
│  │ [簡易バーグラフ（View ベース）]         │ │
│  └─────────────────────────────────────┘ │
│                                           │
│  ┌── カード 3: エンゲージメント推移 ──────┐ │
│  │ 「エンゲージメント推移」                │ │
│  │                                       │ │
│  │ [簡易バーグラフ（View ベース）]         │ │
│  │  ← 日付ラベル（N日 or N/M 形式）→     │ │
│  └─────────────────────────────────────┘ │
│                                           │
└───────────────────────────────────────────┘
```

### 7.4 非プレミアム時の表示（403 / isPremium=false）

```
┌───────────────────────────────────────────┐
│ ← 「投稿分析」                              │
│                                           │
│                                           │
│         [鍵アイコン（大）]                  │  ← Lock アイコン 48pt / colorTextSecondary
│                                           │
│    「この機能はプレミアム会員限定です」       │  ← textLg / colorTextPrimary
│   「投稿のパフォーマンスを詳しく把握して、  │  ← textBase / colorTextSecondary
│     盆栽コンテンツをより多くの方に          │
│     届けましょう。」                        │
│                                           │
│   「プレミアムプランについて」               │  ← colorActionPrimary ボタン / h: 44pt
│                                           │
│                                           │
└───────────────────────────────────────────┘
```

| 要素 | 仕様 |
|------|------|
| ロックアイコン | `Lock` 48pt / `colorTextSecondary` |
| 見出し | `textLg`（17pt）/ `colorTextPrimary` |
| 説明文 | `textBase`（14pt）/ `colorTextSecondary` / `textAlign: center` |
| CTA ボタン | 「プレミアムプランについて」/ 背景 `colorActionPrimary` / 文字 `colorActionPrimaryText` / 高さ 44pt / 角丸 `radiusMd` |
| CTA タップ | `settings/subscription` へ push |

**外部決済誘導の禁止:** Stripe や外部決済 URL へのリンク・ボタン・テキストは一切表示しない（`store-compliance.md` 準拠）。`settings/subscription` 内でも同様のルールが適用される。

### 7.5 期間切替バーの仕様

```
┌────────────────────────────────┐
│  [7日]  [30日]  [90日]        │
└────────────────────────────────┘
```

| 属性 | 未選択 | 選択中 |
|------|--------|--------|
| 背景 | `colorSurfaceMuted` | `colorActionPrimary` |
| テキスト | `colorTextSecondary` | `colorActionPrimaryText` |
| 角丸 | `radiusFull` | `radiusFull` |
| 高さ | 36pt（`hitSlop` で 44pt 確保）| 同左 |
| 幅 | 均等（`flex: 1`）| 同左 |
| 選択状態 | ローカル state（デフォルト: 30日）| |

期間変更 → API クエリパラメータを更新 → キャッシュが異なる（`queryKey` に期間を含める）。

### 7.6 グラフ（View ベース）の仕様

チャートライブラリを追加せず、`View` のみで棒グラフを実装する方針を推奨する。
frontend がチャートライブラリを採用する場合は、バンドルサイズへの影響を PM と確認してから追加すること。

#### 簡易バーグラフの仕様

```
[最大値ライン（省略可）]
│
│     ▓
│  ▓  ▓  ▓
│  ▓  ▓  ▓  ▓
└──────────────
 M1  M2  M3  M4   ← 日付ラベル
```

| 要素 | 仕様 |
|------|------|
| グラフコンテナ | `flexDirection: "row"` / `alignItems: "flex-end"` / 高さ 80pt |
| バー幅 | データ点数に応じて均等割り（`flex: 1` / 間隔 `spacing1`）|
| バー高さ | `value / maxValue × 80pt` |
| バー色 | `colorActionPrimary`（`#2e2e2e`）|
| バー角丸 | 上端のみ `radiusXs`（4pt）|
| ラベル | バー下 / `textXs`（10pt）/ `colorTextSecondary` / 中央寄せ |
| ラベル形式 | 7日: `M/D` 形式 / 30日: 週単位（`M/D〜`）/ 90日: `M月` 形式 |
| 0 件時バー | 高さ 2pt（最小表示）|

#### 数値カードの仕様

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│   {N}件  │  │  {N}件   │  │  {N}件   │
│ 総投稿数 │  │ 総いいね │  │総コメント│
└──────────┘  └──────────┘  └──────────┘
```

| 要素 | 仕様 |
|------|------|
| 数値 | `text2xl`（24pt）/ `colorTextPrimary` / `fontWeight: 700` |
| ラベル | `textXs`（10pt）/ `colorTextSecondary` |
| カードコンテナ | `flex: 1` / `colorSurface` 背景 / `radiusMd` 角丸 / `spacing3` パディング |
| カード間隔 | `spacing2`（8pt）|

#### 人気投稿トップ 3 の仕様

```
[投稿プレビュー行]
  [1位] [画像サムネイル 44pt or テキスト冒頭] いいね:{N}  コメント:{N}
```

| 要素 | 仕様 |
|------|------|
| 順位 | `textSm` / `colorTextSecondary` / 幅 20pt |
| サムネイル | 画像投稿は 44×44pt expo-image / テキストのみは `textSm numberOfLines: 1` |
| いいね・コメント数 | `textSm` / `colorTextSecondary` |
| 行タップ | `posts/[id]` へ push |
| 行の高さ | 最小 52pt |

### 7.7 コンポーネント分割

```
AnalyticsScreen
├── AnalyticsPeriodSelector       ← 期間切替バー（7日/30日/90日）
├── AnalyticsPremiumGate          ← 非プレミアム時の誘導 UI
└── AnalyticsDashboard            ← プレミアム時のダッシュボード
    ├── AnalyticsCard             ← カードコンテナ（共通）
    │   props: title: string, children: ReactNode
    ├── AnalyticsPostsSummary     ← 投稿サマリカード
    │   ├── MetricRow             ← 3 列数値表示
    │   └── TopPostsList          ← 人気投稿トップ 3
    ├── AnalyticsFollowersSummary ← フォロワーカード
    │   └── SimpleBarChart        ← View ベース簡易バーグラフ
    └── AnalyticsEngagementTrend  ← エンゲージメント推移カード
        └── SimpleBarChart
```

### 7.8 データの流れ

| データ | API | 取得フック |
|--------|-----|----------|
| 分析データ | `GET /api/v1/analytics?period={7|30|90}` | `useAnalyticsQuery(period)` |

- Bearer 必須（ゲスト不可）
- 403 → `isPremium === false` とみなし `AnalyticsPremiumGate` を表示
- キャッシュキーに `period` を含める（`queryKeys.analytics.byPeriod(period)`）
- 期間変更時は前の期間のキャッシュを保持（`staleTime` を長めに設定 — 定数化）

### 7.9 状態とインタラクション

| 操作 | 挙動 |
|------|------|
| 期間切替 | `period` の state 更新 → API 再取得（キャッシュあれば即表示）|
| 人気投稿タップ | `posts/[id]` へ push |
| CTA ボタンタップ（非プレミアム）| `settings/subscription` へ push |
| Pull-to-refresh | 現在の `period` でクエリを再取得 |

### 7.10 エッジケース

| 状態 | 表示 |
|------|------|
| ローディング | `ScreenLoading variant="spinner"` |
| 403（非プレミアム） | `AnalyticsPremiumGate`（§7.4 参照）|
| データなし（0 件）| 数値は「0」表示・バーグラフは最小高さバー |
| エラー（4xx 以外）| `ScreenError onRetry={refetch}` |
| オフライン | `OfflineBanner` / キャッシュあれば表示継続 |

### 7.11 コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダー | 「投稿分析」|
| 期間ボタン（7日） | 「7日間」|
| 期間ボタン（30日） | 「30日間」|
| 期間ボタン（90日） | 「90日間」|
| 投稿カードタイトル | 「投稿」|
| 総投稿数ラベル | 「投稿数」|
| 総いいね数ラベル | 「いいね」|
| 総コメント数ラベル | 「コメント」|
| エンゲージメント率ラベル | 「平均エンゲージメント率」|
| 人気投稿セクション | 「人気投稿トップ 3」|
| フォロワーカードタイトル | 「フォロワー」|
| 現在フォロワー数ラベル | 「現在」|
| 期間内増加数ラベル | 「期間内増加」|
| フォロワー推移ラベル | 「フォロワー推移」|
| エンゲージメントカードタイトル | 「エンゲージメント推移」|
| プレミアムゲート見出し | 「この機能はプレミアム会員限定です」|
| プレミアムゲート説明 | 「投稿のパフォーマンスを詳しく把握して、盆栽コンテンツをより多くの方に届けましょう。」|
| CTA ボタン | 「プレミアムプランについて」|
| エラー | 「分析データを読み込めませんでした。」|

### 7.12 アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 期間切替ボタン | `accessibilityRole="button"` / `accessibilityState: { selected }` / `accessibilityLabel="{N}日間を選択"` |
| 数値カード | `accessibilityLabel="{ラベル}: {数値}"` |
| バーグラフ | `accessibilityRole="image"` / `accessibilityLabel="{期間}の{指標}推移グラフ"` |
| 各バー | `accessibilityLabel="{日付/期間}: {数値}"` |
| 人気投稿行 | `accessibilityRole="button"` / `accessibilityLabel="{順位}位: いいね{N}件"` |
| ロックアイコン（プレミアムゲート）| `accessibilityElementsHidden={true}` |
| CTA ボタン | `accessibilityRole="button"` / `accessibilityLabel="プレミアムプランの詳細を見る"` |

---

## 8. store-compliance.md との対応確認

| 要件 | 対応状況 |
|------|---------|
| 外部決済ページへの誘導禁止 | analytics の非プレミアムゲートは `settings/subscription`（ネイティブ画面）へ誘導し、外部 URL は出さない |
| プレミアム判定はサーバー DB 基準 | 403 レスポンスを受け取った場合に非プレミアム扱いとする（RevenueCat SDK 判定は使わない）|
| 通報・ブロック | これらの画面には含まない（`ugc-safety.md` の担当画面で提供）|
| アカウント削除 | これらの画面には含まない（`settings/account` で提供）|

---

## 9. ナビゲーション構造まとめ

```
(tabs)/more
├── 「発見」タップ            → app/explore/index.tsx
│
├── 「盆栽用語辞典」タップ    → app/dictionary/index.tsx
│                              └── app/dictionary/[slug]/index.tsx
│
├── 「施肥ガイド」タップ      → app/fertilizers/index.tsx（3 タブ）
│                              ├── app/fertilizers/nutrients/[slug]/index.tsx
│                              └── app/fertilizers/tree-species/[slug]/index.tsx
│
├── 「植物ホルモン」タップ    → app/hormones/index.tsx
│                              └── app/hormones/[slug]/index.tsx
│
├── 「農薬・病害虫」タップ    → app/pesticides/index.tsx（3 タブ）
│                              ├── app/pesticides/disease-pests/[slug]/index.tsx
│                              ├── app/pesticides/products/[slug]/index.tsx
│                              └── app/pesticides/ingredients/[slug]/index.tsx
│
├── 「利用規約」等タップ      → app/legal/[slug]/index.tsx（直接詳細へ）
│                              または app/legal/index.tsx → 詳細
│
└── 「投稿分析」タップ        → app/analytics/index.tsx
```

**`navigation-structure.md` への追記依頼:** 上記のルートを `app/` のファイル構成と `settings/` スタックに追記すること（frontend またはPM が `navigation-structure.md` を更新する）。

---

## 10. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| タグ・ジャンル別投稿一覧 API | explore 画面のタグ・ジャンルチップのタップ先となる API が未提供 | core に要相談 |
| fertilizer カテゴリタブの詳細 | カテゴリ行のタップ挙動（詳細なし or 栄養素フィルタとして機能）| core に要相談 |
| 施肥スケジュールの `level` 値の定義 | `months[].level` の値域・ラベル（「なし」「少し」「標準」「多め」等）| core に要相談 |
| ホルモン季節変動の `level` 値 | `seasonalLevels[].level` の値域定義 | core に要相談 |
| legal 画面のネイティブ化優先度 | MVP では `openBrowserAsync` で代替するか、ネイティブ画面として実装するか | PM に要判断 |
| analytics バーグラフの外部ライブラリ採用 | `View` ベースの簡易実装で十分か、chart ライブラリを追加するか | PM / frontend に要判断 |
| explore・dictionary 等のディープリンク | MVP で `bonlog://explore` 等を設けるか | PM に要判断 |
| analytics の `topPosts[]` のフィールド詳細 | サムネイル URL・テキスト冒頭などレスポンス形式を確認 | core に要確認 |
| analytics の `growth[]` の日付フォーマット | バーグラフの日付ラベル形式を決定するためにフィールド形式が必要 | core に要確認 |
