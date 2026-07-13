# デザイントークン仕様 — Bon_Log Native

作成日: 2026-06-12
最終改訂: 2026-07-12（墨筆枠オーバーレイ実装への追従改訂 — §3・§4・§8「PostCard」。改訂元: `post-card.md` §4.1・§7.2、`sumi-e-theme-parity-2026-07-06.md`。同日追記: §6 シャドウ `shadowColor` を実装 `lib/constants/design-tokens.ts` の実値に合わせて修正、§8「FAB」を実装 `components/post/ComposeFab.tsx` の現行仕様に合わせて更新）
同日追記（2026-07-13・エラー色トークンの是正）: `colorError` の値が本書（`#c0392b`）と実装 `lib/constants/design-tokens.ts`（`#c21721`）とで食い違っていることを Web 準拠監査で発見し、§2.2・§2.3・§7 の該当値を実装に合わせて修正した。新規 §11 に判定根拠・是正対象コードの一覧を追記した
追記（2026-07-14・§11.5 の是正状況を更新）: §11.5 で「未修正・フォローアップ推奨」として引き継いでいた 9 ドキュメントについて、その後すべて是正済み（`#c0392b` → `#c21721` / `colorError`）であることを確認した。§11.5 を現状に合わせて更新した（旧文面は §11.5 内に履歴として残す）。

対象: `lib/constants/design-tokens.ts`（core が TypeScript 定数として実装）
前提: StyleSheet + 定数ベース（NativeWind 採否確定まで）

---

## 1. 設計方針

### 1.1 Web 版との関係

Web 版（Bon_Log_cfw）は `app/globals.css` に「書院造り — Shoin-zukuri Premium Design System」として和風デザインシステムを定義している。

- **カラー体系はグレースケール主体の墨絵調**（彩度ゼロの oklch 値が大半）に、和風ブランドカラー（bonsai-green / bonsai-brown 等）と特定の意味色（赤 = aka）が加わる構成
- モバイルはその体系を忠実に踏襲し、CSS カスタムプロパティを TypeScript 定数に移植する
- 彩度ゼロの `oklch(L 0 0)` 値は L 値から近似 hex に変換した

### 1.2 出典ファイル

| ファイル | 役割 |
|---------|------|
| `Bon_Log_cfw/app/globals.css` | CSS カスタムプロパティ定義（:root）— 主出典 |
| `Bon_Log_cfw/components/layout/MobileNav.tsx` | Web モバイルナビの色クラス実例 |
| `Bon_Log_cfw/components/post/PostCard.tsx` | PostCard の色クラス実例 |
| `Bon_Log_cfw/components/feed/FeedWithCompose.tsx` | FAB の色: `bg-bonsai-green` 実例 |

---

## 2. カラーパレット

### 2.1 基本原則

ライトモードのみを定義する。ダークモードは将来の要件確定後に別途追加する（Web 版に .dark テーマが存在するため将来対応可能な命名体系にしておく）。

### 2.2 Web 版トークン → モバイル hex 対応表

Web 版の oklch 値をモバイルで使える hex 値に変換した根拠を示す。

