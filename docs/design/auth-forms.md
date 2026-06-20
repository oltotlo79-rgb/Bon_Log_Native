# 認証フォーム UX 仕様 — Bon_Log Native

作成日: 2026-06-12
更新日: 2026-06-20（ブランドビジュアル仕様を追記）
対象画面:
- `(auth)/login` — ログイン
- `(auth)/register` — 新規登録
- `(auth)/register/verify-email-sent` — メール確認送信完了
- `(auth)/password-reset` — パスワードリセット申請
- `(auth)/password-reset/confirm` — パスワードリセット確認
- `(auth)/two-factor-verify` — 2 段階認証コード入力（`two-factor-auth.md` 参照）

前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §4.1（(auth) スタック画面一覧）・§6（文言トーン方針）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を各画面に適用する
- Web 版 `Bon_Log_cfw/components/auth/` の実装と文言・構造を揃える
- ブランドアセット（§0.9）は `assets/images/` の既存ファイルを使用する。新規アセットは追加しない

---

## 0. 共通フォームコンポーネント設計方針

### 0.1 共通コンポーネント構成

認証フォーム全体で共有する UI コンポーネントを `components/auth/` に配置する。

| コンポーネント名 | 責務 |
|----------------|------|
| `AuthBrandHeader` | ロゴ画像（brand-mark.png）＋キャッチコピーの上部ブランド表示（全認証画面共通）|
| `AuthScreenBackground` | 背景画像（auth-bg-gate-mobile.webp）を薄く敷くフルスクリーン装飾レイヤー（全認証画面共通）|
| `AuthTextField` | ラベル付きテキスト入力フィールド（エラー表示・フォーカス状態を含む）|
| `PasswordField` | `AuthTextField` に表示切替ボタン（目アイコン）を加えたもの |
| `AuthPrimaryButton` | 主要アクションボタン（通常 / 無効 / 送信中の 3 状態）|
| `AuthDivider` | 「または」区切り線 |
| `GoogleSignInButton` | Google ログイン / 登録ボタン（ブランドガイドライン準拠）|
| `FormErrorMessage` | フォーム全体エラーバナー |
| `AuthTermsAgreement` | 利用規約・プライバシーポリシー同意チェックボックス行 |

### 0.2 入力フィールドの基本仕様（AuthTextField）

```
┌─────────────────────────────────────────────────────┐
│ [ラベル]                                             │
│ ┌───────────────────────────────────────────────┐   │
│ │ [入力テキスト / プレースホルダー]  [アイコン]  │   │  ← 高さ 48pt
│ └───────────────────────────────────────────────┘   │
│ [エラーテキスト（エラー時のみ表示）]                 │
└─────────────────────────────────────────────────────┘
```

- フィールド高さ: 48pt（タップターゲット 44pt を超える余裕を持つ）
- 内側水平パディング: `spacing3`（12pt）
- ラベルとフィールドの間隔: `spacing2`（8pt）
- フィールド間の間隔: `spacing4`（16pt）

**ボーダースタイル:**

| 状態 | ボーダー色 | ボーダー幅 |
|------|----------|----------|
| 通常 | `colorBorder`（`#c8c8c8`）| 1pt |
| フォーカス | `colorBorderFocus`（`#2e2e2e`）| 2pt |
| エラー | `colorError`（`#c0392b`）| 1pt |
| 無効（disabled）| `colorBorder`（透明度 50%）| 1pt |

ボーダー角丸: `radiusMd`（8pt）

**フォーカス時の挙動:**
- ボーダー色が `colorBorder` → `colorBorderFocus` に切り替わる
- Android: リップルエフェクトは不要（フォーカス色変化のみ）
- iOS: フォーカスリングに相当するボーダー太さの変化で代替

### 0.3 エラー表示の方針

#### フィールド単位のエラー（インラインエラー）

- フィールド直下に `spacing1`（4pt）のマージンで表示
- テキストスタイル: `textSm`（12pt）/ `colorError`（`#c0392b`）
- 左端にエラーアイコン（AlertCircle 系、サイズ 12pt）+ テキスト横並び
- エラーが出ているフィールドのボーダー色を `colorError` に変更する
- `accessibilityRole="alert"` を付与し、スクリーンリーダーが即座に読み上げる

#### フォーム全体エラー（FormErrorMessage）

- フォーム先頭（ボタンより上）にインラインで表示
- 背景: `colorErrorBg`（`#fdf0ef`）/ 左端 3pt ボーダー `colorError` / `radiusMd`
- パディング: `spacing3`（12pt）
- テキスト: `textBase`（14pt）/ `colorError`
- `accessibilityRole="alert"` + `accessibilityLiveRegion="assertive"` で読み上げ

#### いつ検証するか

| タイミング | 対象 |
|-----------|------|
| **フィールドの blur 時** | 必須チェック・フォーマット検証（メール形式・文字数）|
| **送信ボタンタップ時** | 全フィールドを一括再検証 + フォーム全体エラー（API エラー含む）|

注意: パスワード一致確認は「確認フィールドの blur」または「送信時」のどちらで表示するかは同じ挙動とする（blur で先に差異が分かる方がユーザー体験が良い）。

送信前のクライアントサイドバリデーションはあくまで UX 向けの事前チェック。サーバーから返却された 400 エラーのメッセージを FormErrorMessage に表示することが最終的な検証結果となる（`api-client.md` 準拠）。

### 0.4 ボタン状態

`AuthPrimaryButton` の 3 状態:

| 状態 | 見た目 | インタラクション |
|------|-------|----------------|
| 通常 | 背景 `colorActionPrimary`（`#2e2e2e`）/ テキスト `colorActionPrimaryText`（`#ffffff`）/ 高さ 48pt | タップ可 |
| 無効（未入力 or エラーあり）| 背景 `colorActionPrimary` 透明度 40% / テキスト `colorActionPrimaryText` 透明度 40% | タップ不可（`disabled`）|
| 送信中 | 背景 `colorActionPrimary` / テキストを非表示にして中央にスピナー（ActivityIndicator 相当、色 `colorActionPrimaryText`）| タップ不可（`disabled`）|

高さ: 48pt
角丸: `radiusLg`（10pt）
文字スタイル: `textBase`（14pt）/ fontWeight 600 / `letterSpacingWidest`（1.5）

**無効化のタイミング:**
- 送信中は常に無効
- 送信前の無効化は「必須フィールドがすべて空の場合のみ」とする。バリデーションエラーがあっても送信ボタン自体は押せるようにし（送信時に再バリデーション）、フォームを見直すきっかけにする

### 0.5 パスワード表示切替（PasswordField）

- パスワードフィールドの右端内側に目アイコンボタンを配置
- アイコン: Eye（非表示時）/ EyeOff（表示時）— Lucide 系、サイズ 20pt
- タップターゲット: 44 x 44pt（フィールド高さ 48pt 内に収まる）
- 色: `colorTextSecondary`（`#5c5c5c`）
- `accessibilityRole="button"` / `accessibilityLabel`: 「パスワードを表示」（非表示時）/ 「パスワードを隠す」（表示時）— Web 版 `PasswordVisibilityToggle` と同じ文言
- トグル状態は各パスワードフィールドで独立して管理する（新パスワードと確認パスワードは別々）

### 0.6 Google ログイン / 登録ボタン（GoogleSignInButton）

- 見た目: 白背景 / `colorBorder` ボーダー 1pt / `radiusLg`（10pt）/ 高さ 48pt
- 中央に Google ロゴ SVG（Web 版と同一の 4 色 SVG、幅 20pt）+ テキスト「Google でログイン」（ログイン画面）/ 「Google で登録」（登録画面）
- Google ブランドガイドライン上の要件: Google ロゴは改変しない・テキストは「Google で〜」形式
- 送信中は `disabled` にし、別フォームの送信中も無効にする（二重送信防止）
- 実装は expo-auth-session 経由（後フェーズ）。現フェーズではボタンを表示するがタップ時は「近日公開予定」のトースト等でフォールバックするかどうかは **PM に要判断**

