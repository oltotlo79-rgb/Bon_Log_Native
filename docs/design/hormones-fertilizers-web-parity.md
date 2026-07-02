# 植物ホルモン・施肥ガイド — Web 完全準拠 再設計仕様

作成日: 2026-07-02
対象: `app/hormones/` 系・`app/fertilizers/` 系の全画面
前提:
- `design-tokens.md` §2.3 のトークン名を使用（新規トークン追加禁止）
- `common-states.md`（ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner）に準拠
- `browse-screens.md` §C-1〜C-4 の共通パターンを踏襲
- `navigation-structure.md` のスタック・タブ構造に準拠

---

## 0. 目的

現状のネイティブアプリは、植物ホルモン・施肥ガイドいずれも Web 版に存在する機能の一部しか実装していない。本仕様は Web 版の全ナビゲーション木・全機能を正確に把握し、ネイティブアプリが Web に完全準拠するための再構築ロードマップと画面仕様を提供する。

---

## 1. Web の完全なナビゲーション木

### 1.1 植物ホルモン

```
/hormones                            ホルモントップ（index）
├── /hormones/[slug]                  ホルモン詳細（auxin / gibberellin / cytokinin / abscisic / ethylene 等）
├── /hormones/techniques              技法とホルモン
├── /hormones/interactions            ホルモン相互作用 一覧（テキスト）
├── /hormones/diagram                 相互作用ダイアグラム（SVG ネットワーク図）
├── /hormones/calendar                年間ホルモン活性カレンダー（ヒートマップ）
├── /hormones/simulator               ホルモンバランスシミュレーター
├── /hormones/columns                 コラム一覧
└── /hormones/columns/[slug]          コラム詳細
```

### 1.2 施肥ガイド

```
/fertilizers                         施肥トップ（index）
├── /fertilizers/nutrients            栄養素辞典（三大要素・二次要素・微量要素）
│   └── /fertilizers/nutrients/[slug] 栄養素詳細
├── /fertilizers/categories           肥料カテゴリ比較（有機・化成・液肥等）
├── /fertilizers/schedules            樹種別施肥スケジュール一覧
│   └── /fertilizers/schedules/[slug] 樹種詳細スケジュール
├── /fertilizers/columns              コラム・読みもの一覧
│   └── /fertilizers/columns/[slug]   コラム詳細
├── /fertilizers/products             定番肥料ガイド
├── /fertilizers/soil                 用土と施肥の関係
├── /fertilizers/watering             水やりと施肥の関係
├── /fertilizers/absorption           栄養素の吸収と転流（インタラクティブ図）
├── /fertilizers/symptoms             症状から探す栄養素（キーワード検索）
└── /fertilizers/troubles             施肥トラブル事例集
```

---

## 2. 機能インベントリとデータ出所分類

### 2.1 植物ホルモン — 既存 API で取得できる機能

| 機能 | API エンドポイント | 備考 |
|------|------------------|------|
| ホルモン一覧（major / secondary 分類） | `GET /api/v1/hormones` | `?category=major` または全件 |
| ホルモン詳細（description / bonsaiRole / productionSite / activationMethod / practicalTips / effects / seasonalLevels） | `GET /api/v1/hormones/{slug}` | effects・seasonalLevels 含む |

### 2.2 植物ホルモン — 新規 API エンドポイントが必要な機能

| 機能 | 必要なエンドポイント（仮案） | 根拠 |
|------|--------------------------|------|
| ホルモン詳細の interactions（相互作用）・techniques（関連技法）取得 | 既存 `GET /api/v1/hormones/{slug}` を拡張するか、別途エンドポイントを追加 | 既存 route.ts のコメントに「interactions/techniques は本バッチ対象外のため含めない」と明記されており、現在は返却されない |
| 相互作用一覧 | `GET /api/v1/hormones/interactions` | Web の `getHormoneInteractions()` に相当 |
| 全技法×ホルモン効果の一覧（技法とホルモン画面） | `GET /api/v1/hormones/techniques` | Web の `getHormoneTechniques()` に相当 |
| シミュレーター用データ（全ホルモン + 全技法効果 + 全月別活性） | `GET /api/v1/hormones/simulator` | Web の `getSimulatorData()` に相当 |
| 年間カレンダー用データ（全ホルモン + 月別活性） | `GET /api/v1/hormones/seasonal-levels` | 一覧 API で seasonalLevels を含めるか専用 API |
| ホルモンコラム一覧 | `GET /api/v1/hormones/columns` | Web の `getHormoneColumns()` に相当 |
| ホルモンコラム詳細 | `GET /api/v1/hormones/columns/{slug}` | Web の `getHormoneColumnBySlug()` に相当 |

### 2.3 施肥ガイド — 既存 API で取得できる機能

| 機能 | API エンドポイント | 備考 |
|------|------------------|------|
| 栄養素一覧（primary / secondary / trace 分類） | `GET /api/v1/fertilizers/nutrients` | `?category=primary` 等でフィルタ可 |
| 栄養素詳細（description / bonsaiRole / deficiencySymptoms / excessSymptoms / foodSources） | `GET /api/v1/fertilizers/nutrients/{slug}` | 実装済み |
| 肥料カテゴリ一覧 | `GET /api/v1/fertilizers/categories` | 実装済み |
| 樹種一覧 | `GET /api/v1/fertilizers/tree-species` | 実装済み |
| 樹種別施肥スケジュール詳細 | `GET /api/v1/fertilizers/tree-species/{slug}/schedule` | 実装済み |

### 2.4 施肥ガイド — 新規 API エンドポイントが必要な機能

| 機能 | 必要なエンドポイント（仮案） | 根拠 |
|------|--------------------------|------|
| コラム一覧 | `GET /api/v1/fertilizers/columns` | Web の `getFertilizerColumns()` に相当。`?category=product_guide` 等のフィルタが必要 |
| コラム詳細 | `GET /api/v1/fertilizers/columns/{slug}` | Web の `getFertilizerColumnBySlug()` に相当 |

### 2.5 静的コンテンツ（API 不要・クライアント側定数）

以下の機能は Web 側も静的データを定数として持つため、ネイティブ側も同様にクライアント定数として実装できる。サーバー側 API を新規作成する必要はない。

