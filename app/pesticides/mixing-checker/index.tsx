/**
 * @module app/pesticides/mixing-checker/index
 * 混用チェッカー画面。Web 版 /pesticides/mixing-checker に対応。
 * useMixingDataQuery の全データを使い、農薬 2〜3 剤（3剤目は任意）を選んで
 * 選択された全ペアの混用可否を判定する（Web 版 MixingChecker と同構成）。
 * 選択は数百件対応の Modal + TextInput + FlatList 方式。
 * 仕様: docs/design/pesticides-web-parity.md §4-11
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Keyboard,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMixingDataQuery } from '@/lib/queries/pesticides';
import type { components } from '@/lib/api/generated/schema.d.ts';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { PesticideDisclaimer } from '@/components/pesticide/PesticideDisclaimer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ERR_PESTICIDES_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorBorder,
  colorError,
  colorErrorBg,
  colorSuccess,
  colorSuccessBg,
  colorTextPrimary,
  colorTextSecondary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusMd,
  radiusLg,
  radiusFull,
  shadowWashi,
  textSm,
  textBase,
  textXs,
  textLg,
  fontFamilySerifBold,
} from '@/lib/constants/design-tokens';

type MixingDataPesticideItem = components['schemas']['MixingDataPesticideItem'];
type MixingDataIncompatibilityItem = components['schemas']['MixingDataIncompatibilityItem'];

// ---------------------------------------------------------------------------
// 農薬タイプラベル
// ---------------------------------------------------------------------------

const PESTICIDE_TYPE_LABELS: Record<MixingDataPesticideItem['pesticideType'], string> = {
  fungicide: '殺菌剤',
  insecticide: '殺虫剤',
  acaricide: '殺ダニ剤',
  compound: '複合剤',
  other: 'その他',
};

// ---------------------------------------------------------------------------
// 混用可否判定（純粋関数）
// ---------------------------------------------------------------------------

function isIncompatible(
  id1: string,
  id2: string,
  incompatibilities: MixingDataIncompatibilityItem[]
): boolean {
  return incompatibilities.some(
    (pair) =>
      (pair.pesticideId === id1 && pair.incompatibleWithId === id2) ||
      (pair.pesticideId === id2 && pair.incompatibleWithId === id1)
  );
}

// ---------------------------------------------------------------------------
// 農薬選択モーダルコンポーネント
// ---------------------------------------------------------------------------

type PesticidePickerModalProps = {
  visible: boolean;
  pesticides: MixingDataPesticideItem[];
  excludeIds: string[];
  onSelect: (item: MixingDataPesticideItem) => void;
  onClose: () => void;
  title: string;
};

const PesticidePickerModal = memo(function PesticidePickerModal({
  visible,
  pesticides,
  excludeIds,
  onSelect,
  onClose,
  title,
}: PesticidePickerModalProps) {
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');

  const filtered = useMemo(() => {
    const keyword = searchText.trim();
    const pool = excludeIds.length > 0
      ? pesticides.filter((p) => !excludeIds.includes(p.id))
      : pesticides;
    if (keyword.length === 0) return pool;
    return pool.filter((p) => p.name.includes(keyword));
  }, [pesticides, excludeIds, searchText]);

  const handleClose = useCallback(() => {
    setSearchText('');
    onClose();
  }, [onClose]);

  const renderItem = useCallback(
    ({ item }: { item: MixingDataPesticideItem }) => {
      const typeLabel = PESTICIDE_TYPE_LABELS[item.pesticideType];
      return (
        <TouchableOpacity
          style={styles.modalRow}
          onPress={() => {
            setSearchText('');
            onSelect(item);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`${item.name}（${typeLabel}）を選択`}
        >
          <Text style={styles.modalRowName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.modalRowType}>{typeLabel}</Text>
        </TouchableOpacity>
      );
    },
    [onSelect]
  );

  const extractKey = useCallback((item: MixingDataPesticideItem) => item.id, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={handleClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* モーダルヘッダー */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <Ionicons name="close" size={20} color={colorTextPrimary} />
          </TouchableOpacity>
        </View>

        {/* 検索バー */}
        <View style={styles.modalSearchBar}>
          <Ionicons
            name="search-outline"
            size={16}
            color={colorTextSecondary}
            style={styles.modalSearchIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <TextInput
            style={styles.modalSearchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="農薬名で絞り込む..."
            placeholderTextColor={colorTextSecondary}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            accessibilityLabel="農薬名で絞り込む"
            autoFocus
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => { setSearchText(''); }}
              accessibilityRole="button"
              accessibilityLabel="検索テキストをクリア"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={colorTextSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* 件数 */}
        <Text style={styles.modalCount}>{filtered.length}件</Text>

        {/* リスト */}
        <FlatList
          data={filtered}
          keyExtractor={extractKey}
          renderItem={renderItem}
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.modalEmptyText}>該当する農薬が見つかりませんでした</Text>
          }
        />
      </View>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// 農薬選択ボタンコンポーネント
