---
description:
alwaysApply: true
---

# CLAUDE.md

## プロジェクト概要

盆栽SNS「Bon_Log」(www.bon-log.com) の**スマホネイティブアプリ**を React Native (Expo) で開発するリポジトリ。

- **リリースは Android (Google Play) 先行。iOS は当面リリースしないが、iOS でも動作するクロスプラットフォーム実装を維持する**（計画書 §1.5）
- DB・サーバーは既存 Web リポジトリ **Bon_Log_cfw** (Next.js 16 / Prisma 6 / Supabase PostgreSQL) を共有する
- アプリからのデータアクセスは**必ず Next.js サーバーの REST API (`/api/v1/*`) 経由**。直接の DB 接続は存在しない
- 計画書: `docs/plans/react-native-mobile-app-plan-2026-06-11.md`（フェーズ・スコープ・ADR の正本）
- **現状: 実装前。** このリポジトリにはルール・設定のみが存在する。Expo 雛形の作成以降もすべて以下の規約に従う

MVP スコープ: フィード / 投稿 CRUD / コメント / いいね / フォロー / 通知 / プロフィール / 検索
（図鑑・農薬・肥料・ホルモン・分析・admin・ショップ・イベントはスコープ外 — 計画書 §10）

## 開発コマンド（実装後もこの体系を維持する）

```bash
npx expo start             # 開発サーバー起動
npx expo run:android       # Android development build 作成 + 起動（開発の基本）
npx expo run:ios           # iOS 互換確認用（要 macOS。リリースは Android 先行）
npm run lint               # ESLint (eslint-config-expo)
npx tsc --noEmit           # TypeScript 型チェック

# テスト
npm test                   # ユニットテスト (Jest + jest-expo)
npm run test:coverage      # カバレッジ付き
npm run test:e2e           # E2E (Maestro: maestro test .maestro/)

# API クライアント生成
npm run generate:api       # サーバーの OpenAPI スペックから型付きクライアントを再生成

# ビルド / 配布 (EAS)
eas build --profile development   # 開発ビルド
eas build --profile production    # ストア提出用ビルド
eas submit                        # TestFlight / Play 内部テストへ提出
```

## CI（方針）

| ジョブ | 内容 | 実行タイミング |
|--------|------|--------------|
| lint | ESLint + TypeScript 型チェック | 常時 |
| test | ユニットテスト（カバレッジゲート） | 常時 |
| e2e | Maestro E2E | リリース前（Phase 5 で整備） |
| build | EAS Build | リリース時 |

カバレッジゲートは Web と同一基準: branches 80%, functions/lines/statements 85%。

## 技術スタック

- **フレームワーク**: Expo (React Native) + Expo Router / TypeScript (strict)
- **サーバー状態**: TanStack Query（無限スクロールはカーソルベース）
- **API クライアント**: OpenAPI スペックからの自動生成クライアント（手書き fetch 禁止）
- **画像**: expo-image (表示) / expo-image-picker (取得) / expo-image-manipulator (アップロード前圧縮)
- **Push 通知**: expo-notifications + FCM（APNs は将来の iOS リリース時に追加）
- **課金**: RevenueCat (react-native-purchases) — 当面 Play Billing のみ接続
- **トークン保管**: expo-secure-store（AsyncStorage へのトークン保存は禁止）
- **監視**: @sentry/react-native（既存 Sentry プロジェクトに追加）
- **テスト**: Jest (jest-expo) + React Native Testing Library / E2E: Maestro
- **ビルド / 配布**: EAS Build → Play 内部テスト（TestFlight は将来の iOS リリース時）
- **スタイリング**: 未確定（NativeWind 採用可否は Phase 3 着手前に決定 — 計画書 未決事項#3）。確定までは和風デザイントークンの定数化を前提に設計する
- **API サーバー**: https://www.bon-log.com（Bon_Log_cfw / Next.js 16 / fly.io）

## 核心ルール

1. **DB に直接アクセスしない** — supabase-js / PostgREST / GraphQL / Prisma をこのリポジトリに導入しない。データは必ずサーバー REST API (`/api/v1/*`) 経由
2. **API 呼び出しは OpenAPI 生成クライアント経由** — 手書き fetch 禁止（例外は R2 presigned URL への直接アップロードのみ）
3. **サーバー状態は TanStack Query で管理** — ミューテーション後は invalidation 対応表に従い `invalidateQueries`（Web の `revalidatePath` はモバイルに効かない）
4. **トークンは expo-secure-store のみ** — AsyncStorage / MMKV / ファイルへの保存禁止。ログ・Sentry にも出さない
5. **リスト取得はカーソルベースページネーション** — `useInfiniteQuery` + `nextCursor`。offset 不使用
6. **エラーメッセージは `lib/constants/errors.ts` の定数を使用** — インライン文字列禁止
7. **マジックナンバー禁止** — 数値・文字列リテラルは `lib/constants/` の定数を使用（制限値は `limits/`、ルートは `routes.ts`）
8. **`any` / `as` キャスト禁止** — 型ガードか Zod で安全に絞り込む。strict mode を維持
9. **既存ヘルパーを再利用** — 新コード追加前に `lib/`、`hooks/`、`components/` に同等機能がないか確認し、あればそれを使う
10. **新機能・バグ修正にはテストを伴う** — カバレッジ閾値（branches 80%, functions/lines/statements 85%）を下回らない
11. **iOS 互換を壊さない** — リリースは Android 先行だが、Android 専用 API・ライブラリは `Platform.OS` 分岐か抽象化レイヤで分離し、iOS でも動作する実装を維持する（計画書 §1.5）

