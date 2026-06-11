---
globs: "lib/api/**/*.ts"
---

# API クライアントルール

## 原則

- サーバー（Bon_Log_cfw）との通信は **OpenAPI スペックから生成した型付きクライアント**経由のみ（計画書 ADR-2 / ADR-3）
- OpenAPI スペックがリポジトリ間の唯一の契約。**型定義の手書きコピー禁止**（90 モデル規模での不整合防止）
- 手書き fetch / axios 禁止。**例外: R2 presigned URL への直接 PUT アップロードのみ**（サーバーの presigned API で取得した URL へのアップロード。既存 Web の `app/api/upload/presigned` フローを流用）

## 生成フロー

1. サーバー側 CI が Zod スキーマから OpenAPI スペックを生成（Bon_Log_cfw 管轄）
2. `npm run generate:api` でスペックから `lib/api/generated/` を再生成
3. 生成差分を必ずレビューする — 破壊的変更（フィールド削除・型変更）はスペック差分として検出する（計画書 リスク#1）
4. `generated/` は直接編集禁止（`architecture.md`）

生成ツール（openapi-typescript / orval / hey-api 等）は Phase 1 のスペック生成基盤の確定後に選定する。本ルールの原則はツール選定に依存しない。

## ラッパーの責務（`lib/api/client.ts` 等）

- ベース URL は `EXPO_PUBLIC_API_BASE_URL` から取得（ハードコード禁止）
- `Authorization: Bearer <accessToken>` の付与（トークン取得は `lib/auth/` 経由）
- 401 → リフレッシュ → 1回だけ再試行（単一飛行。詳細は `auth-tokens.md`）
- 非 2xx をサーバーの統一エラーレスポンス規約（OpenAPI スペックが正）に従い**型付きエラー**へ変換して throw（TanStack Query が捕捉する前提）
- タイムアウト設定（値は `lib/constants/` の定数）

## ステータスコードの扱い

| コード | クライアントの挙動 |
|--------|------------------|
| 400 | 入力エラー — フォームへフィードバック（検証の正はサーバー） |
| 401 | リフレッシュ → 再試行 → それでも失敗ならログアウト処理 |
| 403 | 権限なし表示（ゲスト・停止ユーザー等） |
| 404 | not-found UI |
| 429 | レート制限 — 自動連打リトライ禁止。ユーザー向けメッセージ + 手動再試行 |
| 5xx | リトライポリシーに従う（`error-handling.md`）+ Sentry 送信 |

## DB 直接アクセスの禁止（Web の `prisma-database.md` から継承）

DB アクセスは**必ず Next.js サーバー（Prisma）経由**。モバイルから直接アクセスする手段を一切持ち込まない:

- `@supabase/supabase-js` 等のクライアント依存追加は禁止（ESLint `no-restricted-imports` で阻止する）
- `https://*.supabase.co/rest/v1/...` / `/graphql/v1/...` への直接 fetch も禁止
- DB 接続文字列・サービスキー・anon キーをこのリポジトリ・アプリバイナリに置かない
- `.mcp.json` の supabase MCP サーバーは **Claude の開発時調査専用**（スキーマ・データ確認）。アプリコードとは無関係

## リクエスト設計

- リスト取得はカーソルベース（`cursor` パラメータ + `nextCursor` 応答）。offset 禁止
- 認証・Zod 検証・レート制限はサーバーの route handler 内で fail-closed に強制される（計画書 制約3）。クライアント側の事前検証は UX 目的であり、防御線ではない
