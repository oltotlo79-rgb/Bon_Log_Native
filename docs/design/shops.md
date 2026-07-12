# 盆栽園マップ（店舗一覧）画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
最終改訂: 2026-07-13（実装 `app/shops/new/index.tsx` / `app/shops/[id]/edit/index.tsx` の確認結果に基づき §4 を全面改訂。ジャンルは**必須から任意**へ是正し、上限を `MAX_SHOP_GENRES`（5件）と明記した。あわせて、実装に存在する「住所から位置を取得（ジオコーディング）」ボタンと、緯度・経度が既定では折りたたまれた「手動で編集」セクションであることを反映した。ジャンル選択 UI は `post-composer.md` の `GenreSelector`（トリガー→モーダル）コンポーネントの流用ではなく、画面ローカルの常時展開チップ行であることも訂正した）
対象画面:
- `shops/index` — 店舗一覧
- `shops/new` — 店舗登録フォーム
- `shops/[id]/index` — 店舗詳細
- `shops/[id]/edit` — 店舗編集フォーム
- `shops/[id]/reviews` — レビュー一覧
- `shops/[id]/reviews/new` — レビュー投稿フォーム

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `auth-forms.md`（AuthTextField・FormErrorMessage）を入力フィールドに流用する
- `post-composer.md` §8 の ImageAttachmentGrid を画像選択に流用する
- **地図描画ライブラリは使わない**（PM 決定）。lat/lng はテキスト表示 +「地図アプリで開く」リンク
- `isOwner` フラグで owner のみ店舗情報を編集できる権限制御を実装する
- レビューの二重投稿 (409) を適切にハンドリングする
- `store-compliance.md`（通報・ブロック要件）を確認済み

---

## 1. 概要・目的

盆栽専門店・盆栽園の一覧表示・詳細閲覧・レビュー閲覧・レビュー投稿・店舗登録・店舗情報編集を提供する画面群。
Web 版 `/shops` のモバイル対応。地図表示は行わず、住所テキストと「地図アプリで開く」リンクで代替する。

---

## 2. 店舗一覧画面（`shops/index`）

### 2.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「盆栽園マップ」                                     │
│   右: なし                                                  │
│                                                             │
│ [SortBar（固定 / スクロール外）]                             │
│   高さ: 44pt / 背景: colorSurfaceWashi / 下端: 1pt colorBorderLight│
│   並び替え: [評価順 ▾] [名前順] [新着順] [近い順]           │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   contentContainerStyle: paddingHorizontal spacing4         │
│   paddingTop: spacing3 / paddingBottom: spacing24 + セーフ域 │
│                                                             │
│   [ShopCard × N]                                           │
│   ↓ pull-to-refresh                                        │
│   ↓ 末尾で次ページ取得                                      │
│                                                             │
│ [FAB（店舗登録）]                                            │
│   右下固定 / + アイコン / 直径 56pt                          │
│   ログイン済みユーザーのみ表示                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 SortBar 仕様

- 選択中の並び替えチップ: `colorActionPrimary` 背景 / `colorActionPrimaryText` テキスト
- 非選択: `colorActionSecondary` 背景 / `colorActionSecondaryText` テキスト
- `post-composer.md` §7.2 GenreSelector チップスタイルを踏襲する

**並び替え選択肢（`sortBy` パラメータ）:**

| ラベル | 値 | 内容 |
|--------|---|------|
| 「評価順」| `rating` | `averageRating` 降順（デフォルト）|
| 「名前順」| `name` | 店舗名昇順 |
| 「新着順」| `newest` | 登録日降順 |
| 「近い順」| `location` | lat/lng が未設定の店舗は末尾へ |

### 2.3 ShopCard レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [サムネイル 80x80pt]  [店舗名 textMd fontWeight:600]         │
│                       [ジャンル textXs colorTextTertiary]   │
│                       [★ averageRating（小数1位）  reviewCount 件]│
│                       [住所（都道府県 + 市区町村程度の短縮形）]│
└─────────────────────────────────────────────────────────────┘
```

詳細:
- 高さ: 最小 88pt（`paddingVertical: spacing3`）
- `paddingHorizontal: spacing4`
- 下端区切り: `1pt solid colorBorderLight`
- 背景: `colorSurface`（`#fcfcfc`）/ 角丸: `radiusLg` / `shadowWashi`
- サムネイル: `expo-image` / `contentFit: "cover"` / `borderRadius: radiusMd`
- 画像なしプレースホルダー: `colorSurfaceMuted` 背景 + Store 系アイコン（`colorTextSecondary`）
- 星評価: ★ 塗りつぶし `colorWarning`（`#b8860b`）/ 空 `colorSurfaceMuted` / `textSm`
- 右端: ChevronRight / `colorTextTertiary`
- カード全体タップ → `shops/[id]`
- `accessibilityRole`: `"button"` / `accessibilityLabel`: 「{店舗名}の詳細を見る。評価 {averageRating} 点。レビュー {reviewCount} 件。」

