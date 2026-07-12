# マイ盆栽画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
最終改訂: 2026-07-13（実装 `app/bonsai/**` および `components/common/DatePickerField.tsx` / `components/common/DateTimeField.tsx` / `components/bonsai/TreeSpeciesField.tsx` の確認結果に基づき §4・§5 を全面改訂し、§6 に手入れログ画面（`bonsai/care-logs`）を新規追加した。旧仕様の「日付・樹種はテキスト入力方式（`datetimepicker` 未導入のため）」という前提は誤りで、両コンポーネントは既に実装・導入済みである。あわせて盆栽フォームに「アイキャッチ画像選択」フィールドは実装上存在しない（一覧のサムネイルは最新の成長記録画像を使う）ことが判明したため該当記述を削除した。旧 §6〜§12 は §7〜§13 へ繰り下げた）
対象画面:
- `bonsai/index` — 盆栽一覧
- `bonsai/new` — 盆栽登録フォーム
- `bonsai/[id]/index` — 盆栽詳細（成長記録タイムライン含む）
- `bonsai/[id]/edit` — 盆栽編集フォーム
- `bonsai/[id]/records/new` — 成長記録追加フォーム
- `bonsai/[id]/records/[recordId]/edit` — 成長記録編集フォーム
- `bonsai/care-logs` — 手入れログ一覧・作成・編集（§6。2026-07-13 追加文書化）

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `post-composer.md` §8 の ImageAttachmentGrid・画像選択フローを流用する
- 日付のみの入力は `components/common/DatePickerField.tsx`、日付+時刻の入力は `components/common/DateTimeField.tsx` を使用する（§4.3 参照。旧仕様のテキスト入力方式は撤回済み）
- 樹種の選択は `components/bonsai/TreeSpeciesField.tsx`（グループ付きモーダル選択）を使用する（§4.4 参照）

---

## 1. 概要・目的

自分が管理する盆栽の一覧・詳細・作成・編集と、各盆栽の成長記録（テキスト・画像・日付）の CRUD、および盆栽に紐づかないユーザー単位の手入れログ（水やり・肥料・農薬等の作業記録）の CRUD を提供する画面群。
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
│ [ヘッダー（独自実装 / Expo Router ネイティブヘッダーは不使用）] │
│   左: 「‹ 戻る」                                             │
│   中央: 「マイ盆栽」                                         │
│   右: 「手入れログ」（テキストボタン / textSm / colorTextSecondary）│
│        → `bonsai/care-logs`（§6）へ遷移                     │
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
│   bottom: セーフエリア下端 + spacing4                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**（2026-07-13 修正）:** 旧仕様はヘッダー右側を「なし」としていたが、実装 `app/bonsai/index.tsx` の `BonsaiHeader` は右側に「手入れログ」テキストボタン（`routes.ts` の `ROUTE_BONSAI_CARE_LOGS` へ `router.push`）を持つ。§6（手入れログ画面）の追加にともない反映した。

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

サムネイルは盆栽エンティティ自体の画像フィールドではなく、`latestRecord.thumbnailUrl`（直近の成長記録に添付された画像）を使う。盆栽そのものにアイキャッチ画像を単独設定する手段は盆栽フォーム（§4）に存在しない（詳細は §4.2 参照）。

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

> **本改訂の対象外の注記:** §3（詳細画面）は今回の調査で個別のコンポーネント実装ファイルまで再検証していない。§4・§5・§6 の変更点に直接関連する箇所（取得日の表示・アイキャッチ画像の扱い）のみ §2.2 の注記で補足した。詳細画面本体のワイヤーフレームは 2026-06-22 版のまま保持する。

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

