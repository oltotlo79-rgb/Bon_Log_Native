# 「もっと見る」画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-20
対象画面: `(tabs)/more/index.tsx`
前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §2.1（5 タブ構成）・§4.2（もっと見る画面概要）に準拠
- `common-states.md` の OfflineBanner を適用する
- `store-compliance.md`（通報・ブロック・課金・アカウント削除の審査要件）を確認済み

---

## 1. 概要・目的

ボトムナビの 5 つ目タブとして「もっと見る」を設け、プロフィール・設定・法的情報・ログアウトへのアクセスをまとめたメニュー画面を提供する。

### 1.1 解決する問題

- 現状、設定へのアクセスはプロフィール画面右上の歯車アイコンのみであり、見つけにくい。
- Web 版の「もっと見る」メニューに相当する入口をモバイルにも設ける。
- MVP スコープ内の機能（プロフィール・設定・法的情報・ログアウト）を 1 か所に集約し、ユーザーが迷わず到達できるようにする。

### 1.2 MVP スコープ外として載せない項目

以下の項目は CLAUDE.md §10 の MVP スコープ外のため、この画面には含めない。将来のフェーズで追加を検討する際はこの仕様を更新すること。

| 項目 | 理由 |
|------|------|
| 発見 | MVP スコープ外 |
| マイ盆栽 | MVP スコープ外 |
| 盆栽園マップ | MVP スコープ外 |
| イベント | MVP スコープ外 |
| ブックマーク | MVP スコープ外 |
| 育成ガイド（農薬・施肥・ホルモン・辞典） | MVP スコープ外 |
| 予約投稿 | MVP スコープ外（プレミアム機能） |
| 分析 | MVP スコープ外（プレミアム機能） |
| メッセージ | MVP スコープ外 |
| 特商法に基づく表記 | MVP スコープ外（必要な場合は Web ページへのリンクとして設定画面経由で追加を検討） |

---

## 2. 画面構成

### 2.1 全体レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ ← [セーフエリア上端]                                         │
│                                                             │
│ [OfflineBanner（オフライン時のみ）]                           │
│                                                             │
│ [タブヘッダー]                                               │
│   中央: 「もっと見る」                                       │
│   高さ: 48pt / 背景: colorSurfaceWashi                      │
│   下端境界: 1pt solid colorBorderLight                       │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ [ScrollView]                                                │
│   padding: spacing4（16pt）/ gap: spacing4 between groups   │
│                                                             │
│   ┌─ グループ 1: ナビゲーション ──────────────────────────┐  │
│   │ [プロフィール]                                  ›   │  │
│   ├─────────────────────────────────────────────────────┤  │
│   │ [設定]                                          ›   │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─ グループ 2: 情報 ─────────────────────────────────┐    │
│   │ [利用規約]                                      ›   │  │
│   ├─────────────────────────────────────────────────────┤  │
│   │ [プライバシーポリシー]                          ›   │  │
│   ├─────────────────────────────────────────────────────┤  │
│   │ [ヘルプ]                                        ›   │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ┌─ グループ 3: 危険ゾーン ───────────────────────────┐    │
│   │ [ログアウト]                           colorError  │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│ ← [セーフエリア下端 + BottomTabBar]                          │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 ヘッダー

- タブヘッダー種別（`navigation-structure.md` §5.1 準拠）
- ヘッダーは `(tabs)/more` のタブ固有ヘッダーとして実装する（スタックヘッダーの「戻る」ボタンは不要）
- タイトル: 「もっと見る」/ `textLg`（17pt / fontWeight: 600）/ `colorTextPrimary` / `letterSpacingWidest`（1.5）/ 中央寄せ

### 2.3 メニューグループのレイアウト詳細

各グループは `settings/index.tsx` と同一の構造を使う:

```
グループコンテナ:
  背景: colorSurface (#fcfcfc)
  角丸: radiusLg (10pt)
  影: shadowWashi
  overflow: hidden（角丸をアイテムに適用するため）

各メニュー行:
  高さ: 最小 44pt（paddingVertical: spacing2（8pt）+ コンテンツで可変）
  paddingHorizontal: spacing4（16pt）
  flexDirection: row / alignItems: center
  区切り線（最終行以外）: borderBottom 1pt solid colorBorderLight

行内レイアウト:
  [左: アイコン 20pt（任意）] [中: テキスト + 説明（flex: 1）] [右: シェブロン ›]
```

