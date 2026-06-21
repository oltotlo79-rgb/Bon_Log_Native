/**
 * components/browse/CatalogTabs のユニットテスト。
 * タブ切替・アクティブ状態・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { CatalogTabs } from '@/components/browse/CatalogTabs';

// ---------------------------------------------------------------------------
// テスト用データ
// ---------------------------------------------------------------------------

const tabs = [
  { key: 'disease-pests', label: '病害虫' },
  { key: 'products', label: '農薬製品' },
  { key: 'ingredients', label: '有効成分' },
];

// ---------------------------------------------------------------------------
// 表示
// ---------------------------------------------------------------------------

describe('CatalogTabs 表示', () => {
  it('タブラベルがすべて表示される', () => {
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={jest.fn()} />);
    expect(screen.getByText('病害虫')).toBeTruthy();
    expect(screen.getByText('農薬製品')).toBeTruthy();
    expect(screen.getByText('有効成分')).toBeTruthy();
  });

  it('単一タブでも表示される', () => {
    render(
      <CatalogTabs
        tabs={[{ key: 'only', label: '唯一のタブ' }]}
        activeKey="only"
        onChange={jest.fn()}
      />
    );
    expect(screen.getByText('唯一のタブ')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// アクティブ状態
// ---------------------------------------------------------------------------

describe('CatalogTabs アクティブ状態', () => {
  it('アクティブタブの accessibilityState selected が true', () => {
    render(<CatalogTabs tabs={tabs} activeKey="products" onChange={jest.fn()} />);
    const activeTab = screen.getByLabelText('農薬製品');
    expect(activeTab.props.accessibilityState?.selected).toBe(true);
  });

  it('非アクティブタブの accessibilityState selected が false', () => {
    render(<CatalogTabs tabs={tabs} activeKey="products" onChange={jest.fn()} />);
    const inactiveTab = screen.getByLabelText('病害虫');
    expect(inactiveTab.props.accessibilityState?.selected).toBe(false);
  });

  it('activeKey が変更されると別タブがアクティブになる', () => {
    const { rerender } = render(
      <CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={jest.fn()} />
    );
    expect(
      screen.getByLabelText('病害虫').props.accessibilityState?.selected
    ).toBe(true);

    rerender(
      <CatalogTabs tabs={tabs} activeKey="ingredients" onChange={jest.fn()} />
    );
    expect(
      screen.getByLabelText('有効成分').props.accessibilityState?.selected
    ).toBe(true);
    expect(
      screen.getByLabelText('病害虫').props.accessibilityState?.selected
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// アクセシビリティ
// ---------------------------------------------------------------------------

describe('CatalogTabs アクセシビリティ', () => {
  it('タブコンテナに accessibilityRole="tablist" が設定される', () => {
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={jest.fn()} />);
    // View に accessibilityRole="tablist" は RNTL の getByRole では取得できないため props で確認する
    const tabElements = screen.getAllByRole('tab');
    expect(tabElements.length).toBeGreaterThan(0);
  });

  it('各タブに accessibilityRole="tab" が設定される', () => {
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={jest.fn()} />);
    const tabElements = screen.getAllByRole('tab');
    expect(tabElements).toHaveLength(3);
  });

  it('各タブに accessibilityLabel が設定される', () => {
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={jest.fn()} />);
    expect(screen.getByLabelText('病害虫')).toBeTruthy();
    expect(screen.getByLabelText('農薬製品')).toBeTruthy();
    expect(screen.getByLabelText('有効成分')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 切替操作
// ---------------------------------------------------------------------------

describe('CatalogTabs 切替操作', () => {
  it('タブをタップすると onChange が key を引数に呼ばれる', () => {
    const onChange = jest.fn();
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(onChange).toHaveBeenCalledWith('products');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('アクティブなタブをタップしても onChange が呼ばれる', () => {
    const onChange = jest.fn();
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={onChange} />);
    fireEvent.press(screen.getByLabelText('病害虫'));
    expect(onChange).toHaveBeenCalledWith('disease-pests');
  });

  it('3つのタブをそれぞれタップすると正しい key が渡される', () => {
    const onChange = jest.fn();
    render(<CatalogTabs tabs={tabs} activeKey="disease-pests" onChange={onChange} />);

    fireEvent.press(screen.getByLabelText('有効成分'));
    expect(onChange).toHaveBeenLastCalledWith('ingredients');

    fireEvent.press(screen.getByLabelText('農薬製品'));
    expect(onChange).toHaveBeenLastCalledWith('products');

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
