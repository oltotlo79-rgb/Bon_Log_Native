# 通知設定画面仕様（種類別トグル拡張）— Bon_Log Native

作成日: 2026-06-23
最終改訂: 2026-06-23（実装 `components/settings/NotificationTypeSettings.tsx` の確認結果に基づき §3・§4・§7・§9 を全面改訂 — 「リアクション / フォロー / メッセージ」の 3 グループに分けてグループ見出しを表示する旧仕様から、Web (`components/settings/NotificationPreferences.tsx`) と同じ「グループ見出しなしのフラット 11 項目・Web 準拠の並び順」へ是正。あわせて §4.2 の `message` 副ラベル「近日公開予定」は実装に存在しないため撤回し、§5 の API パス・§8/§10 のエラー定数名も実装 (`lib/queries/notifications.ts` / `lib/constants/errors.ts`) に合わせて修正した）
同日追記（2026-07-13 第2回改訂・Web 準拠監査）: Web (`components/settings/NotificationPreferences.tsx`) は各トグル行のラベル直下に一行の説明文（`description`）を表示しているが、Native 実装（`NotificationTypeSettings.tsx` / `NotificationToggleRow.tsx`）はラベルのみで説明文を表示しておらず乖離があることを確認した。`NotificationToggleRow` は元々 `sublabel?: string` prop を持っていた（第1回改訂時点では「`message` の副ラベルは実装されていない」という現状記録のためだけに§4.2 で言及されていた）ため、これを 11 行すべてで説明文表示に使う仕様へ拡張し是正する。§3.2・§3.3・§4.2・§7・§9・§11・§13・§15 を本追記で更新した
同日追記（2026-07-13 第3回改訂・ラベル Web 完全一致対応）: 第2回改訂時点で「Web と表記差があり本改訂の対象外」と記録していた 4 キー（`comment_like` / `quote` / `follow_request_approved` / `message`）について、その後の実装対応でラベルを Web (`components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES`) にバイト一致させたことを確認した（`lib/constants/notification-settings.ts` の `NOTIFICATION_PREFERENCE_LABELS`）。`comment_like`「コメントいいね」・`quote`「引用投稿」・`follow_request_approved`「フォロー承認」・`message`「ダイレクトメッセージ」に更新されており、これにより 11 キー全てでラベル・説明文ともに Web と完全一致する。§3.2・§4.1・§4.2・§9.3・§14・§15 のラベル値と「ラベル変更は対象外」等の記述を実装に合わせて是正した
対象画面: `settings/notifications/index.tsx`（既存画面の拡張）
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `notifications-screen.md` に準拠
既存の仕様: `app/settings/notifications/index.tsx`（端末プッシュ通知許可 / OS 設定導線）
拡張内容: 種類別通知トグル 11 種の追加（API で管理するサーバー側設定）+ 各行の説明文表示（2026-07-13 第2回改訂で追加）
実装の正: `components/settings/NotificationTypeSettings.tsx` / `components/settings/NotificationToggleRow.tsx` / `lib/constants/notification-settings.ts`（本書の記述と差異が生じた場合は実装を正とし、本書を追従改訂する）
API: `GET /api/v1/users/me/notification-settings` / `PATCH /api/v1/users/me/notification-settings`（`lib/queries/notifications.ts` で確認済み。正本は OpenAPI）

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
│  │  │  セクション見出し + 説明                           │ │  │
│  │  │  トグル行 × 11（グループ見出しなし・フラット・     │ │  │
│  │  │  各行にラベル + 説明文の2行構成）                  │ │  │  ← 説明文は 2026-07-13 第2回改訂で追加
│  │  └────────────────────────────────────────────────────┘ │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [セーフエリア下端]                                         │
└────────────────────────────────────────────────────────────┘
```

### 3.2 セクション 2 の詳細レイアウト

> **改訂注記（2026-07-13）:** 実装 `components/settings/NotificationTypeSettings.tsx` はグループ見出しを持たない。`NOTIFICATION_PREFERENCE_KEYS`（`lib/constants/notification-settings.ts`）の並び順のまま 11 行を単純に連続表示するのみで、「リアクション」「フォロー」「メッセージ」等の区切りラベルは存在しない。旧仕様（3 グループ化）は撤回し、以下を現状の正とする。
>
> **追記（2026-07-13 第2回改訂）:** 各行にラベル直下の説明文（`sublabel`）を追加した。Web (`NotificationPreferences.tsx`) が各行に一行説明文を表示しているのに Native が表示していなかった乖離を是正するもの。詳細な文言対応表は §4.2 参照。
>
> **追記（2026-07-13 第3回改訂）:** 以下のワイヤーフレームのラベル表記を、Web に完全一致させた実装（`comment_like`→「コメントいいね」/ `quote`→「引用投稿」/ `follow_request_approved`→「フォロー承認」/ `message`→「ダイレクトメッセージ」）に合わせて修正した。対応表は §4.1・§4.2 参照。

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  通知の種類                                                │  ← セクション大見出し / textLg / colorTextPrimary
│  プッシュ通知を受け取る種類を選択できます。                 │  ← textSm / colorTextSecondary
│                                                            │
│  [行] いいね                          [スイッチ ○ ──]    │
│       投稿にいいねされた時                                │  ← 説明文（textXs / colorTextTertiary）※新規
│  [行] コメント                        [スイッチ ○ ──]    │
│       投稿にコメントされた時                              │  ← 説明文 ※新規
│  [行] 返信                            [スイッチ ○ ──]    │
│       コメントに返信された時                              │
│  [行] コメントいいね                  [スイッチ ○ ──]    │
│       コメントにいいねされた時                            │
│  [行] フォロー                        [スイッチ ○ ──]    │
│       フォローされた時                                    │
│  [行] 引用投稿                        [スイッチ ○ ──]    │
│       投稿が引用された時                                  │
│  [行] フォローリクエスト              [スイッチ ○ ──]    │
│       フォローリクエストを受けた時                        │
│  [行] フォロー承認                    [スイッチ ○ ──]    │
│       フォローリクエストが承認された時                    │
│  [行] メンション                      [スイッチ ○ ──]    │
│       投稿やコメントでメンションされた時                  │
│  [行] ダイレクトメッセージ            [スイッチ ○ ──]    │
│       DM を受信した時                                     │
│  [行] リポスト                        [スイッチ ○ ──]    │  ← 最終行（下端ボーダーなし）
│       投稿がリポストされた時                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

行の並び順は `NOTIFICATION_PREFERENCE_KEYS` の宣言順そのもので、Web (`components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES`) と一致する:
`like`（いいね）→ `comment`（コメント）→ `reply`（返信）→ `comment_like`（コメントいいね）→ `follow`（フォロー）→ `quote`（引用投稿）→ `follow_request`（フォローリクエスト）→ `follow_request_approved`（フォロー承認）→ `mention`（メンション）→ `message`（ダイレクトメッセージ）→ `repost`（リポスト）。

### 3.3 トグル行のレイアウト

> **改訂注記（2026-07-13 第2回）:** `NotificationToggleRow.tsx` は元々 `sublabel?: string` prop とその描画ロジック（ラベル直下に `textXs` / `colorTextTertiary` で表示）を持っていたが、呼び出し元の `NotificationTypeSettings.tsx` がこの prop を渡していなかったため、実際にはどの行にも表示されていなかった。今回、Web 準拠のため全 11 行に説明文（description）を表示する仕様へ変更する。新規コンポーネント・新規スタイルの追加は不要で、既存の `sublabel` 描画経路をそのまま使う。

```
┌────────────────────────────────────────────────────────────┐
│  {ラベル}                                    [Switch]      │  ← 高さ: 最小 64pt
│  {説明文}                                                  │  ← 2026-07-13 第2回改訂で追加
└────────────────────────────────────────────────────────────┘
```

| 属性 | 値 |
|------|---|
| 行の高さ | 最小 64pt（**旧値 52pt から変更**。`minHeight: 52` → `64`。ラベル 1 行（`textBase` lineHeight 22pt）+ 説明文 1 行（`textXs` lineHeight 14pt + `marginTop: 2pt`）+ `paddingVertical: 12pt × 2` を収めるための実測値。44pt タップターゲット規定は従来どおり余裕を持って満たす） |
| ラベルテキスト | `textBase`（14pt）/ `colorTextPrimary` |
| 説明文テキスト（新規） | `textXs`（10pt）/ `colorTextTertiary` / `marginTop: 2pt`（ラベル直下）。`NotificationToggleRow` の既存 `sublabel` スタイル（`styles.sublabel`）をそのまま使用する |
| Switch コンポーネント | React Native の `Switch`（`testID="notification-setting-{key}"`）|
| Switch ON 色 | `colorActionPrimary`（`#2e2e2e`）（`trackColor={{ false: colorSurfaceMuted, true: colorActionPrimary }}`）|
| Switch OFF 色 | `colorSurfaceMuted`（`#f0f0f0`） |
| Switch サイズ | OS デフォルト（RN の Switch は OS ネイティブコントロールを使用） |
| 行セパレータ | 行自身の下端に `borderBottomWidth: 1` / `colorBorderLight`。**最終行（リポスト）のみ `borderBottomWidth: 0` で非表示**（`marginLeft` によるインデントは行わない）|
| 無効状態（オフライン / ローディング中 / 保存中） | 行全体の `opacity: 0.5` + Switch を `disabled` |

