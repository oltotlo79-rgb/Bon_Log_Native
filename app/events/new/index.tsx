/**
 * @module app/events/new/index
 * イベント新規作成フォーム（モーダル表示）。
 * 仕様: docs/design/events.md §4（都道府県必須化・主催者・即売あり・日時ピッカーは Web 準拠の追加差分）
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCreateEventMutation } from '@/lib/queries/events';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DateTimeField } from '@/components/common/DateTimeField';
import { EventPrefecturePickerModal } from '@/components/events/EventPrefecturePickerModal';
import { FormErrorMessage } from '@/components/auth/FormErrorMessage';
import type { PrefectureName } from '@/lib/constants/prefectures';
import {
  MAX_EVENT_TITLE_LENGTH,
  MAX_EVENT_DESCRIPTION_LENGTH,
  MAX_EVENT_CITY_LENGTH,
  MAX_EVENT_VENUE_LENGTH,
  MAX_EVENT_ORGANIZER_LENGTH,
  MAX_EVENT_ADMISSION_FEE_LENGTH,
  MAX_EVENT_EXTERNAL_URL_LENGTH,
} from '@/lib/constants/limits/event';
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
  ERR_EVENT_END_DATE_BEFORE_START,
  ERR_URL_INVALID_PROTOCOL,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

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
  const [prefecture, setPrefecture] = useState<PrefectureName | null>(null);
  const [isPrefModalVisible, setIsPrefModalVisible] = useState(false);
  const [city, setCity] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [admissionFee, setAdmissionFee] = useState('');
  const [hasSales, setHasSales] = useState(false);
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const hasInput = title.trim().length > 0 || startDate !== null || prefecture !== null;

  const isTitleValid = title.trim().length > 0 && title.length <= MAX_EVENT_TITLE_LENGTH;
  const isStartDateValid = isValidDate(startDate);
  const isEndDateValid = isEndDateAfterStart(startDate, endDate);
  const isPrefectureValid = prefecture !== null;
  const isUrlValid = isValidUrl(externalUrl.trim());

  const canSubmit =
    isTitleValid &&
    isStartDateValid &&
    isEndDateValid &&
    isPrefectureValid &&
    isUrlValid &&
    !isPending;

  const handleOpenPrefModal = useCallback(() => {
    if (isPending) return;
    setIsPrefModalVisible(true);
  }, [isPending]);

  const handleClosePrefModal = useCallback(() => {
    setIsPrefModalVisible(false);
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

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!canSubmit || startDate === null || prefecture === null) return;

    setError(null);
    createEvent(
      {
        title: title.trim(),
        startDate,
        endDate: endDate ?? null,
        prefecture,
        city: city.trim().length > 0 ? city.trim() : null,
        venue: venue.trim().length > 0 ? venue.trim() : null,
        organizer: organizer.trim().length > 0 ? organizer.trim() : null,
        admissionFee: isFree ? '無料' : admissionFee.trim().length > 0 ? admissionFee.trim() : null,
        hasSales,
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
    isOnline, canSubmit, startDate, prefecture, title, endDate, city, venue, organizer,
    isFree, admissionFee, hasSales, description, externalUrl, createEvent,
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
              maxLength={MAX_EVENT_TITLE_LENGTH}
              placeholder="例: 盆栽展示会"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="イベント名（必須）"
            />
            <Text style={styles.counter}>{title.length}/{MAX_EVENT_TITLE_LENGTH}</Text>
          </View>

          {/* 開始日時 */}
          <View style={styles.fieldGroup}>
            <DateTimeField
              label="開始日時 ＊"
              value={startDate}
              onChange={setStartDate}
              disabled={isPending}
              clearAccessibilityLabel="開始日時を削除"
            />
          </View>

          {/* 終了日時 */}
          <View style={styles.fieldGroup}>
            <DateTimeField
              label="終了日時（任意）"
              value={endDate}
              onChange={setEndDate}
              disabled={isPending}
              minimumDate={startDate !== null ? new Date(startDate) : undefined}
              clearAccessibilityLabel="終了日時を削除"
            />
            {endDate !== null && !isEndDateValid && (
              <Text style={styles.fieldError}>{ERR_EVENT_END_DATE_BEFORE_START}</Text>
            )}
          </View>

          {/* 都道府県 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>都道府県 ＊</Text>
            <Pressable
              style={[styles.selectField, isPending && styles.inputDisabled]}
              onPress={handleOpenPrefModal}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel={
                prefecture !== null ? `都道府県（必須）：${prefecture}` : '都道府県（必須）'
              }
              accessibilityState={{ disabled: isPending }}
            >
              <Text
                style={[styles.selectFieldText, prefecture === null && styles.placeholderText]}
                numberOfLines={1}
              >
                {prefecture ?? '都道府県を選択してください'}
              </Text>
              <Ionicons
                name="chevron-down"
                size={18}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          </View>

          {/* 市区町村 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>市区町村（任意）</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              maxLength={MAX_EVENT_CITY_LENGTH}
              placeholder="例: さいたま市大宮区"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="市区町村（任意）"
            />
          </View>

          {/* 会場名 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>会場名（任意）</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              maxLength={MAX_EVENT_VENUE_LENGTH}
              placeholder="例: ○○文化センター"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="会場名（任意）"
            />
          </View>

          {/* 主催者 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>主催者（任意）</Text>
            <TextInput
              value={organizer}
              onChangeText={setOrganizer}
              maxLength={MAX_EVENT_ORGANIZER_LENGTH}
              placeholder="例: 全日本盆栽協会"
              placeholderTextColor={colorTextTertiary}
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="主催者（任意）"
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
                maxLength={MAX_EVENT_ADMISSION_FEE_LENGTH}
                placeholder="例: 500円"
                placeholderTextColor={colorTextTertiary}
                editable={!isPending}
                style={[styles.textInput, isPending && styles.inputDisabled]}
                accessibilityLabel="入場料金額（任意）"
              />
            )}
          </View>

          {/* 即売あり */}
          <View style={styles.fieldGroup}>
            <View style={styles.switchRow}>
              <Switch
                value={hasSales}
                onValueChange={setHasSales}
                disabled={isPending}
                accessibilityRole="switch"
                accessibilityLabel="即売あり"
                accessibilityState={{ checked: hasSales }}
              />
              <Text style={styles.switchLabel}>即売あり</Text>
            </View>
          </View>

          {/* 説明 */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>説明（任意）</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              maxLength={MAX_EVENT_DESCRIPTION_LENGTH}
              placeholder="イベントの詳細や参加方法など..."
              placeholderTextColor={colorTextTertiary}
              multiline
              numberOfLines={4}
              editable={!isPending}
              style={[styles.textAreaInput, isPending && styles.inputDisabled]}
              accessibilityLabel="説明（任意）"
              textAlignVertical="top"
            />
            <Text style={styles.counter}>{description.length}/{MAX_EVENT_DESCRIPTION_LENGTH}</Text>
          </View>

          {/* 外部URL */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>詳細ページ URL（任意）</Text>
            <TextInput
              value={externalUrl}
              onChangeText={setExternalUrl}
              maxLength={MAX_EVENT_EXTERNAL_URL_LENGTH}
              placeholder="https://example.com"
              placeholderTextColor={colorTextTertiary}
              keyboardType="url"
              autoCapitalize="none"
              editable={!isPending}
              style={[styles.textInput, isPending && styles.inputDisabled]}
              accessibilityLabel="詳細ページ URL（任意）"
            />
            {externalUrl.trim().length > 0 && !isUrlValid && (
              <Text style={styles.fieldError}>{ERR_URL_INVALID_PROTOCOL}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <EventPrefecturePickerModal
        visible={isPrefModalVisible}
        selectedPrefecture={prefecture}
        onSelect={setPrefecture}
        onClose={handleClosePrefModal}
      />
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
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
  },
  selectFieldText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colorTextTertiary,
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
