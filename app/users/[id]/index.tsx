/**
 * @module app/users/[id]/index
 * 他者プロフィール画面（navigation-structure.md §4.3 準拠）。
 * store-compliance.md の UGC 要件として通報・ブロック・ミュートメニューを提供する。
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfileQuery } from '@/lib/queries/users';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { FollowButton } from '@/components/user/FollowButton';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import { isApiError } from '@/lib/api/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  spacing8,
  radiusFull,
  radiusMd,
  shadowWashi,
  textBase,
  textLg,
  textSm,
  textXl,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_USER_NOT_FOUND,
  ERR_PROFILE_LOAD_FAILED,
  ERR_NOT_FOUND,
} from '@/lib/constants/errors';
import { ROUTE_SETTINGS_PROFILE } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 64;
const HEADER_IMAGE_HEIGHT = 120;

// ---------------------------------------------------------------------------
// プロフィールヘッダーコンポーネント
// ---------------------------------------------------------------------------

type ProfileHeaderProps = {
  avatarUrl: string | null;
  headerUrl: string | null;
  nickname: string;
  bio: string | null;
  location: string | null;
  bonsaiStartYear: number | null;
  bonsaiStartMonth: number | null;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isSelf: boolean;
  following: boolean;
  requested: boolean;
  isPublic: boolean;
  targetUserId: string;
  currentUserId: string | undefined;
};

function ProfileHeader({
  avatarUrl,
  headerUrl,
  nickname,
  bio,
  location,
  bonsaiStartYear,
  bonsaiStartMonth,
  postsCount,
  followersCount,
  followingCount,
  isSelf,
  following,
  requested,
  isPublic,
  targetUserId,
  currentUserId,
}: ProfileHeaderProps) {
  const bonsaiStartLabel =
    bonsaiStartYear !== null
      ? bonsaiStartMonth !== null
        ? `${bonsaiStartYear}年${bonsaiStartMonth}月から盆栽`
        : `${bonsaiStartYear}年から盆栽`
      : null;

  return (
    <View style={styles.profileHeader}>
      {/* カバー画像 */}
      {headerUrl !== null ? (
        <Image
          source={{ uri: headerUrl }}
          style={styles.headerImage}
          contentFit="cover"
          accessibilityLabel={`${nickname}のカバー画像`}
          accessibilityRole="image"
        />
      ) : (
        <View style={[styles.headerImage, styles.headerImageFallback]} />
      )}

      {/* アバター */}
      <View style={styles.avatarRow}>
        {avatarUrl !== null ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            contentFit="cover"
            accessibilityLabel={`${nickname}のプロフィール画像`}
            accessibilityRole="image"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>{nickname.charAt(0)}</Text>
          </View>
        )}
      </View>

      <View style={styles.profileInfo}>
        <Text style={styles.nickname}>{nickname}</Text>

        {bio !== null && bio.length > 0 && (
          <Text style={styles.bio}>{bio}</Text>
        )}

        {location !== null && location.length > 0 && (
          <Text style={styles.meta}>{location}</Text>
        )}

        {bonsaiStartLabel !== null && (
          <Text style={styles.meta}>{bonsaiStartLabel}</Text>
        )}

        {/* フォロワー・フォロー数 */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{postsCount}</Text>
            <Text style={styles.statLabel}>投稿</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{followersCount}</Text>
            <Text style={styles.statLabel}>フォロワー</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statCount}>{followingCount}</Text>
            <Text style={styles.statLabel}>フォロー中</Text>
          </View>
        </View>

        {/* フォローボタン or 編集ボタン（自分のとき）— 設計 §2.5 / §4.1 */}
        <View style={styles.actionRow}>
          {isSelf ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(ROUTE_SETTINGS_PROFILE)}
              accessibilityRole="button"
              accessibilityLabel="プロフィールを編集"
            >
              <Text style={styles.editButtonText}>プロフィールを編集</Text>
            </TouchableOpacity>
          ) : (
            <FollowButton
              targetUserId={targetUserId}
              isPublic={isPublic}
              following={following}
              requested={requested}
              currentUserId={currentUserId}
              size="default"
              targetNickname={nickname}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function UserDetailScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];
  const isOffline = !useOnlineStatus();

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>← 戻る</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            プロフィール
          </Text>
          <View style={styles.menuPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ERR_USER_NOT_FOUND}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
            style={styles.backButtonAlt}
          >
            <Text style={styles.backButtonAltText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userId = rawId;

  return <UserDetailContent userId={userId} isOffline={isOffline} />;
}

