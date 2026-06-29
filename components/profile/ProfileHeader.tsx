/**
 * @module components/profile/ProfileHeader
 * Web 版 ProfileHeader（components/user/ProfileHeader.tsx）のモバイル移植版。
 * カバー画像 / アバター / ニックネーム / プレミアム&非公開バッジ /
 * bio / location / 盆栽歴 / 参加日 / 統計(投稿・フォロー中・フォロワー) /
 * 編集ボタン(自分) またはフォロー+通報・ブロック(他人) を含む。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { UserAvatar } from '@/components/common/UserAvatar';
import { FollowButton } from '@/components/user/FollowButton';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorActionPrimary,
  colorActionSecondary,
  colorActionSecondaryText,
  colorBorder,
  spacing2,
  spacing3,
  spacing4,
  spacing5,
  spacing6,
  radiusFull,
  radiusMd,
  radiusLg,
  shadowWashi,
  textBase,
  textLg,
  textXl,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';
import { ROUTE_SETTINGS_PROFILE } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const COVER_HEIGHT = 120;
const AVATAR_SIZE = 80;
const AVATAR_BORDER_WIDTH = 3;

// アバターが上にはみ出す量
const AVATAR_OVERLAP = AVATAR_SIZE / 2;

// ---------------------------------------------------------------------------
// 盆栽歴計算（Web版 profile-utils.ts と同一ロジック）
// ---------------------------------------------------------------------------

function calculateBonsaiExperience(
  startYear: number | null,
  startMonth: number | null
): string | null {
  if (startYear === null) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const startMonthNum = startMonth ?? 1;

  let years = currentYear - startYear;
  let months = currentMonth - startMonthNum;

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return null;
  if (years === 0) {
    if (months === 0) return '1ヶ月未満';
    return `${months}ヶ月`;
  }
  if (months === 0) return `${years}年`;
  return `${years}年${months}ヶ月`;
}

function formatJoinDate(createdAt: string): string {
  const d = new Date(createdAt);
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ProfileHeaderProps = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  headerUrl: string | null;
  bio: string | null;
  location: string | null;
  bonsaiStartYear: number | null;
  bonsaiStartMonth: number | null;
  createdAt: string;
  isPublic: boolean;
  isPremium: boolean;
  postsCount: number;
  followersCount: number;
  followingCount: number;
  isSelf: boolean;
  following: boolean;
  requested: boolean;
  currentUserId: string | undefined;
  onOpenMenu?: () => void;
};

// ---------------------------------------------------------------------------
// StatItem
// ---------------------------------------------------------------------------

type StatItemProps = {
  count: number;
  label: string;
};

function StatItem({ count, label }: StatItemProps) {
  return (
    <View style={styles.statItem} accessibilityRole="text">
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ProfileHeaderInner({
  id,
  nickname,
  avatarUrl,
  headerUrl,
  bio,
  location,
  bonsaiStartYear,
  bonsaiStartMonth,
  createdAt,
  isPublic,
  isPremium,
  postsCount,
  followersCount,
  followingCount,
  isSelf,
  following,
  requested,
  currentUserId,
  onOpenMenu,
}: ProfileHeaderProps) {
  const bonsaiExperience = calculateBonsaiExperience(bonsaiStartYear, bonsaiStartMonth);
  const joinDate = formatJoinDate(createdAt);

  return (
    <View style={styles.container}>
      {/* カバー画像エリア */}
      <View style={styles.coverWrapper}>
        {headerUrl !== null ? (
          <Image
            source={{ uri: headerUrl }}
            style={styles.cover}
            contentFit="cover"
            accessibilityLabel={`${nickname}のカバー画像`}
            accessibilityRole="image"
          />
        ) : (
          <View style={[styles.cover, styles.coverFallback]} accessibilityElementsHidden />
        )}
      </View>

      {/* アバター + アクションボタン行 */}
      <View style={styles.avatarActionRow}>
        <View style={styles.avatarWrapper}>
          <UserAvatar
            avatarUrl={avatarUrl}
            userId={id}
            size={AVATAR_SIZE}
            accessibilityLabel={`${nickname}のプロフィール画像`}
          />
          {isPremium && (
            <View style={styles.premiumBadge} accessibilityLabel="プレミアム会員" accessibilityRole="image">
              <Ionicons
                name="star"
                size={10}
                color={colorBackground}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          {isSelf ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push(ROUTE_SETTINGS_PROFILE)}
              accessibilityRole="button"
              accessibilityLabel="プロフィールを編集"
            >
              <Text style={styles.editButtonText}>編集</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.otherActions}>
              <FollowButton
                targetUserId={id}
                isPublic={isPublic}
                following={following}
                requested={requested}
                currentUserId={currentUserId}
                size="default"
                targetNickname={nickname}
              />
              {onOpenMenu !== undefined && (
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={onOpenMenu}
                  accessibilityRole="button"
                  accessibilityLabel="その他のメニューを開く"
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={18}
                    color={colorTextPrimary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      {/* プロフィール情報エリア */}
      <View style={styles.infoArea}>
        {/* 名前 + バッジ */}
        <View style={styles.nameRow}>
          <Text style={styles.nickname} accessibilityRole="header" numberOfLines={2}>
            {nickname}
          </Text>
          {isPremium && (
            <View style={styles.premiumLabel}>
              <Ionicons
                name="star"
                size={10}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.premiumLabelText}>Premium</Text>
            </View>
          )}
          {!isPublic && (
            <View style={styles.privateLabel}>
              <Ionicons
                name="lock-closed"
                size={10}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.privateLabelText}>非公開</Text>
            </View>
          )}
        </View>

        {/* bio */}
        {bio !== null && bio.length > 0 && (
          <Text style={styles.bio} accessibilityRole="text">
            {bio}
          </Text>
        )}

        {/* メタ情報（location / 盆栽歴 / 参加日） */}
        <View style={styles.metaRow}>
          {location !== null && location.length > 0 && (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={12}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.metaText}>{location}</Text>
            </View>
          )}
          {bonsaiExperience !== null && (
            <View style={styles.metaItem}>
              <Ionicons
                name="leaf-outline"
                size={12}
                color={colorTextSecondary}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.metaText}>盆栽歴 {bonsaiExperience}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.metaText}>{joinDate}から利用</Text>
          </View>
        </View>

        {/* 統計 */}
        <View style={styles.statsRow}>
          <StatItem count={postsCount} label="投稿" />
          <StatItem count={followingCount} label="フォロー中" />
          <StatItem count={followersCount} label="フォロワー" />
        </View>
      </View>
    </View>
  );
}

