/**
 * @module app/shops/[id]/reviews/new/index
 * 盆栽園レビュー投稿フォーム（モーダル）。
 * 仕様: docs/design/shops.md §6
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateReviewMutation } from '@/lib/queries/shops';
import { useShopDetailQuery } from '@/lib/queries/shops';
import { uploadImage } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import {
  ERR_REVIEW_CREATE_FAILED,
  ERR_REVIEW_DUPLICATE,
  ERR_OFFLINE_ACTION,
  ERR_MEDIA_UPLOAD_FAILED,
} from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorBorder,
  colorActionPrimary,
  colorWarning,
  colorError,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusMd,
  textBase,
  textSm,
  textXs,
  textLg,
} from '@/lib/constants/design-tokens';
import { MAX_REVIEW_IMAGES } from '@/lib/constants/limits/media';
import { MAX_REVIEW_CONTENT_LENGTH } from '@/lib/constants/limits/shop';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';
import type { AttachedImage } from '@/components/post/ImageAttachmentGrid';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const STAR_SIZE = 36;
const STAR_HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

// ---------------------------------------------------------------------------
// ユニーク ID 生成（ImageAttachmentGrid の localId 用）
// ---------------------------------------------------------------------------

let _idCounter = 0;
function generateLocalId(): string {
  _idCounter += 1;
  return `review-img-${Date.now()}-${_idCounter}`;
}

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

// 409 二重投稿エラーの判定
function isDuplicateReviewError(error: Error): boolean {
  return error.message.includes('409') || error.message.toLowerCase().includes('conflict');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NewReviewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const shopId = getIdParam(params);

  const { data: shop } = useShopDetailQuery(shopId);

  const [rating, setRating] = useState<number | null>(null);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { mutateAsync: createReview } = useCreateReviewMutation();

  const hasInput = rating !== null || content.trim().length > 0 || images.length > 0;
  const canSubmit = rating !== null && !isSubmitting && isOnline;

  const handleAddImage = useCallback(async () => {
    const remaining = MAX_REVIEW_IMAGES - images.length;
    if (remaining <= 0) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'ios') {
        Alert.alert(
          '写真へのアクセスが必要です',
          '設定アプリから写真へのアクセスを許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: '設定を開く', onPress: () => void Linking.openSettings() },
          ]
        );
      } else {
        Alert.alert(
          '写真へのアクセスが必要です',
          '設定アプリから写真へのアクセスを許可してください。'
        );
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (!result.canceled) {
      const newImages: AttachedImage[] = result.assets.map((asset) => ({
        uri: asset.uri,
        localId: generateLocalId(),
      }));
      setImages((prev) => [...prev, ...newImages].slice(0, MAX_REVIEW_IMAGES));
    }
  }, [images.length]);

  const handleRemoveImage = useCallback((localId: string) => {
    setImages((prev) => prev.filter((img) => img.localId !== localId));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!isOnline) {
      setFormError(ERR_OFFLINE_ACTION);
      return;
    }
    if (rating === null) return;

    setFormError(null);
    setIsSubmitting(true);

    try {
      // 全画像をアップロードし、1枚でも失敗した場合は投稿しない
      const uploadedUrls: string[] = [];
      for (const img of images) {
        const url = await uploadImage({ localUri: img.uri });
        uploadedUrls.push(url);
      }

      await createReview({
        shopId,
        rating,
        content: content.trim().length > 0 ? content.trim() : null,
        mediaUrls: uploadedUrls,
      });
      router.back();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === ERR_MEDIA_UPLOAD_FAILED || err.message.includes('upload')) {
          setFormError(ERR_MEDIA_UPLOAD_FAILED);
        } else if (isDuplicateReviewError(err)) {
          setFormError(ERR_REVIEW_DUPLICATE);
        } else {
          setFormError(ERR_REVIEW_CREATE_FAILED);
        }
      } else {
        setFormError(ERR_REVIEW_CREATE_FAILED);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isOnline, rating, content, images, createReview, shopId]);

  const handleCancel = useCallback(() => {
    if (!hasInput) {
      router.back();
      return;
    }
    Alert.alert(
      '変更を破棄しますか？',
      '入力した内容が失われます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: '破棄する', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }, [hasInput]);

  const submitLabel = isSubmitting
    ? images.length > 0
      ? '画像をアップロード中...'
      : '送信中...'
    : '投稿する';

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoid}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Pressable
            onPress={handleCancel}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="キャンセル"
            accessibilityState={{ disabled: isSubmitting }}
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.headerButtonText, isSubmitting && styles.headerButtonTextDisabled]}>
              キャンセル
            </Text>
          </Pressable>
          <Text style={styles.headerTitle}>レビューを書く</Text>
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel="投稿する"
            accessibilityState={{ disabled: !canSubmit }}
            style={styles.headerButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={colorActionPrimary}
                accessibilityLabel="送信中"
              />
            ) : (
              <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
                {submitLabel}
              </Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing8 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* フォームエラー */}
          {formError !== null && (
            <View style={styles.formError} accessibilityRole="alert">
              <Text style={styles.formErrorText}>{formError}</Text>
            </View>
          )}

          {/* 対象店舗名 */}
          {shop !== undefined && (
            <View style={styles.shopNameSection}>
              <Text style={styles.shopNameLabel}>対象店舗</Text>
              <Text style={styles.shopNameText}>{shop.name}</Text>
            </View>
          )}

          {/* 星評価選択 */}
          <View style={styles.section}>
            <Text style={styles.label}>
              評価 <Text style={styles.required}>*</Text>
            </Text>
            <StarRatingInput rating={rating} onRatingChange={setRating} />
            {rating === null && (
              <Text style={styles.ratingHint}>評価を選択してください</Text>
            )}
          </View>

          {/* 本文 */}
          <View style={styles.section}>
            <Text style={styles.label}>レビュー本文（任意）</Text>
            <View style={styles.contentInputWrapper}>
              <TextInput
                style={styles.contentInput}
                value={content}
                onChangeText={setContent}
                placeholder="店舗の雰囲気や品揃えなど..."
                placeholderTextColor={colorTextTertiary}
                multiline
                maxLength={MAX_REVIEW_CONTENT_LENGTH}
                textAlignVertical="top"
                accessibilityLabel="レビュー本文"
              />
              <Text style={styles.charCounter}>
                {content.length}/{MAX_REVIEW_CONTENT_LENGTH}
              </Text>
            </View>
          </View>

          {/* 画像添付 */}
          <View style={styles.section}>
            <Text style={styles.label}>{`写真（最大${MAX_REVIEW_IMAGES}枚・任意）`}</Text>
            <ImageAttachmentGrid
              images={images}
              onAdd={() => void handleAddImage()}
              onRemove={handleRemoveImage}
              maxCount={MAX_REVIEW_IMAGES}
              isDisabled={isSubmitting}
            />
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// StarRatingInput
// ---------------------------------------------------------------------------

