/**
 * @module app/scheduled-posts/[id]/index
 * 予約投稿詳細画面（プレミアム限定）。
 * pending のみ編集・キャンセル・削除が可能。published は読み取り専用。
 * 仕様: docs/design/scheduled-posts.md §5
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useScheduledPostDetailQuery,
  useCancelScheduledPostMutation,
  useDeleteScheduledPostMutation,
} from '@/lib/queries/scheduled-posts';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorSuccess,
  colorSuccessBg,
  colorError,
  colorErrorBg,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusLg,
  radiusSm,
  shadowWashi,
  textBase,
  textSm,
  textLg,
  textXs,
} from '@/lib/constants/design-tokens';
import {
  ERR_SCHEDULED_POST_CANCEL_FAILED,
  ERR_SCHEDULED_POST_DELETE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_LOAD_FAILED,
} from '@/lib/constants/errors';
import { routeScheduledPostEdit } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 80;

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

type ScheduledPostStatus = 'pending' | 'published' | 'failed' | 'cancelled';

type StatusBadgeProps = { status: ScheduledPostStatus };

function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const STATUS_CONFIG: Record<ScheduledPostStatus, { label: string; bg: string; color: string }> = {
  pending: { label: '予約中', bg: colorSurfaceMuted, color: colorTextPrimary },
  published: { label: '公開済み', bg: colorSuccessBg, color: colorSuccess },
  failed: { label: '失敗', bg: colorErrorBg, color: colorError },
  cancelled: { label: 'キャンセル済み', bg: colorSurfaceMuted, color: colorTextSecondary },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduledPostDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();

  const params = useLocalSearchParams();
  const rawId = params['id'];
  const id = typeof rawId === 'string' ? rawId : '';

  const { data: post, isLoading, isError, refetch } = useScheduledPostDetailQuery(id);
  const { mutate: cancelPost, isPending: isCancelling } = useCancelScheduledPostMutation();
  const { mutate: deletePost, isPending: isDeleting } = useDeleteScheduledPostMutation();

  const isMutating = isCancelling || isDeleting;

  const isValidStatus = (s: string): s is ScheduledPostStatus =>
    ['pending', 'published', 'failed', 'cancelled'].includes(s);

  const status: ScheduledPostStatus | undefined =
    post !== undefined && isValidStatus(post.status) ? post.status : undefined;

  const handleEdit = useCallback(() => {
    router.push(routeScheduledPostEdit(id));
  }, [id]);

  const handleCancel = useCallback(() => {
    if (!isOnline) {
      Alert.alert('エラー', ERR_OFFLINE_ACTION);
      return;
    }
    Alert.alert(
      '予約を取り消しますか？',
      'キャンセルしても投稿は削除されません。後で確認できます。',
      [
        { text: 'やめる', style: 'cancel' },
        {
          text: '取り消す',
          style: 'destructive',
          onPress: () => {
            cancelPost(
              { id },
              {
                onSuccess: () => router.back(),
                onError: () => Alert.alert('エラー', ERR_SCHEDULED_POST_CANCEL_FAILED),
              }
            );
          },
        },
      ]
    );
  }, [id, isOnline, cancelPost]);

  const handleDelete = useCallback(() => {
    if (!isOnline) {
      Alert.alert('エラー', ERR_OFFLINE_ACTION);
      return;
    }
    Alert.alert(
      'この予約投稿を削除しますか？',
      '削除すると元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            deletePost(
              { id },
              {
                onSuccess: () => router.back(),
                onError: () => Alert.alert('エラー', ERR_SCHEDULED_POST_DELETE_FAILED),
              }
            );
          },
        },
      ]
    );
  }, [id, isOnline, deletePost]);

  const handleMenu = useCallback(() => {
    const isPending = status === 'pending';
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      ...(isPending ? [{ text: '編集する', onPress: handleEdit }] : []),
      ...(isPending ? [{ text: '予約を取り消す', style: 'destructive' as const, onPress: handleCancel }] : []),
      { text: '削除する', style: 'destructive' as const, onPress: handleDelete },
      { text: 'キャンセル', style: 'cancel' as const },
    ];
    Alert.alert('操作を選んでください', undefined, options);
  }, [status, handleEdit, handleCancel, handleDelete]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader onBack={() => router.back()} onMenu={undefined} isMutating={false} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError || post === undefined || status === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader onBack={() => router.back()} onMenu={undefined} isMutating={false} />
        <ScreenError
          title="読み込めませんでした"
          description={ERR_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  const mediaItems = Array.isArray(post.media) ? post.media : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />
      <DetailHeader
        onBack={() => router.back()}
        onMenu={status !== 'published' ? handleMenu : undefined}
        isMutating={isMutating}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
      >
        {/* ステータスバー */}
        <View style={styles.statusRow}>
          <StatusBadge status={status} />
          <Text style={styles.scheduledAt}>{formatScheduledAt(post.scheduledAt)}</Text>
        </View>

        {/* 投稿内容 */}
        <View style={styles.card}>
          <Text style={styles.content}>{post.content}</Text>
        </View>

        {/* メディア */}
        {mediaItems.length > 0 && (
          <View style={styles.mediaGrid}>
            {mediaItems.map((item, idx) => (
              <Image
                key={`${item.url}-${idx}`}
                source={{ uri: item.url }}
                style={styles.thumbnail}
                contentFit="cover"
                accessibilityLabel={`添付メディア ${idx + 1}`}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// DetailHeader
// ---------------------------------------------------------------------------

type DetailHeaderProps = {
  onBack: () => void;
  onMenu: (() => void) | undefined;
  isMutating: boolean;
};

function DetailHeader({ onBack, onMenu, isMutating }: DetailHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.headerButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>予約投稿の詳細</Text>
      <View style={styles.headerRight}>
        {onMenu !== undefined && (
          isMutating ? (
            <ActivityIndicator size="small" color={colorActionPrimary} />
          ) : (
            <Pressable
              onPress={onMenu}
              accessibilityRole="button"
              accessibilityLabel="操作メニューを開く"
              style={styles.menuButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colorTextSecondary} accessibilityElementsHidden importantForAccessibility="no" />
            </Pressable>
          )
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatScheduledAt(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...textLg,
    color: colorTextPrimary,
  },
  headerRight: {
    minWidth: 60,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing2,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  badge: {
    borderRadius: radiusSm,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  badgeText: {
    ...textXs,
    fontWeight: '600',
  },
  scheduledAt: {
    ...textSm,
    color: colorTextSecondary,
  },
  failedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colorErrorBg,
    borderRadius: radiusSm,
    padding: spacing3,
    gap: spacing2,
  },
  failedText: {
    ...textSm,
    color: colorError,
    flex: 1,
  },
  card: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    ...shadowWashi,
  },
  content: {
    ...textBase,
    color: colorTextPrimary,
    lineHeight: 22,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radiusSm,
  },
});
