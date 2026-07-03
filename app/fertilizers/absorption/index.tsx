/**
 * @module app/fertilizers/absorption/index
 * 栄養素の吸収と転流 画面。
 * Web 版は SVG インタラクティブ図だが SVG ライブラリ禁止のため、
 * View ベースの段階図と栄養素カードで同等の内容を静的に表現する。
 * 参照: Bon_Log_cfw/components/fertilizer/NutrientAbsorptionDiagram.tsx
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorSurfaceKinoko,
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorCategoryGreenLightBg,
  colorCategoryGreenLightText,
  colorCategoryAmberBg,
  colorCategoryAmberText,
  colorCategoryBlueBg,
  colorCategoryBlueText,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusLg,
  radiusFull,
  textXs,
  textSm,
  textBase,
  textLg,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 栄養素データ（Web NutrientAbsorptionDiagram の NUTRIENTS と同内容）
// ---------------------------------------------------------------------------

type NutrientKey = 'N' | 'P' | 'K' | 'Ca' | 'Mg' | 'Fe';

type NutrientData = {
  symbol: NutrientKey;
  name: string;
  slug: string;
  ionForm: string;
  mobile: boolean;
  absorption: string;
  usage: string;
  mobility: string;
};

const NUTRIENTS: NutrientData[] = [
  {
    symbol: 'N',
    name: '窒素',
    slug: 'nitrogen',
    ionForm: 'NO₃⁻ / NH₄⁺',
    mobile: true,
    absorption:
      '能動輸送により根毛から吸収。硝酸態(NO₃⁻)は水と共に受動的に、アンモニア態(NH₄⁺)はトランスポーターで能動的に取り込まれます。',
    usage:
      'アミノ酸・タンパク質・クロロフィル(葉緑素)の構成元素。葉の成長と光合成に不可欠です。',
    mobility:
      '移動性が高く、不足すると古い葉から新しい葉へ再転流されるため、下位葉から黄化が始まります。',
  },
  {
    symbol: 'P',
    name: 'リン酸',
    slug: 'phosphorus',
    ionForm: 'H₂PO₄⁻',
    mobile: true,
    absorption:
      'リン酸イオン(H₂PO₄⁻)として根毛から能動輸送で吸収。土壌中での移動性が低いため、菌根菌との共生が吸収を助けます。',
    usage:
      'ATP(エネルギー通貨)・DNA・RNAの構成要素。細胞分裂、花芽形成、根の発達に重要です。',
    mobility:
      '移動性があり、不足すると古い組織から新しい組織へ移動します。欠乏時は葉が紫色に変色します。',
  },
  {
    symbol: 'K',
    name: 'カリウム',
    slug: 'potassium',
    ionForm: 'K⁺',
    mobile: true,
    absorption:
      'カリウムイオン(K⁺)として根から能動輸送で吸収。吸収量が多く、植物体内で最も濃度の高いカチオンです。',
    usage:
      '気孔の開閉制御・浸透圧調整・酵素活性化。耐病性・耐寒性を高め、果実の品質向上に寄与します。',
    mobility:
      '移動性が高く、不足すると古い葉の縁から壊死(ネクロシス)が進行します。',
  },
  {
    symbol: 'Ca',
    name: 'カルシウム',
    slug: 'calcium',
    ionForm: 'Ca²⁺',
    mobile: false,
    absorption:
      'カルシウムイオン(Ca²⁺)として根の先端部から受動的に吸収。蒸散流に乗って道管(木部)のみを移動します。',
    usage:
      '細胞壁のペクチン酸カルシウムとして構造を強化。細胞膜の安定性維持やシグナル伝達にも関与します。',
    mobility:
      '非移動性 — 道管のみを移動し、師管(篩部)では移動しません。そのため蒸散の少ない新芽や果実で欠乏しやすくなります。',
  },
  {
    symbol: 'Mg',
    name: 'マグネシウム',
    slug: 'magnesium',
    ionForm: 'Mg²⁺',
    mobile: true,
    absorption:
      'マグネシウムイオン(Mg²⁺)として根から吸収。カリウムやカルシウムが過剰だと拮抗作用で吸収が阻害されます。',
    usage:
      'クロロフィル分子の中心原子。光合成の中核を担い、リン酸代謝の酵素活性化にも必要です。',
    mobility:
      '移動性があり、不足すると古い葉の葉脈間から黄化(クロロシス)が始まります。',
  },
  {
    symbol: 'Fe',
    name: '鉄',
    slug: 'iron',
    ionForm: 'Fe²⁺ / Fe³⁺',
    mobile: false,
    absorption:
      'Fe³⁺を根の表面でFe²⁺に還元してから吸収(Strategy I)。アルカリ土壌では吸収が阻害されやすくなります。',
    usage:
      'クロロフィル合成酵素の補因子。電子伝達系(光合成・呼吸)のシトクロムやフェレドキシンの構成元素です。',
    mobility:
      '非移動性 — 一度葉に固定されると再移動しにくいため、不足すると新葉から黄化が始まります。',
  },
];

const MOBILE_NUTRIENTS = NUTRIENTS.filter((n) => n.mobile);
const IMMOBILE_NUTRIENTS = NUTRIENTS.filter((n) => !n.mobile);

// ---------------------------------------------------------------------------
// 輸送経路ステップ定数
// ---------------------------------------------------------------------------

type TransportStep = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  bg: string;
};

const TRANSPORT_STEPS: TransportStep[] = [
  {
    icon: 'water-outline',
    label: '土壌溶液からの溶出',
    description: '土壌中の有機・無機態栄養素が分解・溶出し、イオン態として土壌溶液に存在します。',
    bg: colorSurfaceKinoko,
  },
  {
    icon: 'arrow-up-outline',
    label: '根毛での吸収',
    description: '根毛のトランスポーター（担体タンパク質）が栄養素を能動的または受動的に細胞内へ取り込みます。',
    bg: colorSurfaceKinoko,
  },
  {
    icon: 'git-branch-outline',
    label: '道管（木部）を経由した上昇',
    description: '根から吸収された栄養素は、蒸散流に乗って道管（木部）を通じて葉まで上昇します。',
    bg: colorSurfaceKinoko,
  },
  {
    icon: 'refresh-outline',
    label: '師管（篩部）を経由した再転流',
    description: '移動性の高い栄養素（N・P・K・Mg）は師管を通じて必要な場所へ再分配されます。',
    bg: colorSurfaceKinoko,
  },
];

// ---------------------------------------------------------------------------
// NutrientAbsorptionCard — 個別栄養素カード
// ---------------------------------------------------------------------------

type NutrientAbsorptionCardProps = {
  nutrient: NutrientData;
};

const NutrientAbsorptionCard = memo(function NutrientAbsorptionCard({
  nutrient,
}: NutrientAbsorptionCardProps) {
  const handlePress = () => {
    router.push({
      pathname: '/fertilizers/nutrients/[slug]',
      params: { slug: nutrient.slug },
    });
  };

  const mobilityColors = nutrient.mobile
    ? { bg: colorCategoryGreenLightBg, text: colorCategoryGreenLightText }
    : { bg: colorCategoryAmberBg, text: colorCategoryAmberText };

  return (
    <View style={styles.nutrientCard}>
      <View style={styles.nutrientCardHeader}>
        <View style={styles.nutrientSymbolBox}>
          <Text style={styles.nutrientSymbol}>{nutrient.symbol}</Text>
        </View>
        <View style={styles.nutrientNameBlock}>
          <Text style={styles.nutrientName}>
            {nutrient.name}（{nutrient.symbol}）
          </Text>
          <Text style={styles.nutrientIonForm}>吸収形態: {nutrient.ionForm}</Text>
        </View>
        <View style={[styles.mobilityBadge, { backgroundColor: mobilityColors.bg }]}>
          <Text style={[styles.mobilityBadgeText, { color: mobilityColors.text }]}>
            {nutrient.mobile ? '移動性' : '非移動性'}
          </Text>
        </View>
      </View>

      <View style={styles.nutrientDetails}>
        <View style={styles.nutrientDetailRow}>
          <Text style={styles.nutrientDetailLabel}>吸収: </Text>
          <Text style={styles.nutrientDetailValue}>{nutrient.absorption}</Text>
        </View>
        <View style={styles.nutrientDetailRow}>
          <Text style={styles.nutrientDetailLabel}>役割: </Text>
          <Text style={styles.nutrientDetailValue}>{nutrient.usage}</Text>
        </View>
        <View style={styles.nutrientDetailRow}>
          <Text style={styles.nutrientDetailLabel}>転流: </Text>
          <Text style={styles.nutrientDetailValue}>{nutrient.mobility}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.detailLink}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`${nutrient.name}の詳細ページへ移動`}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.detailLinkText}>{nutrient.name}の詳細ページへ</Text>
        <Ionicons
          name="chevron-forward"
          size={12}
          color={colorActionPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizersAbsorptionScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '栄養素の吸収と転流', headerShown: true }} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ページ説明 */}
        <Text style={styles.pageDescription}>
          根から吸収された栄養素が植物体内をどのように移動するかを、段階図と栄養素ごとの解説で確認できます。
        </Text>

        {/* 輸送経路 段階図 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            吸収と輸送の流れ
          </Text>

          <View style={styles.stepsContainer}>
            {TRANSPORT_STEPS.map((step, index) => (
              <View key={step.label} style={styles.stepRow}>
                <View style={styles.stepLeft}>
                  <View style={styles.stepIconBox}>
                    <Ionicons
                      name={step.icon}
                      size={18}
                      color={colorActionPrimary}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  </View>
                  {index < TRANSPORT_STEPS.length - 1 && (
                    <View style={styles.stepConnector} />
                  )}
                </View>
                <View style={[styles.stepCard, { backgroundColor: step.bg }]}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* 移動性の凡例 */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colorCategoryGreenLightBg }]}>
              <View style={[styles.legendDotInner, { backgroundColor: colorCategoryGreenLightText }]} />
            </View>
            <Text style={styles.legendText}>移動性（師管で再転流）</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colorCategoryAmberBg }]}>
              <View style={[styles.legendDotInner, { backgroundColor: colorCategoryAmberText }]} />
            </View>
            <Text style={styles.legendText}>非移動性（道管のみ）</Text>
          </View>
        </View>

        {/* 移動性栄養素 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleBadge, { backgroundColor: colorCategoryGreenLightBg }]}>
              <Text style={[styles.sectionTitleBadgeText, { color: colorCategoryGreenLightText }]}>
                移動性
              </Text>
            </View>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              再転流できる栄養素
            </Text>
          </View>
          <Text style={styles.sectionNote}>
            師管（篩部）を通じて植物体内を自由に移動できます。不足時は古い葉から新しい葉へ再配分されるため、下位葉・古葉から症状が現れます。
          </Text>
          <View style={styles.cardList}>
            {MOBILE_NUTRIENTS.map((n) => (
              <NutrientAbsorptionCard key={n.symbol} nutrient={n} />
            ))}
          </View>
        </View>

        {/* 非移動性栄養素 */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleBadge, { backgroundColor: colorCategoryAmberBg }]}>
              <Text style={[styles.sectionTitleBadgeText, { color: colorCategoryAmberText }]}>
                非移動性
              </Text>
            </View>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              移動しにくい栄養素
            </Text>
          </View>
          <Text style={styles.sectionNote}>
            道管（木部）のみを通じて上昇し、一度定着すると再移動しません。蒸散の少ない新芽や果実で欠乏が起きやすく、新葉から症状が現れます。
          </Text>
          <View style={styles.cardList}>
            {IMMOBILE_NUTRIENTS.map((n) => (
              <NutrientAbsorptionCard key={n.symbol} nutrient={n} />
            ))}
          </View>
        </View>

        {/* 分類一覧表 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            移動性分類表
          </Text>
          <View style={styles.classificationTable}>
            <View style={styles.tableHeader}>
              <View style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>移動性</Text>
              </View>
              <View style={styles.tableHeaderCell}>
                <Text style={styles.tableHeaderText}>栄養素</Text>
              </View>
              <View style={[styles.tableHeaderCell, styles.tableHeaderCellLast]}>
                <Text style={styles.tableHeaderText}>欠乏症状の出る葉</Text>
              </View>
            </View>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { backgroundColor: colorCategoryGreenLightBg }]}>
                <Text style={[styles.tableCellBadge, { color: colorCategoryGreenLightText }]}>
                  移動性
                </Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellText}>
                  {MOBILE_NUTRIENTS.map((n) => `${n.symbol}（${n.name}）`).join('\n')}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellLast]}>
                <Text style={styles.tableCellText}>下位葉・古葉から</Text>
              </View>
            </View>
            <View style={[styles.tableRow, styles.tableRowLast]}>
              <View style={[styles.tableCell, { backgroundColor: colorCategoryAmberBg }]}>
                <Text style={[styles.tableCellBadge, { color: colorCategoryAmberText }]}>
                  非移動性
                </Text>
              </View>
              <View style={styles.tableCell}>
                <Text style={styles.tableCellText}>
                  {IMMOBILE_NUTRIENTS.map((n) => `${n.symbol}（${n.name}）`).join('\n')}
                </Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellLast]}>
                <Text style={styles.tableCellText}>新葉・生長点から</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 道管と師管の補足 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            道管（木部）と師管（篩部）の役割
          </Text>
          <View style={styles.vesselCards}>
            <View style={[styles.vesselCard, { borderLeftColor: colorCategoryBlueBg }]}>
              <Text style={[styles.vesselCardTitle, { color: colorCategoryBlueText }]}>
                道管（木部）
              </Text>
              <Text style={styles.vesselCardDescription}>
                根から葉へ水と無機栄養素を上昇させる一方通行の管。蒸散によって生じる張力（引力）が駆動力となります。移動性・非移動性を問わず、吸収されたすべての栄養素はまず道管を経由します。
              </Text>
            </View>
            <View style={[styles.vesselCard, { borderLeftColor: colorCategoryGreenLightBg }]}>
              <Text style={[styles.vesselCardTitle, { color: colorCategoryGreenLightText }]}>
                師管（篩部）
              </Text>
              <Text style={styles.vesselCardDescription}>
                光合成産物（主に砂糖）と移動性栄養素を各組織へ分配する双方向の管。移動性栄養素（N・P・K・Mg）はこの師管を通じて古い葉から新しい葉や根へ再転流されます。
              </Text>
            </View>
          </View>
        </View>

        {/* 施肥一覧リンク */}
        <View style={styles.backLinkWrapper}>
          <TouchableOpacity
            onPress={() => router.push('/fertilizers')}
            style={styles.backLink}
            accessibilityRole="button"
            accessibilityLabel="施肥ガイドに戻る"
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={colorActionPrimary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.backLinkText}>施肥ガイドに戻る</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.disclaimerWrapper}>
          <FertilizerDisclaimer />
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing6,
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },

  pageDescription: {
    ...textBase,
    color: colorTextSecondary,
    lineHeight: 22,
  },

  // ---- セクション ----
  section: {
    gap: spacing3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionTitleBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  sectionTitleBadgeText: {
    ...textXs,
    fontWeight: '500',
    lineHeight: 16,
  },
  sectionNote: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  cardList: {
    gap: spacing3,
  },

  // ---- 輸送ステップ ----
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing3,
  },
  stepLeft: {
    alignItems: 'center',
    width: 36,
  },
  stepIconBox: {
    width: 36,
    height: 36,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    minHeight: 12,
    backgroundColor: colorBorderLight,
    marginVertical: 4,
  },
  stepCard: {
    flex: 1,
    borderRadius: radiusMd,
    padding: spacing3,
    marginBottom: spacing3,
    borderWidth: 1,
    borderColor: colorBorderLight,
  },
  stepLabel: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
    marginBottom: spacing2,
  },
  stepDescription: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // ---- 凡例 ----
  legendRow: {
    flexDirection: 'row',
    gap: spacing4,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDotInner: {
    width: 8,
    height: 8,
    borderRadius: radiusFull,
  },
  legendText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // ---- 栄養素カード ----
  nutrientCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  nutrientCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing3,
  },
  nutrientSymbolBox: {
    width: 36,
    height: 36,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nutrientSymbol: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '700',
  },
  nutrientNameBlock: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nutrientName: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  nutrientIonForm: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 14,
  },
  mobilityBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  mobilityBadgeText: {
    ...textXs,
    fontWeight: '500',
    lineHeight: 16,
  },
  nutrientDetails: {
    gap: spacing2,
  },
  nutrientDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nutrientDetailLabel: {
    ...textXs,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 0,
    lineHeight: 18,
  },
  nutrientDetailValue: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
    flex: 1,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
  },
  detailLinkText: {
    ...textXs,
    color: colorActionPrimary,
    textDecorationLine: 'underline',
  },

  // ---- 分類表 ----
  classificationTable: {
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colorSurfaceKinoko,
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
  },
  tableHeaderCell: {
    flex: 1,
    padding: spacing3,
    borderRightWidth: 1,
    borderRightColor: colorBorder,
  },
  tableHeaderCellLast: {
    borderRightWidth: 0,
  },
  tableHeaderText: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: spacing3,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colorBorder,
  },
  tableCellLast: {
    borderRightWidth: 0,
  },
  tableCellBadge: {
    ...textXs,
    fontWeight: '600',
    lineHeight: 16,
  },
  tableCellText: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // ---- 道管・師管カード ----
  vesselCards: {
    gap: spacing3,
  },
  vesselCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    borderLeftWidth: 4,
    padding: spacing4,
    gap: spacing2,
    ...shadowWashi,
  },
  vesselCardTitle: {
    ...textSm,
    fontWeight: '700',
  },
  vesselCardDescription: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // ---- 戻りリンク ----
  backLinkWrapper: {
    alignItems: 'flex-start',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
  },
  backLinkText: {
    ...textSm,
    color: colorActionPrimary,
  },

  // ---- 免責 ----
  disclaimerWrapper: {},
});

