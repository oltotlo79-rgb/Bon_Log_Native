/**
 * @module components/user/UserActionMenu
 * ユーザー/投稿/コメントに対する通報・ブロック・ミュート操作のボトムシートメニュー。
 * 仕様: docs/design/ugc-safety.md §2・§8
 *
 * iOS は ActionSheetIOS、Android はカスタム Modal で実装する（設計 §2.1）。
 * ミュートは確認不要で直接 API を呼ぶ（設計 §4.1）。
 * ブロックは BlockConfirmDialog で確認後に実行（設計 §3.1）。
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ActionSheetIOS,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBlockUserMutation, useUnblockUserMutation, useMuteUserMutation, useUnmuteUserMutation } from '@/lib/queries/moderation';
import { isApiError } from '@/lib/api/errors';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useToast } from '@/hooks/use-toast';
import { Toast } from '@/components/common/Toast';
import { BlockConfirmDialog } from '@/components/user/BlockConfirmDialog';
import { ReportDialog } from '@/components/report/ReportDialog';
import {
  colorSurface,
  colorTextPrimary,
  colorTextSecondary,
  colorError,
  colorBorderLight,
  colorSurfaceMuted,
  spacing2,
  spacing5,
  radius2xl,
  radiusFull,
  shadowWashiLg,
  textMd,
  textSm,
} from '@/lib/constants/design-tokens';
import {
  ERR_MUTE_FAILED,
  ERR_UNMUTE_FAILED,
  ERR_UNBLOCK_FAILED,
  ERR_MUTE_ALREADY_MUTED,
  ERR_RATE_LIMIT,
  ERR_USER_NOT_FOUND,
  ERR_FORBIDDEN,
  ERR_OFFLINE_ACTION,
  ERR_BLOCK_ALREADY_BLOCKED,
} from '@/lib/constants/errors';
import type { ReportTargetType } from '@/lib/constants/report';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const MENU_ITEM_HEIGHT = 56;
const ICON_SIZE = 20;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type UserActionMenuProps = {
  targetUserId: string;
  targetUserNickname: string;
  /** 自分のコンテンツかどうか（true の場合はメニュー自体を表示しない） */
  isOwnContent: boolean;
  /** メニューの種別（投稿/コメント/ユーザー） */
  contentType: ReportTargetType;
  /** 対象コンテンツ ID */
  contentId: string;
  /** 対象ユーザーをブロック中か */
  isBlocked: boolean;
  /** 対象ユーザーをミュート中か */
  isMuted: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// メニュー項目型
// ---------------------------------------------------------------------------

type MenuAction = 'report' | 'block' | 'unblock' | 'mute' | 'unmute';

type MenuItem = {
  action: MenuAction;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  isDestructive: boolean;
};

// ---------------------------------------------------------------------------
// メニュー項目の構築
// ---------------------------------------------------------------------------

