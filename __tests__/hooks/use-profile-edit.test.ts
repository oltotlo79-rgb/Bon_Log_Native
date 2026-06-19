/**
 * @module __tests__/hooks/use-profile-edit
 * useProfileEdit フックのテスト。
 * バリデーション関数・isDirty・isValid・buildUpdateRequest・blur ハンドラを検証する。
 */

import { renderHook, act } from '@testing-library/react-native';
import { useProfileEdit } from '@/hooks/use-profile-edit';
import {
  MAX_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  USER_BONSAI_START_MIN_YEAR,
} from '@/lib/constants/limits/auth';
import type { UsersMeFullResponse } from '@/lib/queries/users';

const BASE_PROFILE: UsersMeFullResponse = {
  id: 'user-1',
  email: 'test@bon-log.com',
  nickname: '松の匠',
  avatarUrl: null,
  headerUrl: null,
  bio: '盆栽歴10年',
  location: '東京',
  isPublic: true,
  bonsaiStartYear: 2015,
  bonsaiStartMonth: 3,
  birthDate: null,
  isPremium: false,
};

// ---------------------------------------------------------------------------
// isDirty
// ---------------------------------------------------------------------------

describe('isDirty', () => {
  it('初期状態では false', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    expect(result.current.isDirty).toBe(false);
  });

  it('nickname を変更すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setNickname('新しい名前'));
    expect(result.current.isDirty).toBe(true);
  });

  it('bio を変更すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setBio('新しい自己紹介'));
    expect(result.current.isDirty).toBe(true);
  });

  it('location を変更すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setLocation('大阪'));
    expect(result.current.isDirty).toBe(true);
  });

  it('avatarLocalUri を設定すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setAvatarLocalUri('file:///avatar.jpg'));
    expect(result.current.isDirty).toBe(true);
  });

  it('headerLocalUri を設定すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setHeaderLocalUri('file:///header.jpg'));
    expect(result.current.isDirty).toBe(true);
  });

  it('isPublic を変更すると true になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setIsPublic(false));
    expect(result.current.isDirty).toBe(true);
  });

  it('元の値に戻すと false になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setNickname('変更'));
    expect(result.current.isDirty).toBe(true);

    act(() => result.current.setNickname('松の匠'));
    expect(result.current.isDirty).toBe(false);
  });

  it('emptyDefaults で初期化後に実 profile が渡されると isDirty=false になる', () => {
    // emptyDefaults（id=''）で初期化
    const emptyDefaults: Parameters<typeof useProfileEdit>[0] = {
      id: '',
      email: '',
      nickname: '',
      avatarUrl: null,
      headerUrl: null,
      bio: null,
      location: null,
      isPublic: true,
      bonsaiStartYear: null,
      bonsaiStartMonth: null,
      birthDate: null,
      isPremium: false,
    };

    const { result, rerender } = renderHook(
      (profile: Parameters<typeof useProfileEdit>[0]) => useProfileEdit(profile),
      { initialProps: emptyDefaults }
    );

    // emptyDefaults 状態では isDirty=false
    expect(result.current.isDirty).toBe(false);

    // 実 profile が到達（id が変化 → syncedProfileId パターンでリセット）
    rerender(BASE_PROFILE);

    // 変更を加えていないので isDirty は false のまま
    expect(result.current.isDirty).toBe(false);
  });

  it('emptyDefaults → 実 profile 到達後に変更を加えると isDirty=true になる', () => {
    const emptyDefaults: Parameters<typeof useProfileEdit>[0] = {
      id: '',
      email: '',
      nickname: '',
      avatarUrl: null,
      headerUrl: null,
      bio: null,
      location: null,
      isPublic: true,
      bonsaiStartYear: null,
      bonsaiStartMonth: null,
      birthDate: null,
      isPremium: false,
    };

    const { result, rerender } = renderHook(
      (profile: Parameters<typeof useProfileEdit>[0]) => useProfileEdit(profile),
      { initialProps: emptyDefaults }
    );

    // 実 profile 到達
    rerender(BASE_PROFILE);
    expect(result.current.isDirty).toBe(false);

    // 変更を加える
    act(() => result.current.setNickname('変更後のニックネーム'));
    expect(result.current.isDirty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateNickname
// ---------------------------------------------------------------------------

describe('validateNickname (handleNicknameBlur)', () => {
  it('空文字は「入力してください」エラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname(''));
    act(() => result.current.handleNicknameBlur());

    expect(result.current.errors.nickname).toContain('入力してください');
  });

  it('空白のみは「入力してください」エラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname('   '));
    act(() => result.current.handleNicknameBlur());

    expect(result.current.errors.nickname).toContain('入力してください');
  });

  it(`MAX_NICKNAME_LENGTH(${MAX_NICKNAME_LENGTH})文字を超えるとエラー`, () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname('a'.repeat(MAX_NICKNAME_LENGTH + 1)));
    act(() => result.current.handleNicknameBlur());

    expect(result.current.errors.nickname).toContain(String(MAX_NICKNAME_LENGTH));
  });

  it(`MAX_NICKNAME_LENGTH(${MAX_NICKNAME_LENGTH})文字はエラーなし`, () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname('a'.repeat(MAX_NICKNAME_LENGTH)));
    act(() => result.current.handleNicknameBlur());

    expect(result.current.errors.nickname).toBeNull();
  });

  it('正常値はエラーなし', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname('盆栽太郎'));
    act(() => result.current.handleNicknameBlur());

    expect(result.current.errors.nickname).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateBio
// ---------------------------------------------------------------------------

describe('validateBio (handleBioBlur)', () => {
  it(`MAX_BIO_LENGTH(${MAX_BIO_LENGTH})文字を超えるとエラー`, () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBio('あ'.repeat(MAX_BIO_LENGTH + 1)));
    act(() => result.current.handleBioBlur());

    expect(result.current.errors.bio).toContain(String(MAX_BIO_LENGTH));
  });

  it('空文字はエラーなし（bio は任意）', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBio(''));
    act(() => result.current.handleBioBlur());

    expect(result.current.errors.bio).toBeNull();
  });

  it(`MAX_BIO_LENGTH(${MAX_BIO_LENGTH})文字はエラーなし`, () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBio('a'.repeat(MAX_BIO_LENGTH)));
    act(() => result.current.handleBioBlur());

    expect(result.current.errors.bio).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateLocation
// ---------------------------------------------------------------------------

describe('validateLocation (handleLocationBlur)', () => {
  it(`MAX_LOCATION_LENGTH(${MAX_LOCATION_LENGTH})文字を超えるとエラー`, () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setLocation('a'.repeat(MAX_LOCATION_LENGTH + 1)));
    act(() => result.current.handleLocationBlur());

    expect(result.current.errors.location).toContain(String(MAX_LOCATION_LENGTH));
  });

  it('空文字はエラーなし（location は任意）', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setLocation(''));
    act(() => result.current.handleLocationBlur());

    expect(result.current.errors.location).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateBonsaiStartYear
// ---------------------------------------------------------------------------

describe('validateBonsaiStartYear (handleBonsaiStartYearBlur)', () => {
  it('空文字はエラーなし', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear(''));
    act(() => result.current.handleBonsaiStartYearBlur());

    expect(result.current.errors.bonsaiStartYear).toBeNull();
  });

  it('4桁の有効な年はエラーなし', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear('2020'));
    act(() => result.current.handleBonsaiStartYearBlur());

    expect(result.current.errors.bonsaiStartYear).toBeNull();
  });

  it('USER_BONSAI_START_MIN_YEAR 未満はエラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear(String(USER_BONSAI_START_MIN_YEAR - 1)));
    act(() => result.current.handleBonsaiStartYearBlur());

    expect(result.current.errors.bonsaiStartYear).toBeTruthy();
  });

  it('4桁でない数値はエラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear('202'));
    act(() => result.current.handleBonsaiStartYearBlur());

    expect(result.current.errors.bonsaiStartYear).toBeTruthy();
  });

  it('文字列（非数値）はエラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear('abcd'));
    act(() => result.current.handleBonsaiStartYearBlur());

    expect(result.current.errors.bonsaiStartYear).toBeTruthy();
  });

  it('年が空になると月もクリアされる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear(''));

    expect(result.current.form.bonsaiStartMonth).toBe('');
  });
});

// ---------------------------------------------------------------------------
// validateBonsaiStartMonth
// ---------------------------------------------------------------------------

describe('validateBonsaiStartMonth (handleBonsaiStartMonthBlur)', () => {
  it('空文字はエラーなし', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartMonth(''));
    act(() => result.current.handleBonsaiStartMonthBlur());

    expect(result.current.errors.bonsaiStartMonth).toBeNull();
  });

  it('1〜12 はエラーなし', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    for (const month of ['1', '6', '12']) {
      act(() => result.current.setBonsaiStartMonth(month));
      act(() => result.current.handleBonsaiStartMonthBlur());
      expect(result.current.errors.bonsaiStartMonth).toBeNull();
    }
  });

  it('0 はエラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartMonth('0'));
    act(() => result.current.handleBonsaiStartMonthBlur());

    expect(result.current.errors.bonsaiStartMonth).toBeTruthy();
  });

  it('13 以上はエラー', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartMonth('13'));
    act(() => result.current.handleBonsaiStartMonthBlur());

    expect(result.current.errors.bonsaiStartMonth).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// isValid
