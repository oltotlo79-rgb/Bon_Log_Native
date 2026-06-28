/**
 * @module app/fertilizers/index
 * 施肥ガイドトップ画面。
 * Web 版 /fertilizers/page.tsx のスマホ表示を忠実に再現する。
 * - ヘッダーバナー画像（header-fertilizer.webp）
 * - 季節TIPS セクション（seasonal-*.webp + テキスト）
 * - ナビカード（栄養素/カテゴリ/樹種タブ切替）
 * - 栄養素タブ: 三大要素・二次要素・微量要素のセクション別カード
 * - カテゴリタブ: CategoryComparisonCard
 * - 樹種タブ: TreeCategory でセクション分けした TreeSpeciesCard + 松柏・雑木のセクション画像
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  SectionList,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFertilizerNutrientsQuery,
  useFertilizerCategoriesQuery,
  useFertilizerTreeSpeciesQuery,
} from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { CatalogTabs } from '@/components/browse/CatalogTabs';
import { NutrientCard } from '@/components/fertilizer/NutrientCard';
import { TreeSpeciesCard } from '@/components/fertilizer/TreeSpeciesCard';
import { CategoryComparisonCard } from '@/components/fertilizer/CategoryComparisonCard';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceKinoko,
  colorSurface,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing8,
  radiusMd,
  radiusFull,
  textSm,
  textMd,
  textLg,
  shadowWashi,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type NutrientItem = components['schemas']['NutrientItem'];
type FertilizerCategoryItem = components['schemas']['FertilizerCategoryItem'];
type TreeSpeciesItem = components['schemas']['TreeSpeciesItem'];

// ---------------------------------------------------------------------------
// タブ定義
// ---------------------------------------------------------------------------

const TABS = [
  { key: 'nutrients', label: '栄養素' },
  { key: 'categories', label: 'カテゴリ' },
  { key: 'tree-species', label: '樹種' },
] as const;

type TabKey = typeof TABS[number]['key'];

// ---------------------------------------------------------------------------
// 季節判定（気象庁区分: 春3-5月 夏6-8月 秋9-11月 冬12-2月）
// ---------------------------------------------------------------------------

type Season = 'spring' | 'summer' | 'autumn' | 'winter';

function getCurrentSeason(): Season {
  const month = new Date().getMonth() + 1;
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

// ---------------------------------------------------------------------------
// 季節TIPS定数
// ---------------------------------------------------------------------------

type SeasonTip = {
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
};

const SEASONAL_TIPS: Record<Season, SeasonTip> = {
  spring: {
    title: '春の施肥 — 成長期の始まり',
    description:
      '芽出し後の肥料が一年の成長を左右します。窒素(N)多めの肥料で葉と枝の成長を促しましょう。ただし花物・実物は花芽分化を妨げないようリン酸(P)重視にします。',
    iconName: 'leaf-outline',
  },
  summer: {
    title: '夏の施肥 — 控えめに管理',
    description:
      '猛暑期（7-8月）は根が弱りやすいため、施肥を控えるか薄めの液肥に切り替えます。梅雨明け直後の施肥は特に注意が必要です。',
    iconName: 'sunny-outline',
  },
  autumn: {
    title: '秋の施肥 — 冬越し準備',
    description:
      'カリウム(K)を増やし耐寒性を高めます。9-10月はしっかり施肥して樹勢を蓄え、11月以降は徐々に控えましょう。紅葉樹は肥料を早めに切ると色づきが良くなります。',
    iconName: 'partly-sunny-outline',
  },
  winter: {
    title: '冬の施肥 — 休眠期は原則不要',
    description:
      '落葉樹は休眠中のため施肥不要です。常緑樹も控えめに。寒肥として2月下旬に有機肥料を置く場合もありますが、地域の気候に合わせてください。',
    iconName: 'snow-outline',
  },
};

// ---------------------------------------------------------------------------
// ヘッダーバナー（画像ソース）
// ---------------------------------------------------------------------------

const HEADER_IMG_LIGHT = require('@/assets/images/fertilizers/header-fertilizer.webp');

// ---------------------------------------------------------------------------
// 季節画像（require はトップレベルで宣言してバンドル対象にする）
// ---------------------------------------------------------------------------

// Metro bundler は require() でローカル画像を number 型の ID として解決する。
// 型安全のため個別定数に切り出して number 推論を確定させてから Record に集める。
const IMG_SEASONAL_SPRING: number = require('@/assets/images/fertilizers/seasonal-spring.webp');
const IMG_SEASONAL_SUMMER: number = require('@/assets/images/fertilizers/seasonal-summer.webp');
const IMG_SEASONAL_AUTUMN: number = require('@/assets/images/fertilizers/seasonal-autumn.webp');
const IMG_SEASONAL_WINTER: number = require('@/assets/images/fertilizers/seasonal-winter.webp');
const IMG_NUTRIENT_NPK: number = require('@/assets/images/fertilizers/nutrient-npk.webp');
const IMG_NUTRIENT_SECONDARY: number = require('@/assets/images/fertilizers/nutrient-secondary.webp');
const IMG_SCHEDULE_CONIFER: number = require('@/assets/images/fertilizers/schedule-conifer.webp');
const IMG_SCHEDULE_DECIDUOUS: number = require('@/assets/images/fertilizers/schedule-deciduous.webp');

const SEASONAL_IMAGES: Record<Season, number> = {
  spring: IMG_SEASONAL_SPRING,
  summer: IMG_SEASONAL_SUMMER,
  autumn: IMG_SEASONAL_AUTUMN,
  winter: IMG_SEASONAL_WINTER,
};

// ---------------------------------------------------------------------------
// 栄養素セクション定義
// ---------------------------------------------------------------------------

type NutrientCategory = 'primary' | 'secondary' | 'trace';

type NutrientSection = {
  key: NutrientCategory;
  label: string;
  image: number;
  data: NutrientItem[];
};

const NUTRIENT_CATEGORY_ORDER: { key: NutrientCategory; label: string; image: number }[] = [
  {
    key: 'primary',
    label: '三大栄養素（N・P・K）',
    image: IMG_NUTRIENT_NPK,
  },
  {
    key: 'secondary',
    label: '二次要素（Ca・Mg・S）',
    image: IMG_NUTRIENT_SECONDARY,
  },
  {
    key: 'trace',
    label: '微量要素',
    image: IMG_NUTRIENT_SECONDARY,
  },
];

// ---------------------------------------------------------------------------
// 樹種セクション定義
// ---------------------------------------------------------------------------

type TreeCategory = 'conifer' | 'deciduous' | 'flowering' | 'fruiting' | 'grass' | 'evergreen';

type TreeSection = {
  key: TreeCategory;
  label: string;
  image: number | null;
  data: TreeSpeciesItem[];
};

const TREE_CATEGORY_ORDER: { key: TreeCategory; label: string; image: number | null }[] = [
  { key: 'conifer',   label: '松柏類',     image: IMG_SCHEDULE_CONIFER },
  { key: 'deciduous', label: '雑木類',     image: IMG_SCHEDULE_DECIDUOUS },
  { key: 'flowering', label: '花物',       image: null },
  { key: 'fruiting',  label: '実物',       image: null },
  { key: 'grass',     label: '草物',       image: null },
  { key: 'evergreen', label: '常緑広葉樹', image: null },
];

// ---------------------------------------------------------------------------
// セクションヘッダー — 栄養素・樹種共通
// ---------------------------------------------------------------------------

type SectionHeaderProps = {
  title: string;
  image: number | null;
};

const SectionHeader = memo(function SectionHeader({ title, image }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeaderContainer}>
      {image !== null && (
        <Image
          source={image}
          style={styles.sectionImage}
          contentFit="cover"
          accessibilityLabel={title}
        />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 栄養素アイテムセル（SectionList renderItem）
// ---------------------------------------------------------------------------

type NutrientItemCellProps = { item: NutrientItem };

const NutrientItemCell = memo(function NutrientItemCell({ item }: NutrientItemCellProps) {
  const handlePress = useCallback(
    (slug: string) =>
      router.push({ pathname: '/fertilizers/nutrients/[slug]', params: { slug } }),
    [],
  );
  return (
    <NutrientCard
      symbol={item.symbol}
      name={item.name}
      category={item.category}
      bonsaiRole={item.bonsaiRole}
      slug={item.slug}
      onPress={handlePress}
    />
  );
});

// ---------------------------------------------------------------------------
// 樹種アイテムセル（SectionList renderItem）
// ---------------------------------------------------------------------------

type TreeSpeciesItemCellProps = { item: TreeSpeciesItem };

const TreeSpeciesItemCell = memo(function TreeSpeciesItemCell({ item }: TreeSpeciesItemCellProps) {
  const handlePress = useCallback(
    (slug: string, name: string) =>
      router.push({
        pathname: '/fertilizers/tree-species/[slug]',
        params: { slug, name },
      }),
    [],
  );
  return (
    <TreeSpeciesCard
      name={item.name}
      category={item.category}
      fertilizingPolicy={item.fertilizingPolicy}
      slug={item.slug}
      onPress={handlePress}
    />
  );
});

// ---------------------------------------------------------------------------
// 栄養素タブ
// ---------------------------------------------------------------------------

type NutrientsTabProps = { isActive: boolean };

function NutrientsTab({ isActive }: NutrientsTabProps) {
  const { data, isLoading, isError, refetch } = useFertilizerNutrientsQuery();
  const insets = useSafeAreaInsets();

  const sections = useMemo<NutrientSection[]>(() => {
    if (data === undefined) return [];
    return NUTRIENT_CATEGORY_ORDER.map(({ key, label, image }) => ({
      key,
      label,
      image,
      data: data.filter((n) => n.category === key),
    })).filter((s) => s.data.length > 0);
  }, [data]);

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (sections.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <SectionHeader title={section.label} image={section.image} />
      )}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <NutrientItemCell item={item} />
        </View>
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// カテゴリタブ
// ---------------------------------------------------------------------------

type CategoriesTabProps = { isActive: boolean };

function CategoriesTab({ isActive }: CategoriesTabProps) {
  const { data, isLoading, isError, refetch } = useFertilizerCategoriesQuery();
  const insets = useSafeAreaInsets();

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (data === undefined || data.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <FlatList<FertilizerCategoryItem>
      data={data}
      keyExtractor={(item) => item.code}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <CategoryComparisonCard
            name={item.name}
            description={item.description}
            merit={item.merit}
            demerit={item.demerit}
            bonsaiUsage={item.bonsaiUsage}
          />
        </View>
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// 樹種タブ
// ---------------------------------------------------------------------------

type TreeSpeciesTabProps = { isActive: boolean };

function TreeSpeciesTab({ isActive }: TreeSpeciesTabProps) {
  const { data, isLoading, isError, refetch } = useFertilizerTreeSpeciesQuery();
  const insets = useSafeAreaInsets();

  const sections = useMemo<TreeSection[]>(() => {
    if (data === undefined) return [];
    return TREE_CATEGORY_ORDER.map(({ key, label, image }) => ({
      key,
      label,
      image,
      data: data.filter((s) => s.category === key),
    })).filter((s) => s.data.length > 0);
  }, [data]);

  if (!isActive) return null;
  if (isLoading) return <ScreenLoading variant="spinner" />;
  if (isError) {
    return (
      <ScreenError
        title="施肥情報を読み込めませんでした。"
        description={ERR_FERTILIZERS_LOAD_FAILED}
        onRetry={() => void refetch()}
      />
    );
  }
  if (sections.length === 0) return <ScreenEmpty title="データがありません" />;

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <SectionHeader title={section.label} image={section.image} />
      )}
      renderItem={({ item }) => (
        <View style={styles.cardWrapper}>
          <TreeSpeciesItemCell item={item} />
        </View>
      )}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + spacing8 }]}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={() => void refetch()} />
      }
    />
  );
}

// ---------------------------------------------------------------------------
// ヘッダー（バナー画像 + 季節TIPS）— FlatList の ListHeaderComponent として使用
// ---------------------------------------------------------------------------

const ScreenHeader = memo(function ScreenHeader() {
  const season = getCurrentSeason();
  const tip = SEASONAL_TIPS[season];
  const seasonImg = SEASONAL_IMAGES[season];

  return (
    <View style={styles.screenHeader}>
      {/* ヘッダーバナー */}
      <Image
        source={HEADER_IMG_LIGHT}
        style={styles.headerBanner}
        contentFit="cover"
        accessibilityLabel="施肥ガイド"
      />

      <Text style={styles.headerDescription}>
        盆栽の健康を支える施肥の基礎知識・樹種別スケジュールを確認できます
      </Text>

      {/* 季節TIPS カード */}
      <View style={styles.seasonCard}>
        <Image
          source={seasonImg}
          style={styles.seasonImage}
          contentFit="cover"
          accessibilityLabel={tip.title}
        />
        <View style={styles.seasonContent}>
          <View style={styles.seasonIconBox}>
            <Ionicons
              name={tip.iconName}
              size={20}
              color={colorActionPrimary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <View style={styles.seasonTextBox}>
            <Text style={styles.seasonTitle}>{tip.title}</Text>
            <Text style={styles.seasonDesc}>{tip.description}</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function FertilizersScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<TabKey>('nutrients');

  const handleTabChange = useCallback((key: string) => {
    if (key === 'nutrients' || key === 'categories' || key === 'tree-species') {
      setActiveTab(key);
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: '施肥ガイド', headerShown: true }} />

      <OfflineBanner isVisible={!isOnline} />

      <ScreenHeader />

      <CatalogTabs
        tabs={TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={activeTab}
        onChange={handleTabChange}
      />

      <View style={styles.tabContent}>
        <NutrientsTab isActive={activeTab === 'nutrients'} />
        <CategoriesTab isActive={activeTab === 'categories'} />
        <TreeSpeciesTab isActive={activeTab === 'tree-species'} />
      </View>
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
  tabContent: {
    flex: 1,
  },

  // ---- ヘッダーエリア ----
  screenHeader: {
    backgroundColor: colorBackground,
  },
  headerBanner: {
    width: '100%',
    aspectRatio: 21 / 9,
  },
  headerDescription: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing4,
    paddingTop: spacing3,
    paddingBottom: spacing4,
  },
  seasonCard: {
    marginHorizontal: spacing4,
    marginBottom: spacing4,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorder,
    backgroundColor: colorSurface,
    overflow: 'hidden',
    ...shadowWashi,
  },
  seasonImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  seasonContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing4,
    padding: spacing5,
  },
  seasonIconBox: {
    width: 40,
    height: 40,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceKinoko,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  seasonTextBox: {
    flex: 1,
    gap: spacing2,
  },
  seasonTitle: {
    ...textMd,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  seasonDesc: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 20,
  },

  // ---- リスト共通 ----
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing3,
  },
  cardWrapper: {
    marginBottom: spacing3,
  },

  // ---- セクションヘッダー ----
  sectionHeaderContainer: {
    marginBottom: spacing3,
    marginTop: spacing4,
    gap: spacing3,
  },
  sectionImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radiusMd,
    overflow: 'hidden',
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
});
