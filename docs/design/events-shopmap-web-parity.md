# イベント / 盆栽園マップ Web 完全準拠 再設計仕様
# events-shopmap-web-parity

作成日: 2026-07-02
調査対象:
- Web 版 `Bon_Log_cfw/app/(main)/events/` および `components/event/`
- Web 版 `Bon_Log_cfw/app/(main)/shops/` および `components/shop/`
- ネイティブ現状 `app/events/index.tsx`、`app/shops/index.tsx`
- API スキーマ `lib/api/generated/schema.d.ts`
- 既存設計書 `docs/design/events.md`、`docs/design/shops.md`
参照規則: `components.md`、`navigation.md`、`error-handling.md`、`store-compliance.md`

---

## 第 1 部: Web のイベントとマップの構成とナビゲーション

### 1.1 Web 版イベントページの構成（調査結果）

Web 版 `/events`（`app/(main)/events/page.tsx`）のレイアウトは以下の通り。

```
バナー画像（ヒーロー、モバイル用 / デスクトップ用を切り替え）
  ↓
[h1 「イベント」] [「イベントを登録」ボタン（認証済みのみ機能）]
  ↓
RegionFilter（地方チップ 7 件 + 都道府県 select）
  ↓
[ビュー切り替え: カレンダー / リスト（href 切り替え）]  [終了イベントも表示 トグル]
  ↓
分岐:
  view=calendar →
      EventCalendarWrapper（月表示カレンダー）
      ＋ 「今後のイベント」見出し ＋ EventList
  view=list →
      EventList のみ
```

**EventCalendar の動作（`components/event/EventCalendar.tsx`）:**

- 月単位グリッド表示（7 列 × 最大 6 行 = 42 セル）。日曜始まり。
- ヘッダー: 左矢印（前月）/ 「YYYY年M月」/ 「今日」ボタン / 右矢印（次月）。
- 各セル: 最小高さ 100px。当日はプライマリ色の丸で強調。当月外は muted 背景。
- セル内に `startDate` ～ `endDate` の範囲に含まれるイベントをチップで列挙（`CALENDAR_EVENTS_PER_DAY = 3` 件まで。超過は「+N 件」）。
- チップタップでイベント詳細ページへ遷移。
- 月移動時に URL の `year` / `month` パラメータを更新（ブラウザバックで戻れる）。
- UTC ずれ対策: ISO 文字列の先頭 10 文字を直接比較（`getDateString` 実装）。

**RegionFilter の動作（`components/event/RegionFilter.tsx`）:**

- 地方（region）と都道府県（prefecture）は排他的: 一方を選択すると他方をクリア。
- 地方チップ: `REGION_NAME_LIST`（7 地方）を横スクロール表示。
- 都道府県: `PREFECTURES`（47 都道府県）を select 要素で選択。
- 両方クリアボタンあり。

**EventCard（`components/event/EventCard.tsx`）:**

- タイトル（2 行 clamp）/ 日付（M月d日(曜)〜 形式）/ 場所（都道府県・市・会場）/ バッジ（入場料・即売あり・終了・開催中）。
- 終了イベントは opacity 0.6。

**フィルタパラメータ:**

| パラメータ | 型 | 内容 |
|----------|---|------|
| `region` | string | 地方名（日本語、例: 関東 / 九州・沖縄）|
| `prefecture` | string | 都道府県名（日本語、例: 東京都）|
| `showPast` | "true" / 省略 | 終了イベント表示有無 |
| `view` | "calendar" / "list" | 表示形式（省略時 "calendar"）|
| `year` / `month` | number | カレンダーの表示月（省略時: 今月）|

---

### 1.2 Web 版盆栽園マップの構成（調査結果）

Web 版 `/shops`（`app/(main)/shops/page.tsx`）のレイアウト:

```
バナー画像（ヒーロー）
  ↓
[h1 「盆栽園マップ」] [「盆栽園を登録」ボタン]
  ↓
ShopSearchForm（キーワード検索 + ジャンル / 地方 / 都道府県 / ソート 各 select）
  ↓
Suspense で:
  MapWrapper（Leaflet + OpenStreetMap マップ）
  ＋ 「盆栽園一覧 N件」見出し ＋ ShopList
```

**地図の仕様（`components/shop/Map.tsx`）:**

- ライブラリ: **react-leaflet + Leaflet + OpenStreetMap タイル**（`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`）。
- SSR 不可（`window` 依存）のため `MapWrapper` で `dynamic(..., { ssr: false })` でロード。
- デフォルト中心: `[35.6762, 139.6503]`（東京）。デフォルトズーム: `6`。
- マーカー: カスタム SVG アイコン（緑色の盆栽ピン、32×44 px）。
- マーカータップで Popup（店舗名 / 住所 / 星評価 / 「詳細を見る」リンク）。
- `latitude` または `longitude` が `null` の店舗はマーカー非表示。
- 現在地ボタン（右下固定）: `navigator.geolocation.getCurrentPosition` → ズーム 14 で移動。
- モバイル高さ: 250px / デスクトップ: 400px。

