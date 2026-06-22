/**
 * components/bonsai/DateField のユニットテスト。
 * 表示・入力・クリア・バリデーション・disabled 状態を検証する。
 */

import React from 'react';
import { screen, fireEvent, render } from '@testing-library/react-native';
import { DateField } from '@/components/bonsai/DateField';

describe('DateField', () => {
  describe('ラベル表示', () => {
    it('label プロパティがテキストとして表示される', () => {
      render(<DateField label="取得日" value={null} onChange={jest.fn()} />);
      expect(screen.getByText('取得日')).toBeTruthy();
    });

    it('年・月・日のプレースホルダーが表示される', () => {
      render(<DateField label="取得日" value={null} onChange={jest.fn()} />);
      expect(screen.getByLabelText('取得日 年')).toBeTruthy();
      expect(screen.getByLabelText('取得日 月')).toBeTruthy();
      expect(screen.getByLabelText('取得日 日')).toBeTruthy();
    });
  });

  describe('value のパース', () => {
    it('ISO 日付文字列が年・月・日に分解されて表示される', () => {
      render(<DateField label="取得日" value="2023-06-15" onChange={jest.fn()} />);
      const yearInput = screen.getByLabelText('取得日 年');
      const monthInput = screen.getByLabelText('取得日 月');
      const dayInput = screen.getByLabelText('取得日 日');
      expect(yearInput.props.value).toBe('2023');
      expect(monthInput.props.value).toBe('6');
      expect(dayInput.props.value).toBe('15');
    });

    it('value=null のとき全フィールドが空', () => {
      render(<DateField label="取得日" value={null} onChange={jest.fn()} />);
      const yearInput = screen.getByLabelText('取得日 年');
      expect(yearInput.props.value).toBe('');
    });

    it('先頭ゼロを含む月日が正規化される（「06」→「6」）', () => {
      render(<DateField label="取得日" value="2025-06-08" onChange={jest.fn()} />);
      const monthInput = screen.getByLabelText('取得日 月');
      const dayInput = screen.getByLabelText('取得日 日');
      expect(monthInput.props.value).toBe('6');
      expect(dayInput.props.value).toBe('8');
    });
  });

  describe('年入力', () => {
    it('年を入力すると onChange が ISO 形式で呼ばれる', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value={null} onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 年'), '2025');
      expect(onChange).toHaveBeenCalledWith('2025-01-01');
    });

    it('年を空にすると onChange(null) が呼ばれる', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value="2025-06-15" onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 年'), '');
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('数字以外の文字が除去される', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value={null} onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 年'), '2025abc');
      expect(onChange).toHaveBeenCalledWith('2025-01-01');
    });
  });

  describe('月入力', () => {
    it('年が設定されている場合に月を入力すると onChange が呼ばれる', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value="2025-01-01" onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 月'), '9');
      expect(onChange).toHaveBeenCalledWith('2025-09-01');
    });

    it('年が未入力の場合は月の入力が無視される', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value={null} onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 月'), '6');
      expect(onChange).not.toHaveBeenCalled();
    });

    it('13 以上の月は onChange を呼ばない', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value="2025-01-01" onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 月'), '13');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('日入力', () => {
    it('年が設定されている場合に日を入力すると onChange が呼ばれる', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value="2025-06-01" onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 日'), '20');
      expect(onChange).toHaveBeenCalledWith('2025-06-20');
    });

    it('年が未入力の場合は日の入力が無視される', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value={null} onChange={onChange} />);
      fireEvent.changeText(screen.getByLabelText('取得日 日'), '15');
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('クリアボタン', () => {
    it('value が null のときクリアボタンが表示されない', () => {
      render(<DateField label="取得日" value={null} onChange={jest.fn()} />);
      expect(screen.queryByRole('button', { name: '日付を削除' })).toBeNull();
    });

    it('value が設定されているときクリアボタンが表示される', () => {
      render(<DateField label="取得日" value="2025-06-15" onChange={jest.fn()} />);
      expect(screen.getByRole('button', { name: '日付を削除' })).toBeTruthy();
    });

    it('クリアボタンを押すと onChange(null) が呼ばれる', () => {
      const onChange = jest.fn();
      render(<DateField label="取得日" value="2025-06-15" onChange={onChange} />);
      fireEvent.press(screen.getByRole('button', { name: '日付を削除' }));
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it('clearAccessibilityLabel でクリアボタンのラベルをカスタマイズできる', () => {
      render(
        <DateField
          label="記録日"
          value="2025-06-15"
          onChange={jest.fn()}
          clearAccessibilityLabel="記録日を削除"
        />
      );
      expect(screen.getByRole('button', { name: '記録日を削除' })).toBeTruthy();
    });
  });

  describe('disabled 状態', () => {
    it('disabled=true のとき年フィールドが編集不可になる', () => {
      render(<DateField label="取得日" value={null} onChange={jest.fn()} disabled />);
      const yearInput = screen.getByLabelText('取得日 年');
      expect(yearInput.props.editable).toBe(false);
    });

    it('disabled=true のとき月フィールドが編集不可になる', () => {
      render(<DateField label="取得日" value="2025-06-15" onChange={jest.fn()} disabled />);
      const monthInput = screen.getByLabelText('取得日 月');
      expect(monthInput.props.editable).toBe(false);
    });
  });
});