---

## 3. メニュー項目詳細

### 3.1 グループ 1: ナビゲーション

#### プロフィール

| 項目 | 内容 |
|------|------|
| ラベル | 「プロフィール」|
| アイコン | `User`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 説明文 | なし |
| 右端 | シェブロン「›」/ `colorTextTertiary` |
| タップ | `router.push(routes.profile)`（`(tabs)/profile` へ遷移） |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「プロフィールを見る」|

**設計メモ:** `(tabs)/profile` はタブとして既に存在するが、「もっと見る」タブがアクティブな状態からワンタップでプロフィールに移動できる導線として設ける。タブを切り替える形ではなく `router.push` でスタック遷移とするか、タブを `router.navigate` で切り替えるかは frontend が実装時に判断する。ユーザーが迷わない動作であれば両方可。

#### 設定

| 項目 | 内容 |
|------|------|
| ラベル | 「設定」|
| アイコン | `Settings`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 説明文 | なし |
| 右端 | シェブロン「›」/ `colorTextTertiary` |
| タップ | `router.push(routes.settings)`（`settings/` スタックへ遷移） |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「設定を開く」|

---

### 3.2 グループ 2: 情報

グループ 2 の 3 項目はすべてアプリ内ブラウザ（`expo-web-browser` の `openBrowserAsync`）で対応する Web ページを開く。

**URL の管理:** URL はハードコードせず `lib/constants/routes.ts` の外部リンク定数（例: `externalLinks.termsOfService` 等）として管理する。**core に要相談:** 各ページの URL を確認すること（`https://www.bon-log.com/terms` 等）。

#### 利用規約

| 項目 | 内容 |
|------|------|
| ラベル | 「利用規約」|
| アイコン | `FileText`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 説明文 | なし |
| 右端 | 外部リンクアイコン `ExternalLink`（Lucide 系）/ 16pt / `colorTextTertiary`（シェブロンの代わりに外部リンクを示す）|
| タップ | `openBrowserAsync(externalLinks.termsOfService)` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「利用規約を開く（外部ブラウザ）」|

#### プライバシーポリシー

| 項目 | 内容 |
|------|------|
| ラベル | 「プライバシーポリシー」|
| アイコン | `Shield`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 説明文 | なし |
| 右端 | `ExternalLink` アイコン / 16pt / `colorTextTertiary` |
| タップ | `openBrowserAsync(externalLinks.privacyPolicy)` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「プライバシーポリシーを開く（外部ブラウザ）」|

#### ヘルプ

| 項目 | 内容 |
|------|------|
| ラベル | 「ヘルプ」|
| アイコン | `HelpCircle`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 説明文 | なし |
| 右端 | `ExternalLink` アイコン / 16pt / `colorTextTertiary` |
| タップ | `openBrowserAsync(externalLinks.help)` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「ヘルプページを開く（外部ブラウザ）」|

---

### 3.3 グループ 3: 危険ゾーン

#### ログアウト

| 項目 | 内容 |
|------|------|
| ラベル | 「ログアウト」（ログアウト処理中は「ログアウト中...」）|
| アイコン | `LogOut`（Lucide 系）/ 20pt / `colorError` |
| 説明文 | なし |
| 右端 | シェブロン「›」/ `colorTextTertiary`（ログアウト中は非表示）|
| テキスト色 | `colorError`（`#c0392b`）|
| 押下時フィードバック | 背景が `colorErrorBg`（`#fdf0ef`）に変化（`durationFast: 200ms`）|
| タップ | 確認ダイアログを表示 → 確認後 `useLogoutMutation` を呼び出す |
| disabled 時 | ログアウト処理中は `opacity: 0.5` + タップ不可 |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「ログアウト」|
| `accessibilityState` | `{ disabled: isLoggingOut }` |

**`settings/index.tsx` との挙動一致:** ログアウトは `settings/index.tsx` の `useLogoutMutation` と同一の挙動にする。確認ダイアログの文言・ボタン構成・ログアウト後の遷移（AuthGuard が login 画面へリダイレクト）もすべて同じとする。

---

## 4. ログアウト確認ダイアログ

### 4.1 仕様

`settings/index.tsx` で実装済みの `Alert.alert()` を踏襲する（カスタムモーダル不要。テキスト量が少なくネイティブの Alert で収まる）。

