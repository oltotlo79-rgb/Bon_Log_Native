/**
 * @module components/post/QuoteComposer
 * 引用投稿の作成フォーム。引用元を QuotedPostCard で埋め込み表示し、コメントを入力して送信する。
 * Web: components/post/QuotePostModal.tsx に相当するが、モバイルはモーダルではなく専用スタック画面として実装する。
 * 楽観更新なし。送信中 UI を表示し、成功後に前画面へ戻る。
 */

import React, { useState, useCallback } from 'react';
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
  ERR_POST_CONTENT_TOO_LONG,
  ERR_RATE_LIMIT_DAILY_POSTS,
  ERR_FORBIDDEN,
  ERR_SERVER,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import {
  MAX_POST_CONTENT_FREE,
  MAX_POST_CONTENT_PREMIUM,
} from '@/lib/constants/limits/post';
import { useQuotePostMutation } from '@/lib/queries/posts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api/errors';
import { PostBodyInput } from './PostBodyInput';
import { ComposerFormError } from './ComposerFormError';
import { QuotedPostCard, type QuotedPostCardProps } from './QuotedPostCard';
import { Toast } from '@/components/common/Toast';
import { OfflineBanner } from '@/components/common/OfflineBanner';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const HEADER_HEIGHT = 54;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type QuoteComposerProps = {
  /** 引用元の投稿 ID */
  quotedPostId: string;
  /** QuotedPostCard に渡す引用元投稿データ */
  quotedPost: QuotedPostCardProps['post'];
  currentUserId: string;
  isPremium: boolean;
};

// ---------------------------------------------------------------------------
// エラー変換
// ---------------------------------------------------------------------------

function resolveQuoteError(error: unknown, appliedMaxLength: number): string {
  if (isApiError(error)) {
    if (error.code === 'RATE_LIMITED') return ERR_RATE_LIMIT_DAILY_POSTS;
    if (error.code === 'VALIDATION_ERROR') return ERR_POST_CONTENT_TOO_LONG(appliedMaxLength);
    if (error.code === 'GUEST_NOT_ALLOWED' || error.code === 'ACCOUNT_SUSPENDED') return ERR_FORBIDDEN;
    if (error.code === 'INTERNAL_ERROR' || error.code === 'SERVER_MISCONFIGURED') return ERR_SERVER;
  }
  return ERR_POST_CREATE_FAILED;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuoteComposer({
  quotedPostId,
  quotedPost,
  currentUserId,
  isPremium,
}: QuoteComposerProps) {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const { mutateAsync } = useQuotePostMutation(currentUserId);

  const maxLength = isPremium ? MAX_POST_CONTENT_PREMIUM : MAX_POST_CONTENT_FREE;

  const [content, setContent] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isContentOverLimit = content.length > maxLength;
  const canSubmit = content.trim().length > 0 && !isContentOverLimit && !isSubmitting;

  const handlePressCancel = useCallback(() => {
    if (content.trim().length === 0) {
      router.dismiss();
      return;
    }
    if (Platform.OS === 'ios') {
      Alert.alert('引用を破棄しますか？', '入力した内容は保存されません。', [
        { text: '入力を続ける', style: 'cancel' },
        { text: '破棄する', style: 'destructive', onPress: () => router.dismiss() },
      ]);
    } else {
      Alert.alert('引用を破棄しますか？', '入力した内容は保存されません。', [
        { text: '入力を続ける', style: 'cancel' },
        { text: '破棄する', onPress: () => router.dismiss() },
      ]);
    }
  }, [content]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await mutateAsync({ quotedPostId, content });
      showToast('引用投稿を作成しました');
      router.dismiss();
    } catch (error) {
      setFormError(resolveQuoteError(error, maxLength));
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, isOnline, mutateAsync, quotedPostId, content, maxLength, showToast]);

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
          引用投稿
        </Text>

        <Pressable
          style={styles.headerRightButton}
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="引用して投稿する"
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
              投稿する
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
        {/* コメント入力 */}
        <PostBodyInput
          value={content}
          onChange={setContent}
          maxLength={maxLength}
          isDisabled={isSubmitting}
        />

        <View style={styles.divider} />

        {/* 引用元プレビュー */}
        <View style={styles.quotedSection}>
          <QuotedPostCard post={quotedPost} />
        </View>

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
  quotedSection: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
  },
});
