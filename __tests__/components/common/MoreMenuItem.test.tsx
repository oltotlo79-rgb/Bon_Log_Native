/**
 * @module __tests__/components/common/MoreMenuItem
 * components/common/MoreMenuItem のコンポーネントテスト。
 * rightElement 種別・destructive・disabled・accessibilityLabel を検証する。
 */

import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MoreMenuItem } from '@/components/common/MoreMenuItem';

// ---------------------------------------------------------------------------
// ヘルパー
// ---------------------------------------------------------------------------

const noop = jest.fn();

function renderItem(overrides?: Partial<React.ComponentProps<typeof MoreMenuItem>>) {
  return render(
    <MoreMenuItem
      label="テスト項目"
      onPress={noop}
      accessibilityLabel="テスト項目を実行"
      {...overrides}
    />
  );
}

// ---------------------------------------------------------------------------
// ラベル表示
// ---------------------------------------------------------------------------

describe('MoreMenuItem ラベル表示', () => {
  it('label に渡したテキストが表示される', () => {
    renderItem({ label: '設定' });
    expect(screen.getByText('設定')).toBeTruthy();
  });

  it('description を渡すと説明テキストが表示される', () => {
    renderItem({ description: 'アカウントの各種設定' });
    expect(screen.getByText('アカウントの各種設定')).toBeTruthy();
  });

  it('description を省略すると説明テキストは表示されない', () => {
    renderItem();
    expect(screen.queryByText('アカウントの各種設定')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// rightElement 種別
// RNTL の getByText/getByTestId はアクセシビリティツリーから非表示要素を除外するため、
// chevron と外部リンクアイコンは toJSON() で存在確認する
// ---------------------------------------------------------------------------

describe('MoreMenuItem rightElement', () => {
  it('rightElement を省略すると chevron（›）がレンダリングツリーに含まれる', () => {
    const { toJSON } = renderItem();
    expect(JSON.stringify(toJSON())).toContain('›');
  });

  it('rightElement="chevron" のとき chevron（›）がレンダリングツリーに含まれる', () => {
    const { toJSON } = renderItem({ rightElement: 'chevron' });
    expect(JSON.stringify(toJSON())).toContain('›');
  });

  it('rightElement="external" のとき chevron は含まれず外部リンクアイコンが含まれる', () => {
    const { toJSON } = renderItem({ rightElement: 'external' });
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('›');
    // モックの Ionicons は open-outline をテキストとしてレンダリングする
    expect(tree).toContain('open-outline');
  });

  it('rightElement="none" のとき chevron も外部リンクアイコンも含まれない', () => {
    const { toJSON } = renderItem({ rightElement: 'none' });
    const tree = JSON.stringify(toJSON());
    expect(tree).not.toContain('›');
    expect(tree).not.toContain('open-outline');
  });
});

// ---------------------------------------------------------------------------
// icon スロット
// icon コンテナは accessibilityElementsHidden=true のため toJSON() で確認する
// ---------------------------------------------------------------------------

describe('MoreMenuItem icon', () => {
  it('icon を渡すとレンダリングツリーに icon が含まれる', () => {
    const { toJSON } = renderItem({
      icon: <Text testID="custom-icon">カスタムアイコン</Text>,
    });
    // toJSON の文字列で icon テキストが含まれているか確認する
    expect(JSON.stringify(toJSON())).toContain('カスタムアイコン');
  });

  it('icon を省略してもクラッシュしない', () => {
    expect(() => renderItem({ icon: undefined })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// destructive
// ---------------------------------------------------------------------------

describe('MoreMenuItem destructive', () => {
  it('destructive=false（デフォルト）のときラベルは通常色でレンダリングされる', () => {
    renderItem({ label: '通常操作' });
    expect(screen.getByText('通常操作')).toBeTruthy();
  });

  it('destructive=true のときラベルがレンダリングされる（色は StyleSheet で制御）', () => {
    renderItem({ label: '削除', destructive: true });
    expect(screen.getByText('削除')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// disabled
// ---------------------------------------------------------------------------

describe('MoreMenuItem disabled', () => {
  it('disabled=false のとき accessibilityState.disabled が false', () => {
    renderItem({ disabled: false });
    const button = screen.getByLabelText('テスト項目を実行');
    expect(button.props.accessibilityState?.disabled).toBe(false);
  });

  it('disabled=true のとき accessibilityState.disabled が true', () => {
    renderItem({ disabled: true });
    const button = screen.getByLabelText('テスト項目を実行');
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('disabled=true のとき onPress が呼ばれない', () => {
    const onPress = jest.fn();
    renderItem({ disabled: true, onPress });
    fireEvent.press(screen.getByLabelText('テスト項目を実行'));
    // TouchableOpacity は disabled のとき onPress を発火しない
    expect(onPress).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// accessibilityLabel
// ---------------------------------------------------------------------------

describe('MoreMenuItem accessibilityLabel', () => {
  it('accessibilityLabel が button ロールに設定される', () => {
    renderItem({ accessibilityLabel: 'プロフィールを見る' });
    expect(screen.getByRole('button', { name: 'プロフィールを見る' })).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// showBorder
// ---------------------------------------------------------------------------

describe('MoreMenuItem showBorder', () => {
  it('showBorder=true のときもクラッシュしない', () => {
    expect(() => renderItem({ showBorder: true })).not.toThrow();
  });

  it('showBorder=false のときもクラッシュしない', () => {
    expect(() => renderItem({ showBorder: false })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// onPress コールバック
// ---------------------------------------------------------------------------

describe('MoreMenuItem onPress', () => {
  it('タップすると onPress が呼ばれる', () => {
    const onPress = jest.fn();
    renderItem({ onPress });
    fireEvent.press(screen.getByLabelText('テスト項目を実行'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