```
タイトル : 「ログアウト」
メッセージ: 「ログアウトしますか？」
ボタン 1  : 「キャンセル」/ style: cancel
ボタン 2  : 「ログアウト」/ style: destructive → useLogoutMutation を呼び出す
```

**iOS / Android 差異:**
- iOS: `Alert.alert()` は画面中央のモーダルダイアログとして表示される。ボタンは縦並び（destructive が下）。
- Android: `Alert.alert()` はダイアログとして表示される。ボタンは右寄せの横並び（キャンセルが左、ログアウトが右）。

### 4.2 ログアウト後の挙動

`auth-tokens.md` §ログアウト の手順に完全に従う:

1. サーバーへ logout を送信（リフレッシュトークンの失効）
2. expo-secure-store からトークンを削除
3. `queryClient.clear()` でサーバー状態を全消去
4. Push のデバイストークン登録を解除
5. AuthGuard が login 画面へリダイレクト

サーバー呼び出しが失敗してもローカルのトークン削除と画面遷移は必ず実施する（fail-safe）。

---

## 5. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `(tabs)/more`（ボトムタブの 5 番目）|
| 遷移元 | ボトムタブバーの「もっと見る」タップ |
| 遷移先（プロフィール） | `(tabs)/profile`（タブ切り替えまたは push）|
| 遷移先（設定） | `settings/`（タブ外スタックへ push）|
| 遷移先（利用規約・PP・ヘルプ） | アプリ内ブラウザ（`expo-web-browser`）|
| 遷移先（ログアウト後） | `(auth)/login`（AuthGuard によるリダイレクト）|
| ディープリンク | 不要 |

---

## 6. コンポーネント分割

```
MoreScreen                    ← (tabs)/more 画面
├── MoreMenuGroup             ← グループコンテナ（背景・角丸・影の共通スタイル）
│   └── MoreMenuItem          ← 各メニュー行（アイコン・ラベル・説明・右端要素）
└── LogoutConfirmAlert        ← ログアウト確認ダイアログのロジック（Alert.alert() ラッパー）
```

### 6.1 MoreMenuGroup props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `children` | `ReactNode` | グループ内の MoreMenuItem |

### 6.2 MoreMenuItem props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `label` | `string` | 表示ラベル（必須）|
| `icon` | `ReactNode` | 左端アイコン（任意）|
| `description` | `string` | 説明文（任意）|
| `rightElement` | `"chevron" \| "external" \| "none"` | 右端要素の種別（デフォルト: `"chevron"`）|
| `onPress` | `() => void` | タップコールバック（必須）|
| `destructive` | `boolean` | 赤系スタイルを適用するか（デフォルト: `false`）|
| `disabled` | `boolean` | タップ不可かつ opacity: 0.5（デフォルト: `false`）|

**既存コンポーネントとの関係:** `settings/index.tsx` に `SettingItem` 型と類似した構造があるが、`MoreMenuItem` は独立したコンポーネントとして定義する。将来的に `settings/index.tsx` と共通化を検討する場合は `components/common/MenuGroup` / `components/common/MenuItem` として抽出することを推奨するが、それは frontend が実装時に判断する。

---

## 7. 状態とインタラクション

### 7.1 ローディング

静的メニューのためデータ取得は行わない。ローディング状態は存在しない。

ただし「ログアウト」実行中（`isLoggingOut === true`）は：
- 「ログアウト」行のラベルを「ログアウト中...」に変更する
- 「ログアウト」行を `disabled` にする（`opacity: 0.5` / タップ不可）
- シェブロンを非表示にする

### 7.2 タップフィードバック

- 全行: `TouchableOpacity`（Android: `TouchableNativeFeedback` でリップルエフェクト可）
- 押下時は `activeOpacity: 0.7`
- 「ログアウト」行は押下時に `colorErrorBg` へ背景変化（`durationFast: 200ms`）

### 7.3 アプリ内ブラウザ（情報グループ）

- `expo-web-browser` の `openBrowserAsync` を使用する
- ブラウザが開かない場合（URL が無効・端末の制限等）: エラーをサイレントにキャッチし、Sentry に送信する。ユーザーへのフィードバックは不要（UI 上でエラーは出さない）

---

## 8. エッジケース

### 8.1 ローディング

静的メニューのため、該当しない（§7.1 参照）。

### 8.2 空状態

静的メニューのため、該当しない。

### 8.3 エラー

