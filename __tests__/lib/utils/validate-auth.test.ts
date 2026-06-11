import {
  validateEmail,
  validatePassword,
  validateNickname,
  validateBio,
  validateLocation,
} from '@/lib/utils/validate-auth';
import {
  ERR_EMAIL_INVALID,
  ERR_EMAIL_TOO_LONG,
  ERR_PASSWORD_MIN_LENGTH,
  ERR_PASSWORD_MAX_LENGTH,
  ERR_PASSWORD_ALPHANUMERIC,
  ERR_PASSWORD_REQUIRE_LETTER,
  ERR_PASSWORD_REQUIRE_NUMBER,
  ERR_NICKNAME_REQUIRED,
  ERR_NICKNAME_TOO_LONG,
  ERR_NICKNAME_INVALID_CHARS,
  ERR_BIO_TOO_LONG,
  ERR_LOCATION_TOO_LONG,
} from '@/lib/constants/errors';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  MAX_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_EMAIL_LENGTH,
} from '@/lib/constants/limits/auth';

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------

describe('validateEmail', () => {
  it('有効なメールアドレスで null を返す', () => {
    expect(validateEmail('user@example.com')).toBeNull();
  });

  it('@ のないアドレスでエラーを返す', () => {
    expect(validateEmail('invalid-email')).toBe(ERR_EMAIL_INVALID);
  });

  it('ドメインのないアドレスでエラーを返す', () => {
    expect(validateEmail('user@')).toBe(ERR_EMAIL_INVALID);
  });

  it('空文字でエラーを返す', () => {
    expect(validateEmail('')).toBe(ERR_EMAIL_INVALID);
  });

  it(`${MAX_EMAIL_LENGTH}文字のメールアドレスで null を返す`, () => {
    const localPart = 'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length);
    const email = `${localPart}@example.com`;
    expect(email.length).toBe(MAX_EMAIL_LENGTH);
    expect(validateEmail(email)).toBeNull();
  });

  it(`${MAX_EMAIL_LENGTH + 1}文字のメールアドレスでエラーを返す`, () => {
    const localPart = 'a'.repeat(MAX_EMAIL_LENGTH - '@example.com'.length + 1);
    const email = `${localPart}@example.com`;
    expect(email.length).toBe(MAX_EMAIL_LENGTH + 1);
    expect(validateEmail(email)).toBe(ERR_EMAIL_TOO_LONG(MAX_EMAIL_LENGTH));
  });
});

// ---------------------------------------------------------------------------
// validatePassword
// ---------------------------------------------------------------------------

describe('validatePassword', () => {
  it('有効なパスワード（英字+数字）で null を返す', () => {
    expect(validatePassword('Password1')).toBeNull();
  });

  it('有効なパスワード（小文字+数字）で null を返す', () => {
    expect(validatePassword('pass1234')).toBeNull();
  });

  it(`${PASSWORD_MIN_LENGTH - 1}文字のパスワードで最小長エラーを返す`, () => {
    // 7文字・英字+数字を含む
    expect(validatePassword('Pass1ab')).toBe(ERR_PASSWORD_MIN_LENGTH);
  });

  it(`${PASSWORD_MIN_LENGTH}文字の有効なパスワードで null を返す`, () => {
    expect(validatePassword('Pass1234')).toBeNull();
  });

  it(`${PASSWORD_MAX_LENGTH + 1}文字のパスワードで最大長エラーを返す`, () => {
    const tooLong = 'a'.repeat(PASSWORD_MAX_LENGTH) + '1';
    expect(validatePassword(tooLong)).toBe(ERR_PASSWORD_MAX_LENGTH);
  });

  it(`${PASSWORD_MAX_LENGTH}文字の有効なパスワードで null を返す`, () => {
    const atMax = 'a'.repeat(PASSWORD_MAX_LENGTH - 1) + '1';
    expect(atMax.length).toBe(PASSWORD_MAX_LENGTH);
    expect(validatePassword(atMax)).toBeNull();
  });

  it('数字のみのパスワードでアルファベット必須エラーを返す', () => {
    expect(validatePassword('12345678')).toBe(ERR_PASSWORD_REQUIRE_LETTER);
  });

  it('英字のみのパスワードで数字必須エラーを返す', () => {
    expect(validatePassword('abcdefgh')).toBe(ERR_PASSWORD_REQUIRE_NUMBER);
  });

  it('記号のみのパスワードで両方必須エラーを返す', () => {
    expect(validatePassword('!@#$%^&*')).toBe(ERR_PASSWORD_ALPHANUMERIC);
  });
});