**ジャンル表示について:** ジャンルは §4 で説明する通り店舗登録時に**任意**（0件でも登録可）のため、カードの「ジャンル」行は 0 件の店舗では空欄・非表示になり得る。

---

## 3. 店舗詳細画面（`shops/[id]/index`）

### 3.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「{店舗名}」                                         │
│   右: 「⋮」（3点メニュー。`isOwner === true` のみ表示）      │
│                                                             │
│ [ScrollView]                                                │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8 + セーフエリア下端                 │
│                                                             │
│   [ShopHeroImage]（画像がある場合のみ）                      │
│   [幅 100% / アスペクト比 16:9 / expo-image contentFit:cover]│
│                                                             │
│   [ShopBasicInfo]                                           │
│   [店舗名 textXl fontWeight:700 paddingTop spacing4]         │
│   [ジャンルタグ textXs colorTextTertiary]（0件の場合は非表示）│
│   [★★★★☆ averageRating（小数1位）  reviewCount 件（リンク）]│
│                                                             │
│   [ShopInfoList]                                            │
│   ─────────────────────────────────────────────── (spacing3)│
│   [MapPinRow] [住所テキスト]                                 │
│   [MapPinRow] [「地図アプリで開く」リンク ↗]（lat/lngがある場合）│
│   [PhoneRow]  [電話番号]（任意）                             │
│   [GlobeRow]  [Webサイト ↗]（任意）                         │
│   [ClockRow]  [営業時間]（任意）                             │
│   [BanRow]    [定休日]（任意）                              │
│   ─────────────────────────────────────────────── (spacing3)│
│                                                             │
│   [ShopReviewsSection]                                      │
│   「レビュー」（textLg fontWeight:600）   [レビューを書く テキストリンク]│
│   ※ ログイン済みかつ自分のレビューがない場合のみリンク表示    │
│   ※ ログイン済みかつ自分のレビューがある場合は「投稿済み」表示│
│                                                             │
│   [ReviewSummary]                                           │
│   ★ {averageRating}  {reviewCount}件のレビュー              │
│                                                             │
│   [ReviewList（最新3件 プレビュー）]                         │
│   [ReviewItem × 3]                                          │
│   [「すべてのレビューを見る」ボタン → shops/[id]/reviews]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **本改訂の対象外の注記:** 詳細画面（`app/shops/[id]/index.tsx`）自体は今回未検証。§4 の変更（ジャンル任意化・緯度経度の取得方法変更）にともなうジャンル 0 件表示の扱いのみ本節に反映した。

### 3.2 「地図アプリで開く」リンク

- `lat` と `lng` の両方が存在する場合のみ表示する
- iOS: `maps://` スキーム（Apple Maps）/ Android: `geo:` スキームまたは Google Maps URL
- `Linking.openURL()` で開く
- `accessibilityLabel`: 「地図アプリで開く」
- タップターゲット: 44pt 以上

**プラットフォーム別の URL:**
- iOS: `maps://?q={住所または店舗名}&ll={lat},{lng}`
- Android: `geo:{lat},{lng}?q={lat},{lng}({店舗名})`

### 3.3 電話番号タップ

- `tel:` スキームで `Linking.openURL()` を呼び出す
- `accessibilityLabel`: 「電話をかける {電話番号}」

### 3.4 Web サイトリンク

- `expo-web-browser` の `openBrowserAsync` でアプリ内ブラウザを開く
- `accessibilityLabel`: 「公式サイトを開く（外部リンク）」

### 3.5 星評価表示コンポーネント（StarRating）

```
★★★★☆ 4.2  12件のレビュー
```

- 星: 5つ表示。塗りつぶし: `colorWarning`（`#b8860b`）/ 空: `colorSurfaceMuted`
- 半星（0.5単位）を表示する（例: 4.5 → ★★★★半星）
- `accessibilityLabel`: 「評価 {averageRating} 点 / 5点。{reviewCount} 件のレビュー。」

### 3.6 3点メニュー（owner のみ）

