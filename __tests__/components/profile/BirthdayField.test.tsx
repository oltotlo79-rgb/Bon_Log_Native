/**
 * @module __tests__/components/profile/BirthdayField
 * BirthdayField コンポーネントのテスト。
 * 年・月・日の入力と onChange、クリア、エラー表示を検証する。
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { BirthdayField } from '@/components/profile/BirthdayField';

describe('BirthdayField', () => {
  it('value が null のときに入力フィールドが空で描画される', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value={null} onChange={onChange} />
    );

    expect(getByLabelText('誕生年').props.value).toBe('');
    expect(getByLabelText('誕生月').props.value).toBe('');
    expect(getByLabelText('誕生日（日）').props.value).toBe('');
  });

  it('ISO 日付文字列が渡されると年・月・日が分解されて表示される', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-03-15" onChange={onChange} />
    );

    expect(getByLabelText('誕生年').props.value).toBe('2000');
    expect(getByLabelText('誕生月').props.value).toBe('3');
    expect(getByLabelText('誕生日（日）').props.value).toBe('15');
  });

  it('年を入力すると onChange が ISO 形式で呼ばれる', () => {
    const onChange = jest.fn();
    // 月・日も存在するケース
    const { getByLabelText } = render(
      <BirthdayField value="2000-01-01" onChange={onChange} />
    );

    fireEvent.changeText(getByLabelText('誕生年'), '2001');
    expect(onChange).toHaveBeenCalledWith('2001-01-01');
  });

  it('年を空にすると onChange(null) が呼ばれる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value={null} onChange={onChange} />
    );

    fireEvent.changeText(getByLabelText('誕生年'), '');
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('年が空のとき月・日は editable=false になる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value={null} onChange={onChange} />
    );

    expect(getByLabelText('誕生月').props.editable).toBe(false);
    expect(getByLabelText('誕生日（日）').props.editable).toBe(false);
  });

  it('value が有効なとき「誕生日を削除」ボタンが表示される', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-01-01" onChange={onChange} />
    );

    expect(getByLabelText('誕生日を削除')).toBeTruthy();
  });

  it('「誕生日を削除」を押すと onChange(null) が呼ばれる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-01-01" onChange={onChange} />
    );

    fireEvent.press(getByLabelText('誕生日を削除'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('value が null のとき「誕生日を削除」ボタンは非表示', () => {
    const onChange = jest.fn();
    const { queryByLabelText } = render(
      <BirthdayField value={null} onChange={onChange} />
    );

    expect(queryByLabelText('誕生日を削除')).toBeNull();
  });

  it('disabled=true のとき全フィールドが editable=false になる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-06-15" onChange={onChange} disabled />
    );

    expect(getByLabelText('誕生年').props.editable).toBe(false);
    expect(getByLabelText('誕生月').props.editable).toBe(false);
    expect(getByLabelText('誕生日（日）').props.editable).toBe(false);
  });

  it('年が範囲外のとき（例: 9999）エラーメッセージが表示される', () => {
    const onChange = jest.fn();
    // value prop に将来の年（年齢制限 13 歳以上のため現在年−12より大きい年は無効）を渡す
    const { getByText } = render(
      <BirthdayField value="9999-01-01" onChange={onChange} />
    );

    expect(getByText(/有効な年を入力してください/)).toBeTruthy();
  });

  it('月を変更すると onChange が呼ばれる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-01-15" onChange={onChange} />
    );

    fireEvent.changeText(getByLabelText('誕生月'), '6');
    expect(onChange).toHaveBeenCalledWith('2000-06-15');
  });

  it('日を変更すると onChange が呼ばれる', () => {
    const onChange = jest.fn();
    const { getByLabelText } = render(
      <BirthdayField value="2000-01-01" onChange={onChange} />
    );

    fireEvent.changeText(getByLabelText('誕生日（日）'), '20');
    expect(onChange).toHaveBeenCalledWith('2000-01-20');
  });
});
