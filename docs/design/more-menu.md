# 「もっと見る」画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-20
更新日: 2026-06-20（Web 版「もっと見る」ドロップアップメニューと項目構成を一致させる改訂）
改訂（2026-07-13・実装追従改訂）: 実装 `app/(tabs)/more/index.tsx` を正として本書を全面改訂した。旧版は大半の項目を expo-web-browser のアプリ内ブラウザで開く前提だったが、実装は**ヘルプを除く全項目がネイティブ遷移**（`router.push` / `router.navigate`）である。グループ構成も Web 版 MobileNav を模した 6 グループ（ナビゲーション / メニュー / 育成ガイド / プレミアム / その他 / 危険ゾーン）+ `isPremium` 条件分岐という設計だったが、実装が採用した **4 グループ**（見出しなし / 「機能」/ 「その他」/ 見出しなし）へ更新し、実装に存在しない `isPremium` 条件分岐の記述を削除した。あわせて §11・§12 のエラー色トークン記載値を旧誤記 `#c0392b` から実装値 `colorError`（`#c21721`）へ是正した（根拠: `design-tokens.md` §11）。
対象画面: `(tabs)/more/index.tsx`
実装の正: `app/(tabs)/more/index.tsx`・`components/common/MoreMenuGroup.tsx`・`components/common/MoreMenuItem.tsx`（本書との記述に差異が生じた場合は実装を正とし、本書を追従改訂する）
前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §2.1（5 タブ構成）・§4.2（もっと見る画面概要）に準拠
- `common-states.md` の OfflineBanner を適用する
- `store-compliance.md`（通報・ブロック・課金・アカウント削除の審査要件）を確認済み

---

## 1. 概要・目的

ボトムナビの 5 つ目タブとして「もっと見る」を設け、アプリ内のすべての機能とコンテンツへのアクセス入口を 1 画面にまとめる。

### 1.1 解決する問題

- 改訂前（MVP 最小構成）は設定・法的情報・ログアウトのみを掲載していた。
- ウェーブ1・ウェーブ2 で発見・辞典・施肥・ホルモン・農薬・投稿分析・マイ盆栽・ブックマーク・盆栽園マップ・イベント・予約投稿・メッセージ等がネイティブ画面として実装されたことに伴い、これらへの導線を「もっと見る」に集約した。
- **これらはすべてネイティブ画面が存在するため、ヘルプ（Web 専用ページ）を除く全項目はアプリ内ブラウザを使わずネイティブ遷移で提供する。**

### 1.2 遷移方式の原則（実装確定）

| 遷移方式 | 対象 | 項目数 |
|---------|------|-------|
| ネイティブ遷移（`router.push` / `router.navigate`）| プロフィール・メッセージ・設定・発見・盆栽用語辞典・施肥ガイド・植物ホルモン・農薬・病害虫・投稿分析・マイ盆栽・ブックマーク・盆栽園マップ・イベント・予約投稿・利用規約・プライバシーポリシー・特商法表記 | 17 項目 |
| アプリ内ブラウザ（`expo-web-browser` の `openBrowserAsync`）| ヘルプ（Web 専用ページのため） | 1 項目 |
| （参考）アクション | ログアウト（画面遷移ではなく `Alert.alert()` による確認 → ミューテーション実行） | 1 項目 |

- ブラウザが開く際にアニメーションでスライドアップするため、ユーザーは「アプリを離れた」感覚を持ちにくい（iOS: SFSafariViewController / Android: Chrome Custom Tabs が内部的に起動される）。ただしこの挙動が該当するのは**ヘルプのみ**。
- ヘルプの URL は `lib/constants/external-links.ts` の `HELP_URL` を使用する。ハードコード禁止。

### 1.3 グループ構成の方針（実装確定）

Web 版はアコーディオン（折りたたみ）で「育成ガイド」「その他」を実装しているが、モバイルは以下の理由からアコーディオンを**使わずフラットなグループ**として全展開する（実装済み・確定）:

- タップ操作はホバーより意図的であり、アコーディオンの開閉コストがネイティブでは UX 上の摩擦になる。
- 一画面内の項目数（全 19 行）はスクロールで処理できる範囲であり、折りたたみの必要性が低い。
- Web のアコーディオンは「画面外へのポップアップ」でスペースが限られているための設計。タブ画面はフルスクリーンであり制約が異なる。

