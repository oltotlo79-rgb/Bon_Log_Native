
# 墨絵テーマ精密再現仕様 — sumi-e-theme-parity

作成日: 2026-07-06
対象: `components/`, `app/`（frontend が実装）／アセットコピー元: `Bon_Log_cfw`（読み取り専用・編集禁止）
背景: 過去の Web/Native 監査（`web-parity-audit-defects-2026-07-04.md` 等）は機能・構成の乖離を対象にしており、
**Web の「墨絵の筆致」そのもの**（ブラシ画像・インク滲み・手描き曲線）は照合されていなかった。
本書はその筆致レベルの乖離を洗い出し、frontend が実装できる粒度まで仕様化する。

---

## 0. 結論（先出しサマリー）

Web 版の墨絵表現の核は **3 種類のカスタムブラシ SVG 画像**（投稿カード枠・投稿ボタンの墨だまり・区切り線）と、
**MobileNav 内にインライン記述された手描き波線 SVG パス**（アクティブタブの下線・墨点、区切り波線）である。
これらは `border-image` / `background-image` という **CSS 固有の技法**で実装されており、React Native には直接の対応 API が存在しない。

現状の Bon_Log_Native は:

- `card-washi`（投稿カードの墨筆枠）→ **未移植**。RN は角丸 + box-shadow の普通のカード（`components/post/PostCard.tsx`）
- `btn-washi`（投稿ボタンの墨だまりイラスト）→ **未移植**。RN は単色円 + Ionicons の鉛筆アイコン（`app/(tabs)/feed/index.tsx` の FAB）
- MobileNav の墨筆装飾（波線ボーダー・アクティブ墨点+下線・区切り波線）→ **未移植**。RN タブバーは単純な 1px ボーダー
- ボタン全般の「濃墨→淡墨」グラデーション + インクブルームの押下発光 → **未移植**。RN ボタンは単色フラット
- 墨滴リップル（クリック位置から滲むタップフィードバック）→ **未移植**
- 入力欄の筆致アンダーライン（`brush-input`）→ **未移植**。RN の投稿本文入力はボーダーなし
- アバターの enso（円相）フォールバック画像 → **移植済み**（`assets/images/avatars/enso-avatar-*.webp`、既存の `UserAvatar.tsx` で使用中。対応不要）
- `hanko` / `asanoha-pattern` / `seigaiha-pattern` / `ichimatsu-pattern` / `ink-circle` / `frame-washi` / `divider-bamboo` / `suminagashi` は
  globals.css に定義があるが **現行 Web コンポーネントのどこからも参照されていない（デッドCSS）**。移植対象外とする（§9）。

最優先（ユーザー指摘どおり）: **タイムラインの投稿カード（P0-A）** と **投稿ボタン（P0-B）**。

---

## 1. Web 墨絵表現の完全インベントリ

出典: `Bon_Log_cfw/app/globals.css`（クラス定義）、`Bon_Log_cfw/public/images/brush-frames/*.svg`（画像実体）、
各 `.tsx` の使用箇所（`Grep` で全文検索して特定）。

### 1.1 画像アセット実体（`public/images/brush-frames/`）

| ファイル | viewBox / 意図されたサイズ | 内容 | preserveAspectRatio |
|---|---|---|---|
| `post-frame.svg` | `0 0 800 600`（4:3） | 手描き風の墨筆で囲った矩形枠（二重の揺らぎ線 + 四隅のインク飛沫の点）。`feTurbulence` + `feDisplacementMap` で線をランダムに歪ませている | `none`（非一様スケール前提） |
| `post-frame-dark.svg` | 同上 | ダークモード用（現状 RN はダーク未対応。§後述） | 同上 |
| `button-blob.svg` | `0 0 200 60`（横長） | 有機的に歪んだ「墨だまり」の塗りつぶし形状（インク染みのブロブ）。地色 `#111` + 半透明の内側レイヤー `#222` | `none` |
| `button-blob-dark.svg` | 同上 | ダークモード用 | 同上 |
| `divider.svg` | `0 0 1000 20`（極端に横長の細帯） | 一本の墨筆の水平線（濃淡2本 + 両端に飛沫点） | `none` |
| `divider-dark.svg` | 同上 | ダークモード用 | 同上 |
| `enso.svg` | `0 0 500 500` | 円相（禅の一筆円）の墨絵イラスト。**ランディングページ (`app/page.tsx`) の装飾にのみ使用**。`card-washi` 等とは無関係の独立アセット | `xMidYMid meet` |

**重要な区別**: `enso.svg`（このディレクトリの生イラスト）と、既に RN に移植済みの `assets/images/avatars/enso-avatar-*.webp`（アバターのフォールバック用に生成された別画像群、`lib/utils/avatar.ts` / `UserAvatar.tsx` が使用）は **別物**。後者は対応済みなので本書のコピー対象に含めない。