### 0.7 キーボードとフォーカス移動

- `returnKeyType` の指定で「次へ / 完了」を制御する
- 最後のフィールドの `returnKeyType` は `"done"` とし、キーボードを閉じる
- ボタン直前のフィールドで `returnKeyType="go"` にしてそのまま送信するパターンも可だが、誤送信リスクがあるため今回は `"done"` → 手動タップを推奨する
- 入力フィールドは `ref` を使い `nextFocus` で順に移動させる（`onSubmitEditing` で次フィールドへ `focus()`）

| フィールド順 | returnKeyType |
|------------|--------------|
| 最後以外のすべてのフィールド | `"next"` |
| 最後のフィールド | `"done"` |

- `KeyboardAvoidingView`: iOS は `behavior="padding"` / Android は `behavior="height"`（骨格実装の設定を維持）
- `ScrollView` の `keyboardShouldPersistTaps="handled"` を設定し、フィールド外タップでキーボードが閉じる前にボタンが反応するようにする

### 0.8 オフライン時の挙動

送信ボタンタップ時にオフラインを検知した場合:
- `FormErrorMessage` にオフラインエラー文言を表示する
- `OfflineBanner` は `common-states.md` 仕様に従い画面上部に表示する
- 送信処理には進まない（API 呼び出しを行わない）

---

### 0.9 ブランドビジュアル（全画面共通）

#### 0.9.1 概要

Web 版と同一の「墨絵トーン + 鳥居参道の背景 + 盆栽筆文字ロゴ」ビジュアルを認証画面全体に適用する。
使用するアセットはすべて `assets/images/` に既に配置済みであり、新規アセットの追加は行わない。
配色は既存デザイントークンの範囲内で表現する。新規トークンは追加しない。

#### 0.9.2 適用範囲

以下の認証画面すべてに共通で適用する:

| 画面 | 背景 | AuthBrandHeader |
|------|------|----------------|
| `(auth)/login` | あり | あり |
| `(auth)/register` | あり | なし（画面タイトル「新規登録」を代わりに上部に表示）|
| `(auth)/register/verify-email-sent` | あり | なし（コンプリート画面のためアイコン中心のレイアウトを維持）|
| `(auth)/password-reset` | あり | なし（画面タイトル「パスワードの再設定」を上部に表示）|
| `(auth)/password-reset/confirm` | あり | なし（画面タイトル「新しいパスワードを設定」を上部に表示）|
| `(auth)/two-factor-verify` | あり | なし（`two-factor-auth.md` の既存レイアウトを維持）|

`AuthBrandHeader` はログイン画面のみに表示する。他の画面では背景（`AuthScreenBackground`）のみを適用し、各画面固有のヘッダーレイアウトを壊さない。

#### 0.9.3 AuthScreenBackground コンポーネント仕様

**責務:** 全認証画面の最背面に鳥居参道の墨絵を薄く敷く装飾レイヤー。

**使用アセット:** `assets/images/auth-bg-gate-mobile.webp`（モバイル縦長フォーマット）

**レイアウト仕様:**

```
┌────────────────────────────────────────────────────┐
│  [absolute / top:0 / left:0 / right:0 / bottom:0]  │
│                                                    │
│  auth-bg-gate-mobile.webp                          │
│  contentFit="cover"                                │
│  opacity=0.25（範囲: 0.25〜0.30。実装時に視認性    │
│  を確認して最終値を決定すること）                   │
│                                                    │
└────────────────────────────────────────────────────┘
```

- 配置: `position: absolute` / `top: 0` / `left: 0` / `right: 0` / `bottom: 0`
- `contentFit`: `"cover"`（縦長画像が画面を埋めるよう拡縮する）
- `opacity`: `0.25`〜`0.30`（数値は実機確認後に最終決定。本文テキストの可読性を優先する）
- 画像コンポーネント: `expo-image`（`components.md` 規約のとおり標準 Image は使わない）
- アクセシビリティ: 純粋な装飾のため `accessibilityElementsHidden={true}` を付与し、スクリーンリーダーの対象外にする
- z-index: 最背面（コンテンツより後ろ）。`SafeAreaView` の兄弟として、スクリーン全体をラップする `View` の内側に置く

**背景地の色:**

背景画像の下地には `colorSurfaceWashi`（`#f7f7f7`）を画面全体の `backgroundColor` として設定する。
画像が読み込まれない（オフライン・エラー）場合でも、和紙色の単色背景が表示されフォームの可読性が保たれる。

**props 概要:**

| prop 名 | 型 | 意味 |
|---------|---|------|
| `opacity` | `number` | 背景不透明度（デフォルト: 0.27）。親から調整したい場合に使用 |

**実装の骨格（frontend 向け参照）:**

```
<View style={{ flex: 1, backgroundColor: colorSurfaceWashi }}>
  <AuthScreenBackground />      ← absolute で全面を覆う
  <SafeAreaView style={{ flex: 1 }}>
    {/* 各認証画面のコンテンツ */}
  </SafeAreaView>
</View>
```

この構造により、セーフエリア対応と背景の全面展開が共存する。

**4 状態での背景挙動:**

| 状態 | 背景の挙動 |
|------|----------|
| 通常 | `auth-bg-gate-mobile.webp` を opacity 0.27 で表示 |
| ローディング（フォーム送信中）| 背景はそのまま表示。フォームの送信中スピナーのみ変化 |
| エラー（API / ネットワーク）| 背景はそのまま表示。FormErrorMessage がコンテンツ層に表示 |
| オフライン | 背景はそのまま表示。OfflineBanner がコンテンツ層の最上部に表示 |

背景レイヤーはいずれの状態でも変化しない。エラー・オフライン時でも画面のビジュアルトーンが崩れない。

#### 0.9.4 AuthBrandHeader コンポーネント仕様（ログイン画面専用）

**責務:** ロゴ画像（brand-mark.png）とキャッチコピーを上部中央に表示するブランドヘッダー。ログイン画面（§1）のみに使用する。

**使用アセット:** `assets/images/brand-mark.png`（正方形・透過 PNG）

**レイアウト仕様（ワイヤーフレーム）:**

```
┌───────────────────────────────────────────────┐
│                                               │
│           ┌──────────┐                        │
│           │  [ロゴ]  │  ← brand-mark.png      │
│           │  130pt   │     幅 130pt / 高さ auto │
│           └──────────┘     contentFit="contain"│
│                                               │
│      盆栽愛好家のためのSNS                     │  ← キャッチコピー
│                                               │
└───────────────────────────────────────────────┘
```

**ロゴ画像仕様:**

| 項目 | 値 |
|------|---|
| ソース | `assets/images/brand-mark.png` |
| 表示幅 | 130pt（最小）〜 160pt（最大）。デフォルト 140pt を推奨 |
| 高さ | `undefined`（縦横比を維持する自動高さ。`aspectRatio` で制御）|
| `contentFit` | `"contain"` |
| 水平位置 | 中央揃え（`alignSelf: "center"`）|
| `accessibilityLabel` | `"BON-LOG 盆栽SNS"` |
| `accessibilityRole` | `"image"` |

- ロゴを `accessibilityRole="header"` にはしない（次のテキスト見出しと二重読み上げになるため、画像は `"image"` のみ）
- ロゴの下に画面タイトル「ログイン」（`textXl` / `colorTextPrimary`）を表示するかどうかは §1.2 のワイヤーフレームを参照

