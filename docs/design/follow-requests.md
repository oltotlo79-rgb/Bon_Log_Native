# フォローリクエスト管理画面仕様 — Bon_Log Native

作成日: 2026-06-23
前提: `design-tokens.md` / `navigation-structure.md` / `common-states.md` / `notifications-screen.md` / `ugc-safety.md` / `follow-and-engagement.md` に準拠
API: `GET /api/v1/follow-requests`（カーソルベース）/ `POST /api/v1/follow-requests/{id}/approve` / `DELETE /api/v1/follow-requests/{id}` — 正本は OpenAPI。core に要確認。
関連画面: `(tabs)/notifications`（follow_request 通知からの遷移元）/ `settings/blocked` / `settings/muted`（同パターンのリスト画面）

---

## 1. 概要・目的

非公開アカウント設定にしたユーザーが受信したフォローリクエストを一覧で確認し、承認または拒否を行う専用画面。
通知一覧の `follow_request` 通知タップで自然に到達できる主要導線と、設定画面 / プロフィール画面からの常時アクセス導線の両方を提供する。

---

## 2. ナビゲーション

### 2.1 画面の配置

`settings/follow-requests` として `settings/` スタックに配置する。

```
app/
└── settings/
    └── follow-requests/
        └── index.tsx     ← 本画面
```

タブ外のスタック画面として積む（`navigation-structure.md` §4.3 のパターン）。BottomTabBar は表示しない。

### 2.2 遷移元

| 遷移元 | 操作 | 補足 |
|--------|------|------|
| 通知画面 `(tabs)/notifications` | `follow_request` 種別の通知をタップ | **主要導線**。`notifications-screen.md` §6.1 の遷移先を `settings/follow-requests` に更新する |
| 設定画面 `settings/index` | 「フォローリクエスト」行をタップ | 後述の §2.4 参照 |
| 自分のプロフィール画面 `(tabs)/profile` | ヘッダー右アクション「リクエスト（N件）」バッジをタップ | 後述の §2.5 参照 |

### 2.3 ナビゲーション仕様

| 項目 | 内容 |
|------|------|
| ヘッダー種別 | スタックヘッダー（`navigation-structure.md` §5.1 参照） |
| 左要素 | 「← 戻る」（iOS: "<" / Android: "←"、44pt タップターゲット） |
| 中央 | 「フォローリクエスト」 |
| 右要素 | なし |
| ディープリンク | `bonlog://settings/follow-requests`。Push 通知の `follow_request` 種別でも遷移可（`lib/push/` の対応表に追記） |
| 戻り先 | 遷移元に応じた前の画面 |

### 2.4 設定画面への追加項目

`settings/index`（設定トップ）に「フォローリクエスト」行を追加する。
配置位置は「ブロックリスト」「ミュートリスト」と同じグループ（UGC 管理グループ）に加える。

```
[グループリスト]
  プロフィール設定
  アカウント設定
  通知設定
  プレミアムプラン
  ブロックリスト
  ミュートリスト
  フォローリクエスト   ← 追加（非公開アカウントのみ表示すると導線が分断されるため、全ユーザーに表示。空状態で「リクエストはありません」を出せばよい）
  ヘルプ
  ...
```

未読リクエスト数がある場合は行の右端にバッジ（赤 / `colorError`）を表示することを推奨するが、バッジ表示の要否は PM に要判断。

### 2.5 プロフィール画面への導線（推奨）

`(tabs)/profile` のナビゲーションヘッダー右側に、未処理リクエスト数 > 0 の場合のみ「リクエスト {N}件」バッジボタンを表示する。
タップで `settings/follow-requests` へ遷移する。

```
ヘッダー: [アイコン] フォローリクエスト（N件） ← 右端 / textSm / colorError
```

この導線は PM と frontend の合意が取れた場合に実装する。本設計では推奨にとどめる。

---

## 3. 画面構成

### 3.1 全体レイアウト

```
┌────────────────────────────────────────────────────────────┐
│  [セーフエリア上端]                                         │
│                                                            │
│  [OfflineBanner（オフライン時のみ）]                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [← 戻る]        フォローリクエスト                   │  │  ← スタックヘッダー / 高さ 48pt
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │  ← FlatList
│  │                                                      │  │
│  │  [行 1]                                              │  │
│  ├──────────────────────────────────────────────────────┤  │  ← セパレータ 1pt colorBorderLight
│  │  [行 2]                                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │  ...                                                 │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ページ末尾: スピナー / 終端テキスト]                      │
│                                                            │
│  [セーフエリア下端]                                         │
└────────────────────────────────────────────────────────────┘
```

