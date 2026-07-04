/**
 * @module components/profile/UserCommentsList
 * ユーザーが投稿したコメント一覧。プロフィール画面（自分・他人）のコメントタブで共用する。
 * FlatList の ListHeaderComponent としてプロフィールヘッダー + タブバーを受け取り、
 * コメントを無限スクロールで並べる。4状態（ローディング・空・エラー・オフライン）を持つ。
 * 各行は対象投稿の冒頭テキストを見出し風に表示し、行タップで投稿詳細へ遷移する
 * （Web 版 components/user/ProfileTabs.tsx のコメントタブに準拠）。
 */

import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUserCommentsQuery, type UserCommentItem } from '@/lib/queries/comments';
import { formatRelativeTime, formatAbsoluteDateTime } from '@/lib/utils/relative-time';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { isApiError } from '@/lib/api/errors';
import {
  colorActionPrimary,
  colorSurface,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';
import { ERR_LOAD_FAILED, ERR_FORBIDDEN } from '@/lib/constants/errors';
import { routePostDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// メディア型ガード
// ---------------------------------------------------------------------------

type UserCommentMediaItem = UserCommentItem['media'][number];

/** 生成型上 type は string のため、動画判定は文字列比較の型ガードで絞る */
function isVideoMediaType(type: string): boolean {
  return type === 'video';
}

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** FlatList の onEndReachedThreshold に渡す閾値 */
const END_REACHED_THRESHOLD = 0.5;

/** 見出しに表示する投稿本文の最大文字数（Web 版 COMMENT_PREVIEW_LENGTH に相当） */
const POST_PREVIEW_LENGTH = 40;

/** メディアサムネイルの一辺サイズ（Web 版 w-20 h-20 = 80px に相当） */
const MEDIA_THUMBNAIL_SIZE = 80;

const VIDEO_ICON_SIZE = 28;

// ---------------------------------------------------------------------------
// 投稿冒頭テキストの見出し文言
// ---------------------------------------------------------------------------

function buildPostPreviewLabel(postContent: string | null): string {
  if (postContent === null || postContent.length === 0) {
    return '投稿への返信';
  }
  const truncated =
    postContent.length > POST_PREVIEW_LENGTH
      ? `${postContent.slice(0, POST_PREVIEW_LENGTH)}...`
      : postContent;
  return `「${truncated}」への返信`;
}

// ---------------------------------------------------------------------------
// メディアサムネイル行（sortOrder 順。0 件なら何も描画しない）
// ---------------------------------------------------------------------------

type CommentMediaThumbnailsProps = {
  media: readonly UserCommentMediaItem[];
};

const CommentMediaThumbnails = React.memo(function CommentMediaThumbnails({
  media,
}: CommentMediaThumbnailsProps) {
  const sortedMedia = useMemo(
    () => [...media].sort((a, b) => a.sortOrder - b.sortOrder),
    [media]
  );

  if (sortedMedia.length === 0) return null;

  return (
    <View style={styles.mediaRow}>
      {sortedMedia.map((m) =>
        isVideoMediaType(m.type) ? (
          <View
            key={m.id}
            style={styles.mediaCell}
            accessibilityLabel="添付動画"
          >
            <Ionicons
              name="play-circle-outline"
              size={VIDEO_ICON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        ) : (
          <Image
            key={m.id}
            source={{ uri: m.url }}
            style={styles.mediaCell}
            contentFit="cover"
            accessibilityLabel="添付画像"
          />
        )
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// アイテムセル（memo 化で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

type CommentCellProps = {
  item: UserCommentItem;
};

const CommentCell = React.memo(function CommentCell({ item }: CommentCellProps) {
  const relativeTime = formatRelativeTime(item.createdAt);
  const absoluteDateTime = formatAbsoluteDateTime(new Date(item.createdAt));
  const postPreviewLabel = buildPostPreviewLabel(item.post.content);

  const handlePress = useCallback(() => {
    router.push(routePostDetail(item.post.id));
  }, [item.post.id]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${postPreviewLabel}。コメント: ${item.content}`}
    >
      <Text style={styles.postPreview} numberOfLines={2}>
        {postPreviewLabel}
      </Text>
      <Text style={styles.commentContent}>{item.content}</Text>
      <CommentMediaThumbnails media={item.media} />
      <Text style={styles.time} accessibilityLabel={absoluteDateTime}>
        {relativeTime}
      </Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserCommentsListProps = {
  userId: string;
  /** FlatList の ListHeaderComponent に渡すプロフィールヘッダー + タブバー要素 */
  ListHeaderComponent: React.ReactElement;
  /** コメントが 0 件のときに表示するコンポーネント */
  emptyComponent: React.ReactElement;
  isOffline: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserCommentsList({
  userId,
  ListHeaderComponent,
  emptyComponent,
  isOffline,
}: UserCommentsListProps) {
  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useUserCommentsQuery(userId);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: UserCommentItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: UserCommentItem }) => <CommentCell item={item} />,
    []
  );

  // ローディング中はリストヘッダーのみ見せてスピナーをフッターに出す
  if (isLoading) {
    return (
      <FlatList
        data={[]}
        keyExtractor={keyExtractor}
        renderItem={null}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={<ScreenLoading variant="skeleton" skeletonCount={3} />}
        contentContainerStyle={styles.listContent}
      />
    );
  }

  if (isError) {
    const isForbidden = isApiError(error) && error.code === 'GUEST_NOT_ALLOWED';
    return (
      <FlatList
        data={[]}
        keyExtractor={keyExtractor}
        renderItem={null}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={
          <ScreenError
            title="読み込めませんでした"
            description={isForbidden ? ERR_FORBIDDEN : ERR_LOAD_FAILED}
            onRetry={handleRefetch}
          />
        }
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={handleRefetch}
            tintColor={colorActionPrimary}
            accessibilityLabel="引き下げて更新"
          />
        }
      />
    );
  }

  const items = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <FlatList
      data={items}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={emptyComponent}
      contentContainerStyle={styles.listContent}
      onEndReached={handleEndReached}
      onEndReachedThreshold={END_REACHED_THRESHOLD}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={handleRefetch}
          tintColor={colorActionPrimary}
          accessibilityLabel="引き下げて更新"
        />
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.footerLoading}>
            <ScreenLoading variant="spinner" />
          </View>
        ) : null
      }
    />
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing6,
    flexGrow: 1,
  },
  row: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing2,
    minHeight: 44,
  },
  rowPressed: {
    opacity: 0.7,
  },
  postPreview: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  commentContent: {
    ...textBase,
    color: colorTextPrimary,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  mediaCell: {
    width: MEDIA_THUMBNAIL_SIZE,
    height: MEDIA_THUMBNAIL_SIZE,
    borderRadius: radiusMd,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  time: {
    ...textSm,
    color: colorTextSecondary,
  },
  footerLoading: {
    height: 60,
  },
});
