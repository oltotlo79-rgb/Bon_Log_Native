/**
 * @module components/post/LikeButton
 * いいねボタン。楽観表示・スケールアニメーション・連打デバウンス・オフライン対応を含む。
 * 仕様: docs/design/follow-and-engagement.md §3 / docs/design/post-card.md §10
 *
 * 設計の要点:
 * - ローカル楽観 state（optimisticLiked / optimisticCount）でタップ直後に即時表示を切り替える。
 *   API 呼び出しのみ LIKE_DEBOUNCE_MS でデバウンスして束ねる。
 * - props（キャッシュ）が更新されたらローカル state をそれに合わせ、
 *   サーバー確定値・ロールバックをコンポーネントに反映する（二重カウント防止）。
 * - キャッシュへの書き込みはフック（useToggleLikeMutation）の責務。ここでは行わない。
 * - 連打で最終状態が元と同じになった場合は API を呼ばない。
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Animated, Pressable, Text, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useToggleLikeMutation } from '@/lib/queries/likes';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import {
  colorTextSecondary,
  colorError,
  spacing1,
  spacing2,
  textSm,
  durationFast,
  easingBounceRN,
} from '@/lib/constants/design-tokens';
import { LIKE_DEBOUNCE_MS } from '@/lib/constants/limits/ui';
import {
  ERR_LIKE_FAILED,
  ERR_RATE_LIMIT,
  ERR_OFFLINE_ACTION,
  ERR_POST_NOT_FOUND,
} from '@/lib/constants/errors';
import { ROUTE_LOGIN } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_SIZE = 20;
const SCALE_MAX = 1.3;
const ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 } as const;

// 429 受信後にボタンを disabled にする最低待機時間（秒単位。Retry-After 未取得時のフォールバック）
const RATE_LIMIT_FALLBACK_DISABLE_SEC = 5;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type LikeButtonProps = {
  postId: string;
  isLiked: boolean;
  likeCount: number;
  currentUserId: string | undefined;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LikeButton({ postId, isLiked, likeCount, currentUserId }: LikeButtonProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();
  const mutation = useToggleLikeMutation();

  // ローカル楽観表示 state: タップ直後に即時切り替える（API はデバウンス後に呼ぶ）
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(likeCount);

  // props（キャッシュ）が更新されたらローカル state を同期する。
  // サーバー確定値やロールバックがフック経由でキャッシュに反映され、props として届く。
  // デバウンス pending 中は props 変化を受け入れない（API 呼び出し前にキャッシュが変わることは
  // 通常ないが、念のため pending フラグで保護する）。
  const isPendingRef = useRef(false);
  useEffect(() => {
    if (!isPendingRef.current) {
      setOptimisticLiked(isLiked);
      setOptimisticCount(likeCount);
    }
  }, [isLiked, likeCount]);

  // 429 後のボタン一時 disabled 状態
  const [isRateLimitDisabled, setIsRateLimitDisabled] = useState(false);
  const rateLimitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // デバウンス: 最後の tap から LIKE_DEBOUNCE_MS 後に API を呼ぶ
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // デバウンス確定時に送信する「操作前の状態（API に渡す currentlyLiked）」
  // 連打した場合、最初の tap 時点の isLiked を currentlyLiked として保持し、
  // 偶数回タップで元に戻れば API を呼ばない。
  const pendingCurrentlyLikedRef = useRef<boolean | null>(null);
  // 連打カウント（タップのたびにトグル。偶数回→ API 不要）
  const tapCountRef = useRef(0);

  // Animated.Value を useState で保持（レンダー中の ref.current アクセスを避けるため）
  const [scaleAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
      if (rateLimitTimerRef.current !== null) clearTimeout(rateLimitTimerRef.current);
    };
  }, []);

  const playScaleAnimation = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: SCALE_MAX,
        duration: durationFast / 2,
        easing: easingBounceRN,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: durationFast / 2,
        easing: easingBounceRN,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const handleRateLimitDisable = useCallback((retryAfterSec: number | undefined) => {
    setIsRateLimitDisabled(true);
    const waitSec = retryAfterSec ?? RATE_LIMIT_FALLBACK_DISABLE_SEC;
    rateLimitTimerRef.current = setTimeout(() => {
      setIsRateLimitDisabled(false);
    }, waitSec * 1000);
  }, []);

  const executeMutation = useCallback(
    (currentlyLiked: boolean) => {
      mutation.mutate(
        { postId, currentlyLiked },
        {
          onError: (error) => {
            if (isApiError(error)) {
              if (error.code === 'RATE_LIMITED') {
                showToast(ERR_RATE_LIMIT, 'warning');
                handleRateLimitDisable(error.retryAfter);
              } else if (error.code === 'NOT_FOUND') {
                showToast(ERR_POST_NOT_FOUND, 'error');
              } else {
                showToast(ERR_LIKE_FAILED, 'error');
              }
            } else {
              showToast(ERR_LIKE_FAILED, 'error');
            }
          },
        }
      );
    },
    [mutation, postId, showToast, handleRateLimitDisable]
  );

  const handlePress = useCallback(() => {
    // 未認証: 楽観更新せずログイン画面へ
    if (currentUserId === undefined) {
      router.push(ROUTE_LOGIN);
      return;
    }

    // オフライン: API 呼び出さずトーストのみ
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      return;
    }

    // 429 による一時 disabled
    if (isRateLimitDisabled) {
      return;
    }

    // タップ直後にローカル楽観 state を即時切り替える（設計 §3.1）
    setOptimisticLiked((prev) => {
      const next = !prev;
      setOptimisticCount((c) => (next ? c + 1 : c - 1));
      return next;
    });

    // スケールアニメーションを即時再生（視覚フィードバック）
    playScaleAnimation();

    // デバウンス: タップのたびに連打カウントをトグルし、タイマーをリセット
    tapCountRef.current += 1;

    // 最初のタップ時点の isLiked を API に渡す currentlyLiked として記録
    if (pendingCurrentlyLikedRef.current === null) {
      pendingCurrentlyLikedRef.current = isLiked;
      isPendingRef.current = true;
    }

    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
    }

    const capturedCurrentlyLiked = pendingCurrentlyLikedRef.current;

    debounceTimerRef.current = setTimeout(() => {
      const totalTaps = tapCountRef.current;
      tapCountRef.current = 0;
      pendingCurrentlyLikedRef.current = null;
      isPendingRef.current = false;

      // 偶数回連打で元の状態に戻った場合 → API 不要。ローカル state も元に戻す。
      if (totalTaps % 2 === 0) {
        setOptimisticLiked(isLiked);
        setOptimisticCount(likeCount);
        return;
      }

      executeMutation(capturedCurrentlyLiked);
    }, LIKE_DEBOUNCE_MS);
  }, [
    currentUserId,
    isOnline,
    isRateLimitDisabled,
    isLiked,
    likeCount,
    playScaleAnimation,
    executeMutation,
    showToast,
  ]);

  const accessibilityLabel =
    currentUserId === undefined
      ? `ログインしていいねする。現在 ${optimisticCount} 件`
      : optimisticLiked
        ? `いいねを取り消す。現在 ${optimisticCount} 件`
        : `いいねする。現在 ${optimisticCount} 件`;

  return (
    <View>
      <Pressable
        style={styles.button}
        onPress={handlePress}
        hitSlop={ACTION_HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: isRateLimitDisabled }}
        disabled={isRateLimitDisabled}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Ionicons
            name={optimisticLiked ? 'heart' : 'heart-outline'}
            size={ICON_SIZE}
            color={optimisticLiked ? colorError : colorTextSecondary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        </Animated.View>
        {optimisticCount > 0 && (
          <Text style={styles.countText}>{optimisticCount}</Text>
        )}
      </Pressable>
      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={hideToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing1,
    minHeight: 44,
    paddingHorizontal: spacing2,
  },
  countText: {
    ...textSm,
    color: colorTextSecondary,
  },
});