**iOS / Android の Switch 差異:**

iOS と Android の Switch は OS ネイティブコントロールが異なるため、見た目が異なることを許容する。
共通の props で色のみ制御し、形状の統一はしない（ネイティブの一貫性を優先）。Android は `thumbColor` を ON 時 `colorActionPrimaryText` / OFF 時 `colorSurfaceWashi` で出し分ける（iOS は `thumbColor` 指定なし = 白固定）。

### 3.4（撤回）グループ見出し行のレイアウト

> **撤回（2026-07-13）:** 2026-06-23 版はここに「グループ見出し行」の仕様（`textSm` の区切りラベル + 下線 + グループ間の `spacing2` 空白）を定義していたが、実装にグループ見出しコンポーネントは存在しない（`NotificationToggleGroup` は作られず、`NotificationTypeSettings` が `NotificationToggleRow` を直接 11 回 map するのみ）。Web 側 (`NotificationPreferences.tsx`) も通知種別ごとの区切り見出しを持たないフラットなリストであり、この撤回は Web 挙動とも整合する。旧仕様のグループ分け（リアクション / フォロー / メッセージ）は §4.1 とあわせて撤回済み。

---

## 4. トグル項目の定義

### 4.1 通知キーの一覧（フラット・Web 準拠の並び順）

