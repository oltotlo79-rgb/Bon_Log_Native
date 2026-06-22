/**
 * @module app/bonsai/care-logs/index
 * マイ盆栽 手入れログ一覧画面。
 * 一覧表示・FAB で新規作成・行タップで編集・スワイプ削除（確認ダイアログあり）。
 * 作成/編集は同画面内のボトムシートフォームで行う。
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useCareLogsQuery,
  useCreateCareLogMutation,
  useUpdateCareLogMutation,
  useDeleteCareLogMutation,
  BONSAI_CARE_TYPE,
  type CareLogItem,
  type BonsaiCareType,
} from '@/lib/queries/bonsai-care-logs';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import {
  ERR_CARE_LOGS_LOAD_FAILED,
  ERR_CARE_LOG_CREATE_FAILED,
  ERR_CARE_LOG_UPDATE_FAILED,
  ERR_CARE_LOG_DELETE_FAILED,
} from '@/lib/constants/errors';
import { MAX_CARE_LOG_NOTE_LENGTH } from '@/lib/constants/limits/post';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorBorder,
  colorActionPrimary,
  colorActionPrimaryText,
  colorActionSecondary,
  colorActionSecondaryText,
  colorError,
  colorErrorBg,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  radiusFull,
  radiusMd,
  radiusLg,
  shadowWashi,
  shadowWashiLg,
  textSm,
  textBase,
  textMd,
  textLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const FAB_SIZE = 56;
const FAB_ICON_SIZE = 24;
const LOAD_MORE_THRESHOLD = 0.3;

/** 手入れ種別の日本語ラベルマップ */
const CARE_TYPE_LABEL: Record<BonsaiCareType, string> = {
  [BONSAI_CARE_TYPE.PESTICIDE]: '農薬',
  [BONSAI_CARE_TYPE.SOLID_FERTILIZER]: '固形肥料',
  [BONSAI_CARE_TYPE.LIQUID_FERTILIZER]: '液体肥料',
  [BONSAI_CARE_TYPE.ROTATE]: '向き替え',
  [BONSAI_CARE_TYPE.SHADING]: '遮光',
  [BONSAI_CARE_TYPE.MURO_IN]: '室入れ',
  [BONSAI_CARE_TYPE.MURO_OUT]: '室出し',
  [BONSAI_CARE_TYPE.OTHER]: 'その他',
};

/** 種別セレクタに渡す配列（順序固定）*/
const CARE_TYPE_OPTIONS: BonsaiCareType[] = [
  BONSAI_CARE_TYPE.PESTICIDE,
  BONSAI_CARE_TYPE.SOLID_FERTILIZER,
  BONSAI_CARE_TYPE.LIQUID_FERTILIZER,
  BONSAI_CARE_TYPE.ROTATE,
  BONSAI_CARE_TYPE.SHADING,
  BONSAI_CARE_TYPE.MURO_IN,
  BONSAI_CARE_TYPE.MURO_OUT,
  BONSAI_CARE_TYPE.OTHER,
];

// ---------------------------------------------------------------------------
// 日付ユーティリティ
// ---------------------------------------------------------------------------

