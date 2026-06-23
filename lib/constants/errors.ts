/**
 * @module lib/constants/errors
 * クライアント向けエラーメッセージ定数。
 * 文言トーンは Web 版 Bon_Log_cfw/lib/constants/errors/ と揃える（落ち着いた丁寧語）。
 * インライン文字列禁止 — 全エラー文言はここから import して使う（CLAUDE.md 核心ルール6）。
 */

import { MAX_IMAGE_SIZE_MB } from '@/lib/constants/limits/media';
import type { MobileApiErrorCode } from '@/lib/api/errors';

// ---------------------------------------------------------------------------
// ネットワーク・接続系
// ---------------------------------------------------------------------------

/** ネットワーク接続に問題がある場合の汎用メッセージ */
export const ERR_NETWORK = 'ネットワークに接続できませんでした。接続を確認してもう一度お試しください。';

/** オフライン中のフィードバック（画面上部バナー用） */
export const ERR_OFFLINE = 'オフライン中です。接続が回復したら自動的に更新されます。';

/** オフライン中に操作を試みた場合（バナーとは別に操作箇所に表示） */
export const ERR_OFFLINE_ACTION = '現在オフライン中のため、この操作はできません。接続を確認してください。';

/** タイムアウト */
export const ERR_TIMEOUT = 'リクエストがタイムアウトしました。しばらく経ってからお試しください。';

// ---------------------------------------------------------------------------
// 認証・セッション系
// ---------------------------------------------------------------------------

/** アクセストークン失効・再ログインが必要 */
export const ERR_SESSION_EXPIRED = 'セッションの有効期限が切れました。再度ログインしてください。';

/**
 * リフレッシュトークン再利用検知（AUTH_REFRESH_TOKEN_REUSE_DETECTED）。
 * 不正アクセスの可能性があるため、専用の警告文言を表示する（cfw-phase1-complete §3.2）。
 */
export const ERR_SESSION_REUSE_DETECTED =
  '不正アクセスの可能性が検出されたため、安全のためログアウトしました。再度ログインしてください。';

/** ログインが必要な操作 */
export const ERR_AUTH_REQUIRED = 'この操作にはログインが必要です。';

/** ログイン失敗（認証情報不正） */
export const ERR_LOGIN_INVALID_CREDENTIALS = 'メールアドレスまたはパスワードが正しくありません。';

// ---------------------------------------------------------------------------
// 2FA 認証コード系
// ---------------------------------------------------------------------------

/** 認証コードが正しくない（チケット消費済み → ログインからやり直し） */
export const ERR_2FA_INVALID_CODE =
  '認証コードが正しくありません。ログインからやり直してください。';

/** 2FA チケット期限切れ（TTL 300 秒経過後） */
export const ERR_2FA_TICKET_EXPIRED =
  '認証の有効期限が切れました。ログインからやり直してください。';

/** 2FA のレート制限超過（15 分 5 回）*/
export const ERR_2FA_RATE_LIMITED =
  '操作の上限回数に達しました。しばらく待ってから再度ログインしてください。';

/** 2FA チケットが見つからない（不正遷移の防御） */
export const ERR_2FA_NO_TICKET = '認証情報が見つかりません。ログイン画面へ戻ってください。';

/** 2FA 検証中のサーバーエラー（5xx 等） */
export const ERR_2FA_SERVER_ERROR =
  '認証中にエラーが発生しました。しばらく待ってから再度お試しください。';

/** ログイン試行回数の上限到達（429 + login コンテキスト） */
export const ERR_LOGIN_RATE_LIMITED = 'ログイン試行回数の上限に達しました。しばらく待ってから再試行してください。';

/** ログイン処理中の予期しないエラー */
export const ERR_LOGIN_FAILED = 'ログイン中にエラーが発生しました。再度お試しください。';

/** アカウント停止 */
export const ERR_ACCOUNT_SUSPENDED = 'アカウントが停止されています。';

/** メール未確認 */
export const ERR_EMAIL_NOT_VERIFIED = 'メールアドレスがまだ確認されていません。確認メールのリンクをクリックしてください。';

/** 新規登録処理中の予期しないエラー */
export const ERR_REGISTER_FAILED = '登録中にエラーが発生しました。再度お試しください。';

/** 新規登録のレート制限超過 */
export const ERR_REGISTER_RATE_LIMITED = '登録リクエストが多すぎます。しばらく経ってからお試しください。';