> **改訂注記（2026-07-13）:** 旧仕様は `notifications-screen.md` §5.4 の `NotificationType` 13 種を独自に「リアクション」「フォロー」「メッセージ」の 3 グループへ再構成していたが、実装・Web ともにグループ分けは存在しない。以下はグループ見出しなしの単一テーブルとして、`lib/constants/notification-settings.ts` の `NOTIFICATION_PREFERENCE_KEYS` の宣言順（Web の `NOTIFICATION_TYPES` と同順）で記載する。

`system` と `subscription_expiring` はユーザーが切り替えできない（運営からの重要通知のため）ため、このセクションには表示しない。残り 11 種を以下の順で表示する。

| 順序 | キー（type 値） | 日本語ラベル |
|------|--------------|------------|
| 1 | `like` | いいね |
| 2 | `comment` | コメント |
| 3 | `reply` | 返信 |
| 4 | `comment_like` | コメントいいね |
| 5 | `follow` | フォロー |
| 6 | `quote` | 引用投稿 |
| 7 | `follow_request` | フォローリクエスト |
| 8 | `follow_request_approved` | フォロー承認 |
| 9 | `mention` | メンション |
| 10 | `message` | ダイレクトメッセージ |
| 11 | `repost` | リポスト |

上記の日本語ラベルは `lib/constants/notification-settings.ts` の `NOTIFICATION_PREFERENCE_LABELS`（実装値）であり、11 種すべてで Web (`components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES`) の表記と完全に一致する（`comment_like` / `quote` / `follow_request_approved` / `message` の 4 キーは 2026-07-13 第3回改訂でラベルを Web にバイト一致させる修正が実装されたことを確認し、本表に反映した）。

**`system` / `subscription_expiring` はこのセクションに表示しない。** ユーザーが誤って切り替えられる UI を作らない。

### 4.2 各行のラベル・説明文（label / description）— 11 種すべて Web に完全一致

