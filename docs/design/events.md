# イベント画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
最終改訂: 2026-07-13（実装 `app/events/new/index.tsx` / `app/events/[id]/edit/index.tsx` / `components/events/EventPrefecturePickerModal.tsx` の確認結果に基づき §4 を全面改訂。都道府県をトリガー→モーダル選択の**必須**フィールドへ変更し、フリーテキストの「地域（region）」フィールドはフォームから削除、代わりに「市区町村（city）」「主催者（organizer）」を追加、「即売あり（hasSales）」スイッチを新設、開催日・終了日は `DateTimeField`（日付+時刻）へ変更した。あわせて各フィールドの文字数上限を実装値に是正した）
対象画面:
- `events/index` — イベント一覧
- `events/new` — イベント作成フォーム
- `events/[id]/index` — イベント詳細
- `events/[id]/edit` — イベント編集フォーム

前提:
- `design-tokens.md` §2.3 のトークン名を使用する（新規トークン追加禁止）
- `navigation-structure.md`（スタック・ナビゲーション構造）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `auth-forms.md`（AuthTextField・FormErrorMessage）を入力フィールドに流用する
- 開催日・終了日は `components/common/DateTimeField.tsx`（日付+時刻のネイティブピッカー）を使う（§4.3 参照）
- 都道府県は `components/events/EventPrefecturePickerModal.tsx`（47都道府県・単一選択・**必須**）を使う（§4.4 参照）
- 作成者のみ編集・削除を実行できる（`isCreator` フラグで判定）。非作成者・ログイン済みユーザーには通報導線を提供する（§3.4.2 / `ugc-safety.md` §2.6.1）
- `store-compliance.md`（通報・ブロック要件）を確認済み

---

## 1. 概要・目的

盆栽関連イベント（展示会・勉強会・即売会 等）の一覧表示・詳細閲覧・作成・編集・削除を提供する画面群。
地域・都道府県フィルタで絞り込みが可能。
作成者のみ編集・削除できる権限制御を UI で表現する。

---

## 2. イベント一覧画面（`events/index`）

### 2.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「イベント」                                         │
│   右: なし                                                  │
│                                                             │
│ [FilterBar（固定 / スクロール外）]                           │
│   高さ: 44pt / 背景: colorSurfaceWashi / 下端: 1pt colorBorderLight│
│                                                             │
│   [ScrollView horizontal（横スクロール）]                    │
│     paddingHorizontal: spacing4                             │
│     [地域チップ × N]（全国・関東・関西 等）                   │
│     [都道府県チップ × N]（地域選択後に追加表示）              │
│                                                             │
│ [FlatList（無限スクロール）]                                  │
│   contentContainerStyle: paddingHorizontal spacing4         │
│   paddingTop: spacing3 / paddingBottom: spacing24 + セーフ域 │
│                                                             │
│   [EventCard × N]                                           │
│   ↓ pull-to-refresh                                        │
│   ↓ 末尾で次ページ取得                                      │
│                                                             │
│ [FAB（イベント作成）]                                        │
│   右下固定 / + アイコン / 直径 56pt                          │
│   ログイン済みユーザーのみ表示                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **本改訂の対象外の注記:** 一覧画面のフィルタ（`components/events/EventsRegionFilterBar.tsx` 等）は今回の調査対象外。§4（イベントフォーム）の変更にともない、作成フォームの「地域」自由入力フィールドは削除されたが、一覧の地域フィルタ UI 自体は本改訂で変更していない。

### 2.2 FilterBar チップ仕様

- チップの状態・スタイルは `post-composer.md` §7.2 の GenreSelector チップ仕様に準拠する
- 選択中: `colorActionPrimary` 背景 / `colorActionPrimaryText` テキスト
- 非選択: `colorActionSecondary` 背景 / `colorActionSecondaryText` テキスト
- 角丸: `radiusSm`（6pt）/ 高さ: 36pt / `hitSlop` で 44pt
- フィルタ変更時は FlatList をリセット（cursor を null に戻して再取得）

**フィルタパラメータ:**
- `region`: 地域（全国 / 北海道・東北 / 関東 / 中部・北陸 / 近畿 / 中国・四国 / 九州・沖縄）
- `prefecture`: 都道府県（地域を選択したときのみ表示。`region` の子要素）
- 両方未選択 = 「全国」（デフォルト）

**core に要確認:** `region` / `prefecture` の値の定義（文字列定数 or ID）をサーバー API の仕様で確認する。