| 項目 | 動作 |
|------|------|
| 「店舗情報を編集する」| `shops/[id]/edit` へ遷移（モーダル）|

※ 店舗の削除機能は管理者専用のため一般ユーザー向け UI には含めない（**core に要確認**）。

---

## 4. 店舗フォーム（`shops/new` / `shops/[id]/edit`）

### 4.1 全体レイアウト

> **改訂注記（2026-07-13）:** 実装 `app/shops/new/index.tsx` に基づき全面改訂した。旧仕様との主な差分:
> 1. ジャンルは**必須から任意**へ（0件のまま登録可能）。上限は `MAX_SHOP_GENRES`（5件）
> 2. サムネイル画像選択フィールドは実装に存在しない（旧仕様の想定は誤り。店舗フォームは画像を一切扱わない）
> 3. 緯度・経度は常時表示の入力欄ではなく、住所入力欄に付随する「住所から位置を取得」ボタン（ジオコーディング）と、既定で折りたたまれた「緯度・経度を手動で編集（任意）」セクションで構成される

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「店舗を登録」または「店舗情報を編集」               │
│   右: 「保存する」                                          │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing6                                   │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [店舗名（必須）]                                 0/100   │
│                                                             │
│   [住所（必須・複数行）]                           0/200   │
│   [住所から位置を取得]（ボタン。ジオコーディング）           │
│   ※ 成功時「位置情報を取得しました：{整形済み住所}」を表示   │
│                                                             │
│   [ジャンル（任意）]                                         │
│   [松柏類] [雑木類] [草もの] ...（常時展開チップ・複数選択可）│
│   {選択数}/5 選択中（1件以上選択時のみ）                     │
│                                                             │
│   [緯度・経度を手動で編集（任意）]（折りたたみトリガー）      │
│     ┌─ 展開時のみ ──────────────────────────────────┐       │
│     │ [緯度（任意）] [経度（任意）]                    │       │
│     └────────────────────────────────────────────────┘       │
│                                                             │
│   [電話番号（任意）]                                         │
│   [Web サイト URL（任意）]                                   │
│   [営業時間（任意）]                                         │
│   [定休日（任意）]                                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| 店舗名（name）| 1行テキスト | 必須 | **100文字**（`MAX_SHOP_NAME_LENGTH`）| 独自 `TextInput` / 文字数カウンタ |
| 住所（address）| 複数行テキスト | 必須 | **200文字**（`MAX_SHOP_ADDRESS_LENGTH`）| 都道府県〜番地まで。§4.3 のジオコーディングボタン付き |
| ジャンル | チップ選択（複数可・常時展開）| **任意** | **5件**（`MAX_SHOP_GENRES`）| §4.4 参照。0件でも登録可 |
| 緯度（lat）| 数値入力 | 任意 | — | `keyboardType: "decimal-pad"` / -90〜90。既定で折りたたみ（§4.5）|
| 経度（lng）| 数値入力 | 任意 | — | `keyboardType: "decimal-pad"` / -180〜180。既定で折りたたみ（§4.5）|
| 電話番号（phone）| テキスト入力 | 任意 | **30文字**（`MAX_SHOP_PHONE_LENGTH`）| `keyboardType: "phone-pad"` |
| Web サイト URL（website）| URL テキスト | 任意 | **500文字**（`MAX_SHOP_URL_LENGTH`）| `keyboardType: "url"` / `https://`/`http://` 形式チェック |
| 営業時間（hours）| 複数行テキスト | 任意 | **200文字**（`MAX_SHOP_BUSINESS_HOURS_LENGTH`）| フリーテキスト（例: 月〜土 10:00〜18:00）|
| 定休日（closedDays）| 複数行テキスト | 任意 | **100文字**（`MAX_SHOP_CLOSED_DAYS_LENGTH`）| フリーテキスト（例: 日曜・祝日）|

**（2026-07-13 是正）:** 旧仕様の文字数上限（名前200・住所300・電話20 等）は実装値と異なっていたため全面的に実装値へ差し替えた。**サムネイル画像フィールドは実装に存在しない**（削除済み）。

### 4.3 住所からの位置取得（ジオコーディング）

> **改訂注記（2026-07-13）:** 実装には住所入力欄の直下に「住所から位置を取得」ボタンがあり、`useGeocodeMutation()` で住所文字列から緯度・経度を自動取得できる。旧仕様には記載がなかった。

