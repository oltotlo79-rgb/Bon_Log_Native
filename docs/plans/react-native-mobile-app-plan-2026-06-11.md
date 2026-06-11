# React Native スマホアプリ開発計画 (2026-06-11)

作成日: 2026-06-11
ステータス: ドラフト
対象読者: 意思決定者・実装担当
対象システム: 盆栽SNS「Bon_Log」(www.bon-log.com) — Next.js 16 / Prisma 6 / Supabase PostgreSQL

---

## 1. 概要・目的・前提

### 1.1 目的

盆栽SNS「Bon_Log」のスマホネイティブアプリ (iOS / Android) を React Native (Expo) で開発する。
アプリは**別リポジトリ**で新規作成し、DB・サーバーは既存の Next.js サーバーを共有する。
既存 Web は従来どおり Server Actions ベースで動作を継続し、モバイルは新設の REST API (`app/api/v1/*`) 経由でアクセスする。

### 1.2 既存システムの前提

| 項目 | 内容 |
|------|------|
| フレームワーク | Next.js 16 (App Router) / React 19 / TypeScript strict |
| スタイリング | Tailwind CSS 4 + shadcn/ui |
| DB / ORM | Prisma 6 + Supabase PostgreSQL (90 モデル) |
| 認証 | NextAuth.js v5 (JWT・Cookie ベース) |
| ストレージ | Cloudflare R2 — presigned URL アップロード (`app/api/upload/presigned` が既存) |
| キャッシュ / レート制限 | Upstash Redis |
| メール / 決済 / 監視 | Resend / Stripe / Sentry |
| デプロイ | fly.io (Docker standalone) |
| ビジネスロジック | Server Actions 85 ファイル (`lib/actions/`) + `lib/services/` の 2 層構造 |

### 1.3 設計上の重要な制約

1. **Server Actions はネイティブアプリから呼べない。** Server Actions は Next.js の RSC プロトコルと Cookie セッションに密結合しており、外部クライアントへの公開 API として成立しない。モバイル用の API 層を新設する必要がある。
2. **Supabase Data API は禁止。** プロジェクト方針 (`.claude/rules/prisma-database.md`) により supabase-js でのモバイル直接 DB アクセスは行わない。DB アクセスは必ず Next.js サーバー (Prisma) 経由とする。
3. **`proxy.ts` は `/api/*` を保護しない。** 新設 API は route handler 内で認証・Zod 検証・レート制限を完結させる fail-closed 設計が必須 (`.claude/rules/nextjs-api-routes.md` のチェックリスト準拠)。

### 1.4 注意事項: 本番配信元 (解決済み)

www.bon-log.com は fly.io から配信済み (2026-06-11 ヘッダ検証で確認: `server: Fly` / `via: 1.1 fly.io`)。
DNS カットオーバーは完了しており、モバイルアプリにハードコードする API ベース URL は https://www.bon-log.com を前提にできる。

---

## 2. アーキテクチャ決定 (ADR)

### ADR-1: リポジトリ構成 — 別リポジトリで新規作成

| | 内容 |
|---|------|
| **決定** | RN アプリ本体は**別リポジトリ**で新規作成する。モノレポ化はしない。 |
| **理由** | 既存リポジトリは Web 用の CI ゲート (lint / 型チェック / カバレッジ / E2E) が完成しており、Expo / EAS のビルドパイプラインを混在させると CI 構成・依存管理の複雑度が急増する。リリースサイクルも Web (継続デプロイ) とモバイル (ストア審査) で根本的に異なる。 |
| **却下案** | モノレポ (Turborepo / Nx 等) — 型共有は容易になるが、CI・依存・ツールチェーンの統合コストと、ストア審査由来の異なるリリースサイクルの混在デメリットが上回ると判断。型共有は ADR-3 の OpenAPI 生成で代替する。 |

### ADR-2: API 方式 — REST (`app/api/v1/*`) + Zod + OpenAPI スペック生成

| | 内容 |
|---|------|
| **決定** | モバイル向け API は REST とし、`app/api/v1/*` の Route Handlers で実装する。入出力は Zod スキーマで検証し、そこから OpenAPI スペックを生成する。 |
| **理由** | Route Handlers は既存スタックの標準機能であり追加ランタイム不要。Zod は既存 Server Actions の検証層をそのまま流用できる。OpenAPI スペックにより別リポジトリ間の契約を機械可読に固定できる。 |
| **却下案** | tRPC — 型共有にはモノレポ or パッケージ共有が事実上前提であり、**別リポジトリ構成と相性が悪い**ため不採用。 |

