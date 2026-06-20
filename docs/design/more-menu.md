# 「もっと見る」画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-20
更新日: 2026-06-20（Web 版「もっと見る」と項目構成を一致させる改訂）
対象画面: `(tabs)/more/index.tsx`
前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §2.1（5 タブ構成）・§4.2（もっと見る画面概要）に準拠
- `common-states.md` の OfflineBanner を適用する
- `store-compliance.md`（通報・ブロック・課金・アカウント削除の審査要件）を確認済み

---

## 1. 概要・目的

ボトムナビの 5 つ目タブとして「もっと見る」を設け、アプリ内のすべての機能とコンテンツへのアクセス入口を 1 画面にまとめる。

Web 版の「もっと見る」ドロップアップメニューと項目構成を一致させることで、Web・アプリ間のナビゲーション体験のギャップをなくすことがこの改訂の主目的。

### 1.1 解決する問題

- 改訂前は設定・法的情報・ログアウトのみを掲載していた（MVP 最小構成）。
- Web 版には「発見・マイ盆栽・盆栽園マップ・イベント・ブックマーク・育成ガイド・プレミアム機能・その他」が含まれているが、モバイルアプリには対応するネイティブ画面がない。
- ネイティブ画面のない機能は expo-web-browser でアプリ内ブラウザとして開くことでギャップを解消する。

### 1.2 Web ページをアプリ内ブラウザで開く方式の前提

本画面の項目の多くは、アプリ内にネイティブ画面が存在しないため **expo-web-browser の `openBrowserAsync` でアプリ内ブラウザを開く**方式をとる。

- ブラウザが開く際にアニメーションでスライドアップするため、ユーザーは「アプリを離れた」感覚を持ちにくい（iOS: SFSafariViewController / Android: Chrome Custom Tabs が内部的に起動される）。
- URLはすべて `lib/constants/routes.ts` の外部リンク定数（`externalLinks.*`）として管理する。ハードコード禁止。
- ベースドメインは `https://www.bon-log.com`（`EXPO_PUBLIC_API_BASE_URL`）から取得することを検討してよい。**core に要相談:** 外部リンク定数の実装方針を確認すること。

### 1.3 グループ構成の方針

Web 版ではアコーディオン（折りたたみ）で「育成ガイド」「その他」を実装している。モバイルでは次の理由からアコーディオンを**使わずフラットなグループ**として全展開することを推奨する（確定案）:

- タップ操作はホバーより意図的であり、アコーディオンの開閉コストがネイティブでは UX 上の摩擦になる。
- 一画面内の項目数（最大 15 行程度）はスクロールで処理できる範囲であり、折りたたみの必要性が低い。
- Web のアコーディオンは「画面外へのポップアップ」でスペースが限られているための設計。タブ画面はフルスクリーンであり制約が異なる。

**frontend はアコーディオンを実装せず、グループをセクション見出し付きでフラットに並べる実装を行う。**

---

## 2. 画面構成

### 2.1 全体レイアウト

```
┌────────────────────────────────────────────────────────────┐
│  [セーフエリア上端]                                           │
│                                                            │
│  [OfflineBanner（オフライン時のみ）]                          │
│                                                            │
│  [タブヘッダー]                                              │
│    中央: 「もっと見る」                                      │
│    高さ: 48pt / 背景: colorSurfaceWashi                     │
│    下端境界: 1pt solid colorBorderLight                      │
│                                                            │
│  ───────────────────────────────────────────────────────── │
│                                                            │
│  [ScrollView]                                              │
│    paddingHorizontal: spacing4（16pt）                      │
│    paddingTop: spacing4（16pt）                             │
│    paddingBottom: spacing8（32pt）＋ボトムタブ高さ＋セーフ域  │
│    グループ間 gap: spacing4（16pt）                          │
│                                                            │
│    ┌─ グループ 1: ナビゲーション ─────────────────────────┐  │
│    │  プロフィール                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  設定                                       ›        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 2: メニュー ─────────────────────────────┐   │
│    │  [セクション見出し: 「メニュー」]                   │   │
│    │  発見                                      ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  マイ盆栽                                  ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  盆栽園マップ                               ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  イベント                                  ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  ブックマーク                               ↗        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 3: 育成ガイド ──────────────────────────┐   │
│    │  [セクション見出し: 「育成ガイド」]                 │   │
│    │  農薬・病害虫                               ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  施肥ガイド                                ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  植物ホルモン                               ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  盆栽用語辞典                               ↗        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 4: プレミアム機能（isPremium=true のみ）──┐   │
│    │  [セクション見出し: 「プレミアム」＋王冠アイコン]   │   │
│    │  予約投稿                                  ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  投稿分析                                  ↗        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 5: その他 ──────────────────────────────┐   │
│    │  [セクション見出し: 「その他」]                     │   │
│    │  利用規約                                  ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  プライバシーポリシー                       ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  特商法表記                                ↗        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  ヘルプ                                    ↗        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 6: 危険ゾーン ──────────────────────────┐   │
│    │  ログアウト                        colorError       │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│  [セーフエリア下端 + BottomTabBar]                           │
└────────────────────────────────────────────────────────────┘
```

