/**
 * @module hooks/use-toast
 * トースト表示状態を管理するフック。
 * コンポーネントに Toast を配置し、showToast を呼ぶだけで使える。
 */

import { useState, useCallback } from 'react';
import type { ToastVariant } from '@/components/common/Toast';

export type ToastState = {
  message: string;
  visible: boolean;
  variant: ToastVariant;
};

const INITIAL_STATE: ToastState = {
  message: '',
  visible: false,
  variant: 'default',
};

export function useToast() {
  const [toast, setToast] = useState<ToastState>(INITIAL_STATE);

  const showToast = useCallback((message: string, variant: ToastVariant = 'default') => {
    setToast({ message, visible: true, variant });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  return { toast, showToast, hideToast };
}