| 機能 | コンテンツ形式 | Web の実装位置 |
|------|-------------|--------------|
| 用土と施肥の関係 | SOIL_TYPES 定数・SOIL_RECIPES 定数 | `app/(main)/fertilizers/soil/page.tsx` 内 |
| 水やりと施肥の関係 | SECTIONS 定数（4 セクション・各複数段落） | `app/(main)/fertilizers/watering/page.tsx` 内 |
| 症状から探す栄養素（NutrientSymptomSearch） | SYMPTOM_DATA 定数（12 エントリ）・TAG_CLOUD_KEYWORDS | `components/fertilizer/NutrientSymptomSearch.tsx` 内 |
| 施肥トラブル事例集 | コラム category='trouble' | API 経由（§2.4 コラム一覧で対応） |
| 栄養素の吸収と転流（NutrientAbsorptionDiagram） | インタラクティブ SVG アニメーション | `components/fertilizer/NutrientAbsorptionDiagram.tsx` — core に要相談（モバイルで SVG がそのまま動くか確認が必要） |
| ホルモンバランスシミュレーター計算ロジック | BONSAI_TECHNIQUES 定数・HORMONE_LEVEL_CONFIG 定数・計算ロジック | `components/hormone/HormoneBalanceSimulator.tsx` + `lib/constants/hormone-techniques.ts` |
| 年間ホルモン活性カレンダー（CalendarWithNavigation） | ヒートマップ表示・月ナビ | `components/hormone/HormoneAnnualCalendar.tsx` |

---

## 3. 現状アプリの不足リストと施肥スクロール不具合の推定原因

### 3.1 ホルモン — 実装済み画面

| 画面 | 対応 app パス | 完成度 |
|------|-------------|--------|
| ホルモントップ | `app/hormones/index.tsx` | ほぼ完成（ナビカード 6 枚が欠落。ヘッダーバナー + 五大ホルモン + 二次ホルモン一覧は実装済み） |
| ホルモン詳細 | `app/hormones/[slug]/index.tsx` | 部分実装（effects・seasonalLevels・activationMethod・practicalTips は実装済みだが、interactions と techniques が欠落） |

### 3.2 ホルモン — 完全未実装の画面

| 欠落画面 | Web パス |
|---------|---------|
| 技法とホルモン | `/hormones/techniques` |
| ホルモン相互作用一覧 | `/hormones/interactions` |
| 相互作用ダイアグラム | `/hormones/diagram` |
| 年間ホルモン活性カレンダー | `/hormones/calendar` |
| ホルモンバランスシミュレーター | `/hormones/simulator` |
| コラム一覧 | `/hormones/columns` |
| コラム詳細 | `/hormones/columns/[slug]` |

加えてホルモントップの「ナビカード 6 枚」（技法/相互作用/ダイアグラム/カレンダー/シミュレーター/コラム）が未実装。

### 3.3 施肥 — 実装済み画面

| 画面 | 対応 app パス | 完成度 |
|------|-------------|--------|
| 施肥トップ | `app/fertilizers/index.tsx` | 部分実装（ヘッダー・季節TIPS・タブ切替 3 種は実装済み。ナビカード 7 枚が欠落） |
| 栄養素詳細 | `app/fertilizers/nutrients/[slug]/index.tsx` | ほぼ完成 |
| 樹種別スケジュール詳細 | `app/fertilizers/tree-species/[slug]/index.tsx` | ほぼ完成（Web 版の FertilizationTimeline・季節サマリーが欠落） |

### 3.4 施肥 — 完全未実装の画面

| 欠落画面 | Web パス |
|---------|---------|
| 肥料カテゴリ比較（専用ページ） | `/fertilizers/categories` |
| 樹種別施肥スケジュール一覧 | `/fertilizers/schedules` |
| コラム一覧 | `/fertilizers/columns` |
| コラム詳細 | `/fertilizers/columns/[slug]` |
| 定番肥料ガイド | `/fertilizers/products` |
| 用土と施肥の関係 | `/fertilizers/soil` |
| 水やりと施肥の関係 | `/fertilizers/watering` |
| 栄養素の吸収と転流 | `/fertilizers/absorption` |
| 症状から探す栄養素 | `/fertilizers/symptoms` |
| 施肥トラブル事例集 | `/fertilizers/troubles` |

### 3.5 施肥トップ画面のスクロール不具合 — 原因推定

**症状:** 施肥トップ画面でスクロールできる範囲が画面下部 15% 程度しかない。

**構造分析:**

`app/fertilizers/index.tsx` の `FertilizersScreen` は以下の構造になっている。

```
<View flex:1 paddingTop={insets.top}>            ← コンテナ（flex:1）
  <OfflineBanner />
  <ScreenHeader />                                 ← 固定 View（スクロールなし）
      - headerBanner: aspectRatio 21/9 → 画面幅の約 45% を消費
      - headerDescription: 1 行テキスト
      - seasonCard: borderRadius付きカード
          - seasonImage: aspectRatio 16/9 → 画面幅の約 56% を消費
          - seasonContent: アイコン + タイトル + 説明文
  <CatalogTabs height:44 />                        ← 固定 44pt
  <View flex:1>                                    ← tabContent（残余空間）
    <NutrientsTab />
    ...
  </View>
</View>
```

`ScreenHeader` が 固定 `View`（`backgroundColor: colorBackground`、flex なし）のため、その中に 2 枚の縦積み画像（21/9 + 16/9）が入る。両方のアスペクト比が展開すると、典型的な 393pt 幅の画面では：

- headerBanner: 393 × (9/21) ≒ 168pt
- seasonImage: 393 × (9/16) ≒ 221pt
- その他テキスト + padding: 約 80pt

合計で 469pt 程度が `ScreenHeader` に消費される。これに `CatalogTabs`（44pt）を加えると、合計 513pt。一般的な Android デバイスの表示高さ（850〜900 logical pt 程度）から推算すると、`tabContent`（`flex:1`）に割り当てられる空間は 340〜390pt 程度になる計算だが、**問題の本質は別にある。**

`ScreenHeader` は `View` であり `ScrollView` に入っていない。一方で `tabContent` の中の各タブ（`NutrientsTab` / `CategoriesTab` / `TreeSpeciesTab`）がそれぞれ独立した `SectionList` / `FlatList` を持つ。この構造では、各タブの `SectionList` が `flex:1` の `tabContent` の中でスクロールを担う。

