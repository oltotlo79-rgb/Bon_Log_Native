/**
 * @module components/profile/BirthdayField
 * 誕生日選択フィールド。components/common/DatePickerField（日付のみピッカー）を
 * 「誕生日（任意）」ラベル・上限＝今日の制約付きで薄くラップする。
 * Web の `<input type="date" max={今日}>`（components/user/ProfileEditForm.tsx）に一致させ、
 * 年齢範囲による下限制限は設けない（Web に対応する制約が存在しないため）。
 */

import React from 'react';
import { DatePickerField } from '@/components/common/DatePickerField';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type BirthdayFieldProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BirthdayField({ value, onChange, disabled = false }: BirthdayFieldProps) {
  return (
    <DatePickerField
      label="誕生日（任意）"
      value={value}
      onChange={onChange}
      disabled={disabled}
      maximumDate={new Date()}
      clearAccessibilityLabel="誕生日を削除"
      placeholder="誕生日を選択"
    />
  );
}
