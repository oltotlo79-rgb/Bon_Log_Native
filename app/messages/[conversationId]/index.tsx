/**
 * @module app/messages/[conversationId]/index
 * DM 会話スレッド画面。
 * useMessagesQuery（無限スクロール・ポーリング）でメッセージ一覧を取得し、
 * FlatList inverted で新着を下に表示する。
 * 4 状態（ローディング / 空 / エラー / オフライン）実装済み。
 * 403 + NOT_FOUND は存在秘匿として not-found 表示に切り替える。
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  useMessagesQuery,
  useSendMessageMutation,
  useDeleteMessageMutation,
  type MessageItem,
} from '@/lib/queries/messages';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { isApiError } from '@/lib/api/errors';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { ScreenEmpty } from '@/components/common/ScreenEmpty';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { MessageDateSeparator } from '@/components/messages/MessageDateSeparator';
import {
  colorBackground,
  colorSurfaceWashi,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorBorderLight,
  colorBorder,
  colorActionPrimary,
  colorActionPrimaryText,
  colorError,
  colorErrorBg,
  spacing2,
  spacing3,
  spacing4,
  spacing8,
  spacing12,
  radiusFull,
  radiusMd,
  radiusLg,
  textBase,
  textLg,
  textXs,
  fontFamilySerifBold,
  letterSpacingWidest,
} from '@/lib/constants/design-tokens';
import {
  ERR_USER_NOT_FOUND,
  ERR_LOAD_FAILED,
  ERR_GENERIC,
  ERR_NETWORK,
  ERR_OFFLINE_ACTION,
  messageForSendMessageError,
} from '@/lib/constants/errors';
import { MAX_MESSAGE_LENGTH } from '@/lib/constants/limits/post';
import { UserAvatar } from '@/components/common/UserAvatar';
import { routeUserDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// リストアイテムの型（メッセージ or 日付セパレータ）
// ---------------------------------------------------------------------------

type MessageListItem =
  | { type: 'message'; data: MessageItem }
  | { type: 'dateSeparator'; id: string; dateStr: string };

// ---------------------------------------------------------------------------
// 日付ラベル（YYYY-MM-DD 形式）
// ---------------------------------------------------------------------------

function toDateKey(dateStr: string): string {
  return new Date(dateStr).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// 相手ユーザー情報をページデータから抽出する純粋関数
// ---------------------------------------------------------------------------

function resolveOtherUser(
  pages: { items: MessageItem[] }[] | undefined,
  currentUserId: string
): OtherUser {
  if (pages === undefined) return null;
  for (const page of pages) {
    for (const msg of page.items) {
      if (msg.senderId !== currentUserId) {
        return {
          id: msg.sender.id,
          nickname: msg.sender.nickname,
          avatarUrl: msg.sender.avatarUrl,
        };
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// メッセージ配列にセパレータを挿入し inverted 用に逆順へ変換
//
// FlatList inverted を使うため、表示上の「下=新しい」は配列の先頭になる。
// サーバーからは createdAt 昇順（古→新）で来るので、
// 1. 昇順のままセパレータを挿入する
// 2. reverse() して inverted FlatList に渡す
// ---------------------------------------------------------------------------

function buildListItems(pages: { items: MessageItem[] }[]): MessageListItem[] {
  const messages = pages.flatMap((p) => p.items);
  const result: MessageListItem[] = [];
  let lastDateKey = '';

  for (const msg of messages) {
    const dateKey = toDateKey(msg.createdAt);
    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      result.push({ type: 'dateSeparator', id: `sep-${dateKey}`, dateStr: msg.createdAt });
    }
    result.push({ type: 'message', data: msg });
  }

  // inverted FlatList は配列の先頭を画面下に表示するため逆順にする
  return result.reverse();
}

// ---------------------------------------------------------------------------
// 画面本体（conversationId のガードのみ担当）
// ---------------------------------------------------------------------------

export default function ConversationThreadScreen() {
  const params = useLocalSearchParams();
  const rawId = params['conversationId'];

  if (typeof rawId !== 'string' || rawId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="メッセージ" otherUser={null} />
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

  // 遷移元から渡された相手情報をクエリパラメータから型ガードで取り出す。
  // メッセージ 0 件でもヘッダーに相手名を表示するための補完情報。
  const rawNickname = params['nickname'];
  const rawAvatarUrl = params['avatarUrl'];
  const rawUserId = params['userId'];

  const paramOtherUser: OtherUser =
    typeof rawNickname === 'string' && rawNickname.length > 0 &&
    typeof rawUserId === 'string' && rawUserId.length > 0
      ? {
          id: rawUserId,
          nickname: rawNickname,
          avatarUrl: typeof rawAvatarUrl === 'string' && rawAvatarUrl.length > 0
            ? rawAvatarUrl
            : null,
        }
      : null;

  return <ConversationThreadContent conversationId={rawId} paramOtherUser={paramOtherUser} />;
}

// ---------------------------------------------------------------------------
// コンテンツ（conversationId 確定後）
// ---------------------------------------------------------------------------

type OtherUser = {
  id: string;
  nickname: string;
  avatarUrl: string | null;
} | null;

type ConversationThreadContentProps = {
  conversationId: string;
  paramOtherUser: OtherUser;
};

function ConversationThreadContent({ conversationId, paramOtherUser }: ConversationThreadContentProps) {
  const isOffline = !useOnlineStatus();

  const {
    data: messagesData,
    isLoading: isMessagesLoading,
    isError: isMessagesError,
    error: messagesError,
    refetch,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessagesQuery(conversationId);

  const { data: currentUser } = useCurrentUserQuery();
  const currentUserId = currentUser?.id ?? '';

  const sendMutation = useSendMessageMutation(conversationId);
  const deleteMutation = useDeleteMessageMutation(conversationId);

  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // 403 + NOT_FOUND は存在秘匿として not-found 扱いにする
  const isNotFound =
    isMessagesError &&
    isApiError(messagesError) &&
    messagesError.status === 403 &&
    messagesError.code === 'NOT_FOUND';

  // ヘッダーに表示する相手情報。パラメータで渡された値を第一候補とし、
  // パラメータがない場合はメッセージ送信者から逆引きしてフォールバックする。
  const resolvedOtherUser = resolveOtherUser(messagesData?.pages, currentUserId);
  const otherUser: OtherUser = paramOtherUser ?? resolvedOtherUser;

  const listItems: MessageListItem[] =
    messagesData !== undefined ? buildListItems(messagesData.pages) : [];
  const isSendDisabled = inputText.trim().length === 0 || sendMutation.isPending;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  // 上スクロール = 配列末尾 → 古いページを追加読み込み
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (content.length === 0 || sendMutation.isPending) return;
    if (isOffline) {
      setSendError(ERR_OFFLINE_ACTION);
      return;
    }

    const submittedInput = inputText;
    setSendError(null);
    sendMutation.mutate(
      { content },
      {
        onSuccess: () => {
          setInputText((currentInput) =>
            currentInput === submittedInput ? '' : currentInput
          );
          setSendError(null);
          inputRef.current?.focus();
        },
        onError: (error) => {
          setSendError(
            isApiError(error) ? messageForSendMessageError(error.code) : ERR_NETWORK
          );
        },
      }
    );
  }, [inputText, isOffline, sendMutation]);

  const handleLongPressMessage = useCallback(
    (messageId: string) => {
      Alert.alert(
        'メッセージを削除',
        'このメッセージを削除しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '削除',
            style: 'destructive',
            onPress: () => {
              deleteMutation.mutate({ messageId });
            },
          },
        ],
        { cancelable: true }
      );
    },
    [deleteMutation]
  );

  const renderItem = useCallback(
    ({ item }: { item: MessageListItem }) => {
      if (item.type === 'dateSeparator') {
        return <MessageDateSeparator dateStr={item.dateStr} />;
      }
      const isOwn = item.data.senderId === currentUserId;
      return (
        <MessageBubble
          item={item.data}
          isOwn={isOwn}
          onLongPress={isOwn ? handleLongPressMessage : undefined}
        />
      );
    },
    [currentUserId, handleLongPressMessage]
  );

  const keyExtractor = useCallback((item: MessageListItem) => {
    if (item.type === 'dateSeparator') return item.id;
    return item.data.id;
  }, []);

  // ローディング状態。パラメータで相手情報があれば即時表示する
  if (isMessagesLoading) {
    const loadingTitle = paramOtherUser !== null ? paramOtherUser.nickname : '読み込み中...';
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title={loadingTitle} otherUser={paramOtherUser} />
        <ScreenLoading variant="spinner" />
      </SafeAreaView>
    );
  }

  // 存在秘匿（403 + NOT_FOUND）
  if (isNotFound) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="メッセージ" otherUser={null} />
        <View style={styles.center}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={48}
            color={colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.notFoundTitle} accessibilityRole="header">
            会話が見つかりません
          </Text>
          <Text style={styles.notFoundDesc}>
            この会話は存在しないか、アクセス権限がありません。
          </Text>
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

  // その他エラー
  if (isMessagesError) {
    const debugMsg =
      messagesError instanceof Error ? messagesError.message : ERR_GENERIC;
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <NavBar title="メッセージ" otherUser={null} />
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

  // 空状態（メッセージ 0 件）
  const isEmpty = listItems.length === 0;

  const navTitle =
    otherUser !== null ? otherUser.nickname : 'メッセージ';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <NavBar title={navTitle} otherUser={otherUser} />
      <OfflineBanner isVisible={isOffline} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <ScreenEmpty
            iconName="chatbubble-outline"
            title="まだメッセージはありません"
            description="最初のメッセージを送ってみましょう"
          />
        ) : (
          <FlatList
            data={listItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            inverted
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View style={styles.loadingOlder}>
                  <Text style={styles.loadingOlderText}>過去のメッセージを読み込み中...</Text>
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            accessibilityLabel="メッセージ一覧"
            // inverted では FlatList.automaticallyAdjustKeyboardInsets が有効
            automaticallyAdjustKeyboardInsets
          />
        )}

        {sendError !== null && (
          <View style={styles.sendErrorContainer}>
            <Text
              style={styles.sendErrorText}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              {sendError}
            </Text>
            <TouchableOpacity
              style={styles.retrySendButton}
              onPress={handleSend}
              disabled={isSendDisabled}
              accessibilityRole="button"
              accessibilityLabel="メッセージ送信を再試行"
              accessibilityState={{ disabled: isSendDisabled }}
            >
              <Text style={styles.retrySendText}>再試行</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="メッセージを入力..."
            placeholderTextColor={colorTextTertiary}
            multiline
            maxLength={MAX_MESSAGE_LENGTH}
            returnKeyType="default"
            blurOnSubmit={false}
            accessibilityLabel="メッセージ入力欄"
          />
          <Text style={styles.charCount} accessibilityElementsHidden importantForAccessibility="no">
            {inputText.length}/{MAX_MESSAGE_LENGTH}
          </Text>
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSendDisabled && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isSendDisabled}
            accessibilityRole="button"
            accessibilityLabel="送信"
            accessibilityState={{
              disabled: isSendDisabled,
            }}
          >
            <Ionicons
              name="send"
              size={20}
              color={colorActionPrimaryText}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// ナビゲーションバー
// ---------------------------------------------------------------------------

type NavBarProps = {
  title: string;
  otherUser: OtherUser;
};

const NAV_AVATAR_SIZE = 32;
const NAV_BAR_HEIGHT = 56;

function NavBar({ title, otherUser }: NavBarProps) {
  const handleUserPress = () => {
    if (otherUser !== null) {
      router.push(routeUserDetail(otherUser.id));
    }
  };

  return (
    <View style={navStyles.bar}>
      <TouchableOpacity
        style={navStyles.backButton}
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

      <TouchableOpacity
        style={navStyles.titleArea}
        onPress={otherUser !== null ? handleUserPress : undefined}
        disabled={otherUser === null}
        accessibilityRole={otherUser !== null ? 'button' : 'header'}
        accessibilityLabel={
          otherUser !== null
            ? `${title}のプロフィールを見る`
            : title
        }
      >
        {otherUser !== null && (
          <UserAvatar
            avatarUrl={otherUser.avatarUrl}
            userId={otherUser.id}
            size={NAV_AVATAR_SIZE}
            accessibilityLabel={`${title}のアバター`}
          />
        )}
        <Text style={navStyles.title} numberOfLines={1}>
          {title}
        </Text>
      </TouchableOpacity>

      {/* バランス用プレースホルダー */}
      <View style={navStyles.placeholder} />
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
  keyboardView: {
    flex: 1,
  },
  listContent: {
    paddingVertical: spacing4,
    flexGrow: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing8,
    gap: spacing3,
  },
  errorText: {
    ...textBase,
    color: colorTextPrimary,
    textAlign: 'center',
  },
  notFoundTitle: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
    marginTop: spacing3,
  },
  notFoundDesc: {
    ...textBase,
    color: colorTextSecondary,
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
  loadingOlder: {
    alignItems: 'center',
    paddingVertical: spacing4,
  },
  loadingOlderText: {
    ...textXs,
    color: colorTextSecondary,
  },
  sendErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing3,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    backgroundColor: colorErrorBg,
    borderTopWidth: 1,
    borderTopColor: colorError,
  },
  sendErrorText: {
    ...textBase,
    flex: 1,
    color: colorError,
  },
  retrySendButton: {
    minHeight: spacing12,
    paddingHorizontal: spacing3,
    borderRadius: radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retrySendText: {
    ...textBase,
    color: colorError,
    fontFamily: fontFamilySerifBold,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing3,
    paddingVertical: spacing3,
    borderTopWidth: 1,
    borderTopColor: colorBorderLight,
    backgroundColor: colorSurfaceWashi,
    gap: spacing2,
  },
  textInput: {
    flex: 1,
    ...textBase,
    color: colorTextPrimary,
    backgroundColor: colorBackground,
    borderWidth: 1,
    borderColor: colorBorder,
    borderRadius: radiusLg,
    paddingHorizontal: spacing3,
    paddingVertical: spacing2,
    minHeight: 44,
    maxHeight: 120,
  },
  charCount: {
    ...textXs,
    color: colorTextTertiary,
    alignSelf: 'flex-end',
    paddingBottom: spacing2,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radiusFull,
    backgroundColor: colorActionPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});

const navStyles = StyleSheet.create({
  bar: {
    height: NAV_BAR_HEIGHT,
    backgroundColor: colorSurfaceWashi,
    borderBottomWidth: 1,
    borderBottomColor: colorBorderLight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing4,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing2,
    minHeight: 44,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    letterSpacing: letterSpacingWidest,
  },
  placeholder: {
    width: 44,
    flexShrink: 0,
  },
});