**ルート原因:** `tabContent` には `flex:1` が当たっているので、本来は問題ないはずだが、`ScreenHeader` の高さが画面高の過半数を占めることで `tabContent` の実効高が小さくなっている。これに加えて、`SectionList` の `contentContainerStyle` の `paddingTop: spacing4` や各セクションヘッダーに 16:9 の画像があり、リストコンテンツの実高が `tabContent` の高さを超えないと（データ件数が少ない場合など）スクロールが発生しない。

しかしより根本的な問題として考えられるのは、**`ScreenHeader` が `flex:1` の親コンテナ内で高さを自然展開してしまい、`tabContent` の残余が極端に小さくなっている**ことだ。特に `seasonCard` の `seasonImage`（`aspectRatio: 16/9`、`width: '100%'`）は動的に高さが決まるため、デバイスの幅に比例して巨大になる。

**修正方針（§ 4.1 に詳述）:** Web 版の構造に忠実に、ヘッダー・季節TIPS・ナビカードをすべて `ScrollView` または `FlatList` の `ListHeaderComponent` として取り込み、タブ切替ではなく縦一本のスクロールにする。

---

## 4. 忠実な再構築のための画面仕様

### 4.1 施肥ガイドトップ（再設計）

#### 4.1.1 概要・目的

Web 版 `/fertilizers` の完全再現。現状の「ヘッダー固定 + タブ切替」構造を廃止し、Web と同じ縦一本スクロール構成に変更する。スクロール不具合を根本解消する。

#### 4.1.2 ナビゲーション

- スタック: more-menu またはタブ（`navigation-structure.md` 参照）からの push
- 遷移先: 下記 7 種のナビカード各画面 + 栄養素詳細（`/fertilizers/nutrients/[slug]`）+ 樹種スケジュール詳細（`/fertilizers/schedules/[slug]`）

#### 4.1.3 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー] 「施肥ガイド」             │
│                                           │
│ [OfflineBanner（オフライン時のみ）]         │
│                                           │
│ [ScrollView] ← 画面全体がスクロール        │
│   paddingBottom: spacing8 + safeArea.bottom│
│                                           │
│   [headerBanner] aspectRatio 21/9          │  ← expo-image
│                                           │
│   [headerDescription テキスト]             │
│     padding: spacing4 / textSm / secondary │
│                                           │
│   [seasonCard] 季節TIPS                   │
│     ┌─────────────────────────────────┐   │
│     │ [seasonImage] aspectRatio 16/9   │   │
│     │ ─────────────────────────────── │   │
│     │ [アイコン] [タイトル]             │   │
│     │           [説明テキスト]         │   │
│     └─────────────────────────────────┘   │
│                                           │
│   [navCards セクション]                   │
│     [ナビカード 1: 栄養素辞典]            │
│     [ナビカード 2: 肥料カテゴリ比較]      │
│     [ナビカード 3: 樹種別施肥スケジュール] │
│     [ナビカード 4: コラム・読みもの]      │
│     [ナビカード 5: 定番肥料ガイド]        │
│     [ナビカード 6: 用土と施肥の関係]      │
│     [ナビカード 7: 水やりと施肥の関係]    │
│                                           │
│   [FertilizerDisclaimer]                  │
│                                           │
│   [三大栄養素セクション]                  │
│     [NPK 画像] aspectRatio 16/9           │
│     「三大栄養素（N・P・K）」 ← すべて見る │
│     [NutrientCard × 3（primary）]         │
│                                           │
│   [二次要素セクション（データあり時）]     │
│     [secondary 画像] aspectRatio 16/9     │
│     「二次要素（Ca・Mg・S）」 ← すべて見る │
│     [NutrientCard × N（secondary）]       │
│                                           │
└───────────────────────────────────────────┘
```

**重要な変更点:** `CatalogTabs` と `tabContent` を廃止。画面全体を単一の `ScrollView` で包み、ナビカード・栄養素セクションをすべてスクロール内に収める。タブが提供していた「肥料カテゴリ」「樹種」への導線はナビカードで代替する。

#### 4.1.4 ナビカード仕様

各ナビカードの props:

| カード | アイコン | label | description | count |
|------|---------|-------|-------------|-------|
| 栄養素辞典 | Beaker（Ionicons） | 栄養素辞典 | N・P・Kなど{N}種の栄養素を解説 | nutrients.length |
| 肥料カテゴリ比較 | Grid（LayoutGrid） | 肥料カテゴリ比較 | 有機肥料・化成肥料・液肥などを比較 | なし |
| 樹種別施肥スケジュール | Tree | 樹種別施肥スケジュール | {N}樹種の月別カレンダー | treeSpecies.length |
| コラム・読みもの | BookOpen | コラム・読みもの | {N}件の記事 / 施肥テクニックや基礎知識 | columns.length |
| 定番肥料ガイド | Package | 定番肥料ガイド | 盆栽栽培でよく使われる肥料製品を紹介 | なし |
| 用土と施肥の関係 | Layers | 用土と施肥の関係 | 用土の種類と保肥力が施肥に与える影響 | なし |
| 水やりと施肥の関係 | CloudRain | 水やりと施肥の関係 | 灌水と施肥の適切な組み合わせ | なし |

ナビカードコンポーネント仕様（`NavCard`）:
- 幅: 画面幅 - padding × 2（全幅カード）
- 高さ: 最小 64pt（コンテンツ量による可変）
- レイアウト: アイコンボックス（36pt 正方形、`colorSurfaceMuted` 背景、`radiusMd`）+ テキストブロック + ChevronRight
- テキスト: label（`textSm`、`colorTextPrimary`、`fontWeight:600`）+ count バッジ（任意）+ description（`textXs`、`colorTextSecondary`）
- 境界: `1pt colorBorder`、`radiusMd`
- タップ: 対応画面への router.push
- タップターゲット: 44pt 以上
- accessibilityRole: "button"
- accessibilityLabel: `${label}へ移動`

#### 4.1.5 データ取得

画面マウント時に並行して 3 クエリを実行:
- `GET /api/v1/fertilizers/nutrients` → primaryNutrients / secondaryNutrients 分類に使用
- `GET /api/v1/fertilizers/tree-species` → treeSpecies.length（ナビカードのカウント表示のみ）
- `GET /api/v1/fertilizers/columns` → columns.length（ナビカードのカウント表示のみ） ← core に要相談（API 未実装）

ナビカードの count 表示はオプショナル。API が未実装の間は count なしで表示して差し支えない。

#### 4.1.6 状態とインタラクション

| 状態 | 表示 |
|-----|-----|
| ローディング | `ScreenLoading variant="spinner"` |
| 空 | nutrients が 0 件の場合のみ `ScreenEmpty`（ナビカードは常時表示） |
| エラー | `ScreenError onRetry={refetch}` |
| オフライン | `OfflineBanner` + キャッシュがあれば表示継続 |

pull-to-refresh: 全クエリを `refetch()` する。

#### 4.1.7 既存コンポーネントの流用

- `NutrientCard` 既存（`components/fertilizer/NutrientCard.tsx`）をそのまま流用
- `OfflineBanner` / `ScreenLoading` / `ScreenEmpty` / `ScreenError` は既存を流用
- `NavCard` は新規コンポーネントとして `components/fertilizer/NavCard.tsx` に切り出す（同形式をホルモントップでも流用するため）

---

### 4.2 栄養素一覧（新規画面）

#### 4.2.1 概要

Web 版 `/fertilizers/nutrients` の完全再現。primary / secondary / trace の 3 カテゴリをセクション分けしてカード一覧表示する。

#### 4.2.2 ナビゲーション

- 遷移元: 施肥トップのナビカード「栄養素辞典」
- 遷移先: 各 NutrientCard タップ → 栄養素詳細（`/fertilizers/nutrients/[slug]`）

#### 4.2.3 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「栄養素一覧」       │
│   subtitle: 「{N}件」                      │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [SectionList]                             │
│   セクション 1: 「三大要素」              │
│     [NutrientCard × N]                    │
│   セクション 2: 「二次要素」              │
│     [NutrientCard × N]                    │
│   セクション 3: 「微量要素」              │
│     [NutrientCard × N]                    │
└───────────────────────────────────────────┘
```

