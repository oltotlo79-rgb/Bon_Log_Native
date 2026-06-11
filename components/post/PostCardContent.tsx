/**
 * @module components/post/PostCardContent
 * PostCard の本文エリア。
 * parseContentSegments でメンション・ハッシュタグを色分け表示する。
 * disableNavigation=false のとき 150 文字 / 3 行で切り詰め + 「続きを読む」。
 * 仕様: docs/design/post-card.md §6
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import {
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorTextHashtag,
  spacing3,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';
import { parseContentSegments } from '@/lib/utils/parse-content-segments';
import { routeUserDetail, routeSearchByQuery } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数（post-card.md §6.1 / lib/constants/limits/post.ts に合わせた値）
// ---------------------------------------------------------------------------

const POST_PREVIEW_LENGTH = 150;
const POST_PREVIEW_MAX_LINES = 3;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostCardContentProps = {
  content: string | null | undefined;
  /** true のとき（投稿詳細画面）は全文表示し切り詰めをしない */
  disableNavigation: boolean;
  /** メンション解決用 Map（userId → 表示名）。仕様 §15 */
  mentionUsers: ReadonlyMap<string, string>;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostCardContent({
  content,
  disableNavigation,
  mentionUsers,
}: PostCardContentProps) {
  const [expanded, setExpanded] = useState(false);

  const segments = useMemo(
    () => parseContentSegments(content),
    [content]
  );

  // フィード等では長文を切り詰める
  const needsTruncation =
    !disableNavigation &&
    !expanded &&
    content !== null &&
    content !== undefined &&
    content.length > POST_PREVIEW_LENGTH;

  const displayContent =
    needsTruncation && content !== null && content !== undefined
      ? content.slice(0, POST_PREVIEW_LENGTH)
      : content;

  // displayContent が変わった場合のみ再パース（早期 return より前に宣言）
  const displaySegments = useMemo(
    () => parseContentSegments(displayContent),
    [displayContent]
  );

  // content が null かつ segments が空の場合の防衛的フォールバック（Hooks は上で全部宣言済み）
  if (segments.length === 0) {
    return (
      <Text style={styles.emptyContent}>(内容がありません)</Text>
    );
  }

  function handlePressMention(userId: string) {
    router.push(routeUserDetail(userId));
  }

  function handlePressHashtag(tag: string) {
    router.push(routeSearchByQuery(tag));
  }

  return (
    <View>
      <Text
        style={styles.content}
        numberOfLines={disableNavigation || expanded ? undefined : POST_PREVIEW_MAX_LINES}
      >
        {displaySegments.map((segment, index) => {
          if (segment.type === 'text') {
            return (
              <Text key={index} style={styles.textSegment}>
                {segment.content}
              </Text>
            );
          }

          if (segment.type === 'mention') {
            const displayName = mentionUsers.get(segment.userId) ?? `@${segment.userId}`;
            return (
              <Text
                key={index}
                style={styles.mentionSegment}
                onPress={() => handlePressMention(segment.userId)}
                accessibilityRole="link"
                accessibilityLabel={`${displayName}のプロフィールを表示`}
              >
                {displayName}
              </Text>
            );
          }

          // hashtag
          return (
            <Text
              key={index}
              style={styles.hashtagSegment}
              onPress={() => handlePressHashtag(segment.tag)}
              accessibilityRole="link"
              accessibilityLabel={`${segment.tag}を検索`}
            >
              {segment.tag}
            </Text>
          );
        })}
      </Text>

      {needsTruncation && (
        <Pressable
          style={styles.readMoreButton}
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="続きを読む"
        >
          <Text style={styles.readMoreText}>続きを読む</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    ...textBase,
    color: colorTextPrimary,
  },
  textSegment: {
    ...textBase,
    color: colorTextPrimary,
  },
  mentionSegment: {
    ...textBase,
    color: colorTextLink,
    fontWeight: '600',
  },
  hashtagSegment: {
    ...textBase,
    color: colorTextHashtag,
  },
  emptyContent: {
    ...textBase,
    color: colorTextSecondary,
    fontStyle: 'italic',
  },
  readMoreButton: {
    paddingVertical: spacing3,
    minHeight: 44,
    justifyContent: 'center',
  },
  readMoreText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
});