**ShopSearchForm の絞り込み項目（`app/(main)/shops/ShopSearchForm.tsx`）:**

| 項目 | UI 型 | パラメータ |
|------|------|-----------|
| キーワード（名前または住所）| テキスト入力 + 検索ボタン | `search` |
| ジャンル | select（カテゴリ別 optgroup）| `genre`（genreId）|
| 地方 | select | `region`（ID ベース: `REGIONS.id`）|
| 都道府県 | select（地方選択で絞り込み）| `prefecture` |
| ソート順 | select | `sort`（rating / name / newest / location）|

注意: Web の地方は `REGIONS.id` ベース（内部 ID）を使用するが、イベントの `region` は地方名の日本語文字列。shops の API は OpenAPI 1.24.0 でも日本語名（北海道 / 東北 / 関東 / 中部 / 近畿 / 中国 / 四国 / 九州・沖縄）を受け入れる。ネイティブ実装では `lib/constants/regions.ts` の定義値に合わせて統一する。

---

## 第 2 部: 機能インベントリとデータ出所分類

### 2.1 イベント: 機能一覧とデータ

| 機能 | API エンドポイント | データフィールド | 既存フック |
|------|-----------------|---------------|----------|
| イベント一覧取得 | `GET /api/v1/events` | `items[].{id,title,startDate,endDate,prefecture,city,venue,admissionFee,hasSales}` | `useEventsListQuery` |
| カレンダー用全件取得 | 同上（フィルタ変更で再取得）| 上記 + `endDate`（範囲判定に必須）| 同上 |
| イベント詳細 | `GET /api/v1/events/{id}` | `{id,title,startDate,endDate,prefecture,city,venue,organizer,admissionFee,hasSales,externalUrl,description,creator:{id,nickname,avatarUrl},isCreator}` | `useEventDetailQuery` |

**カレンダー表示に必要なデータ:**
- 月単位で全イベントを一度に取得する（ページネーションを「全件」まで展開するか、月パラメータでサーバー側絞り込みを使用）。
- `year` / `month` クエリで API 側フィルタリング済み: `useEventsListQuery({ year, month })` で月単位取得可能（スキーマ確認済み: `year?: number`, `month?: number`）。
- ただし 1 ページ（20 件）を超えるイベントは `hasNextPage` で複数ページ取得が必要（core に要確認: 月単位での件数上限が現実的かどうか）。

### 2.2 盆栽園マップ: 機能一覧とデータ

| 機能 | API エンドポイント | データフィールド | 既存フック |
|------|-----------------|---------------|----------|
| 店舗一覧 | `GET /api/v1/shops` | `items[].{id,name,address,latitude,longitude,averageRating,reviewCount,genres[],businessHours,closedDays,phone}` | `useShopsListQuery` |
| 店舗詳細 | `GET /api/v1/shops/{id}` | 上記 + `website,closedDays,isOwner,hasMyReview,reviews[]` | `useShopDetailQuery` |
| ジャンル一覧 | `GET /api/v1/genres?type=shop` | `items[].{id,name,category}` | `useGenresQuery('shop')` |

**地図表示に必要なデータ:**
- `latitude: number | null` および `longitude: number | null` は schema.d.ts で確認済み（`ShopItem` に含まれる）。
- 精度: `Decimal(10,7)` = 小数点以下 7 桁。
- `latitude` / `longitude` が `null` の店舗は地図マーカーを非表示とし一覧のみに表示する（Web 版と同仕様）。

---

## 第 3 部: 現状アプリの不足リスト

### 3.1 イベント（`app/events/index.tsx`）の不足

| 不足機能 | Web 版の対応 | 現状ネイティブ |
|---------|------------|-------------|
| **月カレンダー表示** | `EventCalendar`（7 列グリッド、月移動、セル内イベントチップ）| **完全に欠如。リスト表示のみ** |
| カレンダー / リスト 切り替えボタン | 画面上部のビュートグル（calendar / list）| 切り替えなし（リスト固定）|
| 「今後のイベント」セクション | カレンダー表示時に下部へ今後イベントを並列表示 | なし |
| 「終了イベントも表示」トグル | `ShowPastToggle`（チェックボックス型リンク）| なし |
| 都道府県フィルタ | `RegionFilter` 内の prefecture select | 地方のみ（prefecture なし）|
| 月/年 ナビゲーション（URL 同期）| カレンダー月移動で URL パラメータ更新 | カレンダーなし |
| `showPast` フィルタの API 送信 | `getEvents({ showPast })` | showPast の送信なし |
| カレンダーセル内「+N 件」表示 | `CALENDAR_EVENTS_PER_DAY = 3` 超過時 | カレンダーなし |

### 3.2 盆栽園マップ（`app/shops/index.tsx`）の不足