### 3.2 リクエスト行のレイアウト

各行の高さ: 最小 72pt。コンテンツが増えた場合は可変。

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [アバター 44pt]  {ニックネーム}                            │  ← textBase / colorTextPrimary / fontWeight: 600
│  +bio プレビュー  @{ユーザー識別子}                         │  ← textSm / colorTextSecondary
│                   {自己紹介（1行省略）}                     │  ← textSm / colorTextTertiary / ellipsizeMode: "tail"
│                                                             │
│                   [承認] [拒否]                             │  ← 右端に縦並びまたは横並び
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**ボタン配置の方針:**

日本語のボタンラベルは短いため横並び（`flexDirection: "row"` / `gap: spacing2`）を推奨する。行幅に収まらない場合は縦並びにフォールバックする。

```
横並び（推奨）:
  [承認]  [拒否]

縦並び（フォールバック）:
  [承認]
  [拒否]
```

### 3.3 アバター仕様

`ugc-safety.md` の `BlockedUserListItem` と同じパターンを踏襲する。

| 属性 | 値 |
|------|---|
| サイズ | 44pt × 44pt |
| 角丸 | `radiusFull` |
| ボーダー | 1.5pt solid `colorBorder` |
| フォールバック | `colorSurfaceMuted` 背景 + ユーザーアイコン |
| コンポーネント | expo-image（`components.md` 準拠） |
| accessibilityLabel | 「{nickname}のプロフィール画像」 |

### 3.4 「承認」ボタン仕様

| 属性 | 値 |
|------|---|
| ラベル | 「承認」 |
| 背景 | `colorActionPrimary`（`#2e2e2e`）|
| テキスト | `colorActionPrimaryText`（`#ffffff`）/ `textSm`（12pt）/ fontWeight: 600 |
| 角丸 | `radiusMd`（8pt） |
| 高さ | 36pt（hitSlop: `{ top: 4, bottom: 4, left: 8, right: 8 }` で 44pt 以上確保） |
| 幅 | 最小 56pt |
| 処理中 | スピナーを表示（ボタン幅を保ったまま）/ disabled |

### 3.5 「拒否」ボタン仕様

| 属性 | 値 |
|------|---|
| ラベル | 「拒否」 |
| 背景 | `colorBackground`（`#ffffff`） |
| テキスト | `colorTextSecondary`（`#5c5c5c`）/ `textSm`（12pt）/ fontWeight: 600 |
| 枠線 | 1pt solid `colorBorder`（`#c8c8c8`） |
| 角丸 | `radiusMd`（8pt） |
| 高さ | 36pt（hitSlop で 44pt 以上確保） |
| 幅 | 最小 56pt |
| 処理中 | スピナーを表示 / disabled |

### 3.6 ページ末尾

```
┌───────────────────────────────────────────────────────────┐
│  [スピナー] 読み込み中...                                  │  ← 追加フェッチ中
│  または                                                    │
│  これ以上リクエストはありません                            │  ← 終端到達時
└───────────────────────────────────────────────────────────┘
```

---

## 4. コンポーネント分割

```
FollowRequestsScreen           ← 画面ルート。TanStack Query フック統合
├── FollowRequestListItem      ← 1 件のリクエスト行（memo 化）
│   ├── FollowRequestAvatar    ← アバター（既存 Avatar コンポーネントを流用可能か確認）
│   ├── FollowRequestUserInfo  ← ニックネーム / ユーザー識別子 / bio
│   └── FollowRequestActions   ← 承認・拒否ボタン
├── ScreenLoading              ← variant="skeleton" / skeletonCount=4（共通）
├── ScreenEmpty                ← 空状態（共通）
├── ScreenError                ← エラー状態（共通）
└── OfflineBanner              ← オフライン時（共通）
```

### FollowRequestListItem props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `request` | `FollowRequestItem` | API レスポンスの 1 件分（後述 §5.3 参照） |
| `onApprove` | `(requestId: string) => void` | 承認ボタンタップ時のコールバック |
| `onDecline` | `(requestId: string) => void` | 拒否ボタンタップ時のコールバック |
| `isApproving` | `boolean` | この行の承認処理中フラグ |
| `isDeclining` | `boolean` | この行の拒否処理中フラグ |

### FollowRequestActions props 概要

| prop | 型 | 説明 |
|------|-----|------|
| `requestId` | `string` | リクエスト ID |
| `onApprove` | `() => void` | 承認コールバック |
| `onDecline` | `() => void` | 拒否コールバック |
| `isApproving` | `boolean` | 承認処理中 |
| `isDeclining` | `boolean` | 拒否処理中 |

