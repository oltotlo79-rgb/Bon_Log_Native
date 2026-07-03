/**
 * @module lib/constants/design-tokens
 * Web 版「書院造り」デザインシステムを React Native 向けに移植したトークン定数。
 * 出典: Bon_Log_cfw/app/globals.css の :root CSS カスタムプロパティ。
 * NativeWind 採否確定まで StyleSheet + 定数ベースで使用する。
 */

import { Easing } from 'react-native';
import type { EasingFunction, TextStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// フォントファミリー — Shippori Mincho（和風世界観の核）
// ---------------------------------------------------------------------------

/**
 * 本文用明朝体（Regular 400）。
 * RN ではカスタムフォント時に fontWeight だけで太さが変わらないため、
 * 太さごとに専用ファミリー名を指定する必要がある。
 * app/_layout.tsx の useFonts で ShipporiMincho_400Regular をロードすること。
 */
export const fontFamilySerif = 'ShipporiMincho_400Regular';

/**
 * 中太明朝体（Medium 500）。本文より少し強調したい箇所に使用する。
 * app/_layout.tsx の useFonts で ShipporiMincho_500Medium をロードすること。
 */
export const fontFamilySerifMedium = 'ShipporiMincho_500Medium';

/**
 * 太字明朝体（Bold 700）。見出し・強調 fontWeight 600 以上の箇所に使用する。
 * app/_layout.tsx の useFonts で ShipporiMincho_700Bold をロードすること。
 */
export const fontFamilySerifBold = 'ShipporiMincho_700Bold';

// ---------------------------------------------------------------------------
// カラー — 背景系
// ---------------------------------------------------------------------------

/** 画面・モーダルの最背面 */
export const colorBackground = '#ffffff';

/** カード・シート・セル */
export const colorSurface = '#fcfcfc';

/** ナビバー・ヘッダー（Web: --washi = oklch(0.98 0 0)）*/
export const colorSurfaceWashi = '#f8f8f8';

/** 温かみのある背景（Web: --kinoko / 鳥の子色） */
export const colorSurfaceKinoko = '#f0ece4';

/** 非アクティブ・ローディングスケルトン（Web: --muted = oklch(0.96 0 0)） */
export const colorSurfaceMuted = '#f2f2f2';

// ---------------------------------------------------------------------------
// カラー — テキスト系
// ---------------------------------------------------------------------------

/** 本文・見出し（Web: --foreground = oklch(0.12 0 0)） */
export const colorTextPrimary = '#060606';

/** 補助テキスト（日時・カウント・プレースホルダー）（Web: --muted-foreground = oklch(0.40 0 0)） */
export const colorTextSecondary = '#484848';

/**
 * さらに薄い補助（キャプション・ヒント）。
 * WCAG AA 未達のため本文・重要テキストには使用しない（design-tokens.md §7 参照）。
 */
export const colorTextTertiary = '#8a8a8a';

/** 墨色背景上のテキスト（Web: --primary-foreground） */
export const colorTextInverse = '#ffffff';

/** リンク・ハッシュタグ（Web: --primary = oklch(0.20 0 0)） */
export const colorTextLink = '#161616';

/** ハッシュタグ専用（Web: text-bonsai-green = oklch(0.35 0 0)） */
export const colorTextHashtag = '#3a3a3a';

// ---------------------------------------------------------------------------
// カラー — ボーダー・セパレータ系
// ---------------------------------------------------------------------------

/** 汎用ボーダー（Web: --border = oklch(0.85 0 0)） */
export const colorBorder = '#cececd';

/** 薄いセパレータ（Web: --accent = oklch(0.92 0 0)） */
export const colorBorderLight = '#e4e4e4';

/** フォーカスリング（入力フィールド）（Web: --ring） */
export const colorBorderFocus = '#2e2e2e';

// ---------------------------------------------------------------------------
// カラー — アクション系
// ---------------------------------------------------------------------------

/** 主要ボタン背景（墨）（Web: --primary = oklch(0.20 0 0)） */
export const colorActionPrimary = '#161616';

/** 主要ボタンテキスト（Web: --primary-foreground） */
export const colorActionPrimaryText = '#ffffff';

/** セカンダリボタン背景（Web: --secondary = oklch(0.94 0 0)） */
export const colorActionSecondary = '#ebebeb';

/** セカンダリボタンテキスト（Web: --secondary-foreground = oklch(0.20 0 0)） */
export const colorActionSecondaryText = '#161616';

/** FAB 背景（Web: bg-bonsai-green = oklch(0.35 0 0)） */
export const colorFab = '#3a3a3a';

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
export const colorError = '#c21721';

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
// カラー — 活性レベル系（ホルモン活性・季節レベル表示）
// ---------------------------------------------------------------------------

/**
 * 活性レベル「高」のバッジ背景。
 * Web 版 HORMONE_LEVEL_CONFIG.high.bg（Tailwind green-500）と同値。
 * 白テキスト（colorTextInverse）と組み合わせて使用する。
 */
export const colorLevelHighBg = '#22c55e';

/**
 * 活性レベル「中」のバッジ背景。
 * Web 版 HORMONE_LEVEL_CONFIG.moderate.bg（Tailwind yellow-500）と同値。
 * 白テキスト（colorTextInverse）と組み合わせて使用する。
 */
export const colorLevelModerateBg = '#eab308';

/**
 * 活性レベル「低」のバッジ背景。
 * Web 版 HORMONE_LEVEL_CONFIG.low.bg（Tailwind orange-500）と同値。
 * 白テキスト（colorTextInverse）と組み合わせて使用する。
 */
export const colorLevelLowBg = '#f97316';

/**
 * 活性レベル「微」のバッジ背景。
 * Web 版 HORMONE_LEVEL_CONFIG.minimal.bg（Tailwind gray-300）と同値。
 */
export const colorLevelMinimalBg = '#d1d5db';

/**
 * 活性レベル「微」のバッジテキスト。
 * Web 版 HORMONE_LEVEL_CONFIG.minimal.text（Tailwind gray-500）と同値。
 */
export const colorLevelMinimalText = '#6b7280';

// ---------------------------------------------------------------------------
// カラー — エフェクト系（ホルモン増減デルタバー）
// ---------------------------------------------------------------------------

/**
 * デルタバー「増加」色（Tailwind green-300）。
 * バーグラフの正方向デルタを示す薄いグリーン。
 * colorLevelHighBg より薄く、バーの重なり視認性を確保する。
 */
export const colorDeltaIncrease = '#86efac';

/**
 * デルタバー「減少」色（Tailwind red-300）。
 * バーグラフの負方向デルタを示す薄いレッド。
 */
export const colorDeltaDecrease = '#fca5a5';

// ---------------------------------------------------------------------------
// カラー — インタラクション系（ホルモン相互作用バッジ）
// ---------------------------------------------------------------------------

/**
 * 相乗（Synergy）バッジ背景（Tailwind green-100）。
 * テキストは colorInteractionSynergyText と対で使用する。
 */
export const colorInteractionSynergyBg = '#dcfce7';

/**
 * 相乗バッジテキスト（Tailwind green-800）。
 */
export const colorInteractionSynergyText = '#166534';

/**
 * 拮抗（Antagonism）バッジ背景（Tailwind red-100）。
 * テキストは colorInteractionAntagonismText と対で使用する。
 */
export const colorInteractionAntagonismBg = '#fee2e2';

/**
 * 拮抗バッジテキスト（Tailwind red-800）。
 */
export const colorInteractionAntagonismText = '#991b1b';

/**
 * 調節（Modulation）バッジ背景（Tailwind yellow-100）。
 * テキストは colorInteractionModulationText と対で使用する。
 */
export const colorInteractionModulationBg = '#fef9c3';

/**
 * 調節バッジテキスト（Tailwind yellow-800 相当）。
 */
export const colorInteractionModulationText = '#854d0e';

// ---------------------------------------------------------------------------
// カラー — エフェクトタイプ系（増加・減少・再分配バッジ）
// ---------------------------------------------------------------------------

/**
 * 増加（increase）エフェクトバッジ背景。colorInteractionSynergyBg と同値。
 * 意図の明示のために別名を提供する。
 */
export const colorEffectIncreaseBg = '#dcfce7';

/**
 * 増加エフェクトバッジテキスト。colorInteractionSynergyText と同値。
 */
export const colorEffectIncreaseText = '#166534';

/**
 * 減少（decrease）エフェクトバッジ背景。colorInteractionAntagonismBg と同値。
 */
export const colorEffectDecreaseBg = '#fee2e2';

/**
 * 減少エフェクトバッジテキスト。colorInteractionAntagonismText と同値。
 */
export const colorEffectDecreaseText = '#991b1b';

/**
 * 再分配（redistribute）エフェクトバッジ背景（Tailwind blue-100）。
 */
export const colorEffectRedistributeBg = '#dbeafe';

/**
 * 再分配エフェクトバッジテキスト（Tailwind blue-800）。
 */
export const colorEffectRedistributeText = '#1e40af';

// ---------------------------------------------------------------------------
// カラー — 植物カテゴリ系（肥料・樹種・辞典カテゴリバッジ）
// ---------------------------------------------------------------------------

/**
 * グリーン系カテゴリバッジ背景（Tailwind emerald-100）。
 * 松柏類・三大要素・樹形・管理育成・益虫・病害防除効果「優」などに使用する。
 */
export const colorCategoryGreenBg = '#d1fae5';

/**
 * グリーン系カテゴリバッジテキスト（Tailwind emerald-900）。
 */
export const colorCategoryGreenText = '#065f46';

/**
 * 薄いグリーン系バッジ背景（Tailwind green-100）。
 * 管理・育成カテゴリ・相乗バッジと同値。colorInteractionSynergyBg と統一。
 */
export const colorCategoryGreenLightBg = '#dcfce7';

/**
 * 薄いグリーン系バッジテキスト（Tailwind green-800）。
 */
export const colorCategoryGreenLightText = '#166534';

/**
 * ライムグリーン系バッジ背景（Tailwind lime-100）。草物樹種に使用する。
 */
export const colorCategoryLimeBg = '#ecfccb';

/**
 * ライムグリーン系バッジテキスト（Tailwind lime-800）。
 */
export const colorCategoryLimeText = '#3f6212';

/**
 * ティールグリーン系バッジ背景（Tailwind teal-100）。常緑広葉樹に使用する。
 */
export const colorCategoryTealBg = '#ccfbf1';

/**
 * ティールグリーン系バッジテキスト（Tailwind teal-900）。
 */
export const colorCategoryTealText = '#115e59';

/**
 * 明るいグリーン系バッジ背景（Tailwind green-50）。CEC 中〜高などに使用する。
 */
export const colorCategoryGreenPaleBg = '#f0fdf4';

/**
 * 明るいグリーン系バッジテキスト（Tailwind green-800）。
 */
export const colorCategoryGreenPaleText = '#166534';

/**
 * ブルー系カテゴリバッジ背景（Tailwind sky-100）。
 * 雑木類・二次要素・技術作業カテゴリ・殺菌剤・病害防除効果「良」などに使用する。
 */
export const colorCategoryBlueBg = '#e0f2fe';

/**
 * ブルー系カテゴリバッジテキスト（Tailwind sky-700）。
 */
export const colorCategoryBlueText = '#0369a1';

/**
 * ブルー系カテゴリバッジテキスト（濃）（Tailwind sky-800）。
 * 病害防除効果「良」のテキストなど濃いブルーが必要な場合に使用する。
 */
export const colorCategoryBlueDarkText = '#075985';

/**
 * インジゴ系バッジ背景（Tailwind blue-100）。
 * 再分配・技術作業辞典カテゴリなどに使用する。colorEffectRedistributeBg と同値。
 */
export const colorCategoryIndigoBg = '#dbeafe';

/**
 * インジゴ系バッジテキスト（Tailwind blue-800）。colorEffectRedistributeText と同値。
 */
export const colorCategoryIndigoText = '#1e40af';

/**
 * ブルー系バッジ背景（Tailwind blue-50）。欠乏症状「軽度」などに使用する。
 */
export const colorCategoryBluePaleBg = '#eff6ff';

/**
 * ブルー系バッジテキスト（Tailwind blue-800）。colorEffectRedistributeText と同値。
 */
export const colorCategoryBluePaleText = '#1e40af';

/**
 * アンバー系カテゴリバッジ背景（Tailwind amber-100）。
 * 盆器・鉢・微量要素・病害防除効果「可」などに使用する。
 */
export const colorCategoryAmberBg = '#fef3c7';

/**
 * アンバー系カテゴリバッジテキスト（Tailwind amber-800）。
 */
export const colorCategoryAmberText = '#92400e';

/**
 * 淡いアンバー系バッジ背景（Tailwind yellow-50）。欠乏症状「中度」などに使用する。
 */
export const colorCategoryAmberPaleBg = '#fffbeb';

/**
 * 淡いアンバー系バッジテキスト（Tailwind amber-800）。colorCategoryAmberText と同値。
 */
export const colorCategoryAmberPaleText = '#92400e';

/**
 * 黄色系バッジ背景（Tailwind yellow-100）。
 * 用土・肥料・調節バッジなどに使用する。colorInteractionModulationBg と同値。
 */
export const colorCategoryYellowBg = '#fef9c3';

/**
 * 黄色系バッジテキスト（Tailwind yellow-800）。colorInteractionModulationText と同値。
 */
export const colorCategoryYellowText = '#854d0e';

/**
 * 淡い黄色系バッジ背景（Tailwind yellow-50）。CEC 中などに使用する。
 */
export const colorCategoryYellowPaleBg = '#fefce8';

/**
 * 淡い黄色系バッジテキスト（Tailwind yellow-800）。colorCategoryYellowText と同値。
 */
export const colorCategoryYellowPaleText = '#854d0e';

/**
 * オレンジ系カテゴリバッジ背景（Tailwind orange-100）。
 * 実物・道具用品・殺虫剤などに使用する。
 */
export const colorCategoryOrangeBg = '#ffedd5';

/**
 * オレンジ系カテゴリバッジテキスト（Tailwind orange-900）。
 */
export const colorCategoryOrangeText = '#9a3412';

/**
 * 明るいオレンジ系バッジ背景（Tailwind orange-50）。CEC 低などに使用する。
 */
export const colorCategoryOrangePaleBg = '#fff7ed';

/**
 * 明るいオレンジ系バッジテキスト（Tailwind orange-900）。colorCategoryOrangeText と同値。
 */
export const colorCategoryOrangePaleText = '#9a3412';

/**
 * ローズ系カテゴリバッジ背景（Tailwind rose-100）。花物樹種・病害カテゴリなどに使用する。
 */
export const colorCategoryRoseBg = '#ffe4e6';

/**
 * ローズ系カテゴリバッジテキスト（Tailwind rose-800）。
 */
export const colorCategoryRoseText = '#9f1239';

/**
 * レッド系カテゴリバッジ背景（Tailwind red-100）。
 * 病害・拮抗・欠乏症状「重度」・CEC 極低・病害防除効果「否」などに使用する。
 * colorInteractionAntagonismBg と同値。
 */
export const colorCategoryRedBg = '#fee2e2';

/**
 * レッド系カテゴリバッジテキスト（Tailwind red-700）。
 */
export const colorCategoryRedText = '#b91c1c';

/**
 * 赤系バッジ背景（Tailwind red-50）。欠乏症状「重度」・CEC 極低などに使用する。
 */
export const colorCategoryRedPaleBg = '#fef2f2';

/**
 * 赤系バッジテキスト（Tailwind red-800）。colorInteractionAntagonismText と同値。
 */
export const colorCategoryRedPaleText = '#991b1b';

/**
 * 害虫カテゴリバッジ背景（Tailwind amber-100）。colorCategoryAmberBg と同値。
 */
export const colorCategoryPestBg = '#fef3c7';

/**
 * 害虫カテゴリバッジテキスト（Tailwind amber-700）。
 * colorWarning（既存）と同値（#b45309）。
 */
export const colorCategoryPestText = '#b45309';

/**
 * パープル系カテゴリバッジ背景（Tailwind violet-100）。展示鑑賞・殺ダニ剤などに使用する。
 */
export const colorCategoryPurpleBg = '#ede9fe';

/**
 * パープル系カテゴリバッジテキスト（Tailwind violet-700）。展示鑑賞カテゴリに使用する。
 */
export const colorCategoryPurpleText = '#5b21b6';

/**
 * バイオレット系カテゴリバッジテキスト（Tailwind violet-800）。殺ダニ剤に使用する。
 */
export const colorCategoryVioletText = '#6d28d9';

/**
 * 複合剤バッジ背景（Tailwind fuchsia-50）。
 */
export const colorCategoryFuchsiaBg = '#fdf4ff';

/**
 * 複合剤バッジテキスト（Tailwind fuchsia-700）。
 */
export const colorCategoryFuchsiaText = '#a21caf';

/**
 * フォールバック用カテゴリバッジ背景（Tailwind stone-100）。
 * CATEGORY_COLOR_FALLBACK として使用するニュートラルグレー。
 */
export const colorCategoryFallbackBg = '#f5f5f4';

/**
 * フォールバック用カテゴリバッジテキスト（Tailwind stone-600）。
 */
export const colorCategoryFallbackText = '#57534e';

// ---------------------------------------------------------------------------
// カラー — 図鑑系ノード・ボーダー（相互作用ダイアグラム）
// ---------------------------------------------------------------------------

/**
 * 相互作用グラフの相乗エッジ色（Tailwind green-500）。colorLevelHighBg と同値。
 */
export const colorDiagramEdgeSynergy = '#22c55e';

/**
 * 相互作用グラフの拮抗エッジ色（Tailwind red-500）。
 */
export const colorDiagramEdgeAntagonism = '#ef4444';

/**
 * 相互作用グラフの調節エッジ色（Tailwind yellow-500）。colorLevelModerateBg と同値。
 */
export const colorDiagramEdgeModulation = '#eab308';

/**
 * 相互作用ダイアグラムの主要ノード色（Tailwind green-800）。colorCategoryGreenText と同値。
 */
export const colorDiagramNodeMajor = '#166534';

/**
 * 相互作用ダイアグラムの二次ノード色（Tailwind blue-800）。colorEffectRedistributeText と同値。
 */
export const colorDiagramNodeSecondary = '#1e40af';

/**
 * 相互作用ダイアグラムの選択ノード色（Tailwind amber-800）。
 */
export const colorDiagramNodeSelected = '#92400e';

/**
 * 相互作用ダイアグラムの選択ノードボーダー色（Tailwind amber-400）。
 */
export const colorDiagramNodeSelectedBorder = '#f59e0b';

// ---------------------------------------------------------------------------
// カラー — 病害防除効果ボーダー系
// ---------------------------------------------------------------------------

/**
 * 効果「優（◎）」ボーダー（Tailwind emerald-300）。
 */
export const colorEfficacyExcellentBorder = '#6ee7b7';

/**
 * 効果「良（○）」ボーダー（Tailwind sky-300）。
 */
export const colorEfficacyGoodBorder = '#7dd3fc';

/**
 * 効果「可（△）」ボーダー（Tailwind amber-300）。
 */
export const colorEfficacyFairBorder = '#fcd34d';

/**
 * 効果「否（×）」ボーダー（Tailwind red-300）。
 */
export const colorEfficacyPoorBorder = '#fca5a5';

// ---------------------------------------------------------------------------
// カラー — 農薬ウォーニング系（農薬製品詳細の危険性表示）
// ---------------------------------------------------------------------------

/**
 * 農薬危険性ボーダー（Tailwind red-400）。
 * pesticides/products/[slug] の危険性カードに使用する。
 */
export const colorPesticideWarningBorder = '#f87171';

/**
 * 農薬危険性バックグラウンド（Tailwind red-50）。
 */
export const colorPesticideWarningBg = '#fff5f5';

/**
 * 農薬危険性カード仕切り（Tailwind red-200）。
 */
export const colorPesticideWarningDivider = '#fecaca';

// ---------------------------------------------------------------------------
// カラー — 農薬インデックス情報バナー
// ---------------------------------------------------------------------------

/**
 * 農薬一覧ページの情報バナー背景（青みがかったグレー）。
 */
export const colorPesticideInfoBannerBg = '#eef4fb';

// ---------------------------------------------------------------------------
// カラー — 図鑑系アイコン（メリット・デメリット・使い方）
// ---------------------------------------------------------------------------

/**
 * メリット項目のチェックアイコン色（Tailwind emerald-600）。
 * Web 版の text-emerald-600 と同値。
 */
export const colorIconMerit = '#059669';

/**
 * デメリット項目の閉じるアイコン色（Tailwind rose-600）。
 * Web 版の text-rose-600 と同値。
 */
export const colorIconDemerit = '#e11d48';

/**
 * 使い方セクションの電球アイコン色（Tailwind sky-600）。
 * Web 版の text-sky-600 と同値。
 */
export const colorIconUsage = '#0284c7';

/**
 * 殺虫剤カテゴリバッジテキストの正確な色（Tailwind orange-700）。
 * Web 版の text-orange-700 と同値。
 * colorCategoryOrangeText（orange-900 = #9a3412）が近似値として使われていた箇所を
 * この原色に置き換えることで Web との完全一致を確保する。
 */
export const colorCategoryOrangeDeepText = '#c2410c';

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

/** ボトムナビ背景（Web: bg-washi/90 = --washi oklch(0.98 0 0)） */
export const colorNavBackground = '#f8f8f8';

/** アクティブタブアイコン（Web: text-sumi = oklch(0.18 0 0)） */
export const colorNavIconActive = '#121212';

/**
 * 非アクティブタブアイコン（Web: text-sumi/40 = #121212 @ 40% opacity）。
 * StyleSheet では opacity 分離が面倒なため hex + alpha の 8 桁表記を使用。
 */
export const colorNavIconInactive = '#12121266';

/** アクティブラベル（Web: text-sumi = oklch(0.18 0 0)） */
export const colorNavLabel = '#121212';

/** 非アクティブラベル（Web: text-sumi/40） */
export const colorNavLabelInactive = '#12121266';

// ---------------------------------------------------------------------------
// カラー — オーバーレイ・スクリム系
// ---------------------------------------------------------------------------

/**
 * フルスクリーン画像ビューアの暗い背景色。
 * 0.92 の不透明度は画像外の UI（クローズボタン等）を隠しつつ、
 * スワイプで閉じる際の半透明アニメに対応できる余地を残している。
 */
export const colorScrim = 'rgba(0, 0, 0, 0.92)';

/**
 * モーダル・ボトムシートの背景スクリム。黒の40%不透明度。
 * 92% の colorScrim（画像ビューア用）と区別するために Light サフィックスを付ける。
 */
export const colorScrimLight = 'rgba(0, 0, 0, 0.40)';

/**
 * スクリム上のテキスト・アイコン色（フルスクリーン画像ビューアで使用）。
 * 純白は暗背景で強すぎるため、和紙（鳥の子）を意識した生成り白を採用。
 */
export const colorOnOverlay = '#F5F0E8';

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

export const textXs = { fontSize: 10, lineHeight: 14, fontFamily: fontFamilySerif } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily'>;
export const textSm = { fontSize: 12, lineHeight: 18, fontFamily: fontFamilySerif } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily'>;
export const textBase = { fontSize: 14, lineHeight: 22, fontFamily: fontFamilySerif } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily'>;
export const textMd = { fontSize: 15, lineHeight: 23, fontFamily: fontFamilySerif } satisfies Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontFamily'>;

// RN はカスタムフォント時に fontWeight だけで太さが変わらないため、
// fontWeight 600 以上の見出し・強調スタイルは専用ファミリーを指定する。
export const textLg = { fontSize: 17, fontFamily: fontFamilySerifMedium, lineHeight: 24 } satisfies Pick<TextStyle, 'fontSize' | 'fontFamily' | 'lineHeight'>;
export const textXl = { fontSize: 20, fontFamily: fontFamilySerifBold, lineHeight: 28 } satisfies Pick<TextStyle, 'fontSize' | 'fontFamily' | 'lineHeight'>;
export const text2xl = { fontSize: 24, fontFamily: fontFamilySerifBold, lineHeight: 32 } satisfies Pick<TextStyle, 'fontSize' | 'fontFamily' | 'lineHeight'>;

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
  shadowColor: '#17100c',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 2,
} satisfies Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

/** PostCard フォーカス相当（Web: .shadow-washi-hover） */
export const shadowWashiHover = {
  shadowColor: '#17100c',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.10,
  shadowRadius: 12,
  elevation: 4,
} satisfies Pick<ViewStyle, 'shadowColor' | 'shadowOffset' | 'shadowOpacity' | 'shadowRadius' | 'elevation'>;

/** モーダル・ドロップアップ（Web: .shadow-washi-lg） */
export const shadowWashiLg = {
  shadowColor: '#17100c',
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