> **改訂注記（2026-07-13）:** 旧仕様にあった「アイキャッチ画像選択」フィールドは実装 `app/bonsai/new/index.tsx` / `app/bonsai/[id]/edit/index.tsx` に存在しない。盆栽フォームは画像を一切扱わず、テキスト系フィールド（盆栽名・樹種・取得日・説明）のみで構成される。一覧のサムネイルは §2.2 の通り最新の成長記録画像を使う。

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
│   paddingBottom: spacing6 + セーフエリア下端                 │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [盆栽名（必須）]                                           │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 例: 五葉松（placeholder）                0/100      │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [樹種（任意）— TreeSpeciesField（トリガー→モーダル）]      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 樹種を選択                                      ▼   │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [取得日（任意）— DatePickerField（日付のみ）]              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 日付を選択                              [カレンダー] │   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 選択済みの場合のみ右に [✕ 削除] ボタンが並ぶ             │
│                                                             │
│   [説明（任意）]                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 盆栽のエピソードや特徴など...                        │   │
│   │                                          0/2000     │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [セーフエリア下端]                                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| 盆栽名（name）| 1行テキスト | 必須 | 100文字 | 独自 `TextInput` / 文字数カウンタ右下表示 |
| 樹種（species）| `TreeSpeciesField`（トリガー→グループ付きモーダル選択・単一選択）| 任意 | — | 自由入力不可。§4.4 参照 |
| 取得日（acquiredAt）| `DatePickerField`（日付のみ）| 任意 | — | §4.3 参照。日付範囲の制限なし（`minimumDate`/`maximumDate` 指定なし）|
| 説明（description）| 複数行テキスト | 任意 | **2000文字**（`MAX_BONSAI_DESCRIPTION_LENGTH`）| 文字数カウンタ。旧仕様は 500 文字だったが実装は 2000 文字 |

**（2026-07-13 是正）:** 説明の文字数上限は旧仕様の 500 文字から **2000 文字** へ修正した（`lib/constants/limits/bonsai.ts` の `MAX_BONSAI_DESCRIPTION_LENGTH`。サーバーは成長記録本文にも同じ定数を流用しているため §5.2 の記録内容上限もあわせて 2000 文字である）。

アイキャッチ画像フィールドは存在しない（§4.1 改訂注記を参照）。

### 4.3 日付入力方式（DatePickerField・ネイティブ日時ピッカー）

> **改訂注記（2026-07-13）:** 旧仕様は「`profile-edit.md` §7.5 BirthdayField と同じテキスト入力方式（`datetimepicker` ライブラリ未導入のため）」としていたが、これは誤りだった。`@react-native-community/datetimepicker` は既に導入済みで、取得日は共通コンポーネント `components/common/DatePickerField.tsx` を使うネイティブの日付ピッカーである。

- **Android:** フィールドタップ → `DateTimePickerAndroid.open({ mode: 'date' })` の**ネイティブダイアログ**が単体で開く（時刻は扱わないため連鎖しない）
- **iOS:** フィールドタップ → フィールド直下に `RNDateTimePicker`（`display="spinner"`）が**インライン展開**し、「完了」ボタンで閉じる
- 表示形式: 選択済みは「{YYYY}年{M}月{D}日」（`date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })`）
- 未設定時のプレースホルダー: 「日付を選択」（`DatePickerField` のデフォルト値。カスタム placeholder は渡していない）
- 右端に `calendar-outline` アイコン（18pt / `colorTextSecondary`）を表示
- 選択済みの場合のみ、フィールドの右に `close-circle` アイコンの削除ボタン（`hitSlop` で 44pt 確保）が並ぶ。`accessibilityLabel`: 「取得日を削除」（`clearAccessibilityLabel` で明示的に上書き）
- 値は `"YYYY-MM-DD"` のタイムゾーンに依存しないカレンダー日付文字列として保持し、送信時に `new Date(dateOnly).toISOString()` で ISO 8601 日時文字列へ変換してサーバーへ送る

**（2026-07-13 解決）:** 旧 §12 未確定事項にあった「`acquiredAt` のフィールド名と型（ISO 8601 文字列か Date か）」は実装で確認済み。クライアント→サーバー送信時は ISO 8601 日時文字列（UTC 深夜として解釈される日付のみの変換）。

### 4.4 樹種選択（TreeSpeciesField）

> **改訂注記（2026-07-13）:** 旧仕様は「樹種は 1 行テキストの自由入力」だったが、実装は `components/bonsai/TreeSpeciesField.tsx` によるグループ付きモーダルの単一選択であり、自由入力は提供しない（サーバー側は `species` を自由入力欄として受け付けるが、クライアント UI は統制入力のみを提供する）。

- トリガーボタン: 高さ 48pt / ボーダー `colorBorder` 1pt / 角丸 `radiusMd`。未選択時は「樹種を選択」（`colorTextTertiary`）、選択済みは選択した樹種名を表示
- タップ → 画面下からスライドアップするモーダル（`SectionList`。タイトル「樹種を選択」+ 閉じるボタン）
- グループ構成（`TREE_SPECIES_GROUPS`）: 「松柏類」「雑木類」「草もの」の 3 グループ見出し（`stickySectionHeadersEnabled`）。各グループ内に樹種名の行が並ぶ（例: 松柏類 → 黒松・赤松・五葉松・真柏 等）
- 各行: `accessibilityRole="radio"` / タップで即選択してモーダルを閉じる（決定ボタンなし）。選択中の行にはチェックマーク（`colorActionPrimary`）を表示
- 閉じる手段: 背景スクリムタップ / ヘッダーの `×` ボタン / Android バック・iOS スワイプダウン
- 削除（未選択に戻す）ための明示的な `✕` ボタンは持たない（DatePickerField・LocationField と異なる。再度モーダルを開いて別の樹種を選び直す運用）

