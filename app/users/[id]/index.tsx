/**
 * @module app/users/[id]/index
 * 他者プロフィール画面。
 * プロフィールヘッダーを UserPostsList の ListHeaderComponent として配置し、
 * ユーザーの投稿一覧を無限スクロールで表示する。
 * store-compliance.md の UGC 要件として通報・ブロック・ミュートメニューを提供する。
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserProfileQuery } from '@/lib/queries/users';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useStartConversationMutation } from '@/lib/queries/messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { UserActionMenu } from '@/components/user/UserActionMenu';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { UserPostsList } from '@/components/profile/UserPostsList';
import { isApiError } from '@/lib/api/errors';
import { routeMessageThread } from '@/lib/constants/routes';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  spacing4,
  textBase,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_USER_NOT_FOUND,
  ERR_PROFILE_LOAD_FAILED,
  ERR_NOT_FOUND,
} from '@/lib/constants/errors';

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
        <NavBar title="プロフィール" showMenu={false} onMenuPress={undefined} />
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

  return <UserDetailContent userId={rawId} isOffline={isOffline} />;
}

// ---------------------------------------------------------------------------
// ナビゲーションバー
// ---------------------------------------------------------------------------

type NavBarProps = {
  title: string;
  showMenu: boolean;
  onMenuPress: (() => void) | undefined;
};

function NavBar({ title, showMenu, onMenuPress }: NavBarProps) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="戻る"
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={colorTextPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
      <Text style={styles.navTitle} accessibilityRole="header">
        {title}
      </Text>
      {showMenu && onMenuPress !== undefined ? (
        <TouchableOpacity
          style={styles.menuButton}
          onPress={onMenuPress}
          accessibilityRole="button"
          accessibilityLabel="メニューを開く"
        >
          <Ionicons
            name="ellipsis-vertical"
            size={22}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </TouchableOpacity>
      ) : (
        <View style={styles.menuPlaceholder} />
      )}
    </View>
  );
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
  const { mutate: startConversation, isPending: isStartingConversation } =
    useStartConversationMutation();

  const [menuVisible, setMenuVisible] = useState(false);

  const handleRefetch = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenMenu = useCallback(() => {
    setMenuVisible(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  const handleMessagePress = useCallback(() => {
    if (isStartingConversation) return;
    startConversation(
      { targetUserId: userId },
      {
        onSuccess: (result) => {
          router.push(routeMessageThread(result.conversationId));
        },
      }
    );
  }, [userId, startConversation, isStartingConversation]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="プロフィール" showMenu={false} onMenuPress={undefined} />
        <ScreenLoading variant="skeleton" skeletonCount={3} />
      </SafeAreaView>
    );
  }

  if (isError) {
    const isNotFound = isApiError(error) && error.code === 'NOT_FOUND';
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="プロフィール" showMenu={false} onMenuPress={undefined} />
        <OfflineBanner isVisible={isOffline} />
        <ScreenError
          title={isNotFound ? 'ユーザーが見つかりません' : '読み込めませんでした'}
          description={isNotFound ? ERR_NOT_FOUND : ERR_PROFILE_LOAD_FAILED}
          onRetry={handleRefetch}
          debugMessage={debugMsg}
        />
      </SafeAreaView>
    );
  }

  if (data === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="プロフィール" showMenu={false} onMenuPress={undefined} />
        <ScreenError
          title="読み込めませんでした"
          description={ERR_PROFILE_LOAD_FAILED}
          onRetry={handleRefetch}
        />
      </SafeAreaView>
    );
  }

  const showMenu = !data.isSelf && currentUserId !== undefined;
  // 他者のプロフィールかつログイン済みの場合のみメッセージボタンを表示する
  const showMessageButton = !data.isSelf && currentUserId !== undefined;

  const profileHeaderComponent = (
    <ProfileHeader
      id={userId}
      nickname={data.nickname}
      avatarUrl={data.avatarUrl}
      headerUrl={data.headerUrl}
      bio={data.bio}
      location={data.location}
      bonsaiStartYear={data.bonsaiStartYear}
      bonsaiStartMonth={data.bonsaiStartMonth}
      createdAt={data.createdAt}
      isPublic={data.isPublic}
      isPremium={false}
      postsCount={data.postsCount}
      followersCount={data.followersCount}
      followingCount={data.followingCount}
      isSelf={data.isSelf}
      following={data.following}
      requested={data.requested}
      currentUserId={currentUserId}
      onOpenMenu={showMenu ? handleOpenMenu : undefined}
      onMessagePress={showMessageButton ? handleMessagePress : undefined}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />
      <NavBar
        title={data.nickname}
        showMenu={showMenu}
        onMenuPress={showMenu ? handleOpenMenu : undefined}
      />
      <UserPostsList
        userId={userId}
        currentUserId={currentUserId}
        ListHeaderComponent={profileHeaderComponent}
        emptyComponent={
          data.isPublic || data.isSelf || data.following ? (
            <ScreenEmpty
              iconName="document-text-outline"
              title="まだ投稿がありません"
            />
          ) : (
            <PrivateAccountNotice />
          )
        }
        isOffline={isOffline}
      />

      {menuVisible && !data.isSelf && (
        <UserActionMenu
          targetUserId={userId}
          targetUserNickname={data.nickname}
          isOwnContent={data.isSelf}
          contentType="user"
          contentId={userId}
          isBlocked={data.isBlocked}
          isMuted={data.isMuted}
          onClose={handleCloseMenu}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// 非公開アカウント通知
// ---------------------------------------------------------------------------

function PrivateAccountNotice() {
  return (
    <View style={styles.privateNotice}>
      <Ionicons
        name="lock-closed-outline"
        size={32}
        color={colorTextPrimary}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <Text style={styles.privateNoticeTitle}>このアカウントは非公開です</Text>
      <Text style={styles.privateNoticeDesc}>
        フォローリクエストが承認されると、投稿を閲覧できるようになります。
      </Text>
    </View>
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
  navBar: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  navTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuPlaceholder: {
    width: 44,
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
    color: colorTextPrimary,
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
  privateNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4 * 2,
    gap: spacing4,
  },
  privateNoticeTitle: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  privateNoticeDesc: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
});
