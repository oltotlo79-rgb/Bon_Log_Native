/**
 * @module __tests__/hooks/use-post-card-props
 * mapToPostCardProps の変換ロジックテスト。
 * editedAt 判定・isPinned 固定・mentionUsers 空 Map・media type 変換を検証する。
 * onLike は LikeButton に委譲されたため callbacks から除外済み。
 */

import { mapToPostCardProps } from '@/hooks/use-post-card-props';
import { makeFeedItem } from '@/__tests__/utils/data-factories';

const baseCallbacks = {
  onComment: jest.fn(),
};

describe('mapToPostCardProps', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('editedAt 判定', () => {
    it('createdAt と updatedAt が同一のとき editedAt は undefined になる', () => {
      const post = makeFeedItem({
        createdAt: '2025-06-01T10:00:00Z',
        updatedAt: '2025-06-01T10:00:00Z',
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.editedAt).toBeUndefined();
    });

    it('createdAt と updatedAt が異なるとき editedAt は updatedAt になる', () => {
      const updatedAt = '2025-06-02T12:00:00Z';
      const post = makeFeedItem({
        createdAt: '2025-06-01T10:00:00Z',
        updatedAt,
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.editedAt).toBe(updatedAt);
    });
  });

  describe('isPinned', () => {
    it('isPinned は常に false になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.isPinned).toBe(false);
    });
  });

  describe('mentionUsers', () => {
    it('mentionUsers は空 Map になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.mentionUsers).toBeInstanceOf(Map);
      expect(props.mentionUsers.size).toBe(0);
    });
  });

  describe('media.type 変換', () => {
    it('type="image" は PostImageMedia の "image" に変換される', () => {
      const post = makeFeedItem({
        media: [{ id: 'm-1', url: 'https://example.com/img.jpg', type: 'image', sortOrder: 0 }],
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.media[0]?.type).toBe('image');
    });

    it('type="video" は PostImageMedia の "video" に変換される', () => {
      const post = makeFeedItem({
        media: [{ id: 'm-1', url: 'https://example.com/vid.mp4', type: 'video', sortOrder: 0 }],
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.media[0]?.type).toBe('video');
    });

    it('不明な type 値（"document" 等）は "image" にフォールバックする', () => {
      const post = makeFeedItem({
        media: [{ id: 'm-1', url: 'https://example.com/doc.pdf', type: 'document', sortOrder: 0 }],
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.media[0]?.type).toBe('image');
    });

    it('media が複数あるとき全て変換される', () => {
      const post = makeFeedItem({
        media: [
          { id: 'm-1', url: 'https://example.com/img1.jpg', type: 'image', sortOrder: 0 },
          { id: 'm-2', url: 'https://example.com/img2.jpg', type: 'image', sortOrder: 1 },
        ],
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.media).toHaveLength(2);
      expect(props.media[0]?.type).toBe('image');
      expect(props.media[1]?.type).toBe('image');
    });
  });

  describe('callbacks', () => {
    it('onComment が props に渡される', () => {
      const onComment = jest.fn();
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, { onComment });
      expect(props.onComment).toBe(onComment);
    });

    it('onMenuPress が渡されたとき props に含まれる', () => {
      const onMenuPress = jest.fn();
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, {
        onComment: jest.fn(),
        onMenuPress,
      });
      expect(props.onMenuPress).toBe(onMenuPress);
    });

    it('onMenuPress が省略されたとき props.onMenuPress は undefined になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.onMenuPress).toBeUndefined();
    });
  });

  describe('currentUserId', () => {
    it('currentUserId が渡されたとき props に含まれる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, 'user-abc', baseCallbacks);
      expect(props.currentUserId).toBe('user-abc');
    });

    it('currentUserId が undefined のとき props.currentUserId は undefined になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.currentUserId).toBeUndefined();
    });
  });

  describe('disableNavigation', () => {
    it('options.disableNavigation=true のとき props.disableNavigation が true になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks, { disableNavigation: true });
      expect(props.disableNavigation).toBe(true);
    });

    it('options が省略されたとき props.disableNavigation は false になる', () => {
      const post = makeFeedItem();
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.disableNavigation).toBe(false);
    });
  });

  describe('フィールド変換', () => {
    it('id / content / user フィールドが正しく変換される', () => {
      const post = makeFeedItem({
        id: 'post-xyz',
        content: 'テスト投稿',
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: 'https://example.com/avatar.jpg' },
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.id).toBe('post-xyz');
      expect(props.content).toBe('テスト投稿');
      expect(props.user.id).toBe('u-1');
      expect(props.user.nickname).toBe('盆栽太郎');
      expect(props.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('likeCount / commentCount / isLiked が正しく変換される', () => {
      const post = makeFeedItem({ likeCount: 10, commentCount: 3, isLiked: true });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.likeCount).toBe(10);
      expect(props.commentCount).toBe(3);
      expect(props.isLiked).toBe(true);
    });
  });
});