// ---------------------------------------------------------------------------

describe('isValid', () => {
  it('初期状態（有効なプロフィール）は true', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    expect(result.current.isValid).toBe(true);
  });

  it('nickname を空にすると false になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setNickname(''));
    expect(result.current.isValid).toBe(false);
  });

  it('bio が上限を超えると false になる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    act(() => result.current.setBio('a'.repeat(MAX_BIO_LENGTH + 1)));
    expect(result.current.isValid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// buildUpdateRequest
// ---------------------------------------------------------------------------

describe('buildUpdateRequest', () => {
  it('変更がない場合は空のオブジェクトを返す', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));
    const request = result.current.buildUpdateRequest(null, null);
    expect(request).toEqual({});
  });

  it('nickname が変更された場合は request に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname('新しいニックネーム'));
    const request = result.current.buildUpdateRequest(null, null);

    expect(request.nickname).toBe('新しいニックネーム');
  });

  it('bio が変更された場合は request に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBio('新しい自己紹介'));
    const request = result.current.buildUpdateRequest(null, null);

    expect(request.bio).toBe('新しい自己紹介');
  });

  it('bio が空文字に変更された場合は undefined が入る', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBio(''));
    const request = result.current.buildUpdateRequest(null, null);

    expect(request.bio).toBeUndefined();
  });

  it('uploadedAvatarUrl が null でない場合は request.avatarUrl に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    const request = result.current.buildUpdateRequest('https://cdn.bon-log.com/avatar.jpg', null);

    expect(request.avatarUrl).toBe('https://cdn.bon-log.com/avatar.jpg');
  });

  it('uploadedHeaderUrl が null でない場合は request.headerUrl に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    const request = result.current.buildUpdateRequest(null, 'https://cdn.bon-log.com/header.jpg');

    expect(request.headerUrl).toBe('https://cdn.bon-log.com/header.jpg');
  });

  it('bonsaiStartYear の変更が request に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setBonsaiStartYear('2010'));
    const request = result.current.buildUpdateRequest(null, null);

    expect(request.bonsaiStartYear).toBe(2010);
  });

  it('isPublic の変更が request に含まれる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setIsPublic(false));
    const request = result.current.buildUpdateRequest(null, null);

    expect(request.isPublic).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// clearErrors / setNicknameError / setFormError
// ---------------------------------------------------------------------------

describe('エラー管理', () => {
  it('clearErrors はすべてのエラーを null にリセットする', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNickname(''));
    act(() => result.current.handleNicknameBlur());
    expect(result.current.errors.nickname).toBeTruthy();

    act(() => result.current.clearErrors());
    expect(result.current.errors.nickname).toBeNull();
    expect(result.current.errors.bio).toBeNull();
    expect(result.current.errors.form).toBeNull();
  });

  it('setNicknameError は nickname エラーを直接設定できる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setNicknameError('外部からのエラー'));

    expect(result.current.errors.nickname).toBe('外部からのエラー');
  });

  it('setFormError はフォームレベルエラーを設定できる', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setFormError('送信に失敗しました'));

    expect(result.current.errors.form).toBe('送信に失敗しました');
  });
});

// ---------------------------------------------------------------------------
// setAvatarUrl / setHeaderUrl
// ---------------------------------------------------------------------------

describe('setAvatarUrl / setHeaderUrl', () => {
  it('setAvatarUrl は avatarUrl を更新し avatarLocalUri を null にリセットする', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setAvatarLocalUri('file:///local-avatar.jpg'));
    expect(result.current.form.avatarLocalUri).toBe('file:///local-avatar.jpg');

    act(() => result.current.setAvatarUrl('https://cdn.bon-log.com/avatar.jpg'));
    expect(result.current.form.avatarUrl).toBe('https://cdn.bon-log.com/avatar.jpg');
    expect(result.current.form.avatarLocalUri).toBeNull();
  });

  it('setHeaderUrl は headerUrl を更新し headerLocalUri を null にリセットする', () => {
    const { result } = renderHook(() => useProfileEdit(BASE_PROFILE));

    act(() => result.current.setHeaderLocalUri('file:///local-header.jpg'));
    expect(result.current.form.headerLocalUri).toBe('file:///local-header.jpg');

    act(() => result.current.setHeaderUrl('https://cdn.bon-log.com/header.jpg'));
    expect(result.current.form.headerUrl).toBe('https://cdn.bon-log.com/header.jpg');
    expect(result.current.form.headerLocalUri).toBeNull();
  });
});