実装は Web 版のグルーピング（メニュー / 育成ガイド / プレミアム / その他の 4 分類）をそのまま再現せず、機能系の項目をすべて「機能」という単一のフラットなグループへ統合している。プレミアム限定機能（予約投稿・投稿分析）についても、購読状態による表示・非表示の分岐は行わず、常時同じ「機能」グループ内に表示する（§7.2 参照）。

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
│    padding: spacing4（16pt、上下左右均一）                   │
│    グループ間 gap: spacing4（16pt）                          │
│                                                            │
│    ┌─ グループ 1（見出しなし）───────────────────────────┐  │
│    │  プロフィール                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  メッセージ                                 ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  設定                                       ›        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 2: 機能 ─────────────────────────────────┐   │
│    │  [セクション見出し: 「機能」]                       │   │
│    │  発見                                       ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  盆栽用語辞典                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  施肥ガイド                                 ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  植物ホルモン                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  農薬・病害虫                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  投稿分析                                   ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  マイ盆栽                                   ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  ブックマーク                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  盆栽園マップ                               ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  イベント                                   ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  予約投稿                                   ›        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 3: その他 ──────────────────────────────┐   │
│    │  [セクション見出し: 「その他」]                     │   │
│    │  利用規約                                   ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  プライバシーポリシー                       ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  特商法表記                                 ›        │  │
│    ├──────────────────────────────────────────────────── ┤  │
│    │  ヘルプ                                     ↗        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│    ┌─ グループ 4（見出しなし）───────────────────────────┐  │
│    │  ログアウト                        colorError        │  │
│    └──────────────────────────────────────────────────── ┘  │
│                                                            │
│  [セーフエリア下端 + BottomTabBar]                           │
└────────────────────────────────────────────────────────────┘
```

**凡例:**
- `›` = ネイティブ遷移（`rightElement="chevron"`。実装は Ionicons 等のアイコンではなく `›` の Text グリフをそのまま描画する）
- `↗` = アプリ内ブラウザで Web ページを開く（`rightElement="external"`。`open-outline`〈Ionicons〉・16pt。ヘルプのみ）
- ログアウト行は `rightElement="none"` のため右端に何も表示しない

### 2.2 ヘッダー

- タブヘッダー種別（`navigation-structure.md` §5.1 準拠）
- ヘッダーは `(tabs)/more` のタブ固有ヘッダー（スタックヘッダーの「戻る」ボタンは不要）
- タイトル: 「もっと見る」/ `textLg`（17pt）/ `colorTextPrimary` / `letterSpacingWidest`（1.5）/ 中央寄せ

### 2.3 メニューグループのレイアウト詳細

```
グループコンテナ（MoreMenuGroup）:
  背景: colorSurface (#fcfcfc)
  角丸: radiusLg (10pt)
  影: shadowWashi
  overflow: hidden（角丸をアイテムに適用するため）

セクション見出し（グループ 2〜3 のみ。MoreScreen 内のローカル関数 MoreSectionHeader）:
  位置: グループコンテナ外、グループの直上
  テキスト: textSm (12pt) / colorTextSecondary / letterSpacingWide (1.0)
  paddingHorizontal: spacing1 (4pt)
  paddingBottom: spacing1 (4pt)
  accessibilityRole="header"

各メニュー行（MoreMenuItem）:
  高さ: 最小 44pt（minHeight: 44 + paddingVertical: spacing2（8pt）でコンテンツに応じて可変）
  paddingHorizontal: spacing4（16pt）
  flexDirection: row / alignItems: center
  左: アイコンコンテナ（幅 20pt / marginRight: spacing3）
  中: ラベルテキスト（flex: 1 / textBase / colorTextPrimary）
  右: rightElement（chevron "›" / external "↗" / none のいずれか）
```

**区切り線（最終行以外。`showBorder=true` のとき表示）:**
実装は 1pt の単色ボーダーではなく、墨筆風の ink-separator 画像アセット（`assets/images/brush-frames/ink-separator.svg`）を各行の下端に絶対配置する（高さ 2pt / 左右 `spacing4` インセット）。Web の MobileNav `InkSeparator` をモバイル向けに移植したもの（`sumi-e-theme-parity-2026-07-06.md` §2.4 参照）。`showBorder=true` の行は `itemBorder` スタイル（`paddingBottom: spacing2` の余白確保）も併用する。

**右端要素の使い分け:**
- ネイティブ遷移（ログアウトを除く全 17 項目）: `rightElement="chevron"`（デフォルト値）。`›` の Text グリフ / `colorTextTertiary` / fontSize 18
- ヘルプのみ: `rightElement="external"`。`open-outline`（Ionicons）/ 16pt / `colorTextTertiary`
- ログアウトのみ: `rightElement="none"`。何も表示しない

---

## 3. メニュー項目詳細

### 3.1 グループ 1: ナビゲーション（見出しなし）

グループ 1 はセクション見出しなし。プロフィール・メッセージ・設定へのネイティブ遷移を提供するグループ。

#### プロフィール

| 項目 | 内容 |
|------|------|
| ラベル | 「プロフィール」|
| アイコン | Ionicons `person-outline` / 20pt / `colorTextSecondary` |
| 右端 | chevron `›` |
| 遷移種別 | ネイティブ遷移 |
| タップ | `router.navigate(ROUTE_PROFILE)` → `(tabs)/profile` |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「プロフィールを見る」|
| 区切り線 | あり |

**設計メモ:** `(tabs)/profile` はタブとして既に存在するが、実装は `router.push` ではなく `router.navigate` でタブへ切り替える。「もっと見る」タブがアクティブな状態からワンタップでプロフィールへ移動できる導線。

#### メッセージ

| 項目 | 内容 |
|------|------|
| ラベル | 「メッセージ」|
| アイコン | Ionicons `chatbubble-ellipses-outline` / 20pt / `colorTextSecondary` |
| 右端 | chevron `›` |
| 遷移種別 | ネイティブ遷移 |
| タップ | `router.push(ROUTE_MESSAGES)` → `messages/`（タブ外スタック） |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「メッセージ一覧を開く」|
| 区切り線 | あり |

**設計メモ:** `messages/`（DM）は `navigation-structure.md` の当初 5 タブ構成では MVP スコープ外としていたが、後続ウェーブでネイティブ画面として実装され、「もっと見る」経由のスタック画面として提供されている（`navigation-structure.md` §2.1 も本改訂に合わせて更新した）。

#### 設定

| 項目 | 内容 |
|------|------|
| ラベル | 「設定」|
| アイコン | Ionicons `settings-outline` / 20pt / `colorTextSecondary` |
| 右端 | chevron `›` |
| 遷移種別 | ネイティブ遷移 |
| タップ | `router.push(routes.settings)` → `settings/` スタックへ |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「設定を開く」|
| 区切り線 | なし（グループ最終行） |

---

### 3.2 グループ 2: 機能

セクション見出し: 「機能」

このグループの全 11 項目は**すべてネイティブ遷移**（`router.push`）。旧版が想定していたアプリ内ブラウザ（`openBrowserAsync`）は使用しない。

| 順序 | ラベル | アイコン（Ionicons）| 遷移先パス | `accessibilityLabel` |
|------|--------|-----|-----------|---------------------|
| 1 | 発見 | `compass-outline` | `/explore` | 「発見画面を開く」|
| 2 | 盆栽用語辞典 | `book-outline` | `/dictionary` | 「盆栽用語辞典を開く」|
| 3 | 施肥ガイド | `leaf-outline` | `/fertilizers` | 「施肥ガイドを開く」|
| 4 | 植物ホルモン | `flask-outline` | `/hormones` | 「植物ホルモン情報を開く」|
| 5 | 農薬・病害虫 | `bug-outline` | `/pesticides` | 「農薬・病害虫図鑑を開く」|
| 6 | 投稿分析 | `bar-chart-outline` | `/analytics` | 「投稿分析を開く」|
| 7 | マイ盆栽 | `flower-outline` | `/bonsai` | 「マイ盆栽を開く」|
| 8 | ブックマーク | `bookmark-outline` | `/bookmarks` | 「ブックマークを開く」|
| 9 | 盆栽園マップ | `map-outline` | `/shops` | 「盆栽園マップを開く」|
| 10 | イベント | `calendar-outline` | `/events` | 「イベント一覧を開く」|
| 11 | 予約投稿 | `time-outline` | `/scheduled-posts` | 「予約投稿を開く」|

各項目の共通仕様:

| 項目 | 内容 |
|------|------|
| アイコン色 | `colorTextSecondary` / 20pt |
| 右端 | chevron `›`（デフォルト） |
| 遷移種別 | ネイティブ遷移（`router.push({ pathname: '{path}' })`） |
| `accessibilityRole` | `"button"` |
| 区切り線 | あり。ただし最終行（予約投稿）はなし |

**プレミアム限定機能について（予約投稿・投稿分析）:** `lib/constants/routes.ts` 上ではこの 2 項目に「プレミアム限定」との注記があるが、「もっと見る」画面自体はユーザーの購読状態（`isPremium`）による表示・非表示の分岐を一切行わない。**全ユーザーに常時表示**し、購読していないユーザーがタップした場合の案内（ロック画面等）は遷移先の画面が担う（例: `scheduled-posts/locked/index.tsx` が非プレミアムユーザー向けの案内画面として実装されている）。旧版が定義していた「グループ: プレミアム機能（`isPremium===true` のときのみ表示）」という条件付きグループは実装に存在しないため本改訂で削除した。

---

### 3.3 グループ 3: その他

セクション見出し: 「その他」

このグループは 4 項目。**利用規約・プライバシーポリシー・特商法表記の 3 項目はネイティブ遷移、ヘルプのみアプリ内ブラウザ。**

| 順序 | ラベル | アイコン（Ionicons）| 遷移種別 | 遷移先 | `accessibilityLabel` |
|------|--------|-----|---------|--------|---------------------|
| 1 | 利用規約 | `document-text-outline` | ネイティブ遷移 | `router.push({ pathname: '/legal/[slug]', params: { slug: 'terms' } })` | 「利用規約を開く」|
| 2 | プライバシーポリシー | `shield-outline` | ネイティブ遷移 | `router.push({ pathname: '/legal/[slug]', params: { slug: 'privacy' } })` | 「プライバシーポリシーを開く」|
| 3 | 特商法表記 | `document-outline` | ネイティブ遷移 | `router.push({ pathname: '/legal/[slug]', params: { slug: 'tokushoho' } })` | 「特商法表記を開く」|
| 4 | ヘルプ | `help-circle-outline` | **アプリ内ブラウザ** | `handleOpenBrowser(HELP_URL)` → `WebBrowser.openBrowserAsync()` | 「ヘルプ（Web ページを開く）」|

- 利用規約・プライバシーポリシー・特商法表記: `rightElement="chevron"`（デフォルト）/ 右端 `›`。区切り線あり。
- ヘルプのみ: `rightElement="external"` / 右端 `open-outline`（Ionicons・16pt・`colorTextTertiary`）。区切り線なし（グループ最終行）。

**旧版からの変更点:** 旧版は利用規約・プライバシーポリシー・特商法表記も `externalLinks` 経由のアプリ内ブラウザで開く設計だったが、実装では法的文書はネイティブ画面 `legal/[slug]`（`app/legal/[slug]/index.tsx`）として提供されており、この画面からもネイティブ遷移で到達する。ヘルプのみ対応するネイティブ画面が存在しないため、引き続き `expo-web-browser` を使用する。

---

### 3.4 グループ 4: 危険ゾーン（見出しなし）

グループ 4 はセクション見出しなし。ログアウトのみを含む。

#### ログアウト

| 項目 | 内容 |
|------|------|
| ラベル | 「ログアウト」（処理中: 「ログアウト中...」）|
| アイコン | Ionicons `log-out-outline` / 20pt / `colorError` |
| 右端 | `rightElement="none"`（何も表示しない）|
| テキスト色 | `colorError`（`#c21721`）|
| タップ | `handleLogout()`（`MoreScreen` 内のローカル関数）→ `Alert.alert()` で確認ダイアログを表示 → 確認後 `useLogoutMutation` を呼び出す |
| disabled 時 | ログアウト処理中は `disabled` プロパティにより `opacity: 0.5` + タップ不可（`itemDisabled` スタイル） |
| `accessibilityRole` | `"button"` |
| `accessibilityLabel` | 「ログアウト」|
| `accessibilityState` | `{ disabled: isLoggingOut }` |
| 区切り線 | なし（グループ内で唯一の項目） |

---

## 4. ログアウト確認ダイアログ

### 4.1 仕様

`handleLogout()` は `settings/index.tsx` の同名関数と完全に同一のコードパターンで `Alert.alert()` を直接呼び出す（専用コンポーネントには分離されていない）。

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

`auth-tokens.md` §ログアウト の手順に完全に従う（手順自体は `useLogoutMutation`〈`lib/queries/auth.ts`〉の責務であり、`MoreScreen` はミューテーションを呼び出すのみ）:

1. サーバーへ logout を送信（リフレッシュトークンの失効）
2. expo-secure-store からトークンを削除
3. `queryClient.clear()` でサーバー状態を全消去
4. Push のデバイストークン登録を解除
5. AuthGuard が login 画面へリダイレクト

サーバー呼び出しが失敗してもローカルのトークン削除と画面遷移は必ず実施する（fail-safe）。`MoreScreen` 側の `onError` コールバックは何も処理を追加しない（AuthGuard が誘導するため通知不要、というコメントのみ）。

---

## 5. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `(tabs)/more`（ボトムタブの 5 番目）|
| 遷移元 | ボトムタブバーの「もっと見る」タップ |
| 遷移先（プロフィール） | `(tabs)/profile`（`router.navigate` によるタブ切り替え）|
| 遷移先（メッセージ） | `messages/`（`router.push` によるスタック遷移）|
| 遷移先（設定） | `settings/`（タブ外スタックへ push）|
| 遷移先（機能グループ 11 項目） | 各機能のネイティブスタック画面へ `router.push`（§3.2 参照）|
| 遷移先（利用規約・プライバシーポリシー・特商法表記） | `legal/[slug]`（`router.push`）|
| 遷移先（ヘルプ） | アプリ内ブラウザ（`expo-web-browser`）で `HELP_URL` を開く |
| 遷移先（ログアウト後） | `(auth)/login`（AuthGuard によるリダイレクト）|
| ディープリンク | 不要 |

---

## 6. コンポーネント分割

```
MoreScreen                    ← (tabs)/more 画面（app/(tabs)/more/index.tsx）
├── MoreSectionHeader         ← セクション見出し（MoreScreen 内のローカル関数。components/ には分離されていない）
├── MoreMenuGroup             ← グループコンテナ（components/common/MoreMenuGroup.tsx）
│   └── MoreMenuItem          ← 各メニュー行（components/common/MoreMenuItem.tsx）
└── handleLogout() / handleOpenBrowser()  ← MoreScreen 内のローカル関数（専用コンポーネントに分離されていない）
```

### 6.1 MoreSectionHeader props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `label` | `string` | セクション見出しテキスト（必須。他の prop はない）|

**旧版からの変更点:** 旧版は「プレミアム」見出し用に `trailingIcon`（Crown アイコン等）prop を定義していたが、プレミアム限定グループが実装に存在しないため、実装の `MoreSectionHeader` は `label` のみを受け取る。

### 6.2 MoreMenuGroup props

| prop 名 | 型 | 意味 |
|---------|---|------|
| `children` | `ReactNode` | グループ内の MoreMenuItem |

### 6.3 MoreMenuItem props（実装 `components/common/MoreMenuItem.tsx` の実際の props）

| prop 名 | 型 | 意味 |
|---------|---|------|
| `label` | `string` | 表示ラベル（必須）|
| `icon` | `ReactNode`（任意） | 左端アイコン |
| `description` | `string`（任意） | ラベル下の補足テキスト（`textSm` / `colorTextSecondary`）。現状すべての項目で未使用 |
| `rightElement` | `"chevron" \| "external" \| "none"` | 右端要素の種別（デフォルト: `"chevron"`）|
| `onPress` | `() => void` | タップコールバック（必須）|
| `destructive` | `boolean` | ラベル色を `colorError` にするか（デフォルト: `false`。ログアウトのみ `true`）|
| `disabled` | `boolean` | タップ不可かつ `opacity: 0.5`（デフォルト: `false`）|
| `showBorder` | `boolean` | 行下端に ink-separator 区切り線を表示するか（デフォルト: `false`。各グループの最終行以外で `true`）|
| `accessibilityLabel` | `string` | スクリーンリーダー向けラベル（必須）|

**既存コンポーネントとの関係:** `settings/index.tsx` は独自のローカル `SettingItem` 型ベースの行実装を持ち、`MoreMenuGroup` / `MoreMenuItem` を共有していない（コンポーネント自体の共通化はされていない）。ログアウト確認ダイアログ・アプリ内ブラウザ起動のロジック（`handleLogout` / `handleOpenBrowser` 関数の中身）は両画面で完全に同一のコードパターンが重複している。

---

## 7. データの流れ

### 7.1 静的メニュー項目

全 4 グループの項目は静的定数として `MoreScreen` 内に直接記述されている（`app/(tabs)/more/index.tsx`）。サーバーからのデータ取得は不要。

### 7.2 プレミアム状態

**「もっと見る」画面はプレミアム購読状態（`isPremium`）を一切参照しない。** 予約投稿・投稿分析を含む「機能」グループの全項目は購読状態に関わらず常時表示する（§3.2 参照）。旧版が定義していたプレミアム状態取得ロジック・ローディング中/エラー時の非表示制御は実装に存在しないため本改訂で削除した。

---

## 8. 状態とインタラクション

### 8.1 ローディング

静的メニューのため、この画面自体にローディング状態はない。

ログアウト実行中（`isLoggingOut === true`）のみ状態を持つ（§3.4 参照）。

### 8.2 タップフィードバック

- 全行: `TouchableOpacity`（`activeOpacity: 0.7`）
- 押下時の背景色変化（`colorErrorBg` 等）は実装されていない（旧版の記載を削除。`activeOpacity` によるフェードのみ）

### 8.3 アプリ内ブラウザ（ヘルプのみ）

- `expo-web-browser` の `openBrowserAsync` を使用する
- ブラウザが開かない場合（URL が無効・端末制限等）: `handleOpenBrowser` 内の `try/catch` でエラーをキャッチして `Sentry.captureException(error)` を呼び出す。ユーザーへの表示は不要（ブラウザが開かないこと自体でユーザーは気づく）

---

## 9. エッジケース

### 9.1 ローディング

静的メニューのため該当しない。

### 9.2 空状態

静的メニューのため該当しない。

### 9.3 エラー

| エラー種別 | 対応 |
|-----------|------|
| ログアウト API 失敗 | fail-safe としてローカルトークン削除と画面遷移を実行（`auth-tokens.md` 準拠。`onError` はコメントのみで追加処理なし）。ユーザーへのエラー表示なし |
| アプリ内ブラウザ起動失敗（ヘルプ）| `try/catch` でサイレントにキャッチして Sentry に送信。ユーザー向けエラーは表示しない |

### 9.4 オフライン

- `OfflineBanner`（`isVisible={!isOnline}`）を画面上部に表示する（`useOnlineStatus` フック経由）
- 静的メニュー自体は引き続き操作可能（ネイティブ遷移は動作する。ただし遷移先画面がオフラインでデータ取得できない場合は遷移先画面側の 4 状態が処理する）
- ヘルプのアプリ内ブラウザを開こうとした場合: ブラウザ側がエラーを処理するためアプリ側での特別対応はしない
- ログアウト: オフライン中でも実行可能（fail-safe でローカル処理）

---

## 10. コピー案（文言一覧）

| 箇所 | 文言 |
|------|------|
| タブラベル | 「もっと見る」|
| ヘッダータイトル | 「もっと見る」|
| セクション見出し（グループ 2）| 「機能」|
| セクション見出し（グループ 3）| 「その他」|
| 「プロフィール」行 | 「プロフィール」|
| 「メッセージ」行 | 「メッセージ」|
| 「設定」行 | 「設定」|
| 「発見」行 | 「発見」|
| 「盆栽用語辞典」行 | 「盆栽用語辞典」|
| 「施肥ガイド」行 | 「施肥ガイド」|
| 「植物ホルモン」行 | 「植物ホルモン」|
| 「農薬・病害虫」行 | 「農薬・病害虫」|
| 「投稿分析」行 | 「投稿分析」|
| 「マイ盆栽」行 | 「マイ盆栽」|
| 「ブックマーク」行 | 「ブックマーク」|
| 「盆栽園マップ」行 | 「盆栽園マップ」|
| 「イベント」行 | 「イベント」|
| 「予約投稿」行 | 「予約投稿」|
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

**グループ 1 と 4 のセクション見出しについて:** 「ナビゲーション」「危険ゾーン」のような見出しは本書内の説明用の名称であり、画面には表示しない（実装はこの 2 グループに `MoreSectionHeader` を使用していない）。グループ間の余白（`spacing4`）のみで視覚的に区別する。

---

## 11. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 全メニュー行 | `accessibilityRole="button"` |
| 「プロフィール」行 | `accessibilityLabel="プロフィールを見る"` |
| 「メッセージ」行 | `accessibilityLabel="メッセージ一覧を開く"` |
| 「設定」行 | `accessibilityLabel="設定を開く"` |
| 「発見」行 | `accessibilityLabel="発見画面を開く"` |
| 「盆栽用語辞典」行 | `accessibilityLabel="盆栽用語辞典を開く"` |
| 「施肥ガイド」行 | `accessibilityLabel="施肥ガイドを開く"` |
| 「植物ホルモン」行 | `accessibilityLabel="植物ホルモン情報を開く"` |
| 「農薬・病害虫」行 | `accessibilityLabel="農薬・病害虫図鑑を開く"` |
| 「投稿分析」行 | `accessibilityLabel="投稿分析を開く"` |
| 「マイ盆栽」行 | `accessibilityLabel="マイ盆栽を開く"` |
| 「ブックマーク」行 | `accessibilityLabel="ブックマークを開く"` |
| 「盆栽園マップ」行 | `accessibilityLabel="盆栽園マップを開く"` |
| 「イベント」行 | `accessibilityLabel="イベント一覧を開く"` |
| 「予約投稿」行 | `accessibilityLabel="予約投稿を開く"` |
| 「利用規約」行 | `accessibilityLabel="利用規約を開く"` |
| 「プライバシーポリシー」行 | `accessibilityLabel="プライバシーポリシーを開く"` |
| 「特商法表記」行 | `accessibilityLabel="特商法表記を開く"` |
| 「ヘルプ」行 | `accessibilityLabel="ヘルプ（Web ページを開く）"` |
| 「ログアウト」行 | `accessibilityLabel="ログアウト"` / `accessibilityState: { disabled: isLoggingOut }` |
| アイコン（装飾目的） | `accessibilityElementsHidden={true}` / `importantForAccessibility="no"` |
| chevron / external アイコン | `accessibilityElementsHidden={true}` / `importantForAccessibility="no"` |
| タップターゲット | 全行 `minHeight: 44pt` を確保 |
| コントラスト（通常テキスト）| `colorTextPrimary`（`#1a1a1a`）on `colorSurface`（`#fcfcfc`）= 17.4:1（AAA 達成）|
| コントラスト（ログアウトテキスト）| `colorError`（`#c21721`）on `colorSurface`（`#fcfcfc`）= 約6.1:1（AA 達成。`design-tokens.md` §7・§11 準拠。**2026-07-13 是正: 旧誤記載値 `#c0392b` から修正**）|
| コントラスト（セクション見出し）| `colorTextSecondary`（`#5c5c5c`）on `colorBackground`（`#ffffff`）= 7.0:1（AA 達成）|

---

## 12. 使用トークン一覧

| 要素 | トークン | hex 値 |
|------|---------|--------|
| 画面背景 | `colorBackground` | `#ffffff` |
| グループ背景 | `colorSurface` | `#fcfcfc` |
| ヘッダー背景 | `colorSurfaceWashi` | `#f7f7f7` |
| グループ角丸 | `radiusLg` | 10pt |
| グループ影 | `shadowWashi` | （design-tokens.md §6 参照）|
| 行の区切り | ink-separator.svg（墨筆アセット。単色ボーダーではない。§2.3 参照）| 高さ 2pt |
| ヘッダー下境界 | `colorBorderLight` | `#e2e2e2` |
| ヘッダータイトル | `colorTextPrimary` | `#1a1a1a` |
| セクション見出し | `colorTextSecondary` | `#5c5c5c` |
| メニューラベル | `colorTextPrimary` | `#1a1a1a` |
| アイコン色（通常）| `colorTextSecondary` | `#5c5c5c` |
| chevron `›` / external アイコン | `colorTextTertiary` | `#8a8a8a` |
| ログアウトラベル / アイコン | `colorError` | `#c21721`（**2026-07-13 是正**: 旧誤記載値 `#c0392b` は `design-tokens.md` の旧誤記に起因する誤り。根拠は `design-tokens.md` §11 を参照）|
| スクロール余白（全方向）| `spacing4` | 16pt |
| グループ間余白 | `spacing4` | 16pt |
| 行の水平パディング | `spacing4` | 16pt |
| 行の垂直パディング | `spacing2` | 8pt |
| アイコンコンテナ幅 | 固定値 | 20pt |
| テキストスタイル（ラベル）| `textBase` | 14pt / lineHeight 22pt |
| テキストスタイル（セクション見出し）| `textSm` | 12pt / lineHeight 18pt |
| テキストスタイル（ヘッダー）| `textLg` | 17pt |
| 字間（ヘッダー）| `letterSpacingWidest` | 1.5 |
| 字間（セクション見出し）| `letterSpacingWide` | 1.0 |

**旧版からの変更点:** 「スクロール余白（水平/上端/下端）」を個別に定義し、下端に「ボトムタブ高さ＋セーフ域」を加算する記載だったが、実装の `ScrollView` は `padding: spacing4` を全方向へ均一に適用するのみで、タブバー高さ・セーフエリアの加算をこの画面が個別に行っている形跡はない（タブナビゲータ側のコンテナが担う前提）。

---

## 13. store-compliance.md との対応確認

| 要件 | 対応状況 |
|------|---------|
| 外部決済ページへの誘導禁止 | この画面に Stripe などの外部決済ページへのリンクは一切存在しない。「予約投稿」「投稿分析」はプレミアム機能のコンテンツ画面への誘導だが、当画面では購読状態に関わらず常時表示するのみで、決済への誘導は行わない（プレミアム判定・アップセルは遷移先の画面が担う） |
| 通報・ブロック UI の露出 | この画面には含まない。通報・ブロックは `users/[id]` と `posts/[id]` で提供（`ugc-safety.md` 参照）|
| アカウント削除導線 | この画面には含まない。「設定」→ `settings/account` の導線で到達できる |
| 購入の復元 | この画面には含まない。「設定」→ `settings/subscription` の導線で到達できる |
| ログアウト | この画面からのログアウトは審査上問題なし |

---

## 14. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `settings/index.tsx` の `handleLogout` | `more/index.tsx` の `handleLogout` と完全に同一のコードパターン（`Alert.alert()` の文言・ボタン構成）を持つ。ただし行 UI コンポーネント自体は共有されていない（`settings/index.tsx` は独自のローカル `SettingItem` 型ベースの実装、`more/index.tsx` は `components/common/MoreMenuGroup` / `MoreMenuItem` を使用）|
| `settings/index.tsx` の `handleOpenBrowser` | 同一のコードパターン（`WebBrowser.openBrowserAsync` + `Sentry.captureException` によるサイレント失敗処理）。`settings/index.tsx` 側にも同名のヘルパーが独立して存在する |
| `settings/index.tsx` の利用規約・プライバシー・ヘルプ・ログアウト | 「もっと見る」画面の同項目は重複導線として意図的に設ける。設定画面を削除・変更する必要はない |
| Web 版 `MobileNav.tsx` の項目構成 | 発見・マイ盆栽・盆栽園マップ・イベント・ブックマーク等、Web 版が持つ項目群はモバイルでもカバーしているが、グルーピング（Web は複数グループ + アコーディオン）はそのまま再現せず、モバイルは「機能」ひとつのフラットなグループに統合している（§1.3 参照）|
| `components/common/MoreMenuGroup` / `MoreMenuItem` | `(tabs)/more` 向けに新設された共有コンポーネント。他画面（`settings/` 等）では未使用 |
| Web の MobileNav `InkSeparator` | `ink-separator.svg`（`assets/images/brush-frames/`）として移植し、`MoreMenuItem` の `showBorder` プロパティで行区切りに適用する（`sumi-e-theme-parity-2026-07-06.md` §2.4・§3.5 参照）|
| `navigation-structure.md` §4.2 | 本改訂に合わせて `navigation-structure.md` §4.2 の「もっと見る画面概要」も更新した |
| `navigation-structure.md` §2.1 | 「メッセージ」タブ言及部分（旧: MVP スコープ外）も本改訂に合わせて更新した（メッセージは `messages/` スタック画面として実装済み）|
| `common-states.md` §5（OfflineBanner）| オフライン時に画面上部に表示。他の (tabs) 画面と同一パターン |

---

## 15. 未確定事項・要判断

| 項目 | 内容 | 状態 |
|------|------|------|
| 外部リンク URL のベース | `lib/constants/external-links.ts` の `buildUrl()` が `EXPO_PUBLIC_API_BASE_URL` ベースで URL を生成する方式に確定した | **解決済み** |
| `isPremium` フラグの取得源 | 「もっと見る」画面はプレミアム状態を参照しない方針に確定した（§7.2）。プレミアム限定機能の判定は遷移先の画面（例: `scheduled-posts/locked`）が担う | **解決済み** |
| expo-web-browser の採用範囲 | ヘルプのみアプリ内ブラウザ、他はすべてネイティブ遷移という構成に確定した | **解決済み** |
| アイコンライブラリの統一 | Ionicons（`@expo/vector-icons`）に統一された | **解決済み** |
| プレミアムユーザーへの「プレミアムプランに加入する」誘導 | 「機能」グループを常時全ユーザーへ表示する方式が採用された（グループの非表示・グレーアウトは行わない）| **解決済み** |
| ログアウト確認ダイアログ・ブラウザ起動処理の重複実装 | `settings/index.tsx` と `more/index.tsx` で `handleLogout` / `handleOpenBrowser` のロジックが重複している。共通フック・ユーティリティへの切り出しは frontend の判断に委ねる | **未解決（frontend）** |
| メッセージ（DM）機能のタブ配置 | 現状は「もっと見る」経由のスタック画面。将来的にボトムタブへ昇格させるかは PM が判断する | **未解決（PM）** |