// ---------------------------------------------------------------------------

type PesticideSelectorProps = {
  label: string;
  selectedItem: MixingDataPesticideItem | null;
  onPress: () => void;
  /** 任意項目（農薬3）のみ選択解除ボタンを表示するために渡す */
  onClear?: () => void;
};

const PesticideSelector = memo(function PesticideSelector({
  label,
  selectedItem,
  onPress,
  onClear,
}: PesticideSelectorProps) {
  return (
    <View style={styles.selectorWrapper}>
      <Text style={styles.selectorLabel}>{label}</Text>
      <View style={styles.selectorRow}>
        <TouchableOpacity
          style={[styles.selectorButton, styles.selectorButtonFlex]}
          onPress={onPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            selectedItem !== null
              ? `${label}: ${selectedItem.name}（タップして変更）`
              : `${label}を選択する`
          }
        >
          {selectedItem !== null ? (
            <View style={styles.selectorSelected}>
              <Text style={styles.selectorSelectedName} numberOfLines={1}>
                {selectedItem.name}
              </Text>
              <Text style={styles.selectorSelectedType}>
                {PESTICIDE_TYPE_LABELS[selectedItem.pesticideType]}
              </Text>
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>農薬を選択する</Text>
          )}
          <Ionicons
            name="chevron-down"
            size={16}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </TouchableOpacity>

        {selectedItem !== null && onClear !== undefined && (
          <TouchableOpacity
            style={styles.selectorClearButton}
            onPress={onClear}
            accessibilityRole="button"
            accessibilityLabel={`${label}の選択を解除`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="close-circle"
              size={20}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ---------------------------------------------------------------------------
// 判定結果カードコンポーネント
// ---------------------------------------------------------------------------

type MixingResultCardProps = {
  pesticide1: MixingDataPesticideItem;
  pesticide2: MixingDataPesticideItem;
  incompatible: boolean;
};

const MixingResultCard = memo(function MixingResultCard({
  pesticide1,
  pesticide2,
  incompatible,
}: MixingResultCardProps) {
  return (
    <View
      style={[
        styles.resultCard,
        incompatible ? styles.resultCardIncompatible : styles.resultCardCompatible,
      ]}
      accessibilityRole="text"
    >
      <View style={styles.resultHeader}>
        <View
          style={[
            styles.resultBadge,
            incompatible ? styles.resultBadgeIncompatible : styles.resultBadgeCompatible,
          ]}
        >
          <Ionicons
            name={incompatible ? 'warning-outline' : 'checkmark-circle-outline'}
            size={14}
            color={incompatible ? colorError : colorSuccess}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text
            style={[
              styles.resultBadgeText,
              { color: incompatible ? colorError : colorSuccess },
            ]}
          >
            {incompatible ? '混用不可' : '混用可能'}
          </Text>
        </View>
      </View>

      <Text style={styles.resultPair}>
        {pesticide1.name}
        <Text style={styles.resultPairSeparator}> × </Text>
        {pesticide2.name}
      </Text>

      {incompatible && (
        <Text style={styles.resultIncompatibleNote}>
          この組み合わせはデータベース上で混用不可として登録されています。
        </Text>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type ModalTarget = 'pesticide1' | 'pesticide2' | 'pesticide3';

type MixingPairResult = {
  key: string;
  pesticide1: MixingDataPesticideItem;
  pesticide2: MixingDataPesticideItem;
  incompatible: boolean;
};

export default function MixingCheckerScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const { data, isLoading, isError, refetch } = useMixingDataQuery();

  const [pesticide1, setPesticide1] = useState<MixingDataPesticideItem | null>(null);
  const [pesticide2, setPesticide2] = useState<MixingDataPesticideItem | null>(null);
  const [pesticide3, setPesticide3] = useState<MixingDataPesticideItem | null>(null);
  const [modalTarget, setModalTarget] = useState<ModalTarget | null>(null);

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

  const openModal = useCallback((target: ModalTarget) => {
    setModalTarget(target);
  }, []);

  const handleSelect = useCallback(
    (item: MixingDataPesticideItem) => {
      // モーダルは選択済みの他 2 剤を除外して表示するため、ここでの重複解除は不要
      if (modalTarget === 'pesticide1') {
        setPesticide1(item);
      } else if (modalTarget === 'pesticide2') {
        setPesticide2(item);
      } else if (modalTarget === 'pesticide3') {
        setPesticide3(item);
      }
      setModalTarget(null);
    },
    [modalTarget]
  );

  const handleCloseModal = useCallback(() => { setModalTarget(null); }, []);
  const handleClearPesticide3 = useCallback(() => { setPesticide3(null); }, []);

  const incompatibilities = useMemo(
    () => data?.incompatibilities ?? [],
    [data]
  );
  const pesticides = useMemo(() => data?.pesticides ?? [], [data]);

  // 選択された全ペア（1-2, 1-3, 2-3）の可否を判定する（Web 版 MixingChecker と同じ組み合わせ方）
  const mixingResults = useMemo<MixingPairResult[]>(() => {
    const pairs: MixingPairResult[] = [];

    if (pesticide1 !== null && pesticide2 !== null) {
      pairs.push({
        key: `${pesticide1.id}-${pesticide2.id}`,
        pesticide1,
        pesticide2,
        incompatible: isIncompatible(pesticide1.id, pesticide2.id, incompatibilities),
      });
    }

    if (pesticide3 !== null) {
      if (pesticide1 !== null) {
        pairs.push({
          key: `${pesticide1.id}-${pesticide3.id}`,
          pesticide1,
          pesticide2: pesticide3,
          incompatible: isIncompatible(pesticide1.id, pesticide3.id, incompatibilities),
        });
      }
      if (pesticide2 !== null) {
        pairs.push({
          key: `${pesticide2.id}-${pesticide3.id}`,
          pesticide1: pesticide2,
          pesticide2: pesticide3,
          incompatible: isIncompatible(pesticide2.id, pesticide3.id, incompatibilities),
        });
      }
    }

    return pairs;
  }, [pesticide1, pesticide2, pesticide3, incompatibilities]);

  // 農薬1・2の両方が選択されて初めて結果セクションを表示する（Web 版と同じ表示条件）
  const showResults = pesticide1 !== null && pesticide2 !== null;

  // モーダル側で除外するID（選択済みの他 2 剤を候補から除く）
  const excludeIdsForModal = useMemo(() => {
    const ids: string[] = [];
    if (modalTarget !== 'pesticide1' && pesticide1 !== null) ids.push(pesticide1.id);
    if (modalTarget !== 'pesticide2' && pesticide2 !== null) ids.push(pesticide2.id);
    if (modalTarget !== 'pesticide3' && pesticide3 !== null) ids.push(pesticide3.id);
    return ids;
  }, [modalTarget, pesticide1, pesticide2, pesticide3]);

  const modalTitle =
    modalTarget === 'pesticide1'
      ? '農薬 1 を選択'
      : modalTarget === 'pesticide2'
        ? '農薬 2 を選択'
        : '農薬 3 を選択';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '混用チェッカー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '混用チェッカー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenError
          title="データを読み込めませんでした"
          description={ERR_PESTICIDES_LOAD_FAILED}
          onRetry={handleRefresh}
        />
      </View>
    );
  }

  if (pesticides.length === 0) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: '混用チェッカー', headerShown: true }} />
        <OfflineBanner isVisible={!isOnline} />
        <ScreenEmpty title="農薬データがありません" iconName="flask-outline" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '混用チェッカー', headerShown: true }} />
      <OfflineBanner isVisible={!isOnline} />

      {/* 農薬選択モーダル */}
      {modalTarget !== null && (
        <PesticidePickerModal
          visible
          pesticides={pesticides}
          excludeIds={excludeIdsForModal}
          onSelect={handleSelect}
          onClose={handleCloseModal}
          title={modalTitle}
        />
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing8 },
        ]}
        refreshControl={<RefreshControl refreshing={false} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 説明文 */}
        <Text style={styles.description}>
          農薬の混用可否を確認できます。2剤の組み合わせをチェックしましょう。
        </Text>

        {/* 農薬選択カード */}
        <View style={styles.selectionCard}>
          <PesticideSelector
            label="農薬 1"
            selectedItem={pesticide1}
            onPress={() => { openModal('pesticide1'); }}
          />
          <View style={styles.divider} />
          <PesticideSelector
            label="農薬 2"
            selectedItem={pesticide2}
            onPress={() => { openModal('pesticide2'); }}
          />
          <View style={styles.divider} />
          <PesticideSelector
            label="農薬 3（任意）"
            selectedItem={pesticide3}
            onPress={() => { openModal('pesticide3'); }}
            onClear={handleClearPesticide3}
          />
        </View>

        {/* 判定結果（選択された全ペア分を並べる） */}
        {showResults && mixingResults.map((pair) => (
          <MixingResultCard
            key={pair.key}
            pesticide1={pair.pesticide1}
            pesticide2={pair.pesticide2}
            incompatible={pair.incompatible}
          />
        ))}

        {/* 注意書き */}
        <View style={styles.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={14}
            color={colorTextSecondary}
            style={styles.noteIcon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.noteText}>
            この結果はデータベースに登録された混用不可情報に基づきます。未登録の組み合わせについては製品ラベルを必ず確認してください。
          </Text>
        </View>

        <PesticideDisclaimer />
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },
  description: {
    ...textSm,
    color: colorTextSecondary,
  },

  // 農薬選択カード
  selectionCard: {
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusLg,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  selectorWrapper: {
    gap: spacing2,
  },
  selectorLabel: {
    ...textXs,
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    backgroundColor: colorBackground,
    minHeight: 44,
  },
  selectorButtonFlex: {
    flex: 1,
  },
  selectorClearButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorSelected: {
    flex: 1,
    gap: spacing2,
  },
  selectorSelectedName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  selectorSelectedType: {
    ...textXs,
    color: colorTextSecondary,
  },
  selectorPlaceholder: {
    flex: 1,
    ...textSm,
    color: colorTextSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colorBorder,
    marginHorizontal: -spacing4,
  },

  // 判定結果カード
  resultCard: {
    borderRadius: radiusLg,
    borderWidth: 1,
    padding: spacing4,
    gap: spacing3,
    ...shadowWashi,
  },
  resultCardCompatible: {
    backgroundColor: colorSuccessBg,
    borderColor: colorSuccess + '40',
  },
  resultCardIncompatible: {
    backgroundColor: colorErrorBg,
    borderColor: colorError + '40',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    borderRadius: radiusFull,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
  },
  resultBadgeCompatible: {
    backgroundColor: colorSuccess + '20',
  },
  resultBadgeIncompatible: {
    backgroundColor: colorError + '20',
  },
  resultBadgeText: {
    ...textXs,
    fontFamily: fontFamilySerifBold,
  },
  resultPair: {
    ...textBase,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
    lineHeight: 22,
  },
  resultPairSeparator: {
    color: colorTextSecondary,
    fontFamily: fontFamilySerifBold,
  },
  resultIncompatibleNote: {
    ...textXs,
    color: colorError,
    lineHeight: 18,
  },

  // 注意書きカード
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing2,
    backgroundColor: colorSurfaceMuted,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    padding: spacing3,
  },
  noteIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  noteText: {
    flex: 1,
    ...textXs,
    color: colorTextSecondary,
    lineHeight: 18,
  },

  // モーダル
  modalContainer: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
  },
  modalTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    marginHorizontal: spacing4,
    marginTop: spacing3,
    marginBottom: spacing2,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    backgroundColor: colorBackground,
    height: 44,
  },
  modalSearchIcon: {
    flexShrink: 0,
  },
  modalSearchInput: {
    flex: 1,
    ...textSm,
    color: colorTextPrimary,
    height: 44,
  },
  modalCount: {
    ...textXs,
    color: colorTextSecondary,
    paddingHorizontal: spacing4,
    paddingBottom: spacing2,
  },
  modalRow: {
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorder,
    minHeight: 52,
    justifyContent: 'center',
    gap: spacing2,
  },
  modalRowName: {
    ...textSm,
    color: colorTextPrimary,
    fontFamily: fontFamilySerifBold,
  },
  modalRowType: {
    ...textXs,
    color: colorTextSecondary,
  },
  modalEmptyText: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
    paddingVertical: spacing8,
    paddingHorizontal: spacing4,
  },
});
