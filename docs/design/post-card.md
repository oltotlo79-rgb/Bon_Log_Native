# PostCard コンポーネント仕様 — Bon_Log Native

作成日: 2026-06-12
最終改訂: 2026-07-11（墨筆枠オーバーレイ実装 `post-frame.svg` への追従改訂 — §4.1・§4.2・§7.2・§19・§20。改訂元: `sumi-e-theme-parity-2026-07-06.md`）
追記（2026-07-13・エラー色トークンの是正）: §10.5 いいね済みアイコンの `colorError` 記載値を `#c0392b` から `#c21721` へ修正した。旧値は `design-tokens.md` の旧誤記に起因するもので、実装 `lib/constants/design-tokens.ts` の実際の値は `#c21721`。根拠は `design-tokens.md` §11 を参照。
前提: `design-tokens.md`（§2.3・§4・§5・§6・§8）・`navigation-structure.md`（§4.2・§6）に準拠。**ただし `design-tokens.md` §4・§8 の PostCard 記述（`radiusLg` 起点の標準カード形状・「モバイルでは SVG 枠は再現しない」）は 2026-07-11 時点で未更新。本書 §4.1・§19 の方針転換が正（`design-tokens.md` 側の改訂は本書のスコープ外）**
Web 出典: `Bon_Log_cfw/components/post/PostCard.tsx`・`PostCardHeader.tsx`・`PostCardActions.tsx`・`ImageGallery.tsx`・`types/post.ts`
実装の正（2026-07-11 追記）: `components/post/PostCard.tsx`・`components/post/PostImageGallery.tsx`（本書との記述に差異が生じた場合は実装を正とし、本書を追従改訂する）

---

## 1. 概要・目的

フィード・投稿詳細・プロフィールにおいて 1 件の投稿情報を表示する。
Web 版 `PostCard` のモバイル版。1 カラム・縦スクロールのフィードに最適化したレイアウトとし、タップ操作・アクセシビリティ・パフォーマンスを仕様に織り込む。

---

## 2. コンポーネント分割

```
PostCard                    ← カード全体（タップ領域・リポスト表示の振り分け）
├── RepostIndicator         ← リポスト元ユーザー表示行（リポストの場合のみ）
├── PostCardHeader          ← アバター / ユーザー名 / 日時 / 固定バッジ / 3点メニュー
├── PostCardContent         ← 本文（メンション・ハッシュタグ・「続きを読む」）
├── PostImageGallery        ← 画像グリッド（1〜4枚）
├── PostQuote               ← 引用投稿ブロック（引用の場合のみ）
├── PostGenreTags           ← ジャンルタグ行
└── PostCardActions         ← いいね / コメント / リポスト / ブックマーク
```

---

## 3. ナビゲーション

- **配置:** `(tabs)/feed` の FlatList アイテムとして使用（主な用途）
  - `users/[id]` プロフィールの投稿タブにも同様に使用
  - `posts/[id]` 投稿詳細画面では `disableNavigation=true` で使用
- **遷移元:** フィード画面、プロフィール画面
- **遷移先:** カード全体タップ → `posts/[id]`（投稿詳細）
  - アバタータップ → `users/[id]`（ユーザープロフィール）
  - ジャンルタグタップ → `search/?genre={id}`（ジャンル検索）
  - ハッシュタグタップ → `search/?q={tag}`（ハッシュタグ検索）
  - コメントアイコンタップ → `posts/[id]`（投稿詳細のコメント欄）
- **ディープリンク:** 不要（PostCard 自体はナビゲーションの起点。`posts/[id]` が対象）

---

## 4. レイアウト全体

### 4.1 カード外形

**【2026-07-11 追記】方針転換:** 投稿カードは墨筆枠画像（`post-frame.svg`）をカード全面にオーバーレイする方式へ変更された（`sumi-e-theme-parity-2026-07-06.md` §3.2・§6.3）。カードの `borderRadius` は角丸（`radiusLg`）ではなく **`0`**（角丸を廃し、筆線の揺らぎ自体で輪郭を表現する）。カード自身が直接 `padding` を持つ設計も廃止され、内側の見た目上の余白は枠の内側インセットである `contentInner` が担う。現行実装（`components/post/PostCard.tsx`）の値:

```
card（Pressable ルート）
  backgroundColor: colorSurface (#fcfcfc)   ← 枠画像が完全不透明でない場合の保険地色として維持
  borderRadius: 0
  marginBottom: spacing4 (16pt)
  shadow: shadowWashi（矩形近似。筆線の凹凸には追従しない — sumi-e-theme-parity §3.2 手順5）
    iOS: shadowColor #17100c / offset (0,2) / opacity 0.06 / radius 6
    Android: elevation 2
  pressed 時: shadowWashiHover に強化 + opacity 0.97（cardPressed）

frame（card 直下の子。墨筆枠オーバーレイ画像）
  source: post-frame.svg（assets/images/brush-frames/post-frame.svg）
  position: StyleSheet.absoluteFill（card 全体へ非一様伸縮して追従。card の高さは唯一の通常フロー子である contentInner が決める）
  contentFit: "fill"
  装飾画像のためスクリーンリーダー対象から除外
    （accessible={false} / accessibilityElementsHidden / importantForAccessibility="no-hide-descendants"）

contentInner（frame と兄弟の通常フロー View。カードの実質的な内側インセット）
  padding: spacing5 + spacing2（20pt + 8pt = 28pt）
    ← 枠線の視覚的太さぶんを既存 spacing5 に追加（sumi-e-theme-parity §3.2 手順4・§6.3）
```

**旧記述（〜2026-07-06 時点。上記の方針転換により撤回・置換済み）:**

```
margin-bottom: spacing4 (16pt)
padding: spacing5 (20pt)
background: colorSurface (#fcfcfc)
borderRadius: radiusLg (10pt)
shadow: shadow-washi
  iOS: shadowColor #18150a / offset (0,2) / opacity 0.06 / radius 6
  Android: elevation 2
```

カード幅は画面幅いっぱい（`width: 100%`）。画面端の左右パディング（`spacing4`）は FlatList の `contentContainerStyle` 側で付与するか、PostCard の外側（親コンテナ）で付与する。PostCard 自体には水平マージンを持たせない（この点は現行実装でも変更なし）。

### 4.2 カード全体構成（縦方向）

**【2026-07-11 追記】** §4.1 の方針転換に伴い、下図の「padding: spacing5」表記および PostImageGallery 行の「エッジまで伸ばす」表記は実装と食い違う（旧記述）。実際の外側インセットは `contentInner`（`spacing5 + spacing2`）であり、画像を含むすべての子要素がこのインセット内に収まる（画面端への拡張はしない）。該当箇所は取り消し注記に置き換えている。縦方向の要素順序・`mb`/`mt` の相対値そのものは変更されていない。

```
┌──────────────────────────────────────────────────────┐  padding: spacing5 【2026-07-11時点で廃止。実際は frame オーバーレイ＋contentInner インセット spacing5+spacing2 (28pt)。§4.1参照】
│ [RepostIndicator] ← リポストの場合のみ               │  mb: spacing2 (8pt)
│                                                      │
│ [PostCardHeader]                                     │  mb: spacing2 (8pt)
│   [Avatar 44pt] [ニックネーム] [日時] [⋮メニュー]    │
│                                                      │
│ [PostCardContent]                                    │  mb: spacing3 (12pt)
│   本文テキスト（3行まで / 「続きを読む」）             │
│                                                      │
│ [PostImageGallery] ← 画像がある場合のみ              │  mb: spacing3 (12pt)
│   （カード左右パディングを打ち消してエッジまで伸ばす）【2026-07-11時点で廃止。実際は contentInner の安全インセット内（画面端への拡張はしない）。§7.2参照】 │
│                                                      │
│ [PostQuote] ← 引用がある場合のみ                     │  mb: spacing3 (12pt)
│                                                      │
│ [PostGenreTags] ← ジャンルがある場合のみ             │  mb: spacing3 (12pt)
│                                                      │
│ [PostCardActions]                                    │  mt: spacing2 (8pt)
│   [♡ いいね] [□ コメント] [⟳ リポスト] [🔖 保存]    │
└──────────────────────────────────────────────────────┘
```

---

## 5. PostCardHeader

### 5.1 レイアウト

```
Row（flexDirection: row / alignItems: center）
┌──────────────────────────────────────────────────────┐
│ [固定バッジ（isPinned のみ）]                         │  ← 1行目（条件付き）
│                                                      │
│ [Avatar 44pt] [ニックネーム + 日時] [（編集済み）] [⋮]│  ← 2行目
└──────────────────────────────────────────────────────┘
```

#### アバター

- サイズ: 44pt x 44pt（タップターゲット最小値を兼ねる）
- `borderRadius: radiusFull`
- 枠線: 1.5pt solid `colorBorder`（`#c8c8c8`）
- フォールバック: ニックネームの先頭 1 文字を `textLg` / `colorTextSecondary` で中央表示 + 背景 `colorSurfaceMuted`
- 画像は `expo-image` を使用（`contentFit: "cover"` / `transition: durationFast`）
- `accessibilityLabel`: `"{nickname}のプロフィール画像"`

#### ニックネーム・日時エリア