### 2.3 EventCard レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [日付ブロック（左端 48pt 幅）]  [イベント名 textMd fontWeight:600]│
│ [月 textSm / colorTextSecondary] [会場 textSm colorTextSecondary]│
│ [日 textXl fontWeight:700]      [都道府県 textXs colorTextTertiary]│
│ [曜日 textXs colorTextTertiary] [入場料 textSm colorTextSecondary]│
└─────────────────────────────────────────────────────────────┘
```

詳細:
- 高さ: 最小 72pt（`paddingVertical: spacing3`）
- `paddingHorizontal: spacing4`
- 下端区切り: `1pt solid colorBorderLight`
- 背景: `colorSurface`（`#fcfcfc`）/ 角丸: `radiusLg` / `shadowWashi`
- 日付ブロック: 左端に区切り `2pt solid colorActionPrimary` / 縦線スタイル
- 右端: ChevronRight / `colorTextTertiary`
- カード全体タップ → `events/[id]`
- `accessibilityRole`: `"button"` / `accessibilityLabel`: 「{イベント名}の詳細を見る」

---

## 3. イベント詳細画面（`events/[id]/index`）

### 3.1 画面構成

```
┌─────────────────────────────────────────────────────────────┐
│ [セーフエリア上端]                                            │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「イベント詳細」                                     │
│   右: 「⋮」（3点メニュー。内容は閲覧者により異なる。§3.4）  │
│                                                             │
│ [ScrollView]                                                │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8 + セーフエリア下端                 │
│                                                             │
│   [EventDetailHeader]                                       │
│     [イベント名 textXl fontWeight:700 paddingTop spacing4]   │
│                                                             │
│   [EventDetailInfoSection]                                  │
│   ─────────────────────────────────────────────── (spacing3)│
│   [CalendarアイコンRow] [開催日時]                           │
│   [MapPinアイコンRow]   [会場名]                            │
│   [MapPinアイコンRow]   [都道府県 / 市区町村]                │
│   [TicketアイコンRow]   [入場料（「無料」or 金額）]          │
│   [PeopleアイコンRow]   [主催者]（設定時のみ）                │
│   [TagアイコンRow]      [即売あり]（`hasSales=true` の場合のみ）│
│   [UserアイコンRow]     [主催者 {nickname}（タップで users/[id]）]│
│   ─────────────────────────────────────────────── (spacing3)│
│                                                             │
│   [説明テキスト（textBase paddingTop spacing2）]             │
│                                                             │
│   [外部URLセクション（urlがある場合のみ）]                    │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ [LinkアイコンRow] 詳細ページを見る ↗                  │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **本改訂の対象外の注記:** 詳細画面のレイアウトは 2026-06-22 版のワイヤーフレームを保持しつつ、§4 のフォームで追加された「主催者」「即売あり」の 2 項目の表示行を暫定的に追記した（実装ファイル `app/events/[id]/index.tsx` 自体は今回未検証）。「主催者（organizer・作成者が入力した文字列）」と「主催者 {nickname}（投稿したユーザー・`creator`）」は別概念であるため、詳細画面での見出し文言の重複がないか frontend 実装時に確認すること。

> **追記（2026-07-13）:** ヘッダー「⋮」ボタンの表示条件を実装確認済みの内容に更新した（`app/events/[id]/index.tsx`）。非作成者かつログイン済みユーザーには通報導線（確認 Alert → `ReportDialog`）を表示する。詳細は §3.4 と `ugc-safety.md` §2.6.1・§7.1 を参照。

### 3.2 アイコン行の共通スタイル

```
高さ: 最小 44pt
flexDirection: row / alignItems: center
paddingVertical: spacing2
gap: spacing3

