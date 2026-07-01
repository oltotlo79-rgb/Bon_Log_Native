/**
 * @module app/messages/index
 * DM 会話一覧画面。
 * useConversationsQuery で会話一覧を取得し FlatList で無限スクロール表示する。
 * 各行タップで会話スレッドへ遷移する。
 * 4 状態（ローディング・空・エラー・オフライン）を実装済み。
 */

import React, { useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useConversationsQuery } from '@/lib/queries/messages';
import type { ConversationItem } from '@/lib/queries/messages';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ConversationRow } from '@/components/messages/ConversationRow';
import { routeMessageThread } from '@/lib/constants/routes';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorBorderLight,
  spacing4,
  textLg,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function MessagesScreen() {
  const isOffline = !useOnlineStatus();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useConversationsQuery();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleRowPress = useCallback((conversationId: string, item: ConversationItem) => {
    const otherUser =
      item.otherUser !== null
        ? {
            nickname: item.otherUser.nickname,
            avatarUrl: item.otherUser.avatarUrl,
            userId: item.otherUser.id,
          }
        : undefined;
    router.push(routeMessageThread(conversationId, otherUser));
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationItem }) => (
      <ConversationRow item={item} onPress={handleRowPress} />
    ),
    [handleRowPress]
  );

  const keyExtractor = useCallback((item: ConversationItem) => item.id, []);

  // ローディング状態
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar />
        <ScreenLoading variant="skeleton" skeletonCount={6} />
      </SafeAreaView>
    );
  }

  // エラー状態
  if (isError) {
    const debugMsg = error instanceof Error ? error.message : undefined;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar />
        <OfflineBanner isVisible={isOffline} />
        <ScreenError
          title="読み込めませんでした"
          description={ERR_LOAD_FAILED}
          onRetry={handleRetry}
          debugMessage={debugMsg}
        />
      </SafeAreaView>
    );
  }

  // 会話一覧を全ページ結合
  const conversations = data?.pages.flatMap((page) => page.items) ?? [];

  // 空状態
  if (conversations.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar />
        <OfflineBanner isVisible={isOffline} />
        <ScreenEmpty
          iconName="chatbubble-ellipses-outline"
          title="まだメッセージはありません"
          description="ユーザーのプロフィールからメッセージを送ることができます"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <NavBar />
      <OfflineBanner isVisible={isOffline} />
      <FlatList
        data={conversations}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleRetry}
            tintColor={colorTextPrimary}
          />
        }
        ListFooterComponent={
          isFetchingNextPage ? <ScreenLoading variant="spinner" /> : null
        }
        contentContainerStyle={styles.listContent}
        accessibilityLabel="会話一覧"
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ナビゲーションバー
// ---------------------------------------------------------------------------

function NavBar() {
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
        メッセージ
      </Text>
      {/* バランス用プレースホルダー */}
      <View style={styles.navPlaceholder} />
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
  navPlaceholder: {
    width: 44,
  },
  listContent: {
    flexGrow: 1,
  },
});
