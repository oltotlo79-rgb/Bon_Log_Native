/**
 * @module lib/constants/external-links
 * アプリ外部の Web URL 定数。expo-web-browser / Linking.openURL() に渡す際はここから参照する。
 * URL の正は Bon_Log_cfw の app/(legal)/ ルート構成。
 * ベース URL は EXPO_PUBLIC_API_BASE_URL に追従し、開発環境でも正しいホストを向く。
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';

/** 利用規約ページ（Bon_Log_cfw: app/(legal)/terms/page.tsx） */
export const TERMS_URL = `${BASE_URL}/terms` as const;

/** プライバシーポリシーページ（Bon_Log_cfw: app/(legal)/privacy/page.tsx） */
export const PRIVACY_URL = `${BASE_URL}/privacy` as const;

/**
 * PRIVACY_URL の別名。frontend 向け統一命名（TERMS_URL に合わせた _URL サフィックス + 意味を明示する名前）。
 * 既存 PRIVACY_URL と同値。どちらを使っても動作は同じ。
 */
export const PRIVACY_POLICY_URL = PRIVACY_URL;

/** ヘルプページ（Bon_Log_cfw: app/help/page.tsx） */
export const HELP_URL = `${BASE_URL}/help` as const;