**凡例:**
- `›`（シェブロン）= ネイティブ遷移（アプリ内スタック / タブ切り替え）
- `↗`（外部リンクアイコン）= アプリ内ブラウザで Web ページを開く

### 2.2 ヘッダー

- タブヘッダー種別（`navigation-structure.md` §5.1 準拠）
- ヘッダーは `(tabs)/more` のタブ固有ヘッダー（スタックヘッダーの「戻る」ボタンは不要）
- タイトル: 「もっと見る」/ `textLg`（17pt / fontWeight: 600）/ `colorTextPrimary` / `letterSpacingWidest`（1.5）/ 中央寄せ

### 2.3 メニューグループのレイアウト詳細

```
グループコンテナ:
  背景: colorSurface (#fcfcfc)
  角丸: radiusLg (10pt)
  影: shadowWashi
  overflow: hidden（角丸をアイテムに適用するため）

セクション見出し（グループ 2〜5 のみ）:
  位置: グループコンテナ外、グループの直上
  テキスト: textSm (12pt) / colorTextSecondary / letterSpacingWide (1.0)
  paddingHorizontal: spacing1 (4pt)
  paddingBottom: spacing1 (4pt)

各メニュー行:
  高さ: 最小 44pt（paddingVertical: spacing2（8pt）+ コンテンツで可変）
  paddingHorizontal: spacing4（16pt）
  flexDirection: row / alignItems: center
  区切り線（最終行以外）: borderBottom 1pt solid colorBorderLight

行内レイアウト:
  [左: アイコン 20pt] [中: ラベルテキスト（flex: 1）] [右: シェブロン › or 外部リンクアイコン ↗ 16pt]
```

**右端アイコンの使い分け:**
- ネイティブ遷移（プロフィール・設定）: シェブロン `›`（ChevronRight）/ `colorTextTertiary`
- アプリ内ブラウザで開く項目: 外部リンクアイコン `↗`（ExternalLink）/ 16pt / `colorTextTertiary`

---

## 3. メニュー項目詳細

### 3.1 グループ 1: ナビゲーション

グループ 1 はセクション見出しなし。設定・プロフィールへのアプリ内遷移のみを提供するグループ。

#### プロフィール

| 項目 | 内容 |
|------|------|
| ラベル | 「プロフィール」|
| アイコン | `User`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 右端 | ChevronRight / `colorTextTertiary` |
| 遷移種別 | ネイティブ遷移 |
| タップ | `router.push(routes.profile)` → `(tabs)/profile` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「プロフィールを見る」|

**設計メモ:** `(tabs)/profile` はタブとして既に存在するが、「もっと見る」タブがアクティブな状態からワンタップでプロフィールへ移動できる導線として設ける。`router.navigate` でタブ切り替えとするか `router.push` でスタック遷移とするかは frontend が UX と実装の両面から判断する。

#### 設定