> **旧稿の撤回（2026-07-13 第2回改訂時点の記録）:** 本節は 2026-06-23 版〜2026-07-13 第1回改訂まで「`message` の扱い（副ラベルなし）」という見出しで、「`sublabel` は実装のどの行にも渡されておらず、`message` に『近日公開予定』等の特別表示もない」という**現状記録**のみを書いていた。第2回改訂の Web 準拠監査で、Web (`components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES` 配列) が全 11 行のラベル直下に一行の説明文（`description`）を表示していることを確認し、Native 側も 11 行すべてに説明文を表示する仕様へ変更した。`message` を他の 10 種と区別しない（同じ見た目・挙動）という旧稿の結論自体は変更なし（= 特別な「近日公開予定」表示は追加しない）。
>
> **追記（2026-07-13 第3回改訂・ラベルの Web 完全一致対応）:** 第2回改訂時点では `comment_like` / `quote` / `follow_request_approved` / `message` の 4 キーで Native ラベルと Web ラベルの表記が異なっており、「ラベル変更は改訂の対象外」として PM 判断待ちにしていた。その後の実装対応でこの 4 キーのラベルが Web にバイト一致するよう修正されたことを確認したため、本節を実装に合わせて是正する。ラベルの表記差は解消済みであり、11 キー全てでラベル・説明文ともに Web と完全一致している。

**表示位置・実装方法:** ラベルの直下、`NotificationToggleRow` の `sublabel` prop（既存・実装済み）にそのまま渡す。新規コンポーネント・新規スタイルの追加は不要。`lib/constants/notification-settings.ts` の `NOTIFICATION_PREFERENCE_LABELS` と対になる `NOTIFICATION_PREFERENCE_DESCRIPTIONS`（`Record<NotificationPreferenceKey, string>`）を `NotificationTypeSettings.tsx` が `NotificationToggleRow` へ `sublabel={NOTIFICATION_PREFERENCE_DESCRIPTIONS[key]}` として渡す（frontend 実装仕様）。

**対応表（key・ラベル・説明文）:**

ラベル・説明文いずれも、Web `components/settings/NotificationPreferences.tsx` の `NOTIFICATION_TYPES` 配列と一言一句一致する（`lib/constants/notification-settings.ts` の `NOTIFICATION_PREFERENCE_LABELS` / `NOTIFICATION_PREFERENCE_DESCRIPTIONS` で確認済み）。第2回改訂時点で表記差があった 4 キー（`comment_like` / `quote` / `follow_request_approved` / `message`）も Web 完全一致に修正済みのため、以下は全 11 行が Web と同一の表記である。

| 順序 | key | ラベル（Web 完全一致） | 説明文（Web 正文をそのまま採用） |
|------|-----|------------------------|-----------------------------------|
| 1 | `like` | いいね | 投稿にいいねされた時 |
| 2 | `comment` | コメント | 投稿にコメントされた時 |
| 3 | `reply` | 返信 | コメントに返信された時 |
| 4 | `comment_like` | コメントいいね | コメントにいいねされた時 |
| 5 | `follow` | フォロー | フォローされた時 |
| 6 | `quote` | 引用投稿 | 投稿が引用された時 |
| 7 | `follow_request` | フォローリクエスト | フォローリクエストを受けた時 |
| 8 | `follow_request_approved` | フォロー承認 | フォローリクエストが承認された時 |
| 9 | `mention` | メンション | 投稿やコメントでメンションされた時 |
| 10 | `message` | ダイレクトメッセージ | DM を受信した時 |
| 11 | `repost` | リポスト | 投稿がリポストされた時 |

**ラベルの Web 完全一致対応（解決済み・2026-07-13 第3回改訂）:** `comment_like`（「コメントへのいいね」→「コメントいいね」）・`quote`（「引用」→「引用投稿」）・`follow_request_approved`（「フォローリクエストの承認」→「フォロー承認」）・`message`（「メッセージ」→「ダイレクトメッセージ」）の 4 キーは、第2回改訂時点では Native と Web でラベルの言い回しが異なっていたが、その後の実装対応で Web にバイト一致させる修正が行われた。DM 機能自体が MVP スコープ外であっても、`message` のトグル行と説明文は表示する（旧稿の当該結論を維持）。ラベル統一の要否について PM 判断を仰ぐ必要は解消済み。

---

## 5. データの流れ

### 5.1 設定取得