### 4.5 保存ボタンの活性条件

- 盆栽名が 1文字以上 100文字以内
- 保存処理中でない
- 編集時: 初期値（`name` / `species` / `acquiredAt` / `description`）からいずれかが変更されている（新規作成時にこの条件はない）

### 4.6 ナビゲーション

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
│   [記録日（任意）— DatePickerField（日付のみ）]              │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 日付を選択                              [カレンダー] │   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 空の場合は保存時の現在日時を使用                         │
│                                                             │
│   [記録内容（任意）]                                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 今日は植え替えを行いました...                        │   │
│   │                                        0/2000       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [画像（最大4枚）— ImageAttachmentGrid]                     │
│   ┌──────┐ ┌──────┐ ┌──────┐ [+ 追加]                    │
│   │ 画像 │ │ 画像 │ │ 画像 │                               │
│   └──────┘ └──────┘ └──────┘                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| 記録日（recordAt）| `DatePickerField`（日付のみ。§4.3 と同一コンポーネント）| 任意 | — | 空の場合は保存時の現在日時（`new Date().toISOString()`）を使用。日付範囲の制限なし |
| 記録内容（content）| 複数行テキスト | 任意 | **2000文字**（`MAX_BONSAI_DESCRIPTION_LENGTH` を流用）| content と images のどちらか一方は必要。旧仕様は 1000 文字だったが実装は 2000 文字 |
| 画像（images）| `ImageAttachmentGrid`（`post-composer.md` §8 流用）| 任意 | **4枚**（`MAX_BONSAI_RECORD_IMAGES` / 画面ローカル定数 `RECORD_IMAGES_MAX`）| 上限枚数は解決済み（旧 未確定事項を参照） |

**（2026-07-13 是正）:** 記録内容の文字数上限は旧仕様の 1000 文字から **2000 文字** へ修正（盆栽説明と同じ `MAX_BONSAI_DESCRIPTION_LENGTH` をサーバーが流用しているため）。画像上限枚数は旧仕様で「core に要確認」だったが **4 枚**で確定済み。

**保存条件:** content（1文字以上）または images（1枚以上）のどちらかが入力されていること（`hasInput`）。編集時も同条件で、初期値からの変更有無（isDirty）は保存ボタンの活性条件に含まれない（盆栽本体フォーム §4.5 とは異なる）。

### 5.3 編集時の初期値表示

成長記録編集フォーム（`bonsai/[id]/records/[recordId]/edit`）は、画面マウント時に対象記録の既存データを初期値としてフォームへ展開する:

| 初期値項目 | 展開元 | 備考 |
|-----------|--------|------|
| 記録内容 | `record.content ?? ''` | テキストエリアにそのまま表示 |
| 記録日 | `record.recordAt` を `"YYYY-MM-DD"` に変換して `DatePickerField` へ渡す | ISO 8601 日時文字列の先頭 10 文字を切り出す（UTC 深夜保存規約のためタイムゾーン変換不要） |
| 画像 | `record.images.map(img => ({ uri: img.url, localId: img.url }))` | 既存画像は `http(s)://` URL のまま `ImageAttachmentGrid` に渡す。保存時に既存画像（`http` で始まる URI）は再アップロードせずそのまま送信し、ローカル URI のみ新規アップロードする |

**取得元データがまだキャッシュにない場合:** 記録の単体取得 API が存在しないため、一覧クエリ（`useBonsaiRecordsQuery`）のキャッシュ済みページから対象記録を探し、見つかるかページが尽きるまで次ページを自動取得する（`ScreenLoading` を表示）。取得に失敗、または全ページを見ても対象記録が見つからない場合は `ScreenError`（title: 「読み込めませんでした」/ onRetry: 再取得）を表示する。

### 5.4 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示 |
| 遷移元（新規）| `bonsai/[id]` の「+ 追加」テキストリンクタップ |
| 遷移元（編集）| `GrowthRecordItem` の 3点メニュー「編集する」|
| 遷移先（成功）| モーダルを閉じて `bonsai/[id]` に戻る |