**キャッチコピー仕様:**

| 項目 | 値 |
|------|---|
| 文言 | 「盆栽愛好家のためのSNS」|
| フォントサイズ | `textBase`（14pt）|
| 字間 | `letterSpacingWide`（1.0）|
| 色 | `colorTextSecondary`（`#5c5c5c`）|
| 水平位置 | 中央揃え（`textAlign: "center"`）|
| ロゴとの間隔 | `spacing2`（8pt）|
| `accessibilityElementsHidden` | `true`（ロゴの `accessibilityLabel` に「盆栽SNS」が含まれるため、キャッチコピーの重複読み上げを防ぐ）|

**コンポーネント全体の余白:**

| 項目 | 値 |
|------|---|
| 上端マージン | `spacing6`（24pt）|
| 下端マージン | `spacing8`（32pt）|
| 水平パディング | なし（中央揃えのため不要）|

**props 概要:**

| prop 名 | 型 | 意味 |
|---------|---|------|
| `logoWidth` | `number` | ロゴ幅の上書き（デフォルト: 140）|

#### 0.9.5 フォームコンテナの背景

背景画像の上に重なるフォームカードには、テキストとフィールドの可読性を確保するための処理を行う。

**方針:** フォームエリアを「和紙半透明カード」として視覚的に浮かせる。

| 要素 | 仕様 |
|------|------|
| フォームコンテナ背景色 | `colorSurfaceWashi`（`#f7f7f7`）+ 透明度 90%（`rgba(247,247,247,0.90)`）|
| 角丸 | `radius2xl`（18pt）|
| 余白（内側）| `spacing5`（20pt）|
| 影 | `shadowWashi`（`design-tokens.md §6` の標準影）|
| 水平マージン | `spacing4`（16pt）（画面端から 16pt のマージン）|

**適用対象:** ログイン画面・新規登録画面・パスワードリセット画面のフォームエリア。

ただし `verify-email-sent`（完了画面）は中央揃えの静的コンテンツのためカードなしを許容する。`two-factor-verify` は `two-factor-auth.md` の既存仕様に委ね、本仕様での変更は背景（`AuthScreenBackground`）の追加のみとする。

**コントラスト確認（WCAG AA）:**

| テキスト色 | 実効背景色（カード + 画像 opacity 0.27 合成）| 判定 |
|-----------|------------------------------------------|------|
| `colorTextPrimary`（`#1a1a1a`）on `rgba(247,247,247,0.90)` | 近似: `#f7f7f7` | 17.4:1（AAA）|
| `colorTextSecondary`（`#5c5c5c`）on `rgba(247,247,247,0.90)` | 近似: `#f7f7f7` | 6.7:1（AA）|
| `colorError`（`#c0392b`）on `colorErrorBg`（`#fdf0ef`）| — | 4.8:1（AA）|

フォームカードの半透明処理により、背景画像の影響を受けても十分なコントラストが維持される。

#### 0.9.6 登録・完了・リセット画面でのブランド処理

`AuthBrandHeader` を置かないこれらの画面では、背景（`AuthScreenBackground`）のみを適用し、各画面固有の画面タイトルをそのまま維持する。

`(auth)/register/verify-email-sent` については、`welcome-bonsai.webp`（`assets/images/` に配置済み）を既存の装飾要素として使う可能性がある。ただし現仕様では Lucide 系アイコンで代替しており（§3.2）、画像使用の追加は **PM に要判断**。

---

## 1. ログイン画面 `(auth)/login`

### 1.1 概要・目的

メールアドレス + パスワードによるログイン。Google OAuth オプションを提供する。
未登録ユーザーへは新規登録へのリンクを、パスワードを忘れたユーザーにはリセットへのリンクを案内する。

### 1.2 画面構成（ワイヤーフレーム）

```
┌──────────────────────────────────────────────────────┐
│  [セーフエリア上端]                                   │
│                                                      │
│  [AuthScreenBackground: 全面 absolute / opacity 0.27] │  ← 最背面
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  [AuthBrandHeader]                           │    │  ← ロゴ画像 + キャッチコピー
│  │                                              │    │
│  │    ┌─────────┐                               │    │
│  │    │[ロゴ画像]│  140pt 幅 / brand-mark.png   │    │
│  │    └─────────┘                               │    │
│  │                                              │    │
│  │    盆栽愛好家のためのSNS                      │    │  ← textBase / colorTextSecondary
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────── [フォームカード] ──────────────┐    │  ← colorSurfaceWashi 90% / radius2xl
│  │                                              │    │     margin: spacing4
│  │  ログイン                                    │    │  ← textXl / colorTextPrimary
│  │                                              │    │
│  │  メールアドレス                               │    │  ← ラベル
│  │  ┌──────────────────────────────────────┐   │    │
│  │  │ mail@example.com                    │   │    │  ← AuthTextField
│  │  └──────────────────────────────────────┘   │    │
│  │                                              │    │
│  │  パスワード                                   │    │  ← ラベル
│  │  ┌──────────────────────────────────────┐   │    │
│  │  │ 8文字以上（英字・数字を含む）      👁 │   │    │  ← PasswordField
│  │  └──────────────────────────────────────┘   │    │
│  │                                              │    │
│  │  [フォーム全体エラー（表示時のみ）]          │    │  ← FormErrorMessage
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐   │    │
│  │  │            ログイン                  │   │    │  ← AuthPrimaryButton / 高さ 48pt
│  │  └──────────────────────────────────────┘   │    │
│  │                                              │    │
│  │  ── または ──                                │    │  ← AuthDivider
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐   │    │
│  │  │  [G]  Google でログイン              │   │    │  ← GoogleSignInButton / 高さ 48pt
│  │  └──────────────────────────────────────┘   │    │
│  │                                              │    │
│  │  パスワードをお忘れですか？                   │    │  ← テキストリンク / 中央揃え
│  │  アカウントをお持ちでない方は 新規登録        │    │  ← テキストリンク / 中央揃え
│  │                                              │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [セーフエリア下端]                                   │
└──────────────────────────────────────────────────────┘
```

- 全体は `View`（`flex: 1`、`backgroundColor: colorSurfaceWashi`）+ `AuthScreenBackground`（absolute 背景）+ `SafeAreaView` + `KeyboardAvoidingView` + `ScrollView`（`contentContainerStyle: flexGrow: 1`）
- 画面上部の `AuthBrandHeader`（ロゴ + キャッチコピー）はフォームカードの外に置く
- フォームカードは `colorSurfaceWashi` 90% 半透明・`radius2xl`・`shadowWashi`・`margin: spacing4` で背景から浮かせる
- フッターリンク 2 件は縦並び中央揃えで `spacing6`（24pt）のマージン上端を設ける

### 1.3 フィールド仕様

| フィールド | ラベル | placeholder | keyboardType | autoComplete / textContentType | 備考 |
|-----------|--------|-------------|--------------|-------------------------------|------|
| メールアドレス | メールアドレス | `mail@example.com` | `email-address` | autoComplete: `email` / textContentType: `emailAddress` | autoCapitalize: `none` / autoCorrect: `false` |
| パスワード | パスワード | `8文字以上（英字・数字を含む）` | `default` | autoComplete: `current-password` / textContentType: `password` | secureTextEntry（PasswordField） |

`textContentType` は iOS のオートフィル / パスワードマネージャー連携に使用する。Android の `autoComplete` と対応する。

### 1.4 フォーカス順と returnKeyType

1. メールアドレス → `returnKeyType="next"` → パスワードフィールドへフォーカス移動
2. パスワード → `returnKeyType="done"` → キーボードを閉じる

### 1.5 バリデーション

**blur 時（フィールドを離れたとき）:**