- ニックネームと日時は横並び（`flexDirection: row` / `alignItems: baseline`）
- ニックネーム: `textMd`（15pt）/ `fontWeight: 600` / `colorTextPrimary` / 1 行 `ellipsizeMode: "tail"`
- 日時: `textSm`（12pt）/ `colorTextSecondary` / ニックネーム右に `spacing2` 空けて表示
- `（編集済み）` ラベル: `textSm` / `colorTextSecondary` / 日時の右（条件付き表示）

#### 固定バッジ（isPinned）

- 行全体の上に `spacing2` を空けて表示
- アイコン（Pin 系）+ 「固定された投稿」テキスト（`textSm` / `colorTextSecondary`）

#### 3点メニュー（⋮）

- アイコンボタン: 44pt x 44pt のタップターゲット（アイコン自体は 20pt）
- 背景: 通常は透明 / タップ時 `colorSurfaceMuted` にフェード（`durationFast`）
- メニューはアクションシートで表示（詳細は §11 参照）

### 5.2 使用トークン

| 要素 | トークン |
|------|---------|
| アバター枠 | `colorBorder` |
| アバターフォールバック背景 | `colorSurfaceMuted` |
| ニックネーム | `textMd` / `colorTextPrimary` |
| 日時 | `textSm` / `colorTextSecondary` |
| 固定バッジ | `textSm` / `colorTextSecondary` |
| メニューアイコン | `colorTextSecondary` |

---

## 6. PostCardContent（本文）

### 6.1 行数制限と「続きを読む」

Web 版の定数を参照:
- `POST_PREVIEW_LENGTH = 150`（文字数上限）
- `POST_PREVIEW_MAX_LINES = 3`（行数上限）

`disableNavigation=false`（フィード等）の場合: 本文が 3 行超または 150 文字超の場合に切り詰め + 「続きを読む」を表示する。
`disableNavigation=true`（投稿詳細）の場合: 全文表示。切り詰めなし。

**「続きを読む」ボタン:**
- テキストリンクスタイル（ボタン枠なし）
- 文言: 「続きを読む」
- `textSm`（12pt）/ `colorTextLink`（`#2e2e2e`）/ `fontWeight: 600`
- タップ → 同カード内でインライン展開（画面遷移なし）
- タップ領域: 最小 44pt 高さを確保するため、上下 `paddingVertical: spacing3` を付与する

### 6.2 テキストセグメント

本文はプレーンテキスト・メンション・ハッシュタグの 3 種のセグメントで構成される（Web の `parseContentSegments` に相当するパース処理が必要 — **frontend に実装依頼**）。

| セグメント種別 | 表示スタイル | タップ挙動 |
|-------------|------------|---------|
| プレーンテキスト | `textBase` / `colorTextPrimary` | なし |
| メンション（@ニックネーム）| `textBase` / `colorTextLink` / `fontWeight: 600` | → `users/[id]` |
| ハッシュタグ（#タグ）| `textBase` / `colorTextHashtag`（`#4a4a4a`）| → `search/?q={tag}` |

テキストセグメント内のリンクタップはカード全体のタップ（投稿詳細遷移）より優先される。`onPress` の `stopPropagation` 相当の処理が必要（RN では `Text` の `onPress` がある場合に親の `Pressable` タップは発火しない — 実装確認を frontend に依頼）。

### 6.3 使用トークン

| 要素 | トークン |
|------|---------|
| 本文テキスト | `textBase`（14pt / lineHeight 22pt）/ `colorTextPrimary` |
| メンション | `colorTextLink` / `fontWeight: 600` |
| ハッシュタグ | `colorTextHashtag` |
| 「続きを読む」| `textSm` / `colorTextLink` / `fontWeight: 600` |

---

## 7. PostImageGallery（画像グリッド）

### 7.1 概要

投稿に添付された 1〜4 件の画像を表示する。Web 版 `ImageGallery.tsx` のモバイル版。
モバイルではモーダルではなくフルスクリーンビューアへ遷移する（別途仕様策定 — `navigation-structure.md` §9 未確定事項）。

### 7.2 画像グリッドの枚数別レイアウト

**【2026-07-11 追記】方針転換: 画像のエッジ・トゥ・エッジ仕様は廃止。** 投稿カードに墨筆枠（`post-frame.svg`）をカード全面にオーバーレイする方式を採用したため、画像を画面端まで広げる下記の仕様を廃止し、画像も本文と同じ安全インセット（枠の内側）に収める実装へ変更した。RN では墨筆枠が一枚絵のオーバーレイ画像であり、Web の `border-image` のような独立したレイヤーにはならないため、画像をエッジ・トゥ・エッジで配置すると枠と重なってしまうことが理由。`PostImageGallery` は画面幅からの逆算・打ち消しマージンをやめ、`contentInner` から継承する `width: 100%` を基準に `flex` / `aspectRatio` の相対レイアウトに変更されている（詳細: `sumi-e-theme-parity-2026-07-06.md` §3.1・§6.3）。以下の旧記述は削除せず、取り消しの注記として残す。

