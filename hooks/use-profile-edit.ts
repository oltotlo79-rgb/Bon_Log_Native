/**
 * @module hooks/use-profile-edit
 * プロフィール編集フォームの状態管理フック。
 * フォームフィールドの変更追跡・バリデーション・差分検出を担う。
 */

import { useState, useCallback, useMemo } from 'react';
import type { UsersMeFullResponse, UpdateProfileRequest } from '@/lib/queries/users';
import {
  MAX_NICKNAME_LENGTH,
  MAX_BIO_LENGTH,
  MAX_LOCATION_LENGTH,
  USER_BONSAI_START_MIN_YEAR,
  USER_BONSAI_START_YEAR_DIGITS,
  USER_BONSAI_START_MIN_MONTH,
  USER_BONSAI_START_MAX_MONTH,
} from '@/lib/constants/limits/auth';
import {
  ERR_NICKNAME_REQUIRED,
  ERR_NICKNAME_TOO_LONG,
  ERR_BIO_TOO_LONG,
  ERR_LOCATION_TOO_LONG,
  ERR_BONSAI_YEAR_INVALID,
  ERR_BONSAI_MONTH_INVALID,
} from '@/lib/constants/errors';

export type ProfileFormState = {
  nickname: string;
  bio: string;
  location: string;
  bonsaiStartYear: string;
  bonsaiStartMonth: string;
  birthDate: string | null;
  isPublic: boolean;
  avatarLocalUri: string | null;
  headerLocalUri: string | null;
  avatarUrl: string | null;
  headerUrl: string | null;
};

export type ProfileFormErrors = {
  nickname: string | null;
  bio: string | null;
  location: string | null;
  bonsaiStartYear: string | null;
  bonsaiStartMonth: string | null;
  form: string | null;
};

function buildInitialState(profile: UsersMeFullResponse): ProfileFormState {
  return {
    nickname: profile.nickname ?? '',
    bio: profile.bio ?? '',
    location: profile.location ?? '',
    bonsaiStartYear: profile.bonsaiStartYear !== null && profile.bonsaiStartYear !== undefined
      ? String(profile.bonsaiStartYear)
      : '',
    bonsaiStartMonth: profile.bonsaiStartMonth !== null && profile.bonsaiStartMonth !== undefined
      ? String(profile.bonsaiStartMonth)
      : '',
    birthDate: profile.birthDate ?? null,
    isPublic: profile.isPublic ?? true,
    avatarLocalUri: null,
    headerLocalUri: null,
    avatarUrl: profile.avatarUrl ?? null,
    headerUrl: profile.headerUrl ?? null,
  };
}

function currentYear(): number {
  return new Date().getFullYear();
}