| Web トークン名 | Web 値 (oklch) | モバイル hex | 備考 |
|--------------|---------------|------------|------|
| `--background` | oklch(1 0 0) | `#ffffff` | 画面背景（真白） |
| `--foreground` | oklch(0.12 0 0) | `#1a1a1a` | 本文テキスト（深墨） |
| `--card` | oklch(0.99 0 0) | `#fcfcfc` | カード背景（ほぼ白） |
| `--card-foreground` | oklch(0.12 0 0) | `#1a1a1a` | カード内テキスト |
| `--primary` | oklch(0.20 0 0) | `#2e2e2e` | 主要アクション色（墨） |
| `--primary-foreground` | oklch(1 0 0) | `#ffffff` | プライマリボタンテキスト |
| `--secondary` | oklch(0.94 0 0) | `#e9e9e9` | セカンダリ背景 |
| `--secondary-foreground` | oklch(0.20 0 0) | `#2e2e2e` | セカンダリテキスト |
| `--muted` | oklch(0.96 0 0) | `#f0f0f0` | 薄いサポート背景 |
| `--muted-foreground` | oklch(0.40 0 0) | `#5c5c5c` | 補助テキスト（日時・カウント等） |
| `--accent` | oklch(0.92 0 0) | `#e2e2e2` | アクセント背景（選択状態等） |
| `--accent-foreground` | oklch(0.15 0 0) | `#212121` | アクセントテキスト |
| `--destructive` | oklch(0.52 0.20 26) | `#c21721` | 削除・破壊的アクション（赤）**（2026-07-13 修正: 旧値 `#c0392b` は oklch(0.52 0.20 26) の不正確な近似値だった。§11 参照）** |
| `--border` | oklch(0.85 0 0) | `#c8c8c8` | ボーダー |
| `--input` | oklch(0.90 0 0) | `#d9d9d9` | 入力フィールドの枠 |
| `--ring` | oklch(0.30 0 0) | `#424242` | フォーカスリング |
| **ブランドカラー** | | | |
| `--bonsai-green` | oklch(0.35 0 0) | `#4a4a4a` | FAB・アクセント（Web ではグレーに近い墨緑）|
| `--bonsai-brown` | oklch(0.40 0 0) | `#5c5c5c` | サポートカラー |
| `--bonsai-beige` | oklch(0.92 0 0) | `#e2e2e2` | 薄いベージュ調背景 |
| `--bonsai-cream` | oklch(0.96 0 0) | `#f0f0f0` | クリーム調背景 |
| **和風固有色** | | | |
| `--kinoko` | `#f0ece4` | `#f0ece4` | 鳥の子色（和紙クリーム）|
| `--washi` | oklch(0.98 0 0) | `#f7f7f7` | 和紙白（ナビ背景等） |
| `--sumi` | oklch(0.18 0 0) | `#252525` | 墨色（ナビアイコン等） |
| `--aka` | oklch(0.52 0.20 26) | `#c21721` | 朱色（印鑑・エラー）**（2026-07-13 修正: 旧値 `#c0392b` から修正。`--destructive` と同一 oklch 値のため同一 hex にする。§11 参照）** |
| `--matcha` | oklch(0.50 0 0) | `#737373` | 抹茶色（補助） |
| `--kincha` | oklch(0.47 0 0) | `#6a6a6a` | 金茶色（補助） |

**注意:** bonsai-green は Web では彩度ゼロの墨色として定義されている（oklch(0.35 0 0)）。
「緑」の印象はブランド名による連想であり、実際の色値はダーク寄りのグレー。
モバイルでも同じ値を使うが、アイコン・FAB に使う際は `#4a4a4a` の濃いグレーとして扱う。

### 2.3 セマンティックカラー（モバイル用途別）

以上の基本値を用途ごとに命名したセマンティック層を定義する。
core が `lib/constants/design-tokens.ts` に TypeScript オブジェクトとして実装する際はこの命名を使う。

```
色グループ → トークン名 → 値
```

#### 背景系

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorBackground` | `#ffffff` | 画面・モーダルの最背面 |
| `colorSurface` | `#fcfcfc` | カード・シート・セル |
| `colorSurfaceWashi` | `#f7f7f7` | ナビバー・ヘッダー |
| `colorSurfaceKinoko` | `#f0ece4` | ランディング的な温かみある背景（任意で使用） |
| `colorSurfaceMuted` | `#f0f0f0` | 非アクティブ・ローディングスケルトン |

#### テキスト系

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorTextPrimary` | `#1a1a1a` | 本文・見出し |
| `colorTextSecondary` | `#5c5c5c` | 補助テキスト（日時・カウント・プレースホルダー） |
| `colorTextTertiary` | `#8a8a8a` | さらに薄い補助（キャプション・ヒント） |
| `colorTextInverse` | `#ffffff` | 墨色背景上のテキスト |
| `colorTextLink` | `#2e2e2e` | リンク・ハッシュタグ（Web では primary = 墨） |
| `colorTextHashtag` | `#4a4a4a` | ハッシュタグ専用（Web: text-bonsai-green） |

