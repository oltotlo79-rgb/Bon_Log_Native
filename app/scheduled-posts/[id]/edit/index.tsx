/**
 * @module app/scheduled-posts/[id]/edit/index
 * 予約投稿の編集フォーム（pending のみ・モーダル表示・プレミアム限定）。
 * 仕様: docs/design/scheduled-posts.md §6
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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useScheduledPostDetailQuery,
  useUpdateScheduledPostMutation,
  type ScheduledPostItem,
} from '@/lib/queries/scheduled-posts';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { uploadImage, uploadVideo } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { usePostComposer } from '@/hooks/use-post-composer';
import { PostBodyInput } from '@/components/post/PostBodyInput';
import { GenreSelector } from '@/components/post/GenreSelector';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';
import { VideoAttachmentArea } from '@/components/post/VideoAttachmentArea';
import { ComposerFormError } from '@/components/post/ComposerFormError';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  spacing1,
  spacing2,
  spacing4,
  spacing8,
  radiusMd,
  textBase,
  textSm,
  textLg,
} from '@/lib/constants/design-tokens';
import {
  ERR_SCHEDULED_POST_UPDATE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_MEDIA_UPLOAD_FAILED,
} from '@/lib/constants/errors';
import { MAX_POST_CONTENT_PREMIUM } from '@/lib/constants/limits/post';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SCHEDULED_AT_DAYS_LIMIT = 30;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

type DateTimeParts = { year: string; month: string; day: string; hour: string; minute: string };

function parseScheduledAt(dateStr: string): DateTimeParts {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    return { year: '', month: '', day: '', hour: '', minute: '' };
  }
  return {
    year: String(d.getFullYear()),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
    hour: String(d.getHours()),
    minute: String(d.getMinutes()),
  };
}

// ---------------------------------------------------------------------------
// ScheduledAtSection
// ---------------------------------------------------------------------------

type ScheduledAtSectionProps = DateTimeParts & {
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
  onHourChange: (v: string) => void;
  onMinuteChange: (v: string) => void;
  disabled: boolean;
};

function ScheduledAtSection({
  year, month, day, hour, minute,
  onYearChange, onMonthChange, onDayChange, onHourChange, onMinuteChange,
  disabled,
}: ScheduledAtSectionProps) {
  return (
    <View style={satStyles.container}>
      <Text style={satStyles.label}>公開予定日時 ＊</Text>
      <View style={satStyles.row}>
        <TextInput
          value={year}
          onChangeText={onYearChange}
          keyboardType="number-pad"
          maxLength={4}
          placeholder="年"
          placeholderTextColor={colorTextTertiary}
          editable={!disabled}
          style={[satStyles.yearInput, disabled && satStyles.disabled]}
          accessibilityLabel="公開予定年"
        />
        <Text style={satStyles.sep}>年</Text>
        <TextInput
          value={month}
          onChangeText={onMonthChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="月"
          placeholderTextColor={colorTextTertiary}
          editable={!disabled}
          style={[satStyles.smInput, disabled && satStyles.disabled]}
          accessibilityLabel="公開予定月"
        />
        <Text style={satStyles.sep}>月</Text>
        <TextInput
          value={day}
          onChangeText={onDayChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="日"
          placeholderTextColor={colorTextTertiary}
          editable={!disabled}
          style={[satStyles.smInput, disabled && satStyles.disabled]}
          accessibilityLabel="公開予定日"
        />
        <Text style={satStyles.sep}>日</Text>
      </View>
      <View style={satStyles.row}>
        <TextInput
          value={hour}
          onChangeText={onHourChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="時"
          placeholderTextColor={colorTextTertiary}
          editable={!disabled}
          style={[satStyles.smInput, disabled && satStyles.disabled]}
          accessibilityLabel="公開予定時"
        />
        <Text style={satStyles.sep}>時</Text>
        <TextInput
          value={minute}
          onChangeText={onMinuteChange}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="分"
          placeholderTextColor={colorTextTertiary}
          editable={!disabled}
          style={[satStyles.smInput, disabled && satStyles.disabled]}
          accessibilityLabel="公開予定分"
        />
        <Text style={satStyles.sep}>分</Text>
      </View>
    </View>
  );
}

const satStyles = StyleSheet.create({
  container: { gap: spacing2 },
  label: { ...textSm, color: colorTextPrimary, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing2 },
  yearInput: {
    width: 72,
    height: 40,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing2,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    textAlign: 'center',
  },
  smInput: {
    width: 48,
    height: 40,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing1,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    textAlign: 'center',
  },
  sep: { ...textBase, color: colorTextSecondary },
  disabled: { backgroundColor: colorSurfaceMuted, opacity: 0.7 },
});

// ---------------------------------------------------------------------------
// Route shell — post データが確定してから FormBody をマウントする
// ---------------------------------------------------------------------------

export default function ScheduledPostEditScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];
  const id = typeof rawId === 'string' ? rawId : '';

  const { data: post, isLoading } = useScheduledPostDetailQuery(id);
  const { data: currentUser } = useCurrentUserQuery();

  if (isLoading || post === undefined || currentUser === undefined) {
    return <ScreenLoading variant="spinner" />;
  }

  return (
    <FormBody
      id={id}
      post={post}
      isPremium={currentUser.isPremium ?? false}
    />
  );
}

// ---------------------------------------------------------------------------
// FormBody — post が確定した後にマウントされるため useEffect 不要
// ---------------------------------------------------------------------------

type FormBodyProps = {
  id: string;
  post: ScheduledPostItem;
  isPremium: boolean;
};

function FormBody({ id, post, isPremium }: FormBodyProps) {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { mutate: updatePost, isPending: isSaving } = useUpdateScheduledPostMutation();

  const initialDateTime = parseScheduledAt(post.scheduledAt);

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
  } = usePostComposer({
    isPremium,
    initialValues: {
      content: post.content ?? '',
      genreIds: Array.isArray(post.genres) ? post.genres.map((g) => g.id) : [],
      imageUris: [],
      videoUri: null,
    },
  });

  const [year, setYear] = useState(initialDateTime.year);
  const [month, setMonth] = useState(initialDateTime.month);
  const [day, setDay] = useState(initialDateTime.day);
  const [hour, setHour] = useState(initialDateTime.hour);
  const [minute, setMinute] = useState(initialDateTime.minute);

  const [formError, setFormError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isPending = isSaving || isUploading;
  const contentLength = content.length;
  const maxContent = MAX_POST_CONTENT_PREMIUM;
  const hasDateInput = year.trim().length > 0 && month.trim().length > 0 && day.trim().length > 0;
  const hasTimeInput = hour.trim().length >= 1 && minute.trim().length >= 1;
  const canSubmit = content.trim().length > 0 && hasDateInput && hasTimeInput && !isPending && contentLength <= maxContent;

  const buildScheduledAtISO = useCallback((): string | null => {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const d = parseInt(day, 10);
    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    if (
      isNaN(y) || isNaN(m) || isNaN(d) || isNaN(h) || isNaN(min) ||
      m < 1 || m > 12 || d < 1 || d > 31 || h < 0 || h > 23 || min < 0 || min > 59
    ) {
      return null;
    }
    return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
  }, [year, month, day, hour, minute]);

  const handleCancel = useCallback(() => {
    if (isDirty) {
      Alert.alert(
        '変更を破棄しますか？',
        '保存されていない変更は失われます。',
        [
          { text: '編集を続ける', style: 'cancel' },
          { text: '破棄する', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }

    const scheduledAt = buildScheduledAtISO();
    if (scheduledAt === null) {
      setFormError('公開予定日時を正しく入力してください（月1〜12、日1〜31、時0〜23、分0〜59）。');
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    const nowMs = Date.now();
    const limitMs = nowMs + SCHEDULED_AT_DAYS_LIMIT * 24 * 60 * 60 * 1000;
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

    updatePost(
      {
        id,
        content: content.trim(),
        scheduledAt,
        genreIds: selectedGenres,
        mediaUrls,
        mediaTypes,
      },
      {
        onSuccess: () => router.back(),
        onError: (err) => {
          if (isApiError(err) && err.code === 'VALIDATION_ERROR') {
            setFormError('pending 状態の投稿のみ編集できます。または日時が無効です。');
          } else {
            setFormError(ERR_SCHEDULED_POST_UPDATE_FAILED);
          }
        },
      }
    );
  }, [
    isOnline, buildScheduledAtISO, images, videoUri, videoFileSize,
    content, selectedGenres, id, updatePost,
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
        <Text style={styles.headerTitle}>予約投稿を編集</Text>
        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="保存する"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {isPending ? (
            <ActivityIndicator size="small" color={colorActionPrimary} />
          ) : (
            <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
              保存する
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
          <ScheduledAtSection
            year={year}
            month={month}
            day={day}
            hour={hour}
            minute={minute}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayChange={setDay}
            onHourChange={setHour}
            onMinuteChange={setMinute}
            disabled={isPending}
          />

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
  },
  headerCancelText: {
    ...textBase,
    color: colorTextSecondary,
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
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
  counterOver: {
    color: '#c0392b',
  },
});
