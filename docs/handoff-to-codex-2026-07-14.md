# Bon_Log_Native → Codex 引き継ぎ（2026-07-14）

## 0. 目的

Codex がこのリポジトリの開発を引き継ぐための現況・規約・残タスク・公開ロードマップを1本にまとめた総括ドキュメント。本書のみで自己完結する（会話履歴の参照は不要）。

## 1. プロジェクト概要

盆栽SNS Bon_Log のモバイルアプリ（Expo React Native / TypeScript strict / Expo Router / TanStack Query）。サーバー・DB は別リポジトリ Bon_Log_cfw（Next.js 16 / Prisma 6 / Supabase PostgreSQL）が正本であり、アプリは REST `/api/v1/*` 経由でのみアクセスする。**Bon_Log_cfw は読み取り専用（コード変更禁止）**。リリースは Android（Google Play）先行、iOS は当面リリースしないが互換は維持する。方針は「Web 版の全機能を Web 準拠で実装しきってから公開」。詳細は `CLAUDE.md`・`.claude/rules/`・`docs/plans/react-native-mobile-app-plan-2026-06-11.md` を正とする。

## 2. 開発体制（PM-orchestrator 分業）

このリポジトリの実装は PM-orchestrator によるエージェント分業で進めてきた: designer（`docs/design/`）/ frontend（`app/`・`components/`・`hooks/`）/ core（`lib/`・`types/`）/ tester（`__tests__/`・`.maestro/`）/ evaluator（受け入れ判定に専念し、Write は行わない）。各エージェントは会話履歴を参照できないため、依頼は常に自己完結・I/F 明示で行う。複数エージェントが並行作業する場合は `git pull --rebase --autostash` で衝突を吸収する。セッション上限や一時的なツールエラーで作業が中断した場合は、同じ依頼を冪等に再投入すればよい設計にしてある。

## 3. 絶対規約（要点）

- DB 直接アクセス禁止。API は OpenAPI 生成クライアント（`lib/api/generated/`）経由のみ（手書き fetch 禁止。例外は R2 presigned PUT のみ）
- `npm run generate:api` でスキーマ再生成（`../Bon_Log_cfw/openapi/openapi.json` をローカルの sibling パスとして直接読み込む構成。`scripts/generate-api.mjs`）。生成差分は必ず破壊的変更の有無をレビューする
- トークンは **expo-secure-store のみ**（AsyncStorage へのトークン保存は禁止。トークン以外の非秘匿データ、例えば検索履歴文字列は AsyncStorage 可 — `docs/design/search-screen.md` §4.2 参照）
- リスト取得はカーソルベースページネーション。ミューテーション追加時は `lib/queries/invalidation-map.md` の対応表を必ず更新
- エラー文言は `lib/constants/errors.ts`、制限値・ルートは `lib/constants/` 配下の定数を使用（インライン禁止）
- **`any` / `as` キャスト禁止**。型ガードか Zod で絞り込む。strict mode 維持
- 新機能・修正にはテストを伴う（カバレッジ閾値 branches 80% / functions 85% / lines 85% / statements 85%）
- 変更は都度 commit・push する

## 4. 現在の状態

2026-07-14 時点で以下を実測済み。

- ブランチ: `main`（`origin/main` と同期済み・up to date）
- 最新コミット: `ae0e9053feaefa03c1ec2d5223a6cabec3d26a32`（`refactor: onEndReachedThresholdを定数化しQRコメントを実態に修正`、2026-07-14 06:51:53 +0900）
- 作業ツリー: クリーン（`git status --short` 出力なし。未コミット・未追跡ファイルなし）
- `npx tsc --noEmit`: エラー **0**
- `npm run lint`: エラー **0** / 警告 **145**（すべて `__tests__/` 配下のモック記述に起因する `no-require-imports` / `no-unused-vars` 警告、および `app/hormones/simulator/index.tsx` 等 3 箇所の `Array<T>` 記法警告。lint はエラー 0 のためゲート上は通過しているが、警告ゼロ化は未達）
- `npm test`: **Test Suites 343 passed / 343**、**Tests 5753 passed / 5753**（実行時間 約28秒）
- `npm run test:coverage`: 同一の 343 suites / 5753 tests が全 pass。カバレッジ **Statements 91.26% / Branches 83.78% / Functions 87.28% / Lines 92.21%**（閾値 branches80 / functions85 / lines85 / statements85 をすべて超過。コマンドの exit code 0、閾値未達エラーなし）

