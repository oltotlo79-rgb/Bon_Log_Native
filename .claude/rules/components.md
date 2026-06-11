---
globs: "app/**/*.tsx, components/**/*.tsx"
---

# コンポーネントルール (React Native)

## Web との根本的差異

- Server Component は存在しない。**全コンポーネントがクライアント実行**。`'use client'` / `'use server'` ディレクティブは使わない
- Web 由来のパターン（`next/image`, `next/link`, Tailwind クラス直書き）を持ち込まない
- `window` / `document` / `localStorage` は存在しない。OS 分岐は `Platform.OS` か `.ios.tsx` / `.android.tsx` で行う

## 設計原則

1. **表示と取得の分離** — サーバーデータは `lib/queries/` のフックから受け取る。コンポーネントは表示に徹する
2. **props には明示的な型定義**（`type XxxProps = { ... }`）。`any` 禁止
3. **状態は最小・ローカルに**。リフトアップは必要になってから
4. **iOS 互換を壊さない** — リリースは Android 先行だが、Android 専用 API・ライブラリは `Platform.OS` 分岐か抽象化で分離し、iOS でも動作する実装を維持する（CLAUDE.md 核心ルール11 / 計画書 §1.5）

## リスト（フィード・コメント等）

- 件数が有界でないリストは **FlatList（または FlashList）**を使う。`ScrollView` + `map` 禁止
- `keyExtractor` は安定 ID。配列 index をキーにしない
- `renderItem` のアイテムコンポーネントは memo 化する（`performance.md`）

## 画像

- 表示は **expo-image**（キャッシュ・placeholder 対応）。React Native 標準の `Image` は使わない
- 取得は expo-image-picker、アップロード前圧縮は expo-image-manipulator（Web の client-image-compression 相当）
- 意味のある画像には `accessibilityLabel`（Web の `alt` 相当）を付ける

## スタイリング

- NativeWind の採否確定（計画書 未決事項#3）までは StyleSheet ベースで書く
- **色・余白・字組はデザイントークン定数**（`lib/constants/design-tokens.ts` 等）経由。リテラル直書き禁止（CLAUDE.md 核心ルール7 の適用）
- 和風配色（緑・茶・ベージュ系）は Web とトーンを揃える。designer の `docs/design/` 仕様があれば必ず従う

## セーフエリア・キーボード

- 画面ルートはセーフエリア対応（react-native-safe-area-context）
- 入力を含む画面はキーボードの重なり（KeyboardAvoidingView 等）を処理する

## アクセシビリティ

- 操作要素には `accessibilityRole` / `accessibilityLabel` を付与
- タップターゲットは 44pt 以上
- コントラストは designer のトークン仕様に従う

## 文言

- 日本語・落ち着いた丁寧語（Web と同一トーン）
- エラー・制限値に関わる文言は `lib/constants/` の定数。画面コピーは designer 仕様（`docs/design/`）を正とする
