# ブックマーク画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
対象画面:
- `bookmarks/index` — ブックマーク一覧

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-card.md` の PostCard・PostCardActions コンポーネントを流用する
- `store-compliance.md`（通報・ブロック要件）を確認済み

---

## 1. 概要・目的

自分がブックマーク（保存）した投稿を一覧表示する画面。
フィードと同様の投稿カード表示を採用し、操作感の一貫性を保つ。
ブックマーク解除もカード上のアクションから直接実行できる。

---

## 2. 画面構成

### 2.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「ブックマーク」                                     │
│   右: なし                                                  │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   contentContainerStyle: paddingHorizontal spacing4         │
│   paddingTop: spacing3                                      │
│   paddingBottom: spacing8 + セーフエリア下端                 │
│                                                             │
│   [PostCard × N]                                            │
│     ↓ pull-to-refresh でリスト更新                          │
│     ↓ 末尾に達したら次ページ取得（カーソルベース）            │
│     [追加読み込みスピナー（フッター）]                        │
│                                                             │
│ [セーフエリア下端 + BottomTabBar]                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 PostCard の表示仕様

- `post-card.md` の PostCard を再利用する。レイアウト・スタイルは変更しない
- `PostCardActions` にブックマークボタンが含まれる（後述 §2.3）
- ブックマーク解除後は楽観更新でリストから即時除外する

### 2.3 PostCardActions へのブックマークボタン追加位置

既存 `PostCardActions`（いいね / コメント / リポスト）の右端にブックマークボタンを追加する。

```
[♥ いいね]  [💬 コメント]  [🔁 リポスト]        [🔖 保存]
 ↑ 左寄せ 3 ボタン                              ↑ 右寄せ 1 ボタン
```

**レイアウト:** 左寄せ3ボタンと右寄せ1ボタンを `flexDirection: "row"` / `justifyContent: "space-between"` で配置。

**ブックマークボタン仕様:**

| 状態 | アイコン | 色 |
|------|---------|---|
| 未保存 | Bookmark（アウトライン）| `colorTextSecondary`（`#5c5c5c`）|
| 保存済み | Bookmark（塗りつぶし）| `colorActionPrimary`（`#2e2e2e`）|
| 操作中 | スピナー | `colorActionPrimary` |

- タップターゲット: 44pt 以上（`hitSlop` で確保）
- `accessibilityRole`: `"button"`
- `accessibilityLabel`: 未保存時「ブックマークに追加」/ 保存済み「ブックマークを解除」
- `accessibilityState`: `{ checked: isBookmarked }`

**楽観更新:** タップ時に即座に状態を反転させ、API 失敗時にロールバックする。

---

## 3. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `bookmarks/index`（タブ外スタック画面）|
| 遷移元 | `(tabs)/more` の「ブックマーク」行タップ（`more-menu.md` §3.2 に相当するネイティブ遷移へ変更） |
| 遷移先（投稿タップ）| `posts/[id]`（投稿詳細）|
| 遷移先（ユーザーアバタータップ）| `users/[id]`（ユーザープロフィール）|
| ディープリンク | 不要 |

**もっと見る画面との関係:**
`more-menu.md` §3.2 では「ブックマーク」を `openBrowserAsync` で Web 版に遷移させる設計になっているが、ネイティブ画面の実装後は `router.push(routes.bookmarks)` によるネイティブ遷移に切り替えることを frontend に申し送る。Web へのフォールバックから切り替えるタイミングはフロントエンドの実装スケジュールに委ねる。

**iOS / Android 差異:** 特になし。スタックナビゲーションの標準的な動作を使う。

---

## 4. コンポーネント分割

```
BookmarksScreen                  ← 画面コンテナ
├── BookmarksList                ← FlatList ラッパー（pull-to-refresh・無限スクロール）
│   ├── PostCard                 ← post-card.md の既存コンポーネントを再利用
│   │   └── PostCardActions      ← ブックマークボタンを追加（既存コンポーネントに追記）
│   └── BookmarksListFooter      ← 追加読み込みスピナー
├── ScreenLoading               ← common-states.md 流用（初回取得中）
├── ScreenEmpty                 ← common-states.md 流用（0件時）
├── ScreenError                 ← common-states.md 流用（エラー時）
└── OfflineBanner               ← common-states.md 流用
```

### 4.1 BookmarksList props

| prop 名 | 意味 |
|---------|------|
| `data` | ブックマークされた投稿リスト（ページ結合済み）|
| `onLoadMore` | 追加読み込みコールバック |
| `onRefresh` | pull-to-refresh コールバック |
| `isRefreshing` | pull-to-refresh インジケータ表示フラグ |
| `isFetchingNextPage` | 追加読み込み中フラグ |
| `hasNextPage` | 次ページ有無 |

---

## 5. データの流れ

### 5.1 ブックマーク一覧取得

- エンドポイント: `GET /api/v1/bookmarks`（想定。正本は OpenAPI）
- カーソルベースページネーション: `cursor` パラメータ + `nextCursor` レスポンス
- `useInfiniteQuery`（`queryKeys.bookmarks.list` 相当）で取得
- 各ページのアイテムは投稿フィードと同形式の投稿データを返す（想定）
- **core に要確認:** レスポンスの形式（投稿オブジェクトがネストされるか、ブックマーク ID + 投稿 ID のみかを確認）

### 5.2 ブックマークのトグル

