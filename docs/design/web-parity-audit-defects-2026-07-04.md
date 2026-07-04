# Web 準拠監査レポート — Bon_Log Native vs Web 全画面比較

作成日: 2026-07-04
対象: `Bon_Log_Native` アプリ全画面 vs `Bon_Log_cfw` Web 版
調査方法: 読み取り専用（両リポジトリのソースコードを照合）

---

## 総計

発見した乖離の総数: **44 件**（未実装画面による乖離を含む）

- 優先度 高: 16 件
- 優先度 中: 17 件
- 優先度 低: 11 件

---

## 凡例

- **別途修正中** = ユーザー報告済みで既知の修正対象
- **修正先ファイル** = ネイティブアプリの修正が必要なファイル（`Bon_Log_Native` 配下）
- **Web の正** = `Bon_Log_cfw` における正しい実装

---

## 1. 農薬セクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 1 | 農薬製品詳細 | 登録番号が平文テキスト。農水省の農薬登録情報ページへのリンクが欠落 | `getMaffUrl(registrationNumber)` でURLを生成し `<Link>` または `Linking.openURL` で遷移可能にする | `app/pesticides/products/[slug]/index.tsx` | 高（別途修正中） |
| 2 | 農薬製品詳細 | 剤型が平文テキスト。剤型一覧ページ（`/pesticides/formulations`）へのリンクと「同じ剤型の薬剤を見る」サブリンクが欠落 | 剤型名を `buildPesticideFormulationsPath()` のリンクにする。サブテキスト「同じ剤型の薬剤を見る →」を追加 | `app/pesticides/products/[slug]/index.tsx` | 高（別途修正中） |
| 3 | 農薬製品詳細 | 耐性リスクバッジが全レベル同一色（`colorSurfaceMuted`）。色分けなし | high=rose 系、medium=amber 系、low=emerald 系でバッジ色を変える（`colorCategoryRedPaleBg` / `colorCategoryAmberPaleBg` / `colorCategoryGreenPaleBg` 等を活用） | `app/pesticides/products/[slug]/index.tsx` | 高（別途修正中） |
| 4 | 農薬製品詳細 | 混用不可農薬が `<View>` のみ。タップで製品詳細へ遷移する導線が欠落 | `<TouchableOpacity onPress={() => router.push(routePesticideProduct(item.slug))}>` でラップ | `app/pesticides/products/[slug]/index.tsx` | 高 |
| 5 | 農薬製品詳細 | 農薬効果（EffectRatingBadge）が欠落。◎○△×の記号と対応した色分けバッジを効果ごとに表示していない | Web は `EffectRatingBadge`（◎=emerald / ○=sky / △=amber / ×=rose）を病害虫効果リストに表示 | `app/pesticides/products/[slug]/index.tsx` | 中 |
| 6 | 農薬製品詳細 | 展着剤タイプが平文テキスト。展着剤詳細ページへのリンクが欠落 | 展着剤タイプ名を `/pesticides/spreaders/[slug]` へのリンクにする | `app/pesticides/products/[slug]/index.tsx` | 低 |
| 7 | 農薬製品詳細 | 農薬成分（FRAC/IRAC コードタグ）が成分詳細へリンクしていない | 成分名タップで `/pesticides/ingredients/[slug]` へ遷移 | `app/pesticides/products/[slug]/index.tsx` | 低 |
| 8 | 病害虫詳細 | 画像がインライン表示（100×100）のみ。タップでライトボックス展開（フルスクリーン表示）がない | Web の `DiseasePestImageLightbox` に相当するモーダル画像ビューアを実装 | `app/pesticides/disease-pests/[slug]/index.tsx` | 中 |
| 9 | 病害虫詳細 | 「同じカテゴリの病害虫を見る」リンクが欠落 | Web では下部に `href="/pesticides/diseases-pests?category=xxx"` のリンクがある | `app/pesticides/disease-pests/[slug]/index.tsx` | 中 |
| 10 | 農薬トップ | 病害虫タブに検索機能（病害虫名・色・体長mm フィルタ）がない。Web は専用検索フォームを持つ | Web の `DiseasePestSearchForm` に相当する検索 UI を追加 | `app/pesticides/index.tsx` | 中 |
| 11 | 農薬トップ | 農薬製品タブに詳細フィルタがない（タイプ: 殺虫/殺菌/殺ダニ/複合/展着剤、病害虫 ID 絞り込みが未実装） | Web の `PesticideSearchForm` に相当するフィルタ UI を追加 | `app/pesticides/index.tsx` | 中 |
| 12 | 画面未実装 | 展着剤一覧（`/pesticides/spreaders`）と展着剤詳細（`/pesticides/spreaders/[slug]`）が未実装 | Web に専用ページあり | 新規作成 `app/pesticides/spreaders/` | 中 |
| 13 | 画面未実装 | 剤型一覧（`/pesticides/formulations`）が未実装 | Web に専用ページあり | 新規作成 `app/pesticides/formulations/index.tsx` | 高 |
| 14 | 画面未実装 | 希釈計算ツール（`/pesticides/dilution-calculator`）が未実装 | Web にインタラクティブ計算ツールあり | 新規作成 `app/pesticides/dilution-calculator/index.tsx` | 中 |
| 15 | 画面未実装 | 混用チェッカー（`/pesticides/mixing-checker`）が未実装 | Web にサーバーデータ+クライアント判定ツールあり | 新規作成 `app/pesticides/mixing-checker/index.tsx` | 中 |
| 16 | 画面未実装 | 散布方法ガイド（`/pesticides/spray-guide`）が未実装 | Web に静的コンテンツガイドあり | 新規作成 `app/pesticides/spray-guide/index.tsx` | 低 |
| 17 | 画面未実装 | 農薬コラム一覧・詳細（`/pesticides/columns`, `/pesticides/columns/[slug]`）が未実装 | Web にコラムセクションあり | 新規作成 `app/pesticides/columns/` | 低 |