画像グリッドはカード左右のパディングを打ち消して画面端まで広げる（`marginHorizontal: -spacing5`）。 **（2026-07-11 時点で廃止。上記追記を参照。実際は `contentInner` の安全インセット内に収める相対レイアウト）**

#### 1 枚

```
┌────────────────────────────────────────┐
│                                        │
│          [画像 / アスペクト比 16:9]    │
│                                        │
└────────────────────────────────────────┘
```
- 幅: 100%（カード幅 - 打ち消しマージンで画面端まで） **（2026-07-11 時点で廃止。実際は `contentInner` 内での 100% 幅。画面端への拡張はしない）**
- 高さ: 幅 × (9/16)（16:9 固定。縦長写真は `contentFit: "cover"` でクロップ）
- `borderRadius` は上下なし（カード内なのでカードの角丸に合わせる） **（2026-07-11 時点で廃止。カード自体が `borderRadius: 0`（角丸なし）になったため「カードの角丸に合わせる」という前提が消滅。現行実装ではセルに `borderRadius` を一切指定せず、常に角丸なしの矩形として表示する — `components/post/PostImageGallery.tsx` の `cellPressable`/`cellSingle`/`cellGridFlex` 等のスタイル参照）**

#### 2 枚

```
┌────────────────┬─────────────────────────┐
│                │                         │
│  [画像 1]      │  [画像 2]               │
│  (50%)         │  (50%)                  │
│                │                         │
└────────────────┴─────────────────────────┘
```
- 各セル: 幅 50% / 高さ: 幅 × 1.0（正方形に近いクロップ）
- セル間の溝: 2pt

#### 3 枚

```
┌──────────────────┬───────────────────────┐
│                  │  [画像 2]             │
│  [画像 1]        ├───────────────────────┤
│  (50%, row-span) │  [画像 3]             │
│                  │                       │
└──────────────────┴───────────────────────┘
```
- 左 (画像 1): 幅 50% / 高さ = 右側 2 セルの合計高さ（正方形 × 2 + 溝 2pt）
- 右上 (画像 2): 幅 50% / 高さ: 左セルの 50% 相当
- 右下 (画像 3): 幅 50% / 高さ: 左セルの 50% 相当
- セル間の溝: 2pt

#### 4 枚

```
┌─────────────────┬─────────────────────────┐
│  [画像 1]       │  [画像 2]               │
│  (50%)          │  (50%)                  │
├─────────────────┼─────────────────────────┤
│  [画像 3]       │  [画像 4]               │
│  (50%)          │  (50%)                  │
└─────────────────┴─────────────────────────┘
```
- 各セル: 幅 50% / 高さ: 幅と同じ（正方形クロップ）
- セル間の溝: 2pt

**4 枚超の場合（将来の拡張）:** 4 枚目のセルに `+N` のオーバーレイを表示して残り枚数を示す。MVP 時点では最大 4 枚として設計する（CLAUDE.md 機能制約: 画像 4 枚（無料）/ 6 枚（プレミアム））。6 枚の場合は最大 4 つを表示し「+2」オーバーレイを追加する設計とする。

### 7.3 画像タップ挙動

- 各画像セルをタップ → 画像フルスクリーンビューアへ遷移（`navigation-structure.md` §9 の未確定事項）
- `disableNavigation=true` のカードで画像タップ → 同ビューアへ遷移（投稿詳細での利用時）
- カード全体タップ（画像セル以外）→ 投稿詳細へ遷移

### 7.4 使用トークン

| 要素 | トークン |
|------|---------|
| セル間溝 | 固定 2pt |
| ロード中プレースホルダー | `colorSurfaceMuted` |
| expo-image `transition` | `durationFast`（200ms）|

### 7.5 expo-image の設定方針

- `contentFit: "cover"`（画面サイズにクロップ）
- `recyclingKey`: 各メディアの `id` を設定してリサイクル時のチラツキを防ぐ
- `placeholder`: 低解像度サムネイル URL が利用可能な場合は blurHash 相当で表示（**core に要相談**: サーバー API がサムネイル / blurHash を返せるか確認）
- `accessibilityLabel`: 意味のある画像なら `"{ユーザー名}の投稿画像 {N}枚目"` / 装飾的なら空文字

---

## 8. PostQuote（引用投稿）

### 8.1 概要

`post.quotePost` がある場合に表示するネスト投稿ブロック。Web 版 `QuotedPost.tsx` のモバイル版。

### 8.2 レイアウト

```
┌────────────────────────────────────────┐  ← 角丸 radiusMd / border 1pt colorBorderLight
│ [Avatar 32pt] [ニックネーム] [日時]    │
│ [本文（2行まで切り詰め）]              │
│ [画像サムネイル（1枚のみ）]（任意）    │
└────────────────────────────────────────┘
```