---

## 6. 手入れログ画面（`bonsai/care-logs`）

> **新規追加（2026-07-13）。** 実装 `app/bonsai/care-logs/index.tsx` / `lib/queries/bonsai-care-logs.ts` に基づき本節を新規に文書化した。手入れログは特定の盆栽に紐づかず、**ユーザー単位**で水やり・肥料・農薬などの作業記録を管理する機能。旧 2026-06-22 版の本書には一切記載がなかった。

### 6.1 概要

- エンドポイント: `/api/v1/bonsai/care-logs`（盆栽 ID を含まない。個別の盆栽ではなくユーザー全体の作業ログ）
- 一覧・作成・編集・削除の CRUD を 1 画面（`bonsai/care-logs/index`）に集約する。作成・編集フォームは別ルートではなく、同一画面内の React Native `Modal`（`presentationStyle="pageSheet"`）として実装される点が §4・§5 のフォーム（別ルート + `presentation: "modal"`）と異なる

### 6.2 ナビゲーション

| 項目 | 内容 |
|------|------|
| ルート | `bonsai/care-logs`（`app/_layout.tsx` に `Stack.Screen name="bonsai/care-logs/index"` として登録。`headerShown: false` / **`presentation: "modal"` は指定されていない**通常のスタック push）|
| 遷移元 | `bonsai/index` ヘッダー右の「手入れログ」テキストボタン（§2.1）|
| 遷移先（戻る）| ヘッダー左の「‹ 戻る」ボタンで `bonsai/index` へ戻る |
| 作成・編集フォーム | 同一画面内の `Modal`（ページシート）。独立したルートではない |

### 6.3 画面構成（一覧）

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [ヘッダー（独自実装）]                                        │
│   左: 「‹ 戻る」  中央: 「手入れログ」  右: なし              │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   [CareLogRow × N]                                          │
│   ↓ pull-to-refresh / 末尾で次ページ取得                    │
│                                                             │
│ [FAB「+」]（手入れを記録する）                                │
│   右下固定 / 直径 56pt / colorActionPrimary                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 6.4 CareLogRow レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [種別バッジ]   {日付（YYYY年M月D日）}                        │  [🗑 削除ボタン 44pt]
│               {メモ（任意・最大2行）}                        │
└─────────────────────────────────────────────────────────────┘
```

- カード背景: `colorSurface` / 角丸 `radiusLg` / `shadowWashi`
- 種別バッジ: `colorSurfaceMuted` 背景 / `radiusMd` / 最小幅 72pt / 中央揃え
- 行全体タップ → 編集モーダルを開く（`accessibilityLabel`: 「{種別} {日付}を編集」）
- 削除ボタン（ゴミ箱アイコン）→ 確認ダイアログ（`accessibilityLabel`: 「{種別} {日付}を削除」）

### 6.5 作成・編集モーダル（CareLogFormModal）

```
┌─────────────────────────────────────────────────────────────┐
│ [キャンセル]     手入れを記録 / 手入れログを編集    [記録/更新]│
│                                                             │
│ [種別（横スクロールチップ）]                                  │
│ [農薬*] [固形肥料] [液体肥料] [向き替え] [遮光] [室入れ]      │
│ [室出し] [その他]                                            │
│                                                             │
│ [実施日 ＊ — DateTimeField（日付+時刻）]                     │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 日時を選択                              [カレンダー] │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [メモ（任意）]                                    {N}/500  │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ 手入れの詳細を記録できます                            │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

`*` = 新規作成時の既定選択。

### 6.6 種別セレクタ（CareTypeSelector）

| 種別（type 値） | 日本語ラベル | 新規作成時の既定値 |
|----------------|------------|:---:|
| `pesticide` | 農薬 | **✓（既定）** |
| `solid_fertilizer` | 固形肥料 | |
| `liquid_fertilizer` | 液体肥料 | |
| `rotate` | 向き替え | |
| `shading` | 遮光 | |
| `muro_in` | 室入れ | |
| `muro_out` | 室出し | |
| `other` | その他 | |

- 横スクロールのチップ列（`accessibilityRole="radio"`）。選択中は `colorActionPrimary` 背景 / `colorActionPrimaryText`、非選択は `colorSurface` 背景 / `colorBorderLight` ボーダー
- **新規作成時は `pesticide`（農薬）が既定で選択された状態でモーダルが開く**（`buildInitialForm()` が `type: BONSAI_CARE_TYPE.PESTICIDE` を初期値に設定）。ユーザーが他の種別に切り替えなければそのまま「農薬」として記録される
- 編集時は対象ログの既存 `type` を初期選択する