[アイコン 18pt / colorTextSecondary] [テキスト textBase / colorTextPrimary]
```

### 3.3 外部 URL リンク

- `expo-web-browser` の `openBrowserAsync` でアプリ内ブラウザを開く
- タップターゲット: 行全体で 44pt 以上
- `accessibilityLabel`: 「詳細ページを開く（外部リンク）」
- オフライン時: タップで `openBrowserAsync` を呼ぶが、ブラウザ側がエラーハンドリング

### 3.4 3点メニュー（表示は閲覧者により分岐）

| 閲覧者 | 表示 |
|--------|------|
| 作成者（`isCreator === true`） | 編集・削除メニュー（§3.4.1） |
| 非作成者・ログイン済み | 通報確認 Alert（§3.4.2） |
| 未ログイン | 「⋮」ボタン自体を非表示 |

#### 3.4.1 作成者メニュー

| 項目 | 動作 |
|------|------|
| 「編集する」| `events/[id]/edit` へ遷移（モーダル）|
| 「削除する」| 削除確認ダイアログ → `DELETE /api/v1/events/{id}` → `events/index` へ戻る |

削除確認ダイアログ:
```
タイトル: 「このイベントを削除しますか？」
本文: 「削除したイベントは復元できません。」
ボタン: [キャンセル] [削除する（colorError）]
```

#### 3.4.2 非作成者向け通報導線

非作成者・ログイン済みユーザーがヘッダー「⋮」をタップすると、確認 Alert（ネイティブ `Alert.alert`）を表示する。

```
タイトル: 「このイベントを通報しますか？」
ボタン: [通報する（destructive）] [キャンセル]
```

「通報する」で `ReportDialog`（`targetType: 'event'`）を開く。詳細な UI 仕様・エラーハンドリングは `ugc-safety.md` §2.6.1・§7 に委ねる。本仕様（events.md）では表示条件と Alert 文言のみを扱う。

---

## 4. イベントフォーム（`events/new` / `events/[id]/edit`）

### 4.1 全体レイアウト

> **改訂注記（2026-07-13）:** 実装 `app/events/new/index.tsx` に基づき全面改訂した。旧仕様との主な差分:
> 1. 都道府県（prefecture）が**フリーテキストから必須の単一選択ピッカー**（`EventPrefecturePickerModal`）に変わった
> 2. 旧仕様の「地域（region）」フリーテキストフィールドは**フォームから削除**された（一覧の地域フィルタとは独立。§2.1 の注記参照）
> 3. 「市区町村（city）」フィールドが新設された（都道府県より詳細な所在地）
> 4. 「主催者（organizer）」フィールドが新設された
> 5. 「即売あり（hasSales）」スイッチが新設された（「無料」チェックとは別のスイッチ）
> 6. 開催日・終了日は日付+時刻を**単一の `DateTimeField`** で選択する方式に変わった（テキスト入力方式ではない）

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「イベントを作成」または「イベントを編集」           │
│   右: 「投稿する」または「保存する」                         │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing6                                   │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [イベント名（必須）]                          0/100      │
│                                                             │
│   [開始日時 ＊ — DateTimeField（日付+時刻）]                 │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 日時を選択                              [カレンダー] │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [終了日時（任意）— DateTimeField]                          │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 日時を選択                              [カレンダー] │   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 開始日時より前は選択不可（minimumDate=開始日時）         │
│                                                             │
│   [都道府県 ＊ — トリガー→モーダル単一選択]                  │
│   ┌─────────────────────────────────────────────────────┐  ▼│
│   │ 都道府県を選択してください                            │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [市区町村（任意）]                                         │
│   [会場名（任意）]                                           │
│   [主催者（任意）]                                           │
│                                                             │
│   [入場料（任意）]                                           │
│   [無料 スイッチ] → OFF 時のみ [金額テキスト入力]            │
│                                                             │
│   [即売あり スイッチ]                                        │
│                                                             │
│   [説明（任意）]                                  0/5000   │
│   [詳細ページ URL（任意）]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| イベント名（title）| 1行テキスト | 必須 | **100文字**（`MAX_EVENT_TITLE_LENGTH`）| 独自 `TextInput` / 文字数カウンタ |
| 開始日時（startDate）| `DateTimeField`（日付+時刻）| 必須 | — | §4.3 参照。範囲制限なし |
| 終了日時（endDate）| `DateTimeField`（日付+時刻）| 任意 | — | `minimumDate` = 開始日時。開始日時以降のみ選択可 |
| 都道府県（prefecture）| `EventPrefecturePickerModal`（トリガー→47都道府県の単一選択）| **必須** | — | 自由入力不可。§4.4 参照 |
| 市区町村（city）| 1行テキスト | 任意 | 100文字（`MAX_EVENT_CITY_LENGTH`）| フリーテキスト（新設フィールド） |
| 会場名（venue）| 1行テキスト | 任意 | 200文字（`MAX_EVENT_VENUE_LENGTH`）| フリーテキスト |
| 主催者（organizer）| 1行テキスト | 任意 | 200文字（`MAX_EVENT_ORGANIZER_LENGTH`）| フリーテキスト（新設フィールド）|
| 入場料（admissionFee）| 「無料」スイッチ + 条件付きテキスト入力 | 任意 | 100文字（`MAX_EVENT_ADMISSION_FEE_LENGTH`）| 「無料」ON のとき文字列 `"無料"` を送信。OFF は自由記述（数値専用ではない。例:「500円」）|
| 即売あり（hasSales）| Switch | — | — | 新設フィールド。既定値 `false` |
| 説明（description）| 複数行テキスト | 任意 | **5000文字**（`MAX_EVENT_DESCRIPTION_LENGTH`）| 文字数カウンタ |
| 外部 URL（externalUrl）| URL テキスト | 任意 | 2000文字（`MAX_EVENT_EXTERNAL_URL_LENGTH`）| `keyboardType: "url"` / 形式チェック（`https://` または `http://` から始まるか）|