型チェック・lint（エラー0件）・テスト・カバレッジゲートはすべて緑。ただし lint 警告 145 件（大半はテストファイルの `require()` モック由来）が残っており、ゼロ化はしていない。

## 5. 直近セッションで完了した主なバッチ

`git log --oneline` から遡って判別できる直近バッチ（各バッチは複数コミットに分かれ、実装 → テスト追従 → 設計書追従の順で構成されている。開発体制どおり評価者（evaluator）のクリーン PASS 判定を経てから push する運用で進めてきた）:

1. **フォームの Web/サーバー是正**（`ad160f6`〜`a9aee37`）: 地図 ready 信号の多重化（WebView 橋障害回避）、日時ネイティブピッカー導入、居住地・樹種の統制入力化、盆栽園/イベントフォームを Web とサーバーの正に一致、コメントメディア添付と送信条件・上限・記録編集の読込修正、検証文言と制限値の定数参照化。
2. **残 Web 乖離の是正**（`d6f7aee`〜`0f30f25`）: 通知設定の説明文コピー定数追加とラベルの Web 表記整合、bio カウンタの Web 準拠2状態化、手入れログのオフラインガード、エラー色の `colorError` トークン化。
3. **ストア公開ブロッカー解消**（`df1c398`〜`cc8cb03`）: 通報対象を投稿・コメント・ユーザーに加えイベント・盆栽園・レビューへ拡張（6種）し、理由ラベルを Web 整合、全 UGC 面にアプリ内通報導線を設置。
4. **バックログ消化**（`1ea9956`〜`46cbacd`）: 2FA QR をラスタ GIF data URI 化（Android 描画修正）、検索の「最近の検索」機能実装、盆栽ケア種別の型ガード追加、docs 陳腐化注記の掃除。
5. **ジャンル2階層化＋投稿の盆栽紐付け**（`3ac95fe`〜`1788f0f`）: cfw 側で `GET /api/v1/genres` に `category` が追加されたのを受け、`generate:api` で取込みクエリ層を対応させ、`GenreSelector` を Web 準拠の「カテゴリ→個別ジャンル」2階層 UI に作り直し（投稿編集の初期値不整合も是正）。投稿の `bonsaiId` 紐付けを Web 準拠（新規投稿時のみ）で実装。
6. 直近の小規模リファクタ（`ae0e905`、HEAD）: `BonsaiSelector.tsx` の `onEndReachedThreshold` を定数化、`TwoFactorEnableSection.tsx` の QR 生成方式（GIF data URI）についての陳腐化したコメント（旧 SVG 記述）を実態に修正。

## 6. cfw 連携状態

**消化済み**（cfw 側で対応完了・Native 側は反映済みまたは反映可能な状態）:

- browse-parity（`docs/plans/handoff-to-cfw-browse-parity-endpoints-2026-07-02.md` → `handback-from-cfw-browse-parity-2026-07-03.md`）
- parity-followups #1〜#9（`docs/plans/handoff-to-cfw-parity-followups-2026-07-04.md`。#1〜#5 は 1.29.0 で解決、#6・#8・#9 は `handback-from-cfw-parity-followups-part2-2026-07-04.md` で解決、#7 は下記の別トラックへ）
- パスワード / メールアドレス変更（#7。`reply-to-cfw-7-email-password-change-2026-07-04.md` → Phase1: `handback-from-cfw-7-password-change-phase1-2026-07-04.md` → Phase2: `handback-from-cfw-7-email-change-phase2-2026-07-04.md`）
- Phase2（メール変更）の本番 DB migration 適用（`handback-from-cfw-email-change-migration-applied-2026-07-05.md`。`20260704000000_add_email_change_tokens` を本番 Supabase に適用済み）
- audit-followups 7件（コメントいいね／コメント返信一覧／フォロワー・フォロー中一覧／いいねした投稿一覧／病害虫 `effectsCount`／住所ジオコーディング／`editedAt`）とカーソルページネーションバグ（イベント一覧の `orderBy` 複合キーに対しカーソルが `id` 単独だった不整合。横展開監査で `listReviewsV1`・`listShopsV1`・`fulltextSearchUsers`・`listConversations` も同時修正）は同一の完了報告書 `docs/plans/handoff-from-cfw-audit-followups-done-2026-07-05.md` にまとまっている（OpenAPI 1.36.0、コミット `d3cca51b` / `f5cffe72`）
- genre category（`GET /api/v1/genres` に `category` 追加）＋投稿 `bonsaiId`（Create/Update/Response、所有権検証つき）＋日時制約の description 明文化（`docs/plans/handoff-to-cfw-genre-category-and-bonsai-id-2026-07-05.md` → `reply-from-cfw-genre-category-and-bonsai-id-2026-07-13.md`。項目1〜3すべて完了、型チェック/lint/テスト/カバレッジ/ビルド通過・Web非影響確認済み）。関連する Web 側 `bonsaiId` 所有権検証（IDOR）是正も `followup-from-cfw-web-bonsai-idor-fix-2026-07-13.md` でクローズ済み（Native 側の追加対応は不要）

**未処理（relay 待ち。`docs/plans/` はローカル調整用であり cfw リポジトリの正本ではない）**:

1. **`isBlockedByUser` を `UserProfileResponse` に追加**（`docs/plans/handoff-to-cfw-genre-category-and-bonsai-id-2026-07-05.md` 末尾「追加依頼4」、追記日 2026-07-13）。2026-07-13 付けの cfw 回答書（`reply-from-cfw-genre-category-and-bonsai-id-2026-07-13.md`）は項目1〜3（genre category / bonsaiId / 日時制約）のみに回答しており、この追加依頼4には触れていない。実際に `lib/api/generated/schema.d.ts` を grep しても `isBlockedByUser` は存在せず、**未反映であることを確認済み**。Web は相手からブロックされている場合に専用の全画面表示へ切り替えるが、Native はこの状態を検出できないままになっている。
2. **検索の複数ジャンルフィルタ**: `GET /api/v1/search/posts` の `genreId` は単一文字列のみ（`lib/api/generated/schema.d.ts:2746` `genreId?: string`）。Native の `components/search/PostSearchFilterPanel.tsx` もこれに合わせて単一選択（`localGenreId: string`）で実装済み。一方 Web の投稿検索（`Bon_Log_cfw/app/(main)/search/page.tsx:37-38,68`）は `genre` パラメータを配列で受け取り複数ジャンル＋カテゴリ分類の `GenreFilter` を提供している。この差分についての**依頼書はまだ作成していない**ため、Codex が起票する必要がある。

## 7. 残タスク（優先度順。今回の Web 準拠監査〈検索・DM・ブックマーク・分析・発見〉の結果を反映）

### A 高

**DM 送信失敗ハンドリング**（frontend、エラー定数の追加が要れば core も）。