#### ボーダー・セパレータ系

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorBorder` | `#c8c8c8` | 汎用ボーダー |
| `colorBorderLight` | `#e2e2e2` | 薄いセパレータ |
| `colorBorderFocus` | `#2e2e2e` | フォーカスリング（入力フィールド） |

#### アクション系

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorActionPrimary` | `#2e2e2e` | 主要ボタン背景（墨） |
| `colorActionPrimaryText` | `#ffffff` | 主要ボタンテキスト |
| `colorActionSecondary` | `#e9e9e9` | セカンダリボタン背景 |
| `colorActionSecondaryText` | `#2e2e2e` | セカンダリボタンテキスト |
| `colorFab` | `#4a4a4a` | FAB 背景（Web: bg-bonsai-green） |
| `colorFabText` | `#ffffff` | FAB アイコン・テキスト |

#### セマンティック（意味）系

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorSuccess` | `#3a6b42` | 成功・完了（bonsai-green 相当の緑系）|
| `colorSuccessBg` | `#eaf3eb` | 成功バックグラウンド |
| `colorError` | `#c21721` | エラー・削除（Web: --aka / --destructive）**（2026-07-13 修正: 旧値 `#c0392b` から `lib/constants/design-tokens.ts` の実装値に合わせて修正。§11 参照）** |
| `colorErrorBg` | `#fdf0ef` | エラーバックグラウンド |
| `colorWarning` | `#b8860b` | 警告（和風ゴールド） |
| `colorWarningBg` | `#fdf8e1` | 警告バックグラウンド |
| `colorInfo` | `#2c6e8a` | 情報・ヒント |
| `colorInfoBg` | `#e8f4f8` | 情報バックグラウンド |

**注意:** success / warning / info の hex 値は Web の oklch 定義には存在しない。
意味として補完した値のため、**core に要相談**（Web の既存 toast・badge の色と合わせた調整を推奨）。

#### ナビゲーション系

Web の MobileNav.tsx 実例から抽出:

| トークン名 | hex 値 | 用途 |
|-----------|--------|------|
| `colorNavBackground` | `#f7f7f7` | ボトムナビ背景（Web: bg-washi/90） |
| `colorNavIconActive` | `#252525` | アクティブタブアイコン（Web: text-sumi） |
| `colorNavIconInactive` | `#72727280` | 非アクティブタブアイコン（Web: text-sumi/40） |
| `colorNavLabel` | `#252525` | アクティブラベル |
| `colorNavLabelInactive` | `#72727280` | 非アクティブラベル |

---

## 3. 余白スケール

8pt ベースグリッドを採用する（44pt タップターゲットが 8 の倍数で確保しやすいため）。

| トークン名 | 値 | 用途例 |
|-----------|----|----|
| `spacing0` | 0 | |
| `spacing1` | 4pt | 微小間隔（アイコンとテキストの隙間） |
| `spacing2` | 8pt | タイト間隔（インライン要素間） |
| `spacing3` | 12pt | カード内の要素間隔 |
| `spacing4` | 16pt | 標準padding・セクション間 |
| `spacing5` | 20pt | カードの内側padding（PostCard相当） |
| `spacing6` | 24pt | セクション大間隔 |
| `spacing8` | 32pt | ページ上下マージン |
| `spacing10` | 40pt | 大きなセクション間 |
| `spacing12` | 48pt | 特大スペース |

**注意（2026-07-12 追記）:** `spacing5`＝「カードの内側padding（PostCard相当）」の記述は、PostCard への墨筆枠オーバーレイ（`post-frame.svg`）採用前の値。現行の PostCard は枠線の視覚的太さぶんを吸収するため `spacing5 + spacing2`（28pt）を `contentInner` インセットとして使用する（§4・§8「PostCard」参照。詳細: `post-card.md` §4.1）。`spacing5` 単体は、枠オーバーレイを持たない他の標準カードの内側padding基準として引き続き有効。