- `GET /api/v1/users/me/notification-settings`（Bearer 必須。`lib/queries/notifications.ts` の `useNotificationSettingsQuery`）
- レスポンス（`NotificationSettingsResponse` スキーマ。正本は OpenAPI / `lib/api/generated/schema.d.ts`）は `preferences` オブジェクトでラップされている:

```
NotificationSettingsResponse:
  preferences:
    like?: boolean
    comment?: boolean
    reply?: boolean
    comment_like?: boolean
    follow?: boolean
    quote?: boolean
    follow_request?: boolean
    follow_request_approved?: boolean
    mention?: boolean
    message?: boolean
    repost?: boolean
    // system / subscription_expiring は含まない（サーバー管理）
```

- `useQuery`（TanStack Query）で取得。`staleTime`: `STALE_TIME_STANDARD`（`lib/constants/query.ts`）

### 5.2 未設定キーのデフォルト値

サーバーが特定のキーを返さない場合（新規ユーザー / 未設定）は、クライアント側で **デフォルト ON** として表示する。
実装: `resolveNotificationPreference(preferences, key)` が `prefs[key] !== false` を返す純粋関数（`lib/queries/notifications.ts`）。

### 5.3 設定保存（部分更新）

保存タイミング: **トグルを切り替えた瞬間にサーバーへ送信**（明示的な「保存」ボタンなし）。
これは設定系 UI として直感的であり、Web 版の通知設定の方針と合わせる。

```
ユーザーがトグルを切り替え
  → PATCH /api/v1/users/me/notification-settings
    リクエストボディ: { [key]: boolean }（変更したキー 1 つのみ。Partial<NotificationPreferences>）
  → 成功: notifications.settings クエリを invalidate して最新値を再取得する
  → 失敗:
      エラートーストを表示: ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED
        「通知設定の更新に失敗しました。もう一度お試しください。」
```

**（2026-07-13 修正）:** 旧仕様は「楽観更新 → 失敗時ロールバック」という設計だったが、実装は楽観更新を行っていない（`useUpdateNotificationSettingsMutation` は `onSuccess` で `invalidateQueries` するのみ）。スイッチの見た目は `useNotificationSettingsQuery` が返す最新値に追従するため、成功時はサーバー確定値の再取得で反映され、失敗時はサーバー側の値が変わっていないため invalidate 不要でトーストのみ表示する。

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
| エラー（設定取得失敗） | セクション 2 内に `ScreenError` 相当のインライン表示（アイコン + 文言 + 再試行ボタン。画面全体は乗っ取らない）/ セクション 1（既存の Push 許可カード）は通常表示を維持 |
| オフライン | `OfflineBanner` を表示 / セクション 2 は「通知の種類設定を変更するには、インターネット接続が必要です。接続を確認してください。」のインライン案内を表示 / トグルは全て disabled |
| 正常（データあり） | トグル行を表示 |

セクション 1（既存の Push 許可カード）は本拡張で変更しない。

### 6.2 スケルトン構成（セクション 2 用）

```
セクション大見出しエリア:
  [Rect 120x14] / [Rect 200x12]     ← 見出し + 説明

トグル行 × 11:
  [Rect 120x14]  [Rect 44x24]       ← ラベル + スイッチ形状
```

**（2026-07-13 修正）:** 旧仕様にあった「グループ見出し行 × 3」のスケルトンは削除した（グループ見出し自体が存在しないため）。スケルトン自体はラベル矩形のみを表示し、説明文の行までは模擬しない（スケルトンの粒度としては現状で十分と判断。frontend が実装時に説明文用の矩形を追加してもよい）。

### 6.3 オフライン中のインライン案内

```
┌──────────────────────────────────────────────────────────┐
│  通知の種類設定を変更するには、インターネット接続が必要    │
│  です。接続を確認してください。                            │
│                                          textSm / colorTextSecondary
└──────────────────────────────────────────────────────────┘
```

背景: `colorSurfaceKinoko`（`#f0ece4`）/ 角丸: `radiusMd` / padding: `spacing3`。

### 6.4 保存中のフィードバック

明示的な保存状態インジケータは設けない。トグルは `useNotificationSettingsQuery` の最新値を表示し続けるため、保存中も見た目は操作直後の状態のまま変わらない（成功すれば invalidate 後の再取得値と一致し、失敗時はトーストのみで見た目の変化はない）。

