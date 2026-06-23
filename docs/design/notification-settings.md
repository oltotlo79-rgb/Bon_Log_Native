# 通知設定画面仕様（種類別トグル拡張）— Bon_Log Native

作成日: 2026-06-23
対象画面: `settings/notifications/index.tsx`（既存画面の拡張）
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `notifications-screen.md` に準拠
既存の仕様: `app/settings/notifications/index.tsx`（端末プッシュ通知許可 / OS 設定導線）
拡張内容: 種類別通知トグル 11 種の追加（API で管理するサーバー側設定）
API（想定）: `GET /api/v1/notification-settings` / `PATCH /api/v1/notification-settings` — 正本は OpenAPI。core に要確認。

---

## 1. 概要・目的

既存の通知設定画面（端末の Push 通知許可制御）に、**通知の種類ごとに ON/OFF を切り替えられるサーバー管理トグル**を追加する拡張。

ユーザーが不要な通知を種類単位で止められるようにすることで、通知のオプトアウト率を下げ、Push 通知の有効活用を促す。

**既存機能（端末通知許可）は画面先頭に残す。** 既存の実装コードを壊さずに末尾に新セクションを追加する形で設計する。

---

## 2. ナビゲーション

| 項目 | 内容 |
|------|------|
| ルート | `settings/notifications` |
| 配置 | `settings/` スタック（既存のまま） |
| 遷移元 | `settings/index` のリスト行「通知設定」 |
| 遷移先 | 設定変更後は本画面に留まる（戻るボタンで設定トップへ） |
| ヘッダー | スタックヘッダー / 「← 戻る」+ 「通知設定」（既存のまま） |
| ディープリンク | 不要（設定画面のためディープリンク不要） |

---

## 3. 画面構成

### 3.1 全体レイアウト

既存の `ScrollView` + `View` 構造に新セクションを追加する（FlatList は使わない — 項目数が有界かつ静的なため）。

```
┌────────────────────────────────────────────────────────────┐
│  [セーフエリア上端]                                         │
│                                                            │
│  [OfflineBanner（オフライン時のみ）]                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [← 戻る]              通知設定                       │  │  ← スタックヘッダー（既存）
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌────── [ScrollView] ─────────────────────────────────┐  │
│  │                                                      │  │
│  │  ┌─────── [セクション 1: プッシュ通知許可] ─────────┐ │  │
│  │  │  （既存カード: プッシュ通知 / 許可状態 / ボタン）  │ │  │  ← 既存の実装を変更しない
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  │  ┌─────── [セクション 2: 通知の種類] ───────────────┐ │  │  ← 新規追加
│  │  │  セクション見出し                                 │ │  │
│  │  │  ┌─── グループ見出し ─────────────────────────┐  │ │  │
│  │  │  │  トグル行 ...                              │  │ │  │
│  │  │  └───────────────────────────────────────────┘  │ │  │
│  │  │  ...（グループ繰り返し）                          │ │  │
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [セーフエリア下端]                                         │
└────────────────────────────────────────────────────────────┘
```

### 3.2 セクション 2 の詳細レイアウト

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  通知の種類                                                │  ← セクション大見出し / textLg / colorTextPrimary
│  通知を受け取る種類を選択できます。                         │  ← textSm / colorTextSecondary
│                                                            │
│  ── リアクション ──────────────────────────────────────── │  ← グループ見出し
│                                                            │
│  [行] いいね                          [スイッチ ○ ──]    │
│  [行] コメントへのいいね              [スイッチ ○ ──]    │
│  [行] コメント                        [スイッチ ○ ──]    │
│  [行] 返信                            [スイッチ ○ ──]    │
│  [行] メンション                      [スイッチ ○ ──]    │
│  [行] 引用                            [スイッチ ○ ──]    │
│  [行] リポスト                        [スイッチ ○ ──]    │
│                                                            │
│  ── フォロー ──────────────────────────────────────────── │  ← グループ見出し
│                                                            │
│  [行] フォロー                        [スイッチ ○ ──]    │
│  [行] フォローリクエスト              [スイッチ ○ ──]    │
│  [行] フォローリクエストの承認        [スイッチ ○ ──]    │
│                                                            │
│  ── メッセージ ────────────────────────────────────────── │  ← グループ見出し
│                                                            │
│  [行] メッセージ                      [スイッチ ○ ──]    │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 3.3 トグル行のレイアウト