画面端のサイドパディング: `spacing4`（16pt）を標準とし、コンテンツが端まで伸びるカード（画像ギャラリー等）は `-spacing4`（-16pt）でネガティブマージンを取る（Web の `-mx-5` パターンに相当）。**（2026-07-11 時点で廃止。PostCard への墨筆枠オーバーレイ採用に伴い、画像ギャラリーのエッジ・トゥ・エッジ表示は廃止された。枠が独立レイヤーの `border-image` ではなく一枚絵のオーバーレイのため、画像を画面端まで拡張すると枠と重なることが理由。現行実装は画像も `contentInner` の安全インセット内に収める相対レイアウト（`width: 100%` 基準の flex/aspectRatio）。詳細: `post-card.md` §7.2、実装: `components/post/PostImageGallery.tsx`。本注記は 2026-07-12 追記）**

---

## 4. 角丸スケール

Web の `--radius: 0.625rem`（= 10px ≒ 10pt）を起点に派生させる。

| トークン名 | 値 | Web 対応 | 用途例 |
|-----------|----|---------|----|
| `radiusXs` | 4pt | `--radius-sm` (≈6px) | 微小要素（バッジ等） |
| `radiusSm` | 6pt | — | 小さなボタン・チップ |
| `radiusMd` | 8pt | `--radius-md` (≈8px) | 入力フィールド・小カード |
| `radiusLg` | 10pt | `--radius-lg` (= 10px) | 標準カード・ドロップアップメニュー |
| `radiusXl` | 14pt | `--radius-xl` (≈14px) | 大きめカード |
| `radius2xl` | 18pt | `--radius-2xl` (≈18px) | モーダルシート |
| `radiusFull` | 9999pt | — | 円形ボタン（FAB・アバター） |

PostCard は Web で `card-washi`（brushフレーム + `border-radius: 0`）を使うが、モバイルでは SVG 枠は再現しない。代わりに `radiusLg`（10pt）の標準カード形状を使用し、`shadow-washi` のような軽い影で品格を出す。**（2026-07-12 追記・取り消し注記: 上記「SVG 枠は再現しない」は撤回済み。2026-07-06 のユーザー指示による方針転換を受け、現行方針は下記の通り）**
（2026-07-06 ユーザー指示により方針転換。sumi-e-theme-parity 参照）

**現行方針（2026-07-11 実装済み）:** PostCard は `post-frame.svg`（`assets/images/brush-frames/post-frame.svg`）の墨筆枠オーバーレイをカード全面に再現する（`StyleSheet.absoluteFill` でカード実寸へ非一様伸縮・`contentFit: "fill"`）。カードの `borderRadius` は `radiusLg` ではなく **`0`**（角丸を廃し、筆線の揺らぎ自体で輪郭を表現する）。実装: `components/post/PostCard.tsx`。詳細仕様: `post-card.md` §4.1 を参照。

---

## 5. タイポグラフィ

### 5.1 フォント戦略

Web 版は明朝体（游明朝・Shippori Mincho 等）をシステムフォールバックで使用している。
モバイルでは OS 標準の日本語フォントを使用し、以下の方針で「和の品格」を維持する:

- **iOS**: ヒラギノ明朝 ProN → `HiraginoMincho-ProN` または `HiraginoSerif` （見出しのみ）
- **Android**: Noto Serif JP が端末にインストールされている場合のみ明朝体。基本はシステムフォント（Noto Sans JP）
- 本文・UI 要素: システムサンセリフ（iOS: SF Pro / Android: Roboto / Noto Sans）

**core に要相談:** iOS / Android のフォントファミリー指定は Platform.OS 分岐が必要。実装時に確認のこと。

### 5.2 テキストスケール

| トークン名 | fontSize | fontWeight | lineHeight | 用途 |
|-----------|----------|------------|-----------|------|
| `textXs` | 10pt | 400 | 14pt | タブラベル・バッジ |
| `textSm` | 12pt | 400 | 18pt | 補助テキスト・タイムスタンプ |
| `textBase` | 14pt | 400 | 22pt | 投稿本文・一般テキスト |
| `textMd` | 15pt | 400 | 23pt | リスト項目・ナビラベル |
| `textLg` | 17pt | 600 | 24pt | セクション見出し・ユーザー名 |
| `textXl` | 20pt | 700 | 28pt | ページタイトル |
| `text2xl` | 24pt | 700 | 32pt | 大見出し |

