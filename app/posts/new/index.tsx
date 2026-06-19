import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorBackground } from '@/lib/constants/design-tokens';
import { ScreenLoading } from '@/components/common/ScreenLoading';
import { ScreenError } from '@/components/common/ScreenError';
import { PostComposer } from '@/components/post/PostComposer';
import { useCurrentUserQuery } from '@/lib/queries/auth';
import { ERR_AUTH_REQUIRED } from '@/lib/constants/errors';

export default function PostNewScreen() {
  const { data: me, isLoading, isError, refetch } = useCurrentUserQuery();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenLoading variant="spinner" />
      </SafeAreaView>
    );
  }

  if (isError || me === undefined) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScreenError
          title="ログインが必要です"
          description={ERR_AUTH_REQUIRED}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <PostComposer
        mode="create"
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
