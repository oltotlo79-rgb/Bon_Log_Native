# マイ盆栽画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
対象画面:
- `bonsai/index` — 盆栽一覧
- `bonsai/new` — 盆栽登録フォーム
- `bonsai/[id]/index` — 盆栽詳細（成長記録タイムライン含む）
- `bonsai/[id]/edit` — 盆栽編集フォーム
- `bonsai/[id]/records/new` — 成長記録追加フォーム
- `bonsai/[id]/records/[recordId]/edit` — 成長記録編集フォーム

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-composer.md` §8 の ImageAttachmentGrid・画像選択フローを流用する
- `profile-edit.md` §7.5 の BirthdayField（テキスト方式）を日付入力に流用する
- `auth-forms.md`（AuthTextField・FormErrorMessage）を入力フィールドに流用する

---

## 1. 概要・目的

自分が管理する盆栽の一覧・詳細・作成・編集と、各盆栽の成長記録（テキスト・画像・日付）の CRUD を提供する画面群。
Web 版 `/bonsai` に相当するモバイル版。

---

## 2. 盆栽一覧画面（`bonsai/index`）

### 2.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「マイ盆栽」                                         │
│   右: なし                                                  │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   contentContainerStyle: paddingHorizontal spacing4         │
│   paddingTop: spacing3 / paddingBottom: spacing24 + セーフ域 │
│                                                             │
│   [BonsaiCard × N]                                          │
│   ↓ pull-to-refresh                                        │
│   ↓ 末尾で次ページ取得                                      │
│   [追加読み込みスピナー（フッター）]                          │
│                                                             │
│ [FAB（新規登録）]                                            │
│   右下固定 / + アイコン / 直径 56pt                          │
│   bottom: spacing4 + ボトムタブ高さ + セーフエリア下端        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 BonsaiCard レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [サムネイル 80x80pt（latestRecord の最新画像 or プレースホルダ）]│
│                           [盆栽名（textMd / fontWeight:600）] │
│                           [樹種（textSm / colorTextSecondary）]│
│                           [記録 {recordCount} 件]           │
│                           [最終更新 {相対日時}]              │
└─────────────────────────────────────────────────────────────┘
```

詳細:
- カード全体タップ → `bonsai/[id]`（詳細画面）
- 高さ: 最小 88pt（`paddingVertical: spacing3`）
- `paddingHorizontal: spacing4`
- 下端区切り: `1pt solid colorBorderLight`
- 背景: `colorSurface`（`#fcfcfc`）
- 角丸: `radiusLg`（10pt）/ `shadowWashi`
- サムネイル: `expo-image` / `contentFit: "cover"` / `borderRadius: radiusMd`（8pt）
- 画像なしプレースホルダー: `colorSurfaceMuted` 背景 + TreePine アイコン（`colorTextSecondary`）
- `accessibilityRole`: `"button"` / `accessibilityLabel`: 「{盆栽名}の詳細を見る」

### 2.3 FAB（新規登録ボタン）

- 直径: 56pt / `borderRadius: radiusFull`
- 背景: `colorActionPrimary`（`#2e2e2e`）
- アイコン: `+`（24pt / `colorActionPrimaryText`）
- 影: `shadowWashi`（浮き上がり表現）
- `accessibilityRole`: `"button"` / `accessibilityLabel`: 「盆栽を登録する」
- タップ → `bonsai/new`（モーダル）

---

## 3. 盆栽詳細画面（`bonsai/[id]/index`）

### 3.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「{盆栽名}」                                         │
│   右: 「⋮」（3点メニュー）                                   │
│                                                             │
│ [ScrollView]                                                │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing24 + セーフエリア下端                │
│                                                             │
│   [BonsaiInfoSection]                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [アイキャッチ画像 16:9 / なければプレースホルダー]     │   │
│   │                                                     │   │
│   │ [盆栽名 textXl fontWeight:700]                      │   │
│   │ [樹種 textBase colorTextSecondary]                  │   │
│   │ [取得日 textSm colorTextTertiary]                   │   │
│   │ [説明文 textBase paddingTop spacing3]               │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [セパレータ spacing4]                                      │
│                                                             │
│   [成長記録タイムラインセクション]                            │
│   「成長記録」（textLg fontWeight:600）   [+ 追加 テキストリンク]│
│                                                             │
│   [GrowthRecordTimeline]                                    │
│     [GrowthRecordItem × N（新しい順）]                       │
│     [追加読み込みスピナー]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 3点メニュー（⋮）