| フィールド | 検証 | エラー文言 |
|-----------|------|----------|
| メールアドレス | 空チェック | 「メールアドレスを入力してください」|
| メールアドレス | メール形式 | 「有効なメールアドレスを入力してください」|
| パスワード | 空チェック | 「パスワードを入力してください」|

**送信時（全フィールド一括 + API エラー）:**

| ケース | 表示箇所 | エラー文言（定数名） |
|-------|---------|-----------------|
| 認証情報が不正 | FormErrorMessage | `ERR_LOGIN_INVALID_CREDENTIALS`「メールアドレスまたはパスワードが間違っています」|
| メール未確認 | FormErrorMessage + 「確認メールを再送する」ボタン | `ERR_EMAIL_NOT_VERIFIED`「メールアドレスがまだ確認されていません。確認メールのリンクをクリックするか、下のボタンから再送してください。」|
| レート制限 (429) | FormErrorMessage | `MSG_LOGIN_RATE_LIMITED`「ログイン試行回数の上限に達しました。しばらく待ってから再試行してください。」|
| ネットワークエラー | FormErrorMessage | 「ネットワーク接続を確認してください」|
| その他サーバーエラー | FormErrorMessage | `MSG_LOGIN_ERROR`「ログイン中にエラーが発生しました。再度お試しください。」|

注意: `ERR_EMAIL_NOT_VERIFIED` は識別子として特別扱いする。このエラーが返ってきた場合のみ「確認メールを再送する」ボタンを FormErrorMessage の下に表示する（Web 版の `LoginForm.tsx` と同じ分岐）。

### 1.6 成功時の挙動

- ログイン成功 → `queryClient.clear()` してから `(tabs)/feed` へ replace（スタックを残さない）
- ディープリンク経由でログイン画面に来た場合は、認証後に元の遷移先へ戻る（`navigation.md` §3）

### 1.7 状態と挙動まとめ

| 状態 | 挙動 |
|------|------|
| ローディング（送信中） | AuthPrimaryButton がスピナー表示 / GoogleSignInButton も disabled / フィールドを disabled / **AuthBrandHeader・AuthScreenBackground は変化しない** |
| エラー（API） | FormErrorMessage に表示 / ボタン再活性化 / **背景・ロゴは変化しない** |
| メール未確認エラー | FormErrorMessage + 「確認メールを再送する」ボタン（押すと再送 API を呼び、成功で `verify-email-sent` へ遷移） |
| オフライン | FormErrorMessage にオフライン文言 / OfflineBanner を表示 / **背景・ロゴは変化しない** |

### 1.8 コピー案

| 箇所 | 文言 |
|------|------|
| ロゴ accessibilityLabel | 「BON-LOG 盆栽SNS」|
| キャッチコピー | 「盆栽愛好家のためのSNS」|
| 画面タイトル | 「ログイン」|
| メールラベル | 「メールアドレス」|
| パスワードラベル | 「パスワード」|
| 主要ボタン（通常）| 「ログイン」|
| 主要ボタン（送信中）| （スピナーのみ。文言は出さない）|
| Google ボタン | 「Google でログイン」|
| リンク 1 | 「パスワードをお忘れですか？」→ `password-reset` へ |
| リンク 2 | 「アカウントをお持ちでない方は」+ リンクテキスト「新規登録」→ `register` へ |
| 確認メール再送ボタン（エラー時） | 「確認メールを再送する」/ 送信中「送信中...」|

### 1.9 ナビゲーション

- 遷移元: ルートレイアウトの認証ガード（未認証の場合）/ アカウント削除後 / ログアウト後
- 遷移先: `(tabs)/feed`（ログイン成功）/ `(auth)/register`（新規登録リンク）/ `(auth)/password-reset`（リセットリンク）
- ヘッダー: なし（(auth) スタックはヘッダーを非表示にするか、最小限のものを使用。`navigation.md` §5.1 モーダルヘッダーではなく、スタックヘッダーの「戻るなし」版）

iOS / Android 差異: (auth) スタック内では戻る操作は不要（ガードで管理）。フォーム間の移動はリンクで行う。

### 1.10 アクセシビリティ

- ロゴ画像に `accessibilityRole="image"` / `accessibilityLabel="BON-LOG 盆栽SNS"`
- キャッチコピーに `accessibilityElementsHidden={true}`（ロゴラベルで内容が伝わるため重複読み上げを避ける）
- 背景画像（`AuthScreenBackground`）に `accessibilityElementsHidden={true}`（装飾のため）
- 各フィールドの `accessibilityLabel` はラベル文言と一致させる（「メールアドレス入力」）
- `accessibilityHint`: パスワードフィールドに「8文字以上の英字と数字を含むパスワード」
- エラーが出たとき: `accessibilityLiveRegion="assertive"` を FormErrorMessage に設定し、読み上げを即時トリガー
- フォーカス移動後: エラー発生フィールドに自動フォーカスを戻す処理は送信時の一括バリデーション後に最初のエラーフィールドへ `focus()` する

---

## 2. 新規登録画面 `(auth)/register`

### 2.1 概要・目的

ニックネーム・メールアドレス・パスワードを入力してアカウントを作成する。
利用規約・プライバシーポリシーへの同意を必須とする（store-compliance.md 要件）。

### 2.2 画面構成（ワイヤーフレーム）

```
┌─────────────────────────────────────────┐
│  ← [セーフエリア上端]                   │
│                                         │
│  [AuthScreenBackground: 全面 absolute]  │  ← 最背面（background のみ。AuthBrandHeader なし）
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │  ← colorSurfaceWashi 90% / radius2xl
│  │                                   │  │
│  │  新規登録                         │  │  ← textXl / colorTextPrimary
│  │                                   │  │
│  │  ニックネーム                      │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ 表示名（50文字以内）         │ │  │  ← AuthTextField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  メールアドレス                    │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ mail@example.com            │ │  │  ← AuthTextField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  パスワード                        │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ 8文字以上（英字・数字を含む） 👁│ │  │  ← PasswordField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  パスワード（確認）                │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ もう一度入力               👁│ │  │  ← PasswordField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  ☐  [利用規約] および              │  │  ← AuthTermsAgreement
│  │     [プライバシーポリシー] に同意  │  │
│  │                                   │  │
│  │  [フォーム全体エラー（表示時のみ）]│  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │         新規登録             │ │  │  ← AuthPrimaryButton / 高さ 48pt
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  ── または ──                      │  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │  [G]  Google で登録          │ │  │
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  既にアカウントをお持ちの方は ログイン│ │  ← テキストリンク / 中央揃え
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ← [セーフエリア下端]                   │
└─────────────────────────────────────────┘
```

### 2.3 フィールド仕様

| フィールド | ラベル | placeholder | keyboardType | autoComplete / textContentType | 備考 |
|-----------|--------|-------------|--------------|-------------------------------|------|
| ニックネーム | ニックネーム | `表示名（50文字以内）` | `default` | autoComplete: `username` / textContentType: `username` | maxLength: 50（`MAX_NICKNAME_LENGTH`）/ autoCapitalize: `none` / autoCorrect: `false` |
| メールアドレス | メールアドレス | `mail@example.com` | `email-address` | autoComplete: `email` / textContentType: `emailAddress` | autoCapitalize: `none` / autoCorrect: `false` |
| パスワード | パスワード | `8文字以上（英字・数字を含む）` | `default` | autoComplete: `new-password` / textContentType: `newPassword` | secureTextEntry / PasswordField |
| パスワード（確認）| パスワード（確認）| `もう一度入力` | `default` | autoComplete: `new-password` / textContentType: `newPassword` | secureTextEntry / PasswordField（独立した表示切替）|

