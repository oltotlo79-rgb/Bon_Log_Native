/**
 * @module app/scheduled-posts/new/index
 * 予約投稿の新規作成フォーム（モーダル表示・プレミアム限定）。
 * 日時は components/common/DateTimeField（EventDateTimeField と同方式の日時ピッカー）で受け付ける。
 * 仕様: docs/design/scheduled-posts.md §4
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateScheduledPostMutation } from '@/lib/queries/scheduled-posts';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { uploadImage, uploadVideo } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePostComposer } from '@/hooks/use-post-composer';
import { DateTimeField } from '@/components/common/DateTimeField';
import { PostBodyInput } from '@/components/post/PostBodyInput';
import { GenreSelector } from '@/components/post/GenreSelector';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';
import { VideoAttachmentArea } from '@/components/post/VideoAttachmentArea';
import { ComposerFormError } from '@/components/post/ComposerFormError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  colorError,
  spacing2,
  spacing4,
  spacing8,
  textBase,
  textSm,
  textLg,
} from '@/lib/constants/design-tokens';
import {
  ERR_SCHEDULED_POST_CREATE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_MEDIA_UPLOAD_FAILED,
  ERR_PREMIUM_ONLY,
} from '@/lib/constants/errors';
import {
  MAX_POST_CONTENT_PREMIUM,
} from '@/lib/constants/limits/post';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SCHEDULED_AT_DAYS_LIMIT = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduledPostNewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { data: currentUser } = useCurrentUserQuery();
  const isPremium = currentUser?.isPremium ?? false;

  const { mutate: createScheduledPost, isPending: isSaving } = useCreateScheduledPostMutation();

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
  } = usePostComposer({ isPremium });

  const [scheduledAt, setScheduledAt] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isPending = isSaving || isUploading;

  const contentLength = content.length;
  const maxContent = MAX_POST_CONTENT_PREMIUM;
  const hasScheduledAt = scheduledAt !== null;
  // 本文またはメディアのどちらかがあれば送信可（Web ScheduledPostForm と同一条件）
  const hasContent = content.trim().length > 0 || images.length > 0 || videoUri !== null;
  const hasRequiredFields = hasContent && hasScheduledAt;
  const canSubmit = hasRequiredFields && !isPending && contentLength <= maxContent;

  const now = new Date();
  const maximumScheduledDate = new Date(now.getTime() + SCHEDULED_AT_DAYS_LIMIT * MS_PER_DAY);

  const handleCancel = useCallback(() => {
    if (isDirty || hasScheduledAt) {
      Alert.alert(
        '変更を破棄しますか？',
        '入力した内容は失われます。',
        [
          { text: '編集を続ける', style: 'cancel' },
          { text: '破棄する', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty, hasScheduledAt]);

  const handleSave = useCallback(async () => {
    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!isPremium) {
      setFormError(ERR_PREMIUM_ONLY);
      return;
    }
    if (scheduledAt === null) {
      setFormError('公開予定日時を選択してください。');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    const nowMs = Date.now();
    const limitMs = nowMs + SCHEDULED_AT_DAYS_LIMIT * MS_PER_DAY;
    if (scheduledDate.getTime() <= nowMs) {
      setFormError('公開予定日時は現在より未来に設定してください。');
      return;
    }
    if (scheduledDate.getTime() > limitMs) {
      setFormError(`公開予定日時は${SCHEDULED_AT_DAYS_LIMIT}日以内に設定してください。`);
      return;
    }

    setFormError(null);
    setIsUploading(true);

    let mediaUrls: string[] = [];
    let mediaTypes: ('image' | 'video')[] = [];

    try {
      const uploadedImages = await Promise.all(
        images.map((img) => uploadImage({ localUri: img.uri }))
      );
      mediaUrls.push(...uploadedImages);
      mediaTypes.push(...uploadedImages.map(() => 'image' as const));

      if (videoUri !== null) {
        const uploadedVideoUrl = await uploadVideo({
          localUri: videoUri,
          fileSize: videoFileSize ?? 0,
        });
        mediaUrls.push(uploadedVideoUrl);
        mediaTypes.push('video');
      }
    } catch {
      setFormError(ERR_MEDIA_UPLOAD_FAILED);
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    createScheduledPost(
      {
        content: content.trim(),
        scheduledAt,
        genreIds: selectedGenres,
        mediaUrls,
        mediaTypes,
      },
      {
        onSuccess: () => {
          router.replace('/scheduled-posts');
        },
        onError: (err) => {
          if (isApiError(err) && err.code === 'VALIDATION_ERROR') {
            setFormError('保留中の予約投稿が上限（10件）に達しているか、日時が無効です。');
          } else {
            setFormError(ERR_SCHEDULED_POST_CREATE_FAILED);
          }
        },
      }
    );
  }, [
    isOnline, isPremium, scheduledAt, images, videoUri, videoFileSize,
    content, selectedGenres, createScheduledPost,
  ]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      {/* モーダルヘッダー */}
      <View style={styles.header}>
        <Pressable
          onPress={handleCancel}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="キャンセル"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.headerCancelText}>キャンセル</Text>
        </Pressable>
        <Text style={styles.headerTitle}>予約投稿を作成</Text>
        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="予約する"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colorActionPrimary} />
          ) : (
            <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
              予約する
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
          keyboardShouldPersistTaps="handled"
        >
          <ComposerFormError message={formError} />

          {/* 公開予定日時 */}
          <View style={styles.fieldGroup}>
            <DateTimeField
              label="公開予定日時 ＊"
              value={scheduledAt}
              onChange={setScheduledAt}
              disabled={isPending}
              minimumDate={now}
              maximumDate={maximumScheduledDate}
              clearAccessibilityLabel="公開予定日時を削除"
            />
            <Text style={styles.hint}>現在から{SCHEDULED_AT_DAYS_LIMIT}日以内の日時を選択してください。</Text>
          </View>

          {/* 投稿本文 */}
          <View style={styles.fieldGroup}>
            <PostBodyInput
              value={content}
              onChange={setContent}
              maxLength={maxContent}
              isDisabled={isPending}
            />
            <Text
              style={[
                styles.counter,
                contentLength > maxContent && styles.counterOver,
              ]}
            >
              {contentLength}/{maxContent}
            </Text>
          </View>

          {/* ジャンル */}
          <GenreSelector
            selectedGenres={selectedGenres}
            onChange={setSelectedGenres}
            isDisabled={isPending}
          />

          {/* 画像添付 */}
          <ImageAttachmentGrid
            images={images}
            onAdd={() => { void handleAddImage(); }}
            onRemove={handleRemoveImage}
            maxCount={maxImages}
            isDisabled={isPending}
          />

          {/* 動画添付（プレミアムのみ） */}
          {isPremium && (
            <VideoAttachmentArea
              isPremium={isPremium}
              videoUri={videoUri}
              onAdd={() => { void handleAddVideo(); }}
              onRemove={handleRemoveVideo}
              isDisabled={isPending}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  headerButton: {
    minWidth: 70,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerCancelText: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'left',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerSaveText: {
    ...textBase,
    color: colorActionPrimary,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerSaveTextDisabled: {
    opacity: 0.4,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },
  fieldGroup: {
    gap: spacing2,
  },
  hint: {
    ...textSm,
    color: colorTextTertiary,
  },
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
  counterOver: {
    color: colorError,
  },
});