### 1.2 CSS クラスとその実体・使用箇所

| クラス | 実体（globals.css の定義） | 使用画像 | 使用箇所（.tsx） | RN 現状 |
|---|---|---|---|---|
| `.card-washi` | `border: 15px solid transparent; border-image-source: url(post-frame.svg); border-image-slice: 20 fill; border-image-width: 15px; border-image-outset: 5px; border-image-repeat: stretch; border-radius: 0; box-shadow: none; filter: drop-shadow(0 10px 15px rgba(0,0,0,.1))`（hover で drop-shadow 強化） | `post-frame.svg` / dark | `PostCard.tsx`（投稿カード全体）、`RightSidebar.tsx`（デスクトップ右サイドバーの2ウィジェット。RN に対応面なし）、`(auth)/layout.tsx`（ログイン/登録カード全体） | **未移植**（PostCard, 認証カード共に） |
| `.shadow-washi` / `-hover` / `-lg` | 多段 box-shadow（濃度・広がりが3段階） | — | shadcn `button.tsx` 全バリアント、`card.tsx`、`input.tsx`、PostCard（ただし `card-washi` が `box-shadow: none !important` で実質無効化しており、**実際に効いているのは drop-shadow の方**） | **既存トークンあり**（`shadowWashi` 系。§10 で注意点） |
| `.btn-washi` | `background-image: url(button-blob.svg); background-size:100% 100%; border-radius:0; box-shadow:none; filter: drop-shadow(...)`。hover で `scale(1.05) rotate(1deg)`、active で `scale(0.95) rotate(-1deg)` | `button-blob.svg` / dark | `ComposeButton.tsx`（投稿 FAB）、`LoginForm.tsx` / `RegisterForm.tsx`（送信ボタン）、`LandingAuthCTA.tsx`（ランディングCTA群）、`LandingThemeToggle.tsx` | **未移植**（すべて） |
| `.ink-ripple` + `@keyframes ink-ripple-spread` | クリック位置に半径0→80の円形グラデーションを0.8sで拡散させながらフェードアウト | — | `InkRippleInit.tsx` が `document` に click イベント委譲し、`.btn-washi` 要素内に動的に `<span class="ink-ripple">` を生成 | **未移植** |
| `[data-variant="default"]` の墨グラデーション | `background-image: linear-gradient(135deg, oklch(0.10 0 0), oklch(0.28 0.008 50))`（濃墨→やや薄い墨の対角グラデーション。hoverで更に濃く） | — | shadcn `Button` の `default` バリアント全て（`.btn-washi` 併用時は上書きされる） | **未移植**（RN は単色フラット） |
| `@keyframes ink-bloom` | 押下/フォーカス時に `box-shadow` を 0→12px へ広げながらフェードする滲み効果 | — | `default` バリアントのボタン全般（ghost/link/outline除く） | **未移植** |
| `.brush-divider` | `height:12px; background-image:url(divider.svg); background-size:100% 100%` | `divider.svg` / dark | `Sidebar.tsx`（デスクトップ左ナビの区切り。RN対応面なし）、`RightSidebar.tsx`、`(auth)/layout.tsx`（ブランド見出し上下の飾り線） | **未移植**（認証画面のみ RN 対応候補） |
| `.washi-border` | `::before` に `height:6px; background-image:url(divider.svg)` を絶対配置 | `divider.svg` | globals.css 定義のみで **.tsx からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.brush-input` | 下線のみ `border-image-source:url(divider.svg); border-image-slice:0 0 20 0; border-image-width:0 0 4px 0`。focus で下線幅 4px→6px + 淡い緑の box-shadow が下に1本 | `divider.svg` | `components/ui/input.tsx`、`components/ui/textarea.tsx`（投稿本文・ログインフォーム等 **全ての input/textarea**） | **未移植**（RN のテキスト入力はボーダーなし） |
| `.tag-washi` | 角丸ピル + hover で反転（黒背景・白文字 + 緑がかった glow）。ブラシ画像は使わず色のみ | — | `PostCard.tsx` のジャンルバッジ | **概ね対応済み**（`PostGenreTags.tsx`。hover 概念は RN に無いため対象外） |
| `.avatar-washi` | `border:2px solid var(--border); box-shadow: 薄い1段` | — | `PostCardHeader.tsx` のアバター | **対応済み**（`UserAvatar.tsx` の `borderWidth/borderColor`） |
| MobileNav 内インライン SVG（`InkStrokeBorder` / `InkSeparator` / `InkOrnament` / `ActiveBarIndicator`） | ファイル資産ではなく **`.tsx` にベタ書きされた `<path>` の手描き波線**（3〜4次ベジエで微妙に揺らいだ曲線）。ナビ上端の波線ボーダー、アクティブタブの墨点+下線飾り、ドロップアップメニュー内の区切り波線・上下飾り線 | — (inline path) | `MobileNav.tsx` | **未移植**（RN タブバーは直線ボーダーのみ） |
| MobileNav の noise texture overlay | `feTurbulence` の data-URI を `bg-washi/90` の上に `opacity:.03〜.05` で重ねる薄い和紙ノイズ | — (inline data-URI) | `MobileNav.tsx` | **未移植** |
| `.hanko` | 朱色の印鑑風の丸バッジ | — | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.asanoha-pattern` / `.seigaiha-pattern` / `.ichimatsu-pattern` | 和柄の背景パターン（麻の葉・青海波・市松） | — (data-URI) | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.ink-circle` | 回転する円弧グラデーションの疑似ボーダーアニメーション | — | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.frame-washi` | グラデーション枠線（画像なし） | — | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.divider-bamboo` | 左右にグラデーション線を伸ばすテキスト区切り | — | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.suminagashi` | 「墨流し」風の斜めグラデーション背景 | — | **`.tsx` からの使用箇所なし**（デッドCSS。§9） | 対応不要 |
| `.washi-texture` | 全画面 `feTurbulence` ノイズ背景（薄い和紙の粒状感） | — (data-URI) | `(auth)/layout.tsx` の画面全体背景 | **未移植**（RN 認証画面は無地の背景画像のみ） |
| `.glass` / `.auth-glass` | 半透明 + backdrop-blur（ガラスモーフィズム）。認証画面のカード・入力欄に適用 | — | `(auth)/layout.tsx` とその子（LoginForm等） | 部分対応（`AuthScreenBackground.tsx` の背景画像は移植済みだが blur/ガラス質感は未確認。優先度低） |

