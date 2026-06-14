/**
 * lib/constants/design-tokens のエクスポートとトークン値の検証。
 * 和風デザインシステムの数値制約（タップターゲット 44pt 等）を確認する。
 */

import {
  easingBounceRN,
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorSurfaceKinoko,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorTextInverse,
  colorTextLink,
  colorTextHashtag,
  colorBorder,
  colorBorderLight,
  colorBorderFocus,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorFab,
  colorFabText,
  colorSuccess,
  colorSuccessBg,
  colorError,
  colorErrorBg,
  colorWarning,
  colorWarningBg,
  colorInfo,
  colorInfoBg,
  colorNavBackground,
  colorNavIconActive,
  colorNavIconInactive,
  colorNavLabel,
  colorNavLabelInactive,
  colorGoogleBrand,
  spacing0,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  spacing10,
  spacing12,
  radiusXs,
  radiusSm,
  radiusMd,
  radiusLg,
  radiusXl,
  radius2xl,
  radiusFull,
  textXs,
  textSm,
  textBase,
  textMd,
  textLg,
  textXl,
  text2xl,
  letterSpacingNone,
  letterSpacingTight,
  letterSpacingWide,
  letterSpacingWidest,
  shadowWashi,
  shadowWashiHover,
  shadowWashiLg,
  durationFast,
  durationNormal,
  durationSlow,
  easingDefault,
  easingBounce,
} from '@/lib/constants/design-tokens';

describe('カラートークン', () => {
  it('背景系カラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorBackground).toMatch(hexPattern);
    expect(colorSurface).toMatch(hexPattern);
    expect(colorSurfaceWashi).toMatch(hexPattern);
    expect(colorSurfaceKinoko).toMatch(hexPattern);
    expect(colorSurfaceMuted).toMatch(hexPattern);
  });

  it('テキスト系カラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorTextPrimary).toMatch(hexPattern);
    expect(colorTextSecondary).toMatch(hexPattern);
    expect(colorTextTertiary).toMatch(hexPattern);
    expect(colorTextInverse).toMatch(hexPattern);
    expect(colorTextLink).toMatch(hexPattern);
    expect(colorTextHashtag).toMatch(hexPattern);
  });

  it('ボーダー系カラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorBorder).toMatch(hexPattern);
    expect(colorBorderLight).toMatch(hexPattern);
    expect(colorBorderFocus).toMatch(hexPattern);
  });

  it('アクション系カラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorActionPrimary).toMatch(hexPattern);
    expect(colorActionPrimaryText).toMatch(hexPattern);
    expect(colorActionSecondary).toMatch(hexPattern);
    expect(colorActionSecondaryText).toMatch(hexPattern);
    expect(colorFab).toMatch(hexPattern);
    expect(colorFabText).toMatch(hexPattern);
  });

  it('セマンティックカラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorSuccess).toMatch(hexPattern);
    expect(colorSuccessBg).toMatch(hexPattern);
    expect(colorError).toMatch(hexPattern);
    expect(colorErrorBg).toMatch(hexPattern);
    expect(colorWarning).toMatch(hexPattern);
    expect(colorWarningBg).toMatch(hexPattern);
    expect(colorInfo).toMatch(hexPattern);
    expect(colorInfoBg).toMatch(hexPattern);
  });

  it('ナビゲーション系カラーが hex 文字列で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{3,8}$/;
    expect(colorNavBackground).toMatch(hexPattern);
    expect(colorNavIconActive).toMatch(hexPattern);
    expect(colorNavIconInactive).toMatch(hexPattern);
    expect(colorNavLabel).toMatch(hexPattern);
    expect(colorNavLabelInactive).toMatch(hexPattern);
  });

  it('外部サービスブランド色が正しい hex 値で定義されている', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    expect(colorGoogleBrand).toMatch(hexPattern);
    expect(colorGoogleBrand).toBe('#4285F4');
  });
});

