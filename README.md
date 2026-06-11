# Bon_Log Native

盆栽SNS「[Bon_Log](https://www.bon-log.com)」のスマホネイティブアプリ (iOS / Android)。
React Native (Expo) で開発し、DB・サーバーは Web リポジトリ **Bon_Log_cfw** (Next.js 16) を共有する。
アプリからのデータアクセスはすべてサーバーの REST API (`/api/v1/*`) 経由。

## 現状

**実装前。** このリポジトリには開発規約・エージェント設定のみが存在する。

## ドキュメント

| ドキュメント | 内容 |
|-------------|------|
| `docs/plans/react-native-mobile-app-plan-2026-06-11.md` | 開発計画書（アーキテクチャ決定・フェーズ・スコープの正本） |
| `CLAUDE.md` | 開発規約の入口（Claude Code 用。人間にも有用） |
| `.claude/rules/` | 機能別の詳細ルール（14ファイル） |
| `AGENTS.md` | Codex 用の薄い入口（正本は CLAUDE.md に委譲） |
| `docs/rules-migration-map.md` | Web リポジトリからのルール移植対応表 |

## セットアップ

`.claude/rules/setup-dev.md` を参照。