---

## 2. cfw からコピーすべきアセットファイル一覧

**コピー作業は frontend が行う。** 以下はコピー元パス（`Bon_Log_cfw`、読み取りのみ）と RN 側の配置提案。

### 2.1 必須（P0: 投稿カード・投稿ボタン用）— ライトモードのみ、3ファイル

RN はまだダークモード未対応（`docs/design/design-tokens.md` §10 で Phase 4 以降と明記済み）のため、ダーク変種は今は不要。

| コピー元 | 用途 | RN 配置先（提案） |
|---|---|---|
| `Bon_Log_cfw/public/images/brush-frames/post-frame.svg` | 投稿カードの墨筆枠 | `assets/images/brush-frames/post-frame.svg`（react-native-svg 採用時）または raster 書き出し後 `assets/images/brush-frames/post-frame.png`（+@2x/@3x） |
| `Bon_Log_cfw/public/images/brush-frames/button-blob.svg` | 投稿ボタン（FAB）の墨だまり背景 | `assets/images/brush-frames/button-blob.svg` または `.png`（+@2x/@3x、固定80×80のため書き出しが単純） |
| `Bon_Log_cfw/public/images/brush-frames/divider.svg` | 区切り線・入力欄アンダーライン | `assets/images/brush-frames/divider.svg` または `.png`（+@2x/@3x） |

### 2.2 推奨（将来のダークモード対応時に同時にコピーしておくと二度手間を避けられる）— 3ファイル

| コピー元 | 用途 |
|---|---|
| `Bon_Log_cfw/public/images/brush-frames/post-frame-dark.svg` | ダーク時の投稿カード枠 |
| `Bon_Log_cfw/public/images/brush-frames/button-blob-dark.svg` | ダーク時の投稿ボタン背景 |
| `Bon_Log_cfw/public/images/brush-frames/divider-dark.svg` | ダーク時の区切り線 |

### 2.3 任意（低優先・スコープ外候補）— 1ファイル

| コピー元 | 用途 | 備考 |
|---|---|---|
| `Bon_Log_cfw/public/images/brush-frames/enso.svg` | 円相イラスト単体 | Web ではランディングページの装飾のみに使用。モバイルにマーケティング用ランディングは存在しないため**今回はコピー不要**。将来、空状態イラスト等に転用したくなった場合のみ検討 |

**合計: 必須3 + 推奨3 + 任意1 = 最大7ファイル、最小3ファイル。**

### 2.4 MobileNav インライン SVG（ファイルではない）

`InkStrokeBorder` / `InkSeparator` / `InkOrnament` / `ActiveBarIndicator` は画像ファイルではなく `.tsx` 内にベタ書きされた `<path d="...">` 座標である。コピーするアセットファイルは無いが、**同じ座標データを RN 側でも再利用する**ことを推奨する（§3.5 で詳述）。座標は `Bon_Log_cfw/components/layout/MobileNav.tsx` の該当関数から転記する。

