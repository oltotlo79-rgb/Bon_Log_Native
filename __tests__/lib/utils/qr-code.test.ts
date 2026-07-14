/**
 * lib/utils/qr-code の単体テスト。
 * 実際の qrcode-generator で GIF data URI を検証し、入力形式を独自検証しない境界、
 * 容量超過の例外伝播、依存ライブラリが想定外形式を返した場合の防御分岐を網羅する。
 */

import { generateQrCodeDataUri } from '@/lib/utils/qr-code';

const VALID_OTPAUTH_URL =
  'otpauth://totp/Bon_Log:user%40example.com?secret=JBSWY3DPEHPK3PXP&issuer=Bon_Log';

function captureThrownValue(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }

  throw new Error('Expected function to throw');
}

describe('generateQrCodeDataUri', () => {
  it('有効な otpauth URL から GIF の base64 data URI を生成する', () => {
    const dataUri = generateQrCodeDataUri(VALID_OTPAUTH_URL);

    expect(dataUri).toMatch(/^data:image\/gif;base64,R0lGOD/);
  });

  it.each([
    ['空文字', ''],
    ['otpauth 以外の URL', 'https://example.com/not-an-otpauth-url'],
    ['URL ではない文字列', 'not a url'],
  ])('%s も入力形式を独自検証せず QR データとしてエンコードする', (_label, input) => {
    expect(generateQrCodeDataUri(input)).toMatch(/^data:image\/gif;base64,R0lGOD/);
  });

  it('QR コードの最大容量を超える入力では依存ライブラリの例外を伝播する', () => {
    const tooLongInput = 'A'.repeat(10_000);

    const thrownValue = captureThrownValue(() => generateQrCodeDataUri(tooLongInput));

    expect(String(thrownValue)).toContain('code length overflow');
  });

  it('依存ライブラリが GIF 以外の data URI を返した場合は明示的に失敗する', () => {
    const mockAddData = jest.fn<void, [string]>();
    const mockMake = jest.fn<void, []>();
    const mockCreateDataURL = jest.fn(() => 'data:image/png;base64,unexpected');
    const mockQrFactory = jest.fn(() => ({
      addData: mockAddData,
      make: mockMake,
      createDataURL: mockCreateDataURL,
    }));

    jest.doMock('qrcode-generator', () => ({
      __esModule: true,
      default: mockQrFactory,
    }));

    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- doMock 後のモジュールを隔離して読み込むため
        const qrCodeModule: typeof import('@/lib/utils/qr-code') = require('@/lib/utils/qr-code');
        const generateWithUnexpectedDependency = qrCodeModule.generateQrCodeDataUri;

        expect(() => generateWithUnexpectedDependency(VALID_OTPAUTH_URL)).toThrow(
          'generateQrCodeDataUri: unexpected data URI format from qrcode-generator'
        );
      });

      expect(mockQrFactory).toHaveBeenCalledWith(0, 'M');
      expect(mockAddData).toHaveBeenCalledWith(VALID_OTPAUTH_URL);
      expect(mockMake).toHaveBeenCalledTimes(1);
      expect(mockCreateDataURL).toHaveBeenCalledWith(4, 16);
    } finally {
      jest.dontMock('qrcode-generator');
      jest.resetModules();
    }
  });
});