**letterSpacing（字間）の扱い:**
Web では和文の品格のため `tracking-widest`（letter-spacing: 0.15em 相当）や `tracking-[0.1em]` をナビラベル・見出しに使用している。
モバイルのナビラベル（10pt）には `letterSpacing: 1.5`（0.15em 相当）を適用する。
投稿本文には字間を付けない。

| トークン名 | 値 | 用途 |
|-----------|----|----|
| `letterSpacingNone` | 0 | 本文 |
| `letterSpacingTight` | 0.5 | 小テキスト |
| `letterSpacingWide` | 1.0 | ナビラベル（medium） |
| `letterSpacingWidest` | 1.5 | 見出し・ナビラベル（large） |

---

## 6. エレベーション（影）

Web の `.shadow-washi` 系を Mobile 用に変換する。React Native の shadow プロパティ（iOS）と elevation（Android）の両方を記述する。

**（2026-07-12 追記・取り消し注記）:** 以下 3 種の `shadowColor` は当初 `#18150a` と記載していたが、実装 `lib/constants/design-tokens.ts`（`shadowWashi` / `shadowWashiHover` / `shadowWashiLg`）を読み取った結果、実値は `#17100c` であることを確認した。実コードの値に合わせて `#17100c` に修正する（`shadowOffset` / `shadowOpacity` / `shadowRadius` / `elevation` は実コードと一致しており変更なし）。旧値 `#18150a` は取り消し注記として本段落に記録し、以後は使用しない。

### shadow-washi（PostCard 標準）

iOS:
```
shadowColor: '#17100c'
shadowOffset: { width: 0, height: 2 }
shadowOpacity: 0.06
shadowRadius: 6
```

Android:
```
elevation: 2
```

### shadow-washi-hover（PostCard ホバー / フォーカス相当）

iOS:
```
shadowColor: '#17100c'
shadowOffset: { width: 0, height: 4 }
shadowOpacity: 0.10
shadowRadius: 12
```

Android:
```
elevation: 4
```

### shadow-washi-lg（モーダル・ドロップアップ）

iOS:
```
shadowColor: '#17100c'
shadowOffset: { width: 0, height: 8 }
shadowOpacity: 0.14
shadowRadius: 20
```

Android:
```
elevation: 8
```

---

## 7. コントラスト比の検証

WCAG 2.1 AA 基準: 通常テキスト 4.5:1、大テキスト 3:1。

| テキスト色 (hex) | 背景色 (hex) | コントラスト比（近似） | 判定 |
|---------------|------------|-------------------|------|
| `#1a1a1a` on `#ffffff` | — | 18.1:1 | AA / AAA 達成 |
| `#1a1a1a` on `#fcfcfc` | — | 17.4:1 | AA / AAA 達成 |
| `#1a1a1a` on `#f0f0f0` | — | 15.6:1 | AA / AAA 達成 |
| `#5c5c5c` on `#ffffff` | — | 7.0:1 | AA / AAA 達成 |
| `#5c5c5c` on `#fcfcfc` | — | 6.7:1 | AA 達成 |
| `#5c5c5c` on `#f0f0f0` | — | 5.8:1 | AA 達成 |
| `#8a8a8a` on `#ffffff` | — | 3.7:1 | AA 未達（大テキストのみ AA） |
| `#ffffff` on `#2e2e2e` | — | 13.3:1 | AA / AAA 達成（プライマリボタン） |
| `#ffffff` on `#4a4a4a` | — | 8.8:1 | AA / AAA 達成（FAB） |
| `#c21721` on `#ffffff` | — | 約6.1:1 | AA 達成（エラー）**（2026-07-13 修正: 旧値 `#c0392b` の記載「4.8:1」から実装値 `#c21721` で再計算。§11 参照）** |

**判断:** `colorTextTertiary`（`#8a8a8a`）は補助的な最小テキスト（キャプション等）にのみ使用し、本文・重要テキストには使わない。

---

