/**
 * @module app/events/new/index
 * イベント新規作成フォーム（モーダル表示）。
 * 仕様: docs/design/events.md §4
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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateEventMutation } from '@/lib/queries/events';
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
  ERR_EVENT_CREATE_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const TITLE_MAX = 200;
const VENUE_MAX = 200;
const PREFECTURE_MAX = 50;
const REGION_MAX = 50;
const DESCRIPTION_MAX = 2000;
const INPUT_HEIGHT = 48;

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function isValidUrl(url: string): boolean {
  if (url.length === 0) return true;
  return url.startsWith('https://') || url.startsWith('http://');
}

function isValidDate(date: string | null): boolean {
  if (date === null) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
}

function isEndDateAfterStart(startDate: string | null, endDate: string | null): boolean {
  if (endDate === null) return true;
  if (startDate === null) return false;
  return new Date(endDate) >= new Date(startDate);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventNewScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { mutate: createEvent, isPending } = useCreateEventMutation();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [venue, setVenue] = useState('');
  const [prefecture, setPrefecture] = useState('');
  const [region, setRegion] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [admissionFee, setAdmissionFee] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasInput = title.trim().length > 0 || startDate !== null;

  const isTitleValid = title.trim().length > 0 && title.length <= TITLE_MAX;
  const isStartDateValid = isValidDate(startDate);
  const isEndDateValid = isEndDateAfterStart(startDate, endDate);
  const isUrlValid = isValidUrl(externalUrl.trim());

  const canSubmit =
    isTitleValid &&
    isStartDateValid &&
    isEndDateValid &&
    isUrlValid &&
    !isPending;

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
    if (!canSubmit || startDate === null) return;

    setError(null);
    createEvent(
      {
        title: title.trim(),
        startDate,
        endDate: endDate ?? null,
        venue: venue.trim().length > 0 ? venue.trim() : null,
        prefecture: prefecture.trim().length > 0 ? prefecture.trim() : null,
        city: region.trim().length > 0 ? region.trim() : null,
        admissionFee: isFree ? '無料' : admissionFee.trim().length > 0 ? admissionFee.trim() : null,
        hasSales: false,
        description: description.trim().length > 0 ? description.trim() : null,
        externalUrl: externalUrl.trim().length > 0 ? externalUrl.trim() : null,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          setError(ERR_EVENT_CREATE_FAILED);
        },
      }
    );
  }, [
    isOnline, canSubmit, startDate, title, endDate, venue, prefecture, region,
    isFree, admissionFee, description, externalUrl, createEvent,
  ]);

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
        <Text style={styles.headerTitle}>イベントを作成</Text>
        <Pressable
          onPress={handleSave}
          disabled={!canSubmit}
          accessibilityRole="button"
          accessibilityLabel="投稿する"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.headerSaveText, !canSubmit && styles.headerSaveTextDisabled]}>
            投稿する
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

          {/* タイトル */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>イベント名 ＊</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX}
              placeholder="例: 盆栽展示会"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="イベント名（必須）"
            />
            <Text style={styles.counter}>{title.length}/{TITLE_MAX}</Text>
          </View>

          {/* 開催日 */}
          <View style={styles.fieldGroup}>
            <DateField
              label="開催日 ＊"
              value={startDate}
              onChange={setStartDate}
              disabled={isPending}
              clearAccessibilityLabel="開催日を削除"
            />
          </View>

          {/* 終了日 */}
          <View style={styles.fieldGroup}>
            <DateField
              label="終了日（任意）"
              value={endDate}
              onChange={setEndDate}
              disabled={isPending}
              clearAccessibilityLabel="終了日を削除"
            />
            {endDate !== null && !isEndDateValid && (
              <Text style={styles.fieldError}>終了日は開催日以降の日付を入力してください。</Text>
            )}
          </View>

          {/* 会場名 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>会場名（任意）</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              maxLength={VENUE_MAX}
              placeholder="例: ○○文化センター"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="会場名（任意）"
            />
          </View>

          {/* 都道府県 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>都道府県（任意）</Text>
            <TextInput
              value={prefecture}
              onChangeText={setPrefecture}
              maxLength={PREFECTURE_MAX}
              placeholder="例: 東京都"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="都道府県（任意）"
            />
          </View>

          {/* 地域 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>地域（任意）</Text>
            <TextInput
              value={region}
              onChangeText={setRegion}
              maxLength={REGION_MAX}
              placeholder="例: 関東"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="地域（任意）"
            />
          </View>

          {/* 入場料 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>入場料（任意）</Text>
            <View style={styles.switchRow}>
              <Switch
                value={isFree}
                onValueChange={setIsFree}
                disabled={isPending}
                accessibilityRole="switch"
                accessibilityLabel="無料イベント"
                accessibilityState={{ checked: isFree }}
              />
              <Text style={styles.switchLabel}>無料</Text>
            </View>
            {!isFree && (
              <TextInput
                value={admissionFee}
                onChangeText={setAdmissionFee}
                placeholder="例: 500円"
                placeholderTextColor={colorTextTertiary}
                editable={!isPending}
                style={[styles.textInput, isPending && styles.inputDisabled]}
                accessibilityLabel="入場料金額（任意）"
              />
            )}
          </View>

          {/* 説明 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>説明（任意）</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={DESCRIPTION_MAX}
              placeholder="イベントの詳細や参加方法など..."
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={4}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="説明（任意）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{description.length}/{DESCRIPTION_MAX}</Text>
          </View>

          {/* 外部URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>詳細ページ URL（任意）</Text>
            <TextInput
              value={externalUrl}
              onChangeText={setExternalUrl}
              placeholder="https://example.com"
              placeholderTextColor={colorTextTertiary}
              keyboardType="url"
              autoCapitalize="none"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="詳細ページ URL（任意）"
            />
            {externalUrl.trim().length > 0 && !isUrlValid && (
              <Text style={styles.fieldError}>URLは https:// または http:// から始めてください。</Text>
            )}
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
  fieldError: {
    ...textSm,
    color: '#c0392b',
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    minHeight: 44,
  },
  switchLabel: {
    ...textBase,
    color: colorTextPrimary,
  },
  counter: {
    ...textSm,
    color: colorTextTertiary,
    textAlign: 'right',
  },
});