| 項目 | 内容 |
|------|------|
| ラベル | 「設定」|
| アイコン | `Settings`（Lucide 系）/ 20pt / `colorTextSecondary` |
| 右端 | ChevronRight / `colorTextTertiary` |
| 遷移種別 | ネイティブ遷移 |
| タップ | `router.push(routes.settings)` → `settings/` スタックへ |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「設定を開く」|

---

### 3.2 グループ 2: メニュー

セクション見出し: 「メニュー」

このグループの全 5 項目は `openBrowserAsync` でアプリ内ブラウザを開く。

| 順序 | ラベル | アイコン | 外部リンク定数名 | Web URL |
|------|--------|---------|----------------|---------|
| 1 | 発見 | `Compass` | `externalLinks.explore` | `/explore` |
| 2 | マイ盆栽 | `TreePine` | `externalLinks.bonsai` | `/bonsai` |
| 3 | 盆栽園マップ | `MapPin` | `externalLinks.shops` | `/shops` |
| 4 | イベント | `Calendar` | `externalLinks.events` | `/events` |
| 5 | ブックマーク | `Bookmark` | `externalLinks.bookmarks` | `/bookmarks` |

各項目の共通仕様:

| 項目 | 内容 |
|------|------|
| 右端 | ExternalLink / 16pt / `colorTextTertiary` |
| 遷移種別 | アプリ内ブラウザ |
| タップ | `openBrowserAsync(externalLinks.{key})` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「{ラベル}（Web ページを開く）」|

---

### 3.3 グループ 3: 育成ガイド

セクション見出し: 「育成ガイド」

このグループの全 4 項目は `openBrowserAsync` でアプリ内ブラウザを開く。

| 順序 | ラベル | アイコン | 外部リンク定数名 | Web URL |
|------|--------|---------|----------------|---------|
| 1 | 農薬・病害虫 | `Bug` | `externalLinks.pesticides` | `/pesticides` |
| 2 | 施肥ガイド | `Sprout` | `externalLinks.fertilizers` | `/fertilizers` |
| 3 | 植物ホルモン | `FlaskConical` | `externalLinks.hormones` | `/hormones` |
| 4 | 盆栽用語辞典 | `BookOpen` | `externalLinks.dictionary` | `/dictionary` |

各項目の共通仕様は 3.2 グループ 2 と同一（ExternalLink アイコン / `openBrowserAsync`）。

---

### 3.4 グループ 4: プレミアム機能

**表示条件: `isPremium === true` のときのみグループごと表示する。非プレミアムユーザーにはこのグループ全体を非表示にする。**

セクション見出し: 「プレミアム」（見出し右端に `Crown` アイコン 12pt / `colorTextSecondary` を配置）

このグループの 2 項目は `openBrowserAsync` でアプリ内ブラウザを開く。

| 順序 | ラベル | アイコン | 外部リンク定数名 | Web URL |
|------|--------|---------|----------------|---------|
| 1 | 予約投稿 | `CalendarPlus` | `externalLinks.scheduledPosts` | `/posts/scheduled` |
| 2 | 投稿分析 | `BarChart3` | `externalLinks.analytics` | `/analytics` |

各項目の共通仕様は 3.2 グループ 2 と同一。

**isPremium の取得:** サーバー API から取得したユーザーの購読状態を参照する（RevenueCat クライアント SDK の entitlement は判定の正にしない。`billing.md` 準拠）。データ取得フックは `lib/queries/` の既存ユーザー情報クエリを流用する。**core に要相談:** `isPremium` フラグが既存のユーザー情報 API レスポンスに含まれているか確認のこと。

---

### 3.5 グループ 5: その他

セクション見出し: 「その他」

このグループの全 4 項目は `openBrowserAsync` でアプリ内ブラウザを開く。

| 順序 | ラベル | アイコン | 外部リンク定数名 | Web URL |
|------|--------|---------|----------------|---------|
| 1 | 利用規約 | `FileText` | `externalLinks.terms` | `/terms` |
| 2 | プライバシーポリシー | `Shield` | `externalLinks.privacy` | `/privacy` |
| 3 | 特商法表記 | `FileText` | `externalLinks.tokushoho` | `/tokushoho` |
| 4 | ヘルプ | `HelpCircle` | `externalLinks.help` | `/help` |