`textContentType: "newPassword"` は iOS のパスワードマネージャーが「強力なパスワードを提案」するトリガーになる。確認フィールドも同じ `newPassword` にする（一致チェックのために同じ値を入力させるため）。

### 2.4 フォーカス順と returnKeyType

1. ニックネーム → `"next"` → メールアドレスへ
2. メールアドレス → `"next"` → パスワードへ
3. パスワード → `"next"` → パスワード（確認）へ
4. パスワード（確認）→ `"done"` → キーボードを閉じる

### 2.5 バリデーション

**blur 時:**

| フィールド | 検証 | エラー文言 |
|-----------|------|----------|
| ニックネーム | 空チェック | 「ニックネームを入力してください」|
| ニックネーム | 文字数 50 以下 | 「ニックネームは50文字以内で入力してください」|
| メールアドレス | 空チェック | 「メールアドレスを入力してください」|
| メールアドレス | メール形式 | 「有効なメールアドレスを入力してください」|
| パスワード | 空チェック | 「パスワードを入力してください」|
| パスワード | 8 文字以上 | `ERR_PASSWORD_MIN_LENGTH`「パスワードは8文字以上で入力してください」|
| パスワード | 英字含む | `ERR_PASSWORD_REQUIRE_LETTER`「パスワードはアルファベットを含めてください」|
| パスワード | 数字含む | `ERR_PASSWORD_REQUIRE_NUMBER`「パスワードは数字を含めてください」|
| パスワード（確認）| パスワードと一致 | `MSG_PASSWORD_MISMATCH`「パスワードが一致しません」|

**送信時（全フィールド一括 + API エラー）:**

| ケース | エラー文言（定数名）|
|-------|-----------------|
| 同意チェックなし | `MSG_TERMS_AGREEMENT_REQUIRED`「利用規約とプライバシーポリシーに同意してください」|
| パスワード不一致 | `MSG_PASSWORD_MISMATCH` |
| メール重複 | `ERR_EMAIL_ALREADY_REGISTERED`「このメールアドレスは既に登録されています」|
| ニックネーム予約済み | `ERR_NICKNAME_RESERVED`「このユーザー名は利用できません。別のユーザー名をご利用ください。」|
| ネットワークエラー | 「ネットワーク接続を確認してください」|
| その他サーバーエラー | 「登録中にエラーが発生しました。再度お試しください。」|

### 2.6 利用規約同意（AuthTermsAgreement）

- チェックボックス + テキストの横並び行
- チェックボックス: 20 x 20pt / 角丸 `radiusXs`（4pt）/ チェック色 `colorActionPrimary`
- テキスト: `textSm`（12pt）/ `colorTextSecondary`
- 「利用規約」「プライバシーポリシー」はインラインのテキストリンク / `colorTextLink`（`#2e2e2e`）/ underline
- リンク先: Web 版の URL（`https://www.bon-log.com/terms` / `https://www.bon-log.com/privacy`）を `Linking.openURL` でブラウザで開く
- タップターゲット: チェックボックスと隣接テキスト全体を押せるようにする（Pressable でラップ）
- チェック未入力のまま送信 → FormErrorMessage に `MSG_TERMS_AGREEMENT_REQUIRED` を表示

store-compliance.md 要件: Google Play ユーザー生成コンテンツポリシーの「利用規約への同意導線」を満たすための必須要素。削除・省略不可。

### 2.7 成功時の挙動

- 登録成功 → `(auth)/register/verify-email-sent` へ `router.push()`（スタックに積み、戻れないよう `replace` も可。PM に要確認）

### 2.8 状態と挙動まとめ

| 状態 | 挙動 |
|------|------|
| 送信中 | AuthPrimaryButton スピナー / 全フィールド disabled / GoogleSignInButton disabled |
| エラー（API）| FormErrorMessage 表示 / フォーカスを FormErrorMessage またはエラーフィールドへ |
| オフライン | FormErrorMessage にオフライン文言 / OfflineBanner 表示 |

### 2.9 コピー案

| 箇所 | 文言 |
|------|------|
| 画面タイトル | 「新規登録」|
| ニックネームラベル | 「ニックネーム」|
| メールラベル | 「メールアドレス」|
| パスワードラベル | 「パスワード」|
| パスワード確認ラベル | 「パスワード（確認）」|
| 同意文言 | 「利用規約およびプライバシーポリシーに同意します」（リンク部分を下線で区別）|
| 主要ボタン（通常）| 「新規登録」|
| 主要ボタン（送信中）| （スピナーのみ）|
| Google ボタン | 「Google で登録」|
| 下部リンク | 「既にアカウントをお持ちの方は」+ 「ログイン」|

### 2.10 ナビゲーション

- 遷移元: ログイン画面のリンク / 未認証でのアクセス
- 遷移先: `(auth)/register/verify-email-sent`（登録成功）/ `(auth)/login`（ログインリンク）

---

## 3. メール確認送信完了画面 `(auth)/register/verify-email-sent`

### 3.1 概要・目的

新規登録後にメール確認を促す静的な完了画面。ユーザーにメールを確認するよう案内し、ログイン画面への導線を提供する。

### 3.2 画面構成（ワイヤーフレーム）

```
┌─────────────────────────────────────────┐
│  ← [セーフエリア上端]                   │
│                                         │
│  [AuthScreenBackground: 全面 absolute]  │  ← 最背面
│                                         │
│                                         │
│         ✉                              │  ← メールアイコン（emoji ではなく Lucide の Mail アイコン推奨）
│                                         │     72pt / colorActionPrimary 塗り
│                                         │
│     メールをご確認ください              │  ← textXl / colorTextPrimary / 中央
│                                         │
│   ご登録のメールアドレスに              │  ← textBase / colorTextSecondary / 中央
│   確認メールを送信しました。            │
│   メール内のリンクをクリックして        │
│   登録を完了してください。              │
│                                         │
│   迷惑メールフォルダもご確認ください。  │  ← textSm / colorTextTertiary / 中央
│                                         │
│  ┌───────────────────────────────┐     │
│  │     ログイン画面へ戻る        │     │  ← AuthPrimaryButton（通常状態のみ）
│  └───────────────────────────────┘     │
│                                         │
│                                         │
│  ← [セーフエリア下端]                   │
└─────────────────────────────────────────┘
```

- `AuthScreenBackground` を最背面に配置し、コンテンツは中央揃えで重ねる
- レイアウト: `flex: 1` / `justifyContent: center` / `alignItems: center` / `padding: spacing8`
- アイコンは骨格実装の絵文字（✉）を Lucide 系の Mail アイコンに置き換える（絵文字は OS によって見た目が異なるため）
  - アイコンをくるむ円: 直径 80pt / `colorSurfaceMuted` 背景 / `radiusFull`
  - アイコン色: `colorActionPrimary`（`#2e2e2e`）/ サイズ 36pt
- ボタンは画面幅から水平パディング `spacing4`（16pt）を引いた幅
- 本画面はデータ取得なし・静的表示のため、フォームカード（半透明 `colorSurfaceWashi` コンテナ）を使わず、コンテンツを直接中央配置する。背景とのコントラストは、コンテンツのテキスト色（`colorTextPrimary`）と背景画像の低 opacity により十分確保される

### 3.3 コピー案

| 箇所 | 文言 |
|------|------|
| 画面タイトル（accessibilityRole="header"）| 「メールをご確認ください」|
| 本文 | 「ご登録のメールアドレスに確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。」|
| ヒントテキスト | 「メールが届かない場合は、迷惑メールフォルダもご確認ください。」|
| ボタン | 「ログイン画面へ戻る」|

### 3.4 ナビゲーション

