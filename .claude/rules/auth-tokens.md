---
globs: "lib/auth/**/*.ts"
---

# 認証・トークン管理ルール

## 方式（計画書 工事#3）

- サーバーが**アクセストークン（短命）+ リフレッシュトークン**を発行する
- エンドポイント: `POST /api/v1/auth/login` / `POST /api/v1/auth/refresh` / `POST /api/v1/auth/logout`
- リクエスト・レスポンスの具体的な形式はサーバーの OpenAPI スペックを正とする（クライアント側で勝手に決めない）
- Google OAuth: expo-auth-session で ID トークンを取得 → サーバーの検証エンドポイントへ送付 → サーバー発行のトークンを受領。**ID トークンをクライアントで検証・信頼しない**（検証はサーバーの責務）

## 保管（絶対規則）

- トークンは **expo-secure-store のみ**（iOS Keychain / Android Keystore）
- AsyncStorage / MMKV / ファイル / 平文ストレージへの保存禁止
- secure-store のキー名は `lib/constants/` の定数
- トークンをログ・console・Sentry（breadcrumb 含む）に出さない

## リフレッシュ

- 401 受信 → リフレッシュを**単一飛行**で実行（同時多発リクエストでも refresh 呼び出しは 1 回。進行中の Promise を共有する）
- リフレッシュ成功 → 元リクエストを 1 回だけ再試行
- リフレッシュ失敗（失効・取り消し）→ トークン破棄 → TanStack Query キャッシュ clear → ログイン画面へ
- リフレッシュ処理自体は `lib/api/` ラッパーと `lib/auth/` の責務。画面・コンポーネントに 401 ハンドリングを書かない

## ログアウト

1. サーバーへ logout を送信（リフレッシュトークンの失効）
2. expo-secure-store からトークンを削除
3. `queryClient.clear()` でサーバー状態を全消去（前ユーザーのデータ残留防止）
4. Push のデバイストークン登録を解除（`push-notifications.md`）
5. ログイン画面へ遷移

サーバー呼び出しが失敗してもローカルのトークン削除と画面遷移は必ず実施する（fail-safe）。

## 認証状態と画面ガード

- 「ログイン済みか」は `lib/auth/` が単一管理し、画面側は `useAuth` 等のフックで参照する
- 画面ガードはルートレイアウトに集約する（`navigation.md`）。画面ごとに個別ガードを書かない
- 表示用のユーザー情報はサーバー API から TanStack Query で取得する。トークン内の claim を UI 表示の正としない