### 6.7 実施日入力（DateTimeField・日付+時刻）

- 共通コンポーネント `components/common/DateTimeField.tsx` を使用する（§4.3 の `DatePickerField` とは別コンポーネント。日付だけでなく時刻も選択する）
- **Android:** フィールドタップ → 日付ダイアログ（`DateTimePickerAndroid` `mode: 'date'`）が開く → 「設定」で確定すると**連鎖して時刻ダイアログ（`mode: 'time'`・24時間表記）が自動的に開く**。両方確定すると ISO 8601 日時文字列が確定する
- **iOS:** フィールドタップ → フィールド直下に `RNDateTimePicker`（`display="spinner"` / `mode="datetime"`）が**インライン展開**し、日付と時刻を 1 ステップで選べる。「完了」で閉じる
- ラベル: 「実施日 ＊」（必須）
- `maximumDate`: 翌日 23:59:59.999（`buildPerformedAtMaximum()`。サーバーの「未来日 +1 日トレランス」バリデーションと一致させるための上限）。`minimumDate` は指定なし
- 新規作成時の初期値: `new Date().toISOString()`（現在日時が入った状態でモーダルが開く。空欄ではない）
- 表示形式: 「{YYYY}年{M}月{D}日 {HH}:{MM}」（24時間表記）

### 6.8 メモ入力（note）

- ラベル: 「メモ（任意）」/ `placeholder`: 「手入れの詳細を記録できます」
- ソフト上限: `MAX_CARE_LOG_NOTE_LENGTH`（500文字）。ただし `TextInput` の `maxLength` 自体は `550`（500 + 50 のバッファ）に設定されており、500 文字を超えてから 550 文字までは入力を継続できるが、超過分がある間は赤色のカウンタ・ボーダー・インラインエラー「500文字以内で入力してください。」を表示して送信をブロックする（`isSubmittable` に反映）
- 文字数カウンタ: ラベル行の右側に「{N} / 500」

### 6.9 保存（記録・更新）ボタンの活性条件

`isSubmittable = form.performedAt !== null && !isNoteOverflow`

- 実施日（`performedAt`）が設定されている（新規作成時は現在日時が初期値のため通常は常に満たされる）
- メモが 500 文字を超えていない
- 種別（`type`）は常にいずれかが選択された状態のため、活性条件としては明示的にチェックしない

送信中は `ActivityIndicator` に置き換わる。ボタンラベルは新規「記録」/ 編集「更新」。

### 6.10 データの流れ

| 操作 | エンドポイント | invalidation |
|------|-------------|-------------|
| 一覧取得（無限スクロール） | `GET /api/v1/bonsai/care-logs?from=&to=&cursor=&limit=` | — |
| 作成 | `POST /api/v1/bonsai/care-logs` | `bonsai.all`（`queryKeys.bonsai.all` を丸ごと invalidate。`onSettled`）|
| 更新 | `PATCH /api/v1/bonsai/care-logs/{logId}` | `bonsai.all` |
| 削除 | `DELETE /api/v1/bonsai/care-logs/{logId}` | `bonsai.all` |

- 一覧は `from` / `to` の期間フィルタに対応する（半開区間 `[from, to)`。両方指定で 367 日超はサーバーが 400 を返す）。**本画面の UI には期間フィルタの入力欄は実装されていない**（クエリフックはパラメータを受け付けるが、`bonsai/care-logs/index.tsx` は常にパラメータなしで呼び出している）
- 認証必須・ゲストは 403（`GUEST_NOT_ALLOWED`）
- 所有者以外の更新・削除は 404（ID 列挙攻撃防止のため 403 ではなく 404 を返す）

### 6.11 エッジケース

