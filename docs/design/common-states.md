# 共通状態コンポーネント仕様 — Bon_Log Native

作成日: 2026-06-12
追記（2026-07-13・エラー色トークンの是正）: §4.4 ScreenError のアイコン色 `colorError` 記載値を `#c0392b` から `#c21721` へ修正した。旧値は `design-tokens.md` の旧誤記に起因するもので、実装 `lib/constants/design-tokens.ts` の実際の値は `#c21721`。根拠は `design-tokens.md` §11 を参照。
前提: `design-tokens.md`（§2.3 セマンティックカラー）・`navigation-structure.md`（§6 文言トーン方針）に準拠
対象: `components/common/` に配置される 4 種の共通状態コンポーネント

---

## 1. 概要

すべての画面は **ローディング / 空 / エラー / オフライン** の 4 状態を持つ（`error-handling.md` 準拠）。
各状態は専用コンポーネントに集約し、画面ごとに文言・アクションを差し替えて使う。

| コンポーネント名 | 状態 | 用途 |
|----------------|------|------|
| `ScreenLoading` | ローディング | データ取得中のプレースホルダー表示 |
| `ScreenEmpty` | 空 | データが 0 件の場合 |
| `ScreenError` | エラー | 取得失敗・想定外エラー |
| `OfflineBanner` | オフライン | ネットワーク切断中の通知 |

---

## 2. ScreenLoading

### 2.1 概要・目的

データ取得中（TanStack Query の `isLoading` = true）に表示するプレースホルダー。
ユーザーに読み込み中であることを伝えつつ、レイアウトシフトを最小化する。

### 2.2 方針: スケルトン優先

- **原則としてスケルトン UI を使う。** 中央スピナー 1 個で「待たせる」演出は避ける
- スケルトンは表示先の実コンポーネントの形状を模すことで、ロード完了後のレイアウトシフトを抑える
- スケルトンが定義しにくい場面（全画面初期化中等）のみ `variant="spinner"` を使う

### 2.3 画面別スケルトン構成

| 使用箇所 | スケルトン構成 |
|---------|-------------|
| フィード | `PostCardSkeleton` x 3 縦並び |
| 通知リスト | `NotificationCellSkeleton` x 4 縦並び |
| プロフィール | `ProfileHeaderSkeleton` + `PostCardSkeleton` x 2 |
| サブスクリプション | `SubscriptionPlanSkeleton` 1 枚 |
| 汎用（全画面） | 中央配置のスピナー（`variant="spinner"`）|

`PostCardSkeleton`・`ProfileHeaderSkeleton` 等の個別スケルトンはこのコンポーネントから compose する専用コンポーネントとして切り出す（各機能の設計仕様で定義する）。本仕様では共通の「スケルトンブロック」の見た目を定義する。

### 2.4 レイアウト

#### スケルトンブロック（基本形）

```
┌──────────────────────────────────────┐
│  [Circle 44x44] [Rect 120x14]        │  ← ヘッダー行（アバター + ユーザー名）
│                 [Rect 60x12]         │  ← 日時行
│  [Rect 100% x 14]                    │  ← 本文 1 行目
│  [Rect 80%  x 14]                    │  ← 本文 2 行目
│  [Rect 100% x 120]                   │  ← 画像エリア（任意）
└──────────────────────────────────────┘
```

#### スピナー（variant="spinner"）

```
┌──────────────────────────────────────┐
│                                      │
│              ◎ スピナー              │  ← 画面中央 / flex: 1 で高さ充填
│                                      │
└──────────────────────────────────────┘
```

### 2.5 使用トークン

| 要素 | トークン |
|------|---------|
| スケルトン背景色 | `colorSurfaceMuted`（`#f0f0f0`）|
| スケルトンシマー色（アニメーション終端） | `colorSurface`（`#fcfcfc`）|
| スピナー色 | `colorActionPrimary`（`#2e2e2e`）|
| 背景 | `colorBackground`（`#ffffff`）|

