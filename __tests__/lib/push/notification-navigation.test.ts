/**
 * lib/push/notification-navigation のユニットテスト。
 * expo-notifications は setup.ts で一元モック済み。
 * pendingRoute はモジュール内部の共有状態のため、各テスト後に
 * resetPendingNotificationRouteForTest でリセットしテスト間の汚染を防ぐ。
 */

import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import {
  setupNotificationNavigation,
  flushPendingNotificationRoute,
  resetPendingNotificationRouteForTest,
} from '@/lib/push/notification-navigation';
import { ROUTE_NOTIFICATIONS, routePostDetail, routeUserDetail } from '@/lib/constants/routes';

// ---------------------------------------------------------------------------
// モック参照・ヘルパー
// ---------------------------------------------------------------------------

const mockAddListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockGetLastResponse = Notifications.getLastNotificationResponseAsync as jest.Mock;
const mockClearLastResponse = Notifications.clearLastNotificationResponseAsync as jest.Mock;

function makeResponse(data: unknown): NotificationResponse {
  return {
    notification: {
      date: Date.now(),
      request: {
        identifier: 'test-notification',
        content: {
          title: null,
          subtitle: null,
          body: null,
          data: data as Record<string, unknown>,
          categoryIdentifier: null,
          sound: null,
          launchImageName: '',
          badge: null,
          attachments: [],
          threadIdentifier: null,
        },
        trigger: null,
      },
    },
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
  } as unknown as NotificationResponse;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetPendingNotificationRouteForTest();
  mockAddListener.mockReturnValue({ remove: jest.fn() });
  mockGetLastResponse.mockResolvedValue(null);
  mockClearLastResponse.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// setupNotificationNavigation — リスナー登録・解除
// ---------------------------------------------------------------------------

describe('setupNotificationNavigation: リスナー登録・解除', () => {
  it('addNotificationResponseReceivedListener を1回登録する', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate });

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('返り値を呼び出すと購読解除される', () => {
    const mockRemove = jest.fn();
    mockAddListener.mockReturnValue({ remove: mockRemove });

    const cleanup = setupNotificationNavigation({ navigate: jest.fn() });
    expect(mockRemove).not.toHaveBeenCalled();

    cleanup();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('タップ時のレスポンスを解決したルートで navigate を呼ぶ', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate });

    const handler = mockAddListener.mock.calls[0][0] as (response: NotificationResponse) => void;
    handler(makeResponse({ type: 'like', postId: 'post-1' }));

    expect(navigate).toHaveBeenCalledWith(routePostDetail('post-1'));
  });

  it('canNavigateNow を渡さない場合は常に即時遷移する', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate });

    const handler = mockAddListener.mock.calls[0][0] as (response: NotificationResponse) => void;
    handler(makeResponse({ type: 'system' }));

    expect(navigate).toHaveBeenCalledWith(ROUTE_NOTIFICATIONS);
  });
});

// ---------------------------------------------------------------------------
// コールドスタート（getLastNotificationResponseAsync）
// ---------------------------------------------------------------------------

describe('setupNotificationNavigation: コールドスタート', () => {
  it('起動時に最終レスポンスがあれば navigate を呼ぶ', async () => {
    mockGetLastResponse.mockResolvedValue(makeResponse({ type: 'follow', actorId: 'user-1' }));
    const navigate = jest.fn();

    setupNotificationNavigation({ navigate });
    await Promise.resolve();
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledWith(routeUserDetail('user-1'));
  });

  it('起動時に最終レスポンスがあれば確認後に clearLastNotificationResponseAsync を呼ぶ', async () => {
    mockGetLastResponse.mockResolvedValue(makeResponse({ type: 'system' }));

    setupNotificationNavigation({ navigate: jest.fn() });
    await Promise.resolve();
    await Promise.resolve();

    expect(mockClearLastResponse).toHaveBeenCalledTimes(1);
  });

  it('起動時に最終レスポンスが無ければ navigate を呼ばない', async () => {
    mockGetLastResponse.mockResolvedValue(null);
    const navigate = jest.fn();

    setupNotificationNavigation({ navigate });
    await Promise.resolve();
    await Promise.resolve();

    expect(navigate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// canNavigateNow が false の場合の保留・flush
// ---------------------------------------------------------------------------

describe('canNavigateNow が false: 保留と flushPendingNotificationRoute', () => {
  it('canNavigateNow が false の間は navigate を呼ばず保留する', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate, canNavigateNow: () => false });

    const handler = mockAddListener.mock.calls[0][0] as (response: NotificationResponse) => void;
    handler(makeResponse({ type: 'like', postId: 'post-1' }));

    expect(navigate).not.toHaveBeenCalled();
  });

  it('flushPendingNotificationRoute で保留した遷移が実行される', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate, canNavigateNow: () => false });

    const handler = mockAddListener.mock.calls[0][0] as (response: NotificationResponse) => void;
    handler(makeResponse({ type: 'like', postId: 'post-1' }));
    expect(navigate).not.toHaveBeenCalled();

    const flushNavigate = jest.fn();
    flushPendingNotificationRoute(flushNavigate);

    expect(flushNavigate).toHaveBeenCalledWith(routePostDetail('post-1'));
  });

  it('保留が無い状態で flushPendingNotificationRoute を呼んでも何もしない', () => {
    const flushNavigate = jest.fn();
    flushPendingNotificationRoute(flushNavigate);

    expect(flushNavigate).not.toHaveBeenCalled();
  });

  it('flush 後に保留はクリアされ、再度 flush しても navigate は呼ばれない', () => {
    const navigate = jest.fn();
    setupNotificationNavigation({ navigate, canNavigateNow: () => false });

    const handler = mockAddListener.mock.calls[0][0] as (response: NotificationResponse) => void;
    handler(makeResponse({ type: 'like', postId: 'post-1' }));

    const firstFlush = jest.fn();
    flushPendingNotificationRoute(firstFlush);
    expect(firstFlush).toHaveBeenCalledTimes(1);

    const secondFlush = jest.fn();
    flushPendingNotificationRoute(secondFlush);
    expect(secondFlush).not.toHaveBeenCalled();
  });
});