---

## 3. RN での再現方法の設計

### 3.1 技術方針の選定（frontend / PM の承認が必要な決定）

RN には `border-image` に相当する API が存在しない。3 つの選択肢を比較する。

| 方式 | 概要 | 長所 | 短所 |
|---|---|---|---|
| **A. react-native-svg（推奨）** | SVG を `<Svg>` としてそのままレンダリングし、`width`/`height` を任意サイズに設定して `preserveAspectRatio="none"` を維持する。Web の `background-size:100% 100%` と完全に同じ非一様スケールが可能 | どのカード高さでもボケずににじみ線がシャープ。MobileNavのインライン波線パスもそのまま移植できる。ダークモード追加時も色差し替えが容易 | **新規 npm 依存の追加**（`react-native-svg` 本体、ファイルを `.svg` のまま import するなら `react-native-svg-transformer` も要検討）。`performance.md`「依存追加は慎重に」に抵触するため、frontend/PM の承認事項とする |
| **B. ラスタライズ済み PNG + expo-image（代替・依存追加なし）** | SVG を PNG に書き出し（@1x/@2x/@3x）、`expo-image` の `contentFit="fill"` で非一様スケール表示する。`expo-image` は既存依存のため追加コスト無し | 追加依存ゼロ。実装は最も簡単 | 書き出し時の固定アスペクト比を大きく外れて伸縮すると滲み線が不自然に歪む（投稿カードは高さが可変なため発生し得る）。ボタン・区切り線のように**サイズがほぼ固定**な要素では実用上問題なし |
| **C. 9パッチ的分割配置** | 角の飾り（インク飛沫）を固定サイズの `Image` 4隅に、辺の筆線を伸縮する `Image`（`resizeMode="stretch"`）で中央を埋める、を手動合成 | 高さが変わっても角の意匠が破綻しない | 実装コストが最も高い。`post-frame.svg` は角と辺が1本の連続パスで描かれているため素材の再分割が必要（デザイン側の追加書き出し作業が発生） |

**推奨**: **投稿ボタン（固定80×80）・区切り線（固定高さ）は方式 B** で依存追加なしに対応可能。
**投稿カード（可変高さ）とMobileNavの手描き波線は方式 A（react-native-svg）が望ましい**が、依存追加の可否は frontend/PM の判断に委ねる。
方式 A を採用しない場合の暫定案として、投稿カードは方式 B で実装しつつ、**縦横比が大きく崩れないよう角のインク飛沫部分を透明マージンとして許容する**（多少伸びても目立ちにくい構図に寄せて書き出す）ことを frontend に申し送る。

### 3.2 投稿カード（`card-washi`）の再現方法

1. カードのコンテナは `position: relative` の `View`。
2. 背景レイヤーとして枠画像を `StyleSheet.absoluteFill` で敷く:
   - 方式A: `<Svg width={cardWidth} height={cardHeight} viewBox="0 0 800 600" preserveAspectRatio="none">` 内に `post-frame.svg` の `<path>`/`<circle>` をそのまま複製
   - 方式B: `<Image source={require('.../post-frame.png')} style={StyleSheet.absoluteFill} contentFit="fill" />`
3. カードの `borderRadius` は **0**（Web の `border-radius: 0 !important` を踏襲。角丸ではなく筆線の揺らぎで角を表現する）。
4. 内側コンテンツは既存の `spacing5`（20pt）パディングを維持しつつ、枠線の視覚的な太さ分（Web の `border-image-width: 15px` + `outset: 5px` ≒ 実寸の約2.5%相当）を追加の内側マージンとして確保する。目安: カード幅343pt（画面幅375pt−左右16pt）に対し **8〜10pt** の追加インセットを推奨。
5. 影は Web では `box-shadow: none` + `filter: drop-shadow(...)`（シルエット追従シャドウ）になっている。RN の `shadowXxx`/`elevation` は常に**矩形バウンディングボックス**に対して落ちるため、筆線の凹凸に追従するシャドウは再現できない。
   - **簡易対応（推奨・追加コストなし）**: 既存の `shadowWashi` / `shadowWashiHover` トークンをそのまま枠画像の背後の `View` に適用し、矩形の影で近似する（視覚的にはやや直線的だが破綻しない）
   - **忠実対応（任意・工数増）**: 枠画像のラスタライズ書き出し時にあらかじめぼかしシャドウを焼き込んだ PNG を作る（Web の `drop-shadow(0 10px 15px rgba(0,0,0,.1))` 相当をエクスポートツール側で適用）。この場合 RN 側の `shadowXxx` は不要になる