- 追加: `POST /api/v1/bookmarks`（body: `{ postId }`）
- 解除: `DELETE /api/v1/bookmarks/{postId}`
- 操作後に `queryKeys.bookmarks.list` / `queryKeys.posts.detail(postId)` を `invalidateQueries`
- 楽観更新パターン: `onMutate`（キャッシュ更新）→ `onError`（ロールバック）→ `onSettled`（invalidate）

### 5.3 必要なデータ項目

投稿カードの表示に必要なフィールドは `post-card.md` の PostCard が要求するものと同一。追加フィールドは不要。

各投稿に `isBookmarked: boolean` フィールドが含まれること（ブックマークボタンの初期状態表示に使用）。

---

## 6. 状態とインタラクション

### 6.1 pull-to-refresh

- FlatList の `refreshControl` で実装（`RefreshControl` コンポーネント）
- `onRefresh` コールバックでクエリを `refetch` する
- スピナー色: `colorActionPrimary`（`#2e2e2e`）

### 6.2 無限スクロール

- FlatList の `onEndReached`（`onEndReachedThreshold: 0.3`）で次ページを取得
- `isFetchingNextPage === true` の場合、フッターにスピナーを表示

### 6.3 ブックマーク解除

ブックマーク一覧でブックマーク解除した場合:
- 楽観更新でリストから即時除外する（スムーズにアイテムが消える）
- API 失敗時: アイテムをリストに戻す（ロールバック）＋ エラートースト「ブックマークの解除に失敗しました。もう一度お試しください。」を表示

---

## 7. エッジケース

### 7.1 ローディング

- 初回取得中: `ScreenLoading`（`variant="skeleton"` で PostCardSkeleton × 3 を表示）
- FlatList のスケルトンは `post-card.md` §2（PostCard 外形）の形状を模す

### 7.2 空状態

```
アイコン: Bookmark（Lucide 系）/ colorTextSecondary
見出し: 「ブックマークがありません」
補足: 「投稿のブックマークボタンをタップすると、ここに保存されます。」
アクション: 「フィードを見る」ボタン → (tabs)/feed
```

### 7.3 エラー

| エラー種別 | 表示 |
|-----------|------|
| 一覧取得失敗 | `ScreenError`（title: 「読み込めませんでした」/ `ERR_GENERIC` / `onRetry: refetch`）|
| ブックマーク追加失敗 | エラートースト「ブックマークに追加できませんでした。もう一度お試しください。」|
| ブックマーク解除失敗 | エラートースト「ブックマークの解除に失敗しました。もう一度お試しください。」|
| ネットワークエラー | `ScreenError`（`ERR_NETWORK`）または フッターに再試行ボタン（追加読み込み失敗時）|
| 5xx エラー | `ScreenError`（`ERR_SERVER`）|

### 7.4 オフライン

- `OfflineBanner` を画面上部に表示
- キャッシュ済みデータがある場合はリスト表示を維持する
- ブックマークのトグル操作: オフライン検知時は操作をブロックし、エラートーストを表示
- キャッシュなしでオフラインの場合: `ScreenError`（description: `ERR_OFFLINE_ACTION`）

---

## 8. コピー案

| 箇所 | 文言 |
|------|------|
| ヘッダータイトル | 「ブックマーク」|
| ブックマーク追加（accessibilityLabel）| 「ブックマークに追加」|
| ブックマーク解除（accessibilityLabel）| 「ブックマークを解除」|
| 空状態 見出し | 「ブックマークがありません」|
| 空状態 補足 | 「投稿のブックマークボタンをタップすると、ここに保存されます。」|
| 空状態 アクション | 「フィードを見る」|
| ブックマーク追加失敗トースト | 「ブックマークに追加できませんでした。もう一度お試しください。」|
| ブックマーク解除失敗トースト | 「ブックマークの解除に失敗しました。もう一度お試しください。」|

---

## 9. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| ブックマークボタン | `accessibilityRole="button"` / `accessibilityLabel` で状態を伝える / `accessibilityState: { checked: isBookmarked }` |
| ブックマークボタン タップターゲット | `hitSlop` で 44pt 以上を確保 |
| FlatList | `accessibilityRole="list"` |
| PostCard | `accessibilityRole="article"` / `post-card.md` の accessibilityLabel 仕様に準拠 |
| ローディング | `ScreenLoading` の `accessibilityLabel="読み込み中"` |
| 空状態 | `ScreenEmpty` の見出しに `accessibilityRole="header"` |
| エラー | `ScreenError` の `accessibilityRole="alert"` |

---

## 10. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-card.md`（PostCard）| 投稿表示はすべて既存コンポーネントを再利用する。レイアウト変更なし |
| `post-card.md`（PostCardActions）| 右端にブックマークボタンを追加する。アクション間隔・高さは既存仕様を踏襲 |
| `common-states.md`（ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner）| 4 状態をすべて既存コンポーネントで実装 |
| `(tabs)/feed` の FlatList 実装 | pull-to-refresh / 無限スクロール / スケルトン表示のパターンをフィードから踏襲する |
| `more-menu.md` §3.2「ブックマーク」行 | ネイティブ画面実装後は `openBrowserAsync` から `router.push` に切り替える（frontend への申し送り）|

---

## 11. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| ブックマーク API のレスポンス形式 | 投稿オブジェクトのネスト有無 / フィールド構成を確認する | core に要確認 |
| `isBookmarked` フィールドの有無 | 既存の投稿取得 API（フィード・詳細）のレスポンスに `isBookmarked` が含まれるか確認する | core に要確認 |
| `more-menu.md` の「ブックマーク」遷移先 | ネイティブ画面実装後に `openBrowserAsync` → `router.push` に切り替えるタイミング | frontend |