自分の盆栽にのみ表示。

| 項目 | 動作 |
|------|------|
| 「編集する」| `bonsai/[id]/edit` へ遷移（モーダル）|
| 「削除する」| 削除確認ダイアログ → `DELETE /api/v1/bonsai/{id}` → `bonsai/index` へ戻る |

削除確認ダイアログ:
```
タイトル: 「この盆栽を削除しますか？」
本文: 「盆栽と関連する成長記録がすべて削除されます。この操作は取り消せません。」
ボタン: [キャンセル] [削除する（colorError）]
```

### 3.3 GrowthRecordItem レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [タイムライン縦線（左端 2pt / colorBorderLight）]             │
│ [丸マーカー（左端 8pt / colorActionPrimary）]                │
│                                                             │
│ [日付（textSm / colorTextSecondary / 上部）]                 │
│                                                             │
│ [コンテンツエリア（左にパディング spacing5）]                  │
│   [記録テキスト（textBase）]                                 │
│   [画像グリッド（expo-image / 2列グリッド）（任意）]           │
│   [3点メニュー（右端・自分の記録のみ）]                       │
└─────────────────────────────────────────────────────────────┘
```

- タイムライン縦線は `GrowthRecordTimeline` の左端に absolute で描画する
- 各 `GrowthRecordItem` のコンテンツを `paddingLeft: spacing5` で右にずらす
- 画像グリッド: 最大 2 列 / 画像ごとに `borderRadius: radiusMd` / `expo-image` `contentFit: "cover"`
- 画像タップ → フルスクリーンビューア（`post-card.md` §7 PostImageGallery の仕様を流用）

**記録の3点メニュー:**

| 項目 | 動作 |
|------|------|
| 「編集する」| `bonsai/[id]/records/[recordId]/edit` へ遷移（モーダル）|
| 「削除する」| 削除確認ダイアログ → `DELETE /api/v1/bonsai/{id}/records/{recordId}`|

削除確認ダイアログ:
```
タイトル: 「記録を削除しますか？」
本文: 「この成長記録は削除されます。この操作は取り消せません。」
ボタン: [キャンセル] [削除する（colorError）]
```

---

## 4. 盆栽フォーム（`bonsai/new` / `bonsai/[id]/edit`）

### 4.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」（テキストボタン / colorTextSecondary）  │
│   中央: 「盆栽を登録」または「盆栽を編集」                   │
│   右: 「保存する」（テキストボタン）                         │
│                                                             │
│ [ScrollView（KeyboardAvoidingView で包む）]                  │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8                                   │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [アイキャッチ画像選択]                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [画像プレビュー 16:9 / なければグレープレースホルダー]  │   │
│   │                              [+ 画像を選択 右下]     │   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 1 枚のみ（アイキャッチ画像）                            │
│                                                             │
│   [盆栽名（必須）]                                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 例: 五葉松（初期値）                    0/100       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [樹種（任意）]                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 例: 五葉松・黒松...                                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [取得日（任意）]                                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 2020年1月1日                                    [✕] │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [説明（任意）]                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 盆栽のエピソードや特徴など...                        │   │
│   │                                          0/500      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [セーフエリア下端]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| アイキャッチ画像 | 画像選択（1枚）| 任意 | 1枚 | `expo-image-picker` + `expo-image-manipulator` 圧縮 |
| 盆栽名（name）| 1行テキスト | 必須 | 100文字 | `AuthTextField` 流用 / 文字数カウンタ |
| 樹種（species）| 1行テキスト | 任意 | 100文字 | `AuthTextField` 流用 |
| 取得日（acquiredAt）| 日付入力 | 任意 | — | `profile-edit.md` BirthdayField 方式（テキスト入力 / datetimepicker 未導入のためテキスト方式）|
| 説明（description）| 複数行テキスト | 任意 | 500文字 | 文字数カウンタ |

**取得日の入力方式:**
`profile-edit.md` §7.5 BirthdayField と同じテキスト入力方式を採用する（datetimepicker ライブラリ未導入のため）。
- 表示形式: 入力済みは「{YYYY}年{M}月{D}日」
- 未設定: `placeholder` 「取得日を入力（例: 2020/1/1）」
- 右端 [✕] ボタン（設定済みのみ）: タップで日付を削除
- **core に要確認:** `acquiredAt` のフィールド名と型（ISO 8601 文字列か Date か）を確認する

### 4.3 保存ボタンの活性条件

- 盆栽名が 1文字以上 100文字以内
- 保存処理中でない
- 編集時: 初期値からいずれかのフィールドが変更されている

### 4.4 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示（`presentation: "modal"`）|
| 遷移元（新規）| `bonsai/index` の FAB タップ |
| 遷移元（編集）| `bonsai/[id]` の 3点メニュー「編集する」|
| 遷移先（成功）| モーダルを閉じて元の画面に戻る |
| 遷移先（キャンセル）| 変更がある場合は破棄確認 → モーダルを閉じる |

**破棄確認ダイアログ（変更あり / 入力あり）:**
```
タイトル: 「変更を破棄しますか？」
本文: 「保存されていない変更は失われます。」
ボタン: [編集を続ける] [破棄する（colorError）]
```

---

## 5. 成長記録フォーム（`bonsai/[id]/records/new` / `bonsai/[id]/records/[recordId]/edit`）

### 5.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「記録を追加」または「記録を編集」                   │
│   右: 「保存する」                                          │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [記録日（任意）]                                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 2024年6月1日                                    [✕] │   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 空の場合は保存時の現在日時を使用                         │
│                                                             │
│   [記録内容（任意）]                                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 今日は植え替えを行いました...                        │   │
│   │                                        0/1000       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [画像（最大複数枚）]                                       │
│   ┌──────┐ ┌──────┐ ┌──────┐ [+ 追加]                    │
│   │ 画像 │ │ 画像 │ │ 画像 │                               │
│   └──────┘ └──────┘ └──────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| 記録日（recordAt）| 日付入力 | 任意 | — | テキスト方式（BirthdayField 流用）。空の場合は保存時の現在日時を使用 |
| 記録内容（content）| 複数行テキスト | 任意 | 1000文字 | content と images のどちらか一方は必要 |
| 画像（images）| 画像選択（複数枚）| 任意 | — | `post-composer.md` ImageAttachmentGrid 流用。上限枚数は **core に要確認** |

**保存条件:** content（1文字以上）または images（1枚以上）のどちらかが入力されていること。

### 5.3 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示 |
| 遷移元（新規）| `bonsai/[id]` の「+ 追加」テキストリンクタップ |
| 遷移元（編集）| `GrowthRecordItem` の 3点メニュー「編集する」|
| 遷移先（成功）| モーダルを閉じて `bonsai/[id]` に戻る |

---

## 6. コンポーネント分割

```
BonsaiScreen (index)
├── BonsaiList                  ← FlatList ラッパー
│   └── BonsaiCard              ← 各盆栽カード
├── BonsaiFAB                   ← 新規登録 FAB
├── ScreenLoading               ← common-states.md 流用
├── ScreenEmpty                 ← common-states.md 流用
├── ScreenError                 ← common-states.md 流用
└── OfflineBanner               ← common-states.md 流用