function buildMenuItems(
  contentType: ReportTargetType,
  nickname: string,
  isBlocked: boolean,
  isMuted: boolean,
): MenuItem[] {
  const items: MenuItem[] = [];

  if (contentType === 'post') {
    items.push({ action: 'report', label: '投稿を通報', iconName: 'flag-outline', isDestructive: true });
    if (isBlocked) {
      items.push({ action: 'unblock', label: `@${nickname} のブロックを解除`, iconName: 'person-add-outline', isDestructive: false });
    } else {
      items.push({ action: 'block', label: `@${nickname} をブロック`, iconName: 'ban-outline', isDestructive: true });
      if (isMuted) {
        items.push({ action: 'unmute', label: `@${nickname} のミュートを解除`, iconName: 'volume-medium-outline', isDestructive: false });
      } else {
        items.push({ action: 'mute', label: `@${nickname} をミュート`, iconName: 'volume-mute-outline', isDestructive: true });
      }
    }
  } else if (contentType === 'comment') {
    items.push({ action: 'report', label: 'コメントを通報', iconName: 'flag-outline', isDestructive: true });
    if (isBlocked) {
      items.push({ action: 'unblock', label: `@${nickname} のブロックを解除`, iconName: 'person-add-outline', isDestructive: false });
    } else {
      items.push({ action: 'block', label: `@${nickname} をブロック`, iconName: 'ban-outline', isDestructive: true });
      if (isMuted) {
        items.push({ action: 'unmute', label: `@${nickname} のミュートを解除`, iconName: 'volume-medium-outline', isDestructive: false });
      } else {
        items.push({ action: 'mute', label: `@${nickname} をミュート`, iconName: 'volume-mute-outline', isDestructive: true });
      }
    }
  } else {
    // user
    items.push({ action: 'report', label: `@${nickname} を通報`, iconName: 'flag-outline', isDestructive: true });
    if (isBlocked) {
      items.push({ action: 'unblock', label: `@${nickname} のブロックを解除`, iconName: 'person-add-outline', isDestructive: false });
    } else {
      items.push({ action: 'block', label: `@${nickname} をブロック`, iconName: 'ban-outline', isDestructive: true });
      if (!isBlocked) {
        if (isMuted) {
          items.push({ action: 'unmute', label: `@${nickname} のミュートを解除`, iconName: 'volume-medium-outline', isDestructive: false });
        } else {
          items.push({ action: 'mute', label: `@${nickname} をミュート`, iconName: 'volume-mute-outline', isDestructive: true });
        }
      }
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function UserActionMenu({
  targetUserId,
  targetUserNickname,
  isOwnContent,
  contentType,
  contentId,
  isBlocked,
  isMuted,
  onClose,
}: UserActionMenuProps) {
  const isOnline = useOnlineStatus();
  const { toast, showToast, hideToast } = useToast();

  const blockMutation = useBlockUserMutation();
  const unblockMutation = useUnblockUserMutation();
  const muteMutation = useMuteUserMutation();
  const unmuteMutation = useUnmuteUserMutation();

  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const isAnyPending =
    blockMutation.isPending ||
    unblockMutation.isPending ||
    muteMutation.isPending ||
    unmuteMutation.isPending;

  const handleMute = useCallback(() => {
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      onClose();
      return;
    }
    onClose();
    muteMutation.mutate(
      { userId: targetUserId },
      {
        onSuccess: () => {
          showToast(`@${targetUserNickname} をミュートしました`, 'default');
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'CONFLICT') {
              showToast(ERR_MUTE_ALREADY_MUTED, 'error');
            } else if (error.code === 'RATE_LIMITED') {
              showToast(ERR_RATE_LIMIT, 'warning');
            } else if (error.code === 'NOT_FOUND') {
              showToast(ERR_USER_NOT_FOUND, 'error');
            } else {
              showToast(ERR_MUTE_FAILED, 'error');
            }
          } else {
            showToast(ERR_MUTE_FAILED, 'error');
          }
        },
      }
    );
  }, [isOnline, onClose, muteMutation, targetUserId, targetUserNickname, showToast]);

  const handleUnmute = useCallback(() => {
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      onClose();
      return;
    }
    onClose();
    unmuteMutation.mutate(
      { userId: targetUserId },
      {
        onSuccess: () => {
          showToast(`@${targetUserNickname} のミュートを解除しました`, 'default');
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'RATE_LIMITED') {
              showToast(ERR_RATE_LIMIT, 'warning');
            } else if (error.code === 'NOT_FOUND') {
              showToast(ERR_USER_NOT_FOUND, 'error');
            } else {
              showToast(ERR_UNMUTE_FAILED, 'error');
            }
          } else {
            showToast(ERR_UNMUTE_FAILED, 'error');
          }
        },
      }
    );
  }, [isOnline, onClose, unmuteMutation, targetUserId, targetUserNickname, showToast]);

  const handleBlockConfirm = useCallback(() => {
    blockMutation.mutate(
      { userId: targetUserId },
      {
        onSuccess: () => {
          setShowBlockConfirm(false);
          showToast(`@${targetUserNickname} をブロックしました`, 'default');
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'CONFLICT') {
              setShowBlockConfirm(false);
              showToast(ERR_BLOCK_ALREADY_BLOCKED, 'error');
            } else if (error.code === 'RATE_LIMITED') {
              showToast(ERR_RATE_LIMIT, 'warning');
            } else if (error.code === 'NOT_FOUND') {
              setShowBlockConfirm(false);
              showToast(ERR_USER_NOT_FOUND, 'error');
            } else if (error.code === 'GUEST_NOT_ALLOWED' || error.code === 'ACCOUNT_SUSPENDED') {
              setShowBlockConfirm(false);
              showToast(ERR_FORBIDDEN, 'error');
            }
          }
        },
      }
    );
  }, [blockMutation, targetUserId, targetUserNickname, showToast]);

  const handleUnblock = useCallback(() => {
    if (!isOnline) {
      showToast(ERR_OFFLINE_ACTION, 'warning');
      onClose();
      return;
    }
    onClose();
    unblockMutation.mutate(
      { userId: targetUserId },
      {
        onSuccess: () => {
          showToast(`@${targetUserNickname} のブロックを解除しました`, 'default');
        },
        onError: (error) => {
          if (isApiError(error)) {
            if (error.code === 'RATE_LIMITED') {
              showToast(ERR_RATE_LIMIT, 'warning');
            } else if (error.code === 'NOT_FOUND') {
              showToast(ERR_USER_NOT_FOUND, 'error');
            } else {
              showToast(ERR_UNBLOCK_FAILED, 'error');
            }
          } else {
            showToast(ERR_UNBLOCK_FAILED, 'error');
          }
        },
      }
    );
  }, [isOnline, onClose, unblockMutation, targetUserId, targetUserNickname, showToast]);

  const handleAction = useCallback((action: MenuAction) => {
    switch (action) {
      case 'report':
        setShowReportDialog(true);
        break;
      case 'block':
        if (!isOnline) {
          showToast(ERR_OFFLINE_ACTION, 'warning');
          onClose();
          return;
        }
        setShowBlockConfirm(true);
        break;
      case 'unblock':
        handleUnblock();
        break;
      case 'mute':
        handleMute();
        break;
      case 'unmute':
        handleUnmute();
        break;
    }
  }, [isOnline, onClose, showToast, handleUnblock, handleMute, handleUnmute]);

  // iOS は ActionSheetIOS を使用する
  if (Platform.OS === 'ios') {
    return (
      <IosActionSheet
        contentType={contentType}
        contentId={contentId}
        targetUserId={targetUserId}
        targetUserNickname={targetUserNickname}
        isOwnContent={isOwnContent}
        isBlocked={isBlocked}
        isMuted={isMuted}
        onClose={onClose}
        onAction={handleAction}
        showReportDialog={showReportDialog}
        showBlockConfirm={showBlockConfirm}
        onCloseReport={() => {
          setShowReportDialog(false);
          onClose();
        }}
        onCloseBlock={() => setShowBlockConfirm(false)}
        onBlockConfirm={handleBlockConfirm}
        isBlocking={blockMutation.isPending}
        toast={toast}
        onHideToast={hideToast}
      />
    );
  }

  if (isOwnContent) return null;

  const menuItems = buildMenuItems(contentType, targetUserNickname, isBlocked, isMuted);

  return (
    <View>
      <Modal
        visible={!showBlockConfirm && !showReportDialog}
        transparent
        animationType="slide"
        onRequestClose={onClose}
        accessibilityViewIsModal
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* ハンドル */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {menuItems.map((item, index) => (
            <View key={item.action}>
              {index > 0 && <View style={styles.separator} />}
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && styles.menuItemPressed,
                ]}
                onPress={() => handleAction(item.action)}
                disabled={isAnyPending}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityHint={item.isDestructive ? 'この操作は取り消せない場合があります' : undefined}
              >
                <Ionicons
                  name={item.iconName}
                  size={ICON_SIZE}
                  color={item.isDestructive ? colorError : colorTextPrimary}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
                <Text
                  style={[
                    styles.menuItemText,
                    item.isDestructive && styles.menuItemTextDestructive,
                  ]}
                >
                  {item.label}
                </Text>
                {isAnyPending && (
                  <ActivityIndicator
                    size="small"
                    color={colorTextSecondary}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                )}
              </Pressable>
            </View>
          ))}

          <View style={styles.separator} />
          <Pressable
            style={({ pressed }) => [
              styles.menuItem,
              pressed && styles.menuItemPressed,
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="キャンセル"
          >
            <Ionicons
              name="close-outline"
              size={ICON_SIZE}
              color={colorTextSecondary}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
            <Text style={styles.menuItemTextCancel}>キャンセル</Text>
          </Pressable>
        </View>
      </Modal>

      {showBlockConfirm && (
        <BlockConfirmDialog
          targetUserId={targetUserId}
          targetNickname={targetUserNickname}
          onConfirm={handleBlockConfirm}
          onCancel={() => setShowBlockConfirm(false)}
          isBlocking={blockMutation.isPending}
        />
      )}

      {showReportDialog && (
        <ReportDialog
          targetType={contentType}
          targetId={contentId}
          targetDisplayName={targetUserNickname}
          onClose={() => {
            setShowReportDialog(false);
            onClose();
          }}
        />
      )}

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
// iOS ActionSheetIOS ラッパー（設計 §2.1）
// ---------------------------------------------------------------------------

type IosActionSheetProps = {
  contentType: ReportTargetType;
  contentId: string;
  targetUserId: string;
  targetUserNickname: string;
  isOwnContent: boolean;
  isBlocked: boolean;
  isMuted: boolean;
  onClose: () => void;
  onAction: (action: MenuAction) => void;
  showReportDialog: boolean;
  showBlockConfirm: boolean;
  onCloseReport: () => void;
  onCloseBlock: () => void;
  onBlockConfirm: () => void;
  isBlocking: boolean;
  toast: { message: string; visible: boolean; variant: 'default' | 'error' | 'warning' };
  onHideToast: () => void;
};

function IosActionSheet({
  contentType,
  contentId,
  targetUserNickname,
  isOwnContent,
  isBlocked,
  isMuted,
  onClose,
  onAction,
  showReportDialog,
  showBlockConfirm,
  onCloseReport,
  onCloseBlock,
  onBlockConfirm,
  isBlocking,
  targetUserId,
  toast,
  onHideToast,
}: IosActionSheetProps) {
  React.useEffect(() => {
    if (isOwnContent) {
      onClose();
      return;
    }

    const items = buildMenuItems(contentType, targetUserNickname, isBlocked, isMuted);
    const options = [...items.map((i) => i.label), 'キャンセル'];
    const destructiveButtonIndices = items
      .map((item, index) => (item.isDestructive ? index : -1))
      .filter((i) => i >= 0);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex: options.length - 1,
        destructiveButtonIndex: destructiveButtonIndices,
      },
      (buttonIndex) => {
        if (buttonIndex < items.length) {
          onAction(items[buttonIndex].action);
        } else {
          onClose();
        }
      }
    );
  // showActionSheetWithOptions は一度だけ呼ぶ
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View>
      {showBlockConfirm && (
        <BlockConfirmDialog
          targetUserId={targetUserId}
          targetNickname={targetUserNickname}
          onConfirm={onBlockConfirm}
          onCancel={onCloseBlock}
          isBlocking={isBlocking}
        />
      )}

      {showReportDialog && (
        <ReportDialog
          targetType={contentType}
          targetId={contentId}
          targetDisplayName={targetUserNickname}
          onClose={onCloseReport}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        variant={toast.variant}
        onHide={onHideToast}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colorSurface,
    borderTopLeftRadius: radius2xl,
    borderTopRightRadius: radius2xl,
    paddingBottom: spacing5,
    ...shadowWashiLg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing2,
    paddingBottom: spacing2,
  },
  handle: {
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: radiusFull,
    backgroundColor: colorBorderLight,
  },
  separator: {
    height: 1,
    backgroundColor: colorBorderLight,
    marginHorizontal: spacing5,
  },
  menuItem: {
    height: MENU_ITEM_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing5,
    gap: spacing5,
  },
  menuItemPressed: {
    backgroundColor: colorSurfaceMuted,
  },
  menuItemText: {
    ...textMd,
    color: colorTextPrimary,
    flex: 1,
  },
  menuItemTextDestructive: {
    color: colorError,
  },
  menuItemTextCancel: {
    ...textSm,
    color: colorTextSecondary,
    flex: 1,
  },
});
