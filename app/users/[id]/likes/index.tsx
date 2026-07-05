/**
 * @module app/users/[id]/likes/index
 * いいねした投稿一覧画面。プロフィール統計「いいね」タップの遷移先
 * （Web版 app/(main)/users/[id]/likes/page.tsx 相当）。
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserProfileQuery } from '@/lib/queries/users';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { UserLikedPostsList } from '@/components/profile/UserLikedPostsList';
import { ScreenNavBar } from '@/components/common/ScreenNavBar';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import {
  colorBackground,
  colorTextPrimary,
  spacing4,
  textBase,
} from '@/lib/constants/design-tokens';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function UserLikesScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenNavBar title="いいね" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ERR_USER_NOT_FOUND}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <UserLikesContent userId={rawId} />;
}

// ---------------------------------------------------------------------------
// データ取得コンポーネント（id が確定してから mount）
// ---------------------------------------------------------------------------

type UserLikesContentProps = {
  userId: string;
};

function UserLikesContent({ userId }: UserLikesContentProps) {
  const isOffline = !useOnlineStatus();
  const { data: profile } = useUserProfileQuery(userId);
  const { data: me } = useCurrentUserQuery();

  const title = profile !== undefined ? `${profile.nickname}のいいね` : 'いいね';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />
      <ScreenNavBar title={title} />
      <UserLikedPostsList userId={userId} currentUserId={me?.id} />
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing4,
  },
  errorText: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
});