| 状態 | 表示 |
|------|------|
| ローディング（初回） | `ScreenLoading`（`variant="skeleton"` / `skeletonCount=4`）|
| エラー（一覧取得失敗） | `ScreenError`（title: 「読み込めませんでした」/ description: `ERR_CARE_LOGS_LOAD_FAILED` / onRetry: refetch）|
| 空（0件） | `ScreenEmpty`（icon: `leaf-outline` / title: 「手入れログがありません」/ description: 「右下のボタンから手入れを記録しましょう」/ actionLabel: 「記録する」→ 作成モーダルを開く）|
| オフライン | `OfflineBanner` を表示。一覧はキャッシュ表示を維持。作成・更新・削除はブロックしない実装（**注記:** 他画面と異なりオフライン時の明示的な `ERR_OFFLINE_ACTION` ブロックはこの画面のコードに見当たらない。オフライン時の書き込みはネットワークエラーとして失敗しトースト表示になる想定。挙動の正式な整理は §6.13 の未確定事項を参照）|
| 作成・更新失敗 | トースト（`ERR_CARE_LOG_CREATE_FAILED` / `ERR_CARE_LOG_UPDATE_FAILED`）|
| 削除失敗 | トースト（`ERR_CARE_LOG_DELETE_FAILED`）|
| 削除確認ダイアログ | タイトル「手入れログを削除」/ 本文「{種別}（{日付}）を削除しますか？」/ ボタン [キャンセル] [削除（`colorError` / `style: 'destructive'`）] |

### 6.12 コピー・アクセシビリティ抜粋

| 箇所 | 文言 |
|------|------|
| ヘッダータイトル | 「手入れログ」|
| 一覧ヘッダー右ボタン（`bonsai/index` 側） | 「手入れログ」（`accessibilityLabel="手入れログを見る"`）|
| FAB accessibilityLabel | 「手入れを記録する」|
| 空状態見出し | 「手入れログがありません」|
| 空状態補足 | 「右下のボタンから手入れを記録しましょう」|
| 空状態アクション | 「記録する」|
| モーダルタイトル（新規） | 「手入れを記録」|
| モーダルタイトル（編集） | 「手入れログを編集」|
| 送信ボタン（新規/編集） | 「記録」/ 「更新」|
| 種別ラベル | 「種別」|
| 実施日ラベル | 「実施日 ＊」|
| メモラベル | 「メモ（任意）」|
| メモ placeholder | 「手入れの詳細を記録できます」|
| メモ超過エラー | 「500文字以内で入力してください。」|
| 削除確認タイトル | 「手入れログを削除」|

### 6.13 未確定事項（本節固有）

| 項目 | 内容 | 判断者 |
|------|------|--------|
| オフライン時の書き込みブロック | 他の盆栽フォーム（§4・§5）は送信時に `useOnlineStatus` を見て `ERR_OFFLINE_ACTION` で明示的にブロックするが、手入れログ画面のコードにその分岐が見当たらない。挙動を統一するか、意図的な差異かを確認する | frontend / PM（要確認）|
| 期間フィルタ UI | クエリ層は `from`/`to` に対応済みだが、一覧画面に期間絞り込みの UI は実装されていない。追加するかはスコープ判断 | PM（要判断）|

---

## 7. コンポーネント分割

```
BonsaiScreen (index)
├── BonsaiHeader                ← 独自ヘッダー（‹戻る / タイトル / 「手入れログ」リンク）
├── BonsaiList                  ← FlatList ラッパー
│   └── BonsaiCard              ← 各盆栽カード
├── BonsaiFAB                   ← 新規登録 FAB
├── ScreenLoading                ← common-states.md 流用
├── ScreenEmpty                  ← common-states.md 流用
├── ScreenError                  ← common-states.md 流用
└── OfflineBanner                ← common-states.md 流用

BonsaiDetailScreen ([id])
├── BonsaiInfoSection           ← 基本情報（名前・樹種・取得日・説明・画像）
├── GrowthRecordTimeline        ← タイムラインコンテナ（FlatList）
│   └── GrowthRecordItem        ← 各記録
│       └── RecordImageGrid     ← 記録画像グリッド
└── DeleteConfirmDialog         ← 削除確認（盆栽 / 記録 共用）

BonsaiFormScreen (new / edit)
├── BonsaiFormHeader            ← モーダルヘッダー
├── TextInput（盆栽名）
├── TreeSpeciesField            ← 樹種選択（§4.4）
├── DatePickerField             ← 取得日選択（§4.3）
├── TextInput（説明）
└── FormErrorMessage            ← auth-forms.md 流用

GrowthRecordFormScreen (records/new / records/edit)
├── RecordFormHeader            ← モーダルヘッダー
├── DatePickerField             ← 記録日選択（§4.3 と同一コンポーネント）
├── TextInput（記録内容）
├── ImageAttachmentGrid         ← post-composer.md §8 流用
└── FormErrorMessage            ← auth-forms.md 流用

CareLogsScreen (care-logs)      ← §6
├── CareLogsHeader              ← 独自ヘッダー（‹戻る / タイトル）
├── FlatList
│   └── CareLogRow              ← 各手入れログ行
├── FAB
├── CareLogFormModal            ← 作成・編集（React Native Modal・pageSheet）
│   ├── CareTypeSelector        ← 種別チップ（既定値: 農薬）
│   ├── DateTimeField           ← 実施日（日付+時刻。§6.7）
│   └── TextInput（メモ）
└── （common-states.md コンポーネント群）
```

