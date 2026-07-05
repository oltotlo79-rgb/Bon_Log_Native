/**
 * @module components/comment/CommentItem
 * 投稿詳細画面のコメント一覧で 1 件のコメントを表示するコンポーネント。
 * isDeleted は「削除されたコメント」プレースホルダーを表示する。
 * isBlockedUser のコメントはブロックしたユーザーのため非表示にする。
 * 自分のコメントには「⋮」メニューから削除導線を提供する。
 * 他人のコメントには「⋮」ボタンから通報・ブロック・ミュートを提供する（ugc-safety.md §2.4）。
 * 返信ボタンで親コンポーネントに返信モードを通知する。
 * メンションは item.mentionedUsers でニックネームに解決して表示する（Web の CommentContent 準拠）。
 * 添付メディアはプロフィールのコメントタブ（UserCommentsList）と同じサムネイル表示に揃える。
 * 返信は展開時に useCommentRepliesQuery で実データを取得し、自身を isReply=true で再帰的に描画する。
 * Web（CommentCard）が depth===0 のときのみ返信リストへインデント（左マージン + 縦線）を付け、
 * それより深い階層は同じインデント幅のまま平坦に積む挙動に合わせ、isReply の 1 段階のみでスタイルを分岐する。
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, Alert, Platform, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBorderLight,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorTextLink,
  colorTextHashtag,
  colorError,
  colorBackground,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusFull,
  radiusMd,
  radius2xl,
  shadowWashiLg,
  textBase,
  textSm,
  textMd,
  textXs,
} from '@/lib/constants/design-tokens';
import { UserAvatar } from '@/components/common/UserAvatar';
import { formatRelativeTime, formatAbsoluteDateTime } from '@/lib/utils/relative-time';
import { parseContentSegments } from '@/lib/utils/parse-content-segments';
import { routeUserDetail, routeSearchByQuery } from '@/lib/constants/routes';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import { CommentLikeButton } from '@/components/comment/CommentLikeButton';
import { useCommentRepliesQuery, type CommentItem as CommentItemData } from '@/lib/queries/comments';
import { ERR_GENERIC } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 36;
const REPLY_AVATAR_SIZE = 32;
const REPLY_INDENT = 44;
const COMMENT_MENU_BUTTON_SIZE = 44;
const COMMENT_MENU_ICON_SIZE = 18;
const ACTION_BUTTON_HEIGHT = 36;
const DELETE_SHEET_ITEM_HEIGHT = 56;
const MEDIA_THUMBNAIL_SIZE = 80;
const VIDEO_ICON_SIZE = 28;
const REPLIES_CHEVRON_SIZE = 14;

// ---------------------------------------------------------------------------
// メディアサムネイル行（UserCommentsList の CommentMediaThumbnails と同じ表示に揃える）
// ---------------------------------------------------------------------------

type CommentMediaItem = CommentItemData['media'][number];

/** 生成型上 type は string のため、動画判定は文字列比較の型ガードで絞る */
function isVideoMediaType(type: string): boolean {
  return type === 'video';
}