```
┌────────────────────────────────────────────────────────────┐
│  {ラベル}                      [Switch]                    │  ← 高さ: 最小 52pt（44pt タップターゲット + 余白）
└────────────────────────────────────────────────────────────┘
```

| 属性 | 値 |
|------|---|
| 行の高さ | 最小 52pt（内側 padding: `spacing3` 上下 = 12pt × 2 + テキスト行 14pt = 合計 38pt → `spacing4` 上下で 52pt 確保） |
| ラベルテキスト | `textBase`（14pt）/ `colorTextPrimary` |
| Switch コンポーネント | React Native の `Switch` / または同等の実装 |
| Switch ON 色 | `colorActionPrimary`（`#2e2e2e`）（iOS: `trackColor={{ true: colorActionPrimary }}` / Android: `thumbColor`・`trackColor` を個別指定）|
| Switch OFF 色 | `colorSurfaceMuted`（`#f0f0f0`） |
| Switch サイズ | OS デフォルト（RN の Switch は OS ネイティブコントロールを使用） |
| 行セパレータ | 1pt solid `colorBorderLight` / `marginLeft: spacing4`（左端からインデントしたセパレータ）|
| 無効状態（オフライン / ローディング中） | Switch を `disabled` / 行全体の `opacity: 0.5` |

**iOS / Android の Switch 差異:**

iOS と Android の Switch は OS ネイティブコントロールが異なるため、見た目が異なることを許容する。
共通の props で色のみ制御し、形状の統一はしない（ネイティブの一貫性を優先）。

### 3.4 グループ見出し行のレイアウト

```
┌────────────────────────────────────────────────────────────┐
│  {グループ名}                                              │  ← textSm（12pt）/ colorTextSecondary / letterSpacingWide
│                                                            │     paddingVertical: spacing3 / paddingHorizontal: spacing4
└────────────────────────────────────────────────────────────┘
```

グループ見出しの下に `colorBorderLight` の細線（1pt）を引く。
次のグループ開始前に `spacing2`（8pt）の空白を入れる。

---

## 4. トグル項目の定義

### 4.1 通知キーとグループの対応

`notifications-screen.md` §5.4 の `NotificationType` 13 種のうち、**`system` と `subscription_expiring` はユーザーが切り替えできない**（運営からの重要通知のため）。残り 11 種をグループ化する。

| グループ名 | キー（type 値） | 日本語ラベル |
|-----------|--------------|------------|
| **リアクション** | `like` | いいね |
| | `comment_like` | コメントへのいいね |
| | `comment` | コメント |
| | `reply` | 返信 |
| | `mention` | メンション |
| | `quote` | 引用 |
| | `repost` | リポスト |
| **フォロー** | `follow` | フォロー |
| | `follow_request` | フォローリクエスト |
| | `follow_request_approved` | フォローリクエストの承認 |
| **メッセージ** | `message` | メッセージ |

**`system` / `subscription_expiring` はこのセクションに表示しない。** ユーザーが誤って切り替えられる UI を作らない。

### 4.2 `message` のラベル補足

`message` タイプは現時点で MVP スコープ外（メッセージ機能未実装）だが、通知設定はサーバー設定であるため、キーが存在する限り設定行として表示する。
行のラベル下に補足テキストを追加することを推奨:「近日公開予定」— textXs / colorTextTertiary。PM に要確認。

---

## 5. データの流れ

### 5.1 設定取得

- `GET /api/v1/notification-settings`（Bearer 必須）
- レスポンス想定（正本は OpenAPI）:

```
NotificationSettings:
  like: boolean
  comment: boolean
  reply: boolean
  comment_like: boolean
  follow: boolean
  quote: boolean
  follow_request: boolean
  follow_request_approved: boolean
  mention: boolean
  message: boolean
  repost: boolean
  // system / subscription_expiring は含まない（サーバー管理）
```

- `useQuery`（TanStack Query）で取得。`staleTime`: `STALE_TIME_SETTINGS_MS`（設定系は長め / `lib/constants/` に定義）

### 5.2 未設定キーのデフォルト値

サーバーが特定のキーを返さない場合（新規ユーザー / 未設定）は、クライアント側で **デフォルト ON** として表示する。
実装: `settings?.[key] ?? true`。

### 5.3 設定保存（部分更新）