- 遷移元: `(auth)/register`（登録成功後の push）
- 遷移先: `(auth)/login`（ボタンタップ → `router.replace(routes.login)` でスタックを置き換え、戻れないようにする）
- ハードウェアバックボタン（Android）: ログイン画面へ戻るのみ許容（`register` 画面に戻さない）。`router.replace` で戻るスタックを消す

### 3.5 状態

この画面はデータ取得を行わないため、ローディング / エラー / オフラインの状態は不要。

| 状態 | 対応 |
|------|------|
| （なし）| 静的画面のため状態なし |

### 3.6 アクセシビリティ

- 画面タイトルに `accessibilityRole="header"`
- メールアイコンに `accessibilityLabel="メール"` / `accessibilityRole="image"`
- 背景画像に `accessibilityElementsHidden={true}`
- ボタンに `accessibilityLabel="ログイン画面へ戻る"`

---

## 4. パスワードリセット申請画面 `(auth)/password-reset`

### 4.1 概要・目的

登録済みメールアドレスを入力し、パスワード再設定メールを送信する。
送信後は画面内でインライン成功状態に切り替える（別画面への遷移は行わない）。

### 4.2 画面構成（ワイヤーフレーム）

**通常状態（入力フォーム）:**

```
┌─────────────────────────────────────────┐
│  ← [セーフエリア上端]                   │
│                                         │
│  [AuthScreenBackground: 全面 absolute]  │  ← 最背面
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │  ← colorSurfaceWashi 90% / radius2xl
│  │                                   │  │
│  │  パスワードの再設定               │  │  ← textXl / colorTextPrimary
│  │                                   │  │
│  │  登録したメールアドレスを入力して  │  │  ← textBase / colorTextSecondary
│  │  ください。パスワード再設定用の   │  │
│  │  リンクをお送りします。           │  │
│  │                                   │  │
│  │  メールアドレス                    │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ mail@example.com            │ │  │  ← AuthTextField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  [フォーム全体エラー（表示時のみ）]│  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │   再設定メールを送信する     │ │  │  ← AuthPrimaryButton / 高さ 48pt
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  ← ログインページへ戻る           │  │  ← テキストリンク
│  │                                   │  │
│  └───────────────────────────────────┘  │
│                                         │
│  ← [セーフエリア下端]                   │
└─────────────────────────────────────────┘
```

**送信成功後（インライン成功状態）:**

```
┌─────────────────────────────────────────┐
│  [AuthScreenBackground: 全面 absolute]  │
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │
│  │  パスワードの再設定               │  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ ✓  メールを送信しました      │ │  │  ← 背景 colorSuccessBg / 左端ボーダー colorSuccess
│  │  │ 入力されたメールアドレスに   │ │  │     textBase / colorTextPrimary
│  │  │ パスワードリセット用のリンクを│ │  │
│  │  │ 送信しました。               │ │  │
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  メールが届かない場合は、          │  │  ← textSm / colorTextSecondary
│  │  迷惑メールフォルダもご確認ください│  │
│  │                                   │  │
│  │  ← ログインページへ戻る           │  │  ← テキストリンク
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### 4.3 フィールド仕様

| フィールド | ラベル | placeholder | keyboardType | autoComplete / textContentType | 備考 |
|-----------|--------|-------------|--------------|-------------------------------|------|
| メールアドレス | メールアドレス | `mail@example.com` | `email-address` | autoComplete: `email` / textContentType: `emailAddress` | autoCapitalize: `none` / autoCorrect: `false` |

フィールドは 1 つのみ。フォーカス順: `returnKeyType="done"` でキーボードを閉じる。

### 4.4 バリデーション

**blur 時:**

| フィールド | 検証 | エラー文言 |
|-----------|------|----------|
| メールアドレス | 空チェック | `MSG_EMAIL_REQUIRED`「メールアドレスを入力してください」|
| メールアドレス | メール形式 | 「有効なメールアドレスを入力してください」|

**送信時:**

| ケース | エラー文言（定数名）|
|-------|-----------------|
| レート制限 (429) | `ERR_RESET_TOO_MANY`「パスワードリセットの要求が多すぎます。しばらく経ってからお試しください。」|
| メール送信失敗（5xx）| `ERR_EMAIL_SEND_FAILED`「メールの送信に失敗しました。しばらく経ってからお試しください。」|
| ネットワークエラー | 「ネットワーク接続を確認してください」|

セキュリティ上の考慮: 存在しないメールアドレスでも「成功」扱いにする（列挙攻撃対策）。これはサーバー側の仕様に依存するため、サーバーが 200 を返す設計であれば成功状態に遷移する。

### 4.5 成功時の挙動

- API 呼び出し成功 → フォームを非表示にして成功メッセージ（インライン成功状態）を表示する（画面遷移なし）
- Web 版 `PasswordResetForm.tsx` の `success` 状態切り替えと同じ挙動

### 4.6 状態と挙動まとめ

| 状態 | 挙動 |
|------|------|
| 送信中 | AuthPrimaryButton スピナー / フィールド disabled |
| 成功 | インライン成功表示に切り替え（フォームを隠す）/ **背景は変化しない** |
| エラー（API）| FormErrorMessage 表示 / ボタン再活性化 |
| オフライン | FormErrorMessage にオフライン文言 / OfflineBanner 表示 |

### 4.7 コピー案

| 箇所 | 文言 |
|------|------|
| 画面タイトル | 「パスワードの再設定」|
| 説明文 | 「登録したメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。」|
| メールラベル | 「メールアドレス」|
| 主要ボタン（通常）| 「再設定メールを送信する」|
| 主要ボタン（送信中）| （スピナーのみ）|
| 戻るリンク | 「ログインページへ戻る」→ `login` へ |
| 成功タイトル | 「メールを送信しました」|
| 成功本文 | 「入力されたメールアドレスにパスワードリセット用のリンクを送信しました。メールをご確認ください。」|
| ヒントテキスト | 「メールが届かない場合は、迷惑メールフォルダもご確認ください。」|

### 4.8 ナビゲーション

- 遷移元: ログイン画面のリンク
- 遷移先: `(auth)/login`（戻るリンクタップ）
- ヘッダー: スタックヘッダー（戻るボタンあり）で「パスワードの再設定」を表示するか、ヘッダーなしでリンクのみにするかは骨格実装に合わせてヘッダーなしを推奨（他の認証画面と統一）

---

## 5. パスワードリセット確認画面 `(auth)/password-reset/confirm`

### 5.1 概要・目的

メール中のリセットリンク（ディープリンクまたはブラウザ経由）にアクセスしたユーザーが新しいパスワードを設定する画面。
リンクのトークン有効性を確認してから入力フォームを表示する。

### 5.2 ディープリンク受け取り

- リセットメールのリンク: `https://www.bon-log.com/auth/password-reset/confirm?token=XXX&email=YYY` 形式（Web 版仕様）
- モバイル版: `bonlog://password-reset/confirm?token=XXX&email=YYY` または App Links で処理（`navigation.md` §7 参照）
- **core に要相談:** パスワードリセットリンクのスキームをモバイルに対応させる設計がサーバー側で必要。現状の Web 版 URL をそのままモバイルに転送できるか確認が必要。

パラメータ取得: `useLocalSearchParams()` → `token` / `email` を取得。型は `string | string[]` のため、**必ず文字列かどうか確認してから使う**（`navigation.md` 規約）。

### 5.3 画面構成（ワイヤーフレーム）

すべての状態で `AuthScreenBackground` を最背面に配置する。

**トークン検証中（VerifyingState）:**

```
┌─────────────────────────────────────────┐
│  [AuthScreenBackground: 全面 absolute]  │
│                                         │
│           ◎ （スピナー）                │  ← 画面中央 / colorActionPrimary
│      リンクを確認しています...          │  ← textBase / colorTextSecondary
│                                         │
└─────────────────────────────────────────┘
```