---

## 7. コンポーネント分割

新規追加するコンポーネントは `components/settings/` に配置する。

```
SettingsNotificationsScreen（既存画面ルート）
├── [既存セクション 1: Push 許可カード]   ← 変更なし
│
└── NotificationTypeSettings              ← セクション 2 全体を担当
    ├── [ローディング / エラー / オフライン状態を内包]
    └── NotificationToggleRow × 11        ← グループ化せず直接 11 回 map する（詳細 §3.4）
```

> **改訂注記（2026-07-13）:** 旧仕様にあった `NotificationToggleGroup`（グループ見出し + 行のまとまり）は実装されていない。`NotificationTypeSettings` が `NOTIFICATION_PREFERENCE_KEYS` を直接 `map` して `NotificationToggleRow` を並べるフラット構造である。

### NotificationToggleRow props

| prop | 型 | 説明 |
|------|-----|------|
| `notificationKey` | `NotificationPreferenceKey`（`'like' \| 'comment' \| ...`） | 通知の種類キー |
| `label` | `string` | 表示ラベル |
| `value` | `boolean` | 現在の ON/OFF 値 |
| `onToggle` | `(key: NotificationPreferenceKey, value: boolean) => void` | 切替コールバック |
| `isDisabled` | `boolean` | オフライン / ローディング中 / 保存中の無効フラグ |
| `sublabel` | `string \| undefined` | 補足テキスト＝説明文。§4.2 の対応表の値を全 11 行で渡す（**2026-07-13 第2回改訂で「渡さない」運用から「必ず渡す」運用に変更**。§4.2 参照）|
| `isLast` | `boolean \| undefined` | 最終行の場合 `true`（下端ボーダーを非表示にする）|

---

## 8. エラー処理と文言

### 8.1 保存失敗

| エラー | 使用定数 | 文言 |
|--------|---------|------|
| ネットワークエラー / 保存失敗 | `ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED`（`lib/constants/errors.ts` 実装済み）| 「通知設定の更新に失敗しました。もう一度お試しください。」|
| 429（レート制限） | `ERR_RATE_LIMIT` | 「操作が多すぎます。しばらく時間をおいてからお試しください。」|
| 401 | 自動 refresh → ログイン画面（`auth-tokens.md` 準拠） | — |
| オフライン | `ERR_OFFLINE_ACTION` | トグル操作時にオフラインを検知した場合にトースト表示 |

**（2026-07-13 修正）:** 旧仕様が想定していた `ERR_NOTIFICATION_SETTINGS_SAVE_FAILED`（未実装の定数名）を撤回し、実装済みの `ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED` に置き換えた。

### 8.2 設定取得失敗

セクション 2 内にインラインエラーを表示（画面全体を乗っ取らない）:

| 要素 | 仕様 |
|------|------|
| タイトル | 「設定を読み込めませんでした」|
| 補足 | `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED`（`lib/constants/errors.ts` 実装済み）「通知設定を読み込めませんでした。」|
| 再試行ボタン | 高さ 44pt / `colorActionPrimary` / `radiusMd` |

**（2026-07-13 修正）:** 旧仕様の想定文言「通知設定の取得に失敗しました。再試行してください。」を、実装済みの実際の文言「通知設定を読み込めませんでした。」に置き換えた。

---

## 9. コピー案（文言一覧）

### 9.1 セクション

| 箇所 | 文言 |
|------|------|
| セクション大見出し | 「通知の種類」|
| セクション説明 | 「プッシュ通知を受け取る種類を選択できます。」|

### 9.2（撤回）グループ見出し

> **撤回（2026-07-13）:** グループ見出し（「リアクション」「フォロー」「メッセージ」）は実装に存在しないため全行撤回した。§3.4 / §4.1 の改訂注記を参照。

### 9.3 トグル行ラベル・説明文（Web 準拠の並び順）

> **改訂注記（2026-07-13 第2回）:** 説明文（4列目）を新規追加した。正文は §4.2 の対応表と同一（転記元は同じ Web `NOTIFICATION_TYPES` 配列）。
>
> **追記（2026-07-13 第3回改訂）:** 日本語ラベル（3列目）のうち `comment_like` / `quote` / `follow_request_approved` / `message` の 4 件を、Web に完全一致させた実装値へ更新した。詳細は §4.2 参照。