/** メールアドレス重複（登録済み） */
export const ERR_EMAIL_ALREADY_REGISTERED = 'このメールアドレスは既に登録されています。';

/** ニックネーム使用不可（予約語・既存ユーザーと衝突） */
export const ERR_NICKNAME_RESERVED = 'このユーザー名は利用できません。別のユーザー名をご利用ください。';

/** パスワードリセットのレート制限（429 + password-reset コンテキスト） */
export const ERR_PASSWORD_RESET_RATE_LIMITED = 'パスワードリセットの要求が多すぎます。しばらく経ってからお試しください。';

/** パスワードリセットメール送信失敗（5xx 等） */
export const ERR_PASSWORD_RESET_SEND_FAILED = 'メールの送信に失敗しました。しばらく経ってからお試しください。';

/** パスワードリセットリンクが無効または期限切れ */
export const ERR_RESET_LINK_INVALID = 'リセットリンクが無効または期限切れです。もう一度お試しください。';

/** パスワード更新失敗 */
export const ERR_PASSWORD_UPDATE_FAILED = 'パスワードの更新に失敗しました。再度お試しください。';

// ---------------------------------------------------------------------------
// レート制限系（429）
// ---------------------------------------------------------------------------

/**
 * 汎用レート制限。
 * 429 受信時に表示する。自動リトライ禁止（api-client.md）。
 */
export const ERR_RATE_LIMIT = '操作が多すぎます。しばらく時間をおいてからお試しください。';

/** 1日の投稿上限に達した場合（429 + 投稿コンテキスト） */
export const ERR_RATE_LIMIT_DAILY_POSTS = '本日の投稿上限に達しました。明日またお試しください。';

/** 1日のコメント上限に達した場合 */
export const ERR_RATE_LIMIT_DAILY_COMMENTS = '本日のコメント上限に達しました。明日またお試しください。';

/** 検索レート制限 */
export const ERR_RATE_LIMIT_SEARCH = '検索リクエストが多すぎます。しばらく待ってから再試行してください。';

// ---------------------------------------------------------------------------
// 権限・存在確認系（403 / 404）
// ---------------------------------------------------------------------------

/** 対象が存在しない（404） */
export const ERR_NOT_FOUND = 'ご指定のコンテンツは見つかりませんでした。';

/** 投稿が見つからない */
export const ERR_POST_NOT_FOUND = 'この投稿は見つかりません。';

/** ユーザーが見つからない */
export const ERR_USER_NOT_FOUND = 'このユーザーは見つかりません。';

/** 権限なし（403） */
export const ERR_FORBIDDEN = 'この操作を行う権限がありません。';

// ---------------------------------------------------------------------------
// 入力バリデーション系（400）
// ---------------------------------------------------------------------------

/** 汎用入力エラー */
export const ERR_INVALID_INPUT = '入力内容を確認してください。';

/** 必須項目未入力（汎用） */
export const ERR_REQUIRED_FIELD = 'この項目は必須です。';

/** メールアドレス未入力 */
export const ERR_EMAIL_REQUIRED = 'メールアドレスを入力してください。';

/** メールアドレス形式エラー */
export const ERR_EMAIL_INVALID = '有効なメールアドレスを入力してください。';

/** メールアドレス長すぎ（テンプレート） */
export const ERR_EMAIL_TOO_LONG = (max: number) => `メールアドレスは${max}文字以内で入力してください。`;

/** ニックネーム未入力 */
export const ERR_NICKNAME_REQUIRED = 'ニックネームを入力してください。';

/** ニックネーム長すぎ（テンプレート） */
export const ERR_NICKNAME_TOO_LONG = (max: number) => `ニックネームは${max}文字以内で入力してください。`;

/** ニックネームに使用できない文字が含まれている */
export const ERR_NICKNAME_INVALID_CHARS = 'ニックネームに改行や < > は使えません。';

/** 自己紹介長すぎ（テンプレート） */
export const ERR_BIO_TOO_LONG = (max: number) => `自己紹介は${max}文字以内で入力してください。`;

/** 居住地域長すぎ（テンプレート） */
export const ERR_LOCATION_TOO_LONG = (max: number) => `居住地域は${max}文字以内で入力してください。`;

