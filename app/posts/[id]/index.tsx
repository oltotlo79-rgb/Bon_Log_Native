import React, { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  View,
  StyleSheet,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorError,
  colorActionPrimary,
  colorTextLink,
  spacing2,
  spacing4,
  spacing6,
  radius2xl,
  radiusFull,
  shadowWashiLg,
  textBase,
  textLg,
  textMd,
  textSm,
  textXs,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_POST_NOT_FOUND,
  ERR_POST_LOAD_FAILED,
  ERR_POST_DELETE_FAILED,
  ERR_COMMENT_CREATE_FAILED,
  ERR_COMMENT_DELETE_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import { ROUTE_FEED, routePostEdit, routeUserDetail } from '@/lib/constants/routes';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import { PostCard } from '@/components/post/PostCard';
import { CommentItem } from '@/components/comment/CommentItem';
import { CommentInput } from '@/components/comment/CommentInput';
import { ComposerFormError } from '@/components/post/ComposerFormError';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { usePostQuery, useDeletePostMutation } from '@/lib/queries/posts';
import { useCommentsQuery, useCreateCommentMutation, useDeleteCommentMutation, type CommentItem as CommentItemData } from '@/lib/queries/comments';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import type { ReplyTarget } from '@/components/comment/CommentItem';
import type { CommentSubmitParams } from '@/components/comment/CommentInput';

// 投稿公開 URL のベース（Share API で使用）
const WEB_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';

// ---------------------------------------------------------------------------
// 型ガード: useLocalSearchParams の値を string に絞る
// ---------------------------------------------------------------------------

function isValidPostId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// ---------------------------------------------------------------------------
// FlatList keyExtractor（安定した ID を使用）
// ---------------------------------------------------------------------------

const keyExtractor = (item: CommentItemData) => item.id;

// ---------------------------------------------------------------------------
// 投稿メニューシート（自分の投稿: 編集・削除）
// ---------------------------------------------------------------------------

type OwnPostMenuProps = {
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  isDeleting: boolean;
};

function OwnPostMenu({ onEdit, onDelete, onClose, isDeleting }: OwnPostMenuProps) {
  if (Platform.OS === 'ios') {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={menuStyles.backdrop} onPress={onClose} />
      <View style={menuStyles.sheet}>
        <View style={menuStyles.handle} />
        <Pressable
          style={({ pressed }) => [menuStyles.item, pressed && menuStyles.itemPressed]}
          onPress={onEdit}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="投稿を編集"
        >
          <Ionicons
            name="create-outline"
            size={20}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={menuStyles.itemText}>編集</Text>
        </Pressable>
        <View style={menuStyles.divider} />
        <Pressable
          style={({ pressed }) => [menuStyles.item, pressed && menuStyles.itemPressed]}
          onPress={onDelete}
          disabled={isDeleting}
          accessibilityRole="button"
          accessibilityLabel="投稿を削除"
        >
          <Ionicons
            name="trash-outline"
            size={20}
            color={colorError}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={[menuStyles.itemText, menuStyles.itemTextDestructive]}>削除</Text>
        </Pressable>
        <View style={menuStyles.divider} />
        <Pressable
          style={({ pressed }) => [menuStyles.item, pressed && menuStyles.itemPressed]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="キャンセル"
        >
          <Text style={menuStyles.itemTextCancel}>キャンセル</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// 投稿詳細コンテンツ（有効な id があるときのみ描画）
// ---------------------------------------------------------------------------

type PostDetailContentProps = {
  postId: string;
};

function PostDetailContent({ postId }: PostDetailContentProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const flatListRef = useRef<FlatList>(null);

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

  const createCommentMutation = useCreateCommentMutation();
  const deleteCommentMutation = useDeleteCommentMutation();
  const deletePostMutation = useDeletePostMutation(currentUserId ?? '');

  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [ownPostMenuVisible, setOwnPostMenuVisible] = useState(false);

  const isOwnPost =
    currentUserId !== undefined &&
    post !== undefined &&
    currentUserId === post.user.id;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleRefetch = useCallback(() => {
    void refetchPost();
    void refetchComments();
  }, [refetchPost, refetchComments]);

  const handleReply = useCallback((target: ReplyTarget) => {
    setReplyTarget(target);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTarget(null);
  }, []);

  const handleSubmitComment = useCallback(
    ({ content, parentId }: CommentSubmitParams) => {
      if (!isOnline) {
        setCommentError(ERR_OFFLINE_ACTION);
        return;
      }
      setCommentError(null);
      createCommentMutation.mutate(
        {
          postId,
          content,
          parentId,
          mediaUrls: [],
          mediaTypes: [],
        },
        {
          onSuccess: () => {
            setReplyTarget(null);
            flatListRef.current?.scrollToEnd({ animated: true });
          },
          onError: () => {
            setCommentError(ERR_COMMENT_CREATE_FAILED);
          },
        }
      );
    },
    [isOnline, postId, createCommentMutation]
  );

  const handleDeleteComment = useCallback(
    (commentId: string) => {
      if (!isOnline) {
        showToast(ERR_OFFLINE_ACTION, 'warning');
        return;
      }
      setDeletingCommentId(commentId);
      deleteCommentMutation.mutate(
        { postId, commentId },
        {
          onSettled: () => {
            setDeletingCommentId(null);
          },
          onError: () => {
            showToast(ERR_COMMENT_DELETE_FAILED, 'error');
          },
        }
      );
    },
    [isOnline, postId, deleteCommentMutation, showToast]
  );

  const handlePressMenuPost = useCallback(() => {
    if (!isOwnPost) return;
    if (Platform.OS === 'ios') {
      Alert.alert('投稿の操作', undefined, [
        {
          text: '編集',
          onPress: () => router.push(routePostEdit(postId)),
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            Alert.alert('投稿を削除しますか？', 'この操作は取り消せません。', [
              { text: 'キャンセル', style: 'cancel' },
              {
                text: '削除する',
                style: 'destructive',
                onPress: () => {
                  if (!isOnline) {
                    showToast(ERR_OFFLINE_ACTION, 'warning');
                    return;
                  }
                  deletePostMutation.mutate(
                    { id: postId },
                    {
                      onSuccess: () => {
                        router.replace(ROUTE_FEED);
                      },
                      onError: () => {
                        showToast(ERR_POST_DELETE_FAILED, 'error');
                      },
                    }
                  );
                },
              },
            ]);
          },
        },
        { text: 'キャンセル', style: 'cancel' },
      ]);
    } else {
      setOwnPostMenuVisible(true);
    }
  }, [isOwnPost, postId, isOnline, deletePostMutation, showToast]);

  const handleAndroidDeletePost = useCallback(() => {
    setOwnPostMenuVisible(false);
    Alert.alert('投稿を削除しますか？', 'この操作は取り消せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        onPress: () => {
          if (!isOnline) {
            showToast(ERR_OFFLINE_ACTION, 'warning');
            return;
          }
          deletePostMutation.mutate(
            { id: postId },
            {
              onSuccess: () => {
                router.replace(ROUTE_FEED);
              },
              onError: () => {
                showToast(ERR_POST_DELETE_FAILED, 'error');
              },
            }
          );
        },
      },
    ]);
  }, [isOnline, postId, deletePostMutation, showToast]);

  const renderCommentItem = useCallback(
    ({ item }: { item: CommentItemData }) => (
      <CommentItem
        item={item}
        currentUserId={currentUserId}
        onReply={handleReply}
        onDelete={handleDeleteComment}
        deletingId={deletingCommentId ?? undefined}
      />
    ),
    [currentUserId, handleReply, handleDeleteComment, deletingCommentId]
  );

  const comments = commentsData?.pages.flatMap((page) => page.items) ?? [];

  // コメント入力バーの高さ分 FlatList の下端パディングを確保
  const COMMENT_INPUT_APPROX_HEIGHT = 80;

  if (isPostLoading) {
    return (
      <View style={styles.content}>
        <ScreenLoading variant="skeleton" skeletonCount={2} />
      </View>
    );
  }

  if (isPostError || post === undefined) {
    return (
      <View style={styles.content}>
        <ScreenError
          title="読み込めませんでした"
          description={ERR_POST_LOAD_FAILED}
          onRetry={refetchPost}
        />
      </View>
    );
  }

  const handleComment = () => {
    // CommentInput へのフォーカスは CommentInput 自体が管理
  };

  const postCardProps = mapToPostCardProps(
    post,
    currentUserId,
    {
      onComment: handleComment,
      onMenuPress: isOwnPost ? handlePressMenuPost : undefined,
    },
    { disableNavigation: true }
  );

  return (
    <View style={styles.content}>
      <OfflineBanner isVisible={!isOnline} />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
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
              {/* コメントエラーバナー */}
              {commentError !== null && (
                <View style={styles.commentErrorWrapper}>
                  <ComposerFormError message={commentError} />
                </View>
              )}
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
            ) : comments.length > 0 ? (
              <View style={styles.footerEnd}>
                <Text style={styles.footerEndText}>これ以上コメントはありません</Text>
              </View>
            ) : null
          }
          contentContainerStyle={{
            paddingBottom: COMMENT_INPUT_APPROX_HEIGHT,
          }}
          testID="comments-list"
        />

        {/* 固定コメント入力バー */}
        <CommentInput
          replyTarget={replyTarget}
          onCancelReply={handleCancelReply}
          onSubmit={handleSubmitComment}
          isSubmitting={createCommentMutation.isPending}
          isPremium={me?.isPremium ?? false}
        />
      </KeyboardAvoidingView>

      {/* 自分の投稿メニュー（Android） */}
      {ownPostMenuVisible && (
        <OwnPostMenu
          onEdit={() => {
            setOwnPostMenuVisible(false);
            router.push(routePostEdit(postId));
          }}
          onDelete={handleAndroidDeletePost}
          onClose={() => setOwnPostMenuVisible(false)}
          isDeleting={deletePostMutation.isPending}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// 有効な postId を持つ場合のページ全体
// パンくず・共有ボタンを含むヘッダーと PostDetailContent を管理する。
// usePostQuery をここで呼ぶことでキャッシュを共有し、PostDetailContent の
// フェッチ結果が即座にヘッダーに反映される。
// ---------------------------------------------------------------------------

type PostDetailPageProps = {
  postId: string;
};

function PostDetailPage({ postId }: PostDetailPageProps) {
  const { data: post } = usePostQuery(postId);

  const authorNickname = post?.user.nickname;
  const authorId = post?.user.id;

  const handleShare = useCallback(async () => {
    const postUrl = `${WEB_BASE_URL}/posts/${postId}`;
    try {
      await Share.share({
        message: postUrl,
        url: postUrl,
      });
    } catch {
      // Share.share が reject した場合（システムエラー等）は無視する。
      // ユーザーキャンセルは dismissedAction として resolve されるため、ここには到達しない。
    }
  }, [postId]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* ヘッダー: パンくず（ホーム > 投稿者の投稿）+ 共有ボタン */}
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Text style={styles.backButtonText}>← 戻る</Text>
        </Pressable>

        {/* パンくず: 中央に「ホーム > 投稿者名の投稿」 */}
        <View style={styles.breadcrumbArea} accessibilityRole="none" importantForAccessibility="no-hide-descendants">
          <Pressable
            onPress={() => router.push(ROUTE_FEED)}
            accessibilityRole="link"
            accessibilityLabel="ホームへ移動"
          >
            <Text style={styles.breadcrumbLink}>ホーム</Text>
          </Pressable>
          <Text style={styles.breadcrumbSeparator} accessibilityElementsHidden importantForAccessibility="no">
            {' › '}
          </Text>
          {authorId !== undefined && authorNickname !== undefined ? (
            <Pressable
              onPress={() => router.push(routeUserDetail(authorId))}
              accessibilityRole="link"
              accessibilityLabel={`${authorNickname}のプロフィールへ移動`}
            >
              <Text style={styles.breadcrumbLink} numberOfLines={1}>
                {authorNickname}の投稿
              </Text>
            </Pressable>
          ) : (
            <Text style={styles.breadcrumbCurrent} numberOfLines={1}>
              投稿
            </Text>
          )}
        </View>

        {/* 共有ボタン */}
        <Pressable
          style={({ pressed }) => [styles.shareButton, pressed && styles.shareButtonPressed]}
          onPress={() => { void handleShare(); }}
          accessibilityRole="button"
          accessibilityLabel="この投稿を共有"
        >
          <Ionicons name="share-outline" size={22} color={colorTextPrimary} accessibilityElementsHidden importantForAccessibility="no" />
        </Pressable>
      </View>

      <PostDetailContent postId={postId} />
    </SafeAreaView>
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

  return <PostDetailPage postId={rawId} />;
}

// ---------------------------------------------------------------------------
// メニューシートのスタイル
// ---------------------------------------------------------------------------

const MENU_ITEM_HEIGHT = 56;

const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colorSurface,
    borderTopLeftRadius: radius2xl,
    borderTopRightRadius: radius2xl,
    paddingBottom: spacing6,
    ...shadowWashiLg,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radiusFull,
    backgroundColor: colorBorderLight,
    marginTop: spacing2,
    marginBottom: spacing2,
  },
  item: {
    width: '100%',
    height: MENU_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    gap: spacing4,
  },
  itemPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  itemText: {
    ...textMd,
    color: colorTextPrimary,
    flex: 1,
  },
  itemTextDestructive: {
    color: colorError,
  },
  itemTextCancel: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colorBorderLight,
    width: '90%',
  },
});

// ---------------------------------------------------------------------------
// メインスタイル
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
  breadcrumbArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing2,
    overflow: 'hidden',
  },
  breadcrumbLink: {
    ...textXs,
    color: colorTextLink,
  },
  breadcrumbSeparator: {
    ...textXs,
    color: colorTextSecondary,
  },
  breadcrumbCurrent: {
    ...textXs,
    color: colorTextSecondary,
  },
  shareButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonPressed: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  keyboardAvoidingView: {
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
  commentErrorWrapper: {
    marginTop: spacing2,
  },
  footerLoading: {
    height: 60,
  },
  footerEnd: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
  footerEndText: {
    ...textSm,
    color: colorTextSecondary,
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
