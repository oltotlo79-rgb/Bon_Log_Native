/**
 * app/bonsai/[id]/records/new/index の成長記録追加フォームテスト。
 * ヘッダー・バリデーション・保存・キャンセル・画像追加・削除を検証する。
 */

import React from 'react';
import { Alert } from 'react-native';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import BonsaiRecordNewScreen from '@/app/bonsai/[id]/records/new/index';
import { renderWithProviders } from '@/__tests__/utils/test-utils';

const mockRouter = jest.requireMock('expo-router').router;
const mockUseLocalSearchParams = jest.requireMock('expo-router').useLocalSearchParams;

jest.mock('@/hooks/use-online-status', () => ({
  useOnlineStatus: jest.fn(() => true),
}));

const mockCreateRecord = jest.fn();
const mockUseCreateBonsaiRecordMutation = jest.fn();

jest.mock('@/lib/queries/bonsai', () => ({
  useCreateBonsaiRecordMutation: () => mockUseCreateBonsaiRecordMutation(),
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

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnAdd = null;
  capturedOnRemove = null;
  capturedImages = [];
  const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
    useOnlineStatus: jest.Mock;
  };
  useOnlineStatus.mockReturnValue(true);
  mockUseLocalSearchParams.mockReturnValue({ id: 'bonsai-1' });
  mockUseCreateBonsaiRecordMutation.mockReturnValue({
    mutate: mockCreateRecord,
    isPending: false,
  });
});

describe('BonsaiRecordNewScreen', () => {
  describe('ヘッダー', () => {
    it('「記録を追加」タイトルが表示される', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      expect(screen.getByText('記録を追加')).toBeTruthy();
    });

    it('「キャンセル」ボタンが表示される', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeTruthy();
    });

    it('「保存する」ボタンが表示される', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy();
    });
  });

  describe('キャンセル', () => {
    it('入力なしでキャンセルすると router.back が呼ばれる', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      fireEvent.press(screen.getByRole('button', { name: 'キャンセル' }));
      expect(mockRouter.back).toHaveBeenCalledTimes(1);
    });

    it('入力ありでキャンセルすると Alert が表示される', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      renderWithProviders(<BonsaiRecordNewScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '入力中のテキスト');
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
      renderWithProviders(<BonsaiRecordNewScreen />);
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('コンテンツを入力すると保存ボタンが有効になる', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の水やりと剪定を行った');
      const saveButton = screen.getByRole('button', { name: '保存する' });
      expect(saveButton.props.accessibilityState?.disabled).toBe(false);
    });
  });

  describe('保存', () => {
    it('コンテンツ入力後に保存すると createRecord が呼ばれる', async () => {
      const mockCreate = jest.fn();
      mockUseCreateBonsaiRecordMutation.mockReturnValue({
        mutate: mockCreate,
        isPending: false,
      });
      renderWithProviders(<BonsaiRecordNewScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の水やり');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      await waitFor(() => expect(mockCreate).toHaveBeenCalled());
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ bonsaiId: 'bonsai-1', content: '今日の水やり' }),
        expect.anything()
      );
    });

    it('オフライン時に保存しようとするとエラーが表示される', () => {
      const { useOnlineStatus } = jest.requireMock('@/hooks/use-online-status') as {
        useOnlineStatus: jest.Mock;
      };
      useOnlineStatus.mockReturnValue(false);
      renderWithProviders(<BonsaiRecordNewScreen />);
      fireEvent.changeText(screen.getByLabelText('記録内容（任意）'), '今日の水やり');
      fireEvent.press(screen.getByRole('button', { name: '保存する' }));
      expect(screen.getByText(/オフライン|接続/)).toBeTruthy();
    });
  });

  describe('画像添付', () => {
    it('「画像を追加（モック）」ボタンが表示される（ImageAttachmentGrid が描画される）', () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
      expect(screen.getByRole('button', { name: '画像を追加（モック）' })).toBeTruthy();
    });

    it('onAdd を呼ぶと画像が追加され保存ボタンが有効になる', async () => {
      renderWithProviders(<BonsaiRecordNewScreen />);
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
      renderWithProviders(<BonsaiRecordNewScreen />);
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
});
