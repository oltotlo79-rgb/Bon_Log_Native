/**
 * @module lib/constants/external-links
 * アプリ外部の Web URL 定数。expo-web-browser / Linking.openURL() に渡す際はここから参照する。
 * URL の正は Bon_Log_cfw のルート構成。
 * ベース URL は EXPO_PUBLIC_API_BASE_URL に追従し、開発環境でも正しいホストを向く。
 *
 * 「もっと見る」メニューの各機能（発見・辞典・施肥・ホルモン・農薬・分析・マイ盆栽・
 * ブックマーク・盆栽園マップ・イベント・予約投稿・利用規約・プライバシー・特商法表記）は
 * すべてネイティブ画面へ移行済みのため、対応する Web URL 定数は持たない
 * （docs/design/more-menu.md §1.2・§3.3。特に予約投稿・分析はプレミアム機能ページのため、
 * Web URL を復活させると Google Play 決済ポリシー抵触の入口になり得る — store-compliance.md）。
 * Web ページへの導線が必要なのはネイティブ画面が存在しないヘルプのみ。
 */

import { API_BASE_URL } from '@/lib/constants/api';

/** パス文字列とベース URL を結合する共通ロジック */
function buildUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

/**
 * 利用規約ページ（Bon_Log_cfw: app/(mobile-legal)/mobile/android/terms/page.tsx — Android 専用）。
 * 未ログイン 200・Cookie 不要・Web の決済導線（Stripe 等）を継承しない専用ページ。
 * Web 版 URL（/terms）を使うと Google Play 決済ポリシー違反になるため使わない（store-compliance.md）。
 */
export const TERMS_URL = buildUrl('/mobile/android/terms');

/** プライバシーポリシーページ（Bon_Log_cfw: app/(mobile-legal)/mobile/android/privacy/page.tsx — Android 専用。TERMS_URL 同様の理由） */
export const PRIVACY_URL = buildUrl('/mobile/android/privacy');

/** ヘルプページ（Bon_Log_cfw: app/(mobile-legal)/mobile/android/help/page.tsx — Android 専用。TERMS_URL 同様の理由） */
export const HELP_URL = buildUrl('/mobile/android/help');
