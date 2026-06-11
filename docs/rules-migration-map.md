# Web (Bon_Log_cfw) からのルール移植対応表

作成日: 2026-06-11
目的: Web リポジトリの開発規約・エージェント構成・MCP 設定を、モバイル (React Native / Expo) の文脈に合わせてどう移植・改定したかの記録。

正本の構成は Web と同一の思想を維持している:
**CLAUDE.md（入口）+ `.claude/rules/`（詳細）+ AGENTS.md（Codex 用の薄い入口）+ `.codex/skills/`（Codex 用索引）**

## `.claude/rules/` 対応表

| Web (Bon_Log_cfw) | Native (本リポジトリ) | 主な変更 |
|---|---|---|
| `architecture.md` | `architecture.md` | レイヤを RN 構成（UI → queries → api）に置換。Server Action 章を削除。「サーバー側変更はユーザーへ引き継ぐ」規約を追加 |
| `server-actions.md` | `api-client.md` + `data-fetching.md` に分割継承 | Server Actions はネイティブから呼べない（計画書 制約1）。認証→Zod→レート制限はサーバー側に残るため、クライアントは 401/400/429 をハンドリングする側として規定 |
| `nextjs-components.md` | `components.md` | RSC/`next/image`/`next/link` → 全クライアント実行/expo-image/FlatList/a11y/セーフエリア |
| `nextjs-data-fetching.md` | `data-fetching.md` | `unstable_cache`/`revalidate` → TanStack Query + invalidation 対応表（計画書 リスク#2 対応） |
| `nextjs-api-routes.md` | `api-client.md` に契約側として継承 | Route Handler の実装規約はサーバー管轄のため非移植。fail-closed 設計を「クライアントは防御線ではない」という前提として継承 |
| `nextjs-proxy.md` | （非移植） | `proxy.ts` はサーバー専用 |
| `nextjs-performance.md` | `performance.md` | `next/image`/dynamic import → リスト仮想化・expo-image・JS スレッド・ネイティブドライバ |
| `nextjs-error-handling.md` | `error-handling.md` | `error.tsx`/`PageError` → Expo Router ErrorBoundary/`ScreenError` + オフライン・リトライポリシー |
| `prisma-database.md` | `api-client.md` の「DB 直接アクセスの禁止」節 | Prisma 実装規約はサーバー管轄。**Supabase Data API 禁止方針はクライアント側の禁止事項として全面継承**（カーソルページネーション規約も継承） |
| `auth-nextauth.md` | `auth-tokens.md` | Cookie/JWT セッション → Bearer access/refresh トークン + expo-secure-store + Google OAuth（expo-auth-session → サーバー検証） |
| `pesticide-validation.md` | （非移植） | 農薬機能は MVP スコープ外（計画書 §10）かつデータ・検証フローはサーバーリポジトリ管轄 |
| `testing.md` | `testing.md` | Vitest/Playwright → Jest (jest-expo) + RNTL / Maestro。**カバレッジ閾値は同一**（branches 80%, functions/lines/statements 85%）。「壊れたテストをスキップで逃げない」等の文化を継承 |
| `setup-docker.md` | `setup-dev.md` | Docker/PostgreSQL → development build / API 接続先切り替え（ローカル Bon_Log_cfw への向け先含む）。ローカル DB は持たない |
| `comments.md` | `comments.md` | ほぼ踏襲。Server Action ステップ番号コメントの例外を撤廃（対応するパターンがクライアントに存在しないため）。例を RN 文脈に置換 |
| （新規） | `navigation.md` | Expo Router・認証ガード・ディープリンク（モバイル固有） |
| （新規） | `push-notifications.md` | デバイストークン・許可リクエスト・タップ遷移（計画書 工事#4） |
| （新規） | `billing.md` | RevenueCat・プレミアム判定は DB 購読状態が単一の真実（計画書 §8） |
| （新規） | `store-compliance.md` | IAP 3.1.1 / UGC 1.2 通報・ブロック / アカウント削除 / プライバシーマニフェスト（計画書 Phase 4） |

## `.claude/agents/` 対応表

| Web | Native | 変更 |
|---|---|---|
| `pm-orchestrator` | `pm-orchestrator` | 配下名を更新（backend → core）。「サーバー側工事が必要なタスクは配下に振らずユーザーへ引き継ぐ」制約を追加 |
| `backend` | `core` | サーバーが別リポジトリになったため再定義。担当は `lib/`（API クライアント・認証・クエリ層・Push・課金・定数）と `types/`。「サーバー API に無いものは差し戻す」を最重要境界に |
| `frontend` | `frontend` | 担当を `app/`（Expo Router）・`components/`・`hooks/` に置換。`lib/queries/` フックの利用は OK・新設は core へ差し戻し |
| `designer` | `designer` | モバイル前提（タブ/スタック構造・4状態・iOS/Android 差・44pt・ストア審査 UI）に更新 |
| `tester` | `tester` | Vitest/Playwright → Jest+RNTL/`.maestro/`。モック境界を `lib/api/` に変更 |
| `evaluator` | `evaluator` | 評価観点をモバイル核心ルール（secure-store 漏れ・invalidation 対応表・生成クライアント経由・ストア審査要件）に置換。model: opus は維持 |

## `.claude/commands/` 対応表

| Web | Native | 理由 |
|---|---|---|
| `validate-agri-data.md` | （非移植） | 農薬・肥料・ホルモンデータの検証はサーバーリポジトリ（`prisma/validation/`）管轄かつ MVP スコープ外 |

## その他の設定

| 項目 | 扱い |
|---|---|
| `.mcp.json` | **3 サーバー（github / memory / supabase）をそのまま継承**。supabase MCP は共有 DB の開発時調査用（プロジェクト ref 同一）。アプリコードからの DB 直接アクセス禁止とは別物（`api-client.md` 参照） |
| `.claude/settings.local.json` | 許可コマンドを Expo / EAS / Maestro / Jest 系に置換。deny（rm -rf / shutdown / chmod / .env 読み取り等）は同一。**Web にあった `defaultMode: bypassPermissions` と `skipDangerousModePermissionPrompt` は移植していない**（Claude Code の安全機構により自動書き込みが拒否されたため。同一挙動にしたい場合は手動で追記すること） |
| `AGENTS.md` / `.codex/skills/` | 同一の「薄い入口 + 索引スキル」パターン。スキル名は `bonnsa-sns-rules` → `bon-log-native-rules` |
| カバレッジ閾値 | Web と同一（branches 80%, functions/lines/statements 85%）を CI ゲートとして維持 |

## 実装前に確定が必要な未決事項（計画書より + 移植時に追加）

1. **NativeWind 採用可否**（計画書 未決事項#3）— 確定まではデザイントークン定数 + StyleSheet 前提
2. **OpenAPI クライアント生成ツールの選定**（openapi-typescript / orval / hey-api）— Phase 1 のスペック生成基盤確定後
3. **Sign in with Apple の要否**（App Store Guideline 4.8、移植時に追加した論点）— Google ログインを iOS で出すなら原則必要。Phase 4 までに決定