// ---------------------------------------------------------------------------
// validateNickname
// ---------------------------------------------------------------------------

describe('validateNickname', () => {
  it('有効なニックネームで null を返す', () => {
    expect(validateNickname('盆栽太郎')).toBeNull();
  });

  it('空文字で必須エラーを返す', () => {
    expect(validateNickname('')).toBe(ERR_NICKNAME_REQUIRED);
  });

  it(`${MAX_NICKNAME_LENGTH}文字のニックネームで null を返す`, () => {
    const atMax = 'a'.repeat(MAX_NICKNAME_LENGTH);
    expect(validateNickname(atMax)).toBeNull();
  });

  it(`${MAX_NICKNAME_LENGTH + 1}文字のニックネームで長さエラーを返す`, () => {
    const tooLong = 'a'.repeat(MAX_NICKNAME_LENGTH + 1);
    expect(validateNickname(tooLong)).toBe(ERR_NICKNAME_TOO_LONG(MAX_NICKNAME_LENGTH));
  });

  it('改行を含むニックネームで不正文字エラーを返す', () => {
    expect(validateNickname('盆栽\n太郎')).toBe(ERR_NICKNAME_INVALID_CHARS);
  });

  it('< を含むニックネームで不正文字エラーを返す', () => {
    expect(validateNickname('盆栽<太郎')).toBe(ERR_NICKNAME_INVALID_CHARS);
  });

  it('> を含むニックネームで不正文字エラーを返す', () => {
    expect(validateNickname('盆栽>太郎')).toBe(ERR_NICKNAME_INVALID_CHARS);
  });

  it('\\r を含むニックネームで不正文字エラーを返す', () => {
    expect(validateNickname('盆栽\r太郎')).toBe(ERR_NICKNAME_INVALID_CHARS);
  });

  it('1文字のニックネームで null を返す（境界値）', () => {
    expect(validateNickname('A')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateBio
// ---------------------------------------------------------------------------

describe('validateBio', () => {
  it('空文字で null を返す', () => {
    expect(validateBio('')).toBeNull();
  });

  it(`${MAX_BIO_LENGTH}文字で null を返す`, () => {
    const atMax = 'a'.repeat(MAX_BIO_LENGTH);
    expect(validateBio(atMax)).toBeNull();
  });

  it(`${MAX_BIO_LENGTH + 1}文字でエラーを返す`, () => {
    const tooLong = 'a'.repeat(MAX_BIO_LENGTH + 1);
    expect(validateBio(tooLong)).toBe(ERR_BIO_TOO_LONG(MAX_BIO_LENGTH));
  });
});

// ---------------------------------------------------------------------------
// validateLocation
// ---------------------------------------------------------------------------

describe('validateLocation', () => {
  it('空文字で null を返す', () => {
    expect(validateLocation('')).toBeNull();
  });

  it('通常の居住地域文字列で null を返す', () => {
    expect(validateLocation('東京都')).toBeNull();
  });

  it(`${MAX_LOCATION_LENGTH}文字で null を返す`, () => {
    const atMax = 'a'.repeat(MAX_LOCATION_LENGTH);
    expect(validateLocation(atMax)).toBeNull();
  });

  it(`${MAX_LOCATION_LENGTH + 1}文字でエラーを返す`, () => {
    const tooLong = 'a'.repeat(MAX_LOCATION_LENGTH + 1);
    expect(validateLocation(tooLong)).toBe(ERR_LOCATION_TOO_LONG(MAX_LOCATION_LENGTH));
  });
});