| 不足機能 | Web 版の対応 | 現状ネイティブ |
|---------|------------|-------------|
| **インタラクティブ地図** | Leaflet + OSM マーカー + Popup | **完全に欠如。地図なし** |
| 地図上ピンタップで店舗情報 Popup | `Popup` コンポーネント（名前・住所・評価・詳細リンク）| なし |
| 現在地ボタン | `LocationButton`（geolocation → 地図移動）| なし |
| 地図と一覧の同期 | 同一データをマップと一覧に共有 | 一覧のみ |
| キーワード検索 | `ShopSearchForm` 上部テキスト入力 | **実装済み** |
| ジャンルフィルタ | `ShopSearchForm` の select | **実装済み（チップ形式）** |
| 地方フィルタ | `ShopSearchForm` の select | **実装済み（モーダル形式）** |
| 都道府県フィルタ | `ShopSearchForm` の select | **実装済み（モーダル形式）** |
| ソート | `ShopSearchForm` の select（4 種）| **実装済み（チップ形式）** |

---

## 第 4 部: 忠実な再構築のための画面仕様

### 4.1 イベント一覧画面 — 再設計版（`app/events/index.tsx`）

#### 4.1.1 概要

Web 版に忠実に「カレンダービュー」と「リストビュー」を切り替えられる画面に再構築する。既存の `events.md` を上書きせず、本書で差分仕様を提示する。

#### 4.1.2 画面構成（ワイヤーフレーム）

```
┌─────────────────────────────────────────────────────────────┐
│ [SafeArea 上端]                                              │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [NavigationHeader]（既存のスタックヘッダー流用）             │
│   左: 戻る / 中央: 「イベント」/ 右: なし                   │
│                                                             │
│ ━━━━ RegionFilterBar（固定 / スクロール外） ━━━━             │
│  [全国][北海道・東北][関東][中部・北陸][近畿][中国・四国]    │
│  [九州・沖縄]（横スクロール / チップ形式）                   │
│  ─────────────────────────────────────────                  │
│  [都道府県: すべて ▾]（Picker モーダルで選択）              │
│                                                             │
│ ━━━━ ViewToggleBar（固定 / スクロール外） ━━━━              │
│  [カレンダーアイコン カレンダー] [リストアイコン リスト]     │
│  右端: [終了も表示 □]（Switch / Toggle）                    │
│                                                             │
│ ━━━━ コンテンツ領域（ビューに応じて切り替え） ━━━━          │
│                                                             │
│ --- カレンダービュー時 ---                                   │
│  [EventCalendarNative]                                      │
│   ┌──────────────────────────────────────────────────┐      │
│   │ [< 前月] [YYYY年M月] [今日] [次月 >]              │      │
│   ├──────────────────────────────────────────────────┤      │
│   │ 日 月 火 水 木 金 土                              │      │
│   ├────┬────┬────┬────┬────┬────┬────┤      │
│   │ 30 │  1 │  2 │  3 │  4 │  5 │  6 │      │
│   │    │[E1]│    │[E2]│    │    │    │      │
│   │    │[E3]│    │+1件│    │    │    │      │
│   ├────┴────┴────┴────┴────┴────┴────┤      │
│   │ … （最大 6 行）                   │      │
│   └──────────────────────────────────────────────────┘      │
│                                                             │
│  [「今後のイベント」見出し + 件数]                           │
│  [EventCard × N（FlatList / pull-to-refresh）]              │
│                                                             │
│ --- リストビュー時 ---                                       │
│  [「イベント一覧 N件」見出し]                                │
│  [EventCard × N（FlatList / 無限スクロール）]               │
│                                                             │
│ [SafeArea 下端 + FAB（認証済みのみ）]                        │
└─────────────────────────────────────────────────────────────┘
```

#### 4.1.3 状態管理

| 状態 | 型 | 初期値 | 内容 |
|------|---|--------|------|
| `viewMode` | `'calendar' \| 'list'` | `'calendar'` | Web と同じデフォルト |
| `selectedRegion` | `string \| undefined` | `undefined` | 地方名（日本語）|
| `selectedPrefecture` | `string \| undefined` | `undefined` | 都道府県名（日本語）|
| `showPast` | `boolean` | `false` | 終了イベント表示 |
| `calendarYear` | `number` | 今年 | カレンダー表示年 |
| `calendarMonth` | `number` | 今月（1〜12）| カレンダー表示月 |

`selectedRegion` と `selectedPrefecture` は排他的: 一方を選択すると他方をリセット（Web 版 `RegionFilter` と同仕様）。

#### 4.1.4 データ取得戦略

**カレンダービュー:**

```
useEventsListQuery({
  region: selectedRegion,
  prefecture: selectedPrefecture,
  showPast: true,       // カレンダーは過去分も含めて表示
  year: calendarYear,
  month: calendarMonth,
})
```

