/**
 * @module components/post/PostCardSkeleton
 * PostCard のローディングプレースホルダー（スケルトン）。
 * ScreenLoading の SkeletonBlock をベースに PostCard の形状に合わせた固定レイアウト。
 * 仕様: docs/design/common-states.md §2.3 / docs/design/post-card.md §4
 */

import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import {
  colorSurface,
  colorSurfaceMuted,
  shadowWashi,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  radiusFull,
  radiusLg,
  durationSlow,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostCardSkeletonProps = {
  /** 画像エリアを表示するかどうか（デフォルト: false） */
  hasImage?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostCardSkeleton({ hasImage = false }: PostCardSkeletonProps) {
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
    <View
      style={styles.card}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {/* ヘッダー行: アバター円 + ユーザー名・日時 */}
      <View style={styles.header}>
        <Animated.View style={[styles.avatar, { backgroundColor }]} />
        <View style={styles.headerText}>
          <Animated.View style={[styles.rectName, { backgroundColor }]} />
          <Animated.View style={[styles.rectDate, { backgroundColor }]} />
        </View>
      </View>

      {/* 本文 */}
      <Animated.View style={[styles.rectFullWidth, { backgroundColor, marginTop: spacing3 }]} />
      <Animated.View style={[styles.rectPartWidth, { backgroundColor, marginTop: spacing2 }]} />

      {/* 画像エリア（任意）*/}
      {hasImage && (
        <Animated.View style={[styles.rectImage, { backgroundColor, marginTop: spacing3 }]} />
      )}

      {/* アクション行 */}
      <View style={styles.actions}>
        <Animated.View style={[styles.rectAction, { backgroundColor }]} />
        <Animated.View style={[styles.rectAction, { backgroundColor }]} />
        <Animated.View style={[styles.rectAction, { backgroundColor }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing5,
    marginBottom: spacing4,
    ...shadowWashi,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radiusFull,
  },
  headerText: {
    flex: 1,
    marginLeft: spacing3,
    gap: spacing2,
  },
  rectName: {
    height: 14,
    width: 120,
    borderRadius: radiusLg,
  },
  rectDate: {
    height: 12,
    width: 60,
    borderRadius: radiusLg,
  },
  rectFullWidth: {
    height: 14,
    width: '100%',
    borderRadius: radiusLg,
  },
  rectPartWidth: {
    height: 14,
    width: '75%',
    borderRadius: radiusLg,
  },
  rectImage: {
    height: 160,
    width: '100%',
    borderRadius: radiusLg,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing4,
    marginTop: spacing3,
  },
  rectAction: {
    height: 20,
    width: 44,
    borderRadius: radiusLg,
  },
});
