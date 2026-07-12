/**
 * @module components/comment/CommentInput
 * 投稿詳細画面下部に固定されるコメント入力バー。
 * キーボード追従・返信モード・文字数カウンタ・画像/動画添付を含む。
 * 仕様: docs/design/comment-composer.md §6
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorTextLink,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  colorBorder,
  colorBorderFocus,
  colorError,
  colorWarning,
  spacing2,
  spacing3,
  spacing4,
  radiusLg,
  radiusMd,
  textBase,
  textSm,
} from '@/lib/constants/design-tokens';
import { MAX_COMMENT_LENGTH } from '@/lib/constants/limits/post';
import { ERR_MEDIA_UPLOAD_FAILED } from '@/lib/constants/errors';
import { uploadImage, uploadVideo } from '@/lib/queries/upload';
import { useCommentMedia } from '@/hooks/use-comment-media';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';
import { VideoAttachmentArea } from '@/components/post/VideoAttachmentArea';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SUBMIT_BUTTON_HEIGHT = 44;
const SUBMIT_BUTTON_MIN_WIDTH = 72;
const REPLY_BANNER_HEIGHT = 36;
const TEXT_INPUT_MIN_HEIGHT = 40;
const TEXT_INPUT_MAX_HEIGHT = 120;
const COUNTER_WARNING_THRESHOLD = 50;
const MEDIA_BUTTON_SIZE = 44;
const MEDIA_ICON_SIZE = 20;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type ReplyTarget = {
  parentId: string;
  nickname: string;
};

export type CommentSubmitParams = {
  content: string;
  parentId?: string;
  mediaUrls: string[];
  mediaTypes: ('image' | 'video')[];
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CommentInputProps = {
  replyTarget: ReplyTarget | null;
  onCancelReply: () => void;
  onSubmit: (params: CommentSubmitParams) => void;
  /** メディアアップロード失敗時に呼ばれる（送信自体はまだ行われていない） */
  onUploadError: (message: string) => void;
  isSubmitting: boolean;
  isPremium: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommentInput({
  replyTarget,
  onCancelReply,
  onSubmit,
  onUploadError,
  isSubmitting,
  isPremium,
}: CommentInputProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    images,
    videoUri,
    videoFileSize,
    maxImages,
    handleAddImage,
    handleRemoveImage,
    handleAddVideo,
    handleRemoveVideo,
    reset: resetMedia,
  } = useCommentMedia({ isPremium });

  // 送信中またはアップロード中は入力・添付操作をすべて止める
  const isBusy = isSubmitting || isUploading;

  const remaining = MAX_COMMENT_LENGTH - text.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining >= 0 && remaining <= COUNTER_WARNING_THRESHOLD;
  const hasMedia = images.length > 0 || videoUri !== null;
  // 本文またはメディアのどちらかがあれば送信可（Web CommentForm と同一条件）
  const canSubmit = (text.trim().length > 0 || hasMedia) && !isOverLimit && !isBusy;

  const counterColor = isOverLimit
    ? colorError
    : isNearLimit
      ? colorWarning
      : colorTextTertiary;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const mediaUrls: string[] = [];
    const mediaTypes: ('image' | 'video')[] = [];

    if (hasMedia) {
      setIsUploading(true);
      try {
        for (const img of images) {
          const url = await uploadImage({ localUri: img.uri });
          mediaUrls.push(url);
          mediaTypes.push('image');
        }
        if (videoUri !== null) {
          const url = await uploadVideo({
            localUri: videoUri,
            // videoFileSize が undefined の端末では presigned 取得時にサーバーが推定する（フォールバック: 0）
            fileSize: videoFileSize ?? 0,
          });
          mediaUrls.push(url);
          mediaTypes.push('video');
        }
      } catch {
        setIsUploading(false);
        onUploadError(ERR_MEDIA_UPLOAD_FAILED);
        return;
      }
      setIsUploading(false);
    }

    onSubmit({
      content: text.trim(),
      parentId: replyTarget?.parentId,
      mediaUrls,
      mediaTypes,
    });
    setText('');
    resetMedia();
  }, [
    canSubmit,
    hasMedia,
    images,
    videoUri,
    videoFileSize,
    onSubmit,
    onUploadError,
    text,
    replyTarget,
    resetMedia,
  ]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

  const isImageAddDisabled = isBusy || images.length >= maxImages;
  const isVideoAddDisabled = isBusy || videoUri !== null;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing3) },
      ]}
    >
      {/* 返信先バナー（返信モード時のみ表示） */}
      {replyTarget !== null && (
        <View
          style={styles.replyBanner}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`@${replyTarget.nickname} への返信モード。キャンセルするには ✕ を押してください`}
        >
          <Ionicons
            name="return-down-forward-outline"
            size={12}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.replyBannerText}>
            <Text style={styles.replyBannerNickname}>@{replyTarget.nickname}</Text>
            {' への返信'}
          </Text>
          <Pressable
            style={styles.replyCancelButton}
            onPress={onCancelReply}
            accessibilityRole="button"
            accessibilityLabel="返信をキャンセル"
          >
            <Ionicons
              name="close"
              size={16}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        </View>
      )}

      {/* 選択済み画像のサムネイル行（1枚以上のときのみ表示） */}
      {images.length > 0 && (
        <ImageAttachmentGrid
          images={images}
          onAdd={() => void handleAddImage()}
          onRemove={handleRemoveImage}
          maxCount={maxImages}
          isDisabled={isBusy}
        />
      )}

      {/* 選択済み動画のプレビュー（プレミアムかつ選択済みのときのみ表示） */}
      {isPremium && videoUri !== null && (
        <VideoAttachmentArea
          isPremium={isPremium}
          videoUri={videoUri}
          onAdd={() => void handleAddVideo()}
          onRemove={handleRemoveVideo}
          isDisabled={isBusy}
        />
      )}

      {/* 入力行 */}
      <View style={styles.inputRow}>
        {/* 画像添付ボタン */}
        <Pressable
          style={[styles.mediaButton, isImageAddDisabled && styles.mediaButtonDisabled]}
          onPress={() => void handleAddImage()}
          disabled={isImageAddDisabled}
          accessibilityRole="button"
          accessibilityLabel="画像を添付"
          accessibilityState={{ disabled: isImageAddDisabled }}
        >
          <Ionicons
            name="image-outline"
            size={MEDIA_ICON_SIZE}
            color={colorTextTertiary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

        {/* 動画添付ボタン（プレミアムのみ表示） */}
        {isPremium && (
          <Pressable
            style={[styles.mediaButton, isVideoAddDisabled && styles.mediaButtonDisabled]}
            onPress={() => void handleAddVideo()}
            disabled={isVideoAddDisabled}
            accessibilityRole="button"
            accessibilityLabel="動画を添付"
            accessibilityState={{ disabled: isVideoAddDisabled }}
          >
            <Ionicons
              name="videocam-outline"
              size={MEDIA_ICON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        )}

        {/* テキスト入力フィールド */}
        <View
          style={[
            styles.inputWrapper,
            isFocused && styles.inputWrapperFocused,
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            multiline
            placeholder="コメントを入力..."
            placeholderTextColor={colorTextTertiary}
            keyboardType="default"
            autoCapitalize="sentences"
            returnKeyType="default"
            editable={!isBusy}
            accessibilityLabel="コメントを入力"
            accessibilityHint={`最大${MAX_COMMENT_LENGTH}文字`}
            testID="comment-input"
          />
          {/* 文字数カウンタ（フォーカス中または文字が入っているとき表示） */}
          {(isFocused || text.length > 0) && (
            <Text style={[styles.counter, { color: counterColor }]}>
              {text.length} / {MAX_COMMENT_LENGTH}
            </Text>
          )}
        </View>

        {/* 送信ボタン */}
        <Pressable
          style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="コメントを送信する"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {isBusy ? (
            <ActivityIndicator size="small" color={colorActionPrimaryText} />
          ) : (
            <Text style={[styles.submitButtonText, !canSubmit && styles.submitButtonTextDisabled]}>
              送信する
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorBackground,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing2,
    paddingHorizontal: spacing3,
  },
  replyBanner: {
    height: REPLY_BANNER_HEIGHT,
    backgroundColor: colorSurfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing3,
    gap: spacing2,
    borderRadius: radiusMd,
    marginBottom: spacing2,
  },
  replyBannerText: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
  replyBannerNickname: {
    ...textSm,
    color: colorTextLink,
    fontWeight: '600',
  },
  replyCancelButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing2,
    paddingVertical: spacing2,
  },
  mediaButton: {
    width: MEDIA_BUTTON_SIZE,
    height: MEDIA_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButtonDisabled: {
    opacity: 0.4,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    borderWidth: 1,
    borderColor: colorBorder,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: TEXT_INPUT_MIN_HEIGHT,
    maxHeight: TEXT_INPUT_MAX_HEIGHT,
  },
  inputWrapperFocused: {
    borderWidth: 2,
    borderColor: colorBorderFocus,
  },
  textInput: {
    ...textBase,
    color: colorTextPrimary,
    paddingTop: 0,
    paddingBottom: 0,
    maxHeight: TEXT_INPUT_MAX_HEIGHT - spacing4,
  },
  counter: {
    ...textSm,
    textAlign: 'right',
    marginTop: spacing2,
  },
  submitButton: {
    height: SUBMIT_BUTTON_HEIGHT,
    minWidth: SUBMIT_BUTTON_MIN_WIDTH,
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  submitButtonDisabled: {
    backgroundColor: colorSurfaceMuted,
  },
  submitButtonText: {
    ...textSm,
    fontWeight: '600',
    color: colorActionPrimaryText,
  },
  submitButtonTextDisabled: {
    color: colorTextTertiary,
  },
});
