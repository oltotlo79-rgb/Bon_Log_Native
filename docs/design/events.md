# イベント画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-22
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
- `profile-edit.md` §7.5 の BirthdayField（テキスト方式）を日付入力に流用する
- 作成者のみ編集・削除を実行できる（`isCreator` フラグで判定）
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
│   右: 「⋮」（3点メニュー。`isCreator === true` のみ表示）    │
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
│   [MapPinアイコンRow]   [都道府県 / 地域]                   │
│   [TicketアイコンRow]   [入場料（「無料」or 金額）]          │
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

### 3.4 3点メニュー（作成者のみ）

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

---

## 4. イベントフォーム（`events/new` / `events/[id]/edit`）

### 4.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ [モーダルヘッダー]                                           │
│   左: 「キャンセル」                                         │
│   中央: 「イベントを作成」または「イベントを編集」           │
│   右: 「投稿する」または「保存する」                         │
│                                                             │
│ [ScrollView（KeyboardAvoidingView）]                         │
│   paddingHorizontal: spacing4                               │
│   paddingBottom: spacing8                                   │
│                                                             │
│   [FormErrorMessage（エラー時のみ）]                         │
│                                                             │
│   [タイトル（必須）]                                         │
│   [開催日（必須）]                    ← テキスト入力方式     │
│   [終了日（任意）]                    ← テキスト入力方式     │
│   [会場名（任意）]                                           │
│   [都道府県（任意）]                  ← テキスト入力（フリー）│
│   [地域（任意）]                      ← テキスト入力（フリー）│
│   [入場料（任意）]                    ← 数値入力 or 「無料」チェック│
│   [説明（任意）]                      ← 複数行テキスト       │
│   [外部 URL（任意）]                  ← URL 入力            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 フォームフィールド仕様

| フィールド | 種類 | 必須 | 上限 | 備考 |
|-----------|------|------|------|------|
| タイトル（title）| 1行テキスト | 必須 | 200文字 | `AuthTextField` 流用 / 文字数カウンタ |
| 開催日（startDate）| 日付入力 | 必須 | — | テキスト方式（BirthdayField 流用） |
| 終了日（endDate）| 日付入力 | 任意 | — | テキスト方式。開催日以降のみ有効 |
| 会場名（venue）| 1行テキスト | 任意 | 200文字 | `AuthTextField` 流用 |
| 都道府県（prefecture）| 1行テキスト | 任意 | 50文字 | フリーテキスト |
| 地域（region）| 1行テキスト | 任意 | 50文字 | フリーテキスト |
| 入場料（admission）| 数値 + 無料チェック | 任意 | — | 「無料」チェック ON のとき 0 を送信。OFF は数値入力（`keyboardType: "number-pad"`）|
| 説明（description）| 複数行テキスト | 任意 | 2000文字 | 文字数カウンタ |
| 外部 URL（url）| URL テキスト | 任意 | — | `keyboardType: "url"` / 形式チェック（https:// から始まるか）|

**core に要確認:** 各フィールドの文字数上限・型の正本はサーバー側の Zod バリデーションで確認する。

### 4.3 入場料フィールドの詳細

```
[無料チェックボックス（Switch + ラベル「無料」）]
  ↓ ON
  → 数値入力フィールドを非表示
  ↓ OFF（デフォルト）
  → [数値入力フィールド] 円
```

### 4.4 保存ボタンの活性条件

- タイトルが 1文字以上
- 開催日が入力されている
- 終了日がある場合は開催日以降の日付である
- 外部 URL がある場合は URL 形式が正しい
- 保存処理中でない
- 編集時: 初期値からいずれかのフィールドが変更されている

### 4.5 ナビゲーション

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
├── ScreenLoading               ← common-states.md 流用
├── ScreenEmpty                 ← common-states.md 流用
├── ScreenError                 ← common-states.md 流用
└── OfflineBanner               ← common-states.md 流用