- ボタンラベル: 「住所から位置を取得」/ 住所が空、または送信中・取得中は disabled
- タップ → `geocodeAddress(address)` を呼び出す（住所ジオコーディング API。エンドポイントは本節では未特定）
- 成功時: 取得した緯度・経度を `lat`/`lng` の状態に自動反映し、「位置情報を取得しました：{整形済み住所}」を成功メッセージとして表示（`colorSuccessBg` 背景 / `colorSuccess` テキスト）
- 失敗時（住所が見つからない）: `ERR_GEOCODE_ADDRESS_NOT_FOUND` をインライン表示。それ以外のエラーは `messageForApiError(err.code)` に従う
- `accessibilityLabel`: 「住所から位置を取得」

### 4.4 ジャンル選択（常時展開チップ・任意・上限5）

> **改訂注記（2026-07-13）:** 旧仕様は「ジャンル ＊（必須）」「`post-composer.md` の `GenreSelector`（トリガー→モーダル）を流用」としていたが、いずれも誤りだった。

- ジャンルは**任意**。0 件のまま店舗を登録・更新できる
- UI は `post-composer.md` の `GenreSelector`（トリガーボタン→モーダル）とは異なり、**画面ローカルで実装された常時展開のチップ行**（`useGenresQuery('shop')` で取得した一覧を `flexWrap` で並べる）
- 見出しラベルは「ジャンル（任意）」（アスタリスク等の必須マークは付けない）
- 上限: `MAX_SHOP_GENRES`（**5件**）。5件選択済みの状態で未選択チップをタップしても何も起こらない（disabled 表示）
- 選択済みチップは 5 件到達時でも常にタップ可能（解除できる）
- チップの配色・角丸・`hitSlop` は `post-composer.md` §7.2 のジャンルチップと同じトークンを使う（`colorActionSecondary` 非選択 / `colorActionPrimary` 選択済み / `colorSurfaceMuted` 無効）
- 選択数カウンタ「{選択数}/5 選択中」はチップ行の下に、1 件以上選択時のみ表示する（`post-composer.md` §7.1 のカウンタ表記パターンを踏襲）

### 4.5 緯度・経度（手動編集・既定で折りたたみ）

> **改訂注記（2026-07-13）:** 旧仕様は緯度・経度を常時表示のテキストフィールドとしていたが、実装は §4.3 のジオコーディングボタンが主経路であり、緯度・経度の手入力は「緯度・経度を手動で編集（任意）」という折りたたみトリガーの中に格納されている。

- トリガー行: 「緯度・経度を手動で編集（任意）」+ 開閉を示す chevron アイコン。タップで展開/折りたたみ（`accessibilityState: { expanded }`）
- 展開時のみ、緯度・経度の 2 つの `TextInput`（`keyboardType: "decimal-pad"`）を表示する
- 緯度: -90〜90 の範囲チェック（範囲外は「緯度は -90〜90 の数値を入力してください。」）
- 経度: -180〜180 の範囲チェック（範囲外は「経度は -180〜180 の数値を入力してください。」）
- 経度フィールドの下に補足テキスト: 「緯度・経度を入力すると「地図アプリで開く」機能が有効になります。」
- ジオコーディング成功時に自動反映された値も、この折りたたみセクションを開けば確認・手動修正できる

### 4.6 保存ボタンの活性条件

- 店舗名が 1文字以上 100文字以内
- 住所が 1文字以上 200文字以内
- Web サイト URL がある場合は URL 形式が正しい
- 緯度がある場合は -90〜90 の範囲
- 経度がある場合は -180〜180 の範囲
- 保存処理中でない

**（2026-07-13 是正）:** 旧仕様にあった「ジャンルが1件以上選択されている」という条件は削除した（ジャンルは任意のため送信条件に含まれない）。

### 4.7 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示（`presentation: "modal"`）|
| 遷移元（新規）| `shops/index` の FAB タップ |
| 遷移元（編集）| `shops/[id]` の 3点メニュー「店舗情報を編集する」（owner のみ）|
| 遷移先（成功）| モーダルを閉じて元の画面に戻る |

---

## 5. レビュー一覧画面（`shops/[id]/reviews`）

