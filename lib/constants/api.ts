/**
 * @module lib/constants/api
 * Bon_Log_cfw サーバーとの通信で共通に使う公開定数。
 * ベース URL は EXPO_PUBLIC_API_BASE_URL から取得し、未設定時は本番ホストへフォールバックする
 * （開発環境でローカルサーバーへ切り替える際は setup-dev.md の手順に従う）。
 */

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';