| 順序 | キー | 日本語ラベル | 説明文（新規追加） |
|------|------|------------|------------------|
| 1 | `like` | 「いいね」| 「投稿にいいねされた時」|
| 2 | `comment` | 「コメント」| 「投稿にコメントされた時」|
| 3 | `reply` | 「返信」| 「コメントに返信された時」|
| 4 | `comment_like` | 「コメントいいね」| 「コメントにいいねされた時」|
| 5 | `follow` | 「フォロー」| 「フォローされた時」|
| 6 | `quote` | 「引用投稿」| 「投稿が引用された時」|
| 7 | `follow_request` | 「フォローリクエスト」| 「フォローリクエストを受けた時」|
| 8 | `follow_request_approved` | 「フォロー承認」| 「フォローリクエストが承認された時」|
| 9 | `mention` | 「メンション」| 「投稿やコメントでメンションされた時」|
| 10 | `message` | 「ダイレクトメッセージ」| 「DM を受信した時」|
| 11 | `repost` | 「リポスト」| 「投稿がリポストされた時」|

### 9.4 状態文言

| 場面 | 文言 |
|------|------|
| 設定取得エラー タイトル | 「設定を読み込めませんでした」|
| 設定取得エラー 補足（定数） | `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED`「通知設定を読み込めませんでした。」|
| 設定取得エラー ボタン | 「再試行」|
| 保存失敗トースト（定数） | `ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED`「通知設定の更新に失敗しました。もう一度お試しください。」|
| オフラインインライン案内 | 「通知の種類設定を変更するには、インターネット接続が必要です。接続を確認してください。」|

---

## 10. `lib/constants/errors.ts` の対応する定数（実装済み）

| 定数名 | 文言 | 使用場面 |
|--------|------|---------|
| `ERR_NOTIFICATION_SETTINGS_LOAD_FAILED` | `'通知設定を読み込めませんでした。'` | 設定取得失敗インラインエラー |
| `ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED` | `'通知設定の更新に失敗しました。もう一度お試しください。'` | 保存失敗トースト |

**（2026-07-13 修正）:** 旧仕様は「frontend への依頼事項」として未実装の定数名（`_SAVE_FAILED`）を提案していたが、実装は上記 2 定数（`_LOAD_FAILED` / `_UPDATE_FAILED`）ですでに存在する。今後の変更は実装済みのこの 2 定数を正として扱う。

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| セクション大見出し | `accessibilityRole="header"` |
| トグル行全体 | タップターゲット 64pt（高さ）以上（**2026-07-13 第2回改訂: 52pt → 64pt**。§3.3 参照）|
| 説明文（sublabel）| 通常の `Text` として表示するのみで追加の accessibility props は不要。スクリーンリーダーはラベル → 説明文 → Switch の順に自然に読み上げる（Web の `<p>` 兄弟要素と同じ DOM 順読み上げ方式に相当。Switch の `accessibilityLabel` に説明文を結合する必要はない）|
| Switch（トグル） | React Native の `Switch` は `accessibilityLabel` / `accessibilityState: { checked: value }` を付与 |
| Switch accessibilityLabel | 「{ラベル}の通知」（例:「いいねの通知」）。説明文は含めない（上記の通り別 Text として読み上げられるため）|
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
| Switch の ON 色指定 | `trackColor={{ false: colorSurfaceMuted, true: colorActionPrimary }}` | 同 props + `thumbColor` でサム色を指定 |
| `thumbColor` | 指定不要（iOS は白固定）| ON 時: `colorActionPrimaryText` / OFF 時: `colorSurfaceWashi` |
| セーフエリア | SafeAreaView `edges: ['top']`（既存の設定と同じ）| 同上 |

---

## 13. 使用デザイントークン