export const ProfileHeader = React.memo(ProfileHeaderInner);

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSurface,
    ...shadowWashi,
  },
  coverWrapper: {
    height: COVER_HEIGHT,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: COVER_HEIGHT,
  },
  coverFallback: {
    backgroundColor: colorSurfaceMuted,
  },
  avatarActionRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing4,
    marginTop: -AVATAR_OVERLAP,
    marginBottom: spacing3,
  },
  avatarWrapper: {
    position: 'relative',
    borderRadius: radiusFull,
    borderWidth: AVATAR_BORDER_WIDTH,
    borderColor: colorSurface,
    backgroundColor: colorSurface,
  },
  premiumBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtons: {
    paddingBottom: spacing2,
  },
  editButton: {
    minWidth: 80,
    height: 44,
    borderRadius: radiusMd,
    backgroundColor: colorActionSecondary,
    borderWidth: 1,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  editButtonText: {
    ...textBase,
    color: colorActionSecondaryText,
    fontWeight: '600',
  },
  otherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radiusMd,
    backgroundColor: colorActionSecondary,
    borderWidth: 1,
    borderColor: colorBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoArea: {
    paddingHorizontal: spacing4,
    paddingBottom: spacing5,
    gap: spacing3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing2,
  },
  nickname: {
    ...textXl,
    color: colorTextPrimary,
    flexShrink: 1,
  },
  premiumLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusLg,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  premiumLabelText: {
    ...textXs,
    color: colorTextSecondary,
  },
  privateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusLg,
    paddingHorizontal: spacing2,
    paddingVertical: 2,
  },
  privateLabelText: {
    ...textXs,
    color: colorTextSecondary,
  },
  bio: {
    ...textBase,
    color: colorTextPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing3,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  metaText: {
    ...textSm,
    color: colorTextSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing6,
    marginTop: spacing2,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statCount: {
    ...textLg,
    color: colorTextPrimary,
    fontWeight: '700',
  },
  statLabel: {
    ...textSm,
    color: colorTextSecondary,
  },
});
