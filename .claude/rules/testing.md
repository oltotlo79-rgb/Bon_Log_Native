---
globs: "__tests__/**/*.ts, __tests__/**/*.tsx, .maestro/**/*.yaml, jest.config.*, jest.setup.*"
---

# テストルール

## コマンド

```bash
npm test                # ユニットテスト（Jest + jest-expo）
npm run test:coverage   # カバレッジ付き
npm run test:e2e        # E2E（Maestro: maestro test .maestro/）
```

## 構成

| ディレクトリ | ツール | 内容 |
|------------|--------|------|
| `__tests__/` | Jest (jest-expo) + React Native Testing Library | ユニット・コンポーネントテスト（src 構成をミラー） |
| `.maestro/` | Maestro | E2E フロー（計画書 Phase 5 で CI 整備） |

## カバレッジ閾値（Web と同一ゲートを維持）

| 項目 | 閾値 |
|------|------|
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |
| Statements | 85% |

## テスト必須ルール

- **新機能・バグ修正にはテストを伴う** — コードだけ書いてテストなしは NG
- 既存テストが壊れた場合は根本原因を修正する（テストをスキップ・削除しない）
- 正常系だけでなく網羅する: 未認証（401 → refresh 経路）/ 入力不正（400）/ レート制限（429）/ オフライン / 空状態 / 境界値

## ユニットテストパターン

- **モック境界は `lib/api/`**（生成クライアント / ラッパー）。UI・クエリフックのテストでネットワークに出ない
- TanStack Query: テストごとに新しい QueryClient（`retry: false`）。Provider 込みの共通 wrapper を `__tests__/utils/test-utils.tsx` に用意する（Web の test-utils 慣習を踏襲）
- モックデータ・API モックのファクトリは `__tests__/utils/` に集約（Web の `createMockPrismaClient` に相当する役割は API クライアントモック）
- ネイティブモジュール（expo-secure-store, expo-notifications, react-native-purchases 等）は jest セットアップで一元モック。テストファイルごとの ad-hoc モックを散在させない

## コンポーネントテスト

- @testing-library/react-native でユーザー視点（見える・押せる）で書く
- 要素取得は role / text ベースを優先。`testID` は E2E 用の規約（下記）に限る

## Maestro E2E

- フローは `.maestro/` 配下。主要フロー（ログイン → フィード → 投稿 → いいね → 通知）をカバーする
- locator が不安定な箇所（動的リスト項目等）のみ `testID` を付与する。命名は `{feature}-{element}` 形式で統一
- クリック → 遷移の検証は遷移完了をアサーションで待つ（Web の `clickAndWaitForUrl` と同じ思想。タイミング依存の flake を作らない）