### 5.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「レビュー」                                         │
│   右: なし                                                  │
│                                                             │
│ [ReviewSummaryHeader]                                       │
│   ★ {averageRating} 点 / {reviewCount} 件                   │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   [ReviewItem × N]                                          │
│                                                             │
│ [FAB「レビューを書く」]（レビュー未投稿ユーザーのみ表示）      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 ReviewItem レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [アバター 32pt] [{nickname}]    [{投稿日時 相対表示}]         │
│ [★★★★☆ rating]                                             │
│ [本文テキスト（3行まで / 「続きを読む」）]                    │
│ [画像グリッド（最大3枚・任意）]                              │
└─────────────────────────────────────────────────────────────┘
```

- 下端区切り: `1pt solid colorBorderLight`
- `paddingVertical: spacing4` / `paddingHorizontal: spacing4`

---

## 6. レビュー投稿フォーム（`shops/[id]/reviews/new`）

> 本改訂ではレビューフォーム（§6）の実装ファイルは再検証していない。2026-06-22 版の記述をそのまま保持する。

### 6.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「レビューを書く」                                   │
│   右: 「投稿する」                                          │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8                                   │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [ShopNameLabel] ← 対象店舗名（編集不可テキスト）           │
│                                                             │
│   [星評価選択（必須）]                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  ☆ ☆ ☆ ☆ ☆  → タップで選択（1〜5）               │   │
│   │  「評価を選択してください」（未選択時）               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [レビュー本文（任意）]                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 店舗の雰囲気や品揃えなど...                          │   │
│   │                                           0/1000    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [画像（最大3枚・任意）]                                    │
│   [ImageAttachmentGrid（post-composer.md §8 流用）]          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 星評価選択コンポーネント（StarRatingInput）

```
★ ★ ★ ★ ★
（タップした星以下がすべて塗りつぶされる）
```

- 星5つを横並びに配置
- 各星: 36 × 36pt（`hitSlop` で 44pt 確保）
- 塗りつぶし済み: `colorWarning`（`#b8860b`）/ 未選択: `colorSurfaceMuted`
- `accessibilityRole`: `"slider"` / `accessibilityLabel`: 「評価を選択 {N} 点 / 5点」/ `accessibilityValue: { min: 1, max: 5, now: rating }`
- 未選択時は「投稿する」ボタンを disabled

### 6.3 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| 星評価（rating）| 星タップ選択 | 必須 | 1〜5 | 整数のみ |
| 本文（content）| 複数行テキスト | 任意 | 1000文字（`MAX_REVIEW_CONTENT_LENGTH`。クライアント側ソフト上限。サーバー制約なし）| 文字数カウンタ |
| 画像（images）| 画像選択（複数枚）| 任意 | 3枚 | `ImageAttachmentGrid` 流用 |

**投稿条件:** 星評価が選択されていること（本文・画像は任意）。

### 6.4 二重投稿（409）のハンドリング

- 同じ店舗に対して 1 ユーザーが 2 件目のレビューを投稿しようとした際にサーバーが 409 を返す
- 409 受信時: `FormErrorMessage` に「すでにこの店舗へのレビューを投稿済みです。レビューは 1 店舗につき 1 件のみ投稿できます。」を表示する
- **UI での事前制御:** 詳細画面・レビュー一覧の FAB 表示は「レビュー未投稿ユーザーのみ」に限定する（`hasMyReview` フラグで判定）。ただしサーバー側の 409 ハンドリングは必須（事前制御はあくまで UX 目的）

### 6.5 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示 |
| 遷移元 | `shops/[id]` の「レビューを書く」リンク / `shops/[id]/reviews` の FAB |
| 遷移先（成功）| モーダルを閉じて `shops/[id]` または `shops/[id]/reviews` に戻る |

---

## 7. コンポーネント分割

```
ShopsScreen (index)
├── ShopSortBar                 ← 並び替えチップ群
├── ShopList                    ← FlatList ラッパー
│   └── ShopCard                ← 各店舗カード
├── ShopsFAB                    ← 店舗登録 FAB
└── （common-states.md コンポーネント群）

ShopDetailScreen ([id])
├── ShopHeroImage               ← カバー画像
├── ShopBasicInfo               ← 店舗名・ジャンル・評価
├── ShopInfoList                ← 住所・地図リンク・電話・Web・営業時間・定休日
│   └── ShopInfoRow             ← アイコン + テキストの共通行
├── ShopReviewsSection          ← 詳細画面内のレビュープレビュー
│   └── ReviewItem              ← 各レビュー（レビュー一覧でも共用）
└── StarRating                  ← 星評価表示（読み取り専用）

ShopFormScreen (new / edit)
├── ShopFormHeader              ← モーダルヘッダー
├── TextInput（店舗名・住所）
├── 「住所から位置を取得」ボタン ← ジオコーディング（§4.3）
├── ジャンルチップ行              ← 画面ローカル実装（任意・上限5。§4.4。post-composer の GenreSelector コンポーネント自体は流用しない）
├── 「緯度・経度を手動で編集」折りたたみセクション ← §4.5
├── TextInput（電話番号・Webサイト・営業時間・定休日）
└── FormErrorMessage            ← auth-forms.md 流用

ShopReviewsScreen ([id]/reviews)
├── ReviewSummaryHeader         ← 総合評価サマリー
├── ReviewList                  ← FlatList ラッパー
│   └── ReviewItem              ← 各レビュー
└── ReviewFAB                   ← レビュー書く FAB（未投稿ユーザーのみ）

ReviewFormScreen ([id]/reviews/new)
├── ReviewFormHeader            ← モーダルヘッダー
├── StarRatingInput             ← 星タップ選択
├── ReviewContentField          ← 本文テキストエリア
├── ImageAttachmentGrid         ← post-composer.md §8 流用（最大3枚）
└── FormErrorMessage            ← auth-forms.md 流用
```

