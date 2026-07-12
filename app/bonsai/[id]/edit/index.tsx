/**
 * @module app/bonsai/[id]/edit/index
 * 盆栽編集フォーム（モーダル表示）。
 * 仕様: docs/design/bonsai.md §4
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBonsaiDetailQuery, useUpdateBonsaiMutation } from '@/lib/queries/bonsai';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DatePickerField } from '@/components/common/DatePickerField';
import { TreeSpeciesField } from '@/components/bonsai/TreeSpeciesField';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import { ScreenLoading } from '@/components/common/ScreenLoading';
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
  ERR_BONSAI_UPDATE_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BONSAI_NAME_MAX = 100;
const BONSAI_DESCRIPTION_MAX = 500;
const INPUT_HEIGHT = 48;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * DatePickerField の "YYYY-MM-DD" 値をサーバー API が要求する ISO 8601 日時文字列に変換する。
 * Web の `new Date(acquiredAtRaw)`（date-only 文字列は UTC 深夜として解釈される仕様）と
 * 同じ変換結果になるため、Web と同一のサーバー保存値になる。
 */
function toApiDateTime(dateOnly: string): string {
  return new Date(dateOnly).toISOString();
}

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type BonsaiForEdit = {
  name?: string | null;
  species?: string | null;
  acquiredAt?: string | null;
  description?: string | null;
};

// ---------------------------------------------------------------------------
// Route shell — データ取得後に FormBody を初期値付きでマウントする
// ---------------------------------------------------------------------------

export default function BonsaiEditScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];
  const id = typeof rawId === 'string' ? rawId : '';

  const { data: bonsai, isLoading } = useBonsaiDetailQuery(id);

  if (isLoading || bonsai === undefined) {
    return <ScreenLoading variant="spinner" />;
  }

  return <FormBody id={id} bonsai={bonsai as unknown as BonsaiForEdit} />;
}

// ---------------------------------------------------------------------------
// FormBody — bonsai が確定した後にマウントされるため useEffect 不要
// ---------------------------------------------------------------------------

type FormBodyProps = {
  id: string;
  bonsai: BonsaiForEdit;
};

function FormBody({ id, bonsai }: FormBodyProps) {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { mutate: updateBonsai, isPending } = useUpdateBonsaiMutation();

  const [name, setName] = useState(bonsai.name ?? '');
  const [species, setSpecies] = useState(bonsai.species ?? '');
  const [acquiredAt, setAcquiredAt] = useState<string | null>(bonsai.acquiredAt ?? null);
  const [description, setDescription] = useState(bonsai.description ?? '');
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    name.trim() !== (bonsai.name ?? '') ||
    species.trim() !== (bonsai.species ?? '') ||
    acquiredAt !== (bonsai.acquiredAt ?? null) ||
    description.trim() !== (bonsai.description ?? '');

  const isNameValid = name.trim().length > 0 && name.length <= BONSAI_NAME_MAX;
  const canSubmit = isNameValid && isDirty && !isPending;

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

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!isNameValid) return;

    setError(null);
    updateBonsai(
      {
        id,
        name: name.trim(),
        species: species.trim().length > 0 ? species.trim() : undefined,
        acquiredAt: acquiredAt !== null ? toApiDateTime(acquiredAt) : null,
        description: description.trim().length > 0 ? description.trim() : undefined,
      },
      {
        onSuccess: () => router.back(),
        onError: () => setError(ERR_BONSAI_UPDATE_FAILED),
      }
    );
  }, [isOnline, isNameValid, id, name, species, acquiredAt, description, updateBonsai]);

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
        <Text style={styles.headerTitle}>盆栽を編集</Text>
        <Pressable
          onPress={handleSave}
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

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>盆栽名 ＊</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={BONSAI_NAME_MAX}
              placeholder="例: 五葉松"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="盆栽名（必須）"
            />
            <Text style={styles.counter}>{name.length}/{BONSAI_NAME_MAX}</Text>
          </View>

          <View style={styles.fieldGroup}>
            <TreeSpeciesField
              value={species}
              onChange={setSpecies}
              disabled={isPending}
            />
          </View>

          <View style={styles.fieldGroup}>
            <DatePickerField
              label="取得日（任意）"
              value={acquiredAt}
              onChange={setAcquiredAt}
              disabled={isPending}
              clearAccessibilityLabel="取得日を削除"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>説明（任意）</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={BONSAI_DESCRIPTION_MAX}
              placeholder="盆栽のエピソードや特徴など..."
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={4}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="説明（任意）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{description.length}/{BONSAI_DESCRIPTION_MAX}</Text>
          </View>
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
  textInput: {
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
  },
  textAreaInput: {
    minHeight: INPUT_HEIGHT * 3,
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