## 8. コンポーネント別適用例

frontend が実装する際の参照として、主要コンポーネントのトークン適用方針を示す。

### BottomTabBar

```
background: colorNavBackground
borderTop: 1pt solid colorBorderLight
iconActive: colorNavIconActive
iconInactive: colorNavIconInactive
labelActive: colorNavLabel  (textXs / letterSpacingWidest / fontWeight: 700)
labelInactive: colorNavLabelInactive  (textXs / letterSpacingWidest)
height: 60pt + セーフエリア下端
```

### PostCard

**現行仕様（2026-07-11 実装済み）:** 2026-07-06 の方針転換（PostCard への墨筆枠オーバーレイ採用）により、PostCard は「枠オーバーレイ＋内側インセット View」の2層構造になっている。詳細仕様は `post-card.md` §4.1 を正とする（本節はトークン早見表であり、実装差異が生じた場合は `post-card.md` を優先する）。

```
card（Pressable ルート。枠画像が完全不透明でない場合の保険地色 + 影の土台）
  background: colorSurface
  borderRadius: 0                 ← radiusLg から変更（角丸を廃し、筆線の輪郭で表現）
  marginBottom: spacing4
  shadow: shadow-washi（矩形近似。押下時 shadow-washi-hover に強化 + opacity 0.97）

frame（card 直下の子。墨筆枠オーバーレイ画像。post-frame.svg）
  position: StyleSheet.absoluteFill（card 全体へ非一様伸縮して追従）
  contentFit: "fill"
  装飾画像のためスクリーンリーダー対象から除外

contentInner（frame と兄弟の通常フロー View。カードの実質的な内側インセット）
  padding: spacing5 + spacing2（20pt + 8pt = 28pt）  ← 枠線の視覚的太さぶんを追加
```

本文: `textBase` / `colorTextPrimary`
補助（日時・カウント）: `textSm` / `colorTextSecondary`
ハッシュタグ: `colorTextHashtag`

**旧例（〜2026-07-06 時点。上記の方針転換により撤回・置換済み。参考として残す。本注記は 2026-07-12 追記）:**

```
background: colorSurface
borderRadius: radiusLg
padding: spacing5
marginBottom: spacing4
shadow: shadow-washi
```

### FAB（投稿ボタン）

**現行仕様（2026-07-12 追記・実装確認済み）:** FAB は塗りつぶし背景の円ボタンではなく、`button-blob.svg`（`assets/images/brush-frames/button-blob.svg`）を墨滴形状のオーバーレイ画像として重ねる方式に変更されている。実装: `components/post/ComposeFab.tsx`。

```
pressable（タップ領域のルート）
  width: 80pt / height: 80pt        ← FAB_SIZE。56pt から変更
  borderRadius: 0                    ← radiusFull から変更（円形は blob 画像自体の形状で表現するため View 側の角丸は使わない）
  background: なし（colorFab の塗りつぶしは廃止。色は blob 画像側が持つ）

blob（pressable に絶対配置で重ねる装飾画像）
  source: button-blob.svg
  contentFit: "fill"（80×80 固定サイズへ非一様伸縮）
  装飾画像のためスクリーンリーダー対象から除外

shadow: shadow-washi-lg（変更なし）
icon: colorFabText
bottom offset: spacing4 + BottomTabBar高さ(60pt) + セーフエリア下端
```

**旧例（〜2026-07-06 時点相当。上記の方針転換により撤回・置換済み。参考として残す。本注記は 2026-07-12 追記）:**

```
background: colorFab
width: 56pt / height: 56pt
borderRadius: radiusFull
shadow: shadow-washi-lg
icon: colorFabText
bottom offset: spacing4 + BottomTabBar高さ(60pt) + セーフエリア下端
```

### Avatar

```
size: 44pt / 44pt（PostCard内・タップターゲット44pt厳守）
borderRadius: radiusFull
border: 2pt solid colorBorder
background (fallback): colorSurfaceMuted
```

---

## 9. アニメーション・トランジション

Web 版は `cubic-bezier(0.25, 0.46, 0.45, 0.94)` を主に使用（`.hover-washi`）。

