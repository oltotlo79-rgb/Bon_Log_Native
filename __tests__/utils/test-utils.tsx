/**
 * @module __tests__/utils/test-utils
 * テスト共通ユーティリティ。TanStack Query Provider 等を wrap した render を提供する。
 * 実装が進み QueryClient が追加された際にここへ集約する。
 */

import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}
