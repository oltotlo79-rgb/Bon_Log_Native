/**
 * @module components/comment/CommentInput
 * 投稿詳細画面下部に固定されるコメント入力バー。
 * キーボード追従・返信モード・文字数カウンタを含む。
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

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const SUBMIT_BUTTON_HEIGHT = 44;
const SUBMIT_BUTTON_MIN_WIDTH = 72;
const REPLY_BANNER_HEIGHT = 36;
const TEXT_INPUT_MIN_HEIGHT = 40;
const TEXT_INPUT_MAX_HEIGHT = 120;
const COUNTER_WARNING_THRESHOLD = 50;
const IMAGE_BUTTON_SIZE = 44;

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
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type CommentInputProps = {
  replyTarget: ReplyTarget | null;
  onCancelReply: () => void;
  onSubmit: (params: CommentSubmitParams) => void;
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
  isSubmitting,
}: CommentInputProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [text, setText] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const remaining = MAX_COMMENT_LENGTH - text.length;
  const isOverLimit = remaining < 0;
  const isNearLimit = remaining >= 0 && remaining <= COUNTER_WARNING_THRESHOLD;
  const canSubmit = text.trim().length > 0 && !isOverLimit && !isSubmitting;

  const counterColor = isOverLimit
    ? colorError
    : isNearLimit
      ? colorWarning
      : colorTextTertiary;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    onSubmit({
      content: text.trim(),
      parentId: replyTarget?.parentId,
    });
    setText('');
  }, [canSubmit, onSubmit, text, replyTarget]);

  const handleFocus = useCallback(() => setIsFocused(true), []);
  const handleBlur = useCallback(() => setIsFocused(false), []);

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

      {/* 入力行 */}
      <View style={styles.inputRow}>
        {/* 画像添付ボタン（MVP: 配置のみ） */}
        <Pressable
          style={styles.imageButton}
          accessibilityRole="button"
          accessibilityLabel="画像を添付"
          disabled
        >
          <Ionicons
            name="image-outline"
            size={20}
            color={colorTextTertiary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Pressable>

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
            editable={!isSubmitting}
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
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="コメントを送信する"
          accessibilityState={{ disabled: !canSubmit }}
        >
          {isSubmitting ? (
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
  imageButton: {
    width: IMAGE_BUTTON_SIZE,
    height: IMAGE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
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