BonsaiDetailScreen ([id])
├── BonsaiInfoSection           ← 基本情報（名前・樹種・取得日・説明・画像）
├── GrowthRecordTimeline        ← タイムラインコンテナ（FlatList）
│   └── GrowthRecordItem        ← 各記録
│       └── RecordImageGrid     ← 記録画像グリッド
└── DeleteConfirmDialog         ← 削除確認（盆栽 / 記録 共用）

BonsaiFormScreen (new / edit)
├── BonsaiFormHeader            ← モーダルヘッダー
├── BonsaiCoverImagePicker      ← アイキャッチ画像選択
├── FormErrorMessage            ← auth-forms.md 流用
└── BonsaiFormFields            ← 各フォームフィールド群

GrowthRecordFormScreen (records/new / records/edit)
├── RecordFormHeader            ← モーダルヘッダー
├── RecordDateField             ← 記録日入力（BirthdayField 流用）
├── RecordContentField          ← 記録内容テキストエリア
├── ImageAttachmentGrid         ← post-composer.md §8 流用
└── FormErrorMessage            ← auth-forms.md 流用
```

---

## 7. データの流れ

### 7.1 盆栽一覧

- `GET /api/v1/bonsai` カーソルベース / レスポンスに `latestRecord` と `recordCount` を含む
- `useInfiniteQuery`（`queryKeys.bonsai.list` 相当）

### 7.2 盆栽詳細

- `GET /api/v1/bonsai/{id}` — 基本情報取得
- `GET /api/v1/bonsai/{id}/records` — 成長記録一覧（カーソルベース・新しい順）

### 7.3 盆栽の CRUD

| 操作 | エンドポイント | invalidation |
|------|-------------|-------------|
| 作成 | `POST /api/v1/bonsai` | `bonsai.list` |
| 更新 | `PATCH /api/v1/bonsai/{id}` | `bonsai.detail(id)` / `bonsai.list` |
| 削除 | `DELETE /api/v1/bonsai/{id}` | `bonsai.list` → 一覧に戻る |

### 7.4 成長記録の CRUD

| 操作 | エンドポイント | invalidation |
|------|-------------|-------------|
| 作成 | `POST /api/v1/bonsai/{id}/records` | `bonsai.records(id)` / `bonsai.detail(id)` / `bonsai.list` |
| 更新 | `PATCH /api/v1/bonsai/{id}/records/{recordId}` | `bonsai.records(id)` / `bonsai.detail(id)` |
| 削除 | `DELETE /api/v1/bonsai/{id}/records/{recordId}` | `bonsai.records(id)` / `bonsai.detail(id)` / `bonsai.list` |

**画像アップロード:** `post-composer.md` §5.3 の presigned URL → R2 直接 PUT フローを使う。

---

## 8. エッジケース

### 8.1 各画面のローディング

| 画面 | ローディング表示 |
|------|--------------|
| 盆栽一覧 | `ScreenLoading`（variant="skeleton" / BonsaiCardSkeleton × 3）|
| 盆栽詳細 | `ScreenLoading`（variant="spinner"）|
| 成長記録追加読み込み | タイムラインフッターのスピナー |
| フォーム（編集時）| `ScreenLoading`（variant="spinner"）|

### 8.2 空状態

**盆栽一覧（0件）:**
```
アイコン: TreePine / colorTextSecondary
見出し: 「まだ盆栽が登録されていません」
補足: 「右下のボタンから盆栽を登録してみましょう。」
```

**成長記録タイムライン（0件）:**
```
見出し: 「記録がまだありません」
補足: 「「+ 追加」をタップして最初の記録をつけましょう。」
```

### 8.3 エラー

| エラー種別 | 表示箇所 |
|-----------|---------|
| 一覧取得失敗 | `ScreenError`（onRetry: refetch）|
| 詳細取得失敗 | `ScreenError`（title: 「読み込めませんでした」）|
| 404（盆栽が存在しない）| `ScreenError`（title: 「盆栽が見つかりません」）|
| 作成 / 更新 / 削除失敗 | `FormErrorMessage` または エラートースト |
| ネットワークエラー | `ScreenError`（ERR_NETWORK）|
| 5xx | `ScreenError`（ERR_SERVER）|

### 8.4 オフライン

- `OfflineBanner` を各画面上部に表示
- 一覧・詳細はキャッシュ表示を維持
- CRUD 操作はオフライン時にブロックし `FormErrorMessage` に `ERR_OFFLINE_ACTION` を表示

---

## 9. コピー案

| 箇所 | 文言 |
|------|------|
| 一覧ヘッダー | 「マイ盆栽」|
| FAB accessibilityLabel | 「盆栽を登録する」|
| 新規フォームヘッダー | 「盆栽を登録」|
| 編集フォームヘッダー | 「盆栽を編集」|
| フォーム「盆栽名」ラベル | 「盆栽名 ＊」|
| フォーム「樹種」ラベル | 「樹種（任意）」|
| フォーム「取得日」ラベル | 「取得日（任意）」|
| フォーム「説明」ラベル | 「説明（任意）」|
| 新規記録フォームヘッダー | 「記録を追加」|
| 編集記録フォームヘッダー | 「記録を編集」|
| 記録「日付」ラベル | 「記録日（任意）」|
| 記録「内容」ラベル | 「記録内容（任意）」|
| 記録「画像」セクション | 「画像（任意）」|
| 「+ 追加」リンク | 「+ 記録を追加」|
| 盆栽一覧 空 見出し | 「まだ盆栽が登録されていません」|
| 盆栽一覧 空 補足 | 「右下のボタンから盆栽を登録してみましょう。」|
| 記録タイムライン 空 見出し | 「記録がまだありません」|
| 記録タイムライン 空 補足 | 「「+ 追加」をタップして最初の記録をつけましょう。」|
| 盆栽削除確認 タイトル | 「この盆栽を削除しますか？」|
| 盆栽削除確認 本文 | 「盆栽と関連する成長記録がすべて削除されます。この操作は取り消せません。」|
| 記録削除確認 タイトル | 「記録を削除しますか？」|
| 記録削除確認 本文 | 「この成長記録は削除されます。この操作は取り消せません。」|
| 削除ボタン（共通）| 「削除する」|
| 保存成功（盆栽作成）| 「盆栽を登録しました」|
| 保存成功（盆栽編集）| 「盆栽を更新しました」|
| 保存成功（記録追加）| 「記録を追加しました」|
| 保存成功（記録編集）| 「記録を更新しました」|
| 破棄確認 タイトル | 「変更を破棄しますか？」|
| 破棄確認 本文 | 「保存されていない変更は失われます。」|
| 破棄確認（続ける）| 「編集を続ける」|
| 破棄確認（破棄）| 「破棄する」|

---

## 10. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| BonsaiCard | `accessibilityRole="button"` / `accessibilityLabel="[盆栽名]の詳細を見る"` / タップターゲット最小 88pt |
| FAB | `accessibilityRole="button"` / `accessibilityLabel="盆栽を登録する"` / 56pt |
| GrowthRecordItem 3点メニュー | `accessibilityLabel="記録のメニューを開く"` |
| フォーム必須フィールド | `accessibilityLabel` に「（必須）」を含める |
| 削除ボタン | `accessibilityLabel="削除する（取り消せません）"` |
| 画像グリッド各画像 | `accessibilityLabel="{N}枚目の記録画像"` |

---

## 11. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-composer.md` §8（ImageAttachmentGrid）| 成長記録フォームの画像選択に流用する |
| `profile-edit.md` §7.5（BirthdayField）| 盆栽の取得日・記録日の入力にテキスト方式を流用する |
| `auth-forms.md`（AuthTextField / FormErrorMessage）| 盆栽フォームの各入力フィールドに流用する |
| `navigation-structure.md` §5.1（モーダルヘッダー）| 盆栽フォーム・記録フォームのモーダルヘッダーを踏襲する |
| `navigation-structure.md` §5.2（破棄確認）| 変更がある場合の破棄確認を踏襲する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| FAB デザイン（`post-composer.md` 参照のフィード FAB）| 直径 56pt / `colorActionPrimary` / `shadowWashi` を踏襲する |

---

## 12. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| 成長記録の画像上限枚数 | API のバリデーション上限を確認する | core に要確認 |
| `acquiredAt` フィールドの型 | ISO 8601 文字列か Date 型かを確認する | core に要確認 |
| 記録内容（content）の文字数上限 | サーバー側の Zod バリデーション値を確認する（本仕様では 1000 文字と仮定）| core に要確認 |
| アイキャッチ画像の有無 | 盆栽エンティティにアイキャッチ画像フィールドが存在するか確認する | core に要確認 |
| `more-menu.md` の「マイ盆栽」遷移先 | ネイティブ画面実装後に `openBrowserAsync` → `router.push(routes.bonsai)` に切り替えるタイミング | frontend |