6. `hover:shadow-washi-hover` に相当する状態は RN に hover がないため、既存の `Pressable` の `pressed` 状態のスタイル（`cardPressed`）にそのまま割り当てる（現状の実装パターンを維持）。

### 3.3 投稿ボタン（`btn-washi` / ComposeButton）の再現方法

詳細仕様は §5 を参照。要点のみ:

- FAB は固定 80×80pt のため、方式B（PNG + `contentFit="fill"`）で依存追加なく実装可能
- 背景を `button-blob.png`（80×80 に伸縮済み）に差し替え、既存の `colorActionPrimary` 単色円は廃止
- アイコンは白線のペン（既存 Ionicons のペンアイコンで代用可。Web の Lucide `Pen` パスに完全一致させたい場合は react-native-svg 採用時に `<Path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />` を移植）

### 3.4 墨滴リップル（`.ink-ripple`）とインクブルーム（`ink-bloom`）の再現方法

- 依存追加なしで実装可能。`react-native-reanimated`（既存依存）で:
  - `Pressable` の `onPressIn` の `nativeEvent.locationX/locationY` を押下座標として取得
  - その座標を中心に `scale: 0→80`, `opacity: 0.7→0` を `withTiming`（duration ≒ 800ms, Web の easing と揃える）でアニメーションする半透明円（`View` + `borderRadius: 9999`）を1つ生成・自動破棄
  - 対象: 投稿ボタン（FAB）・投稿カード（任意）・主要ボタン（AuthPrimaryButton等）
- インクブルーム（フォーカス/押下時に box-shadow が滲むように広がる効果）は `shadowOpacity`/`shadowRadius` を `withTiming` で 0→ピーク→0 にアニメーションすることで近似できる（iOS）。Android は `elevation` のアニメーションが視覚的に弱いため、上記リップルで代替した方が効果が伝わりやすい。

### 3.5 タブバーの墨筆装飾（MobileNav 相当）の再現方法

- `InkStrokeBorder`（上端の波線ボーダー）・`ActiveBarIndicator`（アクティブタブの墨点+下線）・`InkSeparator`/`InkOrnament`（区切り波線）は **react-native-svg を採用する場合のみ忠実再現可能**（座標は §2.4 の通り Web から転記）
- react-native-svg を採用しない場合の代替案（依存追加なし・近似）:
  - 上端ボーダー: 波線の代わりに `colorBorderLight` の直線 1px を維持（現状のまま）
  - アクティブインジケータ: 墨点（円）は `View` の小さな円形ドットで代替可能（`borderRadius: 9999` の 6×6pt View）。下線の波線は直線の `View`（幅28pt・高さ2pt）で代替可能
  - 区切り波線（MoreMenuGroup/Item 内）: 直線の `borderBottomWidth: 1` で代替（現状の `MoreMenuItem.itemBorder` のまま）
- ノイズテクスチャ（薄い和紙の粒状感）は RN では `expo-image` によるタイル画像 or 単色 `opacity` オーバーレイで近似可能。優先度は低い（§4 の P1 内でも末尾）。

### 3.6 入力欄の筆致アンダーライン（`brush-input`）の再現方法

- `divider.svg` を横幅いっぱいに伸縮した高さ4pt（focus時6pt）の帯として、`TextInput` の直下に絶対配置する
- 方式Bで対応可能（横幅は画面幅に対して概ね固定範囲のため伸縮による歪みは目立ちにくい）
- focus 時の下線太さアニメーション（4pt→6pt）は `Animated`/`reanimated` の height 変更で近似

---

## 4. 適用対象画面・部品の優先順位リスト