| エラー種別 | 対応 |
|-----------|------|
| ログアウト API 失敗 | fail-safe としてローカルのトークン削除と画面遷移を実行する（`auth-tokens.md` 準拠）。ユーザーへのエラー表示は行わない（AuthGuard がログイン画面へ誘導するため） |
| アプリ内ブラウザ起動失敗 | サイレントにキャッチして Sentry に送信する。ユーザー向けエラーは表示しない |
| 外部リンク URL 未設定 | `lib/constants/routes.ts` の外部リンク定数が空文字の場合、該当行を `disabled` にする |

### 8.4 オフライン

- `OfflineBanner` を画面上部に表示する（`common-states.md` §5 準拠）。
- 静的メニュー自体は引き続き操作可能（プロフィール・設定への遷移は可能）。
- アプリ内ブラウザを開こうとした場合: ブラウザ側がエラーを処理するためアプリ側では特別な対応をしない。
- ログアウト: オフライン中でもログアウトは実行可能にする（サーバーへの logout 送信が失敗しても fail-safe でローカルのトークン削除と画面遷移を実行する）。

---

## 9. コピー案（文言一覧）

| 箇所 | 文言 |
|------|------|
| タブラベル | 「もっと見る」|
| ヘッダータイトル | 「もっと見る」|
| グループ 1 ラベル（セクション見出しはなし） | — |
| 「プロフィール」行 | 「プロフィール」|
| 「設定」行 | 「設定」|
| グループ 2 ラベル | — |
| 「利用規約」行 | 「利用規約」|
| 「プライバシーポリシー」行 | 「プライバシーポリシー」|
| 「ヘルプ」行 | 「ヘルプ」|
| グループ 3 ラベル | — |
| 「ログアウト」行（通常時）| 「ログアウト」|
| 「ログアウト」行（処理中）| 「ログアウト中...」|
| ログアウト確認ダイアログ タイトル | 「ログアウト」|
| ログアウト確認ダイアログ メッセージ | 「ログアウトしますか？」|
| ログアウト確認ダイアログ キャンセル | 「キャンセル」|
| ログアウト確認ダイアログ 実行 | 「ログアウト」|

**グループ見出し（セクションラベル）について:** `settings/index.tsx` の既存実装にはグループ見出しがなく、グループ間の余白のみで区切っている。`more-menu.md` の画面もこれに合わせてグループ見出しテキストは出さない。グループの視覚的区切りは `spacing4` の gap のみとする。

---

## 10. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 全メニュー行 | `accessibilityRole="button"` |
| 「プロフィール」行 | `accessibilityLabel="プロフィールを見る"` |
| 「設定」行 | `accessibilityLabel="設定を開く"` |
| 「利用規約」行 | `accessibilityLabel="利用規約を開く（外部ブラウザ）"` |
| 「プライバシーポリシー」行 | `accessibilityLabel="プライバシーポリシーを開く（外部ブラウザ）"` |
| 「ヘルプ」行 | `accessibilityLabel="ヘルプページを開く（外部ブラウザ）"` |
| 「ログアウト」行 | `accessibilityLabel="ログアウト"` / `accessibilityState: { disabled: isLoggingOut }` |
| ログアウト中スピナー | `accessibilityLabel="ログアウト中"` / `accessibilityRole="progressbar"` |
| アイコン（装飾目的） | `accessibilityElementsHidden={true}` / `importantForAccessibility="no"` |
| タップターゲット | 全行 `minHeight: 44pt` を確保 |
| コントラスト | 通常テキスト: `colorTextPrimary`（`#1a1a1a`）on `colorSurface`（`#fcfcfc`）= 17.4:1（AAA 達成）/ ログアウトテキスト: `colorError`（`#c0392b`）on `colorSurface`（`#fcfcfc`）= 4.8:1（AA 達成）|

---

## 11. 使用トークン一覧

