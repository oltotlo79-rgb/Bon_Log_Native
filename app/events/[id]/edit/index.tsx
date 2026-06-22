/**
 * @module app/events/[id]/edit/index
 * イベント編集フォーム（モーダル表示）。作成者のみアクセス可。
 * 仕様: docs/design/events.md §4
 */

import React, { useReducer, useState, useCallback, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventDetailQuery, useUpdateEventMutation } from '@/lib/queries/events';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { DateField } from '@/components/bonsai/DateField';
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
  ERR_EVENT_UPDATE_FAILED,
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
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

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
// Reducer
// ---------------------------------------------------------------------------

type FormState = {
  title: string;
  startDate: string | null;
  endDate: string | null;
  venue: string;
  prefecture: string;
  region: string;
  isFree: boolean;
  admissionFee: string;
  description: string;
  externalUrl: string;
  initialized: boolean;
};

type FormAction =
  | { type: 'INIT'; payload: NonNullable<ReturnType<typeof useEventDetailQuery>['data']> }
  | { type: 'SET_TITLE'; value: string }
  | { type: 'SET_START_DATE'; value: string | null }
  | { type: 'SET_END_DATE'; value: string | null }
  | { type: 'SET_VENUE'; value: string }
  | { type: 'SET_PREFECTURE'; value: string }
  | { type: 'SET_REGION'; value: string }
  | { type: 'SET_IS_FREE'; value: boolean }
  | { type: 'SET_ADMISSION_FEE'; value: string }
  | { type: 'SET_DESCRIPTION'; value: string }
  | { type: 'SET_EXTERNAL_URL'; value: string };

const INITIAL_FORM_STATE: FormState = {
  title: '',
  startDate: null,
  endDate: null,
  venue: '',
  prefecture: '',
  region: '',
  isFree: false,
  admissionFee: '',
  description: '',
  externalUrl: '',
  initialized: false,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'INIT': {
      const fee = action.payload.admissionFee ?? '';
      return {
        title: action.payload.title,
        startDate: action.payload.startDate,
        endDate: action.payload.endDate ?? null,
        venue: action.payload.venue ?? '',
        prefecture: action.payload.prefecture ?? '',
        region: action.payload.city ?? '',
        isFree: fee === '無料' || fee.length === 0,
        admissionFee: fee === '無料' ? '' : fee,
        description: action.payload.description ?? '',
        externalUrl: action.payload.externalUrl ?? '',
        initialized: true,
      };
    }
    case 'SET_TITLE': return { ...state, title: action.value };
    case 'SET_START_DATE': return { ...state, startDate: action.value };
    case 'SET_END_DATE': return { ...state, endDate: action.value };
    case 'SET_VENUE': return { ...state, venue: action.value };
    case 'SET_PREFECTURE': return { ...state, prefecture: action.value };
    case 'SET_REGION': return { ...state, region: action.value };
    case 'SET_IS_FREE': return { ...state, isFree: action.value };
    case 'SET_ADMISSION_FEE': return { ...state, admissionFee: action.value };
    case 'SET_DESCRIPTION': return { ...state, description: action.value };
    case 'SET_EXTERNAL_URL': return { ...state, externalUrl: action.value };
    default: return state;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventEditScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = getIdParam(params);

  const { data: event, isLoading } = useEventDetailQuery(eventId);
  const { mutate: updateEvent, isPending } = useUpdateEventMutation();

  const [form, dispatch] = useReducer(formReducer, INITIAL_FORM_STATE);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (event !== undefined && !form.initialized) {
      dispatch({ type: 'INIT', payload: event });
    }
  }, [event, form.initialized]);

  const { title, startDate, endDate, venue, prefecture, region, isFree, admissionFee, description, externalUrl, initialized } = form;

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

  const hasChanges = initialized && event !== undefined && (
    title !== event.title ||
    startDate !== event.startDate ||
    endDate !== (event.endDate ?? null) ||
    venue !== (event.venue ?? '') ||
    prefecture !== (event.prefecture ?? '') ||
    region !== (event.city ?? '') ||
    description !== (event.description ?? '') ||
    externalUrl !== (event.externalUrl ?? '')
  );

  const handleCancel = useCallback(() => {
    if (hasChanges) {
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
  }, [hasChanges]);

  const handleSave = useCallback(() => {
    if (!isOnline) {
      setError(ERR_OFFLINE_ACTION);
      return;
    }
    if (!canSubmit || startDate === null) return;

    setError(null);
    updateEvent(
      {
        id: eventId,
        title: title.trim(),
        startDate,
        endDate: endDate ?? null,
        venue: venue.trim().length > 0 ? venue.trim() : null,
        prefecture: prefecture.trim().length > 0 ? prefecture.trim() : null,
        city: region.trim().length > 0 ? region.trim() : null,
        admissionFee: isFree ? '無料' : admissionFee.trim().length > 0 ? admissionFee.trim() : null,
        description: description.trim().length > 0 ? description.trim() : null,
        externalUrl: externalUrl.trim().length > 0 ? externalUrl.trim() : null,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          setError(ERR_EVENT_UPDATE_FAILED);
        },
      }
    );
  }, [
    isOnline, canSubmit, eventId, startDate, title, endDate, venue, prefecture, region,
    isFree, admissionFee, description, externalUrl, updateEvent,
  ]);

  if (isLoading || !initialized) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.headerButton} accessibilityRole="button" accessibilityLabel="キャンセル">
            <Text style={styles.headerCancelText}>キャンセル</Text>
          </Pressable>
          <Text style={styles.headerTitle}>イベントを編集</Text>
          <View style={styles.headerButton} />
        </View>
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>イベントを編集</Text>
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

          {/* タイトル */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>イベント名 ＊</Text>
            <TextInput
              value={title}
              onChangeText={(v) => dispatch({ type: 'SET_TITLE', value: v })}
              maxLength={TITLE_MAX}
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
              onChange={(v) => dispatch({ type: 'SET_START_DATE', value: v })}
              disabled={isPending}
              clearAccessibilityLabel="開催日を削除"
            />
          </View>

          {/* 終了日 */}
          <View style={styles.fieldGroup}>
            <DateField
              label="終了日（任意）"
              value={endDate}
              onChange={(v) => dispatch({ type: 'SET_END_DATE', value: v })}
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
              onChangeText={(v) => dispatch({ type: 'SET_VENUE', value: v })}
              maxLength={VENUE_MAX}
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
              onChangeText={(v) => dispatch({ type: 'SET_PREFECTURE', value: v })}
              maxLength={PREFECTURE_MAX}
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
              onChangeText={(v) => dispatch({ type: 'SET_REGION', value: v })}
              maxLength={REGION_MAX}
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
                onValueChange={(v) => dispatch({ type: 'SET_IS_FREE', value: v })}
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
                onChangeText={(v) => dispatch({ type: 'SET_ADMISSION_FEE', value: v })}
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
              onChangeText={(v) => dispatch({ type: 'SET_DESCRIPTION', value: v })}
              maxLength={DESCRIPTION_MAX}
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
              onChangeText={(v) => dispatch({ type: 'SET_EXTERNAL_URL', value: v })}
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
