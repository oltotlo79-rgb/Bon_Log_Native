/**
 * @module components/common/ScreenLoading
 * データ取得中に表示するローディングプレースホルダー。
 * スケルトン表示が原則。全画面初期化中など定型形状が難しい場合のみ variant="spinner" を使う。
 * 仕様: docs/design/common-states.md §2
 */

import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  radiusLg,
  radiusFull,
  durationSlow,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// スケルトンアニメーション
// ---------------------------------------------------------------------------

function SkeletonBlock({ hasImage = false }: { hasImage?: boolean }) {
  // Animated.Value をレンダー間で安定させるため lazy init で保持する
  const [shimmer] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: durationSlow,
          // backgroundColor アニメーションはネイティブドライバー非対応
          useNativeDriver: false,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: durationSlow,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [colorSurfaceMuted, colorSurface],
  });

  return (
    <View style={styles.skeletonCard} accessibilityElementsHidden>
      {/* ヘッダー行: アバター円 + ユーザー名・日時 */}
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonCircle, { backgroundColor }]} />
        <View style={styles.skeletonHeaderText}>
          <Animated.View style={[styles.skeletonRectName, { backgroundColor }]} />
          <Animated.View style={[styles.skeletonRectDate, { backgroundColor }]} />
        </View>
      </View>

      {/* 本文行 */}
      <Animated.View style={[styles.skeletonRectFullWidth, { backgroundColor, marginTop: spacing3 }]} />
      <Animated.View style={[styles.skeletonRectPartWidth, { backgroundColor, marginTop: spacing2 }]} />

      {/* 画像エリア（任意） */}
      {hasImage && (
        <Animated.View style={[styles.skeletonRectImage, { backgroundColor, marginTop: spacing3 }]} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ScreenLoadingProps = {
  variant?: 'skeleton' | 'spinner';
  /** スケルトンブロックの繰り返し数（デフォルト: 3） */
  skeletonCount?: number;
  accessibilityLabel?: string;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScreenLoading({
  variant = 'skeleton',
  skeletonCount = 3,
  accessibilityLabel = '読み込み中',
}: ScreenLoadingProps) {
  if (variant === 'spinner') {
    return (
      <View
        style={styles.spinnerContainer}
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
      >
        <ActivityIndicator size="large" color={colorActionPrimary} />
      </View>
    );
  }

  return (
    <View
      style={styles.skeletonContainer}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: skeletonCount }, (_, i) => (
        // 偶数インデックスのスケルトンのみ画像エリアを表示して変化を持たせる
        <SkeletonBlock key={i} hasImage={i % 2 === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spinnerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorBackground,
  },
  skeletonContainer: {
    flex: 1,
    backgroundColor: colorBackground,
    padding: spacing4,
  },
  skeletonCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing5,
    marginBottom: spacing4,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 44,
    height: 44,
    borderRadius: radiusFull,
  },
  skeletonHeaderText: {
    flex: 1,
    marginLeft: spacing3,
    gap: spacing2,
  },
  skeletonRectName: {
    height: 14,
    width: 120,
    borderRadius: radiusLg,
  },
  skeletonRectDate: {
    height: 12,
    width: 60,
    borderRadius: radiusLg,
  },
  skeletonRectFullWidth: {
    height: 14,
    width: '100%',
    borderRadius: radiusLg,
  },
  skeletonRectPartWidth: {
    height: 14,
    width: '80%',
    borderRadius: radiusLg,
  },
  skeletonRectImage: {
    height: 120,
    width: '100%',
    borderRadius: radiusLg,
  },
});
