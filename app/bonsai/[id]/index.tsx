/**
 * @module app/bonsai/[id]/index
 * 盆栽詳細画面。
 * 基本情報 + 成長記録タイムラインを表示する。
 * 仕様: docs/design/bonsai.md §3
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBonsaiDetailQuery, useBonsaiRecordsQuery, useDeleteBonsaiMutation, useDeleteBonsaiRecordMutation, type BonsaiRecordListResponse } from '@/lib/queries/bonsai';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorActionPrimary,
  spacing1,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  radiusMd,
  textBase,
  textSm,
  textLg,
  textXl,
  durationFast,
} from '@/lib/constants/design-tokens';
import {
  ERR_BONSAI_DELETE_FAILED,
  ERR_BONSAI_RECORD_DELETE_FAILED,
  ERR_OFFLINE_ACTION,
} from '@/lib/constants/errors';
import {
  routeBonsaiEdit,
  routeBonsaiRecordNew,
  routeBonsaiRecordEdit,
} from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const COVER_ASPECT_RATIO = 16 / 9;
const RECORD_IMAGE_SIZE = 100;
const TREE_ICON_SIZE = 48;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

type RecordItem = BonsaiRecordListResponse['items'][number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BonsaiDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();

  const params = useLocalSearchParams();
  const rawId = params['id'];
  const id = typeof rawId === 'string' ? rawId : '';

  const {
    data: bonsai,
    isLoading,
    isError,
    refetch,
  } = useBonsaiDetailQuery(id);

  const {
    data: recordsData,
    isLoading: isRecordsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBonsaiRecordsQuery(id);

  const { mutate: deleteBonsai } = useDeleteBonsaiMutation();
  const { mutate: deleteRecord } = useDeleteBonsaiRecordMutation();

  const allRecords: RecordItem[] =
    recordsData?.pages.flatMap((page) => page.items) ?? [];

  const handleDelete = useCallback(() => {
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'error');
      return;
    }
    Alert.alert(
      'この盆栽を削除しますか？',
      '盆栽と関連する成長記録がすべて削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            deleteBonsai(
              { id },
              {
                onSuccess: () => router.back(),
                onError: () => showToast(ERR_BONSAI_DELETE_FAILED, 'error'),
              }
            );
          },
        },
      ]
    );
  }, [isOnline, id, deleteBonsai, showToast]);

  const handleDeleteRecord = useCallback(
    (recordId: string) => {
      if (!isOnline) {
        showToast(ERR_OFFLINE_ACTION, 'error');
        return;
      }
      Alert.alert(
        '記録を削除しますか？',
        'この成長記録は削除されます。この操作は取り消せません。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除する',
            style: 'destructive',
            onPress: () => {
              deleteRecord(
                { bonsaiId: id, recordId },
                {
                  onError: () => showToast(ERR_BONSAI_RECORD_DELETE_FAILED, 'error'),
                }
              );
            },
          },
        ]
      );
    },
    [isOnline, id, deleteRecord, showToast]
  );

  const handleShowMenu = useCallback(() => {
    Alert.alert('メニュー', undefined, [
      {
        text: '編集する',
        onPress: () => router.push(routeBonsaiEdit(id)),
      },
      {
        text: '削除する',
        style: 'destructive',
        onPress: handleDelete,
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  }, [id, handleDelete]);

  const handleLoadMoreRecords = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError || bonsai === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ScreenError
          title="読み込めませんでした"
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const coverImageUrl =
    (bonsai as { latestRecord?: { thumbnailUrl?: string | null } | null })
      .latestRecord?.thumbnailUrl ?? null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backText}>‹ 戻る</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{bonsai.name}</Text>
        <Pressable
          onPress={handleShowMenu}
          accessibilityRole="button"
          accessibilityLabel="メニューを開く"
          style={styles.headerButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.menuText}>⋮</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing6 },
        ]}
      >
        {/* アイキャッチ画像 */}
        {coverImageUrl !== null ? (
          <Image
            source={{ uri: coverImageUrl }}
            style={styles.coverImage}
            contentFit="cover"
            transition={durationFast}
            accessibilityLabel={`${bonsai.name}の画像`}
          />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Ionicons
              name="leaf-outline"
              size={TREE_ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
        )}

        {/* 基本情報 */}
        <View style={styles.infoSection}>
          <Text style={styles.bonsaiName}>{bonsai.name}</Text>
          {(bonsai as { species?: string | null }).species !== undefined &&
            (bonsai as { species?: string | null }).species !== null &&
            (bonsai as { species?: string | null }).species !== '' && (
            <Text style={styles.species}>
              {(bonsai as { species: string }).species}
            </Text>
          )}
          {(bonsai as { acquiredAt?: string | null }).acquiredAt !== undefined &&
            (bonsai as { acquiredAt?: string | null }).acquiredAt !== null && (
            <Text style={styles.acquiredAt}>
              取得日: {formatDate((bonsai as { acquiredAt: string }).acquiredAt)}
            </Text>
          )}
          {(bonsai as { description?: string | null }).description !== undefined &&
            (bonsai as { description?: string | null }).description !== null && (
            <Text style={styles.description}>
              {(bonsai as { description: string }).description}
            </Text>
          )}
        </View>

        <View style={styles.separator} />

        {/* 成長記録セクション */}
        <View style={styles.recordsSection}>
          <View style={styles.recordsHeader}>
            <Text style={styles.recordsSectionTitle}>成長記録</Text>
            <Pressable
              onPress={() => router.push(routeBonsaiRecordNew(id))}
              accessibilityRole="button"
              accessibilityLabel="記録を追加"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.addRecordText}>+ 記録を追加</Text>
            </Pressable>
          </View>

          {isRecordsLoading ? (
            <ActivityIndicator size="small" color={colorActionPrimary} style={styles.recordsSpinner} />
          ) : allRecords.length === 0 ? (
            <View style={styles.emptyRecords}>
              <Text style={styles.emptyRecordsTitle}>記録がまだありません</Text>
              <Text style={styles.emptyRecordsDesc}>
                「+ 追加」をタップして最初の記録をつけましょう。
              </Text>
            </View>
          ) : (
            <>
              {allRecords.map((record) => (
                <GrowthRecordItem
                  key={record.id}
                  record={record}
                  bonsaiId={id}
                  onDelete={() => handleDeleteRecord(record.id)}
                />
              ))}
              {isFetchingNextPage && (
                <ActivityIndicator size="small" color={colorActionPrimary} style={styles.recordsSpinner} />
              )}
              {hasNextPage && !isFetchingNextPage && (
                <Pressable
                  onPress={handleLoadMoreRecords}
                  style={styles.loadMoreButton}
                  accessibilityRole="button"
                  accessibilityLabel="さらに記録を読み込む"
                >
                  <Text style={styles.loadMoreText}>さらに読み込む</Text>
                </Pressable>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <Toast message={toast.message} visible={toast.visible} variant={toast.variant} onHide={hideToast} />
    </View>
  );
}

// ---------------------------------------------------------------------------
// GrowthRecordItem
// ---------------------------------------------------------------------------

type GrowthRecordItemProps = {
  record: RecordItem;
  bonsaiId: string;
  onDelete: () => void;
};

function GrowthRecordItem({ record, bonsaiId, onDelete }: GrowthRecordItemProps) {
  const handleMenu = useCallback(() => {
    Alert.alert('記録のメニュー', undefined, [
      {
        text: '編集する',
        onPress: () => router.push(routeBonsaiRecordEdit(bonsaiId, record.id)),
      },
      {
        text: '削除する',
        style: 'destructive',
        onPress: onDelete,
      },
      { text: 'キャンセル', style: 'cancel' },
    ]);
  }, [bonsaiId, record.id, onDelete]);

  return (
    <View style={recordStyles.container}>
      {/* タイムライン縦線 + マーカー */}
      <View style={recordStyles.timelineCol}>
        <View style={recordStyles.marker} />
        <View style={recordStyles.line} />
      </View>

      {/* コンテンツ */}
      <View style={recordStyles.content}>
        <View style={recordStyles.contentHeader}>
          <Text style={recordStyles.date}>{formatDate(record.recordAt)}</Text>
          <Pressable
            onPress={handleMenu}
            accessibilityRole="button"
            accessibilityLabel="記録のメニューを開く"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={recordStyles.menuIcon}>⋮</Text>
          </Pressable>
        </View>
        {record.content !== undefined && record.content !== null && (
          <Text style={recordStyles.recordText}>{record.content}</Text>
        )}
        {record.images.length > 0 && (
          <View style={recordStyles.imageGrid}>
            {record.images.map((img, idx) => (
              <Image
                key={img.url}
                source={{ uri: img.url }}
                style={recordStyles.recordImage}
                contentFit="cover"
                transition={durationFast}
                accessibilityLabel={`${idx + 1}枚目の記録画像`}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
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
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backText: {
    color: colorTextSecondary,
    fontSize: 16,
  },
  menuText: {
    color: colorTextSecondary,
    fontSize: 20,
    textAlign: 'right',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  scrollContent: {
    paddingBottom: spacing8,
  },
  coverImage: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
  },
  coverPlaceholder: {
    width: '100%',
    aspectRatio: COVER_ASPECT_RATIO,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing2,
  },
  bonsaiName: {
    ...textXl,
    color: colorTextPrimary,
  },
  species: {
    ...textBase,
    color: colorTextSecondary,
  },
  acquiredAt: {
    ...textSm,
    color: colorTextTertiary,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    marginTop: spacing3,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing4,
    marginVertical: spacing4,
  },
  recordsSection: {
    paddingHorizontal: spacing4,
  },
  recordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing4,
  },
  recordsSectionTitle: {
    ...textLg,
    color: colorTextPrimary,
  },
  addRecordText: {
    ...textBase,
    color: colorActionPrimary,
    fontWeight: '600',
  },
  recordsSpinner: {
    marginVertical: spacing4,
  },
  emptyRecords: {
    alignItems: 'center',
    paddingVertical: spacing8,
    gap: spacing2,
  },
  emptyRecordsTitle: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  emptyRecordsDesc: {
    ...textSm,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: spacing4,
    minHeight: 44,
  },
  loadMoreText: {
    ...textSm,
    color: colorActionPrimary,
  },
});

const recordStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: spacing4,
  },
  timelineCol: {
    width: spacing5,
    alignItems: 'center',
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colorActionPrimary,
    marginTop: spacing2,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colorBorderLight,
    marginTop: spacing1,
  },
  content: {
    flex: 1,
    paddingLeft: spacing3,
    paddingBottom: spacing4,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing2,
  },
  date: {
    ...textSm,
    color: colorTextSecondary,
  },
  menuIcon: {
    color: colorTextSecondary,
    fontSize: 18,
  },
  recordText: {
    ...textBase,
    color: colorTextPrimary,
    marginBottom: spacing2,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
    marginTop: spacing2,
  },
  recordImage: {
    width: RECORD_IMAGE_SIZE,
    height: RECORD_IMAGE_SIZE,
    borderRadius: radiusMd,
  },
});