### 2.6 アニメーション

- スケルトンには左から右へのシマーアニメーション（`durationSlow: 500ms` × ループ）
- `useNativeDriver: true` を使いネイティブドライバで動作させる（JS スレッド負荷回避）
- `accessibilityLabel`: `"読み込み中"` を付与

### 2.7 props 概要

| prop 名 | 意味 |
|---------|------|
| `variant` | `"skeleton"` (デフォルト) \| `"spinner"` — 表示バリアント |
| `skeletonCount` | スケルトンブロックの繰り返し数（デフォルト: 3） |
| `accessibilityLabel` | スクリーンリーダー向けラベル（デフォルト: "読み込み中"）|

### 2.8 accessibility

- コンテナに `accessibilityRole="progressbar"` + `accessibilityLabel="読み込み中"` を付与
- スケルトンブロックは装飾目的のため `accessibilityElementsHidden={true}` で非表示化

---

## 3. ScreenEmpty

### 3.1 概要・目的

データが 0 件の場合に表示する。
原因の説明 + 次のアクション（任意）でユーザーを離脱させない。

### 3.2 レイアウト

```
┌──────────────────────────────────────┐
│                                      │
│         [イラストまたはアイコン]      │  ← 中央寄せ / 幅 120pt
│                                      │
│           [見出し（h3）]             │  ← textLg / colorTextPrimary
│         [補足テキスト]               │  ← textBase / colorTextSecondary
│                                      │
│         [アクションボタン（任意）]    │  ← colorActionPrimary / h: 44pt以上
│         [サブリンク（任意）]         │  ← テキストリンク / colorTextLink
│                                      │
└──────────────────────────────────────┘
```

- コンテナは `flex: 1`（利用可能な高さを充填）+ `alignItems: center` + `justifyContent: center`
- 画面コンテンツのない状態での「寂しさ」を和らげるため、シンプルなアイコンを置く（イラスト画像は Web 版に `empty-timeline.webp` 等が存在するが、モバイルではバンドルサイズ削減のため Lucide 系ベクターアイコンを使う。イラスト使用の可否は PM に要判断）
- アイコンを囲む円背景: 直径 72pt / `borderRadius: radiusFull` / 背景 `colorSurfaceMuted`

### 3.3 画面別文言例

| 使用箇所 | 見出し | 補足 | アクション |
|---------|--------|------|----------|
| フィード | 「タイムラインに投稿がありません」| 「ユーザーをフォローすると、その人の投稿がここに表示されます」 | 「ユーザーを検索」ボタン → 検索画面 |
| 検索（結果なし） | 「一致する結果がありません」| 「別のキーワードでお試しください」 | なし |
| 通知 | 「まだ通知はありません」| 「いいねやコメントが届くとここに表示されます」 | なし |
| コメント（投稿詳細） | 「まだコメントはありません」| 「最初のコメントをしてみましょう」 | なし（入力バーが常時表示） |
| 自分の投稿（プロフィール） | 「まだ投稿がありません」| 「投稿ボタンから盆栽の記録をシェアしましょう」 | なし（FAB で誘導） |
| ブロックリスト | 「ブロック中のユーザーはいません」| 「ブロックしたユーザーがここに表示されます」 | なし |

**文言ルール（`navigation-structure.md` §6.2 準拠）:**
- 見出しは「まだ〜がありません」または状態を端的に表す名詞句
- 補足は原因または次のアクション示唆を 40 字以内で
- ユーザーを責めない・機能の存在を説明するトーン

### 3.4 使用トークン

| 要素 | トークン |
|------|---------|
| アイコン円背景 | `colorSurfaceMuted`（`#f0f0f0`）|
| アイコン色 | `colorTextSecondary`（`#5c5c5c`）|
| 見出しテキスト | `textLg` / `colorTextPrimary` |
| 補足テキスト | `textBase` / `colorTextSecondary` |
| アクションボタン背景 | `colorActionPrimary`（`#2e2e2e`）|
| アクションボタンテキスト | `colorActionPrimaryText`（`#ffffff`）|
| サブリンクテキスト | `colorTextLink`（`#2e2e2e`）|