カテゴリ順: primary → secondary → trace（Web と同一）

#### 4.2.4 データ取得

- `GET /api/v1/fertilizers/nutrients` → 全件取得後クライアント側でカテゴリ分類

---

### 4.3 肥料カテゴリ比較（新規画面）

#### 4.3.1 概要

Web 版 `/fertilizers/categories` の完全再現。有機肥料・化成肥料・液肥等の各種比較表示。

#### 4.3.2 ナビゲーション

- 遷移元: 施肥トップのナビカード「肥料カテゴリ比較」
- 遷移先: なし（詳細遷移は Web 版にもない）

#### 4.3.3 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「肥料カテゴリ比較」 │
│   subtitle: 有機肥料・化成肥料など各種の特徴を比較 │
│                                           │
│ [OfflineBanner]                           │
│                                           │
│ [FertilizerDisclaimer]                    │
│                                           │
│ [FlatList または ScrollView]              │
│   [CategoryComparisonCard × N]            │
└───────────────────────────────────────────┘
```

#### 4.3.4 既存コンポーネント

`CategoryComparisonCard`（`components/fertilizer/CategoryComparisonCard.tsx`）が既存。施肥トップのタブコンテンツで使われていたが、独立した画面に昇格させる。

---

### 4.4 樹種別施肥スケジュール一覧（新規画面）

#### 4.4.1 概要

Web 版 `/fertilizers/schedules` の完全再現。松柏・雑木の 2 カテゴリには挿絵画像付き。

#### 4.4.2 ナビゲーション

- 遷移元: 施肥トップのナビカード「樹種別施肥スケジュール」
- 遷移先: TreeSpeciesCard タップ → 樹種詳細スケジュール（`/fertilizers/schedules/[slug]`）

#### 4.4.3 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「樹種別施肥スケジュール」 │
│   subtitle: 樹種を選んで月別の施肥カレンダーを確認 │
│                                           │
│ [SectionList]                             │
│   セクション「松柏類」: 先頭に schedule-conifer 画像 │
│     [TreeSpeciesCard × N]                 │
│   セクション「雑木類」: 先頭に schedule-deciduous 画像 │
│     [TreeSpeciesCard × N]                 │
│   セクション「花物」                       │
│     [TreeSpeciesCard × N]                 │
│   セクション「実物」...（以下同様）         │
└───────────────────────────────────────────┘
```

カテゴリ順: conifer → deciduous → flowering → fruiting → grass → evergreen（Web と同一）

---

### 4.5 樹種詳細スケジュール（改修）

#### 4.5.1 概要

現状実装の `app/fertilizers/tree-species/[slug]/index.tsx` を Web 版 `/fertilizers/schedules/[slug]` に合わせて拡張する。現状は MonthlyScheduleGrid（月別グリッド）のみだが、Web 版には以下が追加で存在する。

**現状不足の要素:**
1. 「概要」テキストセクション（species.description）
2. 「施肥方針」テキストセクション（species.fertilizingPolicy）
3. 「代表的な樹種」テキストセクション（species.examples）
4. 「季節ごとの施肥傾向」2×2 グリッド（春夏秋冬 × ドミナントアクションバッジ）
5. 「年間施肥タイムライン」（FertilizationTimeline）
6. FertilizerDisclaimer

#### 4.5.2 追加コンポーネント仕様

**季節サマリーグリッド:**
- 2 列 × 2 行グリッド（spring / summer / autumn / winter）
- 各セル: 季節ラベル + 絵文字（🌱☀️🍂❄️）+ アクション badge（none/light/moderate/heavy）
- アクション badge カラー: Web の `FERTILIZER_ACTION_BADGE` と同じ配色で定数化

**年間タイムライン（FertilizationTimeline の RN 版）:**
- 1〜12 月を横軸に並べたバー表示
- アクション種別に応じた色帯
- core に要相談（Web 版コンポーネントの RN 移植。データ構造は同じ plans 配列を使用）

#### 4.5.3 パスの変更（routing）

現状のアプリパス `app/fertilizers/tree-species/[slug]/index.tsx` は Web パス `/fertilizers/schedules/[slug]` に対応している。ルーティング的には `app/fertilizers/schedules/[slug]/index.tsx` に移動させることを推奨するが、既存の API エンドポイント（`/api/v1/fertilizers/tree-species/{slug}/schedule`）はそのまま使用できる。