/** 盆栽歴の開始年が不正（整数4桁・USER_BONSAI_START_MIN_YEAR〜現在年の範囲外） */
export const ERR_BONSAI_YEAR_INVALID = '有効な年を入力してください（例: 2020）';

/** 盆栽歴の開始月が不正（1〜12 の整数以外） */
export const ERR_BONSAI_MONTH_INVALID = '月は1から12の数字を入力してください';

/** パスワード未入力 */
export const ERR_PASSWORD_REQUIRED = 'パスワードを入力してください。';

/** パスワード（確認）未入力 */
export const ERR_PASSWORD_CONFIRM_REQUIRED = 'パスワード（確認）を入力してください。';

/** 新しいパスワード未入力（パスワードリセット確認フォーム用） */
export const ERR_NEW_PASSWORD_REQUIRED = '新しいパスワードを入力してください。';

/** パスワードが一致しない */
export const ERR_PASSWORD_MISMATCH = 'パスワードが一致しません。';

/** 利用規約への同意が必要 */
export const ERR_TERMS_AGREEMENT_REQUIRED = '利用規約とプライバシーポリシーに同意してください。';

/** パスワード短すぎ */
export const ERR_PASSWORD_MIN_LENGTH = 'パスワードは8文字以上で入力してください。';

/** パスワード長すぎ */
export const ERR_PASSWORD_MAX_LENGTH = 'パスワードは72文字以下で入力してください。';

/** パスワード形式エラー（アルファベットと数字の両方が必要） */
export const ERR_PASSWORD_ALPHANUMERIC = 'パスワードはアルファベットと数字を両方含めてください。';

/** パスワードにアルファベットが含まれていない */
export const ERR_PASSWORD_REQUIRE_LETTER = 'パスワードはアルファベットを含めてください。';

/** パスワードに数字が含まれていない */
export const ERR_PASSWORD_REQUIRE_NUMBER = 'パスワードは数字を含めてください。';

/** 投稿本文なし */
export const ERR_CONTENT_REQUIRED = 'テキストまたはメディアを入力してください。';

/** コメント内容なし */
export const ERR_COMMENT_CONTENT_REQUIRED = 'コメント内容またはメディアを入力してください。';

/** 文字数超過（テンプレート） */
export const ERR_CONTENT_TOO_LONG = (max: number) => `${max}文字以内で入力してください。`;

/** 投稿文字数超過（テンプレート） */
export const ERR_POST_CONTENT_TOO_LONG = (max: number) => `投稿は${max}文字以内で入力してください。`;

/** コメント文字数超過（テンプレート） */
export const ERR_COMMENT_CONTENT_TOO_LONG = (max: number) => `コメントは${max}文字以内で入力してください。`;

/** ジャンル選択超過（テンプレート） */
export const ERR_GENRE_LIMIT = (max: number) => `ジャンルは${max}つまで選択できます。`;

/** 画像枚数超過（テンプレート） */
export const ERR_IMAGE_LIMIT = (max: number) => `画像は${max}枚までです。`;

/** 動画本数超過（テンプレート） */
export const ERR_VIDEO_LIMIT = (max: number) => `動画は${max}本までです。`;

/** 動画投稿プレミアム限定 */
export const ERR_VIDEO_PREMIUM_ONLY = '動画の投稿はプレミアム会員限定です。';

/** 画像サイズ超過 */
export const ERR_IMAGE_SIZE_EXCEEDED = `画像は${MAX_IMAGE_SIZE_MB}MB以下にしてください。`;

/** 画像形式エラー */
export const ERR_INVALID_IMAGE_FORMAT = 'JPEG、PNG、WebP形式のみ対応しています。';

// ---------------------------------------------------------------------------
// CRUD 操作失敗系
// ---------------------------------------------------------------------------

/** 投稿作成失敗 */
export const ERR_POST_CREATE_FAILED = '投稿の作成に失敗しました。もう一度お試しください。';

/** 投稿更新失敗 */
export const ERR_POST_UPDATE_FAILED = '投稿の更新に失敗しました。もう一度お試しください。';

/** 投稿削除失敗 */
export const ERR_POST_DELETE_FAILED = '投稿の削除に失敗しました。もう一度お試しください。';

/** コメント作成失敗 */
export const ERR_COMMENT_CREATE_FAILED = 'コメントの投稿に失敗しました。もう一度お試しください。';