- 外枠: `borderWidth: 1pt` / `colorBorderLight` / `radiusMd`（8pt）
- 内側 padding: `spacing3`（12pt）
- タップ → 引用元の投稿詳細 `posts/[quotePost.id]` へ遷移

### 8.3 使用トークン

| 要素 | トークン |
|------|---------|
| 外枠 | `colorBorderLight`（`#e2e2e2`）/ 1pt |
| 背景 | `colorSurfaceMuted`（`#f0f0f0`）|
| ニックネーム | `textSm` / `colorTextPrimary` |
| 日時 | `textSm` / `colorTextTertiary` |
| 本文 | `textSm` / `colorTextSecondary` |

---

## 9. PostGenreTags（ジャンルタグ）

### 9.1 レイアウト

```
[松柏類]  [雑木類]  [草もの]   ← 横並び flex-wrap / gap spacing2 (8pt)
```

各タグ:
- 横: `paddingHorizontal: spacing3`（12pt）
- 縦: `paddingVertical: 4pt`
- 最小高さ: 28pt（タップ領域は `hitSlop: {top:8, bottom:8, left:4, right:4}` で補完）
- `borderRadius: radiusSm`（6pt）

### 9.2 使用トークン（Web `tag-washi` の移植）

| 要素 | トークン |
|------|---------|
| 背景 | `colorActionSecondary`（`#e9e9e9`） |
| テキスト | `textXs`（10pt）/ `colorActionSecondaryText`（`#2e2e2e`）|
| 枠線 | 1pt / `colorBorderLight`（`#e2e2e2`）|
| 押下時背景 | `colorActionPrimary`（`#2e2e2e`）|
| 押下時テキスト | `colorActionPrimaryText`（`#ffffff`）|
| `letterSpacing` | `letterSpacingTight`（0.5）|

---

## 10. PostCardActions（アクション行）

### 10.1 レイアウト

```
Row（flexDirection: row / alignItems: center）
┌────────────────────────────────────────────────┐
│  [♡ いいね数]  [□ コメント数]  [⟳ リポスト数]  [🔖] │
└────────────────────────────────────────────────┘
```

- 行全体: `marginTop: spacing2` / 左端を `-spacing2` でずらして視覚的に揃える（Web の `-ml-2` 相当）
- 各ボタンの最小タップターゲット: 44pt x 44pt（`hitSlop` で確保）
- ボタン間の `gap`: `spacing4`（16pt）

### 10.2 各アクションボタン

| ボタン | アイコン | 数値表示 | 状態 |
|--------|---------|---------|------|
| いいね | Heart | `likeCount > 0` の場合のみ表示 | 済: `colorError`（赤）塗り / 未: `colorTextSecondary` 線 |
| コメント | MessageCircle | `commentCount > 0` の場合のみ表示 | 常に非アクティブ色 |
| リポスト | Repeat2 | `repostCount > 0` の場合のみ表示 | 済: `colorSuccess`（緑）/ 未: `colorTextSecondary` |
| ブックマーク | Bookmark | 表示なし | 済: `colorActionPrimary` 塗り / 未: `colorTextSecondary` 線 |

数値テキスト: `textSm`（12pt）/ `colorTextSecondary` / アイコン右に `spacing1`（4pt）

**未認証ユーザーの場合:** 全アクションボタンはタップでログイン画面へ誘導する（Web 版 `PostCardActions.tsx` 同様）。

### 10.3 いいね楽観更新のアニメーション

- タップ時: アイコンが 1.0 → 1.3 → 1.0 にスケールアニメーション（`durationFast: 200ms`、`easingBounce`）
- `useNativeDriver: true` で実装する

### 10.4 リポストのアクションシート（iOS / Android 共通）

リポストアイコンタップ → 2 択のボトムシート（`ActionSheet` 相当）:
- 「リポスト」
- 「引用して投稿」→ 投稿作成画面（quote モード）へ遷移

### 10.5 使用トークン

| 要素 | トークン |
|------|---------|
| アイコン（非アクティブ） | `colorTextSecondary`（`#5c5c5c`）|
| いいね済みアイコン | `colorError`（`#c21721`）|
| リポスト済みアイコン | `colorSuccess`（`#3a6b42`）|
| ブックマーク済みアイコン | `colorActionPrimary`（`#2e2e2e`）|
| 数値テキスト | `textSm` / `colorTextSecondary` |

---

## 11. RepostIndicator（リポスト表示）

### 11.1 表示条件

`post.repostPost` が存在する場合（リポスト投稿）、カード最上部に表示する。

### 11.2 レイアウト