月単位フィルタで取得し、全ページを展開してカレンダーセルへ配分する。1 ページ 20 件なのでページネーション（`hasNextPage` → `fetchNextPage`）を使い全件収集する。データが多い月は段階的に取得し、カレンダーを描画しながらバックグラウンドで追加取得する。

カレンダー下の「今後のイベント」は取得済みデータから `startDate >= today` でクライアント側フィルタリングして表示する。

**リストビュー:**

```
useEventsListQuery({
  region: selectedRegion,
  prefecture: selectedPrefecture,
  showPast,
  // year/month は指定しない（全期間）
})
```

無限スクロール（既存の実装と同様）。

#### 4.1.5 EventCalendarNative コンポーネント仕様

```
props:
  events: EventCalendarItem[]   // { id, title, startDate, endDate, prefecture }
  year: number
  month: number                 // 1〜12
  onMonthChange: (year: number, month: number) => void
  onEventPress: (eventId: string) => void
```

**ヘッダー行:**

```
[< 44pt タップ領域] [「YYYY年M月」textLg fontWeight:600] [「今日」テキストボタン] [> 44pt タップ領域]
```

- 前月 / 次月ボタン: `accessibilityRole="button"` / `accessibilityLabel="前月"` / `"次月"`
- 「今日」: 現在月に戻る。`accessibilityRole="button"` / `accessibilityLabel="今月に移動"`

**曜日行（7 列固定）:**

```
日 月 火 水 木 金 土
colorTextTertiary / textXs / textAlign:center
日曜: colorError 系か colorTextSecondary で強調（Web 版は両端を muted で実装）
```

**日付グリッド（7 列 × 行数）:**

- 行数: `Math.ceil((startDayOfWeek + daysInMonth) / 7)`（最大 6 行）。
- 各セルの最小高さ: `80pt`（モバイル用に Web の 100px より縮小。ただし端末幅に合わせて調整する）。
- 当月外のセル: `colorBackground`（Web の `bg-muted/30` 相当）で薄くする。
- 当日の日付数字: プライマリ色の丸背景（直径 28pt）。
- セル内イベントチップ:
  - 最大 `CALENDAR_EVENTS_PER_DAY = 3` 件を表示（モバイルは画面幅の制約から 2 件まで許容してもよい。PM 判断）。
  - チップは 1 行テキスト truncate / `colorActionPrimary/10` 背景 / `colorActionPrimary` テキスト。
  - 高さ: 18〜20pt / `fontSize: 10pt`（textXs の小さめ）。
  - `+N 件` テキスト: `textXs / colorTextTertiary`。
  - 各チップは `accessibilityRole="button"` / `accessibilityLabel="{イベント名}の詳細を見る"`。
  - チップタップ → `onEventPress(eventId)`。

**日付ずれ対策（UTC 変換防止）:**

Web 版と同様に ISO 文字列の先頭 10 文字（`YYYY-MM-DD`）を直接比較するロジックを採用する。`new Date(startDate)` でローカルに変換せず、文字列比較で「その日にイベントが存在するか」を判定する。

**iOS / Android 差異:**

- 差異なし（ネイティブカレンダー UI は使わず独自グリッドで実装）。

#### 4.1.6 RegionFilterBar 拡張仕様

現状の地方チップ（7 種 + 全国）に加え、都道府県フィルタを追加する。

```
地方チップ横スクロール行（既存）
────────────────────────────────
都道府県フィルタ行（新規追加）
  [都道府県フィルタ: {選択中都道府県名 or "すべて"} ▾]（Pressable）
  {選択中のとき: [×クリア]}（Pressable）
```

都道府県フィルタのタップ → `PrefecturePickerModal`（既存コンポーネント、`app/shops/index.tsx` で使用済み）を流用する。

#### 4.1.7 ViewToggleBar 仕様

```
高さ: 48pt
背景: colorSurfaceWashi / 下端: 1pt colorBorderLight
paddingHorizontal: spacing4

左側:
  [CalendarIcon 16pt][「カレンダー」textSm]  ← 選択時: colorActionPrimary 背景, colorActionPrimaryText テキスト
  [ListIcon 16pt][「リスト」textSm]           ← 非選択: colorActionSecondary 背景, colorActionSecondaryText テキスト
  角丸: radiusSm / 高さ: 32pt / hitSlop 44pt

右側:
  [Switch or Checkbox][「終了も表示」textSm colorTextSecondary]
```

- `accessibilityRole="radio"` / `accessibilityState: { selected }` をトグルボタンに付与。
- Switch: `accessibilityRole="switch"` / `accessibilityLabel="終了したイベントも表示する"`。

#### 4.1.8 エッジケース