/** コメント削除失敗 */
export const ERR_COMMENT_DELETE_FAILED = 'コメントの削除に失敗しました。もう一度お試しください。';

/** いいね失敗 */
export const ERR_LIKE_FAILED = 'いいねの処理に失敗しました。';

/** フォロー操作失敗 */
export const ERR_FOLLOW_FAILED = 'フォロー操作に失敗しました。';

/** ブロック失敗 */
export const ERR_BLOCK_FAILED = 'ブロックに失敗しました。';

/** ブロック解除失敗 */
export const ERR_UNBLOCK_FAILED = 'ブロック解除に失敗しました。';

/** ミュート失敗 */
export const ERR_MUTE_FAILED = 'ミュートに失敗しました。もう一度お試しください。';

/** ミュート解除失敗 */
export const ERR_UNMUTE_FAILED = 'ミュートの解除に失敗しました。もう一度お試しください。';

/** 通報送信失敗 */
export const ERR_REPORT_FAILED = '通報に失敗しました。もう一度お試しください。';

/** 重複通報（409 CONFLICT） */
export const ERR_REPORT_DUPLICATE = 'この内容はすでに通報済みです。';

/** 通報対象が存在しない（404 NOT_FOUND） */
export const ERR_REPORT_TARGET_NOT_FOUND = '通報対象が見つかりませんでした。';

/** 既にブロック済み（409 CONFLICT） */
export const ERR_BLOCK_ALREADY_BLOCKED = 'すでにブロックしています。';

/** 既にミュート済み（409 CONFLICT） */
export const ERR_MUTE_ALREADY_MUTED = 'すでにミュートしています。';

/** ブロックリスト読み込み失敗 */
export const ERR_BLOCK_LIST_LOAD_FAILED = 'ブロックリストを読み込めませんでした。';

/** ミュートリスト読み込み失敗 */
export const ERR_MUTE_LIST_LOAD_FAILED = 'ミュートリストを読み込めませんでした。';

/** アカウント削除失敗 */
export const ERR_ACCOUNT_DELETE_FAILED = 'アカウントの削除に失敗しました。';

/** メディアアップロード失敗 */
export const ERR_MEDIA_UPLOAD_FAILED = 'メディアのアップロードに失敗しました。';

// ---------------------------------------------------------------------------
// ソーシャル操作系
// ---------------------------------------------------------------------------

/** 自分自身への操作 */
export const ERR_SELF_ACTION = '自分自身に対してこの操作はできません。';

/** 非公開アカウントへのフォロー */
export const ERR_PRIVATE_ACCOUNT_FOLLOW = 'このユーザーは非公開アカウントです。フォローリクエストを送信してください。';

// ---------------------------------------------------------------------------
// Push 通知系
// ---------------------------------------------------------------------------

/** Push 通知登録失敗 */
export const ERR_PUSH_SUBSCRIBE_FAILED = 'プッシュ通知の登録に失敗しました。';

// ---------------------------------------------------------------------------
// Google 認証系
// ---------------------------------------------------------------------------

/** Google ログイン中に ID トークンが取得できなかった（レスポンス形状が想定外） */
export const ERR_GOOGLE_ID_TOKEN_MISSING =
  'Google ログインに失敗しました。もう一度お試しください。';

/** Google ログイン処理中の予期しないエラー */
export const ERR_GOOGLE_SIGN_IN_FAILED =
  'Google ログイン中にエラーが発生しました。再度お試しください。';

// ---------------------------------------------------------------------------
// 課金系
// ---------------------------------------------------------------------------

/** プレミアム限定機能 */
export const ERR_PREMIUM_ONLY = 'プレミアム会員限定の機能です。';

/** 購入ネットワークエラー */
export const ERR_PURCHASE_FAILED = '購入できませんでした。もう一度お試しください。';

/** 決済保留中 */
export const ERR_PURCHASE_PENDING = '決済が保留中です。Google Play でご確認ください。';

// ---------------------------------------------------------------------------
// 汎用系
// ---------------------------------------------------------------------------

/** ブックマーク操作失敗 */
export const ERR_BOOKMARK_FAILED = 'ブックマークの操作に失敗しました。';

/** ブックマーク一覧読み込み失敗 */
export const ERR_BOOKMARKS_LOAD_FAILED = 'ブックマーク一覧を読み込めませんでした。';