### 3.5 props 概要

| prop 名 | 意味 |
|---------|------|
| `icon` | アイコンコンポーネント（Lucide 系を想定）|
| `title` | 見出し文言（必須）|
| `description` | 補足文言（任意）|
| `actionLabel` | アクションボタンのラベル（任意）|
| `onAction` | アクションボタンのコールバック（`actionLabel` と対で指定）|
| `subLinkLabel` | サブリンクのラベル（任意）|
| `onSubLink` | サブリンクのコールバック（`subLinkLabel` と対で指定）|

### 3.6 accessibility

- 見出しに `accessibilityRole="header"` を付与
- アクションボタンのタップターゲット: 高さ 44pt 以上・幅は最低 160pt

---

## 4. ScreenError

### 4.1 概要・目的

TanStack Query のエラー状態（`isError` = true）や Expo Router の `ErrorBoundary` で表示する。
Web 版 `PageError.tsx` のモバイル版に相当する（`components/common/PageError.tsx` から設計を継承）。

**Sentry への送信は実装側の責務。** このコンポーネントは表示専用とし、Sentry 呼び出しは ErrorBoundary または呼び出し元フックで行う（`error-handling.md` 準拠）。

### 4.2 レイアウト

```
┌──────────────────────────────────────┐
│                                      │
│    [エラーアイコン（赤丸背景内）]     │  ← 直径 72pt / colorErrorBg 背景
│                                      │
│       [タイトル（h2）]               │  ← textLg / colorTextPrimary
│       [説明文]                       │  ← textBase / colorTextSecondary
│                                      │
│       [再試行ボタン]                 │  ← colorActionPrimary / h: 44pt以上
│       [サブリンク（任意）]           │  ← テキストリンク / colorTextLink
│                                      │
└──────────────────────────────────────┘
```

- コンテナは `flex: 1` + `alignItems: center` + `justifyContent: center` + `padding: spacing8`

### 4.3 エラー種別と文言の対応

各エラー種別に対して表示する文言は `errors.ts` の定数を使う:

| エラー種別 | タイトル | 説明文（errors.ts 定数） |
|-----------|---------|----------------------|
| タイムライン取得失敗 | 「読み込めませんでした」| `ERR_FEED_LOAD_FAILED` |
| 通知取得失敗 | 「読み込めませんでした」| `ERR_NOTIFICATIONS_LOAD_FAILED` |
| プロフィール取得失敗 | 「読み込めませんでした」| `ERR_PROFILE_LOAD_FAILED` |
| 投稿取得失敗（404） | 「投稿が見つかりません」| `ERR_POST_NOT_FOUND` |
| ネットワークエラー | 「接続できませんでした」| `ERR_NETWORK` |
| サーバーエラー（5xx）| 「サーバーエラー」| `ERR_SERVER` |
| 汎用（分類不能） | 「エラーが発生しました」| `ERR_GENERIC` |
| 検索失敗 | 「検索できませんでした」| `ERR_SEARCH_FAILED` |
| 投稿読み込み失敗 | 「読み込めませんでした」| `ERR_POST_LOAD_FAILED` |

**開発時のみ** 技術的なエラーメッセージをコンポーネント内部に表示する（本番ビルドでは UI に出さず Sentry に送る）。実装は `__DEV__` フラグで分岐する。

### 4.4 使用トークン

| 要素 | トークン |
|------|---------|
| アイコン円背景 | `colorErrorBg`（`#fdf0ef`）|
| アイコン色 | `colorError`（`#c21721`）|
| タイトルテキスト | `textLg` / `colorTextPrimary` |
| 説明テキスト | `textBase` / `colorTextSecondary` |
| 再試行ボタン背景 | `colorActionPrimary`（`#2e2e2e`）|
| 再試行ボタンテキスト | `colorActionPrimaryText`（`#ffffff`）|
| サブリンクテキスト | `colorTextLink`（`#2e2e2e`）|