| 状態 | 表示 |
|------|------|
| カレンダーデータ取得中 | カレンダーグリッドを表示しつつセル内チップをスケルトン化（グレー矩形）|
| 取得エラー | `ScreenError`（onRetry で refetch）|
| 当月にイベントなし | カレンダーグリッドはそのまま表示。「今後のイベント」の下に空状態（Calendar アイコン + 「このエリアのイベントはありません」）|
| オフライン | `OfflineBanner` + キャッシュ表示（月移動はキャッシュなしなので空グリッド + OfflineBanner で案内）|
| 100 件を超える月 | 複数ページ取得が必要。取得中はローディングインジケータをカレンダー下部に表示し、取得完了後にセルを更新する。|

---

### 4.2 盆栽園マップ一覧画面 — 再設計版（`app/shops/index.tsx`）

#### 4.2.1 概要

Web 版の地図（Leaflet）に相当するインタラクティブマップを追加する。既存の一覧・検索・フィルタは維持したうえで、地図とリストを上下に配置する Web 版レイアウトを踏襲する。

#### 4.2.2 画面構成（ワイヤーフレーム）

```
┌─────────────────────────────────────────────────────────────┐
│ [SafeArea 上端]                                              │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [NavigationHeader]                                          │
│   左: 戻る / 中央: 「盆栽園マップ」/ 右: なし               │
│                                                             │
│ [SearchForm]（既存流用）                                     │
│   [検索テキスト入力 🔍] [検索ボタン]                         │
│                                                             │
│ [SortAndFilterBar]（既存流用）                               │
│   [地方フィルタ ▾] [都道府県フィルタ ▾]                    │
│   [評価順][名前順][新着順][北から順] | [すべて][各ジャンル]  │
│                                                             │
│ ━━━━ BonsaiMapView（新規追加） ━━━━━━━━━━━━━━━━━━━━━          │
│  ┌───────────────────────────────────────────────────┐      │
│  │                 地図エリア                         │      │
│  │   [OSM タイル + マーカー]                          │      │
│  │                              [現在地ボタン 右下]   │      │
│  └───────────────────────────────────────────────────┘      │
│  高さ: 220pt（モバイル）/ 端末の縦横で調整                  │
│                                                             │
│ ━━━━ 店舗一覧 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━          │
│  [「盆栽園一覧 N件」見出し]                                  │
│  [ShopCard × N（FlatList / 無限スクロール）]               │
│  ↓ pull-to-refresh / 末尾で次ページ取得                    │
│                                                             │
│ [SafeArea 下端 + FAB（認証済みのみ）]                        │
└─────────────────────────────────────────────────────────────┘
```

#### 4.2.3 BonsaiMapView コンポーネント仕様

```
props:
  shops: ShopMapItem[]          // latitude, longitude が取得済みのもの全件
  selectedShopId?: string       // 選択中店舗（マーカー強調）
  onShopSelect: (shopId: string) => void
  onLocationRequest: () => void // 現在地ボタンタップ
```

```typescript
type ShopMapItem = {
  id: string
  name: string
  latitude: number
  longitude: number
  address: string
  averageRating: number | null
  reviewCount: number
}
```

**マーカー:**

- 緑色のカスタム盆栽ピン（Web 版と同形の SVG、`react-native-maps` の `Marker` カスタムビューで実装）。
- 選択中マーカー: 大きく表示（1.25 倍）またはカラー変化で強調。
- `latitude` / `longitude` が `null` の店舗はマーカー非表示（一覧には表示）。

**マーカータップ → 吹き出し（CalloutView）:**

```
┌────────────────────────────────────────┐
│ [店舗名 textSm fontWeight:600]          │
│ [住所 textXs colorTextSecondary]        │
│ [★ averageRating（reviewCount 件）]    │
│ [「詳細を見る」textXs colorActionPrimary]│ ← タップで shops/[id] へ遷移
└────────────────────────────────────────┘
最小幅: 160pt / padding: spacing2
```

**現在地ボタン（右下固定）:**

```
位置: 地図エリア右下 / spacing3 マージン
サイズ: 44pt × 44pt（タップターゲット確保）
背景: colorSurface / shadowWashi
アイコン: ターゲット / 照準アイコン（Ionicons "locate-outline"）
ローディング中: ActivityIndicator 表示
accessibilityRole="button" / accessibilityLabel="現在地に移動"
```

iOS パーミッション: `expo-location` の `requestForegroundPermissionsAsync()`（後述の依存候補参照）。
拒否済み: `Linking.openSettings()` へ誘導するアラート表示。

**デフォルト表示範囲:**

- 中心: `[35.6762, 139.6503]`（東京）/ ズームレベル: Web と同じ縮尺感（日本全体が見える）。
- `react-native-maps` では `initialRegion` の `latitudeDelta` / `longitudeDelta` で制御: `latitudeDelta: 10, longitudeDelta: 10`（日本全土が概ね収まる値）。

**地図とリストの連携:**

- `FlatList` の店舗タップ → 地図の該当マーカーへアニメーションで移動（`mapRef.animateToRegion`）し Callout を表示。
- マーカータップ → `FlatList` をその店舗の位置にスクロール（`flatListRef.scrollToItem`）。
- 地図とリストの連携は `selectedShopId` の state で管理。