```
[⟳ アイコン 12pt]  [{リポストしたユーザー名}がリポスト]
```

- `textXs`（10pt）/ `colorTextSecondary`
- ユーザー名部分はタップで `users/[id]` へ遷移
- `marginBottom: spacing2`

---

## 12. タップ領域の整理

| タップ領域 | 遷移先 / 挙動 |
|-----------|------------|
| カード全体（アクション行・アバター・タグ以外）| 投稿詳細 `posts/[id]`（`disableNavigation=false` の場合）|
| アバター | ユーザープロフィール `users/[userId]` |
| ニックネーム | ユーザープロフィール `users/[userId]` |
| ジャンルタグ | ジャンル検索 `search/?genre={genreId}` |
| ハッシュタグ（本文内）| ハッシュタグ検索 `search/?q={tag}` |
| メンション（本文内）| ユーザープロフィール `users/[userId]` |
| 「続きを読む」| インライン展開（遷移なし）|
| いいね | 楽観更新（ログイン必要）|
| コメント | 投稿詳細 `posts/[id]` |
| リポスト | アクションシート表示 |
| ブックマーク | 楽観更新（ログイン必要）|
| 引用ブロック | 引用元投稿詳細 `posts/[quotePost.id]` |
| 3点メニュー | アクションシート表示（§13 参照）|
| リポストしたユーザー名 | ユーザープロフィール `users/[userId]` |

**タップ伝播の注意:** アバター・タグ・ハッシュタグ・メンション・アクション行へのタップはカード全体のタップより優先される（イベントの伝播を止める）。

---

## 13. 3点メニュー（アクションシート）

メニュー内容は「自分の投稿か他人の投稿か」によって変わる。
モバイルでは Web 版のドロップダウンメニューをアクションシートに置き換える。

### iOS: `ActionSheetIOS` 相当
### Android: `Modal` + リストUI相当

| 表示条件 | メニュー項目 |
|---------|-----------|
| 自分の投稿 | 「編集」/ 「プロフィールに固定（または固定を解除）」/ 「削除」（`colorError` 赤色）|
| 他人の投稿（ログイン済み） | 「この投稿を非表示」/ 「投稿を通報」|
| 未認証 | なし（⋮ボタン自体を非表示にする）|

**store-compliance.md 要件:** 「投稿を通報」は必ず露出する。投稿詳細画面でも同様。

削除選択 → 2 ステップ確認ダイアログ（「本当に削除しますか？」→「削除する」（`colorError`） / 「キャンセル」）

---

## 14. 相対時刻の表示ルール

Web 版は `date-fns` の `formatDistanceToNow` を使用している。モバイルでも同様のロジックを実装する。

| 経過時間 | 表示形式 | 例 |
|---------|---------|---|
| 1 分未満 | 「たった今」| — |
| 1〜59 分 | 「{N}分前」| 「3分前」|
| 1〜23 時間 | 「{N}時間前」| 「2時間前」|
| 1〜6 日 | 「{N}日前」| 「3日前」|
| 7 日以上 | `MM/DD`（今年）または `YYYY/MM/DD`（過去年）| 「6/12」|

- 表示は投稿の `createdAt` を基準とする
- タップ（長押し）で絶対日時（`YYYY年MM月DD日 HH:mm`）を表示する — **iOS: `accessibilityHint` に絶対日時を含める** / **Android: Tooltip 相当は省略し accessibilityLabel に含める**
- フィード内での時刻更新: pull-to-refresh 時に再計算する（経過時間はリアルタイム更新不要）

---

## 15. props として必要なデータ項目

型定義は API 確定後に frontend が行う。以下は項目名と意味の一覧。

### 投稿データ

| 項目名 | 意味 | 備考 |
|--------|------|------|
| `id` | 投稿 ID | |
| `content` | 本文テキスト | null 許容（メディアのみ投稿） |
| `createdAt` | 投稿日時 | ISO 8601 文字列または Date |
| `editedAt` | 編集日時 | null/undefined は未編集 |
| `isPinned` | プロフィール固定フラグ | オーナー文脈でのみ true |

### 投稿者データ（user）

| 項目名 | 意味 |
|--------|------|
| `id` | ユーザー ID |
| `nickname` | 表示名 |
| `avatarUrl` | アバター画像 URL（null 許容）|

### メディアデータ（media 配列）

| 項目名 | 意味 |
|--------|------|
| `id` | メディア ID |
| `url` | 画像/動画 URL |
| `type` | `"image"` または `"video"` |
| `sortOrder` | 表示順 |

### ジャンルデータ（genres 配列）

| 項目名 | 意味 |
|--------|------|
| `id` | ジャンル ID |
| `name` | ジャンル名（「松柏類」等）|
| `category` | カテゴリー識別子 |

### カウント・状態データ