---

## 8. データの流れ

### 8.1 盆栽一覧

- `GET /api/v1/bonsai` カーソルベース / レスポンスに `latestRecord` と `recordCount` を含む
- `useInfiniteQuery`（`queryKeys.bonsai.list` 相当）

### 8.2 盆栽詳細

- `GET /api/v1/bonsai/{id}` — 基本情報取得
- `GET /api/v1/bonsai/{id}/records` — 成長記録一覧（カーソルベース・新しい順）

### 8.3 盆栽の CRUD

| 操作 | エンドポイント | invalidation |
|------|-------------|-------------|
| 作成 | `POST /api/v1/bonsai` | `bonsai.list` |
| 更新 | `PATCH /api/v1/bonsai/{id}` | `bonsai.detail(id)` / `bonsai.list` |
| 削除 | `DELETE /api/v1/bonsai/{id}` | `bonsai.list` → 一覧に戻る |

### 8.4 成長記録の CRUD

| 操作 | エンドポイント | invalidation |
|------|-------------|-------------|
| 作成 | `POST /api/v1/bonsai/{id}/records` | `bonsai.records(id)` / `bonsai.detail(id)` / `bonsai.list` |
| 更新 | `PATCH /api/v1/bonsai/{id}/records/{recordId}` | `bonsai.records(id)` / `bonsai.detail(id)` |
| 削除 | `DELETE /api/v1/bonsai/{id}/records/{recordId}` | `bonsai.records(id)` / `bonsai.detail(id)` / `bonsai.list` |

**画像アップロード:** `post-composer.md` §5.3 の presigned URL → R2 直接 PUT フローを使う。

### 8.5 手入れログの CRUD

§6.10 を参照（盆栽 ID に紐づかないユーザー単位のログのため本節とは別エンドポイント）。

---

## 9. エッジケース

### 9.1 各画面のローディング

| 画面 | ローディング表示 |
|------|--------------|
| 盆栽一覧 | `ScreenLoading`（variant="skeleton" / BonsaiCardSkeleton × 3）|
| 盆栽詳細 | `ScreenLoading`（variant="spinner"）|
| 成長記録追加読み込み | タイムラインフッターのスピナー |
| フォーム（編集時）| `ScreenLoading`（variant="spinner"）|
| 手入れログ一覧 | §6.11 参照 |

### 9.2 空状態

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

**手入れログ（0件）:** §6.11 参照。

### 9.3 エラー

| エラー種別 | 表示箇所 |
|-----------|---------|
| 一覧取得失敗 | `ScreenError`（onRetry: refetch）|
| 詳細取得失敗 | `ScreenError`（title: 「読み込めませんでした」）|
| 404（盆栽が存在しない）| `ScreenError`（title: 「盆栽が見つかりません」）|
| 作成 / 更新 / 削除失敗 | `FormErrorMessage` または エラートースト |
| ネットワークエラー | `ScreenError`（ERR_NETWORK）|
| 5xx | `ScreenError`（ERR_SERVER）|

### 9.4 オフライン

- `OfflineBanner` を各画面上部に表示
- 一覧・詳細はキャッシュ表示を維持
- 盆栽フォーム（§4）・成長記録フォーム（§5）の CRUD 操作はオフライン時にブロックし `FormErrorMessage` に `ERR_OFFLINE_ACTION` を表示
- 手入れログ画面（§6）のオフライン時挙動は §6.13 の未確定事項を参照

---

## 10. コピー案

| 箇所 | 文言 |
|------|------|
| 一覧ヘッダー | 「マイ盆栽」|
| 一覧ヘッダー右ボタン | 「手入れログ」|
| FAB accessibilityLabel | 「盆栽を登録する」|
| 新規フォームヘッダー | 「盆栽を登録」|
| 編集フォームヘッダー | 「盆栽を編集」|
| フォーム「盆栽名」ラベル | 「盆栽名 ＊」|
| フォーム「樹種」トリガー（未選択）| 「樹種を選択」|
| 樹種選択モーダルタイトル | 「樹種を選択」|
| フォーム「取得日」削除ボタン | `accessibilityLabel="取得日を削除"` |
| 取得日 placeholder | 「日付を選択」|
| フォーム「説明」ラベル | 「説明（任意）」|
| 新規記録フォームヘッダー | 「記録を追加」|
| 編集記録フォームヘッダー | 「記録を編集」|
| 記録「日付」削除ボタン | `accessibilityLabel="記録日を削除"` |
| 記録日 placeholder | 「日付を選択」|
| 記録「内容」ラベル | 「記録内容（任意）」|
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