| 要素 | トークン | hex 値 |
|------|---------|--------|
| 画面背景 | `colorBackground` | `#ffffff` |
| グループ背景 | `colorSurface` | `#fcfcfc` |
| ヘッダー背景 | `colorSurfaceWashi` | `#f7f7f7` |
| グループ角丸 | `radiusLg` | 10pt |
| グループ影 | `shadowWashi` | （design-tokens.md §6 参照）|
| 行の区切り線 | `colorBorderLight` | `#e2e2e2` |
| ヘッダー下境界 | `colorBorderLight` | `#e2e2e2` |
| ヘッダータイトル | `colorTextPrimary` | `#1a1a1a` |
| メニューラベル | `colorTextPrimary` | `#1a1a1a` |
| アイコン色（通常）| `colorTextSecondary` | `#5c5c5c` |
| シェブロン / 外部リンクアイコン | `colorTextTertiary` | `#8a8a8a` |
| ログアウトラベル / アイコン | `colorError` | `#c0392b` |
| ログアウト押下背景 | `colorErrorBg` | `#fdf0ef` |
| スクロール余白 | `spacing4` | 16pt |
| グループ間余白 | `spacing4` | 16pt |
| 行の水平パディング | `spacing4` | 16pt |
| 行の垂直パディング | `spacing2` | 8pt |
| テキストスタイル（ラベル）| `textBase` | 14pt / lineHeight 22pt |
| テキストスタイル（ヘッダー）| `textLg` | 17pt / fontWeight 600 |
| 字間（ヘッダー）| `letterSpacingWidest` | 1.5 |

---

## 12. store-compliance.md との対応確認

「もっと見る」画面自体は通報・ブロック・課金に関わる画面ではないが、以下を確認した。

| 要件 | 対応状況 |
|------|---------|
| 外部決済ページへの誘導禁止 | この画面に Stripe などの外部決済ページへのリンクは一切存在しない |
| 通報・ブロック UI の露出 | 「もっと見る」画面には含まない。通報・ブロックは `users/[id]` と `posts/[id]` で提供（`ugc-safety.md` 参照）|
| アカウント削除導線 | 「もっと見る」画面には含まない。「設定」→ `settings/account` の導線で到達できる |
| 購入の復元 | 「もっと見る」画面には含まない。「設定」→ `settings/subscription` の導線で到達できる |
| ログアウト | 「もっと見る」画面からもログアウト可能にすることは審査上問題なし |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `settings/index.tsx` のグループリスト UI | グループコンテナ（`colorSurface` / `radiusLg` / `shadowWashi`）・行スタイル（高さ・パディング・シェブロン）・ログアウト確認ダイアログを完全に踏襲する |
| `settings/index.tsx` の `useLogoutMutation` | `(tabs)/more` でも同一のミューテーションフックを使用する |
| `settings/index.tsx` の `SettingItem` 型 | `MoreMenuItem` は独立定義だが、構造は `SettingItem` に準ずる（`label` / `onPress` / `destructive` / `disabled`）|
| `navigation-structure.md` §2.1（タブ一覧）| `(tabs)/more` を 5 番目タブとして追記済み |
| `navigation-structure.md` §2.2（BottomTabBar 仕様）| タップターゲット幅を `1/5 画面幅` に更新済み |
| `common-states.md` §5（OfflineBanner）| オフライン時に画面上部に表示する。他の (tabs) 画面と同一の実装パターン |
| `design-tokens.md` §8（BottomTabBar トークン）| アイコン・ラベル色は既存定義どおり。5 タブ対応の実装変更は frontend が `(tabs)/_layout.tsx` で行う |

**設定画面との重複について:** 設定画面（`settings/index.tsx`）には利用規約・プライバシーポリシー・ヘルプ・ログアウトが存在する。「もっと見る」画面の同項目は**重複導線として意図的に設ける**。設定画面を削除または変更する必要はない。

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| 外部リンク URL | 利用規約・プライバシーポリシー・ヘルプの各ページ URL（`https://www.bon-log.com/terms` 等）| core（要確認）|
| `expo-web-browser` の採用 | アプリ内ブラウザとして `expo-web-browser` を想定しているが、Web View 画面（スタック遷移）として実装する選択肢もある。UX の観点では `expo-web-browser` がシンプルだが、frontend が実装時に選択してよい | frontend |
| 「プロフィール」行のナビゲーション方式 | `router.push`（スタック遷移）か `router.navigate`（タブ切り替え）かは frontend が実装時に判断する。ユーザーにとって自然な動作であれば両方可 | frontend |
| アイコンライブラリ | Lucide 系として仕様を記述しているが、既存の `Ionicons`（`app/(tabs)/profile/index.tsx` で使用）と統一するか確認が必要 | frontend |
| グループ見出しテキストの追加 | 現状はグループ見出しなし（`settings/index.tsx` に合わせた）。将来的に項目が増えた場合に見出しを追加するかは PM が判断する | PM |