---

## 2. 施肥ガイドセクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 18 | 施肥樹種別詳細 | 季節サマリー（春夏秋冬 4 カードグリッド + dominant action バッジ）が欠落 | Web は `computeSeasonSummary()` で算出した季節ごとの主要アクション（施肥あり/なし等）を絵文字アイコン付き 4 カードで表示 | `app/fertilizers/tree-species/[slug]/index.tsx` | 高 |
| 19 | 施肥樹種別詳細 | `FertilizationTimeline`（12 カラム色バー + N/P/K 栄養バー + 凡例）が欠落 | Web は月別に none/light/moderate/heavy を色分けした横バーチャート（muted/amber/sky/emerald）と N・P・K 独立バーを表示 | `app/fertilizers/tree-species/[slug]/index.tsx` | 高 |
| 20 | 施肥樹種別詳細 | `FertilizationCalendar` の N/P/K 栄養素レベル列が欠落。月/施肥/N/P/K/ポイントの 6 列テーブルを表示すべき | Web は各月の施肥量・N・P・K レベルと cautionNote を季節色付きで一覧表示 | `app/fertilizers/tree-species/[slug]/index.tsx` | 高 |
| 21 | 施肥樹種別詳細 | `FertilizationCalendar` の `cautionNote`（⚠注意書き）表示が欠落 | Web はカレンダー下部に `⚠ cautionNote` テキストを表示（存在する場合）| `app/fertilizers/tree-species/[slug]/index.tsx` | 中 |
| 22 | 施肥樹種別詳細 | `description` / `fertilizingPolicy` / `examples` の 3 セクションが欠落 | Web では説明文・施肥の考え方・代表品種の実例をそれぞれセクションで表示 | `app/fertilizers/tree-species/[slug]/index.tsx` | 高 |
| 23 | 施肥ガイドトップ | ナビカード 7 枚が欠落（栄養素辞典・肥料カテゴリ比較・樹種別スケジュール・コラム・定番肥料ガイド・用土・水やり）。現状はタブ切替形式でハブ構造が不在 | Web は 7 枚のナビカードで各サブページへ誘導 | `app/fertilizers/index.tsx` | 高 |
| 24 | 施肥ガイドトップ | スクロール不具合（スクロール可能範囲が画面下部約 15% のみ）。ScreenHeader 内に 2 枚の縦積み画像が入り tabContent の実効高が極端に小さくなる | Web 版と同様に縦一本スクロール構成にする。ヘッダー・季節TIPS・ナビカードを ScrollView/ListHeaderComponent 内に配置 | `app/fertilizers/index.tsx` | 高（スクロール不具合） |
| 25 | 画面未実装 | 肥料コラム一覧・詳細（`/fertilizers/columns`, `/fertilizers/columns/[slug]`）が未実装（API 新規追加が必要。core に要相談） | Web にコラムセクションあり | 新規作成 `app/fertilizers/columns/` | 低 |
| 26 | 画面未実装 | 定番肥料ガイド（`/fertilizers/products`）が未実装 | Web に専用ページあり | 新規作成 `app/fertilizers/products/index.tsx` | 低 |
| 27 | 画面未実装 | 栄養素の吸収と転流（`/fertilizers/absorption`）が未実装。SVG インタラクティブアニメーション。モバイル対応は core に要相談 | Web に `NutrientAbsorptionDiagram` コンポーネントあり | 新規作成（core 確認後）| 低 |
| 28 | 画面未実装 | 施肥トラブル事例集（`/fertilizers/troubles`）が未実装（コラム API が必要） | Web に専用ページあり | 新規作成 `app/fertilizers/troubles/index.tsx` | 低 |