---

### 4.6 定番肥料ガイド（新規画面）

#### 4.6.1 概要

Web 版 `/fertilizers/products` の完全再現。コラム category='product_guide' のリスト表示。データが未公開の場合は空状態メッセージを表示。

#### 4.6.2 データ取得

- `GET /api/v1/fertilizers/columns?category=product_guide` ← core に要相談（API 未実装）

---

### 4.7 用土と施肥の関係（新規画面）

#### 4.7.1 概要

Web 版 `/fertilizers/soil` の完全再現。**静的コンテンツ。API 不要。**

#### 4.7.2 コンテンツ構造

```
[ScrollView]
  [CEC の説明セクション（card）]
  [主な盆栽用土の特性]
    [SoilCard × 6]
      各カード: 用土名 / 英名 / pH range / CEC level badge / 特性説明 / 施肥ポイント
  [樹種別の推奨用土配合]
    [RecipeItem × 4]
      各レシピ: 樹種ラベル / 配合文字列（mono font） / 理由説明
  [FertilizerDisclaimer]
```

**CEC バッジカラー:**
- very_low: 赤系（`colorDanger` 系トークン、または定義がなければ設計トークンの追加を検討）
- low: オレンジ系
- medium: 黄系
- medium_high: 緑系

注: これらの色トークンが `design-tokens.md` に未定義の場合は、インライン色ではなく Web のクラス名と同等の意味論的トークンとして frontend エンジニアが `design-tokens.md` 更新を design に要確認の上実装すること。

---

### 4.8 水やりと施肥の関係（新規画面）

#### 4.8.1 概要

Web 版 `/fertilizers/watering` の完全再現。**静的コンテンツ。API 不要。**

#### 4.8.2 コンテンツ構造

4 セクションを縦に並べる:
1. 液肥の希釈と使い方（3 段落）
2. 置き肥と灌水の関係（3 段落）
3. 季節別の水やりと施肥の調整（4 段落：春夏秋冬）
4. よくある失敗（4 段落）

各セクション: タイトル（`textLg`）+ card（`colorSurface`、`radiusMd`、`colorBorder`）内に段落テキスト（`textSm`、`colorTextSecondary`、`lineHeight:20`）

---

### 4.9 症状から探す栄養素（新規画面）

#### 4.9.1 概要

Web 版 `/fertilizers/symptoms` の完全再現。**静的コンテンツ + クライアント側インタラクティブ検索。API 不要。**

#### 4.9.2 機能仕様

- キーワード入力フィールド（TextInput）: placeholder「症状を入力（例: 葉が黄色い、縁が枯れる）」
- タグクラウド: 10 個のキーワードボタン（黄化 / 枯れる / 紫色 / 奇形 / 根 / 花 / 小葉 / 軟弱 / 耐寒 / 生育停滞）
- 検索結果: SYMPTOM_DATA（12 エントリ）をキーワードでフィルタリングし FlatList 表示
- 各エントリ: 症状名 + severity badge（重度/中度/軽度）+ 説明文 + 関連栄養素リンクチップ群
- 関連栄養素チップタップ: `/fertilizers/nutrients/{slug}` 詳細へ push

#### 4.9.3 検索ロジック

symptom 名・explanation・nutrient.name・nutrient.symbol に対する部分一致（大文字小文字無視）。SYMPTOM_DATA は Web 版と同一の 12 エントリをクライアント定数として持つ。

#### 4.9.4 severity バッジカラー

| severity | 意味 | 色系統 |
|---------|-----|-------|
| high（重度） | 赤系 | `colorDanger` 相当 |
| medium（中度） | 琥珀系 | `colorWarning` 相当 |
| low（軽度） | 青系 | `colorInfo` 相当 |

注: これらのセマンティックカラートークンが `design-tokens.md` に未定義の場合は frontend が設計チームに確認すること。

---

### 4.10 栄養素の吸収と転流（新規画面）

#### 4.10.1 概要

Web 版 `/fertilizers/absorption` の完全再現。**インタラクティブな吸収図（NutrientAbsorptionDiagram）を表示する。**

#### 4.10.2 モバイル実装上の注意

Web 版の `NutrientAbsorptionDiagram.tsx` は SVG アニメーションを使用している可能性が高い（コンポーネント名称から判断）。RN への移植は react-native-svg が必要になる可能性がある。**core に要相談: react-native-svg の採用可否の確認、または `react-native-reanimated` ベースの代替実装の検討。** コンポーネントの詳細実装は `components/fertilizer/NutrientAbsorptionDiagram.tsx` を参照すること。

---

### 4.11 施肥トラブル事例集（新規画面）

#### 4.11.1 概要

Web 版 `/fertilizers/troubles` の完全再現。コラム category='trouble' のカードリスト。

#### 4.11.2 データ取得

- `GET /api/v1/fertilizers/columns?category=trouble` ← core に要相談（API 未実装）

---

### 4.12 施肥コラム一覧・詳細（新規画面）

#### 4.12.1 コラム一覧

Web 版 `/fertilizers/columns` の完全再現。

- データ: `GET /api/v1/fertilizers/columns` ← core に要相談（API 未実装）
- 各アイテム: タイトル + カテゴリ badge + 公開日 → タップでコラム詳細へ push

#### 4.12.2 コラム詳細

Web 版 `/fertilizers/columns/[slug]` の完全再現。

- データ: `GET /api/v1/fertilizers/columns/{slug}` ← core に要相談（API 未実装）
- 表示: タイトル + 公開日 + FertilizerDisclaimer + 本文（whitespace-pre-wrap）

---

### 4.13 ホルモントップ（改修）

#### 4.13.1 概要

現状実装の `app/hormones/index.tsx` に「ナビカード 6 枚セクション」と「HormoneDisclaimer」を追加する。

#### 4.13.2 追加要素

現状のヘッダーバナー + 説明文 + 五大ホルモン + 二次ホルモン の前に以下を追加:

```
[ナビカード 6 枚]（縦積み全幅カード）
  1. 技法とホルモン（Wrench アイコン）
  2. ホルモン相互作用（Zap アイコン）
  3. 相互作用ダイアグラム（Network アイコン）
  4. 年間活性カレンダー（Calendar アイコン）
  5. バランスシミュレーター（Sliders アイコン）
  6. コラム・読みもの（BookOpen アイコン、count = columns.length）

[HormoneDisclaimer]（ナビカードの直後）
```

