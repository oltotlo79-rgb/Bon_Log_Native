/**
 * @module app/fertilizers/index
 * 施肥ガイドトップ画面。Web 版 /fertilizers の完全準拠再構築。
 *
 * スクロール不具合の根本修正:
 * 従来の「ヘッダー固定 View + タブ切替 + flex:1 のタブコンテンツ」構造を廃止し、
 * 画面全体を単一の ScrollView で包む縦一本スクロール構成に変更する。
 * ヘッダーバナー・季節TIPS・ナビカード 7 枚・栄養素セクションをすべてスクロール内に収める。
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useFertilizerNutrientsQuery,
  useFertilizerTreeSpeciesQuery,
} from '@/lib/queries/fertilizers';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { ScreenError } from '@/components/common/ScreenError';
import { NavCard } from '@/components/common/NavCard';
import { NutrientCard } from '@/components/fertilizer/NutrientCard';
import { FertilizerDisclaimer } from '@/components/fertilizer/FertilizerDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_FERTILIZERS_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorBorder,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorSurfaceKinoko,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
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

// ---------------------------------------------------------------------------
// 季節判定
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
// 画像（require はトップレベルで宣言してバンドル対象にする）
// ---------------------------------------------------------------------------

const HEADER_IMG: number = require('@/assets/images/fertilizers/header-fertilizer.webp');

const IMG_SEASONAL_SPRING: number = require('@/assets/images/fertilizers/seasonal-spring.webp');
const IMG_SEASONAL_SUMMER: number = require('@/assets/images/fertilizers/seasonal-summer.webp');
const IMG_SEASONAL_AUTUMN: number = require('@/assets/images/fertilizers/seasonal-autumn.webp');
const IMG_SEASONAL_WINTER: number = require('@/assets/images/fertilizers/seasonal-winter.webp');
const IMG_NUTRIENT_NPK: number = require('@/assets/images/fertilizers/nutrient-npk.webp');
const IMG_NUTRIENT_SECONDARY: number = require('@/assets/images/fertilizers/nutrient-secondary.webp');

const SEASONAL_IMAGES: Record<Season, number> = {
  spring: IMG_SEASONAL_SPRING,
  summer: IMG_SEASONAL_SUMMER,
  autumn: IMG_SEASONAL_AUTUMN,
  winter: IMG_SEASONAL_WINTER,
};

// ---------------------------------------------------------------------------
// ナビカード定義
// ---------------------------------------------------------------------------

type NavCardDef = {
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  getDescription: (nutrientCount?: number, treeCount?: number) => string;
  onPress: () => void;
};

// アイコンは Ionicons から Web の lucide-react に最も近いものを選択。
// beaker → flask-outline, grid → grid-outline, tree → leaf-outline,
// book → book-outline, package → cube-outline, layers → layers-outline, cloud-rain → rainy-outline
const NAV_CARD_DEFS: NavCardDef[] = [
  {
    iconName: 'flask-outline',
    label: '栄養素辞典',
    getDescription: (n) => n !== undefined && n > 0 ? `N・P・Kなど${n}種の栄養素を解説` : 'N・P・Kなどの栄養素を解説',
    onPress: () => router.push('/fertilizers/nutrients'),
  },
  {
    iconName: 'grid-outline',
    label: '肥料カテゴリ比較',
    getDescription: () => '有機肥料・化成肥料・液肥などを比較',
    onPress: () => router.push('/fertilizers/categories'),
  },
  {
    iconName: 'leaf-outline',
    label: '樹種別施肥スケジュール',
    getDescription: (_, t) => t !== undefined && t > 0 ? `${t}樹種の月別カレンダー` : '樹種ごとの月別施肥カレンダー',
    onPress: () => router.push('/fertilizers/schedules'),
  },
  {
    iconName: 'book-outline',
    label: 'コラム・読みもの',
    getDescription: () => '施肥テクニックや基礎知識',
    onPress: () => router.push('/fertilizers/schedules'),
  },
  {
    iconName: 'cube-outline',
    label: '定番肥料ガイド',
    getDescription: () => '盆栽栽培でよく使われる肥料製品を紹介',
    onPress: () => router.push('/fertilizers/schedules'),
  },
  {
    iconName: 'layers-outline',
    label: '用土と施肥の関係',
    getDescription: () => '用土の種類と保肥力が施肥に与える影響',
    onPress: () => router.push('/fertilizers/schedules'),
  },
  {
    iconName: 'rainy-outline',
    label: '水やりと施肥の関係',
    getDescription: () => '灌水と施肥の適切な組み合わせ',
    onPress: () => router.push('/fertilizers/schedules'),
  },
];

// ---------------------------------------------------------------------------
// NutrientCard ラッパー（memo 化済みコンポーネントに押す handler を安定化）
// ---------------------------------------------------------------------------

const NutrientItemCell = memo(function NutrientItemCell({ item }: { item: NutrientItem }) {
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
// Screen
// ---------------------------------------------------------------------------

export default function FertilizersScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const {
    data: nutrients,
    isLoading: isNutrientsLoading,
    isError: isNutrientsError,
    refetch: refetchNutrients,
  } = useFertilizerNutrientsQuery();

  const {
    data: treeSpecies,
    isLoading: isTreeLoading,
    refetch: refetchTree,
  } = useFertilizerTreeSpeciesQuery();

  const isLoading = isNutrientsLoading || isTreeLoading;

  const handleRefresh = useCallback(() => {
    void refetchNutrients();
    void refetchTree();
  }, [refetchNutrients, refetchTree]);

  const primaryNutrients = useMemo(
    () => (nutrients ?? []).filter((n) => n.category === 'primary'),
    [nutrients],
  );
  const secondaryNutrients = useMemo(
    () => (nutrients ?? []).filter((n) => n.category === 'secondary'),
    [nutrients],
  );

  const season = getCurrentSeason();
  const tip = SEASONAL_TIPS[season];
  const seasonImg = SEASONAL_IMAGES[season];

  const nutrientCount = nutrients?.length;
  const treeCount = treeSpecies?.length;

  if (isLoading) return <ScreenLoading variant="spinner" />;

  if (isNutrientsError && nutrients === undefined) {
    return (
      <>
        <Stack.Screen options={{ title: '施肥ガイド', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="施肥情報を読み込めませんでした。"
          description={ERR_FERTILIZERS_LOAD_FAILED}
          onRetry={() => void refetchNutrients()}
        />
      </>
    );
  }

  if (primaryNutrients.length === 0 && !isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '施肥ガイド', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="データがありません" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '施肥ガイド', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      {/* 画面全体を単一の ScrollView で包む — スクロール不具合の根本修正 */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ヘッダーバナー */}
        <Image
          source={HEADER_IMG}
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

        {/* ナビカード 7 枚 */}
        <View style={styles.navCardsSection}>
          {NAV_CARD_DEFS.map((def) => (
            <NavCard
              key={def.label}
              iconName={def.iconName}
              label={def.label}
              description={def.getDescription(nutrientCount, treeCount)}
              onPress={def.onPress}
            />
          ))}
        </View>

        {/* 免責注記 */}
        <View style={styles.disclaimerWrapper}>
          <FertilizerDisclaimer />
        </View>

        {/* 三大栄養素セクション */}
        {primaryNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <Image
              source={IMG_NUTRIENT_NPK}
              style={styles.sectionImage}
              contentFit="cover"
              accessibilityLabel="三大栄養素"
            />
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>三大栄養素（N・P・K）</Text>
              <TouchableOpacity
                onPress={() => router.push('/fertilizers/nutrients')}
                accessibilityRole="button"
                accessibilityLabel="栄養素一覧をすべて見る"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionLink}>すべて見る</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardList}>
              {primaryNutrients.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <NutrientItemCell item={item} />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 二次要素セクション */}
        {secondaryNutrients.length > 0 && (
          <View style={styles.nutrientSection}>
            <Image
              source={IMG_NUTRIENT_SECONDARY}
              style={styles.sectionImage}
              contentFit="cover"
              accessibilityLabel="二次要素"
            />
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>二次要素（Ca・Mg・S）</Text>
              <TouchableOpacity
                onPress={() => router.push('/fertilizers/nutrients')}
                accessibilityRole="button"
                accessibilityLabel="栄養素一覧をすべて見る"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.sectionLink}>すべて見る</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.cardList}>
              {secondaryNutrients.map((item) => (
                <View key={item.id} style={styles.cardItem}>
                  <NutrientItemCell item={item} />
                </View>
              ))}
            </View>
          </View>
        )}
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
    paddingTop: 0,
  },

  // ---- ヘッダーバナー ----
  headerBanner: {
    width: '100%',
    aspectRatio: 21 / 9,
  },
  headerDescription: {
    ...textSm,
    color: colorTextSecondary,
    paddingHorizontal: spacing4,
  },

  // ---- 季節TIPS ----
  seasonCard: {
    marginHorizontal: spacing4,
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

  // ---- ナビカード ----
  navCardsSection: {
    paddingHorizontal: spacing4,
    gap: spacing3,
  },

  // ---- 免責注記 ----
  disclaimerWrapper: {
    paddingHorizontal: spacing4,
  },

  // ---- 栄養素セクション ----
  nutrientSection: {
    paddingHorizontal: spacing4,
    gap: spacing3,
  },
  sectionImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radiusMd,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  sectionLink: {
    ...textSm,
    color: colorActionPrimary,
  },
  cardList: {
    gap: spacing3,
  },
  cardItem: {
    // gap で制御するためマージン不要
  },
});
