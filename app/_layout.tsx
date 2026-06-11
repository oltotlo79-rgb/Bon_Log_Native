import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="posts/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="posts/[id]/edit/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="posts/new/index"
            options={{ headerShown: false, presentation: 'modal' }}
          />
          <Stack.Screen
            name="users/[id]/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/profile/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/account/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/notifications/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/subscription/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/blocked/index"
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="settings/muted/index"
            options={{ headerShown: false }}
          />
        </Stack>
        <StatusBar style="dark" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