**トークン無効（TokenInvalidState）:**

```
┌─────────────────────────────────────────┐
│  [AuthScreenBackground: 全面 absolute]  │
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ リンクが無効です             │ │  │  ← 背景 colorErrorBg / 左端ボーダー colorError
│  │  │ リセットリンクが無効または   │ │  │
│  │  │ 期限切れです。              │ │  │
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  パスワードリセットを再度リクエスト│  │  ← テキストリンク → password-reset へ
│  │  ログインページへ戻る             │  │  ← テキストリンク → login へ
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**入力フォーム（通常状態）:**

```
┌─────────────────────────────────────────┐
│  [AuthScreenBackground: 全面 absolute]  │
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │
│  │  新しいパスワードを設定           │  │  ← textXl / colorTextPrimary
│  │                                   │  │
│  │  新しいパスワードを入力してください│  │  ← textBase / colorTextSecondary
│  │                                   │  │
│  │  新しいパスワード                  │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ 8文字以上（英字・数字を含む） 👁│ │  │  ← PasswordField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  新しいパスワード（確認）          │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ もう一度入力               👁│ │  │  ← PasswordField
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  [フォーム全体エラー（表示時のみ）]│  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │   パスワードを変更する       │ │  │  ← AuthPrimaryButton / 高さ 48pt
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  ログインページへ戻る             │  │  ← テキストリンク
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**成功状態（ResetSuccessState）:**

```
┌─────────────────────────────────────────┐
│  [AuthScreenBackground: 全面 absolute]  │
│                                         │
│  ┌──────────── [フォームカード] ──────┐  │
│  │                                   │  │
│  │  ┌──────────────────────────────┐ │  │
│  │  │ ✓ パスワードを更新しました   │ │  │  ← 背景 colorSuccessBg / 左端ボーダー colorSuccess
│  │  │ 新しいパスワードでログインできます │  │
│  │  │ ログインページへ移動します...│ │  │
│  │  └──────────────────────────────┘ │  │
│  │                                   │  │
│  │  今すぐログインする               │  │  ← テキストリンク / 中央揃え → login へ
│  │                                   │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

- 成功後は数秒後に自動的に `(auth)/login` へ遷移（Web 版 `TIMEOUT_AUTO_REDIRECT` 相当。値は `lib/constants/` の定数から参照）
- 自動遷移前にキャンセルする手段は設けない（Web 版と同じ挙動）

### 5.4 フィールド仕様

| フィールド | ラベル | placeholder | keyboardType | autoComplete / textContentType | 備考 |
|-----------|--------|-------------|--------------|-------------------------------|------|
| 新しいパスワード | 新しいパスワード | `8文字以上（英字・数字を含む）` | `default` | autoComplete: `new-password` / textContentType: `newPassword` | secureTextEntry / PasswordField |
| 新しいパスワード（確認）| 新しいパスワード（確認）| `もう一度入力` | `default` | autoComplete: `new-password` / textContentType: `newPassword` | secureTextEntry / PasswordField（独立した表示切替）|

フォーカス順:
1. 新しいパスワード → `"next"` → 確認フィールドへ
2. 新しいパスワード（確認）→ `"done"` → キーボードを閉じる

### 5.5 バリデーション

**blur 時:**

| フィールド | 検証 | エラー文言 |
|-----------|------|----------|
| 新しいパスワード | 空チェック | 「新しいパスワードを入力してください」|
| 新しいパスワード | 8 文字以上 | `ERR_PASSWORD_MIN_LENGTH`「パスワードは8文字以上で入力してください」|
| 新しいパスワード | 英字含む | `ERR_PASSWORD_REQUIRE_LETTER` |
| 新しいパスワード | 数字含む | `ERR_PASSWORD_REQUIRE_NUMBER` |
| 確認 | パスワードと一致 | `MSG_PASSWORD_MISMATCH`「パスワードが一致しません」|

**送信時:**

| ケース | エラー文言（定数名）|
|-------|-----------------|
| パスワード不一致 | `MSG_PASSWORD_MISMATCH` |
| トークン無効（再確認時）| `ERR_RESET_LINK_INVALID`「リセットリンクが無効または期限切れです。もう一度お試しください。」|
| ネットワークエラー | 「ネットワーク接続を確認してください」|
| その他 | 「パスワードの更新に失敗しました。再度お試しください。」|

### 5.6 状態と挙動まとめ

| 状態 | 挙動 |
|------|------|
| 初期表示（トークン確認中）| VerifyingState（スピナー）を表示 / **AuthScreenBackground は常時表示** |
| トークン無効 | TokenInvalidState を表示 |
| 入力フォーム | 通常の入力フォームを表示 |
| 送信中 | AuthPrimaryButton スピナー / フィールド disabled |
| 成功 | ResetSuccessState へ切り替え / 数秒後に login へ自動遷移 |
| エラー（API）| FormErrorMessage 表示 |
| オフライン | FormErrorMessage にオフライン文言 / OfflineBanner 表示 |

### 5.7 コピー案

| 箇所 | 文言 |
|------|------|
| 画面タイトル（フォーム）| 「新しいパスワードを設定」|
| 説明文 | 「新しいパスワードを入力してください。」|
| 新パスワードラベル | 「新しいパスワード」|
| 確認ラベル | 「新しいパスワード（確認）」|
| 主要ボタン（通常）| 「パスワードを変更する」|
| 主要ボタン（送信中）| （スピナーのみ）|
| 戻るリンク | 「ログインページへ戻る」|
| 検証中テキスト | 「リンクを確認しています...」|
| トークン無効タイトル | 「リンクが無効です」|
| トークン無効説明 | 「リセットリンクが無効または期限切れです。もう一度パスワードリセットをお試しください。」|
| 再リクエストリンク | 「パスワードリセットを再度リクエスト」→ `password-reset` へ |
| 成功タイトル | 「パスワードを更新しました」|
| 成功説明 | 「新しいパスワードでログインできます。ログインページへ移動します...」|
| 今すぐリンク | 「今すぐログインする」→ `login` へ |

### 5.8 ナビゲーション

- 遷移元: パスワードリセットメールのディープリンク
- 遷移先: `(auth)/login`（成功後自動遷移 / 今すぐリンク / 戻るリンク）/ `(auth)/password-reset`（再リクエストリンク）
- ディープリンク対応: `bonlog://password-reset/confirm` のスキーム定義が必要。**core に要相談**（サーバー側のリセットメールのリンク URL をモバイルへ転送する仕組みが必要。App Links / Universal Links の設定も含む）。

---

## 6. 全画面共通のエッジケース

| ケース | 挙動 |
|-------|------|
| ローディング | 入力フォームは即時表示。API 送信中のみ AuthPrimaryButton にスピナーを出す（フォーム全体のスケルトンは不要）。**背景・ロゴは変化しない** |
| 空状態 | フォーム画面には「空」状態は存在しない（初期状態が空のフォーム）|
| エラー（API）| FormErrorMessage でインライン表示。ページ遷移しない。**背景・ロゴは変化しない** |
| オフライン | OfflineBanner を上部に表示 + FormErrorMessage にオフライン文言。送信処理を中断する。**背景・ロゴは変化しない** |
| パスワードリセット確認画面のみ: トークンなしでアクセス | TokenInvalidState と同じ表示（`token` / `email` が params に存在しない場合）|
| 背景画像ロード失敗（ネットワーク問題等）| `expo-image` のキャッシュから表示を試みる。失敗した場合でも `backgroundColor: colorSurfaceWashi` が下地として表示され、フォームの可読性は維持される |

---

## 7. コンポーネント分割まとめ

