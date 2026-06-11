/**
 * app/_layout.tsx の ErrorBoundary export テスト。
 * エラー throw 時に ScreenError が表示され captureException が呼ばれることを確認する。
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ErrorBoundary } from '@/app/_layout';

const mockCaptureException = jest.fn();
jest.mock('@/lib/monitoring/sentry', () => ({
  initSentry: jest.fn(),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

describe('ErrorBoundary', () => {
  const testError = new Error('テスト用エラーメッセージ');
  const mockRetry = jest.fn();

  beforeEach(() => {
    mockCaptureException.mockClear();
    mockRetry.mockClear();
  });

  it('エラーが渡されたとき ScreenError のタイトルが表示される', () => {
    render(<ErrorBoundary error={testError} retry={mockRetry} />);
    expect(screen.getByText('エラーが発生しました')).toBeTruthy();
  });

  it('エラーメッセージが debugMessage として表示される', () => {
    render(<ErrorBoundary error={testError} retry={mockRetry} />);
    expect(screen.getByText('テスト用エラーメッセージ')).toBeTruthy();
  });

  it('レンダリング時に captureException が呼ばれる', () => {
    render(<ErrorBoundary error={testError} retry={mockRetry} />);
    expect(mockCaptureException).toHaveBeenCalledWith(testError);
  });

  it('captureException に正しい Error オブジェクトが渡される', () => {
    const specificError = new Error('特定のエラー');
    render(<ErrorBoundary error={specificError} retry={mockRetry} />);
    expect(mockCaptureException).toHaveBeenCalledWith(specificError);
  });

  it('再試行ボタンが表示される', () => {
    render(<ErrorBoundary error={testError} retry={mockRetry} />);
    // ScreenError は accessibilityLabel="再試行する" のボタンを持つ
    expect(screen.getByRole('button', { name: '再試行する' })).toBeTruthy();
  });

  it('再試行ボタンを押すと retry が呼ばれる', () => {
    render(<ErrorBoundary error={testError} retry={mockRetry} />);
    fireEvent.press(screen.getByRole('button', { name: '再試行する' }));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
