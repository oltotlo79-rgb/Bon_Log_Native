import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorBackground } from '@/lib/constants/design-tokens';
import { ERR_POST_NOT_FOUND, ERR_POST_LOAD_FAILED, ERR_AUTH_REQUIRED } from '@/lib/constants/errors';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { PostComposer } from '@/components/post/PostComposer';
import { usePostQuery } from '@/lib/queries/posts';
import { useCurrentUserQuery } from '@/lib/queries/auth';

// ---------------------------------------------------------------------------
// 型ガード: useLocalSearchParams の値を string に絞る
// ---------------------------------------------------------------------------

function isValidPostId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export default function PostEditScreen() {
  const params = useLocalSearchParams();
  const rawId = params['id'];

  const { data: me, isLoading: isMeLoading, isError: isMeError, refetch: refetchMe } = useCurrentUserQuery();

  const postId = isValidPostId(rawId) ? rawId : '';

  const {
    data: post,
    isLoading: isPostLoading,
    isError: isPostError,
    refetch: refetchPost,
  } = usePostQuery(postId);

  if (!isValidPostId(rawId)) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenError
          title="投稿が見つかりません"
          description={ERR_POST_NOT_FOUND}
          onRetry={() => {}}
        />
      </SafeAreaView>
    );
  }

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

  if (isPostError || post === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenError
          title="投稿が見つかりません"
          description={ERR_POST_LOAD_FAILED}
          onRetry={() => void refetchPost()}
        />
      </SafeAreaView>
    );
  }

  // 既存メディアを初期値に変換する
  const initialImageUris = post.media
    .filter((m) => m.type === 'image')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.url);

  const initialVideoUri =
    post.media.find((m) => m.type === 'video')?.url ?? null;

  return (
    <View style={styles.container}>
      <PostComposer
        mode="edit"
        currentUserId={me.id}
        isPremium={me.isPremium}
        postId={post.id}
        initialValues={{
          content: post.content ?? '',
          genreIds: post.genres.map((g) => g.name),
          imageUris: initialImageUris,
          videoUri: initialVideoUri,
        }}
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