### ADR-3: 型共有方式 — OpenAPI スペック経由のコード生成

| | 内容 |
|---|------|
| **決定** | サーバー側で Zod スキーマから OpenAPI スペックを生成し、モバイル側で openapi-typescript / orval / hey-api 等により**型付きクライアントを自動生成**する。 |
| **理由** | リポジトリ間の唯一の契約点が OpenAPI スペックになり、破壊的変更がスペック差分として検出できる。生成コードのため手作業の同期ミスが構造的に発生しない。 |
| **却下案 1** | private npm パッケージ配布 — レジストリ運用・バージョン管理・認証設定が個人開発規模に対して**運用過剰**のため不採用。 |
| **却下案 2** | 型定義の手書きコピー — 既存 90 モデル規模では**不整合リスク**が高く不採用。 |

---

## 3. システム構成図

```
┌─────────────────────┐          ┌─────────────────────┐
│  Web ブラウザ        │          │  RN アプリ (Expo)    │
│  (既存・変更なし)     │          │  別リポジトリ         │
└──────────┬──────────┘          └──────────┬──────────┘
           │ Server Actions                 │ REST + Bearer トークン
           │ (Cookie セッション)             │ (access / refresh token)
           ▼                                ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js 16 サーバー (fly.io)                              │
│                                                          │
│  ┌────────────────┐      ┌─────────────────────────┐     │
│  │ lib/actions/    │      │ app/api/v1/* (新設)      │     │
│  │ Server Actions  │      │ Route Handlers           │     │
│  │ (Web 専用)      │      │ 認証・Zod・レート制限を    │     │
│  └───────┬────────┘      │ route 内で完結(fail-closed)│    │
│          │               └───────────┬─────────────┘     │
│          │      ロジック押し下げ        │                   │
│          ▼               ▼            ▼                   │
│  ┌──────────────────────────────────────────────┐        │
│  │ lib/services/  (共有ドメインロジック)            │        │
│  │ + notification-core (Push 送信フック追加)       │        │
│  └───────────────────┬──────────────────────────┘        │
│                      │ Prisma 6                          │
└──────────────────────┼────────────────────────────────────┘
                       ▼
        ┌──────────────────────────┐
        │ Supabase PostgreSQL       │   周辺: Cloudflare R2 (presigned URL)
        │ (90 モデル +               │        Upstash Redis (レート制限)
        │  リフレッシュトークン /     │        FCM / APNs (Push)
        │  デバイストークン テーブル) │        Stripe + RevenueCat (課金)
        └──────────────────────────┘        Sentry (Web / RN 両方)
```

- Web は従来どおり Server Actions → services → Prisma の経路を維持 (変更なし)
- モバイルは `app/api/v1/*` → services → Prisma の経路を新設
- 両経路が `lib/services/` のドメインロジックを共有する (二重実装の禁止)

---

## 4. 技術スタック一覧

### 4.1 モバイル側 (新規リポジトリ)

| 領域 | 技術 | 備考 |
|------|------|------|
| フレームワーク | Expo (React Native) + Expo Router | TypeScript strict |
| サーバー状態 | TanStack Query | カーソルベースページネーションの無限スクロール |
| API クライアント | OpenAPI 生成クライアント (openapi-typescript / orval / hey-api 等) | サーバーの OpenAPI スペックから自動生成 |
| 画像表示 / 取得 | expo-image / expo-image-picker | |
| 画像圧縮 | expo-image-manipulator | クライアント側圧縮 (既存 Web の client-image-compression 相当) |
| 地図 | react-native-maps または MapLibre RN | 既存は Leaflet + OSM のため **MapLibre が親和的** |
| Push 通知 | expo-notifications + FCM / APNs | |
| 課金 | RevenueCat (react-native-purchases) | |
| トークン保管 | expo-secure-store | **AsyncStorage へのトークン保存は禁止** |
| 監視 | @sentry/react-native | 既存 Sentry プロジェクトに追加 |
| E2E テスト | Maestro | |
| ビルド / 配布 | EAS Build → TestFlight / Play 内部テスト | |

### 4.2 サーバー側追加分 (既存リポジトリ)

| 領域 | 技術・実装 | 備考 |
|------|-----------|------|
| API 層 | `app/api/v1/*` Route Handlers | Bearer 検証・Zod・レート制限・エラーレスポンス規約の共通基盤 |
| OpenAPI 生成 | Zod スキーマ → OpenAPI スペック生成基盤 | モバイル側コード生成の契約点 |
| モバイル認証 | `/api/v1/auth/login\|refresh\|logout` + リフレッシュトークン用 Prisma テーブル | bcrypt 照合は services 層へ切り出し再利用 |
| Google OAuth | サーバー側 ID トークン検証エンドポイント | モバイルは expo-auth-session で取得した ID トークンを送る |
| Push 送信 | `lib/services/notification-core` への送信フック + デバイストークン管理テーブル | FCM / APNs |
| 課金 Webhook | RevenueCat Webhook 受信エンドポイント | Stripe Webhook と併存 |