| コンポーネント | 配置 | 備考 |
|-------------|------|------|
| `AuthScreenBackground` | `components/auth/AuthScreenBackground` | 全認証画面共通の背景画像レイヤー（`auth-bg-gate-mobile.webp` / absolute / opacity 0.27）|
| `AuthBrandHeader` | `components/auth/AuthBrandHeader` | ログイン画面専用のロゴ＋キャッチコピーヘッダー（`brand-mark.png` / 幅 140pt）|
| `AuthTextField` | `components/auth/AuthTextField` | ラベル + テキスト入力 + フィールドエラー |
| `PasswordField` | `components/auth/PasswordField` | `AuthTextField` + 表示切替ボタン |
| `AuthPrimaryButton` | `components/auth/AuthPrimaryButton` | 3 状態（通常 / 無効 / 送信中）|
| `AuthDivider` | `components/auth/AuthDivider` | 「または」区切り |
| `GoogleSignInButton` | `components/auth/GoogleSignInButton` | Google ブランドガイドライン準拠 |
| `FormErrorMessage` | `components/auth/FormErrorMessage` | フォーム全体エラーバナー |
| `AuthTermsAgreement` | `components/auth/AuthTermsAgreement` | 利用規約同意行 |
| `PasswordVisibilityToggle` | `PasswordField` 内部 | 独立コンポーネントとして切り出してもよい |

これらは `components/auth/` に集約する。`components/common/` には配置しない（認証フォーム専用のため）。

---

## 8. 既存との一貫性メモ

### 骨格実装（Native 側）との整合

現在の骨格実装（`app/(auth)/` 配下）からの差分:

| 骨格実装 | 本仕様での変更 |
|---------|-------------|
| フィールド高さ 44pt | 48pt に引き上げ（タップ余裕を確保）|
| パスワード表示切替なし | PasswordField で追加（必須）|
| バリデーションロジックなし | blur 時 + 送信時の二段階バリデーションを追加 |
| フォーム全体エラーなし | FormErrorMessage コンポーネントを追加 |
| 利用規約同意なし（register）| AuthTermsAgreement を追加（store-compliance 必須）|
| ✉ 絵文字（verify-email-sent）| Lucide 系アイコンに置き換え |
| ボタン無効化ロジックなし | 送信中 disabled / 必須フィールド空は disabled |
| インライン成功状態なし（password-reset）| success 状態への切り替えを追加 |
| VerifyingState / TokenInvalidState / ResetSuccessState なし | パスワードリセット確認画面に 4 状態を追加 |
| ブランドヘッダーなし（テキストのみ）| `AuthBrandHeader`（brand-mark.png ロゴ + キャッチコピー）を追加（ログイン画面）|
| 背景画像なし | `AuthScreenBackground`（auth-bg-gate-mobile.webp / opacity 0.27）を全認証画面に追加 |
| 画面背景色 `colorBackground`（白）| `colorSurfaceWashi`（`#f7f7f7`）に変更（背景画像下地として和紙色を使用）|

### Web 版 (`Bon_Log_cfw/components/auth/`) との整合

| Web 版出典ファイル | 揃えた点 |
|-----------------|---------|
| `LoginForm.tsx` | フィールド構成・placeholder 文言・パスワード表示切替・`ERR_EMAIL_NOT_VERIFIED` による再送ボタン分岐・Google ロゴ SVG（同一パス）|
| `RegisterForm.tsx` | フィールド構成・利用規約同意チェックボックス・パスワード確認フィールド（独立した表示切替）・フィールド順（ニックネーム → メール → パスワード → 確認）|
| `PasswordResetForm.tsx` | 送信後インライン成功表示（別画面遷移なし）・文言トーン |
| `PasswordResetConfirmForm.tsx` | VerifyingState / TokenInvalidState / ResetSuccessState の 3 状態 / 自動リダイレクト |
| `PasswordResetStates.tsx` | 各状態の文言・カラー（成功: muted / エラー: destructive → モバイルでは colorSuccessBg / colorErrorBg に変換）|
| `PasswordVisibilityToggle.tsx` | `accessibilityLabel` 文言「パスワードを表示」/ 「パスワードを隠す」を踏襲 |
| `errors/auth.ts` / `messages.ts` | エラー文言の定数名を揃え、モバイル版 `lib/constants/errors.ts` にも同じ定数を持つよう frontend に申し送り |
| 認証画面の背景（Web: `auth-bg-gate-mobile.webp` を opacity 低下で使用・和紙質感）| モバイル版も同アセット（`assets/images/auth-bg-gate-mobile.webp`）を opacity 0.27 で使用。墨絵トーンを Web 版と統一 |
| 認証画面のロゴ（Web: `brand-mark.png` ロゴ画像・モバイル向け画面では中央上部に配置）| モバイル版も `assets/images/brand-mark.png` を `AuthBrandHeader` コンポーネントで中央上部に配置。幅 140pt / `contentFit="contain"` |
| キャッチコピー「盆栽愛好家のためのSNS」（Web: ロゴ下に表示）| モバイル版も同文言を `AuthBrandHeader` 内に踏襲。フォントトークンは `textBase` / `letterSpacingWide` / `colorTextSecondary` |

---

## 9. 未確定事項・要判断

| 項目 | 内容 | 担当 |
|------|------|------|
| Google ログインの現フェーズでの挙動 | 骨格実装段階では「近日公開予定」としてフォールバックするか、ボタン自体を非表示にするか | **PM 判断** |
| verify-email-sent への遷移方式 | `router.push` か `router.replace` か（戻れるようにするかどうか）| **PM 判断** |
| パスワードリセットリンクのモバイル対応 | サーバー側のリセットメール URL を `bonlog://` スキームまたは App Links でモバイルアプリに転送する設計が必要 | **core に要相談** |
| `TIMEOUT_AUTO_REDIRECT` の値 | Web 版の `lib/constants/limits.ts` の定数と同じ値をモバイルに移植するか | **core に要相談** |
| パスワードバリデーションルールの正 | Web 版 `lib/validations/password.ts` のロジックと揃えること（英字 + 数字の必須、min 8 / max 72）。モバイルの `lib/utils/` にコピーを持つか、API エラーに完全依存するか | **core / frontend に要確認** |
| `MAX_NICKNAME_LENGTH` の参照先 | Web 版では `lib/constants/limits/post.ts` に 50 として定義済み。モバイルの `lib/constants/limits/` に移植が必要 | **frontend への申し送り** |
| ログイン成功後の `queryClient.clear()` タイミング | 画面遷移の前後どちらで行うか（前ユーザーのキャッシュ混入を防ぐため遷移前が安全）| **frontend への申し送り** |
| `AuthScreenBackground` の opacity 最終値 | 0.25〜0.30 の範囲で指定。実機（Android 実機 + iOS シミュレータの両方）でフォームテキストの可読性を確認してから最終値を決定する | **frontend が実機確認後に確定** |
| `AuthBrandHeader` のロゴ幅最終値 | 140pt をデフォルトとして提案するが、実機でのバランス（ロゴ + キャッチコピー + フォームカードの縦方向の収まり）を確認してから 130〜160pt の範囲で調整する | **frontend が実機確認後に確定** |
| `welcome-bonsai.webp` の使用 | verify-email-sent 画面への装飾画像追加の可否（現状はアイコン代替）| **PM 判断** |
| 新規登録・パスワードリセット画面のフォームカード | 半透明カード（colorSurfaceWashi 90%）を使用するかどうか。スクロール量が多い画面（register）では、フォームカードが背景画像を完全に覆ってしまう可能性がある。スクロールが多い場合は背景のみとしてカードなしにする選択肢も検討する | **frontend が実機確認後に判断** |