EventDetailScreen ([id])
├── EventDetailHeader           ← イベント名
├── EventDetailInfoSection      ← 日時・会場・主催者等の情報行
├── EventExternalLink           ← 外部 URL ボタン（URL があるときのみ）
└── DeleteConfirmDialog         ← 削除確認（作成者のみ）

EventFormScreen (new / edit)
├── EventFormHeader             ← モーダルヘッダー（キャンセル / タイトル / 保存）
├── FormErrorMessage            ← auth-forms.md 流用
└── EventFormFields             ← 各フォームフィールド群
    ├── EventDateField          ← 日付入力（BirthdayField 流用）
    └── EventAdmissionField     ← 入場料（Switch + 数値入力）
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

- 詳細画面の 3点メニューを非表示にする（`isCreator === false` の場合）
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
| フォーム「開催日」ラベル | 「開催日 ＊」|
| フォーム「終了日」ラベル | 「終了日（任意）」|
| フォーム「会場名」ラベル | 「会場名（任意）」|
| フォーム「都道府県」ラベル | 「都道府県（任意）」|
| フォーム「地域」ラベル | 「地域（任意）」|
| フォーム「入場料」ラベル | 「入場料（任意）」|
| 入場料「無料」ラベル | 「無料」|
| フォーム「説明」ラベル | 「説明（任意）」|
| フォーム「外部 URL」ラベル | 「詳細ページ URL（任意）」|
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

---

## 10. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| EventCard | `accessibilityRole="button"` / `accessibilityLabel="{イベント名}の詳細を見る"` / 最小タップターゲット 72pt |
| FAB | `accessibilityRole="button"` / `accessibilityLabel="イベントを作成する"` / 56pt |
| フィルタチップ | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 外部リンク行 | `accessibilityRole="link"` / `accessibilityLabel="詳細ページを開く（外部リンク）"` |
| 3点メニュー | `accessibilityLabel="イベントのメニューを開く"` |
| 入場料 Switch | `accessibilityRole="switch"` / `accessibilityLabel="無料イベント"` |
| フォーム必須フィールド | `accessibilityLabel` に「（必須）」を含める |
| 削除ボタン | `accessibilityLabel="削除する（取り消せません）"` |

---

## 11. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `auth-forms.md`（AuthTextField / FormErrorMessage）| イベントフォームの入力フィールドに流用する |
| `profile-edit.md` §7.5（BirthdayField）| 開催日・終了日のテキスト入力方式を流用する |
| `post-composer.md` §7（GenreSelector チップ）| FilterBar チップのスタイルを踏襲する |
| `navigation-structure.md` §5.1（モーダルヘッダー）| イベントフォームのモーダルヘッダーを踏襲する |
| `navigation-structure.md` §5.2（破棄確認）| 変更がある場合の破棄確認を踏襲する |
| `common-states.md`（4 状態コンポーネント）| 全画面で既存コンポーネントを再利用する |
| `more-menu.md` §3.2「イベント」行 | ネイティブ画面実装後は `openBrowserAsync` → `router.push` に切り替える（frontend への申し送り）|
| `bonsai.md` の FAB デザイン | 直径 56pt / `colorActionPrimary` を踏襲する |

---

## 12. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| フォームの各フィールドの文字数上限 | サーバー側の Zod バリデーションで確認する | core に要確認 |
| `region` / `prefecture` の値の定義 | 文字列の固定値か ID か、使用できる値の一覧を確認する | core に要確認 |
| `isCreator` フィールドの API への含み方 | 詳細取得 API のレスポンスに `isCreator` フラグが含まれるか確認する | core に要確認 |
| イベント画像の有無 | イベントにサムネイル / カバー画像フィールドが存在するか確認する（本仕様では画像なしとして設計）| core に要確認 |
| 入場料の型 | 数値（円）か文字列か。「無料」フラグの実装方針を確認する | core に要確認 |