/** マイ盆栽一覧読み込み失敗 */
export const ERR_BONSAI_LOAD_FAILED = '盆栽一覧を読み込めませんでした。';

/** 盆栽作成失敗 */
export const ERR_BONSAI_CREATE_FAILED = '盆栽の登録に失敗しました。もう一度お試しください。';

/** 盆栽更新失敗 */
export const ERR_BONSAI_UPDATE_FAILED = '盆栽情報の更新に失敗しました。もう一度お試しください。';

/** 盆栽削除失敗 */
export const ERR_BONSAI_DELETE_FAILED = '盆栽の削除に失敗しました。もう一度お試しください。';

/** 手入れログ一覧読み込み失敗 */
export const ERR_CARE_LOGS_LOAD_FAILED = '手入れログを読み込めませんでした。';

/** 手入れログ作成失敗 */
export const ERR_CARE_LOG_CREATE_FAILED = '手入れログの追加に失敗しました。もう一度お試しください。';

/** 手入れログ更新失敗 */
export const ERR_CARE_LOG_UPDATE_FAILED = '手入れログの更新に失敗しました。もう一度お試しください。';

/** 手入れログ削除失敗 */
export const ERR_CARE_LOG_DELETE_FAILED = '手入れログの削除に失敗しました。もう一度お試しください。';

/** 成長記録追加失敗 */
export const ERR_BONSAI_RECORD_CREATE_FAILED = '成長記録の追加に失敗しました。もう一度お試しください。';

/** 成長記録更新失敗 */
export const ERR_BONSAI_RECORD_UPDATE_FAILED = '成長記録の更新に失敗しました。もう一度お試しください。';

/** 成長記録削除失敗 */
export const ERR_BONSAI_RECORD_DELETE_FAILED = '成長記録の削除に失敗しました。もう一度お試しください。';

/** イベント一覧読み込み失敗 */
export const ERR_EVENTS_LOAD_FAILED = 'イベント一覧を読み込めませんでした。';

/** イベント作成失敗 */
export const ERR_EVENT_CREATE_FAILED = 'イベントの登録に失敗しました。もう一度お試しください。';

/** イベント更新失敗 */
export const ERR_EVENT_UPDATE_FAILED = 'イベントの更新に失敗しました。もう一度お試しください。';

/** イベント削除失敗 */
export const ERR_EVENT_DELETE_FAILED = 'イベントの削除に失敗しました。もう一度お試しください。';

/** 盆栽園一覧読み込み失敗 */
export const ERR_SHOPS_LOAD_FAILED = '盆栽園一覧を読み込めませんでした。';

/** 盆栽園登録失敗 */
export const ERR_SHOP_CREATE_FAILED = '盆栽園の登録に失敗しました。もう一度お試しください。';

/** 盆栽園更新失敗 */
export const ERR_SHOP_UPDATE_FAILED = '盆栽園情報の更新に失敗しました。もう一度お試しください。';

/** 盆栽園住所重複（409 CONFLICT） */
export const ERR_SHOP_DUPLICATE_ADDRESS = 'この住所の盆栽園はすでに登録されています。';

/** レビュー一覧読み込み失敗 */
export const ERR_REVIEWS_LOAD_FAILED = 'レビューを読み込めませんでした。';

/** レビュー投稿失敗 */
export const ERR_REVIEW_CREATE_FAILED = 'レビューの投稿に失敗しました。もう一度お試しください。';

/** レビュー二重投稿（409 CONFLICT） */
export const ERR_REVIEW_DUPLICATE = 'この盆栽園にはすでにレビューを投稿しています。';

/** 予約投稿一覧読み込み失敗 */
export const ERR_SCHEDULED_POSTS_LOAD_FAILED = '予約投稿一覧を読み込めませんでした。';

/** 予約投稿作成失敗 */
export const ERR_SCHEDULED_POST_CREATE_FAILED = '予約投稿の作成に失敗しました。もう一度お試しください。';

/** 予約投稿更新失敗 */
export const ERR_SCHEDULED_POST_UPDATE_FAILED = '予約投稿の更新に失敗しました。もう一度お試しください。';

/** 予約投稿削除失敗 */
export const ERR_SCHEDULED_POST_DELETE_FAILED = '予約投稿の削除に失敗しました。もう一度お試しください。';

