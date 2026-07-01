/**
 * @module app/messages/[conversationId]/index
 * DM 会話スレッド画面。
 * 指定 conversationId のメッセージ一覧を表示し、メッセージ送信を提供する。
 * 未実装のため現時点ではプレースホルダー UI を表示する。
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorBorderLight,
  spacing4,
  spacing8,
  textLg,
  textBase,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import { ERR_USER_NOT_FOUND } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 画面本体
// ---------------------------------------------------------------------------

export default function ConversationThreadScreen() {
  const params = useLocalSearchParams();
  const rawId = params['conversationId'];

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="メッセージ" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{ERR_USER_NOT_FOUND}</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="戻る"
            style={styles.backAlt}
          >
            <Text style={styles.backAltText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return <ConversationThreadContent conversationId={rawId} />;
}

// ---------------------------------------------------------------------------
// コンテンツ（conversationId 確定後）
// ---------------------------------------------------------------------------

type ConversationThreadContentProps = {
  conversationId: string;
};

function ConversationThreadContent({ conversationId: _conversationId }: ConversationThreadContentProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <NavBar title="会話" />
      <View style={styles.center}>
        <Ionicons
          name="chatbubble-ellipses-outline"
          size={48}
          color={colorTextSecondary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.placeholderText}>
          メッセージスレッドは近日実装予定です
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ナビゲーションバー
// ---------------------------------------------------------------------------

type NavBarProps = {
  title: string;
};

function NavBar({ title }: NavBarProps) {
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing8,
    gap: spacing4,
  },
  placeholderText: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  backAlt: {
    minHeight: 44,
    paddingHorizontal: spacing4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backAltText: {
    ...textBase,
    color: colorTextPrimary,
  },
});