### 4.3 共有資産 (変更せず流用)

| 資産 | 用途 |
|------|------|
| Supabase PostgreSQL (90 モデル) | 単一 DB を Web / モバイルで共有 |
| `lib/services/` ドメインロジック | API 層と Server Actions の双方から呼ぶ |
| Cloudflare R2 presigned URL フロー (`app/api/upload/presigned`) | モバイルの画像アップロードでそのまま流用 |
| Upstash Redis レート制限 (`enforceUserRateLimit`) | API 層でも同じ仕組みを使用 |
| Zod スキーマ・`lib/constants/` (制限値・エラー定数) | API 検証とエラーレスポンスで再利用 |
| Sentry プロジェクト | RN SDK を同一プロジェクトに追加 |

---

## 5. 既存リポジトリへの変更スコープ (必須工事)

| # | 工事 | 内容 | 影響範囲 |
|---|------|------|---------|
| 1 | API 共通基盤 | `app/api/v1/` 配下の Route Handler 共通層: Bearer トークン検証、Zod 検証、レート制限、統一エラーレスポンス規約。proxy.ts は `/api/*` を保護しないため **route 内で fail-closed に完結** | `app/api/v1/` (新規)、`lib/` に検証ヘルパー追加 |
| 2 | actions → services ロジック押し下げ | MVP スコープの Server Actions からビジネスロジックを `lib/services/` へ移動し、Action と API route の両方から呼べる形にリファクタ | `lib/actions/` (MVP 対象ファイル)、`lib/services/` (新規ファイル)、既存テスト |
| 3 | モバイル認証 | アクセストークン + リフレッシュトークン発行。`/api/v1/auth/login\|refresh\|logout` 新設。リフレッシュトークン用 Prisma テーブル追加。bcrypt 照合ロジックを services 層へ切り出し NextAuth Credentials と共用。Google OAuth は expo-auth-session → サーバーで ID トークン検証 | `prisma/schema.prisma` (テーブル追加 + マイグレーション)、`lib/auth.ts` 周辺、`app/api/v1/auth/` (新規) |
| 4 | Push 通知送信フック | `lib/services/notification-core` の `createNotification()` に Push 送信フックを組み込み。デバイストークン管理 (登録・失効) のテーブルと API | `lib/services/notification-core`、`prisma/schema.prisma`、`app/api/v1/devices/` (新規) |
| 5 | RevenueCat Webhook 受信 | IAP / Play Billing の購読イベントを受信し DB の購読状態を更新。署名検証・べき等性チェックを実装 | `app/api/webhooks/revenuecat/` (新規)、購読更新 services |
| 6 | OpenAPI 生成基盤 | Zod スキーマから OpenAPI スペックを生成し、CI でスペックを成果物化。モノレポ化を回避する代わりの契約基盤 | ビルド / CI 設定、スキーマ定義の配置規約 |

すべての工事は既存の CI ゲート (カバレッジ: branches 80%, functions/lines/statements 85%) を維持したままテストを伴って行う。

---

## 6. フェーズ別実施計画

MVP 合計: **8〜15 人月** (フル機能移植は 20 人月超のためスコープ外、「10. スコープ外」参照)。

### Phase 1: 基盤工事 — 1.5〜2.5 人月

| 項目 | 内容 |
|------|------|
| タスク | モバイル認証の設計・実装 (トークン発行・refresh・失効、Prisma テーブル追加)。API 共通基盤 (Bearer 検証・Zod・レート制限・エラーレスポンス規約)。OpenAPI 生成基盤の構築 |
| 成果物 | `/api/v1/auth/*` エンドポイント、API route 共通ヘルパー、OpenAPI スペック生成パイプライン |
| 工数 | 1.5〜2.5 人月 (OpenAPI 生成基盤はモノレポ化を回避する代わりに **+0.2〜0.3 人月** を含む) |
| 受け入れ基準 | login → アクセストークンで保護 API 呼び出し → refresh → logout の一連が結合テストで通る。不正トークン・期限切れ・レート超過が fail-closed で拒否される。OpenAPI スペックが CI で生成される |

### Phase 2: コア API 移植 — 2〜4 人月

