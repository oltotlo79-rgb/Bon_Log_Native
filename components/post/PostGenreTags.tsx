/**
 * @module components/post/PostGenreTags
 * 投稿に紐づくジャンルタグ行。
 * タップするとジャンル検索画面へ遷移する。
 * 仕様: docs/design/post-card.md §9
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { routeSearchByGenre } from '@/lib/constants/routes';
import {
  colorActionSecondary,
  colorActionSecondaryText,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing2,
  spacing3,
  radiusSm,
  textXs,
  letterSpacingTight,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type PostGenre = {
  id: string;
  name: string;
  category: string;
};

export type PostGenreTagsProps = {
  genres: readonly PostGenre[];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** タップターゲット補完（高さが 28pt のため hitSlop で 44pt 相当を確保）*/
const TAG_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 } as const;

export function PostGenreTags({ genres }: PostGenreTagsProps) {
  if (genres.length === 0) return null;

  function handlePressGenre(genreId: string) {
    router.push(routeSearchByGenre(genreId));
  }

  return (
    <View style={styles.row}>
      {genres.map((genre) => (
        <Pressable
          key={genre.id}
          style={({ pressed }) => [styles.tag, pressed && styles.tagPressed]}
          onPress={() => handlePressGenre(genre.id)}
          hitSlop={TAG_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${genre.name}で検索`}
        >
          {({ pressed }) => (
            <Text style={[styles.tagText, pressed && styles.tagTextPressed]}>
              {genre.name}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  tag: {
    backgroundColor: colorActionSecondary,
    borderRadius: radiusSm,
    borderWidth: 1,
    borderColor: colorBorderLight,
    paddingHorizontal: spacing3,
    paddingVertical: 4,
    minHeight: 28,
    justifyContent: 'center',
  },
  tagPressed: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  tagText: {
    ...textXs,
    color: colorActionSecondaryText,
    letterSpacing: letterSpacingTight,
  },
  tagTextPressed: {
    color: colorActionPrimaryText,
  },
});
