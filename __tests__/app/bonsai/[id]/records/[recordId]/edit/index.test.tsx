/**
 * app/bonsai/[id]/records/[recordId]/edit/index の成長記録編集フォームテスト。
 * ヘッダー・バリデーション・保存・キャンセル・画像操作を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import BonsaiRecordEditScreen from '@/app/bonsai/[id]/records/[recordId]/edit/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockUpdateRecord = jest.fn();
const mockUseUpdateBonsaiRecordMutation = jest.fn();
const mockUseBonsaiRecordsQuery = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useUpdateBonsaiRecordMutation: () => mockUseUpdateBonsaiRecordMutation(),
  useBonsaiRecordsQuery: (...args: unknown[]) => mockUseBonsaiRecordsQuery(...args),
}));

const mockUploadImage = jest.fn();
jest.mock('@/lib/queries/upload', () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
}));

let capturedOnAdd: (() => void) | null = null;
let capturedOnRemove: ((id: string) => void) | null = null;
let capturedImages: { localId: string; uri: string }[] = [];

jest.mock('@/components/post/ImageAttachmentGrid', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    ImageAttachmentGrid: ({
      onAdd,
      onRemove,
      images,
    }: {
      onAdd: () => void;
      onRemove: (id: string) => void;
      images: { localId: string; uri: string }[];
    }) => {
      capturedOnAdd = onAdd;
      capturedOnRemove = onRemove;
      capturedImages = images;
      return React.createElement(
        React.Fragment,
        null,
        React.createElement(
          TouchableOpacity,
          { onPress: onAdd, accessibilityRole: 'button', accessibilityLabel: '画像を追加（モック）' },
          React.createElement(Text, null, '画像を追加（モック）')
        ),
        ...images.map((img: { localId: string; uri: string }) =>
          React.createElement(
            TouchableOpacity,
            {
              key: img.localId,
              onPress: () => onRemove(img.localId),
              accessibilityRole: 'button',
              accessibilityLabel: `画像を削除: ${img.localId}`,
            },
            React.createElement(Text, null, `画像: ${img.localId}`)
          )
        )
      );
    },
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///test-image.jpg' }],
  })),
  MediaTypeOptions: { Images: 'Images' },
}));

// useBonsaiRecordsQuery（一覧クエリのキャッシュから対象記録を探す実装）用のレコードファクトリ。
// 本番コードは record.recordAt を "YYYY-MM-DD" に変換するため必ず非 null の ISO 文字列を持たせる。
function makeRecord(overrides: Partial<{
  id: string;
  content: string | null;
  recordAt: string;
  images: { url: string; sortOrder: number }[];
}> = {}) {
  return {
    id: 'record-1',
    content: null,
    recordAt: '2025-06-01T00:00:00Z',
    images: [],
    ...overrides,
  };
}

function makeRecordsQueryResult(
  items: ReturnType<typeof makeRecord>[],
  overrides: Record<string, unknown> = {}
) {
  return {
    data: { pages: [{ items, nextCursor: null }] },
    isLoading: false,
    isError: false,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnAdd = null;
  capturedOnRemove = null;
  capturedImages = [];
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'bonsai-1', recordId: 'record-1' });
  mockUseBonsaiRecordsQuery.mockReturnValue(makeRecordsQueryResult([makeRecord()]));
  mockUseUpdateBonsaiRecordMutation.mockReturnValue({
    mutate: mockUpdateRecord,
    isPending: false,
  });
});

describe('BonsaiRecordEditScreen', () => {
  describe('ヘッダー', () => {
    it('「記録を編集」タイトルが表示される', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(screen.getByText('記録を編集')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('キャンセルボタンを押すと Alert が表示される', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<BonsaiRecordEditScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(alertSpy).toHaveBeenCalledWith(
        '変更を破棄しますか？',
        expect.any(String),
        expect.any(Array)
      );
    });
  });

  describe('バリデーション', () => {
    it('コンテンツが空のとき保存ボタンは disabled になる', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('コンテンツを入力すると保存ボタンが有効になる', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の様子');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('保存', () => {
    it('コンテンツ入力後に保存すると updateRecord が呼ばれる', async () => {
      const mockUpdate = jest.fn();
      mockUseUpdateBonsaiRecordMutation.mockReturnValue({ mutate: mockUpdate, isPending: false });
      renderWithProviders(<BonsaiRecordEditScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の様子');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: 'record-1', content: '今日の様子' }),
        expect.anything()
      );
    });

    it('オフライン時に保存しようとするとエラーが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<BonsaiRecordEditScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の様子');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText(/オフライン|接続/)).toBeTruthy();
    });
  });

  describe('画像添付', () => {
    it('ImageAttachmentGrid が描画される', () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(screen.getByRole('button', { name: '画像を追加（モック）' })).toBeTruthy();
    });

    it('onAdd を呼ぶと画像が追加され保存ボタンが有効になる', async () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(capturedOnAdd).not.toBeNull();
      await waitFor(async () => {
        capturedOnAdd?.();
      });
      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: '保存する' });
        expect(saveButton.props.accessibilityState?.disabled).toBe(false);
      });
    });

    it('onRemove を呼ぶと画像が削除される', async () => {
      renderWithProviders(<BonsaiRecordEditScreen />);
      await waitFor(async () => {
        capturedOnAdd?.();
      });
      await waitFor(() => {
        expect(capturedImages.length).toBeGreaterThan(0);
      });
      const addedId = capturedImages[0]?.localId;
      if (addedId !== undefined) {
        await waitFor(() => {
          capturedOnRemove?.(addedId);
        });
        await waitFor(() => {
          expect(capturedImages.find((img) => img.localId === addedId)).toBeUndefined();
        });
      }
    });
  });

  describe('id パラメータ型ガード', () => {
    it('id が配列のとき空文字として扱う', () => {
      mockUseLocalSearchParams.mockReturnValue({ id: ['b1', 'b2'], recordId: 'record-1' });
      renderWithProviders(<BonsaiRecordEditScreen />);
      expect(screen.getByText('記録を編集')).toBeTruthy();
    });
  });
});
