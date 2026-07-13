/**
 * @module lib/utils/qr-code
 * otpauth URL から 2FA セットアップ用 QR コード画像を生成する純粋関数。
 * qrcode-generator（純JS・react-native-svg 非依存）で SVG タグを組み立て、
 * expo-image の source={{ uri }} にそのまま渡せる data URI へ変換する。
 */

import qrcode from 'qrcode-generator';

// 0 = 型番自動判定。otpauth URL は issuer/account 名で長さが変動するため固定型番だと収まらない場合がある
const QR_TYPE_NUMBER_AUTO = 0;

// L/M/Q/H のうち中庸の誤り訂正レベル（データ密度と読み取り耐性のバランス）
const QR_ERROR_CORRECTION_LEVEL = 'M';

// QR モジュール1つあたりのピクセルサイズ
const QR_CELL_SIZE = 4;

// クワイエットゾーン（QR 周囲の余白）のピクセルサイズ
const QR_MARGIN = 16;

/**
 * otpauth:// 形式の URL を QR コード画像の data URI に変換する。
 * 戻り値は SVG (image/svg+xml) を percent-encode した data URI 文字列で、
 * expo-image の `<Image source={{ uri }} />` にそのまま渡せる。
 *
 * @param otpauthUrl - 認証アプリ登録用の otpauth:// URL（TwoFactorSetupResponse.otpAuthUrl 等）
 * @returns `data:image/svg+xml;charset=utf-8,...` 形式の data URI
 */
export function generateQrCodeDataUri(otpauthUrl: string): string {
  const qr = qrcode(QR_TYPE_NUMBER_AUTO, QR_ERROR_CORRECTION_LEVEL);
  qr.addData(otpauthUrl);
  qr.make();

  const svg = qr.createSvgTag({
    cellSize: QR_CELL_SIZE,
    margin: QR_MARGIN,
    scalable: true,
  });

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
