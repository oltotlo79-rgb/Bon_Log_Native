/**
 * @module app/users/[id]/followers/index
 * フォロワー一覧画面。プロフィール統計「フォロワー」タップの遷移先
 * （Web版 app/(main)/users/[id]/followers/page.tsx 相当）。
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserFollowersQuery } from '@/lib/queries/follows';
import { useUserProfileQuery } from '@/lib/queries/users';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { UserConnectionsListView } from '@/components/user/UserConnectionsListView';
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
// 定数
// ---------------------------------------------------------------------------

const PRIVATE_NOTICE_DESCRIPTION =
  'フォローリクエストが承認されると、フォロワー一覧を確認できるようになります。';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function UserFollowersScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenNavBar title="フォロワー" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{ERR_USER_NOT_FOUND}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return <UserFollowersContent userId={rawId} />;
}

// ---------------------------------------------------------------------------
// データ取得コンポーネント（id が確定してから mount）
// ---------------------------------------------------------------------------

type UserFollowersContentProps = {
  userId: string;
};

function UserFollowersContent({ userId }: UserFollowersContentProps) {
  const isOffline = !useOnlineStatus();
  const { data: profile } = useUserProfileQuery(userId);
  const { data: me } = useCurrentUserQuery();
  const query = useUserFollowersQuery(userId);

  const title = profile !== undefined ? `${profile.nickname}のフォロワー` : 'フォロワー';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={isOffline} />
      <ScreenNavBar title={title} />
      <UserConnectionsListView
        query={query}
        currentUserId={me?.id}
        emptyTitle="フォロワーはいません"
        privateNoticeDescription={PRIVATE_NOTICE_DESCRIPTION}
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