// ---------------------------------------------------------------------------
// データ取得コンポーネント（id が確定してから mount）
// ---------------------------------------------------------------------------

type UserDetailContentProps = {
  userId: string;
  isOffline: boolean;
};

function UserDetailContent({ userId, isOffline }: UserDetailContentProps) {
  const { data, isLoading, isError, error, refetch } = useUserProfileQuery(userId);
  const { data: me } = useCurrentUserQuery();
  const currentUserId = me?.id;

  const [menuVisible, setMenuVisible] = useState(false);

  const renderHeader = (title: string, showMenu: boolean, isSelf: boolean) => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
      >
        <Text style={styles.backButtonText}>← 戻る</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle} accessibilityRole="header">
        {title}
      </Text>
      {showMenu && !isSelf ? (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="メニューを開く"
        >
          <Ionicons name="ellipsis-vertical" size={spacing5} color={colorTextPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.menuPlaceholder} />
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader('プロフィール', false, false)}
        <ScreenLoading variant="skeleton" skeletonCount={2} />
      </SafeAreaView>
    );
  }

  if (isError) {
    const isNotFound = isApiError(error) && error.code === 'NOT_FOUND';
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader('プロフィール', false, false)}
        <OfflineBanner isVisible={isOffline} />
        <ScreenError
          title={isNotFound ? 'ユーザーが見つかりません' : '読み込めませんでした'}
          description={isNotFound ? ERR_NOT_FOUND : ERR_PROFILE_LOAD_FAILED}
          onRetry={() => void refetch()}
          debugMessage={debugMsg}
        />
      </SafeAreaView>
    );
  }

  if (data === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader('プロフィール', false, false)}
        <ScreenError
          title="読み込めませんでした"
          description={ERR_PROFILE_LOAD_FAILED}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />
      {renderHeader(data.nickname, true, data.isSelf)}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <ProfileHeader
          avatarUrl={data.avatarUrl}
          headerUrl={data.headerUrl}
          nickname={data.nickname}
          bio={data.bio}
          location={data.location}
          bonsaiStartYear={data.bonsaiStartYear}
          bonsaiStartMonth={data.bonsaiStartMonth}
          postsCount={data.postsCount}
          followersCount={data.followersCount}
          followingCount={data.followingCount}
          isSelf={data.isSelf}
          following={data.following}
          requested={data.requested}
          isPublic={data.isPublic}
          targetUserId={userId}
          currentUserId={currentUserId}
        />
      </ScrollView>

      {menuVisible && !data.isSelf && (
        <UserActionMenu
          targetUserId={userId}
          targetUserNickname={data.nickname}
          isOwnContent={data.isSelf}
          contentType="user"
          contentId={userId}
          isBlocked={data.isBlocked}
          isMuted={data.isMuted}
          onClose={() => setMenuVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  header: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    ...textBase,
    color: colorTextPrimary,
  },
  menuButton: {
    minWidth: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuPlaceholder: {
    minWidth: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing8,
  },
  profileHeader: {
    backgroundColor: colorSurface,
    marginBottom: spacing4,
    ...shadowWashi,
  },
  headerImage: {
    width: '100%',
    height: HEADER_IMAGE_HEIGHT,
  },
  headerImageFallback: {
    backgroundColor: colorSurfaceMuted,
  },
  avatarRow: {
    paddingHorizontal: spacing4,
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: spacing3,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: radiusFull,
    borderWidth: 2,
    borderColor: colorBackground,
  },
  avatarFallback: {
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    ...textXl,
    color: colorTextSecondary,
  },
  profileInfo: {
    paddingHorizontal: spacing4,
    paddingBottom: spacing4,
    gap: spacing2,
  },
  nickname: {
    ...textLg,
    color: colorTextPrimary,
  },
  bio: {
    ...textBase,
    color: colorTextPrimary,
  },
  meta: {
    ...textSm,
    color: colorTextSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing3,
    gap: spacing6,
  },
  statItem: {
    alignItems: 'center',
  },
  statCount: {
    ...textBase,
    color: colorTextPrimary,
    fontWeight: '700',
  },
  statLabel: {
    ...textSm,
    color: colorTextSecondary,
  },
  actionRow: {
    marginTop: spacing4,
    flexDirection: 'row',
  },
  editButton: {
    minWidth: 120,
    height: 44,
    borderRadius: radiusMd,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing3,
  },
  editButtonText: {
    ...textBase,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
    gap: spacing4,
  },
  errorText: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  backButtonAlt: {
    minHeight: 44,
    paddingHorizontal: spacing4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonAltText: {
    ...textBase,
    color: colorTextPrimary,
  },
});
