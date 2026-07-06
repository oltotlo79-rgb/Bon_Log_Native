# デザイントークン仕様 — Bon_Log Native

作成日: 2026-06-12
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
| `--destructive` | oklch(0.52 0.20 26) | `#c0392b` | 削除・破壊的アクション（赤） |
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
| `--aka` | oklch(0.52 0.20 26) | `#c0392b` | 朱色（印鑑・エラー） |
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
| `colorError` | `#c0392b` | エラー・削除（Web: --aka / --destructive） |
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

画面端のサイドパディング: `spacing4`（16pt）を標準とし、コンテンツが端まで伸びるカード（画像ギャラリー等）は `-spacing4`（-16pt）でネガティブマージンを取る（Web の `-mx-5` パターンに相当）。

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

PostCard は Web で `card-washi`（brushフレーム + `border-radius: 0`）を使うが、モバイルでは SVG 枠は再現しない。代わりに `radiusLg`（10pt）の標準カード形状を使用し、`shadow-washi` のような軽い影で品格を出す。
（2026-07-06 ユーザー指示により方針転換。sumi-e-theme-parity 参照）

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

### shadow-washi（PostCard 標準）

iOS:
```
shadowColor: '#18150a'
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
shadowColor: '#18150a'
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
shadowColor: '#18150a'
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
| `#c0392b` on `#ffffff` | — | 4.8:1 | AA 達成（エラー） |

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

```
background: colorSurface
borderRadius: radiusLg
padding: spacing5
marginBottom: spacing4
shadow: shadow-washi
```

本文: `textBase` / `colorTextPrimary`
補助（日時・カウント）: `textSm` / `colorTextSecondary`
ハッシュタグ: `colorTextHashtag`

### FAB（投稿ボタン）

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