`app/messages/[conversationId]/index.tsx` の `handleSend`（253〜258行目）は、`sendMutation.mutate` を呼ぶ**前**に `setInputText('')`（256行目）で入力欄を即クリアしており、送信の成否を待たずに入力内容を消してしまう。`lib/queries/messages.ts` の `useSendMessageMutation`（190〜217行目）には `onSuccess`（208〜214行目）のみ定義されており `onError` が無く、呼び出し側コンポーネントも `sendMutation.isError` / `sendMutation.error` を一切参照していない（`sendMutation` の使用箇所は `.isPending` と `.mutate` のみ）。そのため 429（送信レート `send_message` 系。1分あたりの上限あり）・400（日次送信上限 100 通。`lib/queries/messages.ts` の JSDoc コメントにも記載あり）・403（会話開始後に相手からブロックされた場合。NOT_FOUND として存在秘匿）・オフラインのいずれで送信が失敗しても、**ユーザーには何も表示されず、入力した文章だけが消える**。

対比として cfw 側 `components/message/MessageForm.tsx` の `handleSubmit`（30〜47行目）は `sendMessage` の結果が失敗（`!result.success`）なら `setError` でエラー文言を表示して早期 return し（39〜42行目）、`setContent('')` による入力クリアは成功パスのみ（44行目）で行っている。

修正方針: 成功時のみ入力をクリアする／`onError` で `isApiError` 判別してコード別のエラー文言（`lib/constants/errors.ts` に追加が必要な場合あり）を表示する／再試行導線を用意する。`.claude/rules/error-handling.md` の「ローディング / 空 / エラー / オフライン」4状態原則に準拠させる。

### B 中（サーバー対応後に着手）

- 検索の複数ジャンル＋カテゴリ分類（cfw 側の API 拡張後、frontend で `PostSearchFilterPanel` を複数選択・カテゴリ見出し表示に変更）
- `isBlockedByUser` の全画面表示への反映（cfw → `generate:api` → frontend でユーザープロフィール画面に専用エラー表示を追加）

### C 低

- **検索タグタブの人気タグへの到達性**（frontend）。Web（`Bon_Log_cfw/app/(main)/search/page.tsx:64`）は `SearchTabs` を常時（クエリの有無に関わらず）描画しており、未入力のままタグタブを開くと人気タグ（`!query && tab === 'tags' && <PopularTags .../>`、93行目）に到達できる。一方 Native の `app/(tabs)/search/index.tsx` は `showInitialView`（508行目、`inputValue` と `debouncedQuery` が両方空かつジャンルフィルタなしで真）の間は `SearchSegmentTabs` 自体を描画しない（536〜590行目）ため、何か入力しない限りタグタブへ到達できない。なお `components/search/HashtagSearchResults.tsx` 自体は「クエリが空なら人気タグ上位10件を表示する」ロジック（139〜190行目）を Web の `PopularTags` 準拠で実装済みであり、**問題はタブへの到達性のみ**（タグタブの中身は未入力表示に対応済み）。
- `lib/queries/analytics.ts:28-30` の `toAnalyticsDays` が `String(period) as AnalyticsDays` という `as` キャストを使っている（`AnalyticsPeriod = 7 | 30 | 90`、`AnalyticsDays = '7' | '30' | '90'`。`lib/queries/keys.ts:351,357`）。値は3種類のみで実害はないが、CLAUDE.md 核心ルール8（`any` / `as` 禁止）には反するため、`Record<AnalyticsPeriod, AnalyticsDays>` 等のルックアップ表に置き換えるべき。
- doc 陳腐化2件:
  - `docs/design/search-screen.md`: §1・§16 は「MVP スコープで投稿/ユーザーの2タブに絞る（タグ検索は将来検討）」と記述しているが、実装（`app/(tabs)/search/index.tsx:76` の `{ key: 'tags', label: 'タグ' }`、および `components/search/HashtagSearchResults.tsx`）はすでに投稿/ユーザー/タグの3タブ構成になっている。
  - `docs/design/design-tokens.md:102` は `colorTextPrimary` を `#1a1a1a` と記載しているが、実装 `lib/constants/design-tokens.ts:59` は `#060606` になっている（他の値、例えば `colorBackground` の `#ffffff` は一致しており、ドリフトは一部の値に限られる可能性がある。全項目の突合は未実施）。