type StarRatingInputProps = {
  rating: number | null;
  onRatingChange: (value: number) => void;
};

function StarRatingInput({ rating, onRatingChange }: StarRatingInputProps) {
  return (
    <View
      style={styles.starInput}
      accessibilityRole="adjustable"
      accessibilityLabel={rating !== null ? `評価を選択 ${rating} 点 / 5点` : '評価を選択'}
      accessibilityValue={
        rating !== null ? { min: 1, max: 5, now: rating } : { min: 1, max: 5 }
      }
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable
          key={i}
          onPress={() => onRatingChange(i)}
          hitSlop={STAR_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={`${i}点`}
          style={styles.starButton}
        >
          <Text
            style={[
              styles.starChar,
              rating !== null && i <= rating ? styles.starFilled : styles.starEmpty,
            ]}
          >
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colorBackground,
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
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  headerButtonText: {
    ...textBase,
    color: colorTextSecondary,
  },
  headerButtonTextDisabled: {
    color: colorTextTertiary,
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
    color: colorTextTertiary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing6,
  },
  formError: {
    backgroundColor: colorError + '18',
    borderRadius: radiusMd,
    padding: spacing3,
    borderLeftWidth: 3,
    borderLeftColor: colorError,
  },
  formErrorText: {
    ...textSm,
    color: colorError,
  },
  shopNameSection: {
    gap: spacing1,
  },
  shopNameLabel: {
    ...textXs,
    color: colorTextTertiary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shopNameText: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  section: {
    gap: spacing2,
  },
  label: {
    ...textSm,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  required: {
    color: colorError,
  },
  starInput: {
    flexDirection: 'row',
    gap: spacing3,
    paddingVertical: spacing2,
  },
  starButton: {
    width: STAR_SIZE,
    height: STAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starChar: {
    fontSize: STAR_SIZE,
    lineHeight: STAR_SIZE + 4,
  },
  starFilled: {
    color: colorWarning,
  },
  starEmpty: {
    color: colorSurfaceMuted,
  },
  ratingHint: {
    ...textXs,
    color: colorTextTertiary,
  },
  contentInputWrapper: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    minHeight: 120,
  },
  contentInput: {
    ...textBase,
    color: colorTextPrimary,
    minHeight: 100,
  },
  charCounter: {
    ...textXs,
    color: colorTextTertiary,
    textAlign: 'right',
    marginTop: spacing2,
  },
});
