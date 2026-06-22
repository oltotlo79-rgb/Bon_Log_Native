/**
 * @module app/bonsai/new/index
 * 盆栽新規登録フォーム（モーダル表示）。
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
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateBonsaiMutation } from '@/lib/queries/bonsai';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DateField } from '@/components/bonsai/DateField';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
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
  ERR_BONSAI_CREATE_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const BONSAI_NAME_MAX = 100;
const BONSAI_DESCRIPTION_MAX = 500;
const INPUT_HEIGHT = 48;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BonsaiNewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { mutate: createBonsai, isPending } = useCreateBonsaiMutation();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [acquiredAt, setAcquiredAt] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasInput = name.trim().length > 0;
  const isNameValid = name.trim().length > 0 && name.length <= BONSAI_NAME_MAX;
  const canSubmit = isNameValid && !isPending;

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

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!isNameValid) return;

    setError(null);
    createBonsai(
      {
        name: name.trim(),
        species: species.trim().length > 0 ? species.trim() : undefined,
        acquiredAt: acquiredAt ?? undefined,
        description: description.trim().length > 0 ? description.trim() : undefined,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          setError(ERR_BONSAI_CREATE_FAILED);
        },
      }
    );
  }, [isOnline, isNameValid, createBonsai, name, species, acquiredAt, description]);

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
        <Text style={styles.headerTitle}>盆栽を登録</Text>
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

          {/* 盆栽名 */}
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

          {/* 樹種 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>樹種（任意）</Text>
            <TextInput
              value={species}
              onChangeText={setSpecies}
              maxLength={BONSAI_NAME_MAX}
              placeholder="例: 五葉松・黒松..."
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="樹種（任意）"
            />
          </View>

          {/* 取得日 */}
          <View style={styles.fieldGroup}>
            <DateField
              label="取得日（任意）"
              value={acquiredAt}
              onChange={setAcquiredAt}
              disabled={isPending}
              clearAccessibilityLabel="取得日を削除"
            />
          </View>

          {/* 説明 */}
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