/** 予約投稿キャンセル失敗 */
export const ERR_SCHEDULED_POST_CANCEL_FAILED = '予約投稿のキャンセルに失敗しました。もう一度お試しください。';

/** 確認メール再送のレート制限超過 */
export const ERR_VERIFY_EMAIL_RESEND_RATE_LIMITED = '確認メールの送信が多すぎます。しばらく経ってからお試しください。';

/** フォローリクエスト承認失敗（404 以外の予期しないエラー） */
export const ERR_FOLLOW_REQUEST_APPROVE_FAILED = 'フォローリクエストの承認に失敗しました。もう一度お試しください。';

/** フォローリクエスト拒否失敗（404 以外の予期しないエラー） */
export const ERR_FOLLOW_REQUEST_REJECT_FAILED = 'フォローリクエストの拒否に失敗しました。もう一度お試しください。';

/** フォローリクエスト一覧読み込み失敗 */
export const ERR_FOLLOW_REQUESTS_LOAD_FAILED = 'フォローリクエスト一覧を読み込めませんでした。';

/** 通知設定読み込み失敗 */
export const ERR_NOTIFICATION_SETTINGS_LOAD_FAILED = '通知設定を読み込めませんでした。';

/** 通知設定更新失敗 */
export const ERR_NOTIFICATION_SETTINGS_UPDATE_FAILED = '通知設定の更新に失敗しました。もう一度お試しください。';

/** 汎用エラー（詳細不明 / 5xx 等） */
export const ERR_GENERIC = '予期しないエラーが発生しました。しばらく経ってからお試しください。';

/** 再試行の案内（単独または他エラー文言の末尾に付与） */
export const ERR_RETRY_HINT = 'もう一度お試しください。';

/** サーバーエラー（5xx） */
export const ERR_SERVER = 'サーバーでエラーが発生しました。しばらく経ってからお試しください。';

/** 読み込み失敗（汎用） */
export const ERR_LOAD_FAILED = '読み込みに失敗しました。';

/** タイムライン読み込み失敗 */
export const ERR_FEED_LOAD_FAILED = 'タイムラインを読み込めませんでした。';

/** 通知読み込み失敗 */
export const ERR_NOTIFICATIONS_LOAD_FAILED = '通知を読み込めませんでした。';

/**
 * 通知の既読化失敗（「すべて既読にする」ボタン失敗時のトースト。
 * 自動既読化の失敗時は静かに無視するため使わない — design/notifications-screen.md §8.3）
 */
export const ERR_NOTIFICATION_READ_FAILED = '既読にできませんでした。もう一度お試しください。';

/** プロフィール読み込み失敗 */
export const ERR_PROFILE_LOAD_FAILED = 'プロフィールを読み込めませんでした。';

/** 検索失敗 */
export const ERR_SEARCH_FAILED = '検索できませんでした。もう一度お試しください。';

/** 投稿読み込み失敗 */
export const ERR_POST_LOAD_FAILED = '投稿を読み込めませんでした。';

/** 発見（explore）データ読み込み失敗 */
export const ERR_EXPLORE_LOAD_FAILED = '発見コンテンツを読み込めませんでした。';

/** 辞典読み込み失敗 */
export const ERR_DICTIONARY_LOAD_FAILED = '盆栽用語辞典を読み込めませんでした。';

/** 施肥ガイド読み込み失敗 */
export const ERR_FERTILIZERS_LOAD_FAILED = '施肥ガイドを読み込めませんでした。';

/** 植物ホルモン読み込み失敗 */
export const ERR_HORMONES_LOAD_FAILED = '植物ホルモン情報を読み込めませんでした。';

/** 農薬病害虫図鑑読み込み失敗 */
export const ERR_PESTICIDES_LOAD_FAILED = '農薬病害虫図鑑を読み込めませんでした。';

/** 法的文章読み込み失敗 */
export const ERR_LEGAL_LOAD_FAILED = '法的文章を読み込めませんでした。';

/** 投稿分析読み込み失敗 */
export const ERR_ANALYTICS_LOAD_FAILED = '投稿分析データを読み込めませんでした。';

// ---------------------------------------------------------------------------
// 認証フォーム — 案内・成功メッセージ
// ---------------------------------------------------------------------------

/** パスワードリセットメール送信成功バナー タイトル */
export const MSG_PASSWORD_RESET_SENT_TITLE = 'メールを送信しました';

