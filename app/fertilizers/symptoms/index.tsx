/**
 * @module app/fertilizers/symptoms/index
 * 症状から探す栄養素。Web 版 /fertilizers/symptoms の完全準拠。
 * 静的コンテンツ + クライアント側インタラクティブ検索。API 不要。
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorSurfaceMuted,
  colorActionPrimary,
  colorCategoryRedPaleBg,
  colorCategoryRedPaleText,
  colorCategoryAmberPaleBg,
  colorCategoryAmberPaleText,
  colorCategoryBluePaleBg,
  colorCategoryBluePaleText,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  radiusFull,
  textSm,
  textXs,
  fontFamilySerifBold,
  shadowWashi,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type Severity = 'high' | 'medium' | 'low';

type NutrientInfo = {
  name: string;
  symbol: string;
  slug: string;
};

type SymptomEntry = {
  symptom: string;
  nutrients: NutrientInfo[];
  explanation: string;
  severity: Severity;
};

// ---------------------------------------------------------------------------
// severity バッジ定数
// デザイントークンの colorError / colorWarning / colorInfo に準拠した背景色を設定
// ---------------------------------------------------------------------------

type SeverityBadgeStyle = {
  label: string;
  backgroundColor: string;
  color: string;
};

const SEVERITY_BADGE: Record<Severity, SeverityBadgeStyle> = {
  high:   { label: '重度', backgroundColor: colorCategoryRedPaleBg,   color: colorCategoryRedPaleText },
  medium: { label: '中度', backgroundColor: colorCategoryAmberPaleBg, color: colorCategoryAmberPaleText },
  low:    { label: '軽度', backgroundColor: colorCategoryBluePaleBg,  color: colorCategoryBluePaleText },
};

// ---------------------------------------------------------------------------
// 静的コンテンツ（Web 版 NutrientSymptomSearch.tsx と同一データ）
// ---------------------------------------------------------------------------

const SYMPTOM_DATA: SymptomEntry[] = [
  {
    symptom: '下位葉の黄化',
    nutrients: [
      { name: '窒素', symbol: 'N', slug: 'nitrogen' },
      { name: 'マグネシウム', symbol: 'Mg', slug: 'magnesium' },
    ],
    explanation:
      '窒素やマグネシウムは移動性の高い要素で、不足すると古い葉から新しい葉へ転流されるため、下位葉から黄化が始まります。',
    severity: 'high',
  },
  {
    symptom: '新葉の黄化',
    nutrients: [
      { name: '鉄', symbol: 'Fe', slug: 'iron' },
      { name: '硫黄', symbol: 'S', slug: 'sulfur' },
      { name: 'マンガン', symbol: 'Mn', slug: 'manganese' },
    ],
    explanation:
      '鉄・硫黄・マンガンは移動性が低く、不足すると新しい葉に供給できないため新葉から症状が現れます。',
    severity: 'high',
  },
  {
    symptom: '葉脈間の黄化',
    nutrients: [
      { name: '鉄', symbol: 'Fe', slug: 'iron' },
      { name: 'マグネシウム', symbol: 'Mg', slug: 'magnesium' },
      { name: 'マンガン', symbol: 'Mn', slug: 'manganese' },
    ],
    explanation:
      '葉脈は緑のまま葉脈間が黄色くなる症状（クロロシス）は、クロロフィル合成に関わる鉄・マグネシウム・マンガンの欠乏を示します。',
    severity: 'medium',
  },
  {
    symptom: '葉の縁が枯れる',
    nutrients: [{ name: 'カリウム', symbol: 'K', slug: 'potassium' }],
    explanation:
      'カリウムは浸透圧調整に関わり、不足すると葉の周縁部から壊死（ネクロシス）が進行します。',
    severity: 'high',
  },
  {
    symptom: '葉が紫色',
    nutrients: [{ name: 'リン酸', symbol: 'P', slug: 'phosphorus' }],
    explanation:
      'リン酸不足ではアントシアニンが蓄積し、葉が紫〜赤紫色に変色します。特に低温期に顕著です。',
    severity: 'medium',
  },
  {
    symptom: '新芽の奇形',
    nutrients: [
      { name: 'カルシウム', symbol: 'Ca', slug: 'calcium' },
      { name: 'ホウ素', symbol: 'B', slug: 'boron' },
    ],
    explanation:
      'カルシウムは細胞壁形成、ホウ素は細胞分裂に必要で、不足すると成長点が変形・壊死します。',
    severity: 'high',
  },
  {
    symptom: '根の発育不良',
    nutrients: [
      { name: 'カルシウム', symbol: 'Ca', slug: 'calcium' },
      { name: 'リン酸', symbol: 'P', slug: 'phosphorus' },
    ],
    explanation:
      'カルシウムは根端の細胞壁構築に、リン酸はエネルギー代謝（ATP）に必須で、不足すると根の伸長が著しく阻害されます。',
    severity: 'high',
  },
  {
    symptom: '花付きが悪い',
    nutrients: [
      { name: 'リン酸', symbol: 'P', slug: 'phosphorus' },
      { name: 'ホウ素', symbol: 'B', slug: 'boron' },
    ],
    explanation:
      'リン酸は花芽分化のエネルギー源、ホウ素は花粉管の伸長に関わるため、不足すると開花・結実が悪化します。',
    severity: 'medium',
  },
  {
    symptom: '小葉症',
    nutrients: [{ name: '亜鉛', symbol: 'Zn', slug: 'zinc' }],
    explanation:
      '亜鉛はオーキシン合成に関与し、不足すると節間が詰まり葉が著しく小さくなります。',
    severity: 'medium',
  },
  {
    symptom: '茎が細い・軟弱',
    nutrients: [{ name: 'カリウム', symbol: 'K', slug: 'potassium' }],
    explanation:
      'カリウムは細胞の膨圧維持と茎の強度に関わり、不足すると茎が徒長して倒伏しやすくなります。',
    severity: 'medium',
  },
  {
    symptom: '耐寒性の低下',
    nutrients: [{ name: 'カリウム', symbol: 'K', slug: 'potassium' }],
    explanation:
      'カリウムは細胞液の濃度調整に関与し、不足すると凍結耐性が下がり冬季のダメージを受けやすくなります。',
    severity: 'low',
  },
  {
    symptom: '全体の生育停滞',
    nutrients: [
      { name: '窒素', symbol: 'N', slug: 'nitrogen' },
      { name: 'リン酸', symbol: 'P', slug: 'phosphorus' },
    ],
    explanation:
      '窒素はタンパク質・クロロフィルの主成分、リン酸はエネルギー代謝の中心で、不足すると植物全体の成長が停滞します。',
    severity: 'high',
  },
];

const TAG_CLOUD_KEYWORDS = [
  '黄化',
  '枯れる',
  '紫色',
  '奇形',
  '根',
  '花',
  '小葉',
  '軟弱',
  '耐寒',
  '生育停滞',
] as const;

// ---------------------------------------------------------------------------
// 症状エントリカード（memo 化）
// ---------------------------------------------------------------------------

type SymptomCardProps = {
  entry: SymptomEntry;
};

const SymptomCard = memo(function SymptomCard({ entry }: SymptomCardProps) {
  const badge = SEVERITY_BADGE[entry.severity];

  const handleNutrientPress = useCallback(
    (slug: string) => {
      router.push({ pathname: '/fertilizers/nutrients/[slug]', params: { slug } });
    },
    [],
  );

  return (
    <View style={styles.symptomCard} accessibilityRole="text">
      <View style={styles.symptomHeaderRow}>
        <Text style={styles.symptomName}>{entry.symptom}</Text>
        <View style={[styles.severityBadge, { backgroundColor: badge.backgroundColor }]}>
          <Text style={[styles.severityBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.explanation}>{entry.explanation}</Text>

      <View style={styles.nutrientChips}>
        {entry.nutrients.map((nutrient) => (
          <TouchableOpacity
            key={nutrient.slug}
            style={styles.nutrientChip}
            onPress={() => handleNutrientPress(nutrient.slug)}
            accessibilityRole="button"
            accessibilityLabel={`${nutrient.name}の詳細へ移動`}
          >
            <Text style={styles.nutrientSymbol}>{nutrient.symbol}</Text>
            <Text style={styles.nutrientName}>{nutrient.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SymptomsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filteredSymptoms = useMemo(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) return SYMPTOM_DATA;
    const lower = trimmed.toLowerCase();
    return SYMPTOM_DATA.filter(
      (entry) =>
        entry.symptom.toLowerCase().includes(lower) ||
        entry.explanation.toLowerCase().includes(lower) ||
        entry.nutrients.some(
          (n) =>
            n.name.toLowerCase().includes(lower) ||
            n.symbol.toLowerCase().includes(lower),
        ),
    );
  }, [query]);

  const handleTagPress = useCallback((keyword: string) => {
    setQuery(keyword);
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SymptomEntry>) => <SymptomCard entry={item} />,
    [],
  );

  const keyExtractor = useCallback((item: SymptomEntry) => item.symptom, []);

  const ListHeaderComponent = useMemo(
    () => (
      <View style={styles.listHeader}>
        {/* 検索フィールド */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colorTextSecondary}
            style={styles.searchIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="症状を入力（例: 葉が黄色い、縁が枯れる）"
            placeholderTextColor={colorTextSecondary}
            accessibilityLabel="症状を入力して検索"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* タグクラウド */}
        <View style={styles.tagCloud}>
          {TAG_CLOUD_KEYWORDS.map((keyword) => (
            <TouchableOpacity
              key={keyword}
              style={styles.tagButton}
              onPress={() => handleTagPress(keyword)}
              accessibilityRole="button"
              accessibilityLabel={`${keyword}で検索`}
            >
              <Text style={styles.tagButtonText}>{keyword}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, handleTagPress],
  );

  const ListEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyBox} accessibilityRole="text">
        <Text style={styles.emptyText}>該当する症状が見つかりませんでした</Text>
      </View>
    ),
    [],
  );

  const ListFooterComponent = useMemo(
    () => (
      <View style={[styles.listFooter, { paddingBottom: insets.bottom + spacing8 }]}>
        <FertilizerDisclaimer />
      </View>
    ),
    [insets.bottom],
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '症状から探す栄養素',
          headerShown: true,
        }}
      />

      <FlatList
        data={filteredSymptoms}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={ItemSeparator}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const ItemSeparator = memo(function ItemSeparator() {
  return <View style={styles.separator} />;
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },

  // ---- FlatList ----
  listContent: {
    paddingTop: spacing4,
    paddingHorizontal: spacing4,
  },
  listHeader: {
    gap: spacing4,
    marginBottom: spacing6,
  },
  listFooter: {
    marginTop: spacing6,
  },

  // ---- 検索ボックス ----
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    gap: spacing2,
    minHeight: 44,
  },
  searchIcon: {
    flexShrink: 0,
  },
  searchInput: {
    flex: 1,
    ...textSm,
    color: colorTextPrimary,
    paddingVertical: spacing3,
  },

  // ---- タグクラウド ----
  tagCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  tagButton: {
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusFull,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 32,
    justifyContent: 'center',
  },
  tagButtonText: {
    ...textXs,
    color: colorTextSecondary,
  },

  // ---- 症状カード ----
  symptomCard: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  symptomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  symptomName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  severityBadge: {
    borderRadius: radiusFull,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  severityBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fontFamilySerifBold,
  },
  explanation: {
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // ---- 栄養素チップ ----
  nutrientChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  nutrientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 32,
  },
  nutrientSymbol: {
    ...textXs,
    color: colorActionPrimary,
    fontFamily: fontFamilySerifBold,
  },
  nutrientName: {
    ...textXs,
    color: colorTextPrimary,
  },

  // ---- 空状態 ----
  emptyBox: {
    paddingVertical: spacing8,
    alignItems: 'center',
  },
  emptyText: {
    ...textSm,
    color: colorTextSecondary,
  },

  // ---- セパレータ ----
  separator: {
    height: spacing3,
  },

});