| トークン名 | 値 | 用途 |
|-----------|----|----|
| `durationFast` | 200ms | タップフィードバック |
| `durationNormal` | 300ms | 画面遷移・展開 |
| `durationSlow` | 500ms | フェードイン等 |
| `easingDefault` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Web と同一 |
| `easingBounce` | `cubic-bezier(0.36, 0.07, 0.19, 0.97)` | いいねバウンス（Web の animate-like-bounce 相当） |

---

## 10. 未確定事項・引き継ぎ

- **NativeWind 採否（計画書 未決事項#3）:** 確定後はこのトークン仕様を NativeWind の `theme.extend` に移植する。それまでは `lib/constants/design-tokens.ts` に純粋な TypeScript 定数として実装する。
- **success / warning / info の hex（上記 §2.2 後注）:** Web の既存 toast・badge 色との整合を core に要確認。
- **フォントファミリー名:** iOS の明朝体フォント名（`PostScript` 名）を実機で確認要。`core に要相談`。
- **ダークモード:** Web 版の `.dark` 定義は存在する。モバイルのダークモード対応は Phase 4 以降で別仕様として策定する。
- **bonsai-green の実際の意図:** Web 版では `oklch(0.35 0 0)`（彩度 0 のグレー）として定義されており実際に緑色ではない。将来のリブランドで「実際の緑」にする可能性がある場合は、**サーバーの OpenAPI 変更が不要な UI 側の変更として** frontend / designer 間で合意を取ること。

---

## 11. エラー色（colorError）の是正 — 2026-07-13 追記

### 11.1 発見の経緯

フォーム是正作業中に、以下 5 箇所のコードでエラーテキスト色を `colorError` トークン経由ではなく `#c0392b` のリテラルで直書きしていることが見つかった:

| ファイル | スタイルキー |
|---------|------------|
| `app/events/new/index.tsx` | `fieldError` |
| `app/events/[id]/edit/index.tsx` | `fieldError` |
| `app/shops/new/index.tsx` | `fieldError` |
| `app/shops/[id]/edit/index.tsx` | `fieldError` |
| `app/scheduled-posts/[id]/edit/index.tsx` | `counterOver` |

一方、同一機能内の `app/scheduled-posts/new/index.tsx` の `counterOver` は `colorError`（トークン）を正しく使っており、`scheduled-posts/new` と `scheduled-posts/[id]/edit` という同一画面ペアの間で実装が不統一だった。

### 11.2 判定: 乖離あり（本書とコード実装値の食い違い）

上記 5 箇所が直書きしていた `#c0392b` は、**偶然の誤字ではなく本書（2026-07-12 以前の版）の §2.2・§2.3・§7 が `colorError` の値として `#c0392b` と記載していたことに起因する**。一方、実際に core が実装した `lib/constants/design-tokens.ts` の `colorError` は `#c21721` であり、本書と実装の間に食い違いが生じていた。

**どちらが正しい値か:** Web 版 `Bon_Log_cfw/app/globals.css` の `--destructive` / `--aka` は共に `oklch(0.52 0.20 26)` と定義されている（ライトモード。ダークモードの `.dark` 定義は別値のため対象外）。この oklch 値を CSS Color Module 4 の標準変換式（OKLab 経由）で sRGB hex に変換すると **`#c21721`** になる（`R=194, G=23, B=33`）。本書が旧稿で記載していた `#c0392b` は、この標準変換より粗い近似（例: 手動での見た目合わせ）によるものと考えられ、正確な変換値ではない。

**したがって:**
- `lib/constants/design-tokens.ts` の `colorError = '#c21721'` は Web の `--destructive` / `--aka` の正確な変換値であり、**修正不要（実装が正）**
- 本書（§2.2 / §2.3 / §7）の `#c0392b` の記載は誤りであり、本改訂で `#c21721` に修正した
- 5 箇所のコードの `#c0392b` リテラルは、修正前の本書を参照して直書きされた結果であり、こちらもすべて `#c21721`（＝ `colorError` トークン）に是正する必要がある

### 11.3 採用する最終仕様