---

## 5. データの流れ

### 5.1 リクエスト一覧取得

- `GET /api/v1/follow-requests`（Bearer 必須 / カーソルベース）
- `useInfiniteQuery` + `getNextPageParam: (lastPage) => lastPage.nextCursor`
- ページサイズ: `FOLLOW_REQUESTS_PAGE_SIZE` 定数（`lib/constants/limits/` に配置）
- `staleTime`: `STALE_TIME_SHORT_MS`（短め設定。リクエストは高頻度で変化しうるため）

core に要確認: エンドポイント名・レスポンス形状・ページネーション仕様。

### 5.2 承認・拒否の操作フロー

#### 承認

```
「承認」ボタンをタップ
  → その行の isApproving を true にする（連打防止）
  → POST /api/v1/follow-requests/{id}/approve
  → 成功:
      その行をリストから即時除去（楽観的 UI）
      成功トーストを表示:「@{nickname} のフォローリクエストを承認しました」
      follow-requests クエリを invalidate（サーバー側の残件数と同期）
  → 失敗:
      isApproving を false に戻す（ボタンを re-enable）
      エラートーストを表示（§7 参照）
```

#### 拒否

```
「拒否」ボタンをタップ
  → その行の isDeclining を true にする
  → DELETE /api/v1/follow-requests/{id}（または専用の decline エンドポイント — core に要確認）
  → 成功:
      その行をリストから即時除去
      成功トーストを表示:「@{nickname} のフォローリクエストを拒否しました」
      follow-requests クエリを invalidate
  → 失敗:
      isDeclining を false に戻す
      エラートーストを表示（§7 参照）
```

行の即時除去は、承認 / 拒否どちらの場合も完了したリクエストをリストに残さないための UX 設計。実装は `queryClient.setQueryData` でローカルキャッシュを更新するか、invalidate で再フェッチするかは frontend の判断に委ねる。

### 5.3 FollowRequestItem 型定義（想定）

```
FollowRequestItem:
  id: string                      ← リクエスト ID
  requesterId: string             ← リクエスト送信者のユーザー ID
  createdAt: string               ← ISO 8601
  requester:
    id: string
    nickname: string
    userIdentifier: string
    avatarUrl: string | null
    bio: string | null            ← 1行省略表示に使用
```

正本は OpenAPI スペック（core に要確認）。

### 5.4 pull-to-refresh

引き下げで `refetch()`（最初のページの再取得）。`RefreshControl` / `colorActionPrimary`。

### 5.5 無限スクロール

リスト末尾付近（残り 3 件程度）で `fetchNextPage` を呼び出す。
追加フェッチ中はリスト末尾にスピナーを表示する。

### 5.6 invalidation 方針

| ミューテーション | invalidate するクエリキー |
|-----------------|--------------------------|
| 承認 | `follow-requests.incoming` / `users.followers`（自分のフォロワーリスト）/ 通知既読化に影響するなら `notifications` |
| 拒否 | `follow-requests.incoming` |

`lib/queries/invalidation-map.md` への追記を frontend に依頼する。

---

## 6. 状態とインタラクション

### 6.1 4 状態の定義

| 状態 | 表示 |
|------|------|
| ローディング | `FollowRequestListItemSkeleton` × 4（アバター円 + 矩形 3 本 + ボタン 2 本）/ `common-states.md §2` に準拠 |
| 空 | `ScreenEmpty` / icon: UserCheck 系 / 見出し:「承認待ちのフォローリクエストはありません」/ 補足:「フォローリクエストが届くとここに表示されます」/ アクション: なし |
| エラー | `ScreenError` / title:「読み込めませんでした」/ description: `ERR_FOLLOW_REQUESTS_LOAD_FAILED`（新規 — §9）/ onRetry: refetch |
| オフライン | `OfflineBanner` + キャッシュデータがあればリスト表示（キャッシュなし: `ScreenError` で `ERR_OFFLINE_ACTION`）|

### 6.2 スケルトン構成（FollowRequestListItemSkeleton）

```
┌──────────────────────────────────────────────────────────────┐  padding: spacing4
│  [Circle 44x44]   [Rect 120x14]   [Rect 56x28]  [Rect 56x28]│  ← アバター + ニックネーム + ボタン2つ
│  +border          [Rect 80x12]                               │  ← ユーザー識別子行
│                   [Rect 140x12]                              │  ← bio 行
└──────────────────────────────────────────────────────────────┘
```

シマーアニメーション: `useNativeDriver: true` / `durationSlow: 500ms`。

