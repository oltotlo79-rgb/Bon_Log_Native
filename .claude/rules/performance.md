---
globs: "app/**/*.tsx, components/**/*.tsx"
---

# パフォーマンス最適化ルール

## リスト

- フィード等の無限リストは FlatList / FlashList（`components.md`）。チューニングパラメータを闇雲に弄る前に、まずアイテムコンポーネントを軽くする
- アイテムコンポーネントは `React.memo` 化し、`renderItem` 内でのインライン関数・オブジェクト生成を避ける
- アイテム高さが安定しているなら `getItemLayout`（FlashList なら `estimatedItemSize`）を設定する

## 画像

- expo-image のキャッシュポリシーを使う。表示サイズに合わせた取得・`contentFit` 指定で過大デコードを防ぐ
- アップロードは圧縮（expo-image-manipulator）→ presigned URL 取得 → R2 へ直接 PUT（計画書: 既存 Web フローの流用）。原寸をそのまま送らない

## 再レンダリング

- Context は変更頻度で分割し、肥大化させない
- 高頻度更新（いいねカウント等）は該当コンポーネント内に閉じる
- `useCallback` / `useMemo` は計測根拠か明確なホットパス（リストアイテムへ渡す props 等）に限る。盲目的に付けない

## JS スレッド

- 重い同期処理（大配列の変換等）をタップハンドラ内で実行しない
- アニメーションはネイティブドライバ（`useNativeDriver` / Reanimated）を使い、JS スレッドに依存させない

## 起動・バンドル

- 依存追加は慎重に（バンドルサイズ・起動時間に直結）。追加前に既存依存で同等機能がないか確認する（CLAUDE.md 核心ルール9）
- 画面の遅延ロードは必要が計測で示されてから導入する