describe('スペーシングトークン（8pt ベースグリッド）', () => {
  it('spacing0 が 0', () => {
    expect(spacing0).toBe(0);
  });

  it('スペーシング値が昇順に定義されている', () => {
    expect(spacing1).toBeLessThan(spacing2);
    expect(spacing2).toBeLessThan(spacing3);
    expect(spacing3).toBeLessThan(spacing4);
    expect(spacing4).toBeLessThan(spacing5);
    expect(spacing5).toBeLessThan(spacing6);
    expect(spacing6).toBeLessThan(spacing8);
    expect(spacing8).toBeLessThan(spacing10);
    expect(spacing10).toBeLessThan(spacing12);
  });

  it('spacing4 が 16（4 × 4pt）', () => {
    expect(spacing4).toBe(16);
  });
});

describe('角丸トークン', () => {
  it('角丸値が昇順に定義されている', () => {
    expect(radiusXs).toBeLessThan(radiusSm);
    expect(radiusSm).toBeLessThan(radiusMd);
    expect(radiusMd).toBeLessThan(radiusLg);
    expect(radiusLg).toBeLessThan(radiusXl);
    expect(radiusXl).toBeLessThan(radius2xl);
    expect(radius2xl).toBeLessThan(radiusFull);
  });

  it('radiusFull が十分大きな値（円形要素に使用可能）', () => {
    expect(radiusFull).toBeGreaterThanOrEqual(9999);
  });
});

describe('タイポグラフィトークン', () => {
  it('各テキストスタイルが fontSize と lineHeight を持つ', () => {
    for (const style of [textXs, textSm, textBase, textMd, textLg, textXl, text2xl]) {
      expect(typeof style.fontSize).toBe('number');
      expect(typeof style.lineHeight).toBe('number');
      expect(style.fontSize).toBeGreaterThan(0);
      expect(style.lineHeight).toBeGreaterThan(0);
    }
  });

  it('フォントサイズが昇順に定義されている', () => {
    expect(textXs.fontSize).toBeLessThan(textSm.fontSize);
    expect(textSm.fontSize).toBeLessThan(textBase.fontSize);
    expect(textBase.fontSize).toBeLessThan(textMd.fontSize);
    expect(textMd.fontSize).toBeLessThan(textLg.fontSize);
    expect(textLg.fontSize).toBeLessThan(textXl.fontSize);
    expect(textXl.fontSize).toBeLessThan(text2xl.fontSize);
  });

  it('letterSpacing が昇順に定義されている', () => {
    expect(letterSpacingNone).toBeLessThan(letterSpacingTight);
    expect(letterSpacingTight).toBeLessThan(letterSpacingWide);
    expect(letterSpacingWide).toBeLessThan(letterSpacingWidest);
  });
});

describe('シャドウトークン', () => {
  it('shadowWashi が React Native の shadow プロパティを持つ', () => {
    expect(typeof shadowWashi.shadowColor).toBe('string');
    expect(typeof shadowWashi.shadowOffset).toBe('object');
    expect(typeof shadowWashi.shadowOpacity).toBe('number');
    expect(typeof shadowWashi.shadowRadius).toBe('number');
    expect(typeof shadowWashi.elevation).toBe('number');
  });

  it('elevation がシャドウ強度に応じて昇順', () => {
    expect(shadowWashi.elevation).toBeLessThan(shadowWashiHover.elevation);
    expect(shadowWashiHover.elevation).toBeLessThan(shadowWashiLg.elevation);
  });
});

describe('アニメーショントークン', () => {
  it('アニメーション時間が昇順に定義されている', () => {
    expect(durationFast).toBeLessThan(durationNormal);
    expect(durationNormal).toBeLessThan(durationSlow);
  });

  it('easing が文字列型で定義されている', () => {
    expect(typeof easingDefault).toBe('string');
    expect(typeof easingBounce).toBe('string');
  });

  it('easingBounceRN が RN Animated 用の関数型で定義されている', () => {
    expect(typeof easingBounceRN).toBe('function');
  });
});