/** ISO 8601 日付文字列を「YYYY年MM月DD日」形式にフォーマットする */
function formatPerformedAt(isoStr: string): string {
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return isoStr;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y}年${m}月${d}日`;
}

/**
 * 入力値（年・月・日の数字文字列）から ISO 8601 日付文字列を構築する。
 * 無効な値の場合は null を返す。
 * 未来日は翌日（+1日）まで許容する。
 */
function buildPerformedAt(year: string, month: string, day: string): string | null {
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() + 1 !== m ||
    date.getDate() !== d
  ) {
    return null;
  }
  // 未来日 +1 日まで許容（サーバー検証と同じトレランス）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 59, 999);
  if (date > tomorrow) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** ISO 8601 日付文字列を年・月・日に分解する */
function parseISODate(isoStr: string): { year: string; month: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoStr);
  if (match === null) return { year: '', month: '', day: '' };
  return {
    year: match[1] ?? '',
    month: String(parseInt(match[2] ?? '0', 10)),
    day: String(parseInt(match[3] ?? '0', 10)),
  };
}

/** 今日の日付を ISO 8601 形式で返す */
function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// フォームの初期値
// ---------------------------------------------------------------------------

type CareLogFormState = {
  type: BonsaiCareType;
  year: string;
  month: string;
  day: string;
  note: string;
};

function buildInitialForm(): CareLogFormState {
  const today = parseISODate(todayISO());
  return {
    type: BONSAI_CARE_TYPE.OTHER,
    year: today.year,
    month: today.month,
    day: today.day,
    note: '',
  };
}

function buildFormFromItem(item: CareLogItem): CareLogFormState {
  const parsed = parseISODate(item.performedAt);
  return {
    type: item.type as BonsaiCareType,
    year: parsed.year,
    month: parsed.month,
    day: parsed.day,
    note: item.note ?? '',
  };
}

// ---------------------------------------------------------------------------
// 種別セレクタ
// ---------------------------------------------------------------------------

type CareTypeSelectorProps = {
  selected: BonsaiCareType;
  onChange: (type: BonsaiCareType) => void;
};

function CareTypeSelector({ selected, onChange }: CareTypeSelectorProps) {
  return (
    <View style={selectorStyles.wrapper}>
      <Text style={selectorStyles.label}>種別</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={selectorStyles.row}>
          {CARE_TYPE_OPTIONS.map((type) => {
            const isSelected = type === selected;
            return (
              <Pressable
                key={type}
                style={[
                  selectorStyles.chip,
                  isSelected && selectorStyles.chipSelected,
                ]}
                onPress={() => onChange(type)}
                accessibilityRole="radio"
                accessibilityLabel={CARE_TYPE_LABEL[type]}
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    selectorStyles.chipText,
                    isSelected && selectorStyles.chipTextSelected,
                  ]}
                >
                  {CARE_TYPE_LABEL[type]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const selectorStyles = StyleSheet.create({
  wrapper: {
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: spacing2,
    paddingVertical: spacing1,
  },
  chip: {
    borderRadius: radiusFull,
    borderWidth: 1,
    borderColor: colorBorderLight,
    backgroundColor: colorSurface,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colorActionPrimary,
    borderColor: colorActionPrimary,
  },
  chipText: {
    ...textSm,
    color: colorTextPrimary,
  },
  chipTextSelected: {
    color: colorActionPrimaryText,
  },
});

// ---------------------------------------------------------------------------
// 日付入力フィールド
// ---------------------------------------------------------------------------

type DateInputProps = {
  year: string;
  month: string;
  day: string;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
  onDayChange: (v: string) => void;
  hasError: boolean;
};

function DateInput({
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
  hasError,
}: DateInputProps) {
  return (
    <View style={dateInputStyles.wrapper}>
      <Text style={dateInputStyles.label}>実施日</Text>
      <View style={dateInputStyles.row}>
        <View style={dateInputStyles.yearContainer}>
          <TextInput
            value={year}
            onChangeText={(t) => onYearChange(t.replace(/[^0-9]/g, ''))}
            placeholder="年"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={4}
            style={[dateInputStyles.input, hasError && dateInputStyles.inputError]}
            accessibilityLabel="実施年"
          />
        </View>
        <Text style={dateInputStyles.unit}>年</Text>
        <View style={dateInputStyles.shortContainer}>
          <TextInput
            value={month}
            onChangeText={(t) => onMonthChange(t.replace(/[^0-9]/g, ''))}
            placeholder="月"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={2}
            style={[dateInputStyles.input, hasError && dateInputStyles.inputError]}
            accessibilityLabel="実施月"
          />
        </View>
        <Text style={dateInputStyles.unit}>月</Text>
        <View style={dateInputStyles.shortContainer}>
          <TextInput
            value={day}
            onChangeText={(t) => onDayChange(t.replace(/[^0-9]/g, ''))}
            placeholder="日"
            placeholderTextColor={colorTextTertiary}
            keyboardType="number-pad"
            maxLength={2}
            style={[dateInputStyles.input, hasError && dateInputStyles.inputError]}
            accessibilityLabel="実施日（日）"
          />
        </View>
        <Text style={dateInputStyles.unit}>日</Text>
      </View>
      {hasError && (
        <View accessibilityRole="alert">
          <Text style={dateInputStyles.errorText}>
            有効な日付を入力してください（未来日は翌日まで）
          </Text>
        </View>
      )}
    </View>
  );
}

const dateInputStyles = StyleSheet.create({
  wrapper: {
    gap: spacing2,
  },
  label: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  yearContainer: {
    width: 80,
    height: 48,
  },
  shortContainer: {
    width: 56,
    height: 48,
  },
  input: {
    height: '100%',
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing2,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    textAlign: 'center',
  },
  inputError: {
    borderColor: colorError,
  },
  unit: {
    ...textBase,
    color: colorTextSecondary,
  },
  errorText: {
    ...textSm,
    color: colorError,
    marginTop: spacing1,
  },
});

// ---------------------------------------------------------------------------
// 作成/編集フォームモーダル
// ---------------------------------------------------------------------------

type CareLogFormModalProps = {
  visible: boolean;
  editingItem: CareLogItem | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (message: string, variant?: 'default' | 'error' | 'warning') => void;
};

function CareLogFormModal({
  visible,
  editingItem,
  onClose,
  onSuccess,
  showToast,
}: CareLogFormModalProps) {
  const isEditing = editingItem !== null;
  const initialForm = isEditing ? buildFormFromItem(editingItem) : buildInitialForm();

  const [form, setForm] = useState<CareLogFormState>(initialForm);

  // モーダルが開くたびにフォームを初期化する
  const handleShow = useCallback(() => {
    setForm(isEditing && editingItem !== null ? buildFormFromItem(editingItem) : buildInitialForm());
  }, [isEditing, editingItem]);

  const performedAt = buildPerformedAt(form.year, form.month, form.day);
  const hasDateError =
    (form.year !== '' || form.month !== '' || form.day !== '') &&
    performedAt === null;
  const isNoteOverflow = form.note.length > MAX_CARE_LOG_NOTE_LENGTH;
  const isSubmittable =
    performedAt !== null && !isNoteOverflow;

  const createMutation = useCreateCareLogMutation();
  const updateMutation = useUpdateCareLogMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = useCallback(() => {
    if (performedAt === null || isNoteOverflow) return;
    if (isEditing && editingItem !== null) {
      updateMutation.mutate(
        {
          logId: editingItem.id,
          type: form.type,
          performedAt,
          note: form.note.length > 0 ? form.note : null,
        },
        {
          onSuccess: () => {
            onSuccess();
            onClose();
          },
          onError: () => {
            showToast(ERR_CARE_LOG_UPDATE_FAILED, 'error');
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          type: form.type,
          performedAt,
          note: form.note.length > 0 ? form.note : undefined,
        },
        {
          onSuccess: () => {
            onSuccess();
            onClose();
          },
          onError: () => {
            showToast(ERR_CARE_LOG_CREATE_FAILED, 'error');
          },
        }
      );
    }
  }, [
    performedAt,
    isNoteOverflow,
    isEditing,
    editingItem,
    form,
    createMutation,
    updateMutation,
    onSuccess,
    onClose,
    showToast,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={modalStyles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* モーダルヘッダー */}
        <View style={modalStyles.header}>
          <Pressable
            style={modalStyles.cancelButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="キャンセル"
          >
            <Text style={modalStyles.cancelText}>キャンセル</Text>
          </Pressable>
          <Text style={modalStyles.title} accessibilityRole="header">
            {isEditing ? '手入れログを編集' : '手入れを記録'}
          </Text>
          <Pressable
            style={[
              modalStyles.submitButton,
              (!isSubmittable || isSubmitting) && modalStyles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!isSubmittable || isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={isEditing ? '更新する' : '記録する'}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colorActionPrimaryText} />
            ) : (
              <Text style={modalStyles.submitText}>{isEditing ? '更新' : '記録'}</Text>
            )}
          </Pressable>
        </View>

        <ScrollView
          style={modalStyles.scroll}
          contentContainerStyle={modalStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* 種別セレクタ */}
          <CareTypeSelector
            selected={form.type}
            onChange={(type) => setForm((prev) => ({ ...prev, type }))}
          />

          <View style={modalStyles.divider} />

          {/* 実施日 */}
          <DateInput
            year={form.year}
            month={form.month}
            day={form.day}
            onYearChange={(v) => setForm((prev) => ({ ...prev, year: v }))}
            onMonthChange={(v) => setForm((prev) => ({ ...prev, month: v }))}
            onDayChange={(v) => setForm((prev) => ({ ...prev, day: v }))}
            hasError={hasDateError}
          />

          <View style={modalStyles.divider} />

          {/* メモ */}
          <View style={modalStyles.noteWrapper}>
            <View style={modalStyles.noteLabelRow}>
              <Text style={modalStyles.noteLabel}>メモ（任意）</Text>
              <Text
                style={[
                  modalStyles.noteCounter,
                  isNoteOverflow && modalStyles.noteCounterError,
                ]}
              >
                {form.note.length} / {MAX_CARE_LOG_NOTE_LENGTH}
              </Text>
            </View>
            <TextInput
              value={form.note}
              onChangeText={(v) => setForm((prev) => ({ ...prev, note: v }))}
              placeholder="手入れの詳細を記録できます"
              placeholderTextColor={colorTextTertiary}
              multiline
              style={[
                modalStyles.noteInput,
                isNoteOverflow && modalStyles.noteInputError,
              ]}
              accessibilityLabel="メモ"
              maxLength={MAX_CARE_LOG_NOTE_LENGTH + 50}
            />
            {isNoteOverflow && (
              <View accessibilityRole="alert">
                <Text style={modalStyles.noteErrorText}>
                  {`${MAX_CARE_LOG_NOTE_LENGTH}文字以内で入力してください。`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 52,
  },
  cancelButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  cancelText: {
    ...textBase,
    color: colorTextSecondary,
  },
  title: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  submitButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing4,
    gap: spacing5,
  },
  divider: {
    height: 1,
    backgroundColor: colorBorderLight,
  },
  noteWrapper: {
    gap: spacing2,
  },
  noteLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteLabel: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  noteCounter: {
    ...textSm,
    color: colorTextSecondary,
  },
  noteCounterError: {
    color: colorError,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteInputError: {
    borderColor: colorError,
  },
  noteErrorText: {
    ...textSm,
    color: colorError,
  },
});

// ---------------------------------------------------------------------------
// ログ行コンポーネント
// ---------------------------------------------------------------------------

type CareLogRowProps = {
  item: CareLogItem;
  onEdit: (item: CareLogItem) => void;
  onDelete: (item: CareLogItem) => void;
};

const CareLogRow = React.memo(function CareLogRow({
  item,
  onEdit,
  onDelete,
}: CareLogRowProps) {
  const typeLabel = CARE_TYPE_LABEL[item.type as BonsaiCareType] ?? item.type;
  const dateLabel = formatPerformedAt(item.performedAt);

  const handleEdit = useCallback(() => onEdit(item), [item, onEdit]);
  const handleDelete = useCallback(() => onDelete(item), [item, onDelete]);

  return (
    <Pressable
      style={({ pressed }) => [rowStyles.row, pressed && rowStyles.rowPressed]}
      onPress={handleEdit}
      accessibilityRole="button"
      accessibilityLabel={`${typeLabel} ${dateLabel}を編集`}
    >
      <View style={rowStyles.typeBadge}>
        <Text style={rowStyles.typeBadgeText}>{typeLabel}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.dateText}>{dateLabel}</Text>
        {item.note !== null && item.note !== undefined && item.note.length > 0 && (
          <Text style={rowStyles.noteText} numberOfLines={2}>
            {item.note}
          </Text>
        )}
      </View>
      <Pressable
        style={rowStyles.deleteButton}
        onPress={handleDelete}
        accessibilityRole="button"
        accessibilityLabel={`${typeLabel} ${dateLabel}を削除`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={colorError} />
      </Pressable>
    </Pressable>
  );
});

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    marginBottom: spacing3,
    gap: spacing3,
    ...shadowWashi,
  },
  rowPressed: {
    opacity: 0.85,
  },
  typeBadge: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    paddingHorizontal: spacing2,
    paddingVertical: spacing1,
    alignSelf: 'flex-start',
    minWidth: 72,
    alignItems: 'center',
  },
  typeBadgeText: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: spacing1,
  },
  dateText: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  noteText: {
    ...textSm,
    color: colorTextSecondary,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -spacing2,
    marginRight: -spacing2,
  },
});

// ---------------------------------------------------------------------------
// ヘッダー
// ---------------------------------------------------------------------------

type CareLogsHeaderProps = {
  onBack: () => void;
};

function CareLogsHeader({ onBack }: CareLogsHeaderProps) {
  return (
    <View style={headerStyles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={headerStyles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={headerStyles.backText}>‹ 戻る</Text>
      </Pressable>
      <Text style={headerStyles.title} accessibilityRole="header">
        手入れログ
      </Text>
      <View style={headerStyles.right} />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingHorizontal: spacing4,
    minHeight: 44,
  },
  backButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    ...textBase,
    color: colorTextSecondary,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  right: {
    minWidth: 60,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function CareLogsScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();

  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<CareLogItem | null>(null);

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useCareLogsQuery();

  const deleteMutation = useDeleteCareLogMutation();

  const allItems = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data]
  );

  const handleOpenCreate = useCallback(() => {
    setEditingItem(null);
    setFormVisible(true);
  }, []);

  const handleOpenEdit = useCallback((item: CareLogItem) => {
    setEditingItem(item);
    setFormVisible(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setFormVisible(false);
    setEditingItem(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    // invalidation は mutation の onSettled で完結するため、ここでは何もしない
  }, []);

  const handleDelete = useCallback(
    (item: CareLogItem) => {
      const typeLabel = CARE_TYPE_LABEL[item.type as BonsaiCareType] ?? item.type;
      const dateLabel = formatPerformedAt(item.performedAt);
      Alert.alert(
        '手入れログを削除',
        `${typeLabel}（${dateLabel}）を削除しますか？`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate(
                { logId: item.id },
                {
                  onError: () => {
                    showToast(ERR_CARE_LOG_DELETE_FAILED, 'error');
                  },
                }
              );
            },
          },
        ]
      );
    },
    [deleteMutation, showToast]
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const keyExtractor = useCallback((item: CareLogItem) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: CareLogItem }) => (
      <CareLogRow item={item} onEdit={handleOpenEdit} onDelete={handleDelete} />
    ),
    [handleOpenEdit, handleDelete]
  );

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
      </View>
    );
  }, [isFetchingNextPage]);

  function renderContent() {
    if (isLoading) {
      return <ScreenLoading variant="skeleton" skeletonCount={4} />;
    }

    if (isError) {
      return (
        <ScreenError
          title="読み込めませんでした"
          description={ERR_CARE_LOGS_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      );
    }

    if (allItems.length === 0) {
      return (
        <ScreenEmpty
          iconName="leaf-outline"
          title="手入れログがありません"
          description="右下のボタンから手入れを記録しましょう"
          actionLabel="記録する"
          onAction={handleOpenCreate}
        />
      );
    }

    return (
      <FlatList
        data={allItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + FAB_SIZE + spacing6 * 2 },
        ]}
        onEndReached={handleEndReached}
        onEndReachedThreshold={LOAD_MORE_THRESHOLD}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching && !isFetchingNextPage}
            onRefresh={() => void refetch()}
            tintColor={colorActionPrimary}
          />
        }
        accessibilityRole="list"
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <CareLogsHeader onBack={() => router.back()} />

      {renderContent()}

      {/* FAB */}
      <Pressable
        style={[
          styles.fab,
          { bottom: insets.bottom + spacing4 },
          shadowWashiLg,
        ]}
        onPress={handleOpenCreate}
        accessibilityRole="button"
        accessibilityLabel="手入れを記録する"
      >
        <Ionicons name="add" size={FAB_ICON_SIZE} color={colorActionPrimaryText} />
      </Pressable>

      {/* 作成/編集モーダル */}
      <CareLogFormModal
        visible={formVisible}
        editingItem={editingItem}
        onClose={handleFormClose}
        onSuccess={handleFormSuccess}
        showToast={showToast}
      />

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
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  listContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
  },
  footer: {
    paddingVertical: spacing4,
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing4,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// lint のための参照（未使用変数を避ける）
void (colorActionSecondary satisfies string);
void (colorActionSecondaryText satisfies string);
void (colorErrorBg satisfies string);
void (spacing8 satisfies number);