- テスト網羅の追加余地: `PostComposer` の一部分岐、`lib/utils/qr-code.ts` の異常系（`test:coverage` の関数別内訳では `qr-code.ts` は Branches 50% と低め。ただしグローバル閾値〈branches80等〉自体はリポジトリ全体で達成済み）。
- `docs/design/post-composer.md:880`（§16）: 「PATCH エンドポイントの差分更新方式 — `bonsaiId` を除く項目（部分更新か全件置き換えか）によってリクエスト設計が変わる。`bonsaiId` 自体は部分更新契約であることを確認済み」と記載されたまま `core（要確認）` 扱いで残っている。本書ではこの点の実装調査は行っていない（未確認のまま引き継ぐ）。

### D 実機QA（次ビルドで要確認。静的コードレビューでは検証しきれない項目）

- 2FA QR（Android 実機での GIF data URI 描画）
- 盆栽園マップ（Leaflet 同梱・3経路信号多重化で `ERR_TIMEOUT` 対策済みとされているが実機確認は未実施）
- 植物ホルモン相互作用ダイアグラムの線描画
- 投稿カードの墨枠内写真表示
- ジャンル2階層 UI（カテゴリ→個別ジャンルのチップ選択）の実機操作感

## 8. 公開までの道筋

1. 残 Web 準拠差分の消化（§7-A の DM 送信失敗ハンドリング、§7-B のサーバー対応待ち2件、§7-C の低優先度群）
2. 実機QA（§7-D）で回帰確認
3. ストア審査要件（`.claude/rules/store-compliance.md`）の充足確認:
   - 通報・ブロックのアプリ内露出 — 完了（`components/report/ReportDialog.tsx` が投稿・コメント・ユーザー・イベント・盆栽園・レビューの6種UGCから呼び出し可能な状態まで実装済み。§5 バッチ3参照）
   - アカウント削除導線 — 実装済み（`app/settings/account/index.tsx`）。ただし Play Console 側のデータ削除手段の申告は本リポジトリ外の作業として別途必要
   - 外部決済（Stripe 等）への誘導なし — 本セッションでの再確認は未実施。billing.md の規約は遵守する前提で実装されている
   - データセーフティ申告（Sentry・RevenueCat 等の実収集内容との一致）— 未実施。Play Console 側の作業
   - 審査用デモアカウントの準備 — 未確認
   - サンドボックス購入 → RevenueCat Webhook → DB 反映 → プレミアム機能解放の疎通確認 — 未確認
4. EAS Build（production）→ Play 内部テスト → submit（計画書 Phase 5）
5. 本番設定の確認: 環境変数（`EXPO_PUBLIC_*` は公開情報のみで秘密鍵を含まないこと）・EAS Secrets・RevenueCat ANDROID キー・Push（FCM）・Sentry の release 紐付け

## 9. Codex への作業手順

- 分業を踏襲するなら PM-orchestrator 経由で各エージェントへ委譲する。直接作業する場合も `CLAUDE.md` と `.claude/rules/` を厳守すること。
- **Bon_Log_cfw は絶対に編集しない**。読み取りと `npm run generate:api` によるスキーマ取込みのみ許可。サーバー側の変更が必要な場合は `docs/plans/handoff-to-cfw-*.md` 形式で依頼書を作成し、file:line 引用で裏取りしたうえで引き継ぐ（本書 §6 の未処理2件を参照。特に検索の複数ジャンルフィルタは依頼書が未作成）。
- 変更は都度 commit・push する。並行作業時は `git pull --rebase --autostash` で自分の変更を保持したまま最新化する。
- 新機能・修正には必ずテストを伴わせ、カバレッジ閾値（branches 80% / functions 85% / lines 85% / statements 85%）を割らないこと。現状値（§4）を下回らせないことを最低ラインとする。
- 監査・調査を行う際は本書と同様に **file:line の引用義務**を課し、import グラフを辿って本番導線から実際に使われているかを裏取りすること（デッドコード・未使用コンポーネントを本番実装と誤認しないため。過去に `PostForm.tsx` を本番と誤認した事故がある）。

