import { Stack } from 'expo-router';
import { colorBackground, colorTextPrimary } from '@/lib/constants/design-tokens';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colorBackground },
        headerTintColor: colorTextPrimary,
        headerShadowVisible: false,
        headerBackTitle: '',
        contentStyle: { backgroundColor: colorBackground },
      }}
    >
      <Stack.Screen name="login/index" options={{ headerShown: false }} />
      <Stack.Screen name="register/index" options={{ headerShown: false }} />
      <Stack.Screen
        name="register/verify-email-sent/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="password-reset/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="password-reset/confirm/index"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
