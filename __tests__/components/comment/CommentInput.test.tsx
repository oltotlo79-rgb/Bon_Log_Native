/**
 * @module __tests__/components/comment/CommentInput
 * CommentInput コンポーネントのテスト。
 * canSubmit ロジック・送信後テキストクリア・返信モード・文字数カウンタ・
 * 画像/動画添付・アップロード失敗ハンドリングを検証する。
 * モック境界: expo-image-picker（選択ダイアログ）と lib/queries/upload（アップロード）。
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CommentInput } from '@/components/comment/CommentInput';
import { MAX_COMMENT_LENGTH } from '@/lib/constants/limits/post';
import { MAX_COMMENT_IMAGES } from '@/lib/constants/limits/media';
import { ERR_MEDIA_UPLOAD_FAILED } from '@/lib/constants/errors';

const onSubmit = jest.fn();
const onCancelReply = jest.fn();
const onUploadError = jest.fn();

const DEFAULT_PROPS = {
  replyTarget: null,
  onCancelReply,
  onSubmit,
  onUploadError,
  isSubmitting: false,
  isPremium: false,
};

const mockUploadImage = jest.fn();
const mockUploadVideo = jest.fn();
jest.mock('@/lib/queries/upload', () => ({
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  uploadVideo: (...args: unknown[]) => mockUploadVideo(...args),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true, status: 'granted' })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///comment-image.jpg' }],
  })),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos' },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUploadImage.mockResolvedValue('https://cdn.bon-log.com/comment-image.jpg');
  mockUploadVideo.mockResolvedValue('https://cdn.bon-log.com/comment-video.mp4');
  const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = jest.requireMock('expo-image-picker') as {
    launchImageLibraryAsync: jest.Mock;
    requestMediaLibraryPermissionsAsync: jest.Mock;
  };
  requestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
  launchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///comment-image.jpg' }],
  });
});

describe('CommentInput', () => {
  describe('基本表示', () => {
    it('テキスト入力フィールドが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByTestId('comment-input')).toBeTruthy();
    });

    it('送信ボタンが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('コメントを送信する')).toBeTruthy();
    });

    it('画像添付ボタンが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      expect(screen.getByLabelText('画像を添付')).toBeTruthy();
    });
  });

  describe('canSubmit ロジック', () => {
    it('空文字の場合は送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);
      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('空白のみの場合は送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '   ');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('テキストが入力されると送信ボタンが有効になる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '盆栽について');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    it('文字数が MAX_COMMENT_LENGTH を超えると送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(
        screen.getByTestId('comment-input'),
        'a'.repeat(MAX_COMMENT_LENGTH + 1)
      );

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });

    it('isSubmitting が true のとき送信ボタンが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} isSubmitting={true} />);

      // テキストを入力しても
      fireEvent.changeText(screen.getByTestId('comment-input'), 'コメント');

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('送信動作', () => {
    it('送信ボタンを押すと onSubmit が呼ばれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '素敵な盆栽ですね');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith({
        content: '素敵な盆栽ですね',
        parentId: undefined,
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    it('送信後にテキストがクリアされる', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '素敵な盆栽ですね');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      const input = screen.getByTestId('comment-input');
      expect(input.props.value).toBe('');
    });

    it('前後の空白がトリムされて onSubmit に渡される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '  盆栽最高  ');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ content: '盆栽最高' })
      );
    });

    it('canSubmit が false のとき送信ボタンを押しても onSubmit が呼ばれない', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      // テキストなしで押す
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe('返信モード', () => {
    const replyTarget = {
      parentId: 'comment-1',
      nickname: '松の匠',
    };

    it('replyTarget がある場合は返信バナーが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      expect(screen.getByText('@松の匠')).toBeTruthy();
    });

    it('返信モード時に送信すると parentId が含まれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '返信コメント');
      fireEvent.press(screen.getByLabelText('コメントを送信する'));

      expect(onSubmit).toHaveBeenCalledWith({
        content: '返信コメント',
        parentId: 'comment-1',
        mediaUrls: [],
        mediaTypes: [],
      });
    });

    it('返信キャンセルボタンを押すと onCancelReply が呼ばれる', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={replyTarget} />);

      fireEvent.press(screen.getByLabelText('返信をキャンセル'));

      expect(onCancelReply).toHaveBeenCalled();
    });

    it('replyTarget が null の場合は返信バナーが表示されない', () => {
      render(<CommentInput {...DEFAULT_PROPS} replyTarget={null} />);

      expect(screen.queryByLabelText('返信をキャンセル')).toBeNull();
    });
  });

  describe('文字数カウンタ', () => {
    it('入力前はカウンタが非表示', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      // カウンタテキスト「0 / 500」は未フォーカス・空文字の場合は非表示
      expect(screen.queryByText(`0 / ${MAX_COMMENT_LENGTH}`)).toBeNull();
    });

    it('テキストを入力するとカウンタが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), 'あ');

      expect(screen.getByText(`1 / ${MAX_COMMENT_LENGTH}`)).toBeTruthy();
    });

    it('MAX_COMMENT_LENGTH 文字まで入力可能', () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      const exactText = 'a'.repeat(MAX_COMMENT_LENGTH);
      fireEvent.changeText(screen.getByTestId('comment-input'), exactText);

      expect(screen.getByText(`${MAX_COMMENT_LENGTH} / ${MAX_COMMENT_LENGTH}`)).toBeTruthy();
      // 上限丁度は送信可能
      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });
  });

  describe('isSubmitting 時の表示', () => {
    it('isSubmitting が true のとき入力フィールドが disabled', () => {
      render(<CommentInput {...DEFAULT_PROPS} isSubmitting={true} />);

      const input = screen.getByTestId('comment-input');
      expect(input.props.editable).toBe(false);
    });
  });

  describe('画像添付', () => {
    it('画像添付ボタンを押すとサムネイルが表示される', async () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });

      await waitFor(() => {
        expect(screen.getByLabelText('添付画像1')).toBeTruthy();
      });
    });

    it('画像のみ（本文なし）でも送信ボタンが有効になる', async () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => {
        expect(screen.getByLabelText('添付画像1')).toBeTruthy();
      });

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);
    });

    it('送信すると uploadImage が呼ばれ、mediaUrls/mediaTypes が onSubmit に渡される', async () => {
      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '画像付きコメント');
      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => {
        expect(screen.getByLabelText('添付画像1')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(screen.getByLabelText('コメントを送信する'));
      });

      await waitFor(() => {
        expect(mockUploadImage).toHaveBeenCalledWith({ localUri: 'file:///comment-image.jpg' });
      });
      expect(onSubmit).toHaveBeenCalledWith({
        content: '画像付きコメント',
        parentId: undefined,
        mediaUrls: ['https://cdn.bon-log.com/comment-image.jpg'],
        mediaTypes: ['image'],
      });
    });

    it(`画像は最大${MAX_COMMENT_IMAGES}枚まで添付すると追加ボタンが disabled になる`, async () => {
      const { launchImageLibraryAsync } = jest.requireMock('expo-image-picker') as {
        launchImageLibraryAsync: jest.Mock;
      };
      launchImageLibraryAsync
        .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///img1.jpg' }] })
        .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///img2.jpg' }] });

      render(<CommentInput {...DEFAULT_PROPS} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => expect(screen.getByLabelText('添付画像1')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => expect(screen.getByLabelText('添付画像2')).toBeTruthy());

      const addButton = screen.getByLabelText('画像を添付');
      expect(addButton.props.accessibilityState.disabled).toBe(true);
      // 上限到達後は ImageAttachmentGrid 側の「画像を追加」ボタンも非表示になる
      expect(screen.queryByLabelText('画像を追加')).toBeNull();
    });
  });

  describe('動画添付（プレミアム限定）', () => {
    const videoAsset = {
      canceled: false,
      assets: [{ uri: 'file:///comment-video.mp4', fileSize: 2048 }],
    };

    it('非プレミアムのときは動画添付ボタンが表示されない', () => {
      render(<CommentInput {...DEFAULT_PROPS} isPremium={false} />);
      expect(screen.queryByLabelText('動画を添付')).toBeNull();
    });

    it('プレミアムのとき動画添付ボタンが表示される', () => {
      render(<CommentInput {...DEFAULT_PROPS} isPremium={true} />);
      expect(screen.getByLabelText('動画を添付')).toBeTruthy();
    });

    it('動画を添付するとプレビュー（削除ボタン）が表示される', async () => {
      const { launchImageLibraryAsync } = jest.requireMock('expo-image-picker') as {
        launchImageLibraryAsync: jest.Mock;
      };
      launchImageLibraryAsync.mockResolvedValueOnce(videoAsset);

      render(<CommentInput {...DEFAULT_PROPS} isPremium={true} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('動画を添付'));
      });

      await waitFor(() => {
        expect(screen.getByLabelText('動画を削除')).toBeTruthy();
      });
    });

    it('動画のみ（本文なし）でも送信可能になり、uploadVideo が fileSize 付きで呼ばれる', async () => {
      const { launchImageLibraryAsync } = jest.requireMock('expo-image-picker') as {
        launchImageLibraryAsync: jest.Mock;
      };
      launchImageLibraryAsync.mockResolvedValueOnce(videoAsset);

      render(<CommentInput {...DEFAULT_PROPS} isPremium={true} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('動画を添付'));
      });
      await waitFor(() => {
        expect(screen.getByLabelText('動画を削除')).toBeTruthy();
      });

      const submitButton = screen.getByLabelText('コメントを送信する');
      expect(submitButton.props.accessibilityState.disabled).toBe(false);

      await act(async () => {
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(mockUploadVideo).toHaveBeenCalledWith({
          localUri: 'file:///comment-video.mp4',
          fileSize: 2048,
        });
      });
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          mediaUrls: ['https://cdn.bon-log.com/comment-video.mp4'],
          mediaTypes: ['video'],
        })
      );
    });
  });

  describe('アップロード失敗', () => {
    it('画像アップロードが失敗すると onUploadError が呼ばれ、onSubmit は呼ばれない', async () => {
      mockUploadImage.mockRejectedValueOnce(new Error('upload failed'));

      render(<CommentInput {...DEFAULT_PROPS} />);

      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => expect(screen.getByLabelText('添付画像1')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('コメントを送信する'));
      });

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalledWith(ERR_MEDIA_UPLOAD_FAILED);
      });
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('アップロード失敗時は入力テキストがクリアされずに保持される', async () => {
      mockUploadImage.mockRejectedValueOnce(new Error('upload failed'));

      render(<CommentInput {...DEFAULT_PROPS} />);

      fireEvent.changeText(screen.getByTestId('comment-input'), '失敗するはずのコメント');
      await act(async () => {
        fireEvent.press(screen.getByLabelText('画像を添付'));
      });
      await waitFor(() => expect(screen.getByLabelText('添付画像1')).toBeTruthy());

      await act(async () => {
        fireEvent.press(screen.getByLabelText('コメントを送信する'));
      });

      await waitFor(() => expect(onUploadError).toHaveBeenCalledTimes(1));
      expect(screen.getByTestId('comment-input').props.value).toBe('失敗するはずのコメント');
    });
  });
});