**オフライン時:**

- タイルが取得できないためグレーのフォールバック背景を表示し「地図を読み込めませんでした（オフライン）」とテキストを重ねる。
- マーカーは既取得データがあれば表示を維持する。

**iOS / Android 差異:**

| 項目 | iOS | Android |
|------|-----|---------|
| 位置情報許可 | `NSLocationWhenInUseUsageDescription` が `app.json` に必要 | `ACCESS_FINE_LOCATION` パーミッションが必要 |
| 地図タイル | Apple Maps に切り替えてもよいが、Web 版との一貫性から OSM を優先 | Google Maps / OSM どちらも可 |
| カスタムマーカー | `Marker` の `children` に View を渡す | 同左 |

#### 4.2.4 地図データの取得戦略

一覧の無限スクロールとは別に、地図用のデータが必要。

**方針（推奨）: 地図は全件を別クエリで取得**

- 地図表示には `latitude` / `longitude` を持つ全店舗が必要（無限スクロールの「現ページ分」だけでは不十分）。
- `GET /api/v1/shops?limit=200` で全件または「位置情報付き店舗のみ」を一括取得する専用クエリを追加。

ただし `/api/v1/shops` は現状カーソルページネーション（最大 20 件/ページ）。地図用の全件取得 API がなければ複数ページを全フェッチする必要がある。

**core に要確認:**
- 地図専用の `GET /api/v1/shops/map-pins`（全件の lat/lng + 基本情報を返すエンドポイント）の追加が必要かどうか検討をリクエストする。大量データのケースを考慮する場合、ビューポート（地図の表示範囲）で絞り込む API が理想だが、まず全件（上限付き）で対応するのが現実的。
- 暫定対応: 既存 `useShopsListQuery` を `limit=100` 程度で全ページ展開して地図用データを構築する。

#### 4.2.5 エッジケース

| 状態 | 表示 |
|------|------|
| 地図ライブラリのロード中 | 地図エリアをグレー背景 + ローディングインジケータで仮表示 |
| 位置情報: 未許可 | 許可のアラートを表示（初回）→ 拒否済みなら設定画面誘導 |
| `latitude`/`longitude` が全店舗 null | 地図を空で表示し「登録済みの盆栽園の位置情報がありません」と案内 |
| フィルタ後に 0 件 | 地図は空（マーカーなし）/ 一覧は空状態コンポーネント（既存 ScreenEmpty 流用）|
| 検索・フィルタ変更 | 地図のマーカーと一覧を同時にリセット・更新 |

---

### 4.3 イベント詳細画面（`app/events/[id]/index.tsx`）

既存 `events.md` §3 の仕様は変更なし。追加差分のみ記載する。

**Web 版との差分:**
- 「イベント一覧に戻る」リンク → ネイティブはヘッダーの戻るボタンで代替（差分なし）。
- `isEnded` / `isOngoing` の判定ロジック: Web 版と同一（`endDate` があれば `endDate < now`、なければ `startDate < now`）。クライアント側で同様に判定する。
- バッジ順序: 「終了」→「開催中」→「即売あり」の順で表示。

---

### 4.4 盆栽園詳細画面（`app/shops/[id]/index.tsx`）

既存 `shops.md` §3 の仕様は変更なし。地図は「地図アプリで開く」リンクで対応済み（`shops.md` §3.2）。

Web 版との追加対応: 詳細画面の地図は `MapWrapperSmall`（300px 固定高さ、ズーム 15、単体ピン表示）。ネイティブでも同様に詳細画面に地図を埋め込む仕様とする。

```
ShopDetailMap（詳細画面専用・小型）:
  高さ: 200pt（詳細画面内に埋め込み）
  ズーム: 15（近距離表示）
  マーカー: 対象店舗 1 件のみ
  インタラクション: パン・ズームのみ。マーカータップ・現在地ボタンは省略可
  lat/lng が両方 null の場合: 非表示
```

---

## 第 5 部: 必要なネイティブ依存の候補と理由

### 5.1 地図ライブラリ

| 候補 | 用途 | 採否推奨 | 理由 |
|------|------|---------|------|
| **`react-native-maps`** | インタラクティブ地図表示（Android: Google Maps / iOS: Apple Maps または Google Maps）| **採用推奨（第 1 候補）** | React Native 向けデファクトスタンダード。Expo SDK と統合済み（`expo install react-native-maps`）。Android は Google Maps API キーが必要。iOS は Apple Maps 標準で追加コスト不要。CLAUDE.md §1.5 の iOS 互換維持に対応できる。|
| `@rnmapbox/mapbox-maps` | Mapbox ベースの地図 | 第 2 候補 | トークン費用が発生。OSM を使う場合は Mapbox スタイルが必要。Web 版が OSM を使っているため一貫性が下がる。|
| `react-native-webview + Leaflet（WebView 内）` | WebView に Web 版の地図をそのまま埋め込む | 避ける | パフォーマンスが低い。ネイティブジェスチャとの競合が起きやすい。|

