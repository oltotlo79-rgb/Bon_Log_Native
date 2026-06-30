/**
 * @module components/post/PostComposer
 * 投稿コンポーザの画面全体コンテナ（新規投稿・投稿編集共通）。
 * 画像/動画アップロード → create/update post の二段階フローを管理する。
 * 仕様: docs/design/post-composer.md
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorBorderLight,
  spacing3,
  spacing4,
  textMd,
} from '@/lib/constants/design-tokens';
import {
  ERR_POST_CREATE_FAILED,
  ERR_POST_UPDATE_FAILED,
  ERR_MEDIA_UPLOAD_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_POST_CONTENT_TOO_LONG,
  ERR_RATE_LIMIT_DAILY_POSTS,
  ERR_FORBIDDEN,
  ERR_SERVER,
} from '@/lib/constants/errors';
import {
  MAX_POST_CONTENT_FREE,
  MAX_POST_CONTENT_PREMIUM,
} from '@/lib/constants/limits/post';
import { useCreatePostMutation, useUpdatePostMutation } from '@/lib/queries/posts';
import { uploadImage, uploadVideo } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { usePostComposer } from '@/hooks/use-post-composer';
import { PostBodyInput } from './PostBodyInput';
import { GenreSelector } from './GenreSelector';
import { ImageAttachmentGrid } from './ImageAttachmentGrid';
import { VideoAttachmentArea } from './VideoAttachmentArea';
import { ComposerFormError } from './ComposerFormError';
import { PollAttachment, createDefaultPollValue, type PollAttachmentValue } from './PollAttachment';
import { Toast } from '@/components/common/Toast';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { isApiError } from '@/lib/api/errors';
import type { PostComposerInitialValues } from '@/hooks/use-post-composer';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 54;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PostComposerProps = {
  mode: 'create' | 'edit';
  currentUserId: string;
  isPremium: boolean;
  initialValues?: PostComposerInitialValues;
  postId?: string;
};

// ---------------------------------------------------------------------------
// エラーコードからユーザー向けメッセージへの変換
// ---------------------------------------------------------------------------

function resolveCreateError(error: unknown, appliedMaxLength: number): string {
  if (isApiError(error)) {
    if (error.code === 'RATE_LIMITED') return ERR_RATE_LIMIT_DAILY_POSTS;
    if (error.code === 'VALIDATION_ERROR') return ERR_POST_CONTENT_TOO_LONG(appliedMaxLength);
    if (error.code === 'GUEST_NOT_ALLOWED' || error.code === 'ACCOUNT_SUSPENDED') return ERR_FORBIDDEN;
    if (error.code === 'INTERNAL_ERROR' || error.code === 'SERVER_MISCONFIGURED') return ERR_SERVER;
  }
  const msg = error instanceof Error ? error.message : '';
  if (msg === ERR_MEDIA_UPLOAD_FAILED) return ERR_MEDIA_UPLOAD_FAILED;
  return ERR_POST_CREATE_FAILED;
}

function resolveUpdateError(error: unknown, appliedMaxLength: number): string {
  if (isApiError(error)) {
    if (error.code === 'VALIDATION_ERROR') return ERR_POST_CONTENT_TOO_LONG(appliedMaxLength);
    if (error.code === 'GUEST_NOT_ALLOWED' || error.code === 'ACCOUNT_SUSPENDED') return ERR_FORBIDDEN;
    if (error.code === 'INTERNAL_ERROR' || error.code === 'SERVER_MISCONFIGURED') return ERR_SERVER;
  }
  const msg = error instanceof Error ? error.message : '';
  if (msg === ERR_MEDIA_UPLOAD_FAILED) return ERR_MEDIA_UPLOAD_FAILED;
  return ERR_POST_UPDATE_FAILED;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostComposer({
  mode,
  currentUserId,
  isPremium,
  initialValues,
  postId,
}: PostComposerProps) {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();

  const maxLength = isPremium ? MAX_POST_CONTENT_PREMIUM : MAX_POST_CONTENT_FREE;

  const {
    content,
    setContent,
    selectedGenres,
    setSelectedGenres,
    images,
    videoUri,
    videoFileSize,
    isDirty,
    maxImages,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
  } = usePostComposer({ isPremium, initialValues });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollValue, setPollValue] = useState<PollAttachmentValue | null>(null);

  const createMutation = useCreatePostMutation(currentUserId);
  const updateMutation = useUpdatePostMutation();

  const isContentOverLimit = content.length > maxLength;
  const hasContent = content.trim().length > 0 || images.length > 0;
  // アンケートが添付されている場合、有効な選択肢（2つ以上、かつすべて非空）が必要
  const isPollValid =
    pollValue === null ||
    (pollValue.options.length >= 2 && pollValue.options.every((o) => o.trim().length > 0));
  const canSubmit = hasContent && !isContentOverLimit && !isSubmitting && isPollValid;

  const handlePressCancel = useCallback(() => {
    if (!isDirty) {
      router.dismiss();
      return;
    }
    if (Platform.OS === 'ios') {
      Alert.alert('投稿を破棄しますか？', '入力した内容は保存されません。', [
        { text: '入力を続ける', style: 'cancel' },
        {
          text: '破棄する',
          style: 'destructive',
          onPress: () => router.dismiss(),
        },
      ]);
    } else {
      Alert.alert('投稿を破棄しますか？', '入力した内容は保存されません。', [
        { text: '入力を続ける', style: 'cancel' },
        { text: '破棄する', onPress: () => router.dismiss() },
      ]);
    }
  }, [isDirty]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      // 画像アップロード（ローカル URI のみ対象）
      const uploadedImageUrls: string[] = [];
      for (const img of images) {
        // 既存画像（http(s)://）はそのまま、ローカル URI のみアップロード
        if (img.uri.startsWith('http')) {
          uploadedImageUrls.push(img.uri);
        } else {
          const url = await uploadImage({ localUri: img.uri });
          uploadedImageUrls.push(url);
        }
      }

      // 動画アップロード（プレミアムのみ）
      let uploadedVideoUrl: string | null = null;
      if (isPremium && videoUri !== null) {
        if (videoUri.startsWith('http')) {
          uploadedVideoUrl = videoUri;
        } else {
          uploadedVideoUrl = await uploadVideo({
            localUri: videoUri,
            // videoFileSize が undefined の端末では presigned 取得時にサーバーが推定する（フォールバック: 0）
            fileSize: videoFileSize ?? 0,
          });
        }
      }

      const mediaUrls = [
        ...uploadedImageUrls,
        ...(uploadedVideoUrl !== null ? [uploadedVideoUrl] : []),
      ];
      const mediaTypes: ('image' | 'video')[] = [
        ...uploadedImageUrls.map((): 'image' => 'image'),
        ...(uploadedVideoUrl !== null ? (['video'] as const) : []),
      ];

      if (mode === 'create') {
        await createMutation.mutateAsync({
          content,
          genreIds: selectedGenres,
          mediaUrls,
          mediaTypes,
          poll: pollValue !== null
            ? { options: pollValue.options, durationSeconds: pollValue.durationSeconds }
            : undefined,
        });
        showToast('投稿しました');
        router.dismiss();
      } else {
        if (postId === undefined) return;
        await updateMutation.mutateAsync({
          id: postId,
          content,
          genreIds: selectedGenres,
          mediaUrls,
          mediaTypes,
        });
        showToast('編集を保存しました');
        router.dismiss();
      }
    } catch (error) {
      const message =
        mode === 'create'
          ? resolveCreateError(error, maxLength)
          : resolveUpdateError(error, maxLength);
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSubmit,
    isOnline,
    images,
    isPremium,
    videoUri,
    videoFileSize,
    maxLength,
    mode,
    content,
    selectedGenres,
    createMutation,
    updateMutation,
    postId,
    showToast,
    pollValue,
  ]);

  const title = mode === 'create' ? '新規投稿' : '投稿を編集';
  const submitLabel = mode === 'create' ? '投稿する' : '保存する';
  const submitAccessibilityLabel = mode === 'create' ? '投稿する' : '変更を保存する';

  return (
    <View
      style={[styles.safeWrapper, { paddingTop: insets.top }]}
      accessibilityViewIsModal
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable
          style={styles.headerLeftButton}
          onPress={handlePressCancel}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="キャンセル"
          accessibilityState={{ disabled: isSubmitting }}
        >
          <Text
            style={[
              styles.headerCancelText,
              isSubmitting && styles.headerButtonDisabled,
            ]}
          >
            キャンセル
          </Text>
        </Pressable>

        <Text style={styles.headerTitle} accessibilityRole="header">
          {title}
        </Text>

        <Pressable
          style={styles.headerRightButton}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel={submitAccessibilityLabel}
          accessibilityState={{ disabled: !canSubmit }}
        >
          {isSubmitting ? (
            <ActivityIndicator
              size="small"
              color={colorActionPrimary}
              accessibilityLabel="送信中"
            />
          ) : (
            <Text
              style={[
                styles.headerSubmitText,
                !canSubmit && styles.headerButtonDisabled,
              ]}
            >
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>

      {/* オフラインバナー */}
      <OfflineBanner isVisible={!isOnline} />

      {/* 本体コンテンツ */}
      <ScrollView
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <PostBodyInput
          value={content}
          onChange={setContent}
          maxLength={maxLength}
          isDisabled={isSubmitting}
        />

        <View style={styles.divider} />

        <GenreSelector
          selectedGenres={selectedGenres}
          onChange={setSelectedGenres}
          isDisabled={isSubmitting}
        />

        <View style={styles.divider} />

        <ImageAttachmentGrid
          images={images}
          onAdd={() => void handleAddImage()}
          onRemove={handleRemoveImage}
          maxCount={maxImages}
          isDisabled={isSubmitting}
        />

        <VideoAttachmentArea
          isPremium={isPremium}
          videoUri={videoUri}
          onAdd={() => void handleAddVideo()}
          onRemove={handleRemoveVideo}
          isDisabled={isSubmitting}
        />

        {/* アンケートセクション（新規投稿のみ） */}
        {mode === 'create' && (
          <View style={styles.pollSection}>
            {pollValue !== null ? (
              <PollAttachment
                value={pollValue}
                onChange={setPollValue}
                onRemove={() => setPollValue(null)}
                isDisabled={isSubmitting}
              />
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.addPollButton,
                  pressed && styles.addPollButtonPressed,
                ]}
                onPress={() => setPollValue(createDefaultPollValue())}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="アンケートを追加"
                accessibilityState={{ disabled: isSubmitting }}
              >
                <Text style={styles.addPollText}>アンケートを追加</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* フォームエラーバナー */}
        <ComposerFormError message={formError} />

        {/* セーフエリア下端の余白 */}
        <View style={{ height: insets.bottom + spacing4 }} />
      </ScrollView>

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
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeWrapper: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textMd,
    fontWeight: '600',
    color: colorTextPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerLeftButton: {
    minWidth: 72,
    height: 44,
    justifyContent: 'center',
  },
  headerRightButton: {
    minWidth: 72,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerCancelText: {
    ...textMd,
    color: colorTextSecondary,
  },
  headerSubmitText: {
    ...textMd,
    fontWeight: '600',
    color: colorActionPrimary,
  },
  headerButtonDisabled: {
    opacity: 0.4,
    color: colorTextTertiary,
  },
  scrollView: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing3,
  },
  pollSection: {
    paddingHorizontal: spacing3,
    paddingTop: spacing3,
  },
  addPollButton: {
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: 8,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addPollButtonPressed: {
    opacity: 0.6,
  },
  addPollText: {
    ...textMd,
    color: colorTextSecondary,
  },
});