| 項目名 | 意味 |
|--------|------|
| `likeCount` | いいね数 |
| `commentCount` | コメント数 |
| `repostCount` | リポスト数 |
| `isLiked` | 閲覧者がいいね済みか |
| `isBookmarked` | 閲覧者がブックマーク済みか |
| `isReposted` | 閲覧者がリポスト済みか |

### 関連投稿

| 項目名 | 意味 |
|--------|------|
| `quotePost` | 引用元投稿（id / content / createdAt / user）|
| `repostPost` | リポスト元投稿（id / content / createdAt / user / media）|

### コンポーネント制御

| prop 名 | 意味 |
|---------|------|
| `currentUserId` | 閲覧者のユーザー ID（未認証は undefined）|
| `disableNavigation` | true のとき投稿詳細遷移を無効化（詳細画面での使用時）|
| `mentionUsers` | メンション解決用ユーザー Map（id → {id, nickname, avatarUrl}）|

---

## 16. エッジケース

### ローディング

- フィードの `isLoading=true` 時: `PostCardSkeleton`（`ScreenLoading` のバリエーション）を 3 件表示
- スケルトンは PostCard の形状に合わせたプレースホルダー（画像エリアの有無はランダムでなく固定構成）

### 空（content が null / メディアもない）

このケースはサーバー側バリデーション（content または media が必須）で発生しないはずだが、防衛的に扱う。`content = null` かつ `media = []` の場合は「(内容がありません)」と `colorTextTertiary` で表示。

### 長文

- 3 行 / 150 文字で切り詰め + 「続きを読む」（フィードのみ）
- 投稿詳細（`disableNavigation=true`）では全文展開
- 最大 2000 文字（プレミアム）でも全文表示が可能な `ScrollView` または `Text` の `numberOfLines` 無制限で対応

### 削除済み投稿（引用先が削除された場合）

- `quotePost` が null（削除後）のケース: 「この投稿は削除されました」と `colorTextTertiary` でブロック表示（枠のみ残す）

### ブロック済みユーザーの投稿

- サーバー側でフィードから除外されるため、クライアントでの個別ブロック表示は不要
- ただし「非表示にする」アクション後: `isHiddenByUser=true` の状態でカードを `null` レンダリング（高さが 0 になりレイアウトがずれるため、FlatList の `keyExtractor` でリフレッシュが必要 — frontend に要確認）

### リポスト投稿

- `post.repostPost` が存在する場合、`RepostIndicator` + リポスト元の内容を `PostCard` に表示
- ヘッダーには **リポスト元**のアバター・ユーザー名を表示する（`displayPost = post.repostPost`）

### 自分の投稿 vs 他人の投稿

- `currentUserId === post.user.id` を「自分の投稿」判定に使う
- 3点メニューの内容が変わる（§13 参照）

### オフライン

- PostCard 自体はキャッシュデータを表示する
- いいね・ブックマーク等の操作タップ → `ERR_OFFLINE_ACTION` のトースト表示
- `OfflineBanner` はリスト上部（画面最上部）に表示済み

---

## 17. アクセシビリティ

### カード全体

- `accessibilityRole="button"` (`disableNavigation=false` の場合)
- `accessibilityLabel`: `"{nickname}の投稿。{content の先頭 50 文字}。{時刻}"`
- フォーカス時のハイライト: `colorAccent`（`#e2e2e2`）の背景変化

### アバター

- `accessibilityRole="imagebutton"`
- `accessibilityLabel`: `"{nickname}のプロフィールを表示"`

### アクションボタン

| ボタン | `accessibilityLabel` |
|--------|---------------------|
| いいね（未） | 「いいねする。現在 {N} 件」 |
| いいね（済） | 「いいねを取り消す。現在 {N} 件」 |
| コメント | 「コメントする。現在 {N} 件」 |
| リポスト（未）| 「リポストする。現在 {N} 件」 |
| リポスト（済）| 「リポストを取り消す。現在 {N} 件」 |
| ブックマーク（未）| 「ブックマークに追加する」 |
| ブックマーク（済）| 「ブックマークから削除する」 |
| 3点メニュー | 「投稿のオプションを開く」 |

### 画像

- 各画像: `accessibilityRole="imagebutton"` / `accessibilityLabel`: `"{nickname}の投稿画像 {N}枚中 {M}枚目"`
- フルスクリーンビューアへの遷移を `accessibilityHint` で補足: 「タップで拡大表示します」

---

## 18. パフォーマンス