**（2026-07-13 是正）:** 旧仕様の文字数上限（タイトル200・説明2000・都道府県50・地域50・電話等）は実装値と異なっていたため全面的に実装値へ差し替えた。「地域（region）」フィールドは削除済み（§4.1 参照）。

### 4.3 日時入力方式（DateTimeField・開始/終了）

- 共通コンポーネント `components/common/DateTimeField.tsx`（`bonsai.md` §6.7・`scheduled-posts.md` §5.3 と同一）を使用する
- **Android:** フィールドタップ → 日付ダイアログ → 確定すると時刻ダイアログ（24時間表記）が連鎖して開く
- **iOS:** フィールドタップ → フィールド直下にインラインスピナー（`display="spinner"` / `mode="datetime"`）が展開し、日付と時刻を 1 ステップで選べる
- 開始日時: ラベル「開始日時 ＊」/ 範囲制限なし（`minimumDate`/`maximumDate` とも指定なし）
- 終了日時: ラベル「終了日時（任意）」/ `minimumDate` = 開始日時が設定されていればその値（未設定時は制限なし）。開始日時より前の終了日時を選ぶと、送信前チェックで「終了日時は開始日時以降にしてください。」のインラインエラーを表示する
- 削除ボタン（選択済みの場合のみ）: `accessibilityLabel="開始日時を削除"` / 「終了日時を削除」

### 4.4 都道府県選択（EventPrefecturePickerModal・必須）

- トリガーボタン: 高さ 48pt / ボーダー `colorBorder` 1pt / 角丸 `radiusMd`
- 未選択時のトリガーテキスト: 「都道府県を選択してください」（`colorTextTertiary`）/ `accessibilityLabel="都道府県（必須）"`
- 選択済み時: `accessibilityLabel="都道府県（必須）：{都道府県名}"`
- タップ → 画面下からスライドアップするモーダル（`FlatList`。タイトル「都道府県を選択」+ 閉じるボタン）。47都道府県をグループ分けせずフラットに一覧表示する（`components/profile/LocationField.tsx` の「都道府県」グループと同じ `PREFECTURES` 定数を使うが、こちらは「すべて」選択肢を持たないフォーム専用コンポーネント）
- 各行: `accessibilityRole="radio"` / タップで即選択してモーダルを閉じる
- **未選択のままでは送信できない**（`isPrefectureValid = prefecture !== null` が送信条件に含まれる。§4.5 参照）

### 4.5 保存ボタンの活性条件

> **改訂注記（2026-07-13）:** 都道府県必須化にともない `isPrefectureValid` を条件に追加した。

- タイトルが 1文字以上 100文字以内
- 開始日時が有効な値である
- 終了日時がある場合は開始日時以降の日時である
- **都道府県が選択されている**（`isPrefectureValid`）
- 外部 URL がある場合は `https://` または `http://` から始まる形式である
- 保存処理中でない

編集時に「初期値からの変更が必要か」は本改訂で未検証（旧仕様の記述をそのまま保持する）。

### 4.6 ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | モーダル表示（`presentation: "modal"`）|
| 遷移元（新規）| `events/index` の FAB タップ |
| 遷移元（編集）| `events/[id]` の 3点メニュー「編集する」（作成者のみ）|
| 遷移先（成功・新規）| モーダルを閉じ、`events/index` が invalidation で更新される |
| 遷移先（成功・編集）| モーダルを閉じ、`events/[id]` が invalidation で更新される |
| 遷移先（キャンセル）| 変更がある場合は破棄確認 → モーダルを閉じる |