| 優先度 | 画面・部品 | 対応クラス | 該当 RN ファイル | 備考 |
|---|---|---|---|---|
| **P0-A（最優先）** | タイムライン投稿カード | `.card-washi` | `components/post/PostCard.tsx` | ユーザー指摘の筆頭。フィード・プロフィール・投稿詳細で共有使用のため影響範囲最大 |
| **P0-B（最優先）** | 投稿ボタン（FAB） | `.btn-washi` + `button-blob.svg` | `app/(tabs)/feed/index.tsx` の FAB（`ComposeButton` 相当のコンポーネント切り出しを推奨。§5 参照） | ユーザー指摘の筆頭。現状ただの円+鉛筆アイコン |
| P1 | ボトムタブバーの墨筆装飾 | MobileNav のインラインSVG | `app/(tabs)/_layout.tsx` | 毎画面で常時表示される導線。react-native-svg 採否の影響を最も受ける |
| P1 | 墨滴リップル / インクブルーム（押下フィードバック） | `.ink-ripple` / `ink-bloom` | FAB, PostCard, 主要ボタン全般 | 依存追加なしで実装可能。P0とセットで対応すると効果的 |
| P2 | 主要ボタンの濃淡グラデーション | `[data-variant="default"]` の墨グラデーション | `components/auth/AuthPrimaryButton.tsx` 等の主要CTA | ログイン/登録送信ボタン、汎用プライマリボタンに影響 |
| P3 | 認証画面（ログイン/登録/パスワードリセット）の枠・飾り線・ノイズ背景 | `.card-washi`（rotate付き）、`.brush-divider`、`.washi-texture` | `app/(auth)/login/index.tsx` 等、`components/auth/AuthScreenBackground.tsx` | 背景画像自体は移植済み。枠・ノイズ・傾き演出が未対応 |
| P4 | 入力欄の筆致アンダーライン | `.brush-input` | `components/post/PostBodyInput.tsx`、`components/auth/AuthTextField.tsx` | 視覚的インパクトは小さいが、投稿コンポーザ・認証フォームで一貫して欠けている |
| 対応不要 | デッドCSS群（`hanko`, `asanoha/seigaiha/ichimatsu-pattern`, `ink-circle`, `frame-washi`, `divider-bamboo`, `suminagashi`） | 各クラス | — | Web 側でも未使用（§1.2, §9） |
| 対象外（RN に対応面なし） | デスクトップ左右サイドバー装飾 | `Sidebar.tsx` / `RightSidebar.tsx` の `card-washi` / `brush-divider` | — | モバイルは1カラム+ボトムナビのため対応する画面構造が存在しない |

---

## 5. 投稿ボタン（FAB）の正確な仕様

### 5.1 現状（修正前）

`app/(tabs)/feed/index.tsx` 内にベタ書きされた `Pressable`:
- 80×80pt の円形（`borderRadius: radiusFull`）
- 背景色 `colorActionPrimary`（単色フラット）
- 影 `shadowWashiLg`（矩形影）
- アイコン: `Ionicons name="pencil"` 32pt、色 `colorActionPrimaryText`（白）

### 5.2 Web の実物（`button-blob.svg` + `btn-washi` + `PenIcon`）

- コンテナ: 80×80pt（`w-20 h-20`）
- 背景: `button-blob.svg`（viewBox `0 0 200 60` の横長インク染み形状）を `background-size: 100% 100%` で 80×80 の正方形に**非一様伸縮**。結果として円ではなく、**縦に押し潰された有機的な墨だまり形状**（角丸でも真円でもない）になる。この歪みは意図的な演出であり、忠実再現においてはこの「非対称なインク染み」の見た目そのものが重要
- `border-radius: 0`（円形にしない。ブロブの輪郭自体が形を作る）
- 色: ライト時は黒系インク（`#111`/`#222`の二層）、ダーク時は白系インク反転（今回はライトのみ対応）
- アイコン: Lucide の `Pen`（`viewBox 0 0 24 24`、stroke幅2、丸端）を **32×32pt**、白の線画、ブロブの中央に配置
- ホバーで `scale(1.05) rotate(1deg)`、押下で `scale(0.95) rotate(-1deg)`（Web限定のhoverはRN対象外。押下の scale/rotate は再現対象）
- 押下時に押下座標から `.ink-ripple` が滲む（§3.4）
- 影: `filter: drop-shadow(0 4px 6px rgba(0,0,0,.3))`（ブロブの輪郭に追従）。RN は矩形近似（`shadowWashiLg` 継続使用）または PNG に焼き込み

### 5.3 RN 実装仕様（frontend への指示）

| 項目 | 値 |
|---|---|
| コンテナサイズ | 80×80pt（既存 `FAB_SIZE` 定数を維持） |
| 背景アセット | `button-blob.png`（80×80、@2x=160×160、@3x=240×240 で書き出し。`contentFit="fill"` で正確に80×80へ表示。伸縮済みのため実行時のさらなる伸縮は発生しない） |
| `borderRadius` | `0`（既存の `radiusFull` 指定を削除） |
| 背景色 | 削除（画像が完全に覆うため `backgroundColor` 指定不要） |
| アイコン | 既存の `Ionicons name="pencil"` を維持可（暫定）。忠実化する場合は react-native-svg 採用後に Lucide `Pen` パスを移植 |
| アイコンサイズ | 32pt（現行の `FAB_ICON_SIZE` を維持） |
| アイコン色 | `#ffffff`（固定。ブロブ画像の上に乗るため theme 変数ではなく固定白） |
| 押下時アニメーション | `scale: 1→0.95`, `rotate: 0→-1deg` を `withTiming`（150ms程度）で実行（Web の active 状態を踏襲） |
| 押下時リップル | §3.4 の墨滴リップルを実装（押下座標中心、80msの遅延なしで即時開始） |
| 影 | 暫定: 既存 `shadowWashiLg` を維持（矩形近似）。将来的に PNG へ焼き込み可能なら `shadowXxx` を削除して置き換える |
| 配置 | 既存の `fabBottom` 計算・`right: spacing4` を変更しない（レイアウトは現状維持、見た目のみ差し替え） |
| アクセシビリティ | 既存の `accessibilityRole="button"` / `accessibilityLabel="新規投稿"` / `hitSlop` を維持（44pt以上のタップ領域は既に80pt四方で満たしている） |

