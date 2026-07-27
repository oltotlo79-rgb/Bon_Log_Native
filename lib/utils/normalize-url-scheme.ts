/**
 * @module lib/utils/normalize-url-scheme
 * サーバー（Bon_Log_cfw）は `/^https?:\/\//i` でスキームの大文字小文字を区別せずに URL を受理するため、
 * `HTTPS://example.com` のような値が正当な入力として保存され得る。しかし Android の
 * `expo-web-browser`（`WebBrowserModule.kt`）は IntentFilter のスキーム照合が大文字小文字を区別し、
 * 大文字スキームでは対応アプリの解決に失敗する。この関数は外部ブラウザ起動の直前でスキーム部分のみを
 * 小文字化し、ホスト名・パス・クエリ・フラグメントの大文字小文字は変更しない（パス等は区別されるため）。
 * URL の妥当性検証は行わない（その責務は isValidUrl）。
 */
const HTTP_SCHEME_PATTERN = /^https?:\/\//i;

export function normalizeUrlScheme(url: string): string {
  return url.replace(HTTP_SCHEME_PATTERN, (scheme) => scheme.toLowerCase());
}