各項目の共通仕様は 3.2 グループ 2 と同一。

---

### 3.6 グループ 6: 危険ゾーン

グループ 6 はセクション見出しなし。ログアウトのみを含む。

#### ログアウト

| 項目 | 内容 |
|------|------|
| ラベル | 「ログアウト」（処理中: 「ログアウト中...」）|
| アイコン | `LogOut`（Lucide 系）/ 20pt / `colorError` |
| 右端 | なし（ChevronRight は表示しない）|
| テキスト色 | `colorError`（`#c0392b`）|
| 押下時フィードバック | 背景が `colorErrorBg`（`#fdf0ef`）に変化（`durationFast: 200ms`）|
| タップ | 確認ダイアログを表示 → 確認後 `useLogoutMutation` を呼び出す |
| disabled 時 | ログアウト処理中は `opacity: 0.5` + タップ不可 |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「ログアウト」|
| `accessibilityState` | `{ disabled: isLoggingOut }` |

---

## 4. ログアウト確認ダイアログ

### 4.1 仕様

`settings/index.tsx` で実装済みの `Alert.alert()` を踏襲する。

```
タイトル : 「ログアウト」
メッセージ: 「ログアウトしますか？」
ボタン 1  : 「キャンセル」/ style: cancel
ボタン 2  : 「ログアウト」/ style: destructive → useLogoutMutation を呼び出す
```

**iOS / Android 差異:**
- iOS: `Alert.alert()` は画面中央のモーダルダイアログ。ボタンは縦並び（destructive が下）。
- Android: ダイアログとして表示。ボタンは右寄せの横並び（キャンセルが左、ログアウトが右）。

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
| 遷移先（グループ 2〜5 全項目）| アプリ内ブラウザ（`expo-web-browser`）|
| 遷移先（ログアウト後） | `(auth)/login`（AuthGuard によるリダイレクト）|
| ディープリンク | 不要 |

---

## 6. コンポーネント分割

```
MoreScreen                    ← (tabs)/more 画面
├── MoreSectionHeader         ← セクション見出し（グループ 2〜5 に表示）
├── MoreMenuGroup             ← グループコンテナ（背景・角丸・影の共通スタイル）
│   └── MoreMenuItem          ← 各メニュー行（アイコン・ラベル・右端要素）
└── LogoutConfirmAlert        ← ログアウト確認ダイアログのロジック（Alert.alert() ラッパー）
```

### 6.1 MoreSectionHeader props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `label` | `string` | セクション見出しテキスト |
| `trailingIcon` | `ReactNode` | 見出し右端の装飾アイコン（任意。プレミアムの Crown アイコン等）|

### 6.2 MoreMenuGroup props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `children` | `ReactNode` | グループ内の MoreMenuItem |

### 6.3 MoreMenuItem props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `label` | `string` | 表示ラベル（必須）|
| `icon` | `ReactNode` | 左端アイコン（必須）|
| `rightElement` | `"chevron" \| "external" \| "none"` | 右端要素の種別（デフォルト: `"chevron"`）|
| `onPress` | `() => void` | タップコールバック（必須）|
| `destructive` | `boolean` | 赤系スタイルを適用するか（デフォルト: `false`）|
| `disabled` | `boolean` | タップ不可かつ opacity: 0.5（デフォルト: `false`）|

**既存コンポーネントとの関係:** `settings/index.tsx` の `SettingItem` と類似した構造。将来的に `components/common/MenuGroup` / `components/common/MenuItem` として共通化することを推奨するが、実装時の判断は frontend に委ねる。

---

## 7. データの流れ

### 7.1 静的メニュー項目

グループ 1・2・3・5・6 の項目は静的定数で定義する。サーバーからのデータ取得は不要。

### 7.2 プレミアム状態（グループ 4 の表示制御）

- ログイン後に取得するユーザー情報クエリ（既存）から `isPremium` フラグを参照する。
- クエリが取得中の場合はグループ 4 を非表示にする（ローディング中はプレミアム未確認として扱う）。
- クエリがエラーの場合もグループ 4 を非表示にする（非プレミアムとして安全側に倒す）。

