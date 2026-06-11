---
globs: "app/**/*.tsx"
---

# ナビゲーションルール (Expo Router)

## 構成

```
app/
├── _layout.tsx        # ルートレイアウト（Provider 群 + 認証ガード）
├── (auth)/            # 未認証スタック: login, register, password-reset
├── (tabs)/            # 認証後ボトムナビ: フィード / 検索 / 通知 / プロフィール
└── posts/[id].tsx 等  # タブの上に積むスタック画面（投稿詳細・設定 等）
```

- Route Group の役割は Web の `(auth)` / `(main)` に対応する
- タブ構成・画面分割の正は designer の `docs/design/` 仕様（計画書 未決事項#3。Phase 3 着手前に確定）

## 規約

- 遷移は Expo Router の `router` / `<Link>` のみ使用
- パス文字列を画面に直書きして散在させない。`lib/constants/routes.ts` のルートヘルパー経由（Web の `routes.ts` 規約を踏襲）
- typed routes を有効化し、`Href` の型安全を維持する
- `useLocalSearchParams` の値は `string | string[]` — **必ず型ガードで絞ってから使う**（`any` / `as` 禁止）
- Dynamic Route は `app/posts/[id].tsx` 形式

## 認証ガード

- ルートレイアウトで認証状態（`lib/auth/`）を参照し、
  - 未認証 → `(auth)` へ redirect
  - 認証済みが `(auth)` 配下 → フィードへ redirect
- ガードは**ルートレイアウトの 1 箇所に集約**する。画面ごとの個別ガードを書かない

## ディープリンク

- カスタムスキーム + universal links / app links を app config で定義する
- **Push 通知タップ → 該当画面遷移**は Phase 3 の受け入れ基準。通知ペイロード → ルートの対応は `lib/push/` の 1 モジュールに集約する（`push-notifications.md`）
- 未認証でディープリンクに到達した場合、ログイン後に元のリンク先へ復帰させる
