/**
 * @module app/bonsai/[id]/records/new/index
 * 成長記録追加フォーム（モーダル表示）。
 * 仕様: docs/design/bonsai.md §5
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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateBonsaiRecordMutation } from '@/lib/queries/bonsai';
import { uploadImage } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DatePickerField } from '@/components/common/DatePickerField';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ImageAttachmentGrid } from '@/components/post/ImageAttachmentGrid';
import type { AttachedImage } from '@/components/post/ImageAttachmentGrid';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorder,
  colorBorderLight,
  colorActionPrimary,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  textBase,
  textSm,
  textLg,
} from '@/lib/constants/design-tokens';
import {
  ERR_BONSAI_RECORD_CREATE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_MEDIA_UPLOAD_FAILED,
} from '@/lib/constants/errors';
import { MAX_BONSAI_DESCRIPTION_LENGTH } from '@/lib/constants/limits/bonsai';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const RECORD_IMAGES_MAX = 4;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * DatePickerField の "YYYY-MM-DD" 値をサーバー API が要求する ISO 8601 日時文字列に変換する。
 * Web の `new Date(dateOnly)`（date-only 文字列は UTC 深夜として解釈される仕様）と
 * 同じ変換結果になる。
 */
function toApiDateTime(dateOnly: string): string {
  return new Date(dateOnly).toISOString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BonsaiRecordNewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const params = useLocalSearchParams();
  const rawId = params['id'];
  const bonsaiId = typeof rawId === 'string' ? rawId : '';

  const { mutate: createRecord, isPending: isSaving } = useCreateBonsaiRecordMutation();

  const [content, setContent] = useState('');
  const [recordAt, setRecordAt] = useState<string | null>(null);
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const isPending = isSaving || isUploading;

  const hasInput = content.trim().length > 0 || images.length > 0;
  const canSubmit = hasInput && !isPending;

  const handleAddImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    if (asset === undefined) return;
    const localId = `${Date.now()}-${Math.random()}`;
    setImages((prev) => [...prev, { uri: asset.uri, localId }]);
  }, []);

  const handleRemoveImage = useCallback((localId: string) => {
    setImages((prev) => prev.filter((img) => img.localId !== localId));
  }, []);

  const handleCancel = useCallback(() => {
    if (hasInput) {
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
  }, [hasInput]);

  const handleSave = useCallback(async () => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!hasInput) return;

    setError(null);
    setIsUploading(true);

    let mediaUrls: string[] = [];
    try {
      mediaUrls = await Promise.all(
        images.map((img) => uploadImage({ localUri: img.uri }))
      );
    } catch {
      setError(ERR_MEDIA_UPLOAD_FAILED);
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    createRecord(
      {
        bonsaiId,
        content: content.trim().length > 0 ? content.trim() : undefined,
        recordAt: recordAt !== null ? toApiDateTime(recordAt) : new Date().toISOString(),
        mediaUrls,
      },
      {
        onSuccess: () => router.back(),
        onError: () => setError(ERR_BONSAI_RECORD_CREATE_FAILED),
      }
    );
  }, [isOnline, hasInput, images, content, recordAt, bonsaiId, createRecord]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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
        <Text style={styles.headerTitle}>記録を追加</Text>
        <Pressable
          onPress={() => { void handleSave(); }}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="保存する"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
            保存する
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing6 }]}
          keyboardShouldPersistTaps="handled"
        >
          <FormErrorMessage message={error} />

          {/* 記録日 */}
          <View style={styles.fieldGroup}>
            <DatePickerField
              label="記録日（任意）"
              value={recordAt}
              onChange={setRecordAt}
              disabled={isPending}
              clearAccessibilityLabel="記録日を削除"
            />
            <Text style={styles.hint}>空の場合は保存時の現在日時を使用します。</Text>
          </View>

          {/* 記録内容 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>記録内容（任意）</Text>
            <TextInput
              value={content}
              onChangeText={setContent}
              maxLength={MAX_BONSAI_DESCRIPTION_LENGTH}
              placeholder="今日は植え替えを行いました..."
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={5}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="記録内容（任意）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{content.length}/{MAX_BONSAI_DESCRIPTION_LENGTH}</Text>
          </View>

          {/* 画像 */}
          <ImageAttachmentGrid
            images={images}
            onAdd={() => { void handleAddImage(); }}
            onRemove={handleRemoveImage}
            maxCount={RECORD_IMAGES_MAX}
            isDisabled={isPending}
          />
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
  fieldLabel: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  textAreaInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
  },
  inputDisabled: {
    backgroundColor: colorSurfaceMuted,
    opacity: 0.7,
  },
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
  hint: {
    ...textSm,
    color: colorTextTertiary,
  },
});