**推奨**: 現在 `app/(tabs)/feed/index.tsx` にベタ書きされている FAB を `components/post/ComposeFab.tsx`（新規）として切り出し、Web の `ComposeButton.tsx` と対応が取りやすい構造にすることを frontend に提案する（設計判断はfrontend/coreに委ねる）。

---

## 6. タイムライン投稿カード（PostCard）の正確な仕様

### 6.1 現状（修正前）

`components/post/PostCard.tsx`:
- `borderRadius: radiusLg`（10pt の角丸長方形）
- `backgroundColor: colorSurface`
- `padding: spacing5`（20pt）
- `shadowWashi` / 押下時 `shadowWashiHover`

### 6.2 Web の実物（`card-washi` + `post-frame.svg`）

- `border-radius: 0`。角丸ではなく、`post-frame.svg` の手描き揺らぎ枠がカード全体を縁取る
- 枠は `border-image-slice: 20 fill` により**中央の `fill` 領域もカード背景として使われる**（Web の `background: var(--card)` と枠画像の中央部分が重なる形）。つまり見た目は「白いカードに墨で縁取りした一枚の和紙」
- 影は `box-shadow: none` + `filter: drop-shadow(0 10px 15px rgba(0,0,0,.1))`。押下（Web ではhover）で `drop-shadow(0 15px 25px rgba(0,0,0,.18))` に強化
- 四隅にインクの飛沫点が小さく散っている（`post-frame.svg` 内の `<circle>` 4つ）

### 6.3 RN 実装仕様（frontend への指示）

| 項目 | 値 |
|---|---|
| コンテナ構造 | `View`（`position: relative`）＋ 背景に枠画像（`StyleSheet.absoluteFill`）＋ その上に既存のヘッダー/本文/画像/アクション行を配置するコンテンツラッパー |
| 枠アセット | `post-frame.png`（推奨書き出しサイズ: カード標準幅 343pt 相当を基準に @1x=343×258, @2x=686×516, @3x=1029×774。**高さ可変のため実際は `contentFit="fill"` で都度カード実測高さに伸縮**。方式A（react-native-svg）採用時はこのラスタ書き出しは不要） |
| `borderRadius` | `0`（既存 `radiusLg` を削除） |
| `backgroundColor` | 削除可（枠画像の `fill` 部分がカード地色を兼ねる場合）。ただし枠画像が完全不透明でない場合に備え、枠画像の背後に `colorSurface` の `View` を保険として残すことを推奨 |
| 内側パディング | 既存 `spacing5`（20pt）を維持しつつ、枠線の視覚的太さ分 **+8〜10pt** を追加（§3.2 手順4） |
| 影 | 暫定: 既存 `shadowWashi` / `shadowWashiHover` を枠画像の背後の `View` に適用（矩形近似）。将来的に PNG 焼き込みへ移行可能 |
| 押下時（`cardPressed`） | 既存の `opacity: 0.97` は維持しつつ、影を `shadowWashiHover` に強化する現行ロジックをそのまま流用可 |
| ジャンルタグ（`tag-washi`） | 現状の `PostGenreTags.tsx` は概ね対応済みのため変更不要 |
| アバター（`avatar-washi`） | 現状の `UserAvatar.tsx` は対応済みのため変更不要 |
| リポスト表示・引用投稿・アンケート等の内部要素 | 枠の内側に配置される限り、既存レイアウトを変更しない |

**【2026-07-11 追記】** `PostImageGallery`（画像ギャラリー）にも本節の方針を適用し、画像を画面端まで広げるエッジ・トゥ・エッジ仕様は廃止した。画像も安全インセット（`contentInner` の内側）に収める実装へ変更している（枠が一枚絵のオーバーレイであり独立レイヤーにならないため。§3.1 参照）。詳細・旧仕様の取り消し注記は `post-card.md` §7.2 を参照。

### 6.4 4状態（ローディング/空/エラー/オフライン）への影響