手入れログ画面固有のコピーは §6.12 を参照。

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| BonsaiCard | `accessibilityRole="button"` / `accessibilityLabel="[盆栽名]の詳細を見る"` / タップターゲット最小 88pt |
| FAB | `accessibilityRole="button"` / `accessibilityLabel="盆栽を登録する"` / 56pt |
| GrowthRecordItem 3点メニュー | `accessibilityLabel="記録のメニューを開く"` |
| フォーム必須フィールド | `accessibilityLabel` に「（必須）」を含める |
| 削除ボタン | `accessibilityLabel="削除する（取り消せません）"` |
| 画像グリッド各画像 | `accessibilityLabel="{N}枚目の記録画像"` |
| DatePickerField（取得日・記録日） | `accessibilityRole="button"` / `accessibilityLabel="{ラベル}：{選択済み日付 または プレースホルダー}"`（例:「取得日（任意）：2020年1月1日」）|
| TreeSpeciesField トリガー | `accessibilityRole="button"` / `accessibilityLabel="樹種（任意）：{選択値 または 「樹種を選択」}"` |
| TreeSpeciesField 各行 | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 手入れログ関連 | §6.12 参照 |

---

## 12. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `post-composer.md` §8（ImageAttachmentGrid）| 成長記録フォームの画像選択に流用する |
| `components/common/DatePickerField.tsx` | 取得日（§4.3）・記録日（§5.2）で共用する。`profile-edit.md` の BirthdayField（誕生日）も同コンポーネントを内部でラップして使う（`profile-edit.md` §7.5 参照）|
| `components/common/DateTimeField.tsx` | 手入れログの実施日（§6.7）で使用する。`scheduled-posts.md` の公開日時・`events.md` の開催日時と同一コンポーネント |
| `components/bonsai/TreeSpeciesField.tsx` | 樹種選択（§4.4）専用。`profile-edit.md` の LocationField・`events.md` の EventPrefecturePickerModal と同系統の「トリガー→モーダル単一選択」パターンを踏襲する |
| `auth-forms.md`（FormErrorMessage）| 盆栽フォーム・記録フォームのフォーム全体エラー表示に流用する |
| `navigation-structure.md` §5.1（モーダルヘッダー）| 盆栽フォーム・記録フォームのモーダルヘッダーを踏襲する |
| `navigation-structure.md` §5.2（破棄確認）| 変更がある場合の破棄確認を踏襲する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| FAB デザイン（`bonsai/index` および `bonsai/care-logs`）| 直径 56pt / `colorActionPrimary` / `shadowWashi` を踏襲する |

---

## 13. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| 成長記録の画像上限枚数 | API のバリデーション上限を確認する | core | **解決済み（2026-07-13）**: 4 枚（`MAX_BONSAI_RECORD_IMAGES`）|
| `acquiredAt` フィールドの型 | ISO 8601 文字列か Date 型かを確認する | core | **解決済み（2026-07-13）**: ISO 8601 日時文字列。§4.3 参照 |
| 記録内容（content）の文字数上限 | サーバー側の Zod バリデーション値を確認する | core | **解決済み（2026-07-13）**: 2000 文字（`MAX_BONSAI_DESCRIPTION_LENGTH`）|
| アイキャッチ画像の有無 | 盆栽エンティティにアイキャッチ画像フィールドが存在するか確認する | core | **解決済み（2026-07-13）**: フォームに存在しない。一覧サムネイルは最新成長記録の画像を使う（§2.2 / §4.1）|
| `more-menu.md` の「マイ盆栽」遷移先 | ネイティブ画面実装後に `openBrowserAsync` → `router.push(routes.bonsai)` に切り替えるタイミング | frontend | 未解決 |
| 手入れログのオフライン時挙動 | §6.13 参照 | frontend / PM | 未解決（新規発見） |
| 手入れログの期間フィルタ UI | §6.13 参照 | PM | 未解決（新規発見） |
