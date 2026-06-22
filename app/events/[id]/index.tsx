/**
 * @module app/events/[id]/index
 * イベント詳細画面。作成者のみ編集・削除メニューを表示する。
 * 仕様: docs/design/events.md §3
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { useEventDetailQuery, useDeleteEventMutation } from '@/lib/queries/events';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { Toast } from '@/components/common/Toast';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorError,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusLg,
  shadowWashi,
  textBase,
  textSm,
  textLg,
  textXl,
} from '@/lib/constants/design-tokens';
import { routeEventEdit } from '@/lib/constants/routes';
import {
  ERR_EVENT_DELETE_FAILED,
  ERR_OFFLINE_ACTION,
  ERR_NOT_FOUND,
  ERR_FORBIDDEN,
} from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_SIZE = 18;

// ---------------------------------------------------------------------------
// 型ガード
// ---------------------------------------------------------------------------

function getIdParam(params: Record<string, string | string[] | undefined>): string {
  const id = params['id'];
  if (typeof id === 'string' && id.length > 0) return id;
  return '';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();
  const isOnline = useOnlineStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const eventId = getIdParam(params);

  const { data: event, isLoading, isError, error, refetch } = useEventDetailQuery(eventId);
  const { data: currentUser } = useCurrentUserQuery();
  const { mutate: deleteEvent } = useDeleteEventMutation();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isCreator = event !== undefined && currentUser !== undefined
    && event.creator?.id === currentUser.id;

  const handleDelete = useCallback(() => {
    Alert.alert(
      'このイベントを削除しますか？',
      '削除したイベントは復元できません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            if (!isOnline) {
              setDeleteError(ERR_OFFLINE_ACTION);
              return;
            }
            deleteEvent(
              { id: eventId },
              {
                onSuccess: () => {
                  router.replace({ pathname: '/events' });
                },
                onError: () => {
                  setDeleteError(ERR_EVENT_DELETE_FAILED);
                },
              }
            );
          },
        },
      ]
    );
  }, [eventId, isOnline, deleteEvent]);

  const handleOpenMenu = useCallback(() => {
    Alert.alert(
      'イベントのメニュー',
      undefined,
      [
        { text: '編集する', onPress: () => router.push(routeEventEdit(eventId)) },
        {
          text: '削除する',
          style: 'destructive',
          onPress: handleDelete,
        },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  }, [eventId, handleDelete]);

  const handleOpenExternalUrl = useCallback(async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      Sentry.captureException(err);
    }
  }, []);

  if (eventId.length === 0 || (isError && isNotFoundError(error))) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader title="イベント詳細" onMenuPress={undefined} />
        <ScreenError title="イベントが見つかりません" description={ERR_NOT_FOUND} onRetry={() => router.back()} retryLabel="戻る" />
      </View>
    );
  }

  if (isError && isForbiddenError(error)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader title="イベント詳細" onMenuPress={undefined} />
        <ScreenError title="閲覧できません" description={ERR_FORBIDDEN} onRetry={() => router.back()} retryLabel="戻る" />
      </View>
    );
  }

  if (isLoading || event === undefined) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader title="イベント詳細" onMenuPress={undefined} />
        <ScreenLoading variant="spinner" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <DetailHeader title="イベント詳細" onMenuPress={undefined} />
        <ScreenError title="読み込めませんでした" onRetry={() => void refetch()} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OfflineBanner isVisible={!isOnline} />

      <DetailHeader
        title="イベント詳細"
        onMenuPress={isCreator ? handleOpenMenu : undefined}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
      >
        {/* イベント名 */}
        <Text style={styles.eventTitle}>{event.title}</Text>

        {/* 情報セクション */}
        <View style={styles.infoSection}>
          <InfoRow iconName="calendar-outline" text={formatDateRange(event.startDate, event.endDate)} />
          {event.venue !== undefined && event.venue !== null && event.venue.length > 0 && (
            <InfoRow iconName="location-outline" text={event.venue} />
          )}
          {event.prefecture !== undefined && event.prefecture !== null && event.prefecture.length > 0 && (
            <InfoRow iconName="map-outline" text={event.prefecture} />
          )}
          <InfoRow
            iconName="ticket-outline"
            text={event.admissionFee !== undefined && event.admissionFee !== null && event.admissionFee.length > 0
              ? event.admissionFee
              : '無料'
            }
          />
          {event.organizer !== undefined && event.organizer !== null && event.organizer.length > 0 && (
            <InfoRow iconName="person-outline" text={`主催: ${event.organizer}`} />
          )}
        </View>

        {/* 説明 */}
        {event.description !== undefined && event.description !== null && event.description.length > 0 && (
          <Text style={styles.description}>{event.description}</Text>
        )}

        {/* 外部URL */}
        {event.externalUrl !== undefined && event.externalUrl !== null && event.externalUrl.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.externalLinkRow, pressed && styles.externalLinkPressed, shadowWashi]}
            onPress={() => void handleOpenExternalUrl(event.externalUrl ?? '')}
            accessibilityRole="link"
            accessibilityLabel="詳細ページを開く（外部リンク）"
          >
            <Ionicons
              name="link-outline"
              size={ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.externalLinkText}>詳細ページを見る</Text>
            <Ionicons
              name="open-outline"
              size={ICON_SIZE}
              color={colorTextTertiary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Pressable>
        )}

        {/* 削除エラー */}
        {deleteError !== null && (
          <Text style={styles.deleteError}>{deleteError}</Text>
        )}
      </ScrollView>

      <Toast
        message={toastMessage ?? ''}
        visible={toastMessage !== null}
        onHide={() => setToastMessage(null)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// DetailHeader
// ---------------------------------------------------------------------------

type DetailHeaderProps = {
  title: string;
  onMenuPress?: () => void;
};

function DetailHeader({ title, onMenuPress }: DetailHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
        style={styles.backButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.backButtonText}>‹ 戻る</Text>
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onMenuPress !== undefined ? (
        <Pressable
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="イベントのメニューを開く"
          style={styles.menuButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={colorTextSecondary} />
        </Pressable>
      ) : (
        <View style={styles.headerRight} />
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// InfoRow
// ---------------------------------------------------------------------------

type InfoRowProps = {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  text: string;
};

function InfoRow({ iconName, text }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons
        name={iconName}
        size={ICON_SIZE}
        color={colorTextSecondary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

function formatDateRange(startDate: string, endDate?: string | null): string {
  const start = new Date(startDate);
  const startStr = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
  if (endDate === undefined || endDate === null) return startStr;
  const end = new Date(endDate);
  const endStr = `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
  return `${startStr} 〜 ${endStr}`;
}

function isNotFoundError(error: Error | null): boolean {
  if (error === null) return false;
  return error.message.includes('404') || error.message.includes('NOT_FOUND');
}

function isForbiddenError(error: Error | null): boolean {
  if (error === null) return false;
  return error.message.includes('403') || error.message.includes('FORBIDDEN');
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
  backButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
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
  },
  menuButton: {
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    gap: spacing4,
  },
  eventTitle: {
    ...textXl,
    color: colorTextPrimary,
  },
  infoSection: {
    gap: spacing2,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    paddingVertical: spacing3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
  },
  infoText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  description: {
    ...textBase,
    color: colorTextPrimary,
    paddingTop: spacing2,
  },
  externalLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingVertical: spacing3,
    paddingHorizontal: spacing4,
    borderRadius: radiusLg,
    backgroundColor: colorSurfaceWashi,
    minHeight: 44,
  },
  externalLinkPressed: {
    opacity: 0.75,
  },
  externalLinkText: {
    ...textBase,
    color: colorTextPrimary,
    flex: 1,
  },
  deleteError: {
    ...textSm,
    color: colorError,
    textAlign: 'center',
  },
});
