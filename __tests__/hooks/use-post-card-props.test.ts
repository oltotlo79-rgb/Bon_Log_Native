/**
 * @module __tests__/hooks/use-post-card-props
 * mapToPostCardProps の変換ロジックテスト。
 * editedAt 判定・isPinned 固定・mentionUsers 空 Map・media type 変換、
 * および repostCount・isReposted・repostPost・quotePost・poll の 5 新フィールドを検証する。
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
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: 'https://example.com/avatar.jpg', isBlocked: false, isMuted: false },
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

    it('post.user.isBlocked=true が props.user.isBlocked に伝播する', () => {
      const post = makeFeedItem({
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: true, isMuted: false },
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.user.isBlocked).toBe(true);
    });

    it('post.user.isMuted=true が props.user.isMuted に伝播する', () => {
      const post = makeFeedItem({
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: false, isMuted: true },
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.user.isMuted).toBe(true);
    });

    it('post.user.isBlocked=false / isMuted=false のとき props.user に false が伝播する', () => {
      const post = makeFeedItem({
        user: { id: 'u-1', nickname: '盆栽太郎', avatarUrl: null, isBlocked: false, isMuted: false },
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.user.isBlocked).toBe(false);
      expect(props.user.isMuted).toBe(false);
    });
  });

  describe('repostCount / isReposted（新フィールド）', () => {
    it('repostCount=5 のとき props.repostCount に 5 が設定される', () => {
      const post = makeFeedItem({ repostCount: 5 });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostCount).toBe(5);
    });

    it('repostCount=0 のとき props.repostCount に 0 が設定される', () => {
      const post = makeFeedItem({ repostCount: 0 });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostCount).toBe(0);
    });

    it('isReposted=true のとき props.isReposted に true が設定される', () => {
      const post = makeFeedItem({ isReposted: true });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.isReposted).toBe(true);
    });

    it('isReposted=false のとき props.isReposted に false が設定される', () => {
      const post = makeFeedItem({ isReposted: false });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.isReposted).toBe(false);
    });
  });

  describe('repostPost（新フィールド）', () => {
    const repostPostData = {
      id: 'original-post-1',
      content: '元投稿の本文',
      user: { id: 'original-user-1', nickname: '元著者', avatarUrl: null },
      media: [{ id: 'media-1', url: 'https://example.com/img.jpg', type: 'image', sortOrder: 0 }],
    };

    it('repostPost が設定されているとき props.repostPost に変換される', () => {
      const post = makeFeedItem({ repostPost: repostPostData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostPost).not.toBeNull();
      expect(props.repostPost?.id).toBe('original-post-1');
      expect(props.repostPost?.content).toBe('元投稿の本文');
    });

    it('repostPost.user が正しく変換される', () => {
      const post = makeFeedItem({ repostPost: repostPostData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostPost?.user.id).toBe('original-user-1');
      expect(props.repostPost?.user.nickname).toBe('元著者');
      expect(props.repostPost?.user.avatarUrl).toBeNull();
    });

    it('repostPost.media が変換される', () => {
      const post = makeFeedItem({ repostPost: repostPostData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostPost?.media).toHaveLength(1);
      expect(props.repostPost?.media?.[0]?.id).toBe('media-1');
      expect(props.repostPost?.media?.[0]?.type).toBe('image');
    });

    it('repostPost が null のとき props.repostPost は null になる', () => {
      const post = makeFeedItem({ repostPost: null });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostPost).toBeNull();
    });

    it('repostPost.media がない場合は props.repostPost.media が undefined になる', () => {
      const postWithoutMedia = {
        id: 'original-post-2',
        content: '元投稿',
        user: { id: 'u-1', nickname: '元著者', avatarUrl: null },
      };
      const post = makeFeedItem({ repostPost: postWithoutMedia });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.repostPost?.media).toBeUndefined();
    });
  });

  describe('quotePost（新フィールド）', () => {
    const quotePostData = {
      id: 'quoted-post-1',
      content: '引用元の本文',
      user: { id: 'quoted-user-1', nickname: '引用元著者', avatarUrl: 'https://example.com/avatar.jpg' },
    };

    it('quotePost が設定されているとき props.quotePost に変換される', () => {
      const post = makeFeedItem({ quotePost: quotePostData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.quotePost).not.toBeNull();
      expect(props.quotePost?.id).toBe('quoted-post-1');
      expect(props.quotePost?.content).toBe('引用元の本文');
    });

    it('quotePost.user が正しく変換される', () => {
      const post = makeFeedItem({ quotePost: quotePostData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.quotePost?.user.id).toBe('quoted-user-1');
      expect(props.quotePost?.user.nickname).toBe('引用元著者');
      expect(props.quotePost?.user.avatarUrl).toBe('https://example.com/avatar.jpg');
    });

    it('quotePost が null のとき props.quotePost は null になる', () => {
      const post = makeFeedItem({ quotePost: null });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.quotePost).toBeNull();
    });

    it('quotePost と repostPost が両方設定されているとき両方変換される', () => {
      const post = makeFeedItem({
        quotePost: quotePostData,
        repostPost: {
          id: 'repost-original',
          content: '元リポスト本文',
          user: { id: 'repost-orig-user', nickname: '元リポスト著者', avatarUrl: null },
        },
      });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.quotePost?.id).toBe('quoted-post-1');
      expect(props.repostPost?.id).toBe('repost-original');
    });
  });

  describe('poll（新フィールド）', () => {
    it('poll が設定されているとき props.poll に渡される', () => {
      const pollData = {
        id: 'poll-1',
        postId: 'post-1',
        duration: 86400,
        createdAt: '2025-06-01T10:00:00Z',
        expiresAt: '2025-12-31T23:59:59Z',
        options: [{ id: 'opt-1', pollId: 'poll-1', text: '松柏類', sortOrder: 0, _count: { votes: 5 } }],
        votes: [],
        _count: { votes: 5 },
      };
      const post = makeFeedItem({ poll: pollData });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.poll).toEqual(pollData);
    });

    it('poll が null のとき props.poll は null になる', () => {
      const post = makeFeedItem({ poll: null });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.poll).toBeNull();
    });

    it('poll に不正な型が渡された場合もそのまま props.poll に渡される（型ガードは PollDisplay 側）', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 不正型ガードテストのため意図的に渡す
      const post = makeFeedItem({ poll: 'invalid' as any });
      const props = mapToPostCardProps(post, undefined, baseCallbacks);
      expect(props.poll).toBe('invalid');
    });
  });
});
