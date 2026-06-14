/**
 * @module lib/constants/design-tokens
 * Web 版「書院造り」デザインシステムを React Native 向けに移植したトークン定数。
 * 出典: Bon_Log_cfw/app/globals.css の :root CSS カスタムプロパティ。
 * NativeWind 採否確定まで StyleSheet + 定数ベースで使用する。
 */

import { Easing } from 'react-native';
import type { EasingFunction, TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// カラー — 背景系
// ---------------------------------------------------------------------------

/** 画面・モーダルの最背面 */
export const colorBackground = '#ffffff';

/** カード・シート・セル */
export const colorSurface = '#fcfcfc';

/** ナビバー・ヘッダー（Web: --washi）*/
export const colorSurfaceWashi = '#f7f7f7';

/** 温かみのある背景（Web: --kinoko / 鳥の子色） */
export const colorSurfaceKinoko = '#f0ece4';

/** 非アクティブ・ローディングスケルトン */
export const colorSurfaceMuted = '#f0f0f0';

// ---------------------------------------------------------------------------
// カラー — テキスト系
// ---------------------------------------------------------------------------

/** 本文・見出し（Web: --foreground） */
export const colorTextPrimary = '#1a1a1a';

/** 補助テキスト（日時・カウント・プレースホルダー）（Web: --muted-foreground） */
export const colorTextSecondary = '#5c5c5c';

/**
 * さらに薄い補助（キャプション・ヒント）。
 * WCAG AA 未達のため本文・重要テキストには使用しない（design-tokens.md §7 参照）。
 */
export const colorTextTertiary = '#8a8a8a';

/** 墨色背景上のテキスト（Web: --primary-foreground） */
export const colorTextInverse = '#ffffff';

/** リンク・ハッシュタグ（Web: --primary = 墨） */
export const colorTextLink = '#2e2e2e';

/** ハッシュタグ専用（Web: text-bonsai-green） */
export const colorTextHashtag = '#4a4a4a';

// ---------------------------------------------------------------------------
// カラー — ボーダー・セパレータ系
// ---------------------------------------------------------------------------

/** 汎用ボーダー（Web: --border） */
export const colorBorder = '#c8c8c8';

/** 薄いセパレータ（Web: --accent） */
export const colorBorderLight = '#e2e2e2';

/** フォーカスリング（入力フィールド）（Web: --ring） */
export const colorBorderFocus = '#2e2e2e';

// ---------------------------------------------------------------------------
// カラー — アクション系
// ---------------------------------------------------------------------------

/** 主要ボタン背景（墨）（Web: --primary） */
export const colorActionPrimary = '#2e2e2e';

/** 主要ボタンテキスト（Web: --primary-foreground） */
export const colorActionPrimaryText = '#ffffff';

/** セカンダリボタン背景（Web: --secondary） */
export const colorActionSecondary = '#e9e9e9';

/** セカンダリボタンテキスト（Web: --secondary-foreground） */
export const colorActionSecondaryText = '#2e2e2e';

/** FAB 背景（Web: bg-bonsai-green = oklch(0.35 0 0)） */
export const colorFab = '#4a4a4a';

/** FAB アイコン・テキスト */
export const colorFabText = '#ffffff';

// ---------------------------------------------------------------------------
// カラー — セマンティック（意味）系
// ---------------------------------------------------------------------------

/**
 * 成功・完了色。
 * Web 版には --success 変数が存在しないが、RepostButton の text-emerald-600 (#059669)
 * と ConfirmDialog の bg-amber-700 からセマンティック色を補完した。
 * success は emerald 系で統一（emerald-700 相当の #047857 は濃すぎるため emerald-600 系に調整）。
 */
export const colorSuccess = '#3a6b42';

/** 成功バックグラウンド */
export const colorSuccessBg = '#eaf3eb';

/** エラー・削除（Web: --aka / --destructive = oklch(0.52 0.20 26)） */
export const colorError = '#c0392b';

/** エラーバックグラウンド */
export const colorErrorBg = '#fdf0ef';

/**
 * 警告色。
 * ConfirmDialog の bg-amber-700（#b45309）をモバイルのセマンティック警告色に採用。
 * amber-700 は白テキストとの組み合わせで WCAG AA を満たす（コントラスト比 約5.5:1）。
 */
export const colorWarning = '#b45309';

/** 警告バックグラウンド */
export const colorWarningBg = '#fdf8e1';

/**
 * 情報・ヒント色。
 * Web 版には --info 変数が存在しない。
 * 和風配色の墨色体系から逸脱しないよう blue-700 相当（#1d4ed8）を採用せず、
 * 彩度を下げた藍色（--ai 相当 oklch(0.36 0 0) = #424242 に近い）をベースに、
 * 視認性を確保した青みがかった値を選択した。
 */
export const colorInfo = '#2c6e8a';

/** 情報バックグラウンド */
export const colorInfoBg = '#e8f4f8';

// ---------------------------------------------------------------------------
// カラー — 外部サービスブランド色
// ---------------------------------------------------------------------------

/**
 * Google ブランドカラー（Google Material Design 公式仕様 #4285F4）。
 * GoogleSignInButton の背景色に使用する。ストアガイドラインに従い変更しない。
 */
export const colorGoogleBrand = '#4285F4';

// ---------------------------------------------------------------------------
// カラー — ナビゲーション系（Web: MobileNav.tsx の色クラスから抽出）
// ---------------------------------------------------------------------------

/** ボトムナビ背景（Web: bg-washi/90） */
export const colorNavBackground = '#f7f7f7';

/** アクティブタブアイコン（Web: text-sumi） */
export const colorNavIconActive = '#252525';

/**
 * 非アクティブタブアイコン（Web: text-sumi/40 = #252525 @ 40% opacity）。
 * StyleSheet では opacity 分離が面倒なため hex + alpha の 8 桁表記を使用。
 */
export const colorNavIconInactive = '#72727280';

/** アクティブラベル（Web: text-sumi） */
export const colorNavLabel = '#252525';

/** 非アクティブラベル（Web: text-sumi/40） */
export const colorNavLabelInactive = '#72727280';

// ---------------------------------------------------------------------------
// 余白スケール（8pt ベースグリッド）
// ---------------------------------------------------------------------------

export const spacing0 = 0;
export const spacing1 = 4;
export const spacing2 = 8;
export const spacing3 = 12;
export const spacing4 = 16;
export const spacing5 = 20;
export const spacing6 = 24;
export const spacing8 = 32;
export const spacing10 = 40;
export const spacing12 = 48;

// ---------------------------------------------------------------------------
// 角丸スケール（Web: --radius = 0.625rem = 10px を起点）
// ---------------------------------------------------------------------------

export const radiusXs = 4;
export const radiusSm = 6;
export const radiusMd = 8;
export const radiusLg = 10;
export const radiusXl = 14;
export const radius2xl = 18;
export const radiusFull = 9999;

// ---------------------------------------------------------------------------
// タイポグラフィ
// ---------------------------------------------------------------------------

export const textXs = { fontSize: 10, lineHeight: 14 } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight'>;
export const textSm = { fontSize: 12, lineHeight: 18 } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight'>;
export const textBase = { fontSize: 14, lineHeight: 22 } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight'>;
export const textMd = { fontSize: 15, lineHeight: 23 } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight'>;
const fontWeightSemibold: TextStyle['fontWeight'] = '600';
const fontWeightBold: TextStyle['fontWeight'] = '700';

export const textLg = { fontSize: 17, fontWeight: fontWeightSemibold, lineHeight: 24 } satisfies Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>;
export const textXl = { fontSize: 20, fontWeight: fontWeightBold, lineHeight: 28 } satisfies Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>;
export const text2xl = { fontSize: 24, fontWeight: fontWeightBold, lineHeight: 32 } satisfies Pick<TextStyle, 'fontSize' | 'fontWeight' | 'lineHeight'>;

/** 字間トークン（Web の letter-spacing 規約に対応） */
export const letterSpacingNone = 0;
export const letterSpacingTight = 0.5;
export const letterSpacingWide = 1.0;

/** ナビラベル・見出し用（Web: tracking-widest = 0.15em @ 10pt ≒ 1.5pt） */
export const letterSpacingWidest = 1.5;

// ---------------------------------------------------------------------------
// エレベーション（影）— Web の .shadow-washi 系を React Native 向けに変換
// ---------------------------------------------------------------------------

/** PostCard 標準影（Web: .shadow-washi） */
export const shadowWashi = {
  shadowColor: '#18150a',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} satisfies Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

/** PostCard フォーカス相当（Web: .shadow-washi-hover） */
export const shadowWashiHover = {
  shadowColor: '#18150a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 12,
  elevation: 4,
} satisfies Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

/** モーダル・ドロップアップ（Web: .shadow-washi-lg） */
export const shadowWashiLg = {
  shadowColor: '#18150a',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.14,
  shadowRadius: 20,
  elevation: 8,
} satisfies Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

// ---------------------------------------------------------------------------
// アニメーション・トランジション
// ---------------------------------------------------------------------------

export const durationFast = 200;
export const durationNormal = 300;
export const durationSlow = 500;

/** Web の .hover-washi と同一 easing */
export const easingDefault = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

/** いいねバウンス（Web の animate-like-bounce 相当） */
export const easingBounce = 'cubic-bezier(0.36, 0.07, 0.19, 0.97)';

/**
 * いいね等のスケールアニメ用バウンス easing（RN Animated 用）。
 * CSS の easingBounce とは別物（あちらは Web 用 cubic-bezier 文字列）。
 * elastic(1.5) の係数はここに集約し、コンポーネント内でのマジックナンバー化を防ぐ。
 */
export const easingBounceRN: EasingFunction = Easing.elastic(1.5);
