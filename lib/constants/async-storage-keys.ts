/**
 * @module lib/constants/async-storage-keys
 * @react-native-async-storage/async-storage のキー名定数。
 * 非秘匿のクライアント永続データ専用（トークン等の秘匿情報は secure-store-keys.ts / expo-secure-store を使うこと）。
 */

/** 検索履歴（直近の検索クエリ一覧）の AsyncStorage キー */
export const STORAGE_KEY_RECENT_SEARCHES = 'bon_log_recent_searches';