---

## 8. 状態とインタラクション

### 8.1 ローディング

静的メニュー本体にローディング状態はない。

ただし次の 2 点は状態を持つ:
- ログアウト実行中（`isLoggingOut === true`）: §3.6 参照
- プレミアム状態取得中: グループ 4 を非表示にする

### 8.2 タップフィードバック

- 全行: `TouchableOpacity`（`activeOpacity: 0.7`）
- Android では `TouchableNativeFeedback` でリップルエフェクトを追加してもよい（frontend 判断）
- 「ログアウト」行は押下時に背景 `colorErrorBg`（`durationFast: 200ms`）に変化

### 8.3 アプリ内ブラウザ

- `expo-web-browser` の `openBrowserAsync` を使用する
- `openBrowserAsync` は Promise を返す。await してブラウザが閉じられたことを検知しても現状は追加処理不要
- ブラウザが開かない場合（URL が無効・端末制限等）: エラーをキャッチして Sentry に送信。ユーザーへの表示は不要（ブラウザが開かないこと自体でユーザーは気づく）

---

## 9. エッジケース

### 9.1 ローディング

静的メニューのため該当しない。プレミアム状態取得中の挙動は §7.2 参照。

### 9.2 空状態

静的メニューのため該当しない。

### 9.3 エラー

| エラー種別 | 対応 |
|-----------|------|
| ログアウト API 失敗 | fail-safe としてローカルトークン削除と画面遷移を実行（`auth-tokens.md` 準拠）。ユーザーへのエラー表示なし |
| アプリ内ブラウザ起動失敗 | サイレントにキャッチして Sentry に送信。ユーザー向けエラーは表示しない |
| 外部リンク URL 未設定 | `lib/constants/routes.ts` の外部リンク定数が空文字の場合、該当行を `disabled`（`opacity: 0.5` / タップ不可）にする |
| プレミアム状態取得エラー | グループ 4（プレミアム機能）を非表示にする（§7.2 参照） |

### 9.4 オフライン

- `OfflineBanner` を画面上部に表示する（`common-states.md` §5 準拠）。
- 静的メニュー自体は引き続き操作可能（プロフィール・設定へのネイティブ遷移は可能）。
- アプリ内ブラウザを開こうとした場合: ブラウザ側がエラーを処理するためアプリ側での特別対応はしない。
- ログアウト: オフライン中でも実行可能（fail-safe でローカル処理）。

---

## 10. コピー案（文言一覧）

| 箇所 | 文言 |
|------|------|
| タブラベル | 「もっと見る」|
| ヘッダータイトル | 「もっと見る」|
| セクション見出し（グループ 2）| 「メニュー」|
| セクション見出し（グループ 3）| 「育成ガイド」|
| セクション見出し（グループ 4）| 「プレミアム」|
| セクション見出し（グループ 5）| 「その他」|
| 「プロフィール」行 | 「プロフィール」|
| 「設定」行 | 「設定」|
| 「発見」行 | 「発見」|
| 「マイ盆栽」行 | 「マイ盆栽」|
| 「盆栽園マップ」行 | 「盆栽園マップ」|
| 「イベント」行 | 「イベント」|
| 「ブックマーク」行 | 「ブックマーク」|
| 「農薬・病害虫」行 | 「農薬・病害虫」|
| 「施肥ガイド」行 | 「施肥ガイド」|
| 「植物ホルモン」行 | 「植物ホルモン」|
| 「盆栽用語辞典」行 | 「盆栽用語辞典」|
| 「予約投稿」行 | 「予約投稿」|
| 「投稿分析」行 | 「投稿分析」|
| 「利用規約」行 | 「利用規約」|
| 「プライバシーポリシー」行 | 「プライバシーポリシー」|
| 「特商法表記」行 | 「特商法表記」|
| 「ヘルプ」行 | 「ヘルプ」|
| 「ログアウト」行（通常時）| 「ログアウト」|
| 「ログアウト」行（処理中）| 「ログアウト中...」|
| ログアウト確認ダイアログ タイトル | 「ログアウト」|
| ログアウト確認ダイアログ メッセージ | 「ログアウトしますか？」|
| ログアウト確認ダイアログ キャンセル | 「キャンセル」|
| ログアウト確認ダイアログ 実行 | 「ログアウト」|

