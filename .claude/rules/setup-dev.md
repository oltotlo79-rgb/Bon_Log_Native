---
globs: "package.json, app.json, app.config.*, eas.json"
---

# 開発環境セットアップ

## 前提

- Node.js LTS / npm
- EAS CLI（ビルド・提出時）
- iOS: Xcode + シミュレータ / Android: Android Studio + エミュレータ
- Push 通知・RevenueCat は Expo Go では動かないため、**development build を基本とする**

## 手順

```bash
cp .env.local.example .env.local   # 値を記入
npm install
npx expo run:ios                   # または npx expo run:android（development build 作成 + 起動）
# 以後の開発は
npx expo start
```

## API 接続先

- 既定: 本番 `https://www.bon-log.com`（`EXPO_PUBLIC_API_BASE_URL`）
- **書き込みを伴う開発・検証はローカルサーバー推奨**（本番 DB を汚さないため）:
  Bon_Log_cfw 側で `npm run dev`（http://localhost:3000）を起動し、接続先を切り替える
  - iOS シミュレータ: `http://localhost:3000`
  - Android エミュレータ: `http://10.0.2.2:3000`（localhost はエミュレータ自身を指すため）
  - 実機: PC の LAN IP
- DB を直接触らない。データ確認はサーバー API / Supabase MCP（Claude の調査用）/ Bon_Log_cfw 側のツールで行う

## EAS

- `eas.json` のプロファイル: `development` / `preview` / `production`
- シークレット（`SENTRY_AUTH_TOKEN` 等）は EAS Secrets に置く。リポジトリにコミットしない
- 配布: EAS Build → TestFlight / Play 内部テスト（計画書 Phase 5）