NavCard コンポーネントは § 4.1.4 で定義したものを流用する。

#### 4.13.3 データ取得

- 既存: `GET /api/v1/hormones` → major / secondary 一覧
- 追加: `GET /api/v1/hormones/columns` → columns.length（ナビカードのカウント） ← core に要相談

---

### 4.14 ホルモン詳細（改修）

#### 4.14.1 概要

現状実装の `app/hormones/[slug]/index.tsx` に `interactions`（相互作用）と `techniques`（関連技法）セクションを追加する。

#### 4.14.2 追加セクション

```
[既存: description / bonsaiRole / productionSite / effects / seasonalLevels / activationMethod / practicalTips]

[追加: 相互作用セクション]（allInteractions.length > 0 の場合）
  見出し「相互作用」 + 右端「すべて見る →」ボタン（/hormones/interactions へ push）
  [InteractionCard × N]
    hormoneA名 ⟷ hormoneB名 + type badge（相乗/拮抗/調節）+ description + bonsaiRelevance

[追加: 関連する盆栽技法セクション]（techniques.length > 0 の場合）
  見出し「関連する盆栽技法」 + 右端「すべて見る →」ボタン（/hormones/techniques へ push）
  [TechniqueRow × N]
    技法名 + effectType badge（増加/減少/再分配）+ 影響度 + mechanism テキスト
```

#### 4.14.3 データ取得

- 既存 API の拡張: `GET /api/v1/hormones/{slug}` に `interactions` と `techniques` フィールドを含める ← core に要相談
- または別途 `GET /api/v1/hormones/{slug}/interactions` / `GET /api/v1/hormones/{slug}/techniques` を新設

---

### 4.15 技法とホルモン（新規画面）

#### 4.15.1 概要

Web 版 `/hormones/techniques` の完全再現。BONSAI_TECHNIQUES 定数の各技法に対して、ホルモンへの効果リストをカード表示する。

#### 4.15.2 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「技法とホルモン」    │
│   subtitle: 各技法がホルモンに与える影響    │
│                                           │
│ [OfflineBanner]                           │
│ [HormoneDisclaimer]                       │
│                                           │
│ [FlatList]                                │
│   [HormoneTechniqueCard × N]              │
│     各カード: 技法名（日英）+ 説明 +       │
│     [effectRow × M]: ホルモン名 + effectType badge + magnitude + mechanism │
└───────────────────────────────────────────┘
```

#### 4.15.3 データ取得

- `GET /api/v1/hormones/techniques` ← core に要相談（API 未実装）
- クライアント側で `BONSAI_TECHNIQUES` 定数（`lib/constants/hormone-techniques.ts` から移植）のキーと突き合わせてグループ化

---

### 4.16 ホルモン相互作用一覧（新規画面）

#### 4.16.1 概要

Web 版 `/hormones/interactions` の完全再現。相互作用をリスト表示し、ダイアグラムへの誘導リンクを設ける。

#### 4.16.2 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「ホルモン相互作用」  │
│                                           │
│ [HormoneDisclaimer]                       │
│                                           │
│ [「ネットワーク図で見る →」ボタン]          │
│   タップで /hormones/diagram へ push       │
│                                           │
│ [FlatList]                                │
│   [HormoneInteractionCard × N]            │
│     hormoneA名 ⟷ hormoneB名              │
│     type badge（相乗/拮抗/調節）           │
│     description + bonsaiRelevance          │
└───────────────────────────────────────────┘
```

#### 4.16.3 データ取得

- `GET /api/v1/hormones/interactions` ← core に要相談（API 未実装）

---

### 4.17 相互作用ダイアグラム（新規画面）

#### 4.17.1 概要

Web 版 `/hormones/diagram` の完全再現。ホルモンノードとエッジのネットワーク図。ノードタップで関連エッジをハイライト。

#### 4.17.2 モバイル実装上の注意

Web 版は SVG ベースのインタラクティブ図（`HormoneInteractionDiagram.tsx`）。RN への移植には react-native-svg が必要。canvas ベースの代替（react-native-canvas / d3-force 等）も検討可能。**core に要相談: react-native-svg の採用可否の確認。** 代替案として、ダイアグラムは「相互作用一覧」への誘導のみに留め、ダイアグラム表示は WebView で Web 版ページを表示する方法も選択肢として挙げておく（UX の劣化はあるが実装コストが低い）。

#### 4.17.3 データ取得

- `GET /api/v1/hormones` → ノード情報（id / name / slug / category）
- `GET /api/v1/hormones/interactions` → エッジ情報（hormoneAId / hormoneBId / type / description）← core に要相談

---

### 4.18 年間ホルモン活性カレンダー（新規画面）

#### 4.18.1 概要

Web 版 `/hormones/calendar` の完全再現。五大ホルモンの月別活性をヒートマップで表示。`CalendarWithNavigation`（月ナビゲーション付き）を RN で実装する。