- `React.memo` で PostCard 全体を wrap する（FlatList 内でアイテムが再レンダリングされないように）
- `renderItem` に渡すコールバックを `useCallback` で安定化させる（props が変わらない限り再レンダリングしない）
- `getItemLayout` または FlashList の `estimatedItemSize` を設定してスクロールのジャンクを防ぐ（推奨値: 画像なし約 140pt / 画像 1 枚約 280pt — 実機計測後に調整）
- 画像は `expo-image` の `recyclingKey` を設定してセルの再利用時に正しい画像を表示する
- 時刻の `useMemo`: `createdAt` が変わらない限り再計算しない

---

## 19. 既存との一貫性メモ

### Web 版 PostCard との対応関係

| Web 要素 | モバイル対応 |
|---------|-----------|
| `card-washi`（SVG 枠付きカード）| `radiusLg` + `shadow-washi`（SVG 枠は再現しない — `design-tokens.md` §4 参照）**（2026-07-06 方針転換により撤回。`post-frame.svg` を枠オーバーレイとして再現する方針へ変更し、2026-07-11 時点で実装済み: `borderRadius: 0` + 枠オーバーレイ画像 + `contentInner` インセット + `shadowWashi`（矩形近似）。詳細: `sumi-e-theme-parity-2026-07-06.md` §3.2・§6.3、実装: `components/post/PostCard.tsx`、本書 §4.1）**|
| `hover:shadow-washi-hover`（ホバー影）| タップ時の Pressable フィードバック（opacity 変化 + 影変化）|
| `cursor-pointer` | `Pressable` の押下フィードバック |
| `buildPostPath` / `buildUserPath` | `lib/constants/routes.ts` のルートヘルパー（`navigation.md` 準拠）|
| `Link` (next/link) | `router.push()` (Expo Router) |
| `Image` (next/image) | `expo-image` |
| `formatDistanceToNow` (date-fns) | 同等のロジックを `lib/utils/` に実装（**frontend に実装依頼**）|
| `parseContentSegments` | 同等の関数を `lib/utils/` に実装（**frontend に実装依頼**）|
| `data-testid="post-card"` 等 | E2E 用 `testID` として同じ命名で引き継ぐ（`testing.md` 準拠: `{feature}-{element}` 形式）|

### 流用できる既存パターン

- デザイントークン: `design-tokens.md` §8 の PostCard 適用例をそのまま使う **（2026-07-12 解消済み: `design-tokens.md` §4・§8「PostCard」の追従改訂が完了し、`borderRadius: 0` + 枠オーバーレイ画像 + `contentInner` インセット（`spacing5 + spacing2`）+ `shadowWashi`（矩形近似）という本書 §4.1 の現行仕様と一致する内容に更新された。2026-07-11 時点の「design-tokens.md 側の追従改訂が入るまでは本書 §4.1 を優先する」という注記は本注記をもって解消済みとする）**
- ナビゲーション: `navigation-structure.md` §4.2 のフィード画面の要素定義と一致させる
- エラー文言: `errors.ts` の `ERR_OFFLINE_ACTION`・`ERR_LIKE_FAILED`・`ERR_FOLLOW_FAILED` 等を使う

---

## 20. 未確定事項・要判断

- **画像フルスクリーンビューア:** 画像タップ後の遷移先が未確定（`navigation-structure.md` §9 の申し送り事項）。ビューア仕様策定前は「タップしても何もしない」プレースホルダーで実装しておく。
- **`blurHash` / サムネイル URL:** expo-image の `placeholder` に使えるかどうかは、サーバー API がサムネイル情報を返せるか次第。**core に要相談。**
- **リポストのアクションシート実装:** iOS は `ActionSheetIOS`、Android は独自モーダルを使う。クロスプラットフォームの抽象化ライブラリ（`@react-native-community/action-sheet` 等）採用の可否は frontend に要確認。
- **メンション解決（`mentionUsers` Map）:** フィードで各 PostCard のメンションユーザーを事前に解決しておくか、タップ時に解決するかは API 設計次第。**core に要相談。**
- **ブックマーク機能:** Web 版では実装済みだが、モバイル MVP スコープに含まれるか PM に確認が必要。含まれない場合は `PostCardActions` からブックマークボタンを除外する。
- **ポーリング（PollDisplay）:** Web 版の `PostPoll` 型は定義済みだが、モバイル MVP スコープへの含有は PM に確認が必要。含まれない場合は PostCard からポール表示を除外する。
- **`design-tokens.md` §4・§8 の追従改訂:** 本書 §4.1 の墨筆枠オーバーレイ方針（2026-07-06 方針転換、2026-07-11 実装反映確認）が `design-tokens.md` 側に未反映。§4 は「モバイルでは SVG 枠は再現しない」の旧文言のまま、§8 の PostCard 適用例も `borderRadius: radiusLg` / `padding: spacing5` の旧仕様のまま残っている。本書 §4.1・§19 の内容に合わせた追従改訂が必要（本書のスコープ外のため未実施。次回の `design-tokens.md` 改訂タスクへ申し送り）。
