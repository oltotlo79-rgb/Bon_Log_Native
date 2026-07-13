/**
 * @module lib/utils/qr-code
 * otpauth URL から 2FA セットアップ用 QR コード画像を生成する純粋関数。
 * qrcode-generator（純JS・react-native-svg 非依存）で GIF ラスタ画像を生成し、
 * expo-image の source={{ uri }} にそのまま渡せる base64 data URI へ変換する。
 */

import qrcode from 'qrcode-generator';

// 0 = 型番自動判定。otpauth URL は issuer/account 名で長さが変動するため固定型番だと収まらない場合がある
const QR_TYPE_NUMBER_AUTO = 0;

// L/M/Q/H のうち中庸の誤り訂正レベル（データ密度と読み取り耐性のバランス）
const QR_ERROR_CORRECTION_LEVEL = 'M';

// QR モジュール1つあたりのピクセルサイズ。誤り訂正レベル M での典型的な otpauth URL 長
// （issuer・account・secret・algorithm 等を含め ~50〜160 文字）で表示枠
// （TwoFactorEnableSection の QR_IMAGE_SIZE=200）に近い実寸（約160〜250px）になる値
const QR_CELL_SIZE = 4;

// クワイエットゾーン（QR 周囲の余白）のピクセルサイズ
const QR_MARGIN = 16;

const GIF_BASE64_DATA_URI_PREFIX = 'data:image/gif;base64,';

/**
 * otpauth:// 形式の URL を QR コード画像の data URI に変換する。
 * 戻り値は GIF (image/gif) の base64 data URI 文字列で、
 * expo-image の `<Image source={{ uri }} />` にそのまま渡せる。
 *
 * GIF base64 を採用する理由: Android の expo-image（Base64DataFetcher）は
 * data: URI を常に base64 デコードするため、percent-encode の SVG data URI では
 * デコードに失敗し描画されない。ラスタ画像なら両OSの標準デコーダで確実に描画できる。
 *
 * @param otpauthUrl - 認証アプリ登録用の otpauth:// URL（TwoFactorSetupResponse.otpAuthUrl 等）
 * @returns `data:image/gif;base64,...` 形式の data URI
 */
export function generateQrCodeDataUri(otpauthUrl: string): string {
  const qr = qrcode(QR_TYPE_NUMBER_AUTO, QR_ERROR_CORRECTION_LEVEL);
  qr.addData(otpauthUrl);
  qr.make();

  const dataUri = qr.createDataURL(QR_CELL_SIZE, QR_MARGIN);

  if (!dataUri.startsWith(GIF_BASE64_DATA_URI_PREFIX)) {
    throw new Error('generateQrCodeDataUri: unexpected data URI format from qrcode-generator');
  }

  return dataUri;
}