export function useProfileEdit(profile: UsersMeFullResponse) {
  const initialState = useMemo(() => buildInitialState(profile), [profile]);

  // profile.id をキーとして保持し、変化時にフォームをリセットする。
  // useEffect + setState は cascading render ルールに抵触し、ref アクセスもレンダー中禁止のため、
  // React の "storing previous values in state" パターンで対応する。
  const [syncedProfileId, setSyncedProfileId] = useState<string>(profile.id);
  const [form, setForm] = useState<ProfileFormState>(initialState);
  if (syncedProfileId !== profile.id) {
    setSyncedProfileId(profile.id);
    setForm(initialState);
  }

  const [errors, setErrors] = useState<ProfileFormErrors>({
    nickname: null,
    bio: null,
    location: null,
    bonsaiStartYear: null,
    bonsaiStartMonth: null,
    form: null,
  });

  const isDirty = useMemo(() => {
    if (form.nickname !== initialState.nickname) return true;
    if (form.bio !== initialState.bio) return true;
    if (form.location !== initialState.location) return true;
    if (form.bonsaiStartYear !== initialState.bonsaiStartYear) return true;
    if (form.bonsaiStartMonth !== initialState.bonsaiStartMonth) return true;
    if (form.birthDate !== initialState.birthDate) return true;
    if (form.isPublic !== initialState.isPublic) return true;
    if (form.avatarLocalUri !== null) return true;
    if (form.headerLocalUri !== null) return true;
    return false;
  }, [form, initialState]);

  function validateNickname(value: string): string | null {
    if (value.trim().length === 0) return ERR_NICKNAME_REQUIRED;
    if (value.length > MAX_NICKNAME_LENGTH) return ERR_NICKNAME_TOO_LONG(MAX_NICKNAME_LENGTH);
    return null;
  }

  function validateBio(value: string): string | null {
    if (value.length > MAX_BIO_LENGTH) return ERR_BIO_TOO_LONG(MAX_BIO_LENGTH);
    return null;
  }

  function validateLocation(value: string): string | null {
    if (value.length > MAX_LOCATION_LENGTH) return ERR_LOCATION_TOO_LONG(MAX_LOCATION_LENGTH);
    return null;
  }

  function validateBonsaiStartYear(value: string): string | null {
    if (value === '') return null;
    const year = Number(value);
    if (!Number.isInteger(year) || value.length !== USER_BONSAI_START_YEAR_DIGITS) return ERR_BONSAI_YEAR_INVALID;
    if (year < USER_BONSAI_START_MIN_YEAR || year > currentYear()) return ERR_BONSAI_YEAR_INVALID;
    return null;
  }

  function validateBonsaiStartMonth(value: string): string | null {
    if (value === '') return null;
    const month = Number(value);
    if (!Number.isInteger(month) || month < USER_BONSAI_START_MIN_MONTH || month > USER_BONSAI_START_MAX_MONTH) return ERR_BONSAI_MONTH_INVALID;
    return null;
  }

  const isValid = useMemo(() => {
    if (validateNickname(form.nickname) !== null) return false;
    if (validateBio(form.bio) !== null) return false;
    if (validateLocation(form.location) !== null) return false;
    if (validateBonsaiStartYear(form.bonsaiStartYear) !== null) return false;
    if (validateBonsaiStartMonth(form.bonsaiStartMonth) !== null) return false;
    return true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.nickname, form.bio, form.location, form.bonsaiStartYear, form.bonsaiStartMonth]);

  const setNickname = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, nickname: value }));
  }, []);

  const setBio = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, bio: value }));
  }, []);

  const setLocation = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, location: value }));
  }, []);

  const setBonsaiStartYear = useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      bonsaiStartYear: value,
      // 年が空になったら月もクリアする
      bonsaiStartMonth: value === '' ? '' : prev.bonsaiStartMonth,
    }));
  }, []);

  const setBonsaiStartMonth = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, bonsaiStartMonth: value }));
  }, []);

  const setBirthDate = useCallback((value: string | null) => {
    setForm((prev) => ({ ...prev, birthDate: value }));
  }, []);

  const setIsPublic = useCallback((value: boolean) => {
    setForm((prev) => ({ ...prev, isPublic: value }));
  }, []);

  const setAvatarLocalUri = useCallback((uri: string | null) => {
    setForm((prev) => ({ ...prev, avatarLocalUri: uri }));
  }, []);

  const setHeaderLocalUri = useCallback((uri: string | null) => {
    setForm((prev) => ({ ...prev, headerLocalUri: uri }));
  }, []);

  const setAvatarUrl = useCallback((url: string | null) => {
    setForm((prev) => ({ ...prev, avatarUrl: url, avatarLocalUri: null }));
  }, []);

  const setHeaderUrl = useCallback((url: string | null) => {
    setForm((prev) => ({ ...prev, headerUrl: url, headerLocalUri: null }));
  }, []);

  const handleNicknameBlur = useCallback(() => {
    setErrors((prev) => ({ ...prev, nickname: validateNickname(form.nickname) }));
  }, [form.nickname]);

  const handleBioBlur = useCallback(() => {
    setErrors((prev) => ({ ...prev, bio: validateBio(form.bio) }));
  }, [form.bio]);

  const handleLocationBlur = useCallback(() => {
    setErrors((prev) => ({ ...prev, location: validateLocation(form.location) }));
  }, [form.location]);

  const handleBonsaiStartYearBlur = useCallback(() => {
    setErrors((prev) => ({ ...prev, bonsaiStartYear: validateBonsaiStartYear(form.bonsaiStartYear) }));
  }, [form.bonsaiStartYear]);

  const handleBonsaiStartMonthBlur = useCallback(() => {
    setErrors((prev) => ({ ...prev, bonsaiStartMonth: validateBonsaiStartMonth(form.bonsaiStartMonth) }));
  }, [form.bonsaiStartMonth]);

  const setNicknameError = useCallback((message: string | null) => {
    setErrors((prev) => ({ ...prev, nickname: message }));
  }, []);

  const setFormError = useCallback((message: string | null) => {
    setErrors((prev) => ({ ...prev, form: message }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({ nickname: null, bio: null, location: null, bonsaiStartYear: null, bonsaiStartMonth: null, form: null });
  }, []);

  function buildUpdateRequest(
    uploadedAvatarUrl: string | null,
    uploadedHeaderUrl: string | null
  ): UpdateProfileRequest {
    const request: UpdateProfileRequest = {};

    if (form.nickname !== initialState.nickname) request.nickname = form.nickname;
    if (form.bio !== initialState.bio) request.bio = form.bio || undefined;
    if (form.location !== initialState.location) request.location = form.location || undefined;

    const newYear = form.bonsaiStartYear !== '' ? Number(form.bonsaiStartYear) : null;
    const initYear = initialState.bonsaiStartYear !== '' ? Number(initialState.bonsaiStartYear) : null;
    if (newYear !== initYear) request.bonsaiStartYear = newYear ?? undefined;

    const newMonth = form.bonsaiStartMonth !== '' ? Number(form.bonsaiStartMonth) : null;
    const initMonth = initialState.bonsaiStartMonth !== '' ? Number(initialState.bonsaiStartMonth) : null;
    if (newMonth !== initMonth) request.bonsaiStartMonth = newMonth ?? undefined;

    if (form.birthDate !== initialState.birthDate) request.birthDate = form.birthDate ?? undefined;
    if (form.isPublic !== initialState.isPublic) request.isPublic = form.isPublic;

    if (uploadedAvatarUrl !== null) request.avatarUrl = uploadedAvatarUrl;
    if (uploadedHeaderUrl !== null) request.headerUrl = uploadedHeaderUrl;

    return request;
  }

  return {
    form,
    errors,
    isDirty,
    isValid,
    setNickname,
    setBio,
    setLocation,
    setBonsaiStartYear,
    setBonsaiStartMonth,
    setBirthDate,
    setIsPublic,
    setAvatarLocalUri,
    setHeaderLocalUri,
    setAvatarUrl,
    setHeaderUrl,
    handleNicknameBlur,
    handleBioBlur,
    handleLocationBlur,
    handleBonsaiStartYearBlur,
    handleBonsaiStartMonthBlur,
    setNicknameError,
    setFormError,
    clearErrors,
    buildUpdateRequest,
  };
}
