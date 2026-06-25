/**
 * @module app/explore/index
 * 発見画面。トレンドタグ・ジャンル・おすすめユーザーを表示する。
 * 仕様: docs/design/browse-screens.md §1
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useTrendingHashtagsQuery,
  useTrendingGenresQuery,
  useRecommendedUsersQuery,
  type TrendingHashtagsResponse,
  type TrendingGenresResponse,
  type RecommendedUsersResponse,
} from '@/lib/queries/explore';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ScreenError } from '@/components/common/ScreenError';
import { UserAvatar } from '@/components/common/UserAvatar';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { FollowButton } from '@/components/user/FollowButton';
import { routeUserDetail, routeExplorePostsByHashtag, routeExplorePostsByGenre } from '@/lib/constants/routes';
import { ERR_EXPLORE_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  colorActionPrimaryText,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  spacing8,
  radiusFull,
  radiusMd,
  textMd,
  textSm,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 44;
const CHEVRON_SIZE = 16;
const CHIP_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 } as const;

// ---------------------------------------------------------------------------
// タグチップ
// ---------------------------------------------------------------------------

type TagItem = TrendingHashtagsResponse['items'][number];

type TagChipProps = {
  item: TagItem;
};

const TagChip = memo(function TagChip({ item }: TagChipProps) {
  const handlePress = useCallback(() => {
    router.push(routeExplorePostsByHashtag(item.name));
  }, [item.name]);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`#${item.name}の投稿を見る（${item.count}件）`}
    >
      <Text style={styles.chipName}>#{item.name}</Text>
      <Text style={styles.chipCount}>（{item.count}件）</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// ジャンルチップ
// ---------------------------------------------------------------------------

type GenreItem = TrendingGenresResponse['items'][number];

type GenreChipProps = {
  item: GenreItem;
};

const GenreChip = memo(function GenreChip({ item }: GenreChipProps) {
  const handlePress = useCallback(() => {
    router.push(routeExplorePostsByGenre(item.id));
  }, [item.id]);

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}の投稿を見る（${item.postCount}件）`}
    >
      <Text style={styles.chipName}>{item.name}</Text>
      <Text style={styles.chipCount}>（{item.postCount}件）</Text>
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// セクション見出し
// ---------------------------------------------------------------------------

type ExploreSectionHeaderProps = {
  title: string;
};

function ExploreSectionHeader({ title }: ExploreSectionHeaderProps) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {title}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// おすすめユーザー行
// ---------------------------------------------------------------------------

type RecommendedUser = RecommendedUsersResponse['items'][number];

type RecommendedUserRowProps = {
  user: RecommendedUser;
  currentUserId: string | undefined;
};

const RecommendedUserRow = memo(function RecommendedUserRow({
  user,
  currentUserId,
}: RecommendedUserRowProps) {
  const handlePress = useCallback(() => {
    router.push(routeUserDetail(user.id));
  }, [user.id]);

  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${user.nickname}のプロフィールを見る`}
    >
      <UserAvatar
        avatarUrl={user.avatarUrl}
        userId={user.id}
        size={AVATAR_SIZE}
        accessibilityLabel={`${user.nickname}のプロフィール画像`}
      />

      <View style={styles.userInfo}>
        <Text style={styles.userNickname} numberOfLines={1}>
          {user.nickname}
        </Text>
        {user.bio !== null && user.bio !== undefined && user.bio.length > 0 && (
          <Text style={styles.userBio} numberOfLines={1}>
            {user.bio}
          </Text>
        )}
        <Text style={styles.userFollowers}>{user.followersCount}人がフォロー中</Text>
      </View>

      <FollowButton
        targetUserId={user.id}
        isPublic={user.isPublic}
        following={user.following}
        requested={user.requested}
        currentUserId={currentUserId}
        size="compact"
        targetNickname={user.nickname}
      />
    </TouchableOpacity>
  );
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function ExploreScreen() {
  const isOnline = useOnlineStatus();
  const { data: currentUser } = useCurrentUserQuery();

  const hashtagsQuery = useTrendingHashtagsQuery();
  const genresQuery = useTrendingGenresQuery();
  const usersQuery = useRecommendedUsersQuery();

  const isRefreshing =
    hashtagsQuery.isFetching || genresQuery.isFetching || usersQuery.isFetching;

  const handleRefresh = useCallback(() => {
    void hashtagsQuery.refetch();
    void genresQuery.refetch();
    void usersQuery.refetch();
  }, [hashtagsQuery, genresQuery, usersQuery]);

  const renderUserItem = useCallback(
    ({ item }: { item: RecommendedUser }) => (
      <RecommendedUserRow user={item} currentUserId={currentUser?.id} />
    ),
    [currentUser?.id]
  );

  const userKeyExtractor = useCallback((item: RecommendedUser) => item.id, []);

  const hashtags = hashtagsQuery.data?.items ?? [];
  const genres = genresQuery.data?.items ?? [];
  const users = usersQuery.data?.items ?? [];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <OfflineBanner isVisible={!isOnline} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="戻る"
        >
          <Ionicons name="chevron-back" size={24} color={colorTextPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} accessibilityRole="header">
          発見
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colorActionPrimary}
          />
        }
      >
        {/* セクション 1: トレンドタグ */}
        {(hashtagsQuery.isLoading || hashtags.length > 0 || hashtagsQuery.isError) && (
          <View style={styles.section}>
            <ExploreSectionHeader title="トレンド" />
            {hashtagsQuery.isLoading ? (
              <ActivityIndicator
                size="small"
                color={colorActionPrimary}
                style={styles.sectionSpinner}
              />
            ) : hashtagsQuery.isError ? (
              <ScreenError
                description={ERR_EXPLORE_LOAD_FAILED}
                onRetry={() => void hashtagsQuery.refetch()}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {hashtags.map((tag: TagItem) => (
                  <TagChip key={tag.id} item={tag} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* セクション 2: トレンドジャンル */}
        {(genresQuery.isLoading || genres.length > 0 || genresQuery.isError) && (
          <View style={styles.section}>
            <ExploreSectionHeader title="ジャンル" />
            {genresQuery.isLoading ? (
              <ActivityIndicator
                size="small"
                color={colorActionPrimary}
                style={styles.sectionSpinner}
              />
            ) : genresQuery.isError ? (
              <ScreenError
                description={ERR_EXPLORE_LOAD_FAILED}
                onRetry={() => void genresQuery.refetch()}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {genres.map((genre: GenreItem) => (
                  <GenreChip key={genre.id} item={genre} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* セクション 3: おすすめユーザー */}
        <View style={styles.section}>
          <ExploreSectionHeader title="おすすめユーザー" />
          {usersQuery.isLoading ? (
            <ActivityIndicator
              size="small"
              color={colorActionPrimary}
              style={styles.sectionSpinner}
            />
          ) : usersQuery.isError ? (
            <ScreenError
              description={ERR_EXPLORE_LOAD_FAILED}
              onRetry={() => void usersQuery.refetch()}
            />
          ) : users.length === 0 ? (
            <ScreenEmpty
              iconName="people-outline"
              title="おすすめユーザーはいません"
              description="しばらくしてから再度お試しください"
            />
          ) : (
            <View style={styles.userListContainer}>
              <FlatList
                data={users}
                keyExtractor={userKeyExtractor}
                renderItem={renderUserItem}
                scrollEnabled={false}
              />
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingHorizontal: spacing2,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing4,
    paddingTop: spacing4,
    paddingBottom: spacing8,
    gap: spacing6,
  },
  section: {
    gap: spacing3,
  },
  sectionTitle: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  sectionSpinner: {
    marginVertical: spacing4,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: spacing2,
    paddingVertical: spacing2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSurface,
    borderWidth: 1,
    borderColor: colorBorderLight,
    borderRadius: radiusFull,
    paddingHorizontal: spacing4,
    paddingVertical: spacing2,
    gap: spacing2,
  },
  chipName: {
    ...textSm,
    color: colorTextPrimary,
  },
  chipCount: {
    ...textSm,
    color: colorTextSecondary,
  },
  userListContainer: {
    borderRadius: radiusMd,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colorBorderLight,
    backgroundColor: colorSurface,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    gap: spacing3,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  userNickname: {
    ...textMd,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  userBio: {
    ...textSm,
    color: colorTextSecondary,
  },
  userFollowers: {
    ...textSm,
    color: colorTextSecondary,
  },
  chevronIcon: {
    marginLeft: spacing2,
  },
});

// 未使用変数の警告を避けるために型チェックのみ使用する参照
void (colorActionPrimaryText satisfies string);
void (CHEVRON_SIZE satisfies number);