| 項目 | 内容 |
|------|------|
| タスク | MVP スコープ (フィード・投稿 CRUD・コメント・いいね・フォロー・通知・プロフィール・検索) の Server Actions を services 層へ押し下げ、`app/api/v1/` で公開 |
| 成果物 | MVP 各機能の REST エンドポイント群 + OpenAPI スペック。押し下げ後も既存 Web の挙動は不変 |
| 工数 | 2〜4 人月 |
| 受け入れ基準 | 既存ユニット / E2E テストが全て green (Web 非破壊)。新設 API にカバレッジゲートを維持するユニットテストが揃う。全エンドポイントが認証・Zod・レート制限のチェックリストを満たす |

### Phase 3: モバイルアプリ実装 — 3〜6 人月

| 項目 | 内容 |
|------|------|
| タスク | Expo 雛形作成 (別リポジトリ)。和風デザイントークン (緑・茶・ベージュ系) の移植 — NativeWind 検討。実装順: 認証 → フィード → 投稿 (画像アップロードは既存 presigned URL フロー流用) → コメント・いいね → 通知 → プロフィール → 検索。Push 通知の受信・遷移 |
| 成果物 | MVP 機能が動作する Expo アプリ。OpenAPI 生成クライアントによる型安全な API 呼び出し。TanStack Query による無限スクロールフィード |
| 工数 | 3〜6 人月 |
| 受け入れ基準 | MVP 全フローが iOS / Android 実機で動作。トークンは expo-secure-store 保管。画像投稿が圧縮 → presigned URL → R2 の経路で成功。Push 通知タップで該当画面へ遷移 |

### Phase 4: 課金・ストア対応 — 1〜2 人月

| 項目 | 内容 |
|------|------|
| タスク | RevenueCat 導入 (react-native-purchases)、RevenueCat Webhook と DB 購読状態の統合。ストア申請準備 — **UGC アプリのため通報・ブロック機能のモバイル UI 露出が審査必須** (App Store Review Guideline 1.2 / 3.1.1 対応) |
| 成果物 | iOS IAP / Android Play Billing でのプレミアム購読フロー。通報・ブロックのモバイル UI。ストア掲載情報・プライバシーマニフェスト |
| 工数 | 1〜2 人月 |
| 受け入れ基準 | サンドボックス購入 → Webhook → DB 購読状態反映 → プレミアム機能解放の一連が通る。Web (Stripe) との購読状態が矛盾しない。審査要件チェックリスト完了 |

### Phase 5: QA・リリース — 0.5〜1 人月

| 項目 | 内容 |
|------|------|
| タスク | Maestro E2E 整備、実機テスト (iOS / Android 主要端末)、EAS Build → TestFlight / Play 内部テスト → 段階公開 |
| 成果物 | Maestro E2E スイート、リリースビルド、ストア公開 |
| 工数 | 0.5〜1 人月 |
| 受け入れ基準 | Maestro E2E が主要フローをカバーし green。TestFlight / 内部テストでクラッシュフリー率を確認。段階公開の監視体制 (Sentry) が稼働 |

---

## 7. 費用見積もり

### 7.1 初期開発費

| 項目 | 工数 | 金額 (単価 100 万円/人月) |
|------|------|--------------------------|
| Phase 1: 基盤工事 | 1.5〜2.5 人月 | 150〜250 万円 |
| Phase 2: コア API 移植 | 2〜4 人月 | 200〜400 万円 |
| Phase 3: モバイルアプリ実装 | 3〜6 人月 | 300〜600 万円 |
| Phase 4: 課金・ストア対応 | 1〜2 人月 | 100〜200 万円 |
| Phase 5: QA・リリース | 0.5〜1 人月 | 50〜100 万円 |
| **MVP 合計** | **8〜15 人月** | **800〜1,500 万円** |

参考: フル機能移植 (図鑑・農薬・分析等を含む) は **20 人月超**。

### 7.2 追加サービス費 (固定)

| 項目 | 費用 | 備考 |
|------|------|------|
| Apple Developer Program | $99/年 | 必須 |
| Google Play Console | $25 買い切り | 必須 |
| EAS | 無料枠あり、本格運用 $19〜99/月 | ローカルビルドで節約可 |
| FCM / APNs | 無料 | |
| RevenueCat | 月収益 $2,500 まで無料、以降収益の約 1% | |
| Apple / Google 手数料 | アプリ内購読収益の 15〜30% | Small Business Program (年商 $100 万以下) で 15% |

### 7.3 既存サービスのランニング増分

