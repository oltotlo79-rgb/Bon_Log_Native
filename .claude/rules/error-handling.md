---
globs: "app/**/*.tsx, components/**/*.tsx, lib/**/*.ts"
---

# エラーハンドリングルール

## エラー境界

- 共通エラー画面コンポーネント（`components/common/ScreenError` — Web の `PageError` 相当）を用意し、全境界で使い回す
- Expo Router の `ErrorBoundary` export を画面単位で活用し、上位境界が下位の取りこぼしを処理する階層にする
- `ScreenError` は自動的に Sentry へ送信し、再試行（reset / refetch）導線を持つ

## Sentry (@sentry/react-native)

- 既存 Sentry プロジェクトに RN SDK を追加する（計画書 4.1）
- 初期化はアプリエントリで 1 回。release / dist を EAS ビルドと紐付ける
- **トークン・個人情報を event / breadcrumb に含めない**（beforeSend でスクラブ）
- 予期されるエラー（入力バリデーション・ユーザーキャンセル・オフライン）は送信しない。送るのは想定外のみ

## ネットワークエラー

- `lib/api/` ラッパーが非 2xx を型付きエラーへ変換する（`api-client.md`）
- TanStack Query のリトライ既定を QueryClient に設定する: **4xx はリトライしない / ネットワークエラー・5xx は限定回数**（回数は定数）
- 429: 自動リトライしない。ユーザー向けメッセージ（定数）+ 手動再試行
- オフライン: NetInfo で検知してバナー表示。`onlineManager` 連携で復帰時に自動 refetch（`data-fetching.md`）

## UI 上の原則

- ユーザー向けエラーメッセージは `lib/constants/errors.ts` の定数（インライン文字列禁止）
- すべての画面は **ローディング / 空 / エラー / オフライン** の 4 状態を持つ（designer 仕様に含める）
- catch して握りつぶさない。その場で処理できないエラーは再 throw して境界へ届ける
