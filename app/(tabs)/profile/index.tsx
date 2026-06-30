/**
 * @module app/(tabs)/profile/index
 * 自分のプロフィール画面。
 * プロフィールヘッダーを UserPostsList の ListHeaderComponent として配置し、
 * ユーザーの投稿一覧を無限スクロールで表示する。
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useUserProfileQuery } from '@/lib/queries/users';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { UserPostsList } from '@/components/profile/UserPostsList';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  spacing4,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { ERR_PROFILE_LOAD_FAILED } from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const isOffline = !useOnlineStatus();

  const {
    data: me,
    isLoading: meLoading,
    isError: meError,
    refetch: refetchMe,
  } = useCurrentUserQuery();

  const userId = me?.id ?? '';

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useUserProfileQuery(userId);

  const isLoading = meLoading || (userId.length > 0 && profileLoading);
  const isError = meError || profileError;

  const refetchAll = useCallback(() => {
    void refetchMe();
    void refetchProfile();
  }, [refetchMe, refetchProfile]);

  const renderHeader = (
    <View style={styles.navBar}>
      <Text style={styles.navTitle} accessibilityRole="header">
        プロフィール
      </Text>
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push(routes.settings)}
        accessibilityRole="button"
        accessibilityLabel="設定を開く"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons
          name="settings-outline"
          size={22}
          color={colorTextPrimary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader}
        <ScreenLoading variant="skeleton" skeletonCount={3} />
      </SafeAreaView>
    );
  }

  if (isError || me === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {renderHeader}
        <OfflineBanner isVisible={isOffline} />
        <ScreenError
          description={ERR_PROFILE_LOAD_FAILED}
          onRetry={refetchAll}
        />
      </SafeAreaView>
    );
  }

  // profile が undefined（userId 空やエラー）の場合でも基本情報だけ表示する
  const isPremium = me.isPremium;
  const nickname = profile?.nickname ?? me.nickname;
  const avatarUrl = profile?.avatarUrl ?? me.avatarUrl;
  const headerUrl = profile?.headerUrl ?? null;
  const bio = profile?.bio ?? me.bio;
  const location = profile?.location ?? null;
  const bonsaiStartYear = profile?.bonsaiStartYear ?? null;
  const bonsaiStartMonth = profile?.bonsaiStartMonth ?? null;
  const createdAt = profile?.createdAt ?? new Date().toISOString();
  const isPublic = profile?.isPublic ?? true;
  const postsCount = profile?.postsCount ?? 0;
  const followersCount = profile?.followersCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;

  const profileHeaderComponent = (
    <ProfileHeader
      id={me.id}
      nickname={nickname}
      avatarUrl={avatarUrl}
      headerUrl={headerUrl}
      bio={bio}
      location={location}
      bonsaiStartYear={bonsaiStartYear}
      bonsaiStartMonth={bonsaiStartMonth}
      createdAt={createdAt}
      isPublic={isPublic}
      isPremium={isPremium}
      postsCount={postsCount}
      followersCount={followersCount}
      followingCount={followingCount}
      isSelf
      following={false}
      requested={false}
      currentUserId={me.id}
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {renderHeader}
      <OfflineBanner isVisible={isOffline} />
      <UserPostsList
        userId={me.id}
        currentUserId={me.id}
        ListHeaderComponent={profileHeaderComponent}
        emptyComponent={
          <ScreenEmpty
            iconName="document-text-outline"
            title="まだ投稿がありません"
            description="最初の投稿を作成してみましょう。"
            actionLabel="投稿する"
            onAction={() => router.push(routes.postNew)}
          />
        }
        isOffline={isOffline}
      />
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
  navBar: {
    height: 48,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  navTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    position: 'absolute',
    right: spacing4,
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