保存タイミング: **トグルを切り替えた瞬間にサーバーへ送信**（明示的な「保存」ボタンなし）。
これは設定系 UI として直感的であり、Web 版の通知設定の方針と合わせる。

```
ユーザーがトグルを切り替え
  → 楽観更新: ローカルの設定状態を即時更新（スイッチが切り替わる）
  → PATCH /api/v1/notification-settings
    リクエストボディ: { [key]: boolean }（変更したキー 1 つのみ）
  → 成功: notification-settings クエリを invalidate（または楽観値を確定）
  → 失敗:
      楽観更新をロールバック（スイッチを元の状態に戻す）
      エラートーストを表示:「設定の保存に失敗しました。もう一度お試しください。」
```

**部分更新を採用する理由:** 11 個のトグルを全部送ると無関係なキーを上書きするリスクがある。`PATCH` で変更した 1 キーのみ送ることで副作用を最小化する。

### 5.4 同時保存の制御

ユーザーが素早く複数のトグルを切り替えた場合、各トグルが独立したミューテーション呼び出しになる。
サーバーへの同時リクエストは許容する（RESTful な PATCH の冪等性で問題なし）。

---

## 6. 状態とインタラクション

### 6.1 4 状態の定義

**セクション 2 全体（種類別設定エリア）の状態:**

| 状態 | 表示 |
|------|------|
| ローディング（初回取得中） | トグル行のスケルトン × 11（ラベル矩形 + スイッチ矩形を右端に配置）|
| エラー（設定取得失敗） | セクション 2 内に `ScreenError`（コンパクト版: アイコン + 文言 + 再試行ボタン。画面全体は乗っ取らない）/ セクション 1（既存の Push 許可カード）は通常表示を維持 |
| オフライン | `OfflineBanner` を表示 / セクション 2 は「設定を変更するにはオンライン接続が必要です。」のインライン案内を表示 / トグルは全て disabled |
| 正常（データあり） | トグル行を表示 |

セクション 1（既存の Push 許可カード）は本拡張で変更しない。

### 6.2 スケルトン構成（セクション 2 用）

```
セクション大見出しエリア:
  [Rect 120x14] / [Rect 200x12]     ← 見出し + 説明

グループ見出し行 × 3:
  [Rect 80x10]                       ← グループ名

トグル行 × 11:
  [Rect 120x14]  [Rect 44x24]       ← ラベル + スイッチ形状
```

### 6.3 オフライン中のインライン案内

```
┌──────────────────────────────────────────────────────────┐
│  [WifiOff アイコン 14pt]                                  │
│  通知の種類設定を変更するには、インターネット接続が必要    │
│  です。接続を確認してください。                            │
│                                          textSm / colorTextSecondary
└──────────────────────────────────────────────────────────┘
```

背景: `colorSurfaceKinoko`（`#f0ece4`）/ 角丸: `radiusMd` / padding: `spacing3`。
既存の `offlineBanner` スタイル（`settings/notifications/index.tsx` の `offlineBanner` と同一パターン）。

### 6.4 保存中のフィードバック

明示的な保存状態インジケータは設けない（トグルが即時に切り替わることがフィードバックになる）。
失敗時のみトーストで通知する。

失敗してロールバックされた場合: スイッチが元の値に戻ることでユーザーに失敗を気づかせる + トースト。

---

## 7. コンポーネント分割

新規追加するコンポーネントは `components/settings/` に配置する（既存の `BlockedUserListItem` / `MutedUserListItem` と同じディレクトリ）。

```
SettingsNotificationsScreen（既存画面ルート）
├── [既存セクション 1: Push 許可カード]   ← 変更なし
│
└── NotificationTypeSettings              ← 新規コンポーネント（セクション 2 全体を担当）
    ├── [ローディング / エラー / オフライン状態を内包]
    └── NotificationToggleGroup           ← グループ（見出し + 行のまとまり）/ 3 つ作成
        └── NotificationToggleRow × N     ← 1 トグル行
```

### NotificationToggleRow props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `notificationKey` | `NotificationSettingKey`（`'like' \| 'comment' \| ...`） | 通知の種類キー |
| `label` | `string` | 表示ラベル |
| `value` | `boolean` | 現在の ON/OFF 値 |
| `onToggle` | `(key: NotificationSettingKey, value: boolean) => void` | 切替コールバック |
| `isDisabled` | `boolean` | オフライン / ローディング中の無効フラグ |
| `sublabel` | `string \| undefined` | 補足テキスト（任意。`message` キーの「近日公開予定」等） |

