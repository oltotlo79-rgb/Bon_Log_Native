import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorBackground } from '@/lib/constants/design-tokens';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { QuoteComposer } from '@/components/post/QuoteComposer';
import { usePostQuery } from '@/lib/queries/posts';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { ERR_AUTH_REQUIRED, ERR_POST_NOT_FOUND } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 型ガード: useLocalSearchParams の値を string に絞る
// ---------------------------------------------------------------------------

function isValidId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PostQuoteScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];
  const postId = isValidId(rawId) ? rawId : '';

  const { data: me, isLoading: isMeLoading, isError: isMeError, refetch: refetchMe } = useCurrentUserQuery();
  const { data: post, isLoading: isPostLoading, isError: isPostError, refetch: refetchPost } = usePostQuery(postId);

  if (isMeLoading || isPostLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenLoading variant="spinner" />
      </SafeAreaView>
    );
  }

  if (isMeError || me === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenError
          title="ログインが必要です"
          description={ERR_AUTH_REQUIRED}
          onRetry={() => void refetchMe()}
        />
      </SafeAreaView>
    );
  }

  if (isPostError || post === undefined || postId.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenError
          title="投稿が見つかりません"
          description={ERR_POST_NOT_FOUND}
          onRetry={() => void refetchPost()}
        />
      </SafeAreaView>
    );
  }

  // QuotedPostCard が要求する形状へ整形する
  const quotedPost = {
    id: post.id,
    content: post.content,
    user: {
      id: post.user.id,
      nickname: post.user.nickname,
      avatarUrl: post.user.avatarUrl,
    },
    media: post.media,
  };

  return (
    <View style={styles.container}>
      <QuoteComposer
        quotedPostId={post.id}
        quotedPost={quotedPost}
        currentUserId={me.id}
        isPremium={me.isPremium}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colorBackground,
  },
  container: {
    flex: 1,
    backgroundColor: colorBackground,
  },
});