**グループ 1 と 6 のセクション見出しについて:** 「ナビゲーション」「危険ゾーン」のような見出しはユーザー向けではなく内部設計上の名称。画面には表示しない。グループ間の余白（`spacing4`）のみで視覚的に区別する。

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 全メニュー行 | `accessibilityRole="button"` |
| 「プロフィール」行 | `accessibilityLabel="プロフィールを見る"` |
| 「設定」行 | `accessibilityLabel="設定を開く"` |
| 「発見」行 | `accessibilityLabel="発見（Web ページを開く）"` |
| 「マイ盆栽」行 | `accessibilityLabel="マイ盆栽（Web ページを開く）"` |
| 「盆栽園マップ」行 | `accessibilityLabel="盆栽園マップ（Web ページを開く）"` |
| 「イベント」行 | `accessibilityLabel="イベント（Web ページを開く）"` |
| 「ブックマーク」行 | `accessibilityLabel="ブックマーク（Web ページを開く）"` |
| 「農薬・病害虫」行 | `accessibilityLabel="農薬・病害虫（Web ページを開く）"` |
| 「施肥ガイド」行 | `accessibilityLabel="施肥ガイド（Web ページを開く）"` |
| 「植物ホルモン」行 | `accessibilityLabel="植物ホルモン（Web ページを開く）"` |
| 「盆栽用語辞典」行 | `accessibilityLabel="盆栽用語辞典（Web ページを開く）"` |
| 「予約投稿」行 | `accessibilityLabel="予約投稿（Web ページを開く）"` |
| 「投稿分析」行 | `accessibilityLabel="投稿分析（Web ページを開く）"` |
| 「利用規約」行 | `accessibilityLabel="利用規約（Web ページを開く）"` |
| 「プライバシーポリシー」行 | `accessibilityLabel="プライバシーポリシー（Web ページを開く）"` |
| 「特商法表記」行 | `accessibilityLabel="特商法表記（Web ページを開く）"` |
| 「ヘルプ」行 | `accessibilityLabel="ヘルプ（Web ページを開く）"` |
| 「ログアウト」行 | `accessibilityLabel="ログアウト"` / `accessibilityState: { disabled: isLoggingOut }` |
| アイコン（装飾目的） | `accessibilityElementsHidden={true}` / `importantForAccessibility="no"` |
| タップターゲット | 全行 `minHeight: 44pt` を確保 |
| コントラスト | 通常テキスト: `colorTextPrimary`（`#1a1a1a`）on `colorSurface`（`#fcfcfc`）= 17.4:1（AAA 達成）|
| ログアウトテキスト | `colorError`（`#c0392b`）on `colorSurface`（`#fcfcfc`）= 4.8:1（AA 達成）|
| セクション見出し | `colorTextSecondary`（`#5c5c5c`）on `colorBackground`（`#ffffff`）= 7.0:1（AA 達成）|

---

## 12. 使用トークン一覧

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
| セクション見出し | `colorTextSecondary` | `#5c5c5c` |
| メニューラベル | `colorTextPrimary` | `#1a1a1a` |
| アイコン色（通常）| `colorTextSecondary` | `#5c5c5c` |
| ChevronRight / ExternalLink | `colorTextTertiary` | `#8a8a8a` |
| ログアウトラベル / アイコン | `colorError` | `#c0392b` |
| ログアウト押下背景 | `colorErrorBg` | `#fdf0ef` |
| スクロール余白（水平）| `spacing4` | 16pt |
| スクロール余白（上端）| `spacing4` | 16pt |
| スクロール余白（下端）| `spacing8` | 32pt |
| グループ間余白 | `spacing4` | 16pt |
| 行の水平パディング | `spacing4` | 16pt |
| 行の垂直パディング | `spacing2` | 8pt |
| テキストスタイル（ラベル）| `textBase` | 14pt / lineHeight 22pt |
| テキストスタイル（セクション見出し）| `textSm` | 12pt / lineHeight 18pt |
| テキストスタイル（ヘッダー）| `textLg` | 17pt / fontWeight 600 |
| 字間（ヘッダー）| `letterSpacingWidest` | 1.5 |
| 字間（セクション見出し）| `letterSpacingWide` | 1.0 |

