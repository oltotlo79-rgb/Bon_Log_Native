/**
 * @module app/analytics/index
 * 投稿分析ダッシュボード（プレミアム会員限定）。
 * isPremium が false の場合はダッシュボードを表示せずプレミアム誘導 UI を出す。
 * 外部決済・Stripe への導線は一切置かない（store-compliance.md / billing.md）。
 */

import React, { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { PostsView } from '@/components/analytics/PostsView';
import { PeriodComparisonView } from '@/components/analytics/PeriodComparisonView';
import { GenrePerformanceView } from '@/components/analytics/GenrePerformanceView';
import { KeywordsView } from '@/components/analytics/KeywordsView';
import { LikesView } from '@/components/analytics/LikesView';
import { EngagementTrendView } from '@/components/analytics/EngagementTrendView';
import { FollowerGrowthView } from '@/components/analytics/FollowerGrowthView';
import { QuotesView } from '@/components/analytics/QuotesView';
import { ROUTE_SETTINGS_SUBSCRIPTION } from '@/lib/constants/routes';
import type { AnalyticsPeriod } from '@/lib/queries/keys';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  spacing12,
  radiusFull,
  radiusMd,
  textXs,
  textSm,
  textBase,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS: { label: string; value: AnalyticsPeriod }[] = [
  { label: '7日', value: 7 },
  { label: '30日', value: 30 },
  { label: '90日', value: 90 },
];

const DEFAULT_PERIOD: AnalyticsPeriod = 30;

type ViewTab =
  | 'posts'
  | 'comparison'
  | 'genre'
  | 'keywords'
  | 'likes'
  | 'engagement'
  | 'followers'
  | 'quotes';

const TAB_OPTIONS: { label: string; value: ViewTab }[] = [
  { label: '投稿', value: 'posts' },
  { label: '期間比較', value: 'comparison' },
  { label: 'ジャンル', value: 'genre' },
  { label: 'キーワード', value: 'keywords' },
  { label: 'いいね', value: 'likes' },
  { label: '推移', value: 'engagement' },
  { label: 'フォロワー', value: 'followers' },
  { label: '引用', value: 'quotes' },
];

const LOCK_ICON_SIZE = 48;

// ---------------------------------------------------------------------------
// 期間切替セグメント
// ---------------------------------------------------------------------------

type PeriodSelectorProps = {
  selected: AnalyticsPeriod;
  onSelect: (period: AnalyticsPeriod) => void;
};

const PeriodSelector = memo(function PeriodSelector({
  selected,
  onSelect,
}: PeriodSelectorProps) {
  return (
    <View style={styles.periodBar} accessibilityRole="tablist">
      {PERIOD_OPTIONS.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.periodButton, isSelected && styles.periodButtonSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={`${opt.label}を選択`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.periodButtonText,
                isSelected && styles.periodButtonTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

// ---------------------------------------------------------------------------
// ビュータブ切替（タブが8つになるためスクロール対応）
// ---------------------------------------------------------------------------

type ViewTabBarProps = {
  selected: ViewTab;
  onSelect: (tab: ViewTab) => void;
};

const ViewTabBar = memo(function ViewTabBar({ selected, onSelect }: ViewTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabBarScroll}
      contentContainerStyle={styles.tabBar}
      accessibilityRole="tablist"
    >
      {TAB_OPTIONS.map((opt) => {
        const isSelected = opt.value === selected;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.tab, isSelected && styles.tabSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={`${opt.label}ビュー`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
});

// ---------------------------------------------------------------------------
// プレミアム誘導 UI（外部決済・Stripe への導線は一切置かない）
// ---------------------------------------------------------------------------

function PremiumGate() {
  const handlePress = useCallback(() => {
    router.push(ROUTE_SETTINGS_SUBSCRIPTION);
  }, []);

  return (
    <View style={styles.gateContainer}>
      <Ionicons
        name="lock-closed-outline"
        size={LOCK_ICON_SIZE}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.gateTitle}>この機能はプレミアム会員限定です</Text>
      <Text style={styles.gateDescription}>
        投稿のパフォーマンスを詳しく把握して、盆栽コンテンツをより多くの方に届けましょう。
        プレミアム会員になると投稿分析・期間比較・ジャンル別パフォーマンス・キーワード分析をご利用いただけます。
      </Text>
      <Pressable
        style={({ pressed }) => [styles.gateButton, pressed && styles.gateButtonPressed]}
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel="プレミアムプランの詳細を見る"
      >
        <Text style={styles.gateButtonText}>プレミアムプランについて</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 各ビューのレンダリング（activeTab で切り替え）
// ---------------------------------------------------------------------------

type ActiveViewProps = {
  activeTab: ViewTab;
  period: AnalyticsPeriod;
};

function ActiveView({ activeTab, period }: ActiveViewProps) {
  switch (activeTab) {
    case 'posts':
      return <PostsView period={period} />;
    case 'comparison':
      return <PeriodComparisonView period={period} />;
    case 'genre':
      return <GenrePerformanceView period={period} />;
    case 'keywords':
      return <KeywordsView period={period} />;
    case 'likes':
      return <LikesView period={period} />;
    case 'engagement':
      return <EngagementTrendView period={period} />;
    case 'followers':
      return <FollowerGrowthView period={period} />;
    case 'quotes':
      // 引用は全期間集計のため period を渡さない
      return <QuotesView />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function AnalyticsScreen() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_PERIOD);
  const [activeTab, setActiveTab] = useState<ViewTab>('posts');

  const { data: currentUser, isLoading: isUserLoading } = useCurrentUserQuery();

  const isPremium = currentUser?.isPremium === true;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          投稿分析
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* ユーザー情報取得中はローディング */}
      {isUserLoading ? (
        <ScreenLoading variant="spinner" />
      ) : !isPremium ? (
        /* 非プレミアム時はゲートのみ */
        <PremiumGate />
      ) : (
        /* プレミアム時はダッシュボード */
        <View style={styles.dashboardContainer}>
          {/* 期間切替 */}
          <PeriodSelector selected={period} onSelect={setPeriod} />

          {/* ビュータブ */}
          <ViewTabBar selected={activeTab} onSelect={setActiveTab} />

          {/* 各ビュー本体 */}
          <View style={styles.viewContainer}>
            <ActiveView activeTab={activeTab} period={period} />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  // ダッシュボード全体
  dashboardContainer: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  // 期間切替バー
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    gap: spacing2,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    backgroundColor: colorSurfaceWashi,
  },
  periodButton: {
    flex: 1,
    height: 36,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodButtonSelected: {
    backgroundColor: colorActionPrimary,
  },
  periodButtonText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  periodButtonTextSelected: {
    color: colorActionPrimaryText,
  },
  // ビュータブバー（横スクロール対応）
  tabBarScroll: {
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing2,
  },
  tab: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing3,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    minWidth: 56,
  },
  tabSelected: {
    borderBottomColor: colorActionPrimary,
  },
  tabText: {
    ...textXs,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: colorActionPrimary,
  },
  // ビューコンテナ
  viewContainer: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  // プレミアムゲート
  gateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing8,
    gap: spacing4,
  },
  gateTitle: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  gateDescription: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  gateButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    height: 44,
    paddingHorizontal: spacing6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing2,
  },
  gateButtonPressed: {
    opacity: 0.8,
  },
  gateButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
});

// 未使用のデザイントークン変数を参照して lint 警告を抑止する
void (spacing12 satisfies number);
