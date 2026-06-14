# Bon_Log_Native → Bon_Log_cfw: フォロー状態フィールド追加の依頼（2026-06-14）

作成日: 2026-06-14
作成者: Bon_Log_Native PM
宛先: Bon_Log_cfw 開発担当
前提: 読み手は本ドキュメントのみで文脈を把握できる自己完結構成とした。
要旨: モバイルのフォローボタン実装に必要な「閲覧者から見たフォロー関係」フィールドが現行 API に無いため追加を依頼する。契約の正本は `Bon_Log_cfw/openapi/openapi.json`。

---

## 1. 背景（なぜ必要か）

**いいねボタン**は本結線が完了している。`isLiked` が feed / posts / search の各レスポンスに含まれているため、画面を開いた時点の初期表示が正しく、楽観更新フローも問題なく実装できた。

**フォローボタン**は `docs/design/follow-and-engagement.md` に仕様を確定済みで実装待ちの状態だが、現行 API の問題により着手を見送っている。

問題の核心は「画面を開いた時点の初期状態が取れない」点にある。

- `GET /api/v1/users/{id}`（`UserProfileResponse`）には `isPublic` は存在するが、`following`・`requested` が無い。
- `GET /api/v1/search/users`（`SearchUsersResponse.items[]`）には `following`・`requested`・`isPublic` のいずれも存在しない。

その結果、**プロフィール画面・検索画面を開いた直後は、既にフォロー中の相手に対しても「フォロー」と誤表示してしまう**。

フォロー操作 API（`POST /DELETE /api/v1/users/{id}/follow` → `FollowResponse { following, requested, followerCount }`）は実装済みで、操作後の状態は取得できる。不足しているのは「画面を開いた時点の初期値」のみである。

---

## 2. 依頼内容（API 追加）

後方互換の項目追加（minor bump 想定 / semver 運用継続）。

| 対象エンドポイント | 追加フィールド | 型 | 意味 |
|---|---|---|---|
| `GET /api/v1/users/{id}`（`UserProfileResponse`） | `following` | boolean | 閲覧者が対象をフォロー確立済みか |
| 同上 | `requested` | boolean | 閲覧者が対象（非公開）へフォローリクエスト送信中か |
| 同上 | `isSelf` | boolean（任意） | 対象が閲覧者自身か。無くてもアプリ側で `currentUserId` と比較可能だが、あると確実 |
| `GET /api/v1/search/users`（`SearchUsersResponse.items[]`） | `following` | boolean | 同上 |
| 同上 | `requested` | boolean | 同上 |
| 同上 | `isPublic` | boolean | 対象が公開アカウントか（検索結果には現状無い。コンパクトなフォローボタンの挙動分岐に必要） |

**補足事項:**

- `following` と `requested` は同時に `true` にならない（既存 `FollowResponse` と同じ不変条件）。
- 未認証（ゲスト）アクセス時の値は `false` 固定でよい。
- ブロック関係で 404 を返す既存挙動は維持する。

---

## 3. 受け入れ確認（こちらの結合テスト観点）

追加後に以下のシナリオで結合テストを実施する。

- 公開アカウントを既にフォロー済みの状態でプロフィールを取得 → `following: true, requested: false`。
- 非公開アカウントへフォローリクエストを送信中の状態でプロフィールを取得 → `following: false, requested: true`。
- まだフォローしていない相手のプロフィールを取得 → `following: false, requested: false`。
- 検索結果の各 `item` に上記と同等の値が含まれる。

---

## 4. 完了時のお願い

OpenAPI スペック（`openapi.json`）を更新し、バージョンを上げて（後方互換追加のため minor、例: v1.3.0 → v1.4.0）連絡してほしい。こちらは `npm run generate:api` で型を再生成して結線する。

---

## 5. あわせて確認したい既存の保留事項（リマインド）

以下は既存連絡の再掲であり、新規依頼ではない。

- **本番反映:** 本番の `/api/v1/*` は `MOBILE_JWT_SECRET` 未設定・DB マイグレーション未適用のため 503 のまま。Native 側の本番接続および実機配布前に有効化が必要（詳細は `docs/plans/cfw-local-test-env-fixed-2026-06-14.md` 参照）。なお現状の結合テストはローカル cfw（localhost:3000）で実施している。
- **Google 認証:** `docs/plans/request-cfw-google-auth-2026-06-14.md` の Q1〜Q5（`GOOGLE_CLIENT_ID` の種別確認・Android クライアント ID の要否・nonce 方針・複数 audience 方針・ローカルのリダイレクト URI）が未回答。
- **ディープリンク:** assetlinks 用の署名証明書フィンガープリント（SHA-256）と `/verify-email` の扱いは `docs/plans/cfw-to-native-summary-2026-06-13.md` §6 参照。確定次第連絡する。

---

質問・確定事項の返答は引き続きユーザー経由で連絡してほしい。

以上。
