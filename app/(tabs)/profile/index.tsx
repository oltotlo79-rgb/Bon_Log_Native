import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  colorBackground,
  colorSurface,
  colorSurfaceWashi,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  colorActionPrimary,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  textBase,
  textLg,
  textSm,
  letterSpacingWidest,
  radiusFull,
  radiusMd,
  radiusLg,
} from '@/lib/constants/design-tokens';
import { ERR_PROFILE_LOAD_FAILED } from '@/lib/constants/errors';
import { routes } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const AVATAR_SIZE = 72;
const PREMIUM_BADGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProfileScreen() {
  const { data: user, isLoading, isError, refetch } = useCurrentUserQuery();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            プロフィール
          </Text>
          <View style={styles.settingsPlaceholder} />
        </View>
        <ScreenLoading variant="skeleton" skeletonCount={2} />
      </SafeAreaView>
    );
  }

  if (isError || user === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} accessibilityRole="header">
            プロフィール
          </Text>
          <View style={styles.settingsPlaceholder} />
        </View>
        <ScreenError
          description={ERR_PROFILE_LOAD_FAILED}
          onRetry={() => { void refetch(); }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} accessibilityRole="header">
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

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarWrapper}>
            <UserAvatar
              avatarUrl={user.avatarUrl}
              userId={user.id}
              size={AVATAR_SIZE}
              accessibilityLabel={`${user.nickname} のアバター`}
            />

            {user.isPremium && (
              <View
                style={styles.premiumBadge}
                accessibilityLabel="プレミアム会員"
                accessibilityRole="image"
              >
                <Ionicons
                  name="star"
                  size={PREMIUM_BADGE_SIZE * 0.6}
                  color="#ffffff"
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.nickname} accessibilityRole="text">
              {user.nickname}
            </Text>

            {user.isPremium && (
              <View style={styles.premiumLabel}>
                <Text style={styles.premiumLabelText}>プレミアム</Text>
              </View>
            )}

            {user.bio !== null && user.bio !== undefined && user.bio.length > 0 && (
              <Text style={styles.bio} accessibilityRole="text">
                {user.bio}
              </Text>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

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
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  headerTitle: {
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
  settingsPlaceholder: {
    position: 'absolute',
    right: spacing4,
    height: 44,
    width: 44,
  },
  content: {
    flex: 1,
    padding: spacing4,
  },
  profileCard: {
    backgroundColor: colorSurface,
    borderRadius: radiusLg,
    padding: spacing4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing4,
  },
  avatarWrapper: {
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: PREMIUM_BADGE_SIZE,
    height: PREMIUM_BADGE_SIZE,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: spacing2,
  },
  nickname: {
    ...textLg,
    color: colorTextPrimary,
  },
  premiumLabel: {
    alignSelf: 'flex-start',
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
  },
  premiumLabelText: {
    ...textSm,
    color: '#ffffff',
    fontWeight: '600',
  },
  bio: {
    ...textBase,
    color: colorTextSecondary,
    marginTop: spacing2,
  },
  placeholder: {
    ...textLg,
    color: colorTextPrimary,
    marginBottom: spacing6,
  },
});
