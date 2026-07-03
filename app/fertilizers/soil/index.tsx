/**
 * @module app/fertilizers/soil/index
 * 用土と施肥の関係。Web 版 /fertilizers/soil の完全準拠。静的コンテンツ。API 不要。
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorCategoryRedPaleBg,
  colorCategoryRedPaleText,
  colorCategoryOrangePaleBg,
  colorCategoryOrangePaleText,
  colorCategoryYellowPaleBg,
  colorCategoryYellowPaleText,
  colorCategoryGreenPaleBg,
  colorCategoryGreenPaleText,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  radiusMd,
  radiusFull,
  textSm,
  textXs,
  textLg,
  fontFamilySerifBold,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type CecLevel = 'very_low' | 'low' | 'medium' | 'medium_high';

type SoilType = {
  name: string;
  nameEn: string;
  phRange: string;
  cec: CecLevel;
  characteristics: string;
  fertilizerStrategy: string;
};

type SoilRecipe = {
  treeType: string;
  recipe: string;
  reasoning: string;
};

// ---------------------------------------------------------------------------
// CEC バッジ定数 — デザイントークンに未定義のため意味論的カラーをここに集約
// CEC レベルに対応した Web 版の配色に準じた値
// ---------------------------------------------------------------------------

type CecBadgeStyle = {
  label: string;
  backgroundColor: string;
  color: string;
};

const CEC_BADGE: Record<CecLevel, CecBadgeStyle> = {
  very_low:    { label: 'CEC: 極低',  backgroundColor: colorCategoryRedPaleBg,    color: colorCategoryRedPaleText },
  low:         { label: 'CEC: 低',    backgroundColor: colorCategoryOrangePaleBg, color: colorCategoryOrangePaleText },
  medium:      { label: 'CEC: 中',    backgroundColor: colorCategoryYellowPaleBg, color: colorCategoryYellowPaleText },
  medium_high: { label: 'CEC: 中〜高', backgroundColor: colorCategoryGreenPaleBg, color: colorCategoryGreenPaleText },
};

// ---------------------------------------------------------------------------
// 静的コンテンツ（Web 版 /fertilizers/soil/page.tsx と同一データ）
// ---------------------------------------------------------------------------

const SOIL_TYPES: SoilType[] = [
  {
    name: '赤玉土',
    nameEn: 'Akadama',
    phRange: '6.0〜6.5',
    cec: 'medium_high',
    characteristics:
      '関東ローム層から採取される粒状の火山灰土。適度な保水性と排水性を兼ね備え、盆栽用土の基本となる。粒が崩れやすいため定期的な植え替えが必要。',
    fertilizerStrategy:
      '保肥力が比較的高く、置き肥の成分をよく保持する。標準的な施肥量で問題ない。古くなると粒が崩れて排水性が低下し、肥料成分の偏りが起きやすくなるため、植え替えサイクルを守ることが重要。',
  },
  {
    name: '鹿沼土',
    nameEn: 'Kanuma',
    phRange: '4.5〜5.0',
    cec: 'medium',
    characteristics:
      '栃木県鹿沼市近郊で産出される軽石質の火山灰土。酸性が強く、保水性に優れる。皐月（サツキ）やツツジなど酸性土壌を好む樹種に最適。',
    fertilizerStrategy:
      '酸性が強いため、アルカリ性に傾く石灰系肥料は避ける。有機肥料との相性が良い。鉄やマンガンの可給性が高いが、リン酸が固定されやすいため、骨粉など有機態リン酸の併用が効果的。',
  },
  {
    name: '桐生砂',
    nameEn: 'Kiryu-zuna',
    phRange: '6.0〜7.0',
    cec: 'low',
    characteristics:
      '群馬県桐生市周辺で産出される硬質の砂礫。排水性に極めて優れ、粒が崩れにくい。松柏類の用土として定評がある。',
    fertilizerStrategy:
      '保肥力が低いため、施した肥料成分が灌水で流れやすい。置き肥を多めに配置するか、液肥の頻度を上げて補う。一方で肥料焼けのリスクは低く、初心者にも扱いやすい。',
  },
  {
    name: '富士砂',
    nameEn: 'Fuji-zuna',
    phRange: '6.5〜7.0',
    cec: 'very_low',
    characteristics:
      '富士山麓の火山性砕屑物（スコリア）。黒色で重く、排水性が極めて高い。鉄分を多く含み、根の発達を促す効果がある。',
    fertilizerStrategy:
      '保肥力がほとんどないため、肥料成分の流亡が激しい。有機固形肥料を多めに設置し、補助的に液肥を併用するのが効果的。単用よりも赤玉土との混合で保肥力を補う使い方が一般的。',
  },
  {
    name: '日向土',
    nameEn: 'Hyuga-tsuchi',
    phRange: '5.5〜6.5',
    cec: 'medium',
    characteristics:
      '宮崎県で産出される多孔質の軽石。優れた通気性と適度な保水性を持ち、根腐れ防止に効果的。粒が硬く崩れにくい。',
    fertilizerStrategy:
      '多孔質構造が肥料成分をある程度保持するため、標準的な施肥量で管理できる。通気性が良く根が健全に発達しやすいので、肥料の吸収効率も良好。排水が良いため梅雨時の肥料腐敗も起きにくい。',
  },
  {
    name: '軽石',
    nameEn: 'Karui-ishi (Pumice)',
    phRange: '6.5〜7.0',
    cec: 'very_low',
    characteristics:
      '火山性の多孔質軽石。極めて軽量で排水性に優れる。大型盆栽の鉢底石や、排水改善のための混合材として使用。',
    fertilizerStrategy:
      '保肥力がほとんどないため、軽石の割合が多い用土配合では肥料成分が流亡しやすい。他の保肥力のある用土（赤玉土等）と混合し、施肥頻度を増やして対応する。',
  },
];

const SOIL_RECIPES: SoilRecipe[] = [
  {
    treeType: '松柏類（黒松・赤松・真柏等）',
    recipe: '赤玉土 6：桐生砂 3：富士砂 1',
    reasoning:
      '排水性を重視しつつ赤玉土で保肥力を確保。松柏類は過湿を嫌うため砂系を多めに配合。施肥は標準〜やや多めで管理できる。',
  },
  {
    treeType: '雑木類（楓・欅・銀杏等）',
    recipe: '赤玉土 7：桐生砂 2：腐葉土 1',
    reasoning:
      '保水性・保肥力を高めに設定。雑木類は水分と肥料を多く必要とするため赤玉土の比率を上げる。腐葉土で微量要素も補給。',
  },
  {
    treeType: '皐月・ツツジ類',
    recipe: '鹿沼土 8：日向土 2',
    reasoning:
      '酸性土壌を好む樹種に最適な配合。鹿沼土の酸性とリン酸固定を考慮し、有機態リン酸の施肥が重要。',
  },
  {
    treeType: '花物・実物（梅・桜・柿等）',
    recipe: '赤玉土 6：日向土 2：腐葉土 2',
    reasoning:
      '開花・結実にはリン酸の安定供給が必要。赤玉土と日向土で保肥力と通気性のバランスを取り、腐葉土で微生物活性を高める。',
  },
];

// ---------------------------------------------------------------------------
// 用土カード（memo 化）
// ---------------------------------------------------------------------------

const SoilCard = memo(function SoilCard({ soil }: { soil: SoilType }) {
  const badge = CEC_BADGE[soil.cec];
  return (
    <View style={styles.soilCard} accessibilityRole="text">
      <View style={styles.soilCardHeader}>
        <View style={styles.soilNameBlock}>
          <Text style={styles.soilName}>{soil.name}</Text>
          <Text style={styles.soilNameEn}>{soil.nameEn}</Text>
        </View>
        <View style={[styles.cecBadge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.cecBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={styles.phRow}>
        <Text style={styles.phLabel}>pH</Text>
        <Text style={styles.phValue}>{soil.phRange}</Text>
      </View>

      <Text style={styles.soilBodyText}>{soil.characteristics}</Text>

      <View style={styles.strategyBox}>
        <Text style={styles.strategyLabel}>施肥のポイント</Text>
        <Text style={styles.soilBodyText}>{soil.fertilizerStrategy}</Text>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SoilFertilizerScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '用土と施肥の関係',
          headerShown: true,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* CEC 説明セクション */}
        <View style={styles.cecSection} accessibilityRole="text">
          <Text style={styles.sectionTitle}>CEC（陽イオン交換容量）とは</Text>
          <Text style={styles.bodyText}>
            CEC（Cation Exchange Capacity）とは、土壌がどれだけ肥料成分（陽イオン）を保持できるかを示す指標です。CEC が高い用土は肥料成分をしっかり蓄え、灌水で流れにくい特徴があります。
          </Text>
          <Text style={styles.bodyText}>
            盆栽では鉢が小さく用土量が限られるため、用土の CEC は施肥戦略を左右する重要な要素です。CEC が低い用土では施肥頻度を上げるか、CEC が高い用土を混合して保肥力を補います。
          </Text>
        </View>

        {/* 用土の特性セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>主な盆栽用土の特性</Text>
          {SOIL_TYPES.map((soil) => (
            <SoilCard key={soil.name} soil={soil} />
          ))}
        </View>

        {/* 推奨配合セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>樹種別の推奨用土配合</Text>
          <Text style={styles.sectionSubText}>
            用土配合は施肥計画と一体で考えます。保肥力のバランスを意識した代表的な配合例です。
          </Text>
          {SOIL_RECIPES.map((recipe) => (
            <View key={recipe.treeType} style={styles.recipeItem} accessibilityRole="text">
              <Text style={styles.recipeTreeType}>{recipe.treeType}</Text>
              <View style={styles.recipeMixBox}>
                <Text style={styles.recipeMixText}>{recipe.recipe}</Text>
              </View>
              <Text style={styles.bodyText}>{recipe.reasoning}</Text>
            </View>
          ))}
        </View>

        {/* 免責注記 */}
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
    paddingTop: spacing4,
    paddingHorizontal: spacing4,
  },

  // ---- CEC 説明 ----
  cecSection: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing5,
    gap: spacing3,
    ...shadowWashi,
  },
  sectionTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  bodyText: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // ---- セクション共通 ----
  section: {
    gap: spacing4,
  },
  sectionHeading: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionSubText: {
    ...textSm,
    color: colorTextSecondary,
    marginTop: -spacing2,
  },

  // ---- 用土カード ----
  soilCard: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing5,
    gap: spacing3,
    ...shadowWashi,
  },
  soilCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing2,
  },
  soilNameBlock: {
    flex: 1,
    gap: spacing2,
  },
  soilName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  soilNameEn: {
    ...textXs,
    color: colorTextSecondary,
  },
  cecBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing3,
    paddingVertical: 3,
    flexShrink: 0,
  },
  cecBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fontFamilySerifBold,
  },
  phRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  phLabel: {
    ...textXs,
    color: colorTextSecondary,
  },
  phValue: {
    ...textXs,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  soilBodyText: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },
  strategyBox: {
    borderTopWidth: 1,
    borderTopColor: colorBorder,
    paddingTop: spacing3,
    gap: spacing2,
  },
  strategyLabel: {
    ...textXs,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },

  // ---- 推奨配合 ----
  recipeItem: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  recipeTreeType: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  recipeMixBox: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    alignSelf: 'flex-start',
  },
  recipeMixText: {
    fontSize: 12,
    lineHeight: 18,
    color: colorTextPrimary,
    // モノスペースフォントに近い表示のためフォントを指定しない（システムフォント）
  },

  // ---- 免責 ----
  disclaimerWrapper: {
    // 余白は scrollContent の gap で制御
  },
});