| 項目 | 増分 | 備考 |
|------|------|------|
| fly.io スケール | +$5〜30/月 | モバイルトラフィック増対応 |
| Sentry クォータ増 | +$26/月〜 | RN SDK 追加分 |
| Supabase / Upstash / R2 | 当面既存プラン内 | |

**ランニング増分は月数千円〜2 万円程度。支配的コストは開発工数である。**

---

## 8. 課金アーキテクチャ

### 8.1 制約: Apple IAP 必須

Apple App Store Review Guideline 3.1.1 により、プレミアム購読などデジタル機能のアプリ内販売は **IAP 必須**であり、Stripe 決済をアプリ内に出すことはできない。手数料は 15% (Small Business Program、年商 $100 万以下) 〜 30%。

### 8.2 三重管理の統合方針

結果として購読経路は Web=Stripe / iOS=IAP / Android=Play Billing の三重管理となる。これを RevenueCat で吸収する。

```
Web ブラウザ ── Stripe Checkout ──→ Stripe Webhook ──┐
                                                     │     ┌──────────────────┐
iOS アプリ ──── IAP ──────┐                           ├───→ │ DB の購読状態      │
                          ├─→ RevenueCat ─ Webhook ──┘     │ (単一の真実)       │
Android アプリ ─ Play Billing ┘                             └────────┬─────────┘
                                                                    │
                                              Web / モバイル両方がここを参照して
                                              プレミアム機能を解放
```

- **DB の購読状態を単一の真実 (single source of truth) とする**
- Stripe Webhook (既存) と RevenueCat Webhook (新設) の**両方から同じ購読状態を更新**する
- 両 Webhook とも署名検証 + べき等性チェックを実装 (既存 Stripe Webhook の規約に準拠)
- アプリ・Web のプレミアム判定は購入経路を問わず DB の購読状態のみを見る

---

## 9. リスクと対策

| # | リスク | 影響 | 対策 |
|---|--------|------|------|
| 1 | API の破壊的変更とモバイル対応の同期ずれ | 旧バージョンのアプリが動作不能になる | **OpenAPI スペックのバージョニング** (`/api/v1` の URL バージョン + スペック差分の CI 検出) で緩和。破壊的変更は v2 として並行提供 |
| 2 | `revalidatePath` はモバイルに効かない | Web では即時反映される更新がアプリで反映されない | モバイル側で **TanStack Query の `invalidateQueries` 設計**を最初から行う (ミューテーション → 関連クエリキー無効化の対応表を Phase 3 で整備) |
| 3 | アプリにハードコードする API URL は審査後に変更しにくい | DNS / ホスティング変更時にアプリの強制アップデートが必要になる | DNS カットオーバー (fly.io 移行) は**完了済み** (2026-06-11 ヘッダ検証で確認)。API ベース URL は https://www.bon-log.com を前提に固定できる |
| 4 | 全機能移植を狙うと頓挫 | リリース不能・予算超過 | **SNS コアに絞った段階リリース** (MVP スコープを厳守し、図鑑・農薬等は後続リリースへ) |

---

## 10. スコープ外・将来検討事項

以下は MVP に含めない。後続リリースまたは WebView ハイブリッドでの提供を検討する。

- 盆栽図鑑 (dictionary)
- 農薬・肥料・ホルモンのデータベース機能 (pesticides / fertilizers / hormones)
- 分析 (analytics)
- 管理者ダッシュボード (admin)
- ショップ・イベント (shops / events)
- その他、SNS コア (フィード・投稿・コメント・いいね・フォロー・通知・プロフィール・検索) 以外の全機能

フル機能移植は 20 人月超と見積もられるため、MVP の市場反応を見てから優先順位を決定する。

---

## 11. 未決事項

| # | 事項 | 内容 | 期限の目安 |
|---|------|------|-----------|
| 1 | DNS カットオーバー | **解決済み** — www.bon-log.com は fly.io から配信済み (2026-06-11 ヘッダ検証で確認)。API ベース URL は https://www.bon-log.com を前提にできる | 解決済み |
| 2 | MVP 機能の最終確定 | 本計画の MVP スコープ (フィード・投稿 CRUD・コメント・いいね・フォロー・通知・プロフィール・検索) を確定とするか、追加・削減があるかの最終判断 | Phase 2 着手前 |
| 3 | デザインガイドラインのモバイル適用方針 | 和風・落ち着いた色調 (緑・茶・ベージュ系) のデザイントークンをモバイルにどう移植するか。NativeWind 採用可否、ボトムナビ構成、Web の 3 カラムレイアウトとの整合 | Phase 3 着手前 |