**エラーテキスト・エラーボーダーの色は、例外なく `colorError` トークン（`lib/constants/design-tokens.ts` からの import）を経由して参照する。** 別途エラー色専用の新規トークンを追加する必要はない（`colorError` 一本化で十分）。`#c0392b` はもちろん、いかなるエラー色のリテラル直書きも禁止する（CLAUDE.md 核心ルール7「マジックナンバー禁止」の適用）。

**最終色値: `colorError = '#c21721'`**（core / frontend が参照する値）。

### 11.4 frontend 実装仕様（何をどう変えるか）

以下 5 箇所で `color: '#c0392b'` を `color: colorError` に置き換え、各ファイル冒頭の `@/lib/constants/design-tokens` からの import 一覧に `colorError` を追加する（現状いずれのファイルも `colorError` を import していない）:

| ファイル | 修正箇所 | 修正前 | 修正後 |
|---------|---------|--------|--------|
| `app/events/new/index.tsx` | `styles.fieldError` | `color: '#c0392b'` | `color: colorError` |
| `app/events/[id]/edit/index.tsx` | `styles.fieldError` | `color: '#c0392b'` | `color: colorError` |
| `app/shops/new/index.tsx` | `styles.fieldError` | `color: '#c0392b'` | `color: colorError` |
| `app/shops/[id]/edit/index.tsx` | `styles.fieldError` | `color: '#c0392b'` | `color: colorError` |
| `app/scheduled-posts/[id]/edit/index.tsx` | `styles.counterOver` | `color: '#c0392b'` | `color: colorError` |

`app/scheduled-posts/new/index.tsx` の `counterOver`（既に `colorError` を使用済み）を実装リファレンスとして参照してよい。

### 11.5 ドキュメント側フォローアップの状況（2026-07-14 更新: 全件是正済み）

本改訂（2026-07-13）の時点では、上記 11.4 の 5 箇所のコードおよび本書自身（design-tokens.md）の値のみを是正し、以下は「同じ `#c0392b`（旧 `colorError` 誤記載値）を参照しているが、当時の依頼スコープ（フォームのエラーテキスト色）に直接該当しないため未修正」として PM 引き継ぎ事項に残していた。

**2026-07-13 時点で当初から本改訂の対象内として是正済みだったもの:**

- `auth-forms.md` §0.2 / §0.3 / §0.9.5（フォームの共通エラー方針を定義する文書）
- `scheduled-posts.md` §3.3（StatusBadge の「失敗」ラベル色）
- `post-composer.md` §6.2（本文カウンタの上限超過色）

**2026-07-13 時点で「未修正・フォローアップで一括修正することを推奨」としていた 9 ドキュメント:**

- `docs/design/ugc-safety.md`（§2.1・§15）
- `docs/design/two-factor-auth.md`（§10.4）
- `docs/design/post-card.md`（§10.5）
- `docs/design/common-states.md`（§4.4）
- `docs/design/notifications-screen.md`（§6.1・§7.1・§13）
- `docs/design/comment-composer.md`（§7.5）
- `docs/design/more-menu.md`（§11・§12）
- `docs/design/follow-and-engagement.md`（§2.2・§3.1）
- `docs/design/account-deletion.md`（§2.2「危険ゾーン」）

**（2026-07-14 追記）上記 9 ドキュメントについて是正状況を再確認したところ、いずれも `#c0392b` から `#c21721`（`colorError` トークン）への是正が完了していることを確認した。** 各ファイルとも「2026-07-13・エラー色トークンの是正」を明示した改訂注記を伴っており、本書 §11.1〜§11.4 と同じ根拠（Web `--destructive` / `--aka` の oklch 値の正確な sRGB 変換は `#c21721` である旨）を参照している。

**現状（2026-07-14 時点）: `colorError` の値表記に関する `#c0392b` → `#c21721` の是正は、本書が把握している対象範囲において全ドキュメント完了している。** 新規ドキュメント作成時・既存ドキュメント編集時は、引き続き §11.3 の方針（`colorError` トークン経由の参照を徹底し、リテラル直書きを禁止）を遵守すること。