### 6.3 行タップの挙動

行全体（ボタン以外の領域）をタップすると、リクエスト送信者のプロフィール画面 `users/{requesterId}` へ遷移する。
ボタン（承認 / 拒否）のタップイベントは行タップとは独立して処理する（イベントバブリングを防ぐ）。

### 6.4 連打防止の方針

`isApproving` / `isDeclining` フラグを行単位で管理する。
ある行の処理中は、その行のボタンのみを disabled にする（他の行は操作可能のまま）。
`Set<string>` で処理中の行 ID を管理するパターン（`settings/blocked/index.tsx` の `unblockingIds` と同一の実装パターン）。

---

## 7. エラー時のトーストと文言

| エラー | 使用定数 | 文言 |
|--------|---------|------|
| 承認失敗（ネットワーク） | `ERR_FOLLOW_REQUEST_APPROVE_FAILED`（新規）| 「承認に失敗しました。もう一度お試しください。」|
| 拒否失敗（ネットワーク） | `ERR_FOLLOW_REQUEST_DECLINE_FAILED`（新規）| 「拒否に失敗しました。もう一度お試しください。」|
| 429（レート制限） | `ERR_RATE_LIMIT` | 「操作が多すぎます。しばらく時間をおいてからお試しください。」|
| 404（リクエストが存在しない） | `ERR_FOLLOW_REQUEST_NOT_FOUND`（新規）| 「リクエストが見つかりません。すでに処理されている可能性があります。」|
| 403（権限なし） | `ERR_FORBIDDEN` | 「この操作を行う権限がありません。」|
| オフライン | `ERR_OFFLINE_ACTION` | 「現在オフライン中のため、この操作はできません。接続を確認してください。」|

---

## 8. コピー案（文言一覧）

| 場面 | 文言 |
|------|------|
| ヘッダータイトル | 「フォローリクエスト」|
| 承認ボタン | 「承認」|
| 拒否ボタン | 「拒否」|
| 承認中ボタン（スピナー時の accessibilityLabel） | 「承認中...」|
| 拒否中ボタン（スピナー時の accessibilityLabel） | 「拒否中...」|
| 空状態 見出し | 「承認待ちのフォローリクエストはありません」|
| 空状態 補足 | 「フォローリクエストが届くとここに表示されます」|
| エラー タイトル | 「読み込めませんでした」|
| エラー 補足（定数）| `ERR_FOLLOW_REQUESTS_LOAD_FAILED`「フォローリクエストの取得に失敗しました。もう一度お試しください。」|
| 追加フェッチ中 | 「読み込み中...」（スピナーと併用）|
| 終端 | 「これ以上リクエストはありません」|
| 承認成功トースト | 「@{nickname} のフォローリクエストを承認しました」|
| 拒否成功トースト | 「@{nickname} のフォローリクエストを拒否しました」|
| 承認失敗トースト | 「承認に失敗しました。もう一度お試しください。」|
| 拒否失敗トースト | 「拒否に失敗しました。もう一度お試しください。」|

---

## 9. `lib/constants/errors.ts` に必要な新規定数

frontend への依頼事項として以下を追加する。

| 定数名 | 文言 | 使用場面 |
|--------|------|---------|
| `ERR_FOLLOW_REQUESTS_LOAD_FAILED` | `'フォローリクエストの取得に失敗しました。もう一度お試しください。'` | 一覧取得失敗 |
| `ERR_FOLLOW_REQUEST_APPROVE_FAILED` | `'承認に失敗しました。もう一度お試しください。'` | 承認操作失敗トースト |
| `ERR_FOLLOW_REQUEST_DECLINE_FAILED` | `'拒否に失敗しました。もう一度お試しください。'` | 拒否操作失敗トースト |
| `ERR_FOLLOW_REQUEST_NOT_FOUND` | `'リクエストが見つかりません。すでに処理されている可能性があります。'` | 404 時のトースト |

---

## 10. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| リクエスト行全体（ボタン以外） | `accessibilityRole="button"` / `accessibilityLabel`: 「{nickname} のプロフィールを表示する」|
| アバター | `accessibilityRole="image"` / `accessibilityLabel`: 「{nickname} のプロフィール画像」/ フォールバック時は「プロフィール画像なし」|
| 承認ボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「{nickname} のフォローリクエストを承認する」/ 処理中: `accessibilityState: { busy: true, disabled: true }` |
| 拒否ボタン | `accessibilityRole="button"` / `accessibilityLabel`: 「{nickname} のフォローリクエストを拒否する」/ 処理中: `accessibilityState: { busy: true, disabled: true }` |
| スケルトン | `accessibilityElementsHidden={true}` |
| ページ末尾スピナー | `accessibilityLabel="読み込み中"` |
| ページ終端テキスト | `accessibilityRole="text"` |

