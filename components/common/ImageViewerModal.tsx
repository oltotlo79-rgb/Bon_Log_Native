/**
 * @module components/common/ImageViewerModal
 * フルスクリーン画像ビューア。FlatList の水平ページングで複数枚スワイプを実現する。
 * 画像が 1 枚のときはページャ・インデックスを非表示にする。
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
  type ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  colorScrim,
  colorOnOverlay,
  spacing4,
  spacing3,
  textSm,
} from '@/lib/constants/design-tokens';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 閉じるボタンのアイコンサイズ */
const CLOSE_ICON_SIZE = 28;

/** 閉じるボタンの最小タップターゲット（44pt ルール）*/
const CLOSE_BUTTON_MIN_SIZE = 44;

// ---------------------------------------------------------------------------
// 型定義
// ---------------------------------------------------------------------------

export type ImageViewerImage = {
  uri: string;
  accessibilityLabel?: string;
};

export type ImageViewerModalProps = {
  images: ImageViewerImage[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// ページアイテムコンポーネント
// ---------------------------------------------------------------------------

type PageItemProps = {
  item: ImageViewerImage;
  pageWidth: number;
  pageHeight: number;
};

const PageItem = React.memo(function PageItem({ item, pageWidth, pageHeight }: PageItemProps) {
  return (
    <Image
      source={{ uri: item.uri }}
      style={{ width: pageWidth, height: pageHeight }}
      contentFit="contain"
      accessibilityLabel={item.accessibilityLabel}
    />
  );
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImageViewerModal({
  images,
  initialIndex,
  visible,
  onClose,
}: ImageViewerModalProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // FlatList の viewableItems コールバックで現在ページを追う
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // visible が true になるたびに initialIndex へリセットする
  const listRef = useRef<FlatList<ImageViewerImage>>(null);

  const handleModalShow = useCallback(() => {
    setCurrentIndex(initialIndex);
    if (images.length > 1) {
      listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [initialIndex, images.length]);

  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first !== undefined && typeof first.index === 'number') {
        setCurrentIndex(first.index);
      }
    },
    []
  );

  // viewabilityConfig は再生成しないよう useMemo で安定化する
  const viewabilityConfig = useMemo(
    () => ({ viewAreaCoveragePercentThreshold: 50 }),
    []
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ImageViewerImage>) => (
      <PageItem item={item} pageWidth={screenWidth} pageHeight={screenHeight} />
    ),
    [screenWidth, screenHeight]
  );

  const keyExtractor = useCallback((_: ImageViewerImage, index: number) => String(index), []);

  const showPager = images.length > 1;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
      onShow={handleModalShow}
      testID="image-viewer-modal"
      accessibilityViewIsModal
    >
      <View style={styles.backdrop}>
        {showPager ? (
          <FlatList
            ref={listRef}
            data={images}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
          />
        ) : (
          <PageItem
            item={images[0] ?? { uri: '' }}
            pageWidth={screenWidth}
            pageHeight={screenHeight}
          />
        )}

        {/* 閉じるボタン */}
        <Pressable
          style={styles.closeButton}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
          testID="image-viewer-close"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={CLOSE_ICON_SIZE} color={colorOnOverlay} />
        </Pressable>

        {/* ページインデックス表示（複数枚のみ） */}
        {showPager && (
          <View style={styles.indexBadge} pointerEvents="none">
            <Text style={styles.indexText}>
              {currentIndex + 1} / {images.length}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colorScrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: spacing4,
    right: spacing4,
    minWidth: CLOSE_BUTTON_MIN_SIZE,
    minHeight: CLOSE_BUTTON_MIN_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexBadge: {
    position: 'absolute',
    bottom: spacing4 * 2,
    alignSelf: 'center',
    paddingHorizontal: spacing4,
    paddingVertical: spacing3,
  },
  indexText: {
    ...textSm,
    color: colorOnOverlay,
    fontWeight: '600',
  },
});
