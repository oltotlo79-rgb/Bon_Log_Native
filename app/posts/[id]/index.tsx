import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing4,
  textBase,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_POST_NOT_FOUND,
  ERR_POST_LOAD_FAILED,
} from '@/lib/constants/errors';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { PostCard } from '@/components/post/PostCard';
import { CommentItem } from '@/components/comment/CommentItem';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePostQuery } from '@/lib/queries/posts';
import { useCommentsQuery, type CommentItem as CommentItemData } from '@/lib/queries/comments';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';

// ---------------------------------------------------------------------------
// 型ガード: useLocalSearchParams の値を string に絞る
// ---------------------------------------------------------------------------

function isValidPostId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// ---------------------------------------------------------------------------
// コメントリストアイテム（memo は CommentItem 内で実施）
// ---------------------------------------------------------------------------

const keyExtractor = (item: CommentItemData) => item.id;

// ---------------------------------------------------------------------------
// 投稿詳細コンテンツ（有効な id があるときのみ描画）
// ---------------------------------------------------------------------------

type PostDetailContentProps = {
  postId: string;
};

function PostDetailContent({ postId }: PostDetailContentProps) {
  const isOnline = useOnlineStatus();

  const {
    data: post,
    isLoading: isPostLoading,
    isError: isPostError,
    refetch: refetchPost,
  } = usePostQuery(postId);

  const {
    data: commentsData,
    isLoading: isCommentsLoading,
    isError: isCommentsError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchComments,
  } = useCommentsQuery(postId);

  const { data: me } = useCurrentUserQuery();
  const currentUserId = me?.id;

  const renderCommentItem = useCallback(
    ({ item }: { item: CommentItemData }) => (
      <CommentItem item={item} currentUserId={currentUserId} />
    ),
    [currentUserId]
  );

  const comments = commentsData?.pages.flatMap((page) => page.items) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefetch = useCallback(() => {
    void refetchPost();
    void refetchComments();
  }, [refetchPost, refetchComments]);

  if (isPostLoading) {
    return <ScreenLoading variant="skeleton" skeletonCount={2} />;
  }

  if (isPostError || post === undefined) {
    return (
      <ScreenError
        title="読み込めませんでした"
        description={ERR_POST_LOAD_FAILED}
        onRetry={refetchPost}
      />
    );
  }

  const handleComment = () => {
    // コメント入力は 2c 待ち。現状は no-op
  };

  const postCardProps = mapToPostCardProps(
    post,
    currentUserId,
    { onComment: handleComment },
    { disableNavigation: true }
  );

  return (
    <View style={styles.content}>
      <OfflineBanner isVisible={!isOnline} />

      <FlatList
        data={comments}
        keyExtractor={keyExtractor}
        renderItem={renderCommentItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRefetch}
            tintColor={colorActionPrimary}
          />
        }
        ListHeaderComponent={
          <View style={styles.postCardWrapper}>
            <PostCard {...postCardProps} />
            <View style={styles.commentsDivider} />
          </View>
        }
        ListEmptyComponent={
          isCommentsLoading ? (
            <ScreenLoading variant="skeleton" skeletonCount={2} />
          ) : isCommentsError ? (
            <ScreenError
              title="読み込めませんでした"
              description={ERR_POST_LOAD_FAILED}
              onRetry={refetchComments}
            />
          ) : (
            <ScreenEmpty
              iconName="chatbubble-outline"
              title="まだコメントはありません"
              description="最初のコメントをしてみましょう"
            />
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoading}>
              <ScreenLoading variant="spinner" />
            </View>
          ) : null
        }
        testID="comments-list"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PostDetailScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];

  if (!isValidPostId(rawId)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </Pressable>
          <Text style={styles.headerTitle} accessibilityRole="header">
            投稿
          </Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ERR_POST_NOT_FOUND}</Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
            style={styles.backButtonFallback}
          >
            <Text style={styles.backButtonFallbackText}>戻る</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const postId = rawId;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </Pressable>
        <Text style={styles.headerTitle} accessibilityRole="header">
          投稿
        </Text>
        <View style={styles.headerRight} />
      </View>

      <PostDetailContent postId={postId} />
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
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 44,
  },
  content: {
    flex: 1,
  },
  postCardWrapper: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  commentsDivider: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginTop: spacing2,
  },
  footerLoading: {
    height: 60,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
    gap: spacing4,
  },
  errorText: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  backButtonFallback: {
    minHeight: 44,
    paddingHorizontal: spacing4,
    paddingVertical: spacing2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonFallbackText: {
    ...textBase,
    color: colorTextPrimary,
  },
});