**`react-native-maps` の必要事項:**

- Android: Google Maps SDK API キー（`EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY` 等）を `app.json` に設定。Google Cloud Console で地図 API を有効化。
- iOS: Apple Maps は追加設定不要。Google Maps を使う場合は iOS 用の API キーが必要。
- カスタムマーカー: `<Marker>` に `<View>` 子要素でカスタム SVG を描画可能。
- Callout: `<Callout>` コンポーネントで吹き出し表示。

### 5.2 カレンダーライブラリ

| 候補 | 用途 | 採否推奨 | 理由 |
|------|------|---------|------|
| **独自実装**（カスタムグリッド）| 月表示カレンダーをネイティブ View で自作 | **採用推奨（第 1 候補）** | Web 版の `EventCalendar.tsx` が `date-fns` のみで完全に自作されており、ロジックがシンプル（`eachDayOfInterval` + グリッドレンダリング）。外部依存を追加せず、デザイントークンへの完全準拠が可能。依存管理コストゼロ。|
| `react-native-calendars` | 月表示カレンダー（サードパーティ）| 第 2 候補 | 高機能だが過剰。カスタマイズが煩雑（和風デザイントークンの適用が難しい）。バンドルサイズ増加。|
| `@marceloterreiro/flash-calendar` | 高性能カレンダー（FlashList ベース）| 参考情報 | パフォーマンスは高いが新しいライブラリで実績が少ない。|

**独自実装の根拠:**

`date-fns` はすでに cfw で使用されておりロジックが確立している。ネイティブ側でも以下の関数を使って同等の実装が可能:

- `startOfMonth` / `endOfMonth` / `startOfWeek` / `endOfWeek` / `eachDayOfInterval`
- `isSameMonth` / `isToday` / `addMonths` / `subMonths`
- `format`（`ja` ロケール）

`date-fns` がネイティブプロジェクトに未追加の場合は `npm install date-fns` が必要（`date-fns` は軽量で副作用なし）。

### 5.3 位置情報（現在地ボタン用）

| 候補 | 用途 | 採否推奨 | 理由 |
|------|------|---------|------|
| **`expo-location`** | 現在地取得 | **採用推奨** | Expo SDK 標準。Web 版の `navigator.geolocation` に相当。`requestForegroundPermissionsAsync` + `getCurrentPositionAsync` で実装。 |

`react-native-maps` の `MapView` 自体は `showsUserLocation` prop で現在地を表示できるが、現在地へのカメラ移動（現在地ボタン）には `expo-location` でのカスタム実装が必要。

### 5.4 依存追加サマリ（PM 判断用）

| 依存 | パッケージ | 必須 / 任意 | 理由 |
|------|----------|-----------|------|
| `react-native-maps` | `expo install react-native-maps` | **必須**（地図機能の実現）| Google Maps API キーが別途必要 |
| `expo-location` | `expo install expo-location` | **必須**（現在地ボタン）| 位置情報パーミッション対応含む |
| `date-fns` | `npm install date-fns` | **必須**（カレンダー自作）| 既に cfw で使用中のロジックを移植 |

カレンダーを外部ライブラリで実装する場合は `date-fns` の一部を置き換えられるが、外部ライブラリ採用時もデザインカスタマイズコストが生じるため、自作を優先推奨とする。

---

## 第 6 部: コンポーネント分割（追加・変更分のみ）

### 6.1 イベント関連（追加）

```
EventCalendarNative              ← 新規（月グリッドカレンダー本体）
├── EventCalendarHeader          ← 月ナビゲーションヘッダー
├── EventCalendarWeekdayRow      ← 曜日ラベル行（日月火水木金土）
├── EventCalendarGrid            ← 日付グリッド（FlatList or ScrollView + 7 列 View）
│   └── EventCalendarDayCell     ← 各日付セル（日付数字 + イベントチップ + +N 件）
│       └── EventCalendarChip    ← セル内 1 イベントチップ
│
EventsViewToggleBar              ← 新規（カレンダー / リスト切り替え + 終了トグル）
EventsRegionFilterBar            ← 既存を拡張（地方チップ + 都道府県フィルタ行を追加）
```

### 6.2 盆栽園マップ関連（追加）

```
BonsaiMapView                    ← 新規（インタラクティブ地図全体）
├── BonsaiMapMarker              ← カスタムピンマーカー（SVG ビュー）
├── BonsaiMapCallout             ← 吹き出し（店舗名 / 住所 / 評価 / 詳細リンク）
└── BonsaiMapLocationButton      ← 現在地ボタン（右下固定 Pressable）

ShopDetailMap                    ← 新規（詳細画面埋め込み小型地図）
```

---