- **ローディング**: `PostCardSkeleton.tsx` も同じ墨筆枠で統一する（スケルトンだけ角丸のままだと視覚的に浮くため、同じ `post-frame` 背景 + 中身をグレーのプレースホルダーにする構成を推奨）
- **空状態**: `ScreenEmpty` はカード枠と無関係（対象外）
- **エラー / オフライン**: `ScreenError` / `OfflineBanner` もカード枠と無関係（対象外）

---

## 7. アクセシビリティ影響確認

- 枠画像を `StyleSheet.absoluteFill` の装飾要素として扱い、`accessibilityElementsHidden` / `importantForAccessibility="no"` を付与してスクリーンリーダーが読み上げないようにする（現状の `Pressable` の `accessibilityLabel` はカード全体の要約を読み上げる設計のため、装飾画像の二重読み上げを防ぐ）
- FAB の背景画像も同様に装飾扱いとし、`accessibilityLabel="新規投稿"` は既存どおり `Pressable` 側に付与する（アイコン・背景画像は個別のラベルを持たせない）
- タップ領域: 投稿カード全体・FAB とも既存の 44pt 以上の基準に変更なし（見た目の変更のみでヒットエリアは変えない）
- コントラスト: FAB の白ペンアイコンは墨だまり背景（黒系）の上に乗るため WCAG 比は現行以上に確保される。投稿カードの本文テキストは背景が枠画像の `fill`（ほぼ白）の上に乗るため既存のコントラスト比に変化なし
- `prefers-reduced-motion` 相当（RN では `AccessibilityInfo.isReduceMotionEnabled`）: 墨滴リップル・押下時の scale/rotate アニメーションは reduce-motion 設定時に無効化する分岐を入れることを推奨（Web 版 globals.css も `@media (prefers-reduced-motion: reduce)` でアニメーション類を無効化している）

---

## 8. 既存ドキュメントとの整合・更新が必要な箇所

- `docs/design/design-tokens.md` §4 に「PostCard は Web で `card-washi`（brushフレーム + `border-radius: 0`）を使うが、モバイルでは SVG 枠は再現しない」という**過去の意思決定の明記**がある。本書はこの決定を**覆す**提案のため、本書の内容が承認された場合は design-tokens.md §4 の当該記述を「枠画像を再現する（本書 sumi-e-theme-parity 参照）」に更新する必要がある（frontend/PM の承認後、design-tokens.md の改訂も合わせて依頼したい）
- `docs/design/post-card.md`（存在する場合）に枠画像仕様の追記が必要になる可能性がある
- `.claude/rules/components.md` の「色・余白・字組はデザイントークン定数経由」原則に対し、枠画像アセットは新しい定数カテゴリ（例: `lib/constants/design-tokens.ts` に `brushFrameAssets` のような画像 require のマッピングを追加）として整理することを frontend に提案する

---

## 9. 対応不要（Web 側でも未使用のデッドCSS）

以下は `globals.css` に定義があるが、`Bon_Log_cfw` の現行 `.tsx` のどこからも参照されていないことを `Grep` で確認済み。今回の移植対象に含めない。将来 Web 側で使用され始めた場合は改めて監査すること。

- `.hanko`（印鑑風バッジ）
- `.asanoha-pattern` / `.seigaiha-pattern` / `.ichimatsu-pattern`（伝統模様の背景パターン）
- `.ink-circle`（回転するグラデーション疑似ボーダー）
- `.frame-washi`（グラデーション枠線）
- `.divider-bamboo`（テキスト両脇のグラデーション線）
- `.suminagashi`（墨流し風グラデーション背景）
- `.washi-border`（`::before` の波線ボーダー。定義はあるが使用箇所なし）

---

## 10. 未確定事項・引き継ぎ

- **react-native-svg の採用可否**（§3.1）: 依存追加の是非は本書のスコープ外（designer は実装しない）。frontend/PM が `.claude/rules/performance.md` の「依存追加は慎重に」に照らして判断すること
- **枠画像のラスタライズ書き出し作業者**: SVG→PNG（@1x/@2x/@3x、必要なら drop-shadow 焼き込み）は frontend が担当する想定。書き出しサイズの目安は本書 §5.3 / §6.3 に記載したが、実機での見え方確認後に微調整が必要
- **PostCardSkeleton の枠画像対応**（§6.4）は本書で方向性のみ示した。frontend 実装時に具体的なスケルトングレーの配色・アニメーションを別途詰める必要がある
- **ダークモード対応**（P0/P1双方の `-dark.svg` 変種）は Phase 4 以降の全体方針に合わせる（`design-tokens.md` §10 と同一の前提）
- **投稿ボタンのコンポーネント切り出し**（§5.3 末尾の `ComposeFab.tsx` 提案）は designer からの推奨であり、実装構造の最終判断は frontend に委ねる