---

## 5. ナビゲーション全体

| 画面 | ルート | 遷移元 | 遷移先 |
|------|--------|--------|--------|
| 一覧 | `events/index` | `(tabs)/more`「イベント」行 / ネイティブ遷移 | 各 `events/[id]` |
| 詳細 | `events/[id]/index` | `events/index` の EventCard タップ | — |
| 作成 | `events/new` | `events/index` の FAB タップ | 成功後: `events/index` に戻る |
| 編集 | `events/[id]/edit` | `events/[id]` の 3点メニュー | 成功後: `events/[id]` に戻る |

**iOS / Android 差異:** フォームはモーダル表示。iOS はスワイプダウンで閉じようとした場合に破棄確認を表示する。Android はハードウェアバックボタンで同様の確認を表示する。

**もっと見る画面との関係:** `more-menu.md` §3.2 の「イベント」を `openBrowserAsync` からネイティブ遷移（`router.push(routes.events)`）に切り替えることを frontend に申し送る。

---

## 6. コンポーネント分割

```
EventsScreen (index)
├── EventFilterBar              ← 地域 / 都道府県フィルタチップ群
├── EventList                   ← FlatList ラッパー
│   └── EventCard               ← 各イベントカード
├── EventsFAB                   ← 新規作成 FAB（認証済みのみ）
├── ScreenLoading                ← common-states.md 流用
├── ScreenEmpty                  ← common-states.md 流用
├── ScreenError                  ← common-states.md 流用
└── OfflineBanner                ← common-states.md 流用

EventDetailScreen ([id])
├── EventDetailHeader           ← イベント名
├── EventDetailInfoSection      ← 日時・会場・都道府県/市区町村・入場料・主催者・即売あり等の情報行
├── EventExternalLink           ← 外部 URL ボタン（URL があるときのみ）
├── DeleteConfirmDialog         ← 削除確認（作成者のみ。§3.4.1）
└── ReportDialog                ← 通報モーダル（非作成者・ログイン済みのみ。§3.4.2 / ugc-safety.md §2.6.1）

EventFormScreen (new / edit)
├── EventFormHeader             ← モーダルヘッダー（キャンセル / タイトル / 保存）
├── TextInput（イベント名）
├── DateTimeField × 2           ← 開始日時・終了日時（§4.3）
├── EventPrefecturePickerModal  ← 都道府県（トリガー + モーダル。§4.4。必須）
├── TextInput（市区町村・会場名・主催者）
├── Switch（無料）+ TextInput（入場料金額）
├── Switch（即売あり）
├── TextInput（説明・外部URL）
└── FormErrorMessage            ← auth-forms.md 流用
```

---

## 7. データの流れ

### 7.1 イベント一覧

- `GET /api/v1/events?region={region}&prefecture={prefecture}&cursor={cursor}`
- `useInfiniteQuery`（`queryKeys.events.list(filter)` 相当）

### 7.2 イベント詳細

- `GET /api/v1/events/{id}` — レスポンスに `creator`（`{ id, nickname, avatarUrl }`）を含む

### 7.3 イベントの CRUD

| 操作 | エンドポイント | 権限 | invalidation |
|------|-------------|------|-------------|
| 作成 | `POST /api/v1/events` | 認証済みユーザー | `events.list` |
| 更新 | `PATCH /api/v1/events/{id}` | 作成者のみ | `events.detail(id)` / `events.list` |
| 削除 | `DELETE /api/v1/events/{id}` | 作成者のみ | `events.list` → 一覧に戻る |

**作成リクエストボディ（実装確認済み）:** `{ title, startDate, endDate, prefecture, city, venue, organizer, admissionFee, hasSales, description, externalUrl }`。**`region` フィールドは送信しない**（§4.1 参照。一覧側のフィルタパラメータ `region` とは別物）。

**通報（非作成者向け）:** `POST /api/v1/reports`（`targetType: 'event'`）。詳細は `ugc-safety.md` §7 を参照。

---

## 8. エッジケース

### 8.1 ローディング

| 画面 | ローディング表示 |
|------|--------------|
| 一覧 | `ScreenLoading`（variant="skeleton" / EventCardSkeleton × 4）|
| 詳細 | `ScreenLoading`（variant="spinner"）|
| フォーム（編集）| `ScreenLoading`（variant="spinner"）|

### 8.2 空状態