## 第 7 部: サーバー新エンドポイントの要否

### 7.1 確認不要（既存 API で対応可能）

| 機能 | 根拠 |
|------|------|
| カレンダー用月別イベント取得 | `GET /api/v1/events?year=&month=` がスキーマで確認済み |
| 地方フィルタ（イベント）| `GET /api/v1/events?region=` がスキーマで確認済み |
| 都道府県フィルタ（イベント）| `GET /api/v1/events?prefecture=` がスキーマで確認済み |
| `showPast` フィルタ | `GET /api/v1/events?showPast=true` がスキーマで確認済み |
| 地方フィルタ（shops）| `GET /api/v1/shops?region=` が OpenAPI 1.24.0 で追加済み |
| 店舗の lat/lng フィールド | `ShopItem.latitude` / `.longitude` がスキーマに存在 |

### 7.2 追加要否を検討（core に要確認）

| # | 機能 | 現状 | 推奨対応 |
|---|------|------|---------|
| M-1 | 地図用全件店舗取得 | `GET /api/v1/shops` は 20 件/ページのページネーション | **選択肢 A**: `GET /api/v1/shops?limit=200` で大きいリミットを許可（スキーマの `max` を引き上げる）。**選択肢 B**: `GET /api/v1/shops/map-pins`（lat/lng + id + name のみの軽量エンドポイント）を新設。**選択肢 C**: 現状の 20 件/ページを全ページ展開（N+1 相当のリクエスト増加を許容）。PM と core で相談し決定。 |
| M-2 | カレンダー用月別全件取得 | `year` / `month` でフィルタ可能だが 20 件上限 | 件数が多い月は複数ページ取得が必要。月当たりのイベント件数が現実的に 100 件未満であれば `limit=100` の許可で十分。 |

---

## 第 8 部: 既存設計書との整合

| 既存設計書 | 本書との関係 |
|----------|------------|
| `docs/design/events.md` | 本書は **差分仕様書**。`events.md` の §1〜§12 は維持し、本書 §4.1 が上書き・補完する。カレンダー機能は本書で新規定義。 |
| `docs/design/shops.md` | 本書は **差分仕様書**。`shops.md` の §1〜§14 は維持し、本書 §4.2 が地図機能を新規追加。「地図ライブラリは使わない」（`shops.md` 前提行）を**本書で覆す**（PM 決裁が必要）。 |
| `docs/design/design-tokens.md` | 地図・カレンダー共に既存トークンを使用。新規トークン追加は不要（ピンの緑色は `colorActionPrimary` / 選択強調は `colorActionPrimaryActive` があれば使用）。 |
| `docs/design/navigation-structure.md` | ナビゲーション構造の変更なし。イベント一覧・盆栽園マップともにスタック遷移。 |

**「地図ライブラリは使わない（PM 決定）」の撤回について:**

`shops.md` の前提行には「地図描画ライブラリは使わない（PM 決定）」と記載されている。本書の作成目的（Web 完全準拠）に基づき、地図ライブラリの採用を提案する。採否は PM が判断すること。採用しない場合は、§4.2 の地図部分を省き、現状の「地図アプリで開く」リンク方式（`shops.md` §3.2）を維持する。

---

## 付録: コピー案（追加分）

### イベントカレンダー

| 箇所 | 文言 |
|------|------|
| カレンダービュー切り替えボタン | 「カレンダー」|
| リストビュー切り替えボタン | 「リスト」|
| 終了イベントトグル | 「終了も表示」|
| 今日ボタン | 「今日」|
| 前月ボタン accessibilityLabel | 「前の月へ」|
| 次月ボタン accessibilityLabel | 「次の月へ」|
| 都道府県フィルタ（未選択）| 「都道府県: すべて」|
| カレンダー 当月イベントなし（フィルタなし）| 「この月にイベントはありません」|
| カレンダー 当月イベントなし（フィルタあり）| 「このエリアの今月のイベントはありません」|
| 今後のイベントセクション見出し | 「今後のイベント」|
| 今後のイベント 0 件 | 「今後のイベントはありません」|

### 盆栽園マップ

| 箇所 | 文言 |
|------|------|
| 現在地ボタン accessibilityLabel | 「現在地に移動」|
| Callout「詳細を見る」| 「詳細を見る」|
| 地図ロード中テキスト | 「地図を読み込み中...」|
| 地図オフライン案内 | 「オフラインのため地図を表示できません」|
| 位置情報拒否アラートタイトル | 「位置情報の使用を許可してください」|
| 位置情報拒否アラート本文 | 「現在地を表示するには、設定から位置情報の使用を許可してください。」|
| 位置情報拒否アラートボタン（設定）| 「設定を開く」|
| 位置情報拒否アラートボタン（キャンセル）| 「キャンセル」|
| 位置情報非対応 | 「この端末では現在地の取得ができません」|
| 取得失敗 | 「現在地を取得できませんでした」|
