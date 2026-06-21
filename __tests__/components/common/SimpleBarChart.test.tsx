/**
 * components/common/SimpleBarChart・HormoneSeasonalChart のユニットテスト。
 * バー描画・空データ・opacity スケール・アクセシビリティを検証する。
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SimpleBarChart, HormoneSeasonalChart } from '@/components/common/SimpleBarChart';

// ---------------------------------------------------------------------------
// SimpleBarChart
// ---------------------------------------------------------------------------

describe('SimpleBarChart', () => {
  const baseData = [
    { label: '5/1', value: 10, accessibilityLabel: '5月1日: 10' },
    { label: '5/8', value: 5, accessibilityLabel: '5月8日: 5' },
    { label: '5/15', value: 8, accessibilityLabel: '5月15日: 8' },
  ];

  it('各バーのアクセシビリティラベルが表示される', () => {
    render(<SimpleBarChart data={baseData} />);
    expect(screen.getByLabelText('5月1日: 10')).toBeTruthy();
    expect(screen.getByLabelText('5月8日: 5')).toBeTruthy();
    expect(screen.getByLabelText('5月15日: 8')).toBeTruthy();
  });

  it('各バーのラベルテキストが表示される', () => {
    render(<SimpleBarChart data={baseData} />);
    expect(screen.getByText('5/1')).toBeTruthy();
    expect(screen.getByText('5/8')).toBeTruthy();
    expect(screen.getByText('5/15')).toBeTruthy();
  });

  it('グラフ全体の accessibilityLabel が設定される', () => {
    render(
      <SimpleBarChart
        data={baseData}
        accessibilityLabel="30日間のフォロワー推移グラフ"
      />
    );
    expect(screen.getByLabelText('30日間のフォロワー推移グラフ')).toBeTruthy();
  });

  it('accessibilityLabel を省略するとデフォルト値「バーグラフ」が設定される', () => {
    render(<SimpleBarChart data={baseData} />);
    expect(screen.getByLabelText('バーグラフ')).toBeTruthy();
  });

  it('空データのとき何も描画されない（null を返す）', () => {
    const { toJSON } = render(<SimpleBarChart data={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('value が 0 のバーでも描画される（最小高さがある）', () => {
    const data = [
      { label: '5/1', value: 0, accessibilityLabel: '5月1日: 0' },
      { label: '5/8', value: 10, accessibilityLabel: '5月8日: 10' },
    ];
    render(<SimpleBarChart data={data} />);
    expect(screen.getByLabelText('5月1日: 0')).toBeTruthy();
  });

  it('useOpacityScale=true のとき opacity が設定される', () => {
    const data = [
      { label: '1月', value: 10, accessibilityLabel: '1月: 10' },
      { label: '6月', value: 3, accessibilityLabel: '6月: 3' },
    ];
    const { toJSON } = render(<SimpleBarChart data={data} useOpacityScale />);
    expect(toJSON()).not.toBeNull();
  });

  it('全バーの value が同一でも描画される（maxValue=value）', () => {
    const data = [
      { label: 'A', value: 5, accessibilityLabel: 'A: 5' },
      { label: 'B', value: 5, accessibilityLabel: 'B: 5' },
    ];
    render(<SimpleBarChart data={data} />);
    expect(screen.getByLabelText('A: 5')).toBeTruthy();
    expect(screen.getByLabelText('B: 5')).toBeTruthy();
  });

  it('単一データポイントでも描画される', () => {
    const data = [{ label: '1月', value: 100, accessibilityLabel: '1月: 100' }];
    render(<SimpleBarChart data={data} />);
    expect(screen.getByLabelText('1月: 100')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// HormoneSeasonalChart
// ---------------------------------------------------------------------------

describe('HormoneSeasonalChart', () => {
  const baseLevels = [
    { month: 3, level: 'high' },
    { month: 6, level: 'moderate' },
    { month: 9, level: 'low' },
    { month: 12, level: 'minimal' },
  ];

  it('各月のアクセシビリティラベルが表示される', () => {
    render(<HormoneSeasonalChart seasonalLevels={baseLevels} />);
    expect(screen.getByLabelText('3月: レベル high')).toBeTruthy();
    expect(screen.getByLabelText('6月: レベル moderate')).toBeTruthy();
    expect(screen.getByLabelText('9月: レベル low')).toBeTruthy();
    expect(screen.getByLabelText('12月: レベル minimal')).toBeTruthy();
  });

  it('グラフ全体のアクセシビリティラベルが「季節的変動グラフ」である', () => {
    render(<HormoneSeasonalChart seasonalLevels={baseLevels} />);
    expect(screen.getByLabelText('季節的変動グラフ')).toBeTruthy();
  });

  it('各月のラベル数字が表示される', () => {
    render(<HormoneSeasonalChart seasonalLevels={baseLevels} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('9')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('空データのとき何も描画されない（null を返す）', () => {
    const { toJSON } = render(<HormoneSeasonalChart seasonalLevels={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('順番が逆でも month 順にソートされる', () => {
    const unordered = [
      { month: 12, level: 'minimal' },
      { month: 3, level: 'high' },
      { month: 6, level: 'moderate' },
    ];
    render(<HormoneSeasonalChart seasonalLevels={unordered} />);
    expect(screen.getByLabelText('3月: レベル high')).toBeTruthy();
    expect(screen.getByLabelText('12月: レベル minimal')).toBeTruthy();
  });

  it('未知の level 値でも描画エラーにならない（value=0 として扱われる）', () => {
    const levels = [{ month: 5, level: 'unknown_level' }];
    render(<HormoneSeasonalChart seasonalLevels={levels} />);
    expect(screen.getByLabelText('5月: レベル unknown_level')).toBeTruthy();
  });

  it('12ヶ月すべてのデータを描画できる', () => {
    const allMonths = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      level: 'moderate',
    }));
    render(<HormoneSeasonalChart seasonalLevels={allMonths} />);
    expect(screen.getByLabelText('1月: レベル moderate')).toBeTruthy();
    expect(screen.getByLabelText('12月: レベル moderate')).toBeTruthy();
  });
});