### 4.5 props 概要

| prop 名 | 意味 |
|---------|------|
| `title` | エラータイトル文言（デフォルト: 「エラーが発生しました」）|
| `description` | 説明文言（デフォルト: `ERR_GENERIC`）|
| `onRetry` | 再試行ボタンのコールバック（必須。ErrorBoundary の reset / query の refetch）|
| `retryLabel` | 再試行ボタンのラベル（デフォルト: 「再試行」）|
| `subLinkLabel` | サブリンクのラベル（任意。例: 「ホームに戻る」）|
| `onSubLink` | サブリンクのコールバック（任意）|

### 4.6 accessibility

- 見出しに `accessibilityRole="header"` を付与
- 再試行ボタンの `accessibilityLabel`: 「再試行する」
- タップターゲット: 高さ 44pt 以上・幅は最低 160pt

### 4.7 ErrorBoundary との連携

Expo Router の `ErrorBoundary` export で各画面に設定する。  
`ScreenError` の `onRetry` には `reset` を渡す（TanStack Query フックのエラーは `refetch` を渡す）。  
ErrorBoundary を持つ画面では、そのスコープ内で発生した例外はすべて境界が捕捉し `ScreenError` を表示する。  
上位境界が下位の取りこぼしを処理する階層構造を維持する（`error-handling.md` 準拠）。

---

## 5. OfflineBanner

### 5.1 概要・目的

NetInfo でオフライン状態を検知した際に画面上部（セーフエリア直下）に固定表示するバナー。
`navigation-structure.md` §4.2（フィード）等で「画面上部にバナー」として参照されているコンポーネントの定義。

### 5.2 レイアウト

```
┌──────────────────────────────────────┐
│ [WiFiOffアイコン] オフライン中です... │  ← セーフエリア下端から padding0 で密着
└──────────────────────────────────────┘
```

- 高さ: 36pt（最小タップターゲット不要のため 44pt 未満を許容。情報表示専用）
- 幅: 画面幅いっぱい（スクリーンのエッジツーエッジ）
- 位置: 画面最上部に absolute 固定（ナビゲーションヘッダーの上に重なる）
  - セーフエリアの上端インセットを加算した位置に表示する

### 5.3 表示内容

| 要素 | 内容 |
|------|------|
| アイコン | WifiOff 系アイコン（Lucide 相当）/ サイズ 14pt |
| テキスト | `ERR_OFFLINE`「オフライン中です。接続が回復したら自動的に更新されます。」|

テキストは `textSm`（12pt）で 1 行に収まる文言とする。

### 5.4 使用トークン

| 要素 | トークン |
|------|---------|
| バナー背景 | `colorWarning`（`#b8860b`）を 15% 不透明化（`#b8860b26`）では読みにくいため、実装では `colorWarningBg`（`#fdf8e1`）をベースに左端に 3pt の `colorWarning` ボーダーを付ける形を推奨 |
| アイコン色 | `colorWarning`（`#b8860b`）|
| テキスト色 | `colorTextPrimary`（`#1a1a1a`）|

**注意:** `colorSuccess`・`colorWarning`・`colorInfo` の hex は `design-tokens.md` §2.2 後注に「Web の既存 toast・badge 色との整合を core に要確認」と記載がある。実装前に確認すること。

### 5.5 表示・非表示のアニメーション

- 表示: 上から滑り込むスライドイン（translateY: -36 → 0、`durationNormal: 300ms`、`easingDefault`）
- 消去: 上へスライドアウト（translateY: 0 → -36、`durationFast: 200ms`）
- `useNativeDriver: true` で実装する

### 5.6 復帰時の挙動