#### 4.18.2 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「年間ホルモン活性カレンダー」 │
│   subtitle: 五大ホルモンの月別活性（関東・落葉広葉樹基準） │
│                                           │
│ [HormoneDisclaimer]                       │
│                                           │
│ [CalendarHeatmap]                         │
│   行: ホルモン名（5 行）                   │
│   列: 1〜12 月（12 列）                    │
│   セル: 活性レベルに応じた背景色           │
│   月ナビ: 前月/翌月ボタン（月ごとに詳細列をハイライト） │
└───────────────────────────────────────────┘
```

#### 4.18.3 データ取得

- `GET /api/v1/hormones` を seasonalLevels 込みで取得（既存 API の拡張が必要か確認）← core に要相談

---

### 4.19 ホルモンバランスシミュレーター（新規画面）

#### 4.19.1 概要

Web 版 `/hormones/simulator` の完全再現。月選択 × 技法選択でホルモンバランスの予測バーグラフを表示するインタラクティブツール。

#### 4.19.2 画面レイアウト

```
┌───────────────────────────────────────────┐
│ [スタックヘッダー ← ] 「ホルモンバランスシミュレーター」 │
│                                           │
│ [HormoneDisclaimer]                       │
│                                           │
│ [ScrollView]                              │
│   [月選択グリッド] 6列×2行（1〜12 月）    │
│     選択中: primary 背景・白テキスト       │
│     未選択: muted 背景                    │
│                                           │
│   [技法選択グリッド] 2列（複数選択可）     │
│     選択中: primary border / primary/10 背景 │
│     「すべて解除」ボタン（選択時のみ表示）  │
│                                           │
│   [ホルモンバランス結果]                   │
│     各ホルモン行:                         │
│       [ホルモン名] [baseline badge] [→] [predicted badge] │
│       [バーグラフ: baseline + delta 差分バー] │
│                                           │
│   [注意書きテキスト]                      │
└───────────────────────────────────────────┘
```

#### 4.19.3 計算ロジック

Web 版 `HormoneBalanceSimulator.tsx` と同一のロジックをクライアント側 RN コンポーネントとして実装する。定数（`BONSAI_TECHNIQUES` / `HORMONE_LEVEL_CONFIG` / `SIMULATOR_MAGNITUDE_DELTA` 等）は `lib/constants/hormone-techniques.ts` に移植する。

#### 4.19.4 データ取得

- `GET /api/v1/hormones/simulator` ← core に要相談（API 未実装）
  - レスポンス: hormones 配列 + techniques（全技法×ホルモン効果）配列 + seasonalLevels（全ホルモン×12 ヶ月）配列

---

### 4.20 ホルモンコラム一覧・詳細（新規画面）

Web 版 `/hormones/columns` / `/hormones/columns/[slug]` の完全再現。施肥コラム（§ 4.12）と同パターンで実装する。

- コラム一覧: `GET /api/v1/hormones/columns` ← core に要相談（API 未実装）
  - 各アイテム: タイトル + カテゴリ badge（基礎知識/応用テクニック/最新研究/季節の管理）+ 公開日
- コラム詳細: `GET /api/v1/hormones/columns/{slug}` ← core に要相談（API 未実装）
  - 表示: タイトル + 公開日 + HormoneDisclaimer + 本文

---

## 5. ルーティング対応表（改修後）

### 5.1 植物ホルモン系

| Web URL | アプリ画面パス（推奨） | 実装状況 |
|--------|---------------------|---------|
| `/hormones` | `app/hormones/index.tsx` | 既存・改修必要 |
| `/hormones/[slug]` | `app/hormones/[slug]/index.tsx` | 既存・改修必要 |
| `/hormones/techniques` | `app/hormones/techniques/index.tsx` | 新規 |
| `/hormones/interactions` | `app/hormones/interactions/index.tsx` | 新規 |
| `/hormones/diagram` | `app/hormones/diagram/index.tsx` | 新規 |
| `/hormones/calendar` | `app/hormones/calendar/index.tsx` | 新規 |
| `/hormones/simulator` | `app/hormones/simulator/index.tsx` | 新規 |
| `/hormones/columns` | `app/hormones/columns/index.tsx` | 新規 |
| `/hormones/columns/[slug]` | `app/hormones/columns/[slug]/index.tsx` | 新規 |

### 5.2 施肥ガイド系

| Web URL | アプリ画面パス（推奨） | 実装状況 |
|--------|---------------------|---------|
| `/fertilizers` | `app/fertilizers/index.tsx` | 既存・改修必要（構造変更） |
| `/fertilizers/nutrients` | `app/fertilizers/nutrients/index.tsx` | 新規（現状は直接詳細のみ） |
| `/fertilizers/nutrients/[slug]` | `app/fertilizers/nutrients/[slug]/index.tsx` | 既存・ほぼ完成 |
| `/fertilizers/categories` | `app/fertilizers/categories/index.tsx` | 新規（現状タブの中） |
| `/fertilizers/schedules` | `app/fertilizers/schedules/index.tsx` | 新規（現状タブの中） |
| `/fertilizers/schedules/[slug]` | `app/fertilizers/schedules/[slug]/index.tsx` | 既存（パス変更が必要）|
| `/fertilizers/columns` | `app/fertilizers/columns/index.tsx` | 新規 |
| `/fertilizers/columns/[slug]` | `app/fertilizers/columns/[slug]/index.tsx` | 新規 |
| `/fertilizers/products` | `app/fertilizers/products/index.tsx` | 新規 |
| `/fertilizers/soil` | `app/fertilizers/soil/index.tsx` | 新規 |
| `/fertilizers/watering` | `app/fertilizers/watering/index.tsx` | 新規 |
| `/fertilizers/absorption` | `app/fertilizers/absorption/index.tsx` | 新規 |
| `/fertilizers/symptoms` | `app/fertilizers/symptoms/index.tsx` | 新規 |
| `/fertilizers/troubles` | `app/fertilizers/troubles/index.tsx` | 新規 |

---

## 6. 全画面共通エッジケース

| 状態 | 表示 |
|-----|-----|
| ローディング | `ScreenLoading variant="spinner"` |
| 空（0 件） | `ScreenEmpty title="{適切なメッセージ}"` |
| エラー | `ScreenError onRetry={refetch}` |
| オフライン | `OfflineBanner` 上部表示 + キャッシュがある場合はコンテンツ表示継続 |
| 静的コンテンツ（用土・水やり・症状） | ローディング不要（クライアント定数のみ）。オフラインでも動作する |
| 権限なし | ゲスト可エンドポイントのため不要 |

---

## 7. コピー案（画面タイトル・サブタイトル一覧）

| 画面 | タイトル | サブタイトル |
|-----|---------|------------|
| ホルモントップ | 植物ホルモン | 盆栽の成長・休眠・発根に関わる植物ホルモンの役割と相互作用を学べます |
| ホルモン詳細 | {hormone.name} | （nameEn があれば副タイトル） |
| 技法とホルモン | 技法とホルモン | 盆栽の各技法が植物ホルモンに与える影響 |
| ホルモン相互作用 | ホルモン相互作用 | ホルモン間の相乗・拮抗・調節関係 |
| 相互作用ダイアグラム | 相互作用ダイアグラム | ホルモン間の関係をネットワーク図で可視化します |
| 年間カレンダー | 年間ホルモン活性カレンダー | 五大ホルモンの月別活性レベルを一覧で確認できます（関東地方の落葉広葉樹基準） |
| シミュレーター | ホルモンバランスシミュレーター | 月と盆栽技法を選ぶと、五大ホルモンのバランスがどう変動するかを予測します |
| ホルモンコラム一覧 | コラム | 植物ホルモンに関する知識・ノウハウ |
| 施肥トップ | 施肥ガイド | 盆栽の健康を支える施肥の基礎知識・樹種別スケジュールを確認できます |
| 栄養素一覧 | 栄養素一覧 | （件数）件 |
| 栄養素詳細 | {nutrient.name}（{nutrient.symbol}） | （nameEn があれば副タイトル） |
| 肥料カテゴリ比較 | 肥料カテゴリ比較 | 有機肥料・化成肥料など各種肥料の特徴を比較 |
| 樹種別スケジュール一覧 | 樹種別施肥スケジュール | 樹種を選んで月別の施肥カレンダーを確認 |
| 樹種詳細スケジュール | {species.name}の施肥スケジュール | （英名があれば副タイトル） |
| 施肥コラム一覧 | コラム | 施肥テクニックや基礎知識 |
| 定番肥料ガイド | 盆栽の定番肥料ガイド | 盆栽栽培で広く使われている肥料製品の特徴・使い方をまとめました |
| 用土と施肥の関係 | 用土と施肥の関係 | 用土の種類によって保肥力（CEC）が異なり、施肥の量や頻度を調整する必要があります |
| 水やりと施肥の関係 | 水やりと施肥の関係 | 灌水（水やり）の方法と頻度は肥料の効き方に大きく影響します |
| 栄養素の吸収と転流 | 栄養素の吸収と転流 | 根から吸収された栄養素が植物体内をどのように移動するかを確認できます |
| 症状から探す栄養素 | 症状から探す栄養素 | 盆栽に現れた症状から、不足している可能性のある栄養素を逆引き検索できます |
| 施肥トラブル事例集 | 施肥トラブル事例集 | よくある施肥の失敗と対処法をまとめました |

---

## 8. 既存との一貫性メモ

### 流用する既存コンポーネント

| コンポーネント | 流用元 | 流用先 |
|-------------|-------|-------|
| `NutrientCard` | `components/fertilizer/NutrientCard.tsx` | 施肥トップ・栄養素一覧 |
| `TreeSpeciesCard` | `components/fertilizer/TreeSpeciesCard.tsx` | 樹種スケジュール一覧 |
| `CategoryComparisonCard` | `components/fertilizer/CategoryComparisonCard.tsx` | 肥料カテゴリ比較 |
| `HormoneCard` | `components/hormone/HormoneCard.tsx` | ホルモントップ（既存） |
| `ScreenLoading` / `ScreenEmpty` / `ScreenError` | `components/common/` | 全新規画面 |
| `OfflineBanner` | `components/common/OfflineBanner.tsx` | 全新規画面 |

### 新規作成が必要なコンポーネント

| コンポーネント | 配置 | 備考 |
|-------------|-----|-----|
| `NavCard` | `components/fertilizer/NavCard.tsx` または `components/common/NavCard.tsx` | ホルモントップ・施肥トップ共用 |
| `HormoneDisclaimerNative` | `components/hormone/HormoneDisclaimer.tsx` | Web 版と同テキスト内容 |
| `FertilizerDisclaimerNative` | `components/fertilizer/FertilizerDisclaimer.tsx` | Web 版と同テキスト内容 |
| `HormoneInteractionCard` | `components/hormone/HormoneInteractionCard.tsx` | type badge 付きカード |
| `HormoneSeasonalBar` | `components/hormone/HormoneSeasonalBar.tsx` | 既存 SimpleBarChart が相当する可能性あり（既存を確認） |
| `FertilizationTimeline` | `components/fertilizer/FertilizationTimeline.tsx` | 年間バー表示 |
| `SeasonSummaryGrid` | `components/fertilizer/SeasonSummaryGrid.tsx` | 2×2 季節グリッド |
| `SoilCard` | `components/fertilizer/SoilCard.tsx` | 用土特性カード |

---

## 9. アクセシビリティ要件

- タップターゲット: 44pt 以上（NavCard・月選択ボタン・技法選択ボタン）
- 月選択ボタン: `accessibilityRole="button"` + `accessibilityLabel="{n}月を選択"`
- 技法選択ボタン: `accessibilityState={{ selected: isSelected }}` + `accessibilityRole="button"`
- ナビカード: `accessibilityRole="button"` + `accessibilityLabel="{label}へ移動"`
- 症状カード: `accessibilityRole="text"` + 栄養素リンクチップは `accessibilityRole="button"`
- ヒートマップカレンダー: 各セルに `accessibilityLabel="{ホルモン名} {月}月 活性レベル: {level}"`
- バーグラフ: スクリーンリーダー向けに数値を `accessibilityLabel` で補完する

---

## 10. 優先実装順（推奨）

実装コストと UX インパクトに基づく優先順位:

1. **施肥トップ改修**（スクロール不具合解消 + ナビカード追加）— 既存バグ修正
2. **ホルモントップ改修**（ナビカード 6 枚追加）— 既存バグ修正
3. **樹種スケジュール詳細改修**（概要・施肥方針・季節サマリー追加）— 既存強化
4. **栄養素一覧**（新規・API 既存）
5. **肥料カテゴリ比較**（新規・API 既存・コンポーネント既存）
6. **樹種スケジュール一覧**（新規・API 既存・コンポーネント既存）
7. **用土と施肥の関係**（新規・静的・API 不要）
8. **水やりと施肥の関係**（新規・静的・API 不要）
9. **症状から探す栄養素**（新規・静的 + インタラクティブ・API 不要）
10. **ホルモン詳細改修**（interactions + techniques 追加 — API 新設依存）
11. **技法とホルモン**（新規 — API 新設依存）
12. **ホルモン相互作用一覧**（新規 — API 新設依存）
13. **シミュレーター**（新規 — API 新設依存 + ロジック移植）
14. **年間カレンダー**（新規 — API 新設依存 + ヒートマップ UI）
15. **各コラム一覧・詳細**（新規 — API 新設依存）
16. **相互作用ダイアグラム**（新規 — SVG/react-native-svg 判断待ち）
17. **栄養素の吸収と転流**（新規 — SVG/react-native-svg 判断待ち）
18. **定番肥料ガイド・施肥トラブル**（新規 — API 新設依存）