---

## 3. 植物ホルモンセクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 29 | ホルモントップ | ナビカード 6 枚（技法/相互作用/ダイアグラム/カレンダー/シミュレーター/コラム）が欠落。現状はホルモン一覧カードのみ | Web のトップは 6 枚ナビカード + 五大ホルモン + 二次ホルモン | `app/hormones/index.tsx` | 高 |
| 30 | ホルモン詳細 | `interactions`（このホルモンに関連する相互作用リスト）と `techniques`（関連技法リスト）セクションが欠落。API エンドポイント未対応（core に要相談） | Web のホルモン詳細には 2 セクションあり | `app/hormones/[slug]/index.tsx` | 中 |
| 31 | 画面未実装 | 技法とホルモン（`/hormones/techniques`）が未実装（API 新規追加が必要） | Web に専用ページあり | 新規作成 `app/hormones/techniques/index.tsx` | 中 |
| 32 | 画面未実装 | 相互作用ダイアグラム（`/hormones/diagram`）が未実装。SVG ネットワーク図。モバイル SVG 対応は core に要相談 | Web に SVG ネットワーク図あり | 新規作成（core 確認後）| 中 |
| 33 | 画面未実装 | 年間ホルモン活性カレンダー（`/hormones/calendar`）が未実装。ヒートマップ表示 | Web に月別ヒートマップあり | 新規作成 `app/hormones/calendar/index.tsx` | 中 |
| 34 | 画面未実装 | ホルモンバランスシミュレーター（`/hormones/simulator`）が未実装（API 新規追加が必要） | Web にインタラクティブシミュレーターあり | 新規作成（core 確認後）| 低 |
| 35 | 画面未実装 | ホルモンコラム一覧・詳細（`/hormones/columns`, `/hormones/columns/[slug]`）が未実装（API 新規追加が必要） | Web にコラムセクションあり | 新規作成 `app/hormones/columns/` | 低 |

---

## 4. イベント / 盆栽園セクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 36 | イベント一覧 | 月カレンダービュー（7 列グリッド、月移動、セル内イベントチップ、+N 件表示）が欠落。現状はリスト表示のみ（別途修正中） | Web の `EventCalendar` コンポーネントに相当 | `app/events/index.tsx` + 新規 `components/events/EventCalendarNative.tsx` | 高（別途修正中） |
| 37 | イベント一覧 | カレンダー/リスト切り替えボタンが欠落（別途修正中） | Web はビュートグルがヘッダーに固定 | `app/events/index.tsx` | 高（別途修正中） |
| 38 | イベント一覧 | 「終了イベントも表示」トグルが欠落。`showPast` パラメータが API に送信されない（別途修正中） | Web は `ShowPastToggle` でチェックボックス型切り替え | `app/events/index.tsx` | 中（別途修正中） |
| 39 | イベント一覧 | 都道府県フィルタが欠落（地方のみ実装）。地方選択時のエラーあり（別途修正中） | Web は地方 + 都道府県の両フィルタを持つ `RegionFilter` | `app/events/index.tsx` | 中（別途修正中） |
| 40 | 盆栽園マップ | インタラクティブ地図（react-native-maps 等でのマーカー表示、ピンタップ Popup）が欠落。現状は一覧のみ | Web は Leaflet + OSM で店舗マーカーを表示。カスタム SVG ピン・Popup（店舗名/住所/評価/詳細リンク）あり | `app/shops/index.tsx` + 新規 `components/shop/ShopMap.tsx` | 高 |
| 41 | 盆栽園マップ | 現在地ボタン（GPS → 地図移動）が欠落 | Web の `LocationButton` に相当 | `app/shops/index.tsx` | 低 |

---

## 5. 辞典セクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 42 | 辞典詳細 | カテゴリバッジが全カテゴリ同一色（`colorSurfaceMuted`）。7 カテゴリ固有色が欠落 | Web は `CATEGORY_COLORS`（松柏類=emerald/雑木類=blue/花物=green/実物=orange/草物=amber/用具=yellow/その他=purple）でカテゴリごとに色分け | `app/dictionary/[slug]/index.tsx` | 中 |
| 43 | 辞典詳細 | ふりがな（ruby/rt 相当）の表示が欠落。現状は `reading` フィールドを平文テキストで表示するのみ | Web は `<ruby>用語<rt>ふりがな</rt></ruby>` でルビを表示。React Native は ruby タグ非対応なので、用語見出しの直下に小サイズテキストでふりがなを明示するレイアウトが必要 | `app/dictionary/[slug]/index.tsx` | 中 |
| 44 | 辞典詳細 | 「同じカテゴリの用語一覧を見る」リンクが欠落 | Web では詳細下部に同カテゴリ一覧へのリンク | `app/dictionary/[slug]/index.tsx` | 低 |
| 45 | 辞典詳細 | 前後ナビに「前の用語」「次の用語」サブラベルが欠落。現状は用語名のみ表示 | Web は「← 前の用語 / 用語名」「用語名 / 次の用語 →」の 2 行レイアウト | `app/dictionary/[slug]/index.tsx` | 低 |