/** パスワードリセットメール送信成功バナー 本文 */
export const MSG_PASSWORD_RESET_SENT_BODY =
  '入力されたメールアドレスにパスワードリセット用のリンクを送信しました。メールをご確認ください。';

/** パスワードリセットメール不達時のヒント */
export const MSG_PASSWORD_RESET_SENT_HINT =
  'メールが届かない場合は、迷惑メールフォルダもご確認ください。';

/** パスワードリセットリンク無効バナー タイトル */
export const MSG_RESET_LINK_INVALID_TITLE = 'リンクが無効です';

/** パスワードリセットリンク無効バナー 本文 */
export const MSG_RESET_LINK_INVALID_BODY =
  'リセットリンクが無効または期限切れです。もう一度パスワードリセットをお試しください。';

/** パスワード更新成功バナー タイトル */
export const MSG_PASSWORD_UPDATED_TITLE = 'パスワードを更新しました';

/** パスワード更新成功バナー 本文（自動リダイレクトの案内を含む） */
export const MSG_PASSWORD_UPDATED_BODY =
  '新しいパスワードでログインできます。ログインページへ移動します...';

// ---------------------------------------------------------------------------
// API エラーコード → ユーザー向け文言の変換
// ---------------------------------------------------------------------------

/**
 * register ミューテーション専用のエラーメッセージ変換。
 * CONFLICT（メール重複 409）を ERR_EMAIL_ALREADY_REGISTERED に対応付ける。
 * CONFLICT の汎用表現は ERR_INVALID_INPUT だが、register 文脈では重複メールを明示する。
 */
export function messageForRegisterError(code: MobileApiErrorCode): string {
  if (code === 'CONFLICT') return ERR_EMAIL_ALREADY_REGISTERED;
  if (code === 'RATE_LIMITED') return ERR_REGISTER_RATE_LIMITED;
  if (code === 'VALIDATION_ERROR') return ERR_INVALID_INPUT;
  return ERR_REGISTER_FAILED;
}

/**
 * MobileApiErrorCode に対応するユーザー向けメッセージを返す。
 * 網羅されていないコードは ERR_GENERIC にフォールバックする。
 * インライン文字列禁止ルール（CLAUDE.md 核心ルール6）の適用先。
 */
export function messageForApiError(code: MobileApiErrorCode): string {
  switch (code) {
    case 'AUTH_REQUIRED':
      return ERR_AUTH_REQUIRED;
    case 'AUTH_INVALID_TOKEN':
      return ERR_SESSION_EXPIRED;
    case 'AUTH_TOKEN_EXPIRED':
      return ERR_SESSION_EXPIRED;
    case 'AUTH_INVALID_CREDENTIALS':
      return ERR_LOGIN_INVALID_CREDENTIALS;
    case 'AUTH_2FA_REQUIRED':
      return ERR_2FA_NO_TICKET;
    case 'AUTH_2FA_INVALID_CODE':
      return ERR_2FA_INVALID_CODE;
    case 'AUTH_2FA_TICKET_EXPIRED':
      return ERR_2FA_TICKET_EXPIRED;
    case 'AUTH_REFRESH_TOKEN_INVALID':
      return ERR_SESSION_EXPIRED;
    case 'AUTH_REFRESH_TOKEN_REUSE_DETECTED':
      return ERR_SESSION_REUSE_DETECTED;
    case 'ACCOUNT_SUSPENDED':
      return ERR_ACCOUNT_SUSPENDED;
    case 'GUEST_NOT_ALLOWED':
      return ERR_AUTH_REQUIRED;
    case 'EMAIL_NOT_VERIFIED':
      return ERR_EMAIL_NOT_VERIFIED;
    case 'VALIDATION_ERROR':
      return ERR_INVALID_INPUT;
    case 'RATE_LIMITED':
      return ERR_RATE_LIMIT;
    case 'NOT_FOUND':
      return ERR_NOT_FOUND;
    case 'CONFLICT':
      return ERR_INVALID_INPUT;
    case 'INTERNAL_ERROR':
      return ERR_SERVER;
    case 'SERVER_MISCONFIGURED':
      return ERR_SERVER;
    case 'PREMIUM_REQUIRED':
      return ERR_PREMIUM_ONLY;
    default:
      return ERR_GENERIC;
  }
}