---

## 13. store-compliance.md との対応確認

| 要件 | 対応状況 |
|------|---------|
| 外部決済ページへの誘導禁止 | この画面に Stripe などの外部決済ページへのリンクは一切存在しない。グループ 4（プレミアム機能）はプレミアム購読済みユーザーのみに表示するコンテンツページへの誘導であり、決済ページではない |
| 通報・ブロック UI の露出 | この画面には含まない。通報・ブロックは `users/[id]` と `posts/[id]` で提供（`ugc-safety.md` 参照）|
| アカウント削除導線 | この画面には含まない。「設定」→ `settings/account` の導線で到達できる |
| 購入の復元 | この画面には含まない。「設定」→ `settings/subscription` の導線で到達できる |
| ログアウト | この画面からのログアウトは審査上問題なし |

---

## 14. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `settings/index.tsx` のグループリスト UI | グループコンテナ・行スタイル・ログアウト確認ダイアログを完全に踏襲する |
| `settings/index.tsx` の `useLogoutMutation` | `(tabs)/more` でも同一のミューテーションフックを使用する |
| `settings/index.tsx` の利用規約・プライバシー・ヘルプ・ログアウト | 「もっと見る」画面の同項目は重複導線として意図的に設ける。設定画面を削除・変更する必要はない |
| Web 版 `MobileNav.tsx` の項目構成 | グループ 1〜6 の順序・ラベルはすべて Web 版の `profileItem` / `mainMenuItems` / `guidesMenuItems` / `settingsNavItem` / `premiumMenuItems` / `otherMenuItems` + ログアウトの構成に対応させた |
| Web 版 `MobileNav.tsx` のアコーディオン（育成ガイド・その他）| モバイルではフラット全展開（§1.3 参照）。アコーディオンは実装しない |
| Web 版のアイコン名（Lucide）| 同一の Lucide アイコン名を使用する（`Compass`, `TreePine`, `MapPin`, `Calendar`, `Bookmark`, `Bug`, `Sprout`, `FlaskConical`, `BookOpen`, `CalendarPlus`, `BarChart3`, `FileText`, `Shield`, `HelpCircle`, `LogOut`）。アイコンライブラリは frontend が既存の実装（Ionicons 等）と統一するか判断する |
| `navigation-structure.md` §4.2 | 本改訂に合わせて `navigation-structure.md` §4.2 の「もっと見る画面概要」も更新する |
| `common-states.md` §5（OfflineBanner）| オフライン時に画面上部に表示。他の (tabs) 画面と同一パターン |

---

## 15. 未確定事項・要判断

| 項目 | 内容 | 判断者 |
|------|------|--------|
| 外部リンク URL のベース | `https://www.bon-log.com` + パスで生成する方針か、`lib/constants/routes.ts` の `externalLinks` 定数として別管理するか | core |
| `isPremium` フラグの取得源 | 既存のユーザー情報 API レスポンスに含まれているか。なければ別途 API を叩く必要がある | core に要確認 |
| expo-web-browser の採用確定 | アプリ内ブラウザとして推奨。代替案（スタック遷移で `WebView` 画面として実装）は frontend が判断してよい |  frontend |
| アイコンライブラリの統一 | Lucide 系を指定しているが、既存の `Ionicons` と統一するか確認が必要 | frontend |
| プレミアムユーザーへの「プレミアムプランに加入する」誘導 | 非プレミアムユーザーに対して「プレミアム機能を見る」行をグレーアウトで表示し、タップで `settings/subscription` へ誘導するか、グループ 4 を完全非表示にするかは PM が判断する。本仕様は完全非表示を採用した | PM |