---

## 8. ナビゲーション全体

| 画面 | ルート | 遷移元 | 遷移先 |
|------|--------|--------|--------|
| 一覧 | `shops/index` | `(tabs)/more`「盆栽園マップ」/ ネイティブ遷移 | 各 `shops/[id]` |
| 詳細 | `shops/[id]/index` | `shops/index` の ShopCard / `shops/[id]/reviews` の「← 戻る」| — |
| 店舗登録 | `shops/new` | `shops/index` の FAB | 成功後: `shops/index` |
| 店舗編集 | `shops/[id]/edit` | `shops/[id]` の 3点メニュー（owner のみ）| 成功後: `shops/[id]` |
| レビュー一覧 | `shops/[id]/reviews` | `shops/[id]` の「すべてのレビューを見る」| — |
| レビュー投稿 | `shops/[id]/reviews/new` | `shops/[id]` の「レビューを書く」/ `shops/[id]/reviews` の FAB | 成功後: 戻る |

---

## 9. データの流れ

### 9.1 店舗一覧

- `GET /api/v1/shops?sortBy={sortBy}&cursor={cursor}` — レスポンスに `averageRating` / `reviewCount` を含む
- `useInfiniteQuery`（`queryKeys.shops.list(sortBy)` 相当）

### 9.2 店舗詳細

- `GET /api/v1/shops/{id}` — レスポンスに住所・lat・lng・電話・Web・営業時間・定休日・ジャンル・`isOwner`・`hasMyReview` を含む

### 9.3 店舗の CRUD

| 操作 | エンドポイント | 権限 | invalidation |
|------|-------------|------|-------------|
| 作成 | `POST /api/v1/shops` | 認証済みユーザー | `shops.list` |
| 更新 | `PATCH /api/v1/shops/{id}` | owner のみ | `shops.detail(id)` / `shops.list` |

**作成リクエストボディ（実装確認済み）:** `{ name, address, genreIds, latitude, longitude, phone, website, businessHours, closedDays }`。`genreIds` は空配列を許容する（ジャンル任意化。§4.4）。

### 9.4 レビューの CRUD

| 操作 | エンドポイント | 権限 | invalidation |
|------|-------------|------|-------------|
| 一覧取得 | `GET /api/v1/shops/{id}/reviews` | 誰でも閲覧可 | — |
| 作成 | `POST /api/v1/shops/{id}/reviews` | 認証済み（1件まで）| `shops.reviews(id)` / `shops.detail(id)` |

**画像アップロード:** `post-composer.md` §5.3 の presigned URL → R2 直接 PUT フローを使う。

---

## 10. エッジケース

### 10.1 ローディング

| 画面 | ローディング表示 |
|------|--------------|
| 店舗一覧 | `ScreenLoading`（variant="skeleton" / ShopCardSkeleton × 4）|
| 店舗詳細 | `ScreenLoading`（variant="spinner"）|
| レビュー一覧 | `ScreenLoading`（variant="skeleton"）|
| フォーム（編集）| `ScreenLoading`（variant="spinner"）|

### 10.2 空状態

**店舗一覧（0件）:**
```
アイコン: MapPin / colorTextSecondary
見出し: 「盆栽園が登録されていません」
補足: 「右下のボタンから盆栽園を登録してみましょう。」
```

**レビュー一覧（0件）:**
```
見出し: 「まだレビューはありません」
補足: 「最初のレビューを書いてみましょう。」
```

### 10.3 エラー