---

## 6. SNS / プロフィールセクション

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 46 | プロフィール（自分・他人） | 「コメント」タブが欠落。投稿タブのみ実装。Web は「投稿」「コメント」の 2 タブ構成 | Web の `ProfileTabs` は投稿タブとコメントタブを提供。コメントタブでは「どの投稿へのコメントか」のコンテキスト付きでコメント一覧を表示 | `app/(tabs)/profile/index.tsx` / `app/users/[id]/index.tsx` / `components/profile/UserPostsList.tsx` | 中 |
| 47 | 設定メニュー | セキュリティ設定（「セキュリティ設定 — 2段階認証・パスワード管理など」）が設定一覧に欠落 | Web の設定メニューには `ShieldIcon` + 「セキュリティ設定」がある。アプリには対応する項目がない | `app/settings/index.tsx` | 中 |

---

## 7. 全画面共通パターン

| # | 画面 | 乖離の内容 | Web の正 | 修正先ファイル | 優先度 |
|---|------|-----------|----------|--------------|--------|
| 48 | 施肥・ホルモン・農薬系 | 画像のダークモード対応版（`dark:src` 相当）が未実装。施肥樹種別一覧の section header 画像等でライトモードのみ使用 | Web は `<Image src={lightSrc} className="dark:hidden">` と `<Image src={darkSrc} className="hidden dark:block">` で切り替え | 各画像表示箇所（施肥関連画面等）| 低 |

---

## 優先度 高 のトップ10

優先度「高」の乖離を影響度と修正難度で並び替えた推奨対応順:

| 順位 | # | 内容 | 修正先 |
|-----|---|------|--------|
| 1 | 24 | 施肥ガイドトップのスクロール不具合（UX 破綻）| `app/fertilizers/index.tsx` |
| 2 | 29 | ホルモントップのナビカード 6 枚欠落（主要導線が存在しない）| `app/hormones/index.tsx` |
| 3 | 23 | 施肥ガイドトップのナビカード 7 枚欠落（主要導線が存在しない）| `app/fertilizers/index.tsx` |
| 4 | 18 | 施肥樹種別詳細: 季節サマリー欠落 | `app/fertilizers/tree-species/[slug]/index.tsx` |
| 5 | 19 | 施肥樹種別詳細: FertilizationTimeline 欠落 | 同上 |
| 6 | 20 | 施肥樹種別詳細: FertilizationCalendar の N/P/K 列欠落 | 同上 |
| 7 | 22 | 施肥樹種別詳細: description/policy/examples セクション欠落 | 同上 |
| 8 | 40 | 盆栽園マップ: インタラクティブ地図が完全に欠落 | `app/shops/index.tsx` |
| 9 | 13 | 農薬剤型一覧ページが未実装（農薬製品詳細からリンクされているが飛べない）| 新規 `app/pesticides/formulations/` |
| 10 | 4 | 農薬製品詳細: 混用不可農薬のタップ遷移欠落 | `app/pesticides/products/[slug]/index.tsx` |

---

## 参照

既存の詳細再設計仕様書:
- `docs/design/pesticides-web-parity.md` — 農薬セクション詳細仕様
- `docs/design/hormones-fertilizers-web-parity.md` — ホルモン・施肥セクション詳細仕様
- `docs/design/events-shopmap-web-parity.md` — イベント・盆栽園マップ詳細仕様

ユーザー報告済み / 別途修正中の 5 件:
1. 農薬製品詳細: 農水省リンク欠落 (# 1)
2. 農薬製品詳細: 剤型リンク欠落 (# 2)
3. 農薬製品詳細: 耐性リスク色なし (# 3)
4. イベント: カレンダー月ずれ / イベント表示なし / 地方選択エラー (# 36, 37, 38, 39)
5. 施肥樹種別: 簡素すぎる (# 18-22)

ホルモン相互作用ページ（別途修正中 — `app/hormones/interactions/index.tsx`）は今回の調査で Web 版との実質的な乖離なしと判定。結びつきの分かりにくさは UX コピーやレイアウト調整の余地あり（優先度低として注記するほどの実装差はない）。