### NotificationToggleGroup props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `groupLabel` | `string` | グループ見出し（「リアクション」等） |
| `items` | `NotificationToggleRowProps[]` | 行定義の配列 |

---

## 8. エラー処理と文言

### 8.1 保存失敗

| エラー | 使用定数 | 文言 |
|--------|---------|------|
| ネットワークエラー / 保存失敗 | `ERR_NOTIFICATION_SETTINGS_SAVE_FAILED`（新規）| 「設定の保存に失敗しました。もう一度お試しください。」|
| 429（レート制限） | `ERR_RATE_LIMIT` | 「操作が多すぎます。しばらく時間をおいてからお試しください。」|
| 401 | 自動 refresh → ログイン画面（`auth-tokens.md` 準拠） | — |
| オフライン | `ERR_OFFLINE_ACTION` | 「現在オフライン中のため、この操作はできません。接続を確認してください。」|

### 8.2 設定取得失敗

セクション 2 内にインラインエラーを表示（画面全体を乗っ取らない）:

| 要素 | 仕様 |
|------|------|
| エラーアイコン | AlertCircle 系 / `colorError` / 20pt |
| タイトル | 「設定を読み込めませんでした」|
| 補足 | `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED`（新規）「通知設定の取得に失敗しました。再試行してください。」|
| 再試行ボタン | 高さ 44pt / `colorActionPrimary` / `radiusMd` |

---

## 9. コピー案（文言一覧）

### 9.1 セクション

| 箇所 | 文言 |
|------|------|
| セクション大見出し | 「通知の種類」|
| セクション説明 | 「プッシュ通知を受け取る種類を選択できます。」|

### 9.2 グループ見出し

| グループ | 見出し |
|---------|-------|
| リアクション系 | 「リアクション」|
| フォロー系 | 「フォロー」|
| メッセージ系 | 「メッセージ」|

### 9.3 トグル行ラベル

| キー | 日本語ラベル |
|------|------------|
| `like` | 「いいね」|
| `comment_like` | 「コメントへのいいね」|
| `comment` | 「コメント」|
| `reply` | 「返信」|
| `mention` | 「メンション」|
| `quote` | 「引用」|
| `repost` | 「リポスト」|
| `follow` | 「フォロー」|
| `follow_request` | 「フォローリクエスト」|
| `follow_request_approved` | 「フォローリクエストの承認」|
| `message` | 「メッセージ」|

### 9.4 状態文言

| 場面 | 文言 |
|------|------|
| 設定取得エラー タイトル | 「設定を読み込めませんでした」|
| 設定取得エラー 補足（定数） | `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED`「通知設定の取得に失敗しました。再試行してください。」|
| 設定取得エラー ボタン | 「再試行」|
| 保存失敗トースト（定数） | `ERR_NOTIFICATION_SETTINGS_SAVE_FAILED`「設定の保存に失敗しました。もう一度お試しください。」|
| オフラインインライン案内 | 「通知の種類設定を変更するには、インターネット接続が必要です。接続を確認してください。」|
| message キー 補足 | 「近日公開予定」（PM 判断）|

---

## 10. `lib/constants/errors.ts` に必要な新規定数

frontend への依頼事項。

| 定数名 | 文言 | 使用場面 |
|--------|------|---------|
| `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED` | `'通知設定の取得に失敗しました。再試行してください。'` | 設定取得失敗インラインエラー |
| `ERR_NOTIFICATION_SETTINGS_SAVE_FAILED` | `'設定の保存に失敗しました。もう一度お試しください。'` | 保存失敗トースト |

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| セクション大見出し | `accessibilityRole="header"` |
| グループ見出し | `accessibilityRole="header"` |
| トグル行全体 | タップターゲット 52pt（高さ）以上 |
| Switch（トグル） | React Native の `Switch` は `accessibilityLabel` / `accessibilityState: { checked: value }` を付与 |
| Switch accessibilityLabel | 「{ラベル}の通知」（例:「いいねの通知」） |
| Switch オフ時 accessibilityHint | 「タップしてオンにする」|
| Switch オン時 accessibilityHint | 「タップしてオフにする」|
| 無効状態 | `accessibilityState: { disabled: true }` |
| スケルトン | `accessibilityElementsHidden={true}` |
| エラー状態 | `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` |

