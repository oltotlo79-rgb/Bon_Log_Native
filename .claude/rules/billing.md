---
globs: "lib/billing/**/*.ts"
---

# 課金ルール (RevenueCat)

## アーキテクチャ（計画書 §8）

- 購読経路は Web=Stripe / iOS=IAP / Android=Play Billing の三重管理。モバイル 2 経路を RevenueCat で吸収する
- 購入イベントの流れ: アプリ → RevenueCat → Webhook → サーバー DB 更新
- **プレミアム判定は「サーバー DB の購読状態」が単一の真実 (single source of truth)**

## 絶対規則

1. 機能解放（プレミアム判定）は**サーバー API から取得した購読状態のみ**で行う。RevenueCat クライアント SDK の entitlement を判定の正にしない（Web=Stripe 購読者と矛盾するため）
2. 購入完了後はサーバーの購読状態クエリを invalidate し、反映待ち UI を出す（Webhook 経由のため数秒の遅延があり得る）
3. **Stripe・外部決済への誘導をアプリ内に出さない**（App Store Review 3.1.1。`store-compliance.md`）
4. **購入の復元 (restore purchases) を設定画面に必ず置く**（審査要件）

## 実装

- react-native-purchases の初期化はアプリ起動時に 1 回。ログイン後にサーバーのユーザー ID で identify する
- API キーは `EXPO_PUBLIC_REVENUECAT_*_API_KEY`（公開 SDK キー。シークレットキーはサーバー / RevenueCat ダッシュボード管轄で、このリポジトリに置かない）
- 価格表示は RevenueCat の Offering から取得する（価格のハードコード禁止 — 地域価格・ストア改定に追従できない）
- 購入フローのエラーは種類を区別してハンドリングする: ユーザーキャンセルをエラー表示しない / 保留 (pending) は案内を出す / ネットワークエラーは再試行導線
