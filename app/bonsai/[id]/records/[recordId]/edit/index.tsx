/**
 * @module app/bonsai/[id]/records/[recordId]/edit/index
 * 成長記録編集フォーム（モーダル表示）。
 * 仕様: docs/design/bonsai.md §5
 *
 * 単一記録の GET エンドポイントが存在しないため、一覧クエリ（useBonsaiRecordsQuery）の
 * キャッシュ済みページから対象記録を探し、見つかるかページが尽きるまで次ページを取得する。
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import {
  useBonsaiRecordsQuery,
  useUpdateBonsaiRecordMutation,
  type BonsaiRecordListResponse,
} from '@/lib/queries/bonsai';
import { uploadImage } from '@/lib/queries/upload';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DatePickerField } from '@/components/common/DatePickerField';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
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
  ERR_BONSAI_RECORD_UPDATE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_MEDIA_UPLOAD_FAILED,
} from '@/lib/constants/errors';
import { MAX_BONSAI_DESCRIPTION_LENGTH } from '@/lib/constants/limits/bonsai';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const RECORD_IMAGES_MAX = 4;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type RecordItem = BonsaiRecordListResponse['items'][number];

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

/**
 * ISO 8601 日時文字列から DatePickerField 用の "YYYY-MM-DD" を取り出す。
 * toApiDateTime が UTC 深夜として保存する規約のため、単純に先頭10文字を取ればよく、
 * ローカルタイムゾーン変換を経由しないため日付のずれが起きない。
 */
function toDateOnlyValue(isoDateTime: string): string {
  return isoDateTime.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Route shell — 一覧クエリのキャッシュから対象記録を探してから FormBody をマウントする
// ---------------------------------------------------------------------------

export default function BonsaiRecordEditScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];
  const rawRecordId = params['recordId'];
  const bonsaiId = typeof rawId === 'string' ? rawId : '';
  const recordId = typeof rawRecordId === 'string' ? rawRecordId : '';

  const {
    data: recordsData,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useBonsaiRecordsQuery(bonsaiId);

  const allRecords: RecordItem[] = recordsData?.pages.flatMap((page) => page.items) ?? [];
  const record = allRecords.find((item) => item.id === recordId);

  useEffect(() => {
    if (record === undefined && hasNextPage && !isFetchingNextPage && !isLoading && !isError) {
      void fetchNextPage();
    }
  }, [record, hasNextPage, isFetchingNextPage, isLoading, isError, fetchNextPage]);

  const isSearching =
    record === undefined &&
    !isError &&
    (isLoading || isFetchingNextPage || hasNextPage === true);

  if (isSearching) {
    return <ScreenLoading variant="spinner" />;
  }

  if (isError || record === undefined) {
    return (
      <View style={styles.container}>
        <ScreenError title="読み込めませんでした" onRetry={() => void refetch()} />
      </View>
    );
  }

  return <FormBody bonsaiId={bonsaiId} recordId={recordId} record={record} />;
}

// ---------------------------------------------------------------------------
// FormBody — record が確定した後にマウントされるため useEffect 不要
// ---------------------------------------------------------------------------

type FormBodyProps = {
  bonsaiId: string;
  recordId: string;
  record: RecordItem;
};

function FormBody({ bonsaiId, recordId, record }: FormBodyProps) {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { mutate: updateRecord, isPending: isSaving } = useUpdateBonsaiRecordMutation();

  const [content, setContent] = useState(record.content ?? '');
  const [recordAt, setRecordAt] = useState<string | null>(toDateOnlyValue(record.recordAt));
  const [images, setImages] = useState<AttachedImage[]>(
    record.images.map((img) => ({ uri: img.url, localId: img.url }))
  );
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
    Alert.alert(
      '変更を破棄しますか？',
      '保存されていない変更は失われます。',
      [
        { text: '編集を続ける', style: 'cancel' },
        { text: '破棄する', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }

    setError(null);
    setIsUploading(true);

    const mediaUrls: string[] = [];
    try {
      for (const img of images) {
        // 既存画像（http(s)://）はそのまま、ローカル URI のみアップロード
        if (img.uri.startsWith('http')) {
          mediaUrls.push(img.uri);
        } else {
          const url = await uploadImage({ localUri: img.uri });
          mediaUrls.push(url);
        }
      }
    } catch {
      setError(ERR_MEDIA_UPLOAD_FAILED);
      setIsUploading(false);
      return;
    }
    setIsUploading(false);

    updateRecord(
      {
        bonsaiId,
        recordId,
        content: content.trim().length > 0 ? content.trim() : undefined,
        recordAt: recordAt !== null ? toApiDateTime(recordAt) : undefined,
        mediaUrls,
      },
      {
        onSuccess: () => router.back(),
        onError: () => setError(ERR_BONSAI_RECORD_UPDATE_FAILED),
      }
    );
  }, [isOnline, images, content, recordAt, bonsaiId, recordId, updateRecord]);

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
        <Text style={styles.headerTitle}>記録を編集</Text>
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
});
