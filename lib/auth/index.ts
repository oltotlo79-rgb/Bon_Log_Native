/**
 * @module lib/auth
 * 認証モジュールのパブリック API。
 * このファイルから import してモジュール内部構造への依存を避ける。
 */

export { initializeAuth, signInWithPassword, verifyTwoFactor, signOut, requestPasswordReset, confirmPasswordReset, signInWithGoogle, getLastAuthFailureReason } from '@/lib/auth/auth';
export type { SignInResult, AuthStatus, AuthFailureReason } from '@/lib/auth/auth';
export { useAuth } from '@/lib/auth/use-auth';
export type { UseAuthReturn } from '@/lib/auth/use-auth';
export { useGoogleAuth } from '@/lib/auth/use-google-auth';
export type { UseGoogleAuthReturn } from '@/lib/auth/use-google-auth';
