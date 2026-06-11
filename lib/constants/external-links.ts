/**
 * @module lib/constants/external-links
 * アプリ外部の Web URL 定数。`Linking.openURL()` や WebView に渡す際はここから参照する。
 * URL の正は Bon_Log_cfw の app/(legal)/ ルート構成（https://www.bon-log.com ベース）。
 */

/** 利用規約ページ（Bon_Log_cfw: app/(legal)/terms/page.tsx） */
export const TERMS_URL = 'https://www.bon-log.com/terms' as const;

/** プライバシーポリシーページ（Bon_Log_cfw: app/(legal)/privacy/page.tsx） */
export const PRIVACY_URL = 'https://www.bon-log.com/privacy' as const;