| エラー種別 | 表示箇所 |
|-----------|---------|
| 一覧取得失敗 | `ScreenError`（onRetry: refetch）|
| 詳細取得失敗 | `ScreenError` |
| 404（店舗が存在しない）| `ScreenError`（title: 「店舗が見つかりません」）|
| 403（編集権限なし）| `ScreenError`（title: 「編集できません」）|
| 作成 / 更新失敗（住所重複含む 409）| `FormErrorMessage`（`ERR_SHOP_DUPLICATE_ADDRESS` 等）|
| ジオコーディング失敗 | 住所欄の下にインライン表示（`ERR_GEOCODE_ADDRESS_NOT_FOUND` 等。§4.3）|
| レビュー投稿失敗 | `FormErrorMessage` |
| 409（二重投稿）| `FormErrorMessage`（§6.4 の文言）|
| ネットワークエラー | `ScreenError`（ERR_NETWORK）|
| 5xx | `ScreenError`（ERR_SERVER）|

### 10.4 オフライン

- `OfflineBanner` を各画面上部に表示
- 一覧・詳細はキャッシュ表示を維持
- 作成 / 更新 / レビュー投稿はオフライン時にブロックし `FormErrorMessage` に `ERR_OFFLINE_ACTION` を表示

---

## 11. コピー案