## 10. Codex 継続作業の反映（2026-07-14）

本節は §4・§6・§7 の基準時点より後に実施した作業結果であり、重複する残タスクの状態について本節を優先する。

**完了:**

- DM 送信は成功時だけ送信済み本文を消去し、送信待機中の追加入力を保持するようにした。オフラインでは通信せず、429・日次上限・送信不能・サーバー／ネットワーク失敗を定数化した文言で表示し、本文を保持したまま再試行できる。文字数上限 1,000 と日次上限 100 も共通定数へ移した
- 検索の投稿・ユーザー・タグタブを未入力時から常時表示し、空のタグタブで人気タグへ到達できるようにした。投稿・ユーザーの初期案内、最近の検索、ジャンルフィルタ適用中の投稿表示は維持した
- `lib/queries/analytics.ts` の禁止されていた `as` キャストを `Record<AnalyticsPeriod, AnalyticsDays>` の変換表へ置換した
- `docs/design/design-tokens.md` を `lib/constants/design-tokens.ts` の現行値と全項目監査し、色・フォント・コントラスト・直接比較不能範囲を同期した
- 投稿 PATCH は `content / genreIds / mediaUrls / mediaTypes` が現在値による全差し替え、`bonsaiId` のみ省略可能な部分更新というハイブリッド契約であることを Native 生成型・query・composer と cfw 実装の読み取り調査で確定し、`docs/design/post-composer.md` へ反映した
- QR 生成の正常系・容量超過・依存ライブラリ想定外形式を単体テスト化した。`PostComposer` は API エラー変換、アップロード失敗、オフライン、iOS／Android キャンセル、既存／ローカルメディア混在を補強し、対象ファイルのカバレッジを Statements 95.91% / Branches 94.94% / Functions 86.66% / Lines 97.67% まで引き上げた
- `CLAUDE.md` の「実装前」と当初 MVP 除外範囲を、実装済み・公開前 Web 準拠／実機 QA／ストア準備段階という現状へ是正した

**cfw relay 待ち:**

- 検索の複数ジャンル対応は、後方互換な `genreIds?: string[]` と既存 `genreId` の併存・和集合・OR 検索を要望する独立依頼書 `docs/plans/handoff-to-cfw-search-multiple-genres-2026-07-14.md` を作成済み
- `UserProfileResponse.isBlockedByUser` は、共有 `BlockMuteState` を3値化して投稿レスポンスへ未定義 field を漏らさないよう、プロフィール専用 reverse resolver と fail-closed を要望する独立依頼書 `docs/plans/handoff-to-cfw-user-profile-is-blocked-by-user-2026-07-14.md` を作成済み
- `docs/plans/` は `.gitignore` 対象のローカル連携領域である。cfw は引き続き読み取り専用で、今回の作業でも変更していない。各 handback と更新 OpenAPI を受領後に `npm run generate:api` と Native UI 対応を行う

**2026-07-14 再検証:**

- `npx tsc --noEmit`: 成功
- `npm run lint`: エラー 0 / 既存警告 143（§4 の 145 から 2 減。変更ファイルの新規警告なし）
- `npm test`: 344 suites / 5,791 tests 全成功
- `npm run test:coverage`: 344 suites / 5,791 tests 全成功。Statements 91.60% / Branches 84.29% / Functions 87.46% / Lines 92.47%
- `git diff --check`: 問題なし

**引き続き未完了:** cfw 2件の実装・handback と Native 取込み、§7-D の実機 QA、§8 の Play Console／課金疎通／production build・内部テスト・submit は、外部状態または実機・ストア権限を要するため残る。