**イベント一覧（0件）:**
```
アイコン: Calendar / colorTextSecondary
見出し: 「イベントがありません」
補足: 「このエリアでのイベントはまだ登録されていません。」
アクション: なし（フィルタが「全国」の場合）
```

フィルタ選択中の場合:
```
見出し: 「このエリアのイベントはありません」
補足: 「他のエリアを選択するか、全国に切り替えてみてください。」
アクション: 「全国に切り替える」ボタン
```

### 8.3 エラー

| エラー種別 | 表示箇所 |
|-----------|---------|
| 一覧取得失敗 | `ScreenError`（onRetry: refetch）|
| 詳細取得失敗 | `ScreenError`（title: 「読み込めませんでした」）|
| 404（イベントが存在しない）| `ScreenError`（title: 「イベントが見つかりません」）|
| 403（編集権限なし）| `ScreenError`（title: 「編集できません」/ description: 「このイベントを編集する権限がありません。」）|
| 作成 / 更新失敗 | `FormErrorMessage` |
| 削除失敗 | エラートースト「イベントを削除できませんでした。もう一度お試しください。」|
| ネットワークエラー | `ScreenError`（ERR_NETWORK）|
| 5xx | `ScreenError`（ERR_SERVER）|

### 8.4 権限なし（非作成者）

- 詳細画面の 3点メニューは非表示にはせず、通報導線（§3.4.2）に切り替える（`isCreator === false` の場合）
- URL から直接 `events/[id]/edit` に到達した場合: サーバーが 403 を返す → `ScreenError`

### 8.5 オフライン

- `OfflineBanner` を各画面上部に表示
- 一覧・詳細はキャッシュ表示を維持
- 作成 / 更新 / 削除はオフライン時にブロックし `FormErrorMessage` に `ERR_OFFLINE_ACTION` を表示

---

## 9. コピー案

| 箇所 | 文言 |
|------|------|
| 一覧ヘッダー | 「イベント」|
| 詳細ヘッダー | 「イベント詳細」|
| 新規フォームヘッダー | 「イベントを作成」|
| 編集フォームヘッダー | 「イベントを編集」|
| フォーム「投稿する」（新規）| 「投稿する」|
| フォーム「保存する」（編集）| 「保存する」|
| フォーム「タイトル」ラベル | 「イベント名 ＊」|
| フォーム「開始日時」ラベル | 「開始日時 ＊」|
| フォーム「終了日時」ラベル | 「終了日時（任意）」|
| 終了日時エラー | 「終了日時は開始日時以降にしてください。」|
| フォーム「都道府県」ラベル | 「都道府県 ＊」|
| 都道府県トリガー（未選択）| 「都道府県を選択してください」|
| 都道府県モーダルタイトル | 「都道府県を選択」|
| フォーム「市区町村」ラベル | 「市区町村（任意）」|
| フォーム「会場名」ラベル | 「会場名（任意）」|
| フォーム「主催者」ラベル | 「主催者（任意）」|
| フォーム「入場料」ラベル | 「入場料（任意）」|
| 入場料「無料」ラベル | 「無料」|
| 「即売あり」ラベル | 「即売あり」|
| フォーム「説明」ラベル | 「説明（任意）」|
| フォーム「外部 URL」ラベル | 「詳細ページ URL（任意）」|
| 外部 URL 形式エラー | 「URLは https:// または http:// から始めてください。」|
| 外部リンク行テキスト | 「詳細ページを見る」|
| FAB accessibilityLabel | 「イベントを作成する」|
| 一覧 空（全国）見出し | 「イベントがありません」|
| 一覧 空（全国）補足 | 「盆栽関連のイベントはまだ登録されていません。」|
| 一覧 空（フィルタあり）見出し | 「このエリアのイベントはありません」|
| 一覧 空（フィルタあり）補足 | 「他のエリアを選択するか、全国に切り替えてみてください。」|
| 一覧 空 アクション | 「全国に切り替える」|
| 削除確認 タイトル | 「このイベントを削除しますか？」|
| 削除確認 本文 | 「削除したイベントは復元できません。」|
| 削除確認 削除ボタン | 「削除する」|
| 削除成功トースト | 「イベントを削除しました」|
| 作成成功トースト | 「イベントを投稿しました」|
| 編集成功トースト | 「イベントを更新しました」|
| 破棄確認 タイトル | 「変更を破棄しますか？」|
| 破棄確認 本文 | 「保存されていない変更は失われます。」|
| 破棄確認（続ける）| 「編集を続ける」|
| 破棄確認（破棄）| 「破棄する」|
| 通報確認 Alert タイトル | 「このイベントを通報しますか？」（`ugc-safety.md` §2.6.1・§12.8 参照）|

