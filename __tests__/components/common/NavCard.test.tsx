/**
 * components/common/NavCard のコンポーネントテスト。
 * ラベル・説明・カウントバッジ・アイコン表示と onPress・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavCard } from '@/components/common/NavCard';

const baseProps = {
  iconName: 'leaf-outline' as const,
  label: '農薬一覧',
  description: '登録済み農薬を検索できます',
  onPress: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// ラベル・説明
// ---------------------------------------------------------------------------

describe('NavCard ラベルと説明', () => {
  it('label テキストが表示される', () => {
    render(<NavCard {...baseProps} />);
    expect(screen.getByText('農薬一覧')).toBeTruthy();
  });

  it('description テキストが表示される', () => {
    render(<NavCard {...baseProps} />);
    expect(screen.getByText('登録済み農薬を検索できます')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// カウントバッジ
// ---------------------------------------------------------------------------

describe('NavCard カウントバッジ', () => {
  it('count が指定されていないときはバッジが表示されない', () => {
    render(<NavCard {...baseProps} />);
    expect(screen.queryByText(/^\d+$/)).toBeNull();
  });

  it('count が 0 のときはバッジが表示されない', () => {
    render(<NavCard {...baseProps} count={0} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('count が正の数のときにバッジ数値が表示される', () => {
    render(<NavCard {...baseProps} count={42} />);
    expect(screen.getByText('42')).toBeTruthy();
  });

  it('count=1 でもバッジが表示される', () => {
    render(<NavCard {...baseProps} count={1} />);
    expect(screen.getByText('1')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アイコン表示
// ---------------------------------------------------------------------------

describe('NavCard アイコン', () => {
  it('iconName に対応するアイコンがレンダリングツリーに存在する', () => {
    const { toJSON } = render(<NavCard {...baseProps} iconName="flask-outline" />);
    expect(JSON.stringify(toJSON())).toContain('flask-outline');
  });

  it('chevron-forward アイコンがレンダリングツリーに存在する', () => {
    const { toJSON } = render(<NavCard {...baseProps} />);
    expect(JSON.stringify(toJSON())).toContain('chevron-forward');
  });
});

// ---------------------------------------------------------------------------
// onPress
// ---------------------------------------------------------------------------

describe('NavCard onPress', () => {
  it('カードをタップすると onPress が呼ばれる', () => {
    render(<NavCard {...baseProps} />);
    fireEvent.press(screen.getByLabelText('農薬一覧へ移動'));
    expect(baseProps.onPress).toHaveBeenCalledTimes(1);
  });

  it('複数回タップすると onPress が複数回呼ばれる', () => {
    render(<NavCard {...baseProps} />);
    const btn = screen.getByLabelText('農薬一覧へ移動');
    fireEvent.press(btn);
    fireEvent.press(btn);
    expect(baseProps.onPress).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('NavCard アクセシビリティ', () => {
  it('accessibilityRole が button である', () => {
    render(<NavCard {...baseProps} />);
    const btn = screen.getByLabelText('農薬一覧へ移動');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('accessibilityLabel のデフォルトは "${label}へ移動"', () => {
    render(<NavCard {...baseProps} />);
    expect(screen.getByLabelText('農薬一覧へ移動')).toBeTruthy();
  });

  it('accessibilityLabel を明示指定するとその値が使われる', () => {
    render(<NavCard {...baseProps} accessibilityLabel="農薬一覧ページへ" />);
    expect(screen.getByLabelText('農薬一覧ページへ')).toBeTruthy();
  });

  it('タップターゲットの minHeight が 44 以上である（44pt ルール）', () => {
    const { toJSON } = render(<NavCard {...baseProps} />);
    const raw = toJSON();
    const json = (Array.isArray(raw) ? raw[0] : raw) as { props: { style?: Record<string, unknown> | Array<Record<string, unknown>> } } | null;
    if (json === null) throw new Error('toJSON returned null');
    const style = Array.isArray(json.props.style)
      ? Object.assign({}, ...json.props.style)
      : (json.props.style ?? {});
    expect(Number(style.minHeight)).toBeGreaterThanOrEqual(44);
  });
});