## アーキテクチャ（目標構成）

```
app/                    # Expo Router スクリーン
├── (auth)/            # ログイン, 新規登録, パスワードリセット
├── (tabs)/            # ボトムナビ配下 (フィード, 検索, 通知, プロフィール)
└── posts/[id] 等      # タブ外のスタック画面 (投稿詳細, 設定 等)
components/             # UI コンポーネント (feed, post, comment, user, common 等)
hooks/                  # UI 用カスタムフック
lib/
├── api/               # OpenAPI 生成クライアント (generated/ は編集禁止) + ラッパー
├── auth/              # トークン管理 (secure-store), 認証フロー
├── queries/           # TanStack Query フック + クエリキー定義 + invalidation 対応表
├── push/              # Push 通知の登録・受信・遷移
├── billing/           # RevenueCat 連携
├── constants/         # エラーメッセージ, 制限値, ルート定数, デザイントークン
└── utils/             # 純粋関数ユーティリティ
types/                  # 共有型定義
__tests__/              # Jest ユニットテスト (src 構成をミラー)
.maestro/               # Maestro E2E フロー
```

サーバー側（`app/api/v1/*`・services・Prisma スキーマ・OpenAPI スペック）の変更は **Bon_Log_cfw リポジトリの管轄**であり、このリポジトリでは行わない。サーバー側の変更が必要になったら、必要な API 仕様を明文化してユーザーに引き継ぐ。

## 機能制約（サーバー側で強制 / クライアントは UX のための事前検証）

- 投稿: 1日20件, 文字数500(無料)/2000(プレミアム), 画像4(6)枚, 動画0(1)本
- コメント: 1投稿100件, 1日制限あり, 画像2枚, 動画0(1)本
- ジャンル: 投稿に最大3つ（松柏類, 雑木類, 草もの, 用品・道具, 施設・イベント, その他）
- レビュー: 星5段階 + テキスト + 画像3枚
- 制限値の正はサーバー。クライアント側の事前チェック用に `lib/constants/limits/` へミラーするが、サーバーエラー (400/429) のハンドリングは必須

## UI/UXガイドライン

- 和風・落ち着いた色調（緑, 茶, ベージュ系）— Web とトーンを揃える
- 1カラム + ボトムナビ（Web のモバイルレイアウトを踏襲）
- セーフエリア対応必須 / タップターゲット 44pt 以上
- 通報・ブロックの UI 露出はストア審査の必須要件（`.claude/rules/store-compliance.md`）

## パスエイリアス

`@/*` でプロジェクトルートからインポート: `import { queryKeys } from '@/lib/queries/keys'`
（tsconfig `paths` で定義。Metro の tsconfig paths 対応を使用し、Web と同じ規約を維持）

## 環境変数

```bash
EXPO_PUBLIC_API_BASE_URL          # API ベース URL (本番: https://www.bon-log.com)
EXPO_PUBLIC_SENTRY_DSN            # Sentry (RN)
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY  # RevenueCat 公開SDKキー（IOS は将来の iOS リリース用）
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  # Google OAuth（IOS は将来用）
SENTRY_AUTH_TOKEN                 # ビルド時のみ (EAS Secrets 管理)
SUPABASE_ACCESS_TOKEN             # Claude Code の MCP (supabase) 用。アプリからは一切使用しない
```

**`EXPO_PUBLIC_` 付き変数はアプリバイナリに埋め込まれる = 公開情報のみ。**
秘密鍵・サーバー用シークレットを絶対に入れない（サーバーシークレットは Bon_Log_cfw / EAS Secrets の管轄）。

## 詳細ルール

機能別の詳細なパターン・規約は `.claude/rules/` に分割:

| ルールファイル | 適用対象 |
|--------------|---------|
| `architecture.md` | レイヤ分離・依存方向・配置判断 |
| `api-client.md` | API クライアント生成・呼び出し・DB 直接アクセス禁止 |
| `data-fetching.md` | TanStack Query・クエリキー・invalidation |
| `auth-tokens.md` | 認証・トークン管理・Google OAuth |
| `components.md` | コンポーネント作成・リスト・画像 |
| `navigation.md` | Expo Router・ディープリンク |
| `push-notifications.md` | Push 通知 |
| `billing.md` | RevenueCat・プレミアム判定 |
| `error-handling.md` | エラー境界・Sentry・オフライン |
| `performance.md` | パフォーマンス最適化 |
| `testing.md` | テスト |
| `setup-dev.md` | 開発環境セットアップ |
| `comments.md` | コメント規約・WHY/WHAT判断基準 |
| `store-compliance.md` | App Store / Google Play 審査要件 |

## 関連リポジトリ

| リポジトリ | 役割 |
|-----------|------|
| `Bon_Log_cfw`（`../Bon_Log_cfw`） | Web アプリ + API サーバー (Next.js)。DB スキーマ・API 実装・OpenAPI スペックの正本。**このリポジトリの作業で編集しない** |
| 本リポジトリ (`Bon_Log_Native`) | モバイルアプリ (Expo)。サーバーには REST API 経由でのみアクセス |