| 箇所 | 文言 |
|------|------|
| 一覧ヘッダー | 「盆栽園マップ」|
| 詳細ヘッダー | 「{店舗名}」|
| 店舗登録フォームヘッダー | 「店舗を登録」|
| 店舗編集フォームヘッダー | 「店舗情報を編集」|
| レビュー一覧ヘッダー | 「レビュー」|
| レビュー投稿フォームヘッダー | 「レビューを書く」|
| ソート「評価順」| 「評価順」|
| ソート「名前順」| 「名前順」|
| ソート「新着順」| 「新着順」|
| ソート「近い順」| 「近い順」|
| FAB（一覧・accessibilityLabel）| 「店舗を登録する」|
| FAB（レビュー・accessibilityLabel）| 「レビューを書く」|
| 「地図アプリで開く」行 | 「地図アプリで開く」|
| 「公式サイトを見る」行 | 「公式サイトを見る」|
| 「レビューを書く」リンク | 「レビューを書く」|
| 「投稿済み」テキスト | 「レビュー投稿済み」|
| 「すべてのレビューを見る」| 「すべてのレビューを見る（{N} 件）」|
| 星評価 未選択時テキスト | 「評価を選択してください」|
| フォーム「店舗名」ラベル | 「店舗名 ＊」|
| フォーム「住所」ラベル | 「住所 ＊」|
| 「住所から位置を取得」ボタン | 「住所から位置を取得」|
| ジオコーディング成功文言 | 「位置情報を取得しました：{整形済み住所}」|
| フォーム「ジャンル」ラベル | 「ジャンル（任意）」|
| ジャンル選択数カウンタ | 「{選択数}/5 選択中」|
| 「緯度・経度を手動で編集」トリガー | 「緯度・経度を手動で編集（任意）」|
| フォーム「緯度」ラベル | 「緯度（任意）」|
| フォーム「経度」ラベル | 「経度（任意）」|
| lat/lng ヒントテキスト | 「緯度・経度を入力すると「地図アプリで開く」機能が有効になります。」|
| 緯度範囲エラー | 「緯度は -90〜90 の数値を入力してください。」|
| 経度範囲エラー | 「経度は -180〜180 の数値を入力してください。」|
| フォーム「電話番号」ラベル | 「電話番号（任意）」|
| フォーム「Web サイト」ラベル | 「Web サイト URL（任意）」|
| フォーム「営業時間」ラベル | 「営業時間（任意）」|
| フォーム「定休日」ラベル | 「定休日（任意）」|
| レビュー「本文」ラベル | 「レビュー本文（任意）」|
| レビュー「画像」ラベル | 「写真（最大3枚・任意）」|
| 二重投稿エラー | 「すでにこの店舗へのレビューを投稿済みです。レビューは 1 店舗につき 1 件のみ投稿できます。」|
| 一覧 空 見出し | 「盆栽園が登録されていません」|
| 一覧 空 補足 | 「右下のボタンから盆栽園を登録してみましょう。」|
| レビュー 空 見出し | 「まだレビューはありません」|
| レビュー 空 補足 | 「最初のレビューを書いてみましょう。」|
| 保存成功（店舗作成）| 「店舗を登録しました」|
| 保存成功（店舗編集）| 「店舗情報を更新しました」|
| 保存成功（レビュー）| 「レビューを投稿しました」|
| 破棄確認 タイトル | 「変更を破棄しますか？」|
| 破棄確認 本文 | 「保存されていない変更は失われます。」|
| 破棄確認（続ける）| 「編集を続ける」|
| 破棄確認（破棄）| 「破棄する」|

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| ShopCard | `accessibilityRole="button"` / `accessibilityLabel` に店舗名・評価・件数を含める / 最小 88pt |
| FAB（店舗登録）| `accessibilityRole="button"` / `accessibilityLabel="店舗を登録する"` / 56pt |
| FAB（レビュー）| `accessibilityRole="button"` / `accessibilityLabel="レビューを書く"` / 56pt |
| StarRating（表示）| `accessibilityLabel="評価 {N} 点 / 5点。{reviewCount} 件のレビュー"` |
| StarRatingInput | `accessibilityRole="slider"` / `accessibilityValue` でスコアを伝える |
| 「地図アプリで開く」| `accessibilityRole="link"` / `accessibilityLabel="地図アプリで開く"` |
| 「公式サイトを見る」| `accessibilityRole="link"` / `accessibilityLabel="公式サイトを開く（外部リンク）"` |
| 電話番号行 | `accessibilityRole="link"` / `accessibilityLabel="電話をかける {番号}"` |
| ソートチップ | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| ジャンルチップ | `accessibilityRole="checkbox"` / `accessibilityState: { checked, disabled }` / `accessibilityLabel` は「{ジャンル名}を選択」または「{ジャンル名}の選択を解除」|
| 「住所から位置を取得」ボタン | `accessibilityRole="button"` / `accessibilityLabel="住所から位置を取得"` / `accessibilityState: { disabled }` |
| 「緯度・経度を手動で編集」トリガー | `accessibilityRole="button"` / `accessibilityState: { expanded }` |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-composer.md` §7.2（ジャンルチップのトークン）| 店舗フォームのジャンルチップは配色・角丸・`hitSlop` のトークンのみ流用する。**トリガー→モーダルの `GenreSelector` コンポーネント自体は流用しない**（§4.4 参照。常時展開の画面ローカル実装）|
| `post-composer.md` §8（ImageAttachmentGrid）| レビューフォームの画像選択（最大3枚）に流用する |
| `auth-forms.md`（AuthTextField / FormErrorMessage）| 店舗フォームの各入力フィールドに流用する |
| `navigation-structure.md` §5.1（モーダルヘッダー）| 店舗・レビューのモーダルフォームヘッダーを踏襲する |
| `navigation-structure.md` §5.2（破棄確認）| 変更がある場合の破棄確認を踏襲する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| `events.md` の FAB デザイン | 直径 56pt / `colorActionPrimary` / `shadowWashi` を踏襲する |
| `more-menu.md` §3.2「盆栽園マップ」行 | ネイティブ画面実装後は `openBrowserAsync` → `router.push` に切り替える（frontend への申し送り）|

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| `isOwner` / `hasMyReview` フィールドの有無 | 詳細 API のレスポンスにこれらのフラグが含まれるか確認する | core | 未解決 |
| 店舗削除機能の有無 | 一般ユーザー（owner）が削除できるかどうかを確認する。できる場合は 3点メニューに削除を追加する | core | 未解決 |
| ジャンル取得（'shop' 種別）| `useGenresQuery('shop')` の API エンドポイントと返却値を確認する | core | 未解決（呼び出し自体は実装済み）|
| ジャンル選択数の上限 | 選択数の上限を確認する | core | **解決済み（2026-07-13）**: 5件（`MAX_SHOP_GENRES`）。§4.4 参照 |
| ジオコーディング API の仕様 | `useGeocodeMutation()` が呼ぶエンドポイント・レート制限・精度を確認する | core（新規発見。2026-07-13）|
| lat/lng の入力補助 | 住所からのジオコーディング（§4.3）が実装済みのため、旧仕様が想定していた「入力補助が必要かはスコープ外」という論点は解消済み | PM | **解決済み（2026-07-13）**|
| レビュー本文の文字数上限 | サーバー側の Zod バリデーション値を確認する（本仕様では 1000 文字のクライアントソフト上限と仮定。§6.3 参照）| core | 未解決 |
| `more-menu.md` の「盆栽園マップ」遷移先 | ネイティブ画面実装後の切り替えタイミング | frontend | 未解決 |