| 要素 | トークン |
|------|---------|
| 画面背景 | `colorBackground`（`#ffffff`）（既存のまま）|
| 既存カード（セクション 1） | `colorSurface`（`#fcfcfc`）/ `shadowWashi`（既存のまま）|
| セクション 2 背景 | `colorBackground`（`#ffffff`）（カードなし。フラットなリスト形式）|
| セクション大見出し | `textLg`（17pt）/ `colorTextPrimary` |
| セクション説明 | `textSm`（12pt）/ `colorTextSecondary` |
| トグル行ラベル | `textBase`（14pt）/ `colorTextPrimary` |
| sublabel（補足＝説明文。全 11 行で使用。§4.2）| `textXs`（10pt）/ `colorTextTertiary` |
| 行セパレータ | 1pt / `colorBorderLight`（行自身の下端。最終行のみなし）|
| Switch ON 色 | `colorActionPrimary`（`#2e2e2e`）|
| Switch OFF 色 | `colorSurfaceMuted`（`#f0f0f0`）|
| スケルトン背景 | `colorSurfaceKinoko`（`#f0ece4`）|
| オフライン案内背景 | `colorSurfaceKinoko`（`#f0ece4`）|

---

## 14. 既存との一貫性メモ

| 既存要素 | 本拡張での扱い |
|---------|-------------|
| `app/settings/notifications/index.tsx` 既存実装 | セクション 1（Push 許可カード）のコード・スタイルは一切変更しない。新しい `NotificationTypeSettings` コンポーネントを末尾に追加するのみ |
| 既存の `offlineBanner` スタイル | セクション 2 のオフライン案内でも `colorSurfaceKinoko` + `radiusMd` + `spacing3` の同じパターンを使用する |
| `notifications-screen.md` の `NotificationType` 型 | 本仕様で定義したキーと一致している（13 種から `system` と `subscription_expiring` を除いた 11 種）|
| `settings/blocked/index.tsx` のヘッダー仕様 | ヘッダー（高さ 48pt / `colorSurfaceWashi` / `colorBorderLight` 下端 / letterSpacingWidest）を踏襲 |
| `common-states.md` の OfflineBanner | 既存実装の `isOnline` / `useOnlineStatus` フックと連携し、セクション 2 の無効化とインライン案内を制御する |
| Web `components/settings/NotificationPreferences.tsx` | 通知キーの並び順・11 種構成・グループ見出しなしのフラット表示・各行のラベル表記（2026-07-13 第3回改訂で Web 完全一致を確認）・説明文表示（2026-07-13 第2回改訂で追加）はこの Web 実装に準拠する |

---

## 15. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| API エンドポイント | `GET` / `PATCH` `/api/v1/users/me/notification-settings` | core | **解決済み（2026-07-13）**: `lib/queries/notifications.ts` で実装確認済み |
| 未設定キーのデフォルト | サーバーが未設定キーを省略して返す場合、クライアントで ON 扱いにする（§5.2） | core | **解決済み**: `resolveNotificationPreference` で実装済み |
| `message` キーの sublabel | 「近日公開予定」を表示するか | PM | **解決済み（2026-07-13）**: 表示しない。§4.2 参照 |
| Switch の ON 色 | `colorActionPrimary`（`#2e2e2e` の墨色）は Android の Switch でサム色と混在した際に視認しにくい可能性。実機確認後に `colorSuccess`（`#3a6b42` 緑）への変更を検討してよい | frontend（実機確認後）/ core（トークン変更になる場合）| 未解決 |
| 各トグル行に説明文（description）を表示するか | **解決済み（2026-07-13 第2回改訂）**: 表示する。Web (`NotificationPreferences.tsx`) が全 11 行に一行説明文を表示しているのに対し Native はラベルのみだった乖離を是正し、Web 準拠で 11 行すべてに説明文を追加する。対応表・レイアウト仕様は §4.2・§3.3 参照 | PM | 解決済み（2026-07-13） |
| 4 キーのラベル表記差（`comment_like` / `quote` / `follow_request_approved` / `message`） | **解決済み（2026-07-13 第3回改訂）**: 実装対応でラベルを Web に完全一致させたことを確認した（`comment_like`「コメントいいね」/ `quote`「引用投稿」/ `follow_request_approved`「フォロー承認」/ `message`「ダイレクトメッセージ」）。第2回改訂時点の「ラベル変更は対象外」という記述は撤回し、§4.2 の対応表を是正した | PM | 解決済み（2026-07-13 第3回改訂） |
| 既存セクション 1 との視覚的分離 | セクション 1 とセクション 2 の間に `spacing6`（24pt）の余白を設けるだけで十分か、または区切り線を入れるか | PM | 未解決 |