---

## 12. iOS / Android 差異

| 差異点 | iOS | Android |
|--------|-----|---------|
| Switch の見た目 | OS ネイティブのトグルスイッチ（グリーン系 ON / グレー OFF が OS デフォルト。`trackColor` で上書き可）| マテリアルデザインの Switch |
| Switch の ON 色指定 | `trackColor={{ false: colorSurfaceMuted, true: colorActionPrimary }}` | 同 props + `thumbColor` でサム色を指定（Android は thumbColor が目立つため `colorActionPrimaryText` を推奨）|
| `thumbColor` | 指定不要（iOS は白固定）| ON 時: `colorActionPrimaryText` / OFF 時: `colorSurfaceWashi` |
| セーフエリア | SafeAreaView `edges: ['top']`（既存の設定と同じ）| 同上 |

---

## 13. 使用デザイントークン

| 要素 | トークン |
|------|---------|
| 画面背景 | `colorBackground`（`#ffffff`）（既存のまま）|
| 既存カード（セクション 1） | `colorSurface`（`#fcfcfc`）/ `shadowWashi`（既存のまま）|
| セクション 2 背景 | `colorBackground`（`#ffffff`）（カードなし。フラットなリスト形式）|
| グループ見出し | `textSm`（12pt）/ `colorTextSecondary` / `letterSpacingWide`（1.0）|
| セクション大見出し | `textLg`（17pt）/ `colorTextPrimary` |
| セクション説明 | `textSm`（12pt）/ `colorTextSecondary` |
| トグル行ラベル | `textBase`（14pt）/ `colorTextPrimary` |
| sublabel（補足）| `textXs`（10pt）/ `colorTextTertiary` |
| 行セパレータ | 1pt / `colorBorderLight` / `marginLeft: spacing4` |
| Switch ON 色 | `colorActionPrimary`（`#2e2e2e`）|
| Switch OFF 色 | `colorSurfaceMuted`（`#f0f0f0`）|
| スケルトン背景 | `colorSurfaceMuted`（`#f0f0f0`）|
| オフライン案内背景 | `colorSurfaceKinoko`（`#f0ece4`）|

---

## 14. 既存との一貫性メモ

| 既存要素 | 本拡張での扱い |
|---------|-------------|
| `app/settings/notifications/index.tsx` 既存実装 | セクション 1（Push 許可カード）のコード・スタイルは一切変更しない。新しい `NotificationTypeSettings` コンポーネントを `<View style={styles.content}>` 内の末尾に追加するのみ |
| 既存の `offlineBanner` スタイル | セクション 2 のオフライン案内でも `colorSurfaceKinoko` + `radiusMd` + `spacing3` の同じパターンを使用する |
| `notifications-screen.md` の `NotificationType` 型 | 本仕様で定義したグループと一致している（13 種から `system` と `subscription_expiring` を除いた 11 種）|
| `settings/blocked/index.tsx` のヘッダー仕様 | ヘッダー（高さ 48pt / `colorSurfaceWashi` / `colorBorderLight` 下端 / letterSpacingWidest）を踏襲 |
| `common-states.md` の OfflineBanner | 既存実装の `isOnline` / `useOnlineStatus` フックと連携し、セクション 2 の無効化とインライン案内を制御する |
| `follow-and-engagement.md` の楽観更新パターン | 各トグルの即時切り替え + ロールバックに同パターンを適用する |

---

## 15. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| API エンドポイント | `GET /api/v1/notification-settings` / `PATCH /api/v1/notification-settings` の仕様 | core（最優先） |
| 未設定キーのデフォルト | サーバーが未設定キーを省略して返す場合、クライアントで ON 扱いにする（§5.2）。サーバーが全キーを常に返すなら分岐不要 | core |
| `message` キーの sublabel | 「近日公開予定」を表示するか | PM |
| Switch の ON 色 | `colorActionPrimary`（`#2e2e2e` の墨色）は Android の Switch でサム色と混在した際に視認しにくい可能性。実機確認後に `colorSuccess`（`#3a6b42` 緑）への変更を検討してよい | frontend（実機確認後）/ core（トークン変更になる場合）|
| 既存セクション 1 との視覚的分離 | セクション 1 とセクション 2 の間に `spacing6`（24pt）の余白を設けるだけで十分か、または区切り線を入れるか | PM |