- NetInfo でオンライン復帰を検知 → バナーを非表示 + `data-fetching.md` の `onlineManager` 連携により TanStack Query が自動 refetch
- バナー非表示は即時（復帰後に 1 秒の遅延を入れて「接続が回復しました」表示に切り替えることは、PM 判断で追加可能。MVP では即時非表示とする）

### 5.7 iOS / Android 差異

| OS | 考慮事項 |
|----|---------|
| iOS | `useSafeAreaInsets().top` を使って Dynamic Island / ノッチの下にバナーを表示する |
| Android | `useSafeAreaInsets().top` を使って status bar の下にバナーを表示する |

どちらも `react-native-safe-area-context` の `useSafeAreaInsets` フックで統一的に対応する。

### 5.8 props 概要

| prop 名 | 意味 |
|---------|------|
| `message` | バナー文言（デフォルト: `ERR_OFFLINE`）|
| `isVisible` | 表示制御フラグ（呼び出し側でオフライン状態を渡す）|

オフライン状態の検知自体は `useOfflineStatus` 等のカスタムフック（`hooks/` に配置）に委ねる。このコンポーネントは純粋に表示のみを担う。

### 5.9 accessibility

- バナー全体に `accessibilityRole="alert"` を付与し、スクリーンリーダーに即時読み上げさせる
- `accessibilityLiveRegion="assertive"` を設定する

---

## 6. コンポーネント間の組み合わせパターン

画面では以下のようにコンポーネントを組み合わせる:

```
<SafeAreaView>
  <OfflineBanner isVisible={isOffline} />       ← 最上部
  
  {isLoading && <ScreenLoading />}
  {isError && <ScreenError onRetry={refetch} />}
  {!isLoading && !isError && data.length === 0 && (
    <ScreenEmpty title="..." onAction={...} />
  )}
  {!isLoading && !isError && data.length > 0 && (
    <FlatList ... />
  )}
</SafeAreaView>
```

`OfflineBanner` はオフライン中でも既存データがある場合（キャッシュ表示）はリスト表示と共存する。
オフライン + データなし の場合は `ScreenEmpty` ではなく `ScreenError`（description: `ERR_OFFLINE_ACTION`）を表示する。

---

## 7. 既存との一貫性メモ

### Web 版 PageError との対応

| Web `PageError` | モバイル `ScreenError` |
|----------------|----------------------|
| Sentry 送信を内包（useEffect） | Sentry 送信は外部（ErrorBoundary / フック）に委ねる |
| `title`・`description`・`icon`・`linkHref`・`linkLabel` props | 同等の props 構成（`subLinkLabel`・`onSubLink` として移植）|
| イラスト画像（`error-zen-garden.webp`）| モバイルはアイコン代替（バンドルサイズ削減）|
| `reset` コールバック | `onRetry` コールバック（命名変更）|

### Web 版 EmptyTimeline との対応

| Web `EmptyTimeline` | モバイル `ScreenEmpty` |
|--------------------|----------------------|
| フィード専用実装 | 汎用コンポーネント（画面別文言を props で差し替え）|
| イラスト画像（`empty-timeline.webp`）| モバイルはアイコン代替（PM 判断で画像追加可能）|
| アクションボタン（検索画面へ）| `actionLabel` / `onAction` props で汎用化 |

---

## 8. 未確定事項・要判断

- **イラスト画像の使用:** Web 版は `/images/generated/placeholders/` に各状態用のイラストを持つ。モバイルでも同じ画像を assets に含めるかどうかはバンドルサイズとの兼ね合いで PM に要判断。
- **OfflineBanner の色定義:** `colorWarning` 系 hex が Web の既存実装と整合しているか、`design-tokens.md` 後注の通り core に要確認。
- **オフライン復帰トースト:** 「接続が回復しました」の成功フィードバックをバナーとは別のトーストで出すかどうかは PM に要判断（MVP では省く方針で記述した）。
