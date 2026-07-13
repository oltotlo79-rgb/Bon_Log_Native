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
import { UserAvatar } from '@/components/common/UserAvatar';
import { ReportDialog } from '@/components/report/ReportDialog';
import { REPORT_TARGET_LABELS } from '@/lib/constants/report';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorError,
  colorSurfaceMuted,
  colorSuccess,
  colorSuccessBg,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  radiusFull,
  radiusLg,
  shadowWashi,
  textBase,
  textSm,
  textXs,
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
const AVATAR_SIZE = 20;

// Web 版 formatEventDateTime の date-fns 'E' 相当（日本語曜日短縮形）
const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

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
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isCreator = event !== undefined && currentUser !== undefined
    && event.creator?.id === currentUser.id;
  // 作成者以外のログイン済みユーザーのみ通報導線を出す（自分のイベントは通報対象外）
  const canReport = event !== undefined && currentUser !== undefined && !isCreator;

  const now = new Date();
  const startDate = event !== undefined ? new Date(event.startDate) : null;
  const endDate = event !== undefined && event.endDate != null ? new Date(event.endDate) : null;
  const isEnded = startDate !== null
    ? (endDate != null ? endDate < now : startDate < now)
    : false;
  // 終了日がない単日イベントは「開催中」にしない（Web 版と同じ判定）
  const isOngoing = !isEnded && startDate !== null && startDate <= now && endDate != null && endDate >= now;

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

  const handleOpenReportMenu = useCallback(() => {
    Alert.alert(
      `この${REPORT_TARGET_LABELS.event}を通報しますか？`,
      undefined,
      [
        { text: '通報する', style: 'destructive', onPress: () => setShowReportDialog(true) },
        { text: 'キャンセル', style: 'cancel' },
      ]
    );
  }, []);

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
        onMenuPress={isCreator ? handleOpenMenu : (canReport ? handleOpenReportMenu : undefined)}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing8 }]}
      >
        {/* 開催状態バッジ + イベント名 */}
        <View style={styles.titleSection}>
          {(isEnded || isOngoing || event.hasSales) && (
            <View style={styles.badgeRow}>
              {isEnded && (
                <View style={styles.badgeEnded}>
                  <Text style={styles.badgeEndedText}>終了</Text>
                </View>
              )}
              {isOngoing && (
                <View style={styles.badgeOngoing}>
                  <Text style={styles.badgeOngoingText}>開催中</Text>
                </View>
              )}
              {event.hasSales && (
                <View style={styles.badgeSales}>
                  <Text style={styles.badgeSalesText}>即売あり</Text>
                </View>
              )}
            </View>
          )}
          <Text style={styles.eventTitle}>{event.title}</Text>
        </View>

        {/* 情報セクション */}
        <View style={styles.infoSection}>
          {startDate !== null && (
            <DateTimeInfoRow startDate={startDate} endDate={endDate} />
          )}

          {/* 都道府県・市区町村・会場をまとめて表示（Web 版の分割レイアウトを1行に集約） */}
          {(event.prefecture != null || event.city != null || event.venue != null) && (
            <InfoRow
              iconName="location-outline"
              text={[event.prefecture, event.city, event.venue].filter(Boolean).join(' ')}
            />
          )}

          {event.admissionFee != null && event.admissionFee.length > 0 && (
            <InfoRow iconName="ticket-outline" text={`入場料: ${event.admissionFee}`} />
          )}
          {event.organizer != null && event.organizer.length > 0 && (
            <InfoRow iconName="person-outline" text={`主催: ${event.organizer}`} />
          )}
        </View>

        {/* 説明 */}
        {event.description != null && event.description.length > 0 && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionHeading}>詳細</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        )}

        {/* 外部URL */}
        {event.externalUrl != null && event.externalUrl.length > 0 && (
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

        {/* 登録者情報 */}
        {event.creator != null && (
          <View style={styles.creatorSection}>
            <Text style={styles.creatorLabel}>登録者</Text>
            <View style={styles.creatorRow}>
              <UserAvatar
                avatarUrl={event.creator.avatarUrl}
                userId={event.creator.id}
                size={AVATAR_SIZE}
                accessibilityLabel={`${event.creator.nickname}のアバター`}
              />
              <Text style={styles.creatorNickname}>{event.creator.nickname}</Text>
            </View>
          </View>
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

      {showReportDialog && (
        <ReportDialog
          targetType="event"
          targetId={eventId}
          targetDisplayName={event.title}
          onClose={() => setShowReportDialog(false)}
        />
      )}
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
// DateTimeInfoRow（開始・終了の日時を Web 版同様 2 行で表示）
// ---------------------------------------------------------------------------

type DateTimeInfoRowProps = {
  startDate: Date;
  endDate: Date | null;
};

function DateTimeInfoRow({ startDate, endDate }: DateTimeInfoRowProps) {
  return (
    <View style={styles.dateInfoRow}>
      <Ionicons
        name="calendar-outline"
        size={ICON_SIZE}
        color={colorTextSecondary}
        style={styles.dateInfoIcon}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <View style={styles.dateInfoTextColumn}>
        <Text style={styles.infoText}>{formatEventDateTime(startDate)}</Text>
        {endDate !== null && (
          <Text style={styles.dateInfoEndText}>{`〜 ${formatEventDateTime(endDate)}`}</Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/**
 * 開催日時を Web 版 formatEventDateTime（date-fns 'yyyy年M月d日(E) HH:mm'）と同形式に整形する。
 */
function formatEventDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日(${weekday}) ${hours}:${minutes}`;
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
  titleSection: {
    gap: spacing2,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badgeEnded: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorSurfaceMuted,
  },
  badgeEndedText: {
    ...textXs,
    color: colorTextTertiary,
  },
  badgeOngoing: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorSuccessBg,
  },
  badgeOngoingText: {
    ...textXs,
    color: colorSuccess,
  },
  badgeSales: {
    paddingHorizontal: spacing2,
    paddingVertical: 2,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
  },
  badgeSalesText: {
    ...textXs,
    color: colorActionPrimaryText,
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
  dateInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
  },
  dateInfoIcon: {
    marginTop: 2,
  },
  dateInfoTextColumn: {
    flex: 1,
    gap: 2,
  },
  dateInfoEndText: {
    ...textBase,
    color: colorTextSecondary,
  },
  descriptionSection: {
    gap: spacing2,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing3,
  },
  descriptionHeading: {
    ...textLg,
    color: colorTextPrimary,
  },
  description: {
    ...textBase,
    color: colorTextSecondary,
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
  creatorSection: {
    gap: spacing2,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    paddingTop: spacing3,
  },
  creatorLabel: {
    ...textSm,
    color: colorTextTertiary,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
    minHeight: 44,
  },
  creatorNickname: {
    ...textSm,
    color: colorTextPrimary,
  },
  deleteError: {
    ...textSm,
    color: colorError,
    textAlign: 'center',
  },
});