type CommentMediaThumbnailsProps = {
  media: readonly CommentMediaItem[];
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
// Props
// ---------------------------------------------------------------------------

export type ReplyTarget = {
  parentId: string;
  nickname: string;
};

type CommentItemProps = {
  item: CommentItemData;
  /**
   * コメントいいねのキャッシュ特定に使う投稿 ID。
   * テスト等 postId を省略する呼び出し元との互換のため既定値は空文字（キャッシュ無効化のみ無害に skip される）。
   */
  postId?: string;
  /** 閲覧者のユーザー ID（未認証は undefined）。自分のコメント判定と通報導線の表示制御に使用する。 */
  currentUserId: string | undefined;
  /** 「返信する」ボタンのコールバック（返信モードを親が管理する） */
  onReply?: (target: ReplyTarget) => void;
  /** 削除コールバック（自分のコメントのみ）*/
  onDelete?: (commentId: string) => void;
  /** 削除処理中のコメント ID（グレーアウト表示） */
  deletingId?: string;
  /** いいね失敗時のエラーメッセージ通知（画面共通の Toast へ委譲する） */
  onLikeError?: (message: string) => void;
  /** 返信一覧内で再帰描画される子コメントかどうか（インデント・アバターサイズを切り替える） */
  isReply?: boolean;
};

// ---------------------------------------------------------------------------
// Component（React.memo で FlatList 内の不要な再レンダリングを防ぐ）
// ---------------------------------------------------------------------------

function CommentItemInner({
  item,
  postId = '',
  currentUserId,
  onReply,
  onDelete,
  deletingId,
  onLikeError,
  isReply = false,
}: CommentItemProps) {
  const relativeTime = useMemo(
    () => formatRelativeTime(item.createdAt),
    [item.createdAt]
  );

  const absoluteDateTime = useMemo(
    () => formatAbsoluteDateTime(new Date(item.createdAt)),
    [item.createdAt]
  );

  const segments = useMemo(
    () => parseContentSegments(item.isDeleted ? null : item.content),
    [item.isDeleted, item.content]
  );

  const mentionNicknameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of item.mentionedUsers) {
      map.set(u.id, u.nickname);
    }
    return map;
  }, [item.mentionedUsers]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteSheetVisible, setDeleteSheetVisible] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const isOwnComment = currentUserId !== undefined && currentUserId === item.user.id;
  const canShowOthersMenu = currentUserId !== undefined && !isOwnComment && !item.isDeleted;
  const isDeleting = deletingId === item.id;
  const avatarSize = isReply ? REPLY_AVATAR_SIZE : AVATAR_SIZE;

  // 展開時のみフェッチする（enabled=false は commentId 空文字で表現される）
  const repliesQuery = useCommentRepliesQuery(repliesExpanded ? item.id : '');
  const replyItems = useMemo(
    () => repliesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [repliesQuery.data]
  );

  const handlePressAvatar = useCallback(() => {
    router.push(routeUserDetail(item.user.id));
  }, [item.user.id]);

  const handleMenuOpen = useCallback(() => {
    if (isOwnComment) {
      setDeleteSheetVisible(true);
    } else {
      setMenuVisible(true);
    }
  }, [isOwnComment]);

  const handlePressReply = useCallback(() => {
    if (onReply !== undefined) {
      onReply({ parentId: item.id, nickname: item.user.nickname });
    }
  }, [onReply, item.id, item.user.nickname]);

  const handleToggleReplies = useCallback(() => {
    setRepliesExpanded((prev) => !prev);
  }, []);

  const handleLoadMoreReplies = useCallback(() => {
    if (repliesQuery.hasNextPage && !repliesQuery.isFetchingNextPage) {
      void repliesQuery.fetchNextPage();
    }
  }, [repliesQuery]);

  const handleRetryReplies = useCallback(() => {
    void repliesQuery.refetch();
  }, [repliesQuery]);

  const handleConfirmDelete = useCallback(() => {
    if (Platform.OS === 'ios') {
      setDeleteSheetVisible(false);
      Alert.alert('コメントを削除しますか？', 'この操作は取り消せません。', [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            if (onDelete !== undefined) onDelete(item.id);
          },
        },
      ]);
    } else {
      setDeleteSheetVisible(false);
      if (onDelete !== undefined) onDelete(item.id);
    }
  }, [onDelete, item.id]);

  if (item.isBlockedUser) {
    return null;
  }

  return (
    <View
      testID="comment-item"
      style={isDeleting ? styles.containerDeleting : undefined}
    >
      <View style={styles.container}>
        {/* アバター（返信は Web の depth=1 表示に合わせて一回り小さくする） */}
        <Pressable
          onPress={handlePressAvatar}
          accessibilityRole="imagebutton"
          accessibilityLabel={`${item.user.nickname}のプロフィールを表示`}
          style={[styles.avatarButton, { width: avatarSize, height: avatarSize }]}
        >
          <UserAvatar
            avatarUrl={item.user.avatarUrl}
            userId={item.user.id}
            size={avatarSize}
            accessibilityLabel={`${item.user.nickname}のプロフィール画像`}
            recyclingKey={item.user.id}
          />
        </Pressable>

        {/* コンテンツエリア */}
        <View style={styles.contentArea}>
          {/* ヘッダー行: ニックネーム + 日時 + メニュー */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={handlePressAvatar}
              accessibilityRole="button"
              accessibilityLabel={`${item.user.nickname}のプロフィールを表示`}
            >
              <Text style={styles.nickname} numberOfLines={1}>
                {item.user.nickname}
              </Text>
            </Pressable>
            <Text
              style={styles.time}
              accessibilityLabel={absoluteDateTime}
            >
              {relativeTime}
            </Text>

            {/* 自分のコメント または 他人のコメント（認証済み）にメニューを表示 */}
            {(isOwnComment || canShowOthersMenu) && !item.isDeleted && (
              <Pressable
                style={({ pressed }) => [
                  styles.menuButton,
                  pressed && styles.menuButtonPressed,
                ]}
                onPress={handleMenuOpen}
                accessibilityRole="button"
                accessibilityLabel="コメントのオプションを開く"
                hitSlop={spacing2}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={COMMENT_MENU_ICON_SIZE}
                  color={colorTextSecondary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </Pressable>
            )}
          </View>

          {/* 本文 */}
          {item.isDeleted ? (
            <View style={styles.deletedContainer}>
              <Text style={styles.deletedText}>削除されたコメント</Text>
            </View>
          ) : (
            <Text style={styles.body}>
              {segments.map((segment, index) => {
                if (segment.type === 'mention') {
                  const nickname = mentionNicknameById.get(segment.userId);
                  const displayText = `@${nickname ?? 'unknown'}`;
                  return (
                    <Text
                      key={index}
                      style={styles.mention}
                      onPress={() => router.push(routeUserDetail(segment.userId))}
                      accessibilityRole="link"
                      accessibilityLabel={`${displayText}のプロフィールを表示`}
                    >
                      {displayText}
                    </Text>
                  );
                }
                if (segment.type === 'hashtag') {
                  return (
                    <Text
                      key={index}
                      style={styles.hashtag}
                      onPress={() => router.push(routeSearchByQuery(segment.tag))}
                      accessibilityRole="link"
                      accessibilityLabel={`${segment.tag}を検索`}
                    >
                      {segment.tag}
                    </Text>
                  );
                }
                return (
                  <Text key={index} style={styles.body}>
                    {segment.content}
                  </Text>
                );
              })}
            </Text>
          )}

          {/* 添付メディア（UserCommentsList と同じサムネイル表示）*/}
          {!item.isDeleted && <CommentMediaThumbnails media={item.media} />}

          {/* 編集済みバッジ（Web の CommentCard 準拠: 本文の直後に表示） */}
          {!item.isDeleted && item.editedAt !== null && (
            <Text style={styles.editedBadge}>（編集済み）</Text>
          )}

          {/* アクション行（いいね・返信ボタン）*/}
          {!item.isDeleted && (
            <View style={styles.actionsRow}>
              <CommentLikeButton
                postId={postId}
                commentId={item.id}
                parentId={item.parentId}
                isLiked={item.isLiked}
                likeCount={item.likeCount}
                currentUserId={currentUserId}
                onError={onLikeError}
              />
              {onReply !== undefined && (
                <Pressable
                  style={styles.actionButton}
                  onPress={handlePressReply}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.user.nickname}のコメントに返信する`}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Text style={styles.actionButtonText}>返信する</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* 返信件数の表示・トグル + 実データ（useCommentRepliesQuery）の展開表示 */}
          {!item.isDeleted && item.replyCount > 0 && (
            <View>
              <Pressable
                style={styles.repliesToggle}
                onPress={handleToggleReplies}
                accessibilityRole="button"
                accessibilityLabel={
                  repliesExpanded ? '返信を非表示にする' : `${item.replyCount}件の返信を表示する`
                }
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              >
                <Ionicons
                  name={repliesExpanded ? 'chevron-up' : 'chevron-down'}
                  size={REPLIES_CHEVRON_SIZE}
                  color={colorTextSecondary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text style={styles.repliesToggleText}>
                  {repliesExpanded ? '返信を非表示' : `${item.replyCount}件の返信を表示`}
                </Text>
              </Pressable>

              {repliesExpanded && (
                <View style={isReply ? styles.repliesListNested : styles.repliesListRoot}>
                  {repliesQuery.isLoading && (
                    <ActivityIndicator
                      size="small"
                      color={colorTextTertiary}
                      style={styles.repliesLoading}
                      accessibilityLabel="返信を読み込み中"
                    />
                  )}

                  {repliesQuery.isError && (
                    <Pressable
                      onPress={handleRetryReplies}
                      accessibilityRole="button"
                      accessibilityLabel="返信の読み込みを再試行する"
                      style={styles.repliesErrorButton}
                    >
                      <Text style={styles.repliesErrorText}>{ERR_GENERIC}</Text>
                    </Pressable>
                  )}

                  {replyItems.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      item={reply}
                      postId={postId}
                      currentUserId={currentUserId}
                      onReply={onReply}
                      onDelete={onDelete}
                      deletingId={deletingId}
                      onLikeError={onLikeError}
                      isReply
                    />
                  ))}

                  {repliesQuery.hasNextPage && (
                    <Pressable
                      onPress={handleLoadMoreReplies}
                      accessibilityRole="button"
                      accessibilityLabel="さらに返信を読み込む"
                      style={styles.loadMoreReplies}
                    >
                      {repliesQuery.isFetchingNextPage ? (
                        <ActivityIndicator size="small" color={colorTextTertiary} />
                      ) : (
                        <Text style={styles.loadMoreRepliesText}>さらに返信を読み込む</Text>
                      )}
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* 他人のコメントの通報・ブロック・ミュートメニュー */}
      {menuVisible && (
        <UserActionMenu
          targetUserId={item.user.id}
          targetUserNickname={item.user.nickname}
          isOwnContent={isOwnComment}
          contentType="comment"
          contentId={item.id}
          isBlocked={item.user.isBlocked}
          isMuted={item.user.isMuted}
          onClose={() => setMenuVisible(false)}
        />
      )}

      {/* 自分のコメントの削除メニュー（Android: カスタムシート） */}
      {deleteSheetVisible && Platform.OS !== 'ios' && (
        <Modal
          visible={deleteSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDeleteSheetVisible(false)}
          accessibilityViewIsModal
        >
          <Pressable
            style={styles.deleteSheetBackdrop}
            onPress={() => setDeleteSheetVisible(false)}
          />
          <View style={styles.deleteSheet}>
            <View style={styles.deleteSheetHandle} />
            <Pressable
              style={({ pressed }) => [
                styles.deleteSheetItem,
                pressed && styles.deleteSheetItemPressed,
              ]}
              onPress={handleConfirmDelete}
              accessibilityRole="button"
              accessibilityLabel="コメントを削除"
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={colorError}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.deleteSheetItemText}>削除</Text>
            </Pressable>
            <View style={styles.deleteSheetDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.deleteSheetItem,
                pressed && styles.deleteSheetItemPressed,
              ]}
              onPress={() => setDeleteSheetVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.deleteSheetCancelText}>キャンセル</Text>
            </Pressable>
          </View>
        </Modal>
      )}
    </View>
  );
}

export const CommentItem = React.memo(CommentItemInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    backgroundColor: colorSurface,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
  },
  avatarButton: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    marginRight: spacing3,
    flexShrink: 0,
  },
  contentArea: {
    flex: 1,
    gap: spacing2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  menuButton: {
    width: COMMENT_MENU_BUTTON_SIZE,
    height: COMMENT_MENU_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: COMMENT_MENU_BUTTON_SIZE / 2,
    marginLeft: 'auto',
  },
  menuButtonPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  nickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
    flexShrink: 1,
  },
  time: {
    ...textSm,
    color: colorTextSecondary,
    flexShrink: 0,
  },
  body: {
    ...textBase,
    color: colorTextPrimary,
  },
  mention: {
    ...textBase,
    color: colorTextLink,
    fontWeight: '600',
  },
  hashtag: {
    ...textBase,
    color: colorTextHashtag,
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
  repliesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    minHeight: 32,
  },
  repliesToggleText: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  repliesListRoot: {
    marginTop: spacing2,
    marginLeft: REPLY_INDENT,
    paddingLeft: spacing3,
    borderLeftWidth: 2,
    borderLeftColor: colorBorderLight,
    gap: spacing3,
  },
  repliesListNested: {
    marginTop: spacing2,
    gap: spacing3,
  },
  repliesLoading: {
    marginVertical: spacing2,
  },
  repliesErrorButton: {
    paddingVertical: spacing2,
  },
  repliesErrorText: {
    ...textSm,
    color: colorError,
  },
  loadMoreReplies: {
    minHeight: 32,
    justifyContent: 'center',
    paddingVertical: spacing2,
  },
  loadMoreRepliesText: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
  editedBadge: {
    ...textXs,
    color: colorTextTertiary,
  },
  deletedContainer: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    backgroundColor: colorSurfaceMuted,
  },
  deletedText: {
    ...textSm,
    color: colorTextTertiary,
    fontStyle: 'italic',
  },
  containerDeleting: {
    opacity: 0.4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing3,
    marginTop: spacing2,
  },
  actionButton: {
    height: ACTION_BUTTON_HEIGHT,
    justifyContent: 'center',
    paddingRight: spacing3,
  },
  actionButtonText: {
    ...textSm,
    color: colorTextSecondary,
  },
  deleteSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  deleteSheet: {
    backgroundColor: colorBackground,
    borderTopLeftRadius: radius2xl,
    borderTopRightRadius: radius2xl,
    paddingBottom: spacing6,
    ...shadowWashiLg,
    alignItems: 'center',
  },
  deleteSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: radiusFull,
    backgroundColor: colorBorderLight,
    marginTop: spacing2,
    marginBottom: spacing2,
  },
  deleteSheetItem: {
    width: '100%',
    height: DELETE_SHEET_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
    gap: spacing4,
  },
  deleteSheetItemPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  deleteSheetItemText: {
    ...textMd,
    color: colorError,
    flex: 1,
  },
  deleteSheetDivider: {
    height: 1,
    backgroundColor: colorBorderLight,
    width: '90%',
  },
  deleteSheetCancelText: {
    ...textMd,
    color: colorTextSecondary,
    flex: 1,
    textAlign: 'center',
  },
});