---

## 10. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| EventCard | `accessibilityRole="button"` / `accessibilityLabel="{イベント名}の詳細を見る"` / 最小タップターゲット 72pt |
| FAB | `accessibilityRole="button"` / `accessibilityLabel="イベントを作成する"` / 56pt |
| フィルタチップ | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 外部リンク行 | `accessibilityRole="link"` / `accessibilityLabel="詳細ページを開く（外部リンク）"` |
| 3点メニュー | `accessibilityLabel="イベントのメニューを開く"`（作成者メニュー・通報 Alert のいずれの場合も同一文言。§3.4 参照） |
| 開始/終了日時 DateTimeField | `accessibilityRole="button"` / `accessibilityLabel="{ラベル}：{選択値 または プレースホルダー}"` |
| 都道府県トリガー | `accessibilityRole="button"` / `accessibilityLabel="都道府県（必須）"` または `"都道府県（必須）：{値}"` |
| 都道府県モーダル各行 | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 入場料 Switch | `accessibilityRole="switch"` / `accessibilityLabel="無料イベント"` |
| 即売あり Switch | `accessibilityRole="switch"` / `accessibilityLabel="即売あり"` |
| フォーム必須フィールド | `accessibilityLabel` に「（必須）」を含める |
| 削除ボタン | `accessibilityLabel="削除する（取り消せません）"` |

---

## 11. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `auth-forms.md`（AuthTextField / FormErrorMessage）| イベントフォームの入力フィールドに流用する |
| `components/common/DateTimeField.tsx` | 開始・終了日時に使用する（§4.3）。`scheduled-posts.md` §5.3・`bonsai.md` §6.7 と同一コンポーネント |
| `components/profile/LocationField.tsx` / `components/bonsai/TreeSpeciesField.tsx` | 都道府県選択（`EventPrefecturePickerModal`）はこれらと同じ「トリガー→モーダル単一選択」パターンを踏襲する（グループ分けはせず 47 都道府県をフラット表示する点のみ異なる）|
| `post-composer.md` §7（GenreSelector チップ）| FilterBar チップのスタイルを踏襲する |
| `navigation-structure.md` §5.1（モーダルヘッダー）| イベントフォームのモーダルヘッダーを踏襲する |
| `navigation-structure.md` §5.2（破棄確認）| 変更がある場合の破棄確認を踏襲する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| `more-menu.md` §3.2「イベント」行 | ネイティブ画面実装後は `openBrowserAsync` → `router.push` に切り替える（frontend への申し送り）|
| `bonsai.md` の FAB デザイン | 直径 56pt / `colorActionPrimary` を踏襲する |
| `ugc-safety.md` §2.6.1・§7.1（イベントの通報導線） | 非作成者・ログイン済みユーザー向けの通報確認 Alert → `ReportDialog` の詳細仕様（エラーハンドリング・コピー含む）はこちらに委ねる（§3.4.2 参照） |

---

## 12. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| フォームの各フィールドの文字数上限 | サーバー側の Zod バリデーションで確認する | core | **解決済み（2026-07-13）**: `lib/constants/limits/event.ts` で確認済み（§4.2）|
| `region` / `prefecture` の値の定義 | 一覧フィルタの `region` の値一覧・型を確認する | core | 未解決（フォーム側の `prefecture` は `PREFECTURES` 定数で解決済み）|
| `isCreator` フィールドの API への含み方 | 詳細取得 API のレスポンスに `isCreator` フラグが含まれるか確認する | core | 未解決 |
| イベント画像の有無 | イベントにサムネイル / カバー画像フィールドが存在するか確認する | core | 未解決 |
| 入場料の型 | 実装は文字列（`admissionFee: string \| null`）。「無料」チェック ON で文字列 `"無料"` を送信し、OFF 時は自由記述文字列（数値専用ではない）| core | **解決済み（2026-07-13）**|
| 詳細画面の「主催者」表示 | フォームの `organizer`（主催者名の自由記述）と、投稿した `creator`（ユーザーアカウント）の表示上の書き分けを frontend 実装時に確認する（§3.1 の注記参照）| frontend | 未解決（新規発見） |
