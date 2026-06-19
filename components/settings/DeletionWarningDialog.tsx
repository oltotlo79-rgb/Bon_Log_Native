/**
 * @module components/settings/DeletionWarningDialog
 * アカウント削除フロー 第1ダイアログ（警告）。
 * 削除されるデータの一覧と、プレミアム購読中ユーザーへの注意喚起を表示する。
 * 仕様: docs/design/account-deletion.md §4
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorTextPrimary,
  colorTextSecondary,
  colorTextLink,
  colorError,
  colorErrorBg,
  colorWarning,
  colorWarningBg,
  colorSurfaceMuted,
  spacing2,
  spacing3,
  spacing4,
  spacing6,
  radiusMd,
  radiusLg,
  radius2xl,
  textBase,
  textSm,
  textLg,
  shadowWashiLg,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const ICON_CIRCLE_SIZE = 56;
const ICON_SIZE = 28;
const INFO_ICON_SIZE = 16;
const GOOGLE_PLAY_SUBSCRIPTIONS_URL = 'https://play.google.com/store/account/subscriptions';

const DELETED_DATA_ITEMS = [
  'あなたが作成したすべての投稿とコメント',
  'フォロー中・フォロワーのつながり',
  'いいね・ブックマークなどの活動履歴',
  'アカウント情報（メールアドレス・プロフィール等）',
] as const;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type DeletionWarningDialogProps = {
  isVisible: boolean;
  isPremium: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeletionWarningDialog({
  isVisible,
  isPremium,
  onConfirm,
  onCancel,
}: DeletionWarningDialogProps) {
  async function handleOpenGooglePlay() {
    const canOpen = await Linking.canOpenURL(GOOGLE_PLAY_SUBSCRIPTIONS_URL);
    if (canOpen) {
      await Linking.openURL(GOOGLE_PLAY_SUBSCRIPTIONS_URL);
    }
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View
          style={styles.dialog}
          accessibilityRole="alert"
          accessibilityViewIsModal
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* アイコン */}
            <View style={styles.iconCircle}>
              <Ionicons
                name="warning-outline"
                size={ICON_SIZE}
                color={colorError}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>

            {/* タイトル */}
            <Text style={styles.title}>アカウントを削除しますか？</Text>

            {/* 説明文 */}
            <Text style={styles.body}>
              この操作は取り消せません。削除すると、以下のすべてのデータが完全に削除されます。
            </Text>

            {/* 削除されるデータリスト */}
            <View style={styles.dataList}>
              {DELETED_DATA_ITEMS.map((item, index) => (
                <Text
                  key={index}
                  style={styles.dataListItem}
                  accessibilityRole="text"
                >
                  {`• ${item}`}
                </Text>
              ))}
            </View>

            {/* プレミアム購読中ユーザーへの注意喚起 */}
            {isPremium && (
              <View
                style={styles.premiumWarning}
                accessibilityLiveRegion="polite"
              >
                <View style={styles.premiumWarningHeader}>
                  <Ionicons
                    name="information-circle-outline"
                    size={INFO_ICON_SIZE}
                    color={colorWarning}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text style={styles.premiumWarningTitle}>
                    プレミアムプランをご利用中の方へ
                  </Text>
                </View>
                <Text style={styles.premiumWarningBody}>
                  アカウントを削除してもプレミアムプランは自動的には解約されません。Google Play の定期購入管理ページから先にプランを解約されることをおすすめします。
                </Text>
                <TouchableOpacity
                  onPress={handleOpenGooglePlay}
                  accessibilityRole="link"
                  accessibilityLabel="Google Play 定期購入の管理（外部リンク）"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.premiumWarningLink}>
                    Google Play 定期購入の管理
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* ボタン */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="キャンセル"
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel="削除に進む"
            >
              <Text style={styles.confirmButtonText}>削除に進む</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 26, 26, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing6,
  },
  dialog: {
    backgroundColor: colorBackground,
    borderRadius: radius2xl,
    padding: spacing6,
    width: '100%',
    maxHeight: '85%',
    gap: spacing4,
    ...shadowWashiLg,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: colorErrorBg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing3,
  },
  title: {
    ...textLg,
    color: colorTextPrimary,
    textAlign: 'center',
    marginBottom: spacing3,
  },
  body: {
    ...textBase,
    color: colorTextSecondary,
    textAlign: 'center',
    marginBottom: spacing4,
  },
  dataList: {
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
    marginBottom: spacing4,
  },
  dataListItem: {
    ...textSm,
    color: colorTextPrimary,
    lineHeight: 20,
  },
  premiumWarning: {
    backgroundColor: colorWarningBg,
    borderLeftWidth: 3,
    borderLeftColor: colorWarning,
    borderRadius: radiusMd,
    padding: spacing3,
    gap: spacing2,
    marginBottom: spacing4,
  },
  premiumWarningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing2,
  },
  premiumWarningTitle: {
    ...textSm,
    color: colorTextPrimary,
    fontWeight: '600',
  },
  premiumWarningBody: {
    ...textSm,
    color: colorTextSecondary,
    lineHeight: 18,
  },
  premiumWarningLink: {
    ...textSm,
    color: colorTextLink,
    textDecorationLine: 'underline',
  },
  buttonRow: {
    gap: spacing3,
  },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  cancelButtonText: {
    ...textBase,
    color: colorTextSecondary,
    fontWeight: '600',
  },
  confirmButton: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colorError,
    borderRadius: radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing4,
  },
  confirmButtonText: {
    ...textBase,
    color: colorError,
    fontWeight: '600',
  },
});