タップターゲット: ボタンは `hitSlop` で 44pt 以上確保。行全体は最小 72pt の高さで自然に 44pt 以上。

---

## 11. iOS / Android 差異

| 差異点 | iOS | Android |
|--------|-----|---------|
| 戻るボタン | ヘッダー左の "<" テキスト + 左端スワイプジェスチャー | ヘッダー左の "←" + ハードウェアバックボタン |
| RefreshControl のカラー | `tintColor: colorActionPrimary` | `colors: [colorActionPrimary]` |
| スピナー（処理中） | `ActivityIndicator`（iOS スタイル）| `ActivityIndicator`（Android スタイル）|

いずれも `Platform.OS` 分岐なしで React Native の標準コンポーネントで対応できる（`navigation-structure.md` §5.2 準拠）。

---

## 12. 使用デザイントークン

| 要素 | トークン |
|------|---------|
| 画面背景 | `colorBackground`（`#ffffff`） |
| ヘッダー背景 | `colorSurfaceWashi`（`#f7f7f7`） |
| ヘッダー下端 | 1pt solid `colorBorderLight`（`#e2e2e2`）|
| 行背景 | `colorBackground`（`#ffffff`）|
| セパレータ | 1pt / `colorBorderLight`（`#e2e2e2`）|
| ニックネーム | `textBase`（14pt）/ `colorTextPrimary` / fontWeight: 600 |
| ユーザー識別子 | `textSm`（12pt）/ `colorTextSecondary` |
| bio | `textSm`（12pt）/ `colorTextTertiary` |
| 承認ボタン背景 | `colorActionPrimary`（`#2e2e2e`）|
| 承認ボタンテキスト | `colorActionPrimaryText`（`#ffffff`）|
| 拒否ボタン背景 | `colorBackground`（`#ffffff`）|
| 拒否ボタンテキスト | `colorTextSecondary`（`#5c5c5c`）|
| 拒否ボタン枠 | 1pt solid `colorBorder`（`#c8c8c8`）|
| スケルトン背景 | `colorSurfaceMuted`（`#f0f0f0`）|
| pull-to-refresh | `colorActionPrimary`（`#2e2e2e`）|
| フッタースピナー | `colorActionPrimary`（`#2e2e2e`）|
| フッターテキスト | `textSm`（12pt）/ `colorTextSecondary` |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本画面での扱い |
|---------|-------------|
| `settings/blocked/index.tsx` の FlatList + 行アクション構造 | 同一パターンを踏襲する（リスト・セパレータ・フッターローダー・終端テキスト・RefreshControl）|
| `settings/muted/index.tsx` の `unblockingIds: Set<string>` による連打防止 | `approvingIds: Set<string>` / `decliningIds: Set<string>` として同パターンを適用 |
| `common-states.md` の ScreenLoading / ScreenEmpty / ScreenError / OfflineBanner | 同一仕様で使用 |
| `notifications-screen.md` §6.1 の `follow_request` 遷移先 | 「MVP スコープ外のため `users/{actorId}` 代替」としていたが、本画面追加により `settings/follow-requests` に更新する。`notifications-screen.md` §6.1 の表の更新を frontend に依頼する |
| `ugc-safety.md` §8.2 の `BlockedUserListItem` props 構成 | props 構成の命名方針を踏襲する |
| Toast コンポーネント | 既存の `Toast` コンポーネント（`components/common/Toast`）を使用する |

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| API エンドポイント | `GET /api/v1/follow-requests` / 承認 `POST` / 拒否 `DELETE` のパスとレスポンス形状 | core（最優先） |
| 拒否の HTTP メソッド | `DELETE /api/v1/follow-requests/{id}` か専用の `POST .../decline` か | core |
| リクエスト数バッジ | 設定画面の「フォローリクエスト」行 / プロフィールヘッダーに未処理件数バッジを出すか | PM |
| プロフィール画面への導線 | §2.5 のヘッダーバッジボタンを実装するか | PM |
| 承認後の行挙動 | 即時除去（現方針）か、「フォロー中」ラベルに変化させてから除去か | PM |
| `notifications-screen.md` の更新 | §6.1 の `follow_request` 遷移先を `settings/follow-requests` に変更する（本画面の実装前に notifications-screen.md を更新すること）| frontend |
| `navigation-structure.md` の更新 | `settings/follow-requests` をスタック構成の表に追記する | frontend |
