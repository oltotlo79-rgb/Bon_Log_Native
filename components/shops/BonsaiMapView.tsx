/**
 * @module components/shops/BonsaiMapView
 * WebView + Leaflet + OpenStreetMap による盆栽園インタラクティブマップ。
 * Google Maps API キー不要。Web 版（components/shop/Map.tsx）の OSM + Leaflet 実装を RN に移植。
 *
 * Why WebView: react-native-maps は Android で Google Maps API キーが必須のため、
 * APIキー不要の OSM/Leaflet を WebView 内で動作させる方式を採用する。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colorBackground,
  colorSurface,
  colorSurfaceMuted,
  colorTextPrimary,
  colorTextSecondary,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorBorderLight,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  shadowWashi,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const MAP_DEFAULT_CENTER_LAT = 35.6762;
const MAP_DEFAULT_CENTER_LNG = 139.6503;
const MAP_DEFAULT_ZOOM = 6;
const MAP_GEOLOCATION_ZOOM = 14;
const MAP_HEIGHT = 220;
const LOCATION_BUTTON_SIZE = 44;
const LOCATION_ICON_SIZE = 22;
const RETRY_BUTTON_MIN_WIDTH = 96;

// Leaflet の CDN 読み込みが失敗（ネットワーク遮断・CDN 障害等）してもフリーズしないよう、
// postMessage('ready') が一定時間届かなければタイムアウトとしてエラー表示へフォールバックする。
const MAP_READY_TIMEOUT_MS = 8000;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type ShopMapItem = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  averageRating: number | null;
  reviewCount: number;
};

type Props = {
  shops: ShopMapItem[];
  isOnline: boolean;
  isMapLoading?: boolean;
  isMapError?: boolean;
  /** 盆栽園ピン取得クエリの再試行（isMapError 時のみ使用） */
  onRetryMapData?: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// ---------------------------------------------------------------------------
// Leaflet HTML 生成
// マーカー SVG は Web 版 components/shop/Map.tsx の shopPinIcon と同一形状。
// ---------------------------------------------------------------------------

function buildLeafletHtml(shops: ShopMapItem[]): string {
  const markersJson = JSON.stringify(
    shops.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.latitude,
      lng: s.longitude,
      address: s.address,
      rating: s.averageRating,
      reviewCount: s.reviewCount,
    }))
  );

  // unpkg が遮断・障害のネットワーク環境向けに jsdelivr へのフォールバック読み込みを用意する
  // （読み込み失敗時に無限ローディングへ陥っていた根本原因への対処）。
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; width: 100%; overflow: hidden; }
    #map { height: 100%; width: 100%; }
    .custom-popup .leaflet-popup-content-wrapper {
      border-radius: 8px;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .custom-popup .leaflet-popup-content {
      margin: 0;
      min-width: 160px;
    }
    .popup-inner {
      padding: 10px 12px;
    }
    .popup-name {
      font-size: 13px;
      font-weight: 600;
      color: #060606;
      margin-bottom: 3px;
      word-break: break-all;
    }
    .popup-address {
      font-size: 11px;
      color: #8a8a8a;
      margin-bottom: 5px;
      word-break: break-all;
    }
    .popup-rating {
      font-size: 11px;
      color: #484848;
      margin-bottom: 6px;
    }
    .popup-link {
      font-size: 11px;
      color: #161616;
      font-weight: 600;
      cursor: pointer;
      text-decoration: underline;
      display: block;
    }
    .leaflet-container { font-family: sans-serif; }
  </style>
  <script>
    // ready / error の通知と CDN フォールバックは、外部スクリプトタグより先に定義しておく
    // （onload/onerror ハンドラの評価時に未定義になるのを防ぐため）。
    var shops = ${markersJson};

    function notifyError(message) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(message) }));
      }
    }

    window.onerror = function (message) {
      notifyError(message);
      return true;
    };

    function loadCssFallback() {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    function loadLeafletScriptFallback() {
      var script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      script.onerror = function () {
        notifyError('leaflet failed to load from all CDN sources');
      };
      document.body.appendChild(script);
    }

    function buildStars(rating) {
      if (!rating) return '';
      var full = Math.floor(rating);
      var half = rating % 1 >= 0.5;
      var stars = '';
      for (var i = 0; i < 5; i++) {
        if (i < full) {
          stars += '<span style="color:#b8860b">&#9733;</span>';
        } else if (i === full && half) {
          stars += '<span style="color:#b8860b">&#9734;</span>';
        } else {
          stars += '<span style="color:#ccc">&#9733;</span>';
        }
      }
      return stars;
    }

    function sendShopId(shopId) {
      var msg = JSON.stringify({ type: 'shopSelected', shopId: shopId });
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(msg);
      }
    }

    function moveToLocation(lat, lng) {
      if (window.__bonsaiMap) {
        window.__bonsaiMap.setView([lat, lng], ${MAP_GEOLOCATION_ZOOM});
      }
    }

    function initMap() {
      try {
        if (typeof L === 'undefined') {
          notifyError('leaflet global is undefined after script load');
          return;
        }

        var map = L.map('map', {
          center: [${MAP_DEFAULT_CENTER_LAT}, ${MAP_DEFAULT_CENTER_LNG}],
          zoom: ${MAP_DEFAULT_ZOOM},
          zoomControl: true
        });
        window.__bonsaiMap = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19
        }).addTo(map);

        var pinSvg = [
          '<svg width="32" height="44" viewBox="0 0 32 44" fill="none" xmlns="http://www.w3.org/2000/svg">',
          '<path d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28c0-8.837-7.163-16-16-16z" fill="#3a6b42"/>',
          '<circle cx="16" cy="14" r="7" fill="white"/>',
          '<path d="M16 10c-1.5 0-2.5 1-2.5 2 0 .5.2 1 .5 1.3-.8.4-1.5 1.2-1.5 2.2 0 1.4 1.3 2.5 3.5 2.5s3.5-1.1 3.5-2.5c0-1-.7-1.8-1.5-2.2.3-.3.5-.8.5-1.3 0-1-1-2-2.5-2z" fill="#3a6b42"/>',
          '</svg>'
        ].join('');

        var shopPinIcon = L.divIcon({
          className: '',
          html: pinSvg,
          iconSize: [32, 44],
          iconAnchor: [16, 44],
          popupAnchor: [0, -44]
        });

        shops.forEach(function (shop) {
          var marker = L.marker([shop.lat, shop.lng], { icon: shopPinIcon });

          var ratingHtml = '';
          if (shop.rating !== null) {
            ratingHtml = '<div class="popup-rating">' + buildStars(shop.rating) + ' (' + shop.reviewCount + '件)</div>';
          }

          var popupContent = [
            '<div class="popup-inner">',
            '<div class="popup-name">' + shop.name + '</div>',
            '<div class="popup-address">' + shop.address + '</div>',
            ratingHtml,
            '<a class="popup-link" onclick="sendShopId(\'' + shop.id + '\')">詳細を見る</a>',
            '</div>'
          ].join('');

          marker.bindPopup(popupContent, { className: 'custom-popup' });
          marker.addTo(map);
        });

        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
        }
      } catch (e) {
        notifyError(e && e.message ? e.message : String(e));
      }
    }
  </script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
    crossorigin="" onerror="loadCssFallback()"/>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV/XN/WLs="
  crossorigin="" onload="initMap()" onerror="loadLeafletScriptFallback()"></script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BonsaiMapView = React.memo(function BonsaiMapView({
  shops,
  isOnline,
  isMapLoading = false,
  isMapError = false,
  onRetryMapData,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  // WebView 内での読み込み失敗（CDN 障害・JS 実行エラー・タイムアウト）を検知した状態
  const [webViewLoadError, setWebViewLoadError] = useState(false);
  // 再試行時に WebView を完全に再マウントし、CDN 読み込みをやり直させるためのキー
  const [reloadAttempt, setReloadAttempt] = useState(0);

  const htmlContent = buildLeafletHtml(shops);

  const handleWebViewFailure = useCallback(() => {
    setIsMapReady(false);
    setWebViewLoadError(true);
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(event.nativeEvent.data);
      } catch {
        return;
      }

      if (!isRecord(parsed) || typeof parsed.type !== 'string') {
        return;
      }

      if (parsed.type === 'ready') {
        setIsMapReady(true);
        setWebViewLoadError(false);
        return;
      }

      if (parsed.type === 'error') {
        handleWebViewFailure();
        return;
      }

      if (parsed.type === 'shopSelected' && typeof parsed.shopId === 'string') {
        router.push({ pathname: '/shops/[id]', params: { id: parsed.shopId } });
      }
    },
    [handleWebViewFailure]
  );

  const handleRetryMapLoad = useCallback(() => {
    setIsMapReady(false);
    setWebViewLoadError(false);
    setReloadAttempt((n) => n + 1);
  }, []);

  // postMessage('ready') が一定時間届かない場合（CDN 遮断・スクリプト実行失敗等）は
  // 無限ローディングにせず、エラー表示 + 再試行導線へフォールバックする。
  useEffect(() => {
    if (!isOnline || isMapLoading || isMapError || webViewLoadError) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsMapReady((ready) => {
        if (!ready) {
          setWebViewLoadError(true);
        }
        return ready;
      });
    }, MAP_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isOnline, isMapLoading, isMapError, webViewLoadError, reloadAttempt]);

  const handleLocationPress = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '位置情報の使用を許可してください',
          '現在地を表示するには、設定から位置情報の使用を許可してください。',
          [
            { text: 'キャンセル', style: 'cancel' },
            {
              text: '設定を開く',
              onPress: () => {
                void Linking.openSettings();
              },
            },
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const js = `moveToLocation(${latitude}, ${longitude}); true;`;
      webViewRef.current?.injectJavaScript(js);
    } catch {
      Alert.alert('エラー', '現在地を取得できませんでした');
    } finally {
      setIsLocating(false);
    }
  }, []);

  if (!isOnline) {
    return (
      <View style={styles.offlineContainer} accessibilityRole="text">
        <Ionicons
          name="cloud-offline-outline"
          size={24}
          color={colorTextTertiary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.offlineText}>オフラインのため地図を表示できません</Text>
      </View>
    );
  }

  if (isMapError) {
    return (
      <View style={styles.offlineContainer} accessibilityRole="text">
        <Ionicons
          name="alert-circle-outline"
          size={24}
          color={colorTextTertiary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.offlineText}>{ERR_LOAD_FAILED}</Text>
        {onRetryMapData !== undefined && (
          <Pressable
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
            onPress={onRetryMapData}
            accessibilityRole="button"
            accessibilityLabel="盆栽園マップを再読み込み"
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (isMapLoading) {
    return (
      <View style={styles.offlineContainer}>
        <ActivityIndicator size="small" color={colorActionPrimary} />
        <Text style={styles.offlineText}>地図を準備しています...</Text>
      </View>
    );
  }

  if (webViewLoadError) {
    return (
      <View style={styles.offlineContainer} accessibilityRole="text">
        <Ionicons
          name="alert-circle-outline"
          size={24}
          color={colorTextTertiary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.offlineText}>{ERR_LOAD_FAILED}</Text>
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={handleRetryMapLoad}
          accessibilityRole="button"
          accessibilityLabel="盆栽園マップを再読み込み"
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="盆栽園マップ">
      <WebView
        key={reloadAttempt}
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onError={handleWebViewFailure}
        onHttpError={handleWebViewFailure}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        // Android: 外側の FlatList（ListHeaderComponent）にネストしても
        // 地図領域内のパン操作のタッチを WebView 側へ正しく渡すために必要。
        nestedScrollEnabled
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colorActionPrimary} />
            <Text style={styles.loadingText}>地図を読み込み中...</Text>
          </View>
        )}
        accessibilityLabel="盆栽園の地図"
      />

      {!isMapReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colorActionPrimary} />
          <Text style={styles.loadingText}>地図を読み込み中...</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.locationButton,
          pressed && styles.locationButtonPressed,
          isLocating && styles.locationButtonDisabled,
        ]}
        onPress={() => {
          void handleLocationPress();
        }}
        disabled={isLocating}
        accessibilityRole="button"
        accessibilityLabel="現在地に移動"
        accessibilityState={{ disabled: isLocating }}
      >
        {isLocating ? (
          <ActivityIndicator size="small" color={colorTextSecondary} />
        ) : (
          <Ionicons
            name="locate-outline"
            size={LOCATION_ICON_SIZE}
            color={colorTextPrimary}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
        )}
      </Pressable>
    </View>
  );
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    height: MAP_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colorBorderLight,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colorSurfaceMuted,
  },
  webView: {
    flex: 1,
    backgroundColor: colorSurfaceMuted,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorSurfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing3,
  },
  loadingText: {
    ...textSm,
    color: colorTextTertiary,
  },
  locationButton: {
    position: 'absolute',
    right: spacing3,
    bottom: spacing3,
    width: LOCATION_BUTTON_SIZE,
    height: LOCATION_BUTTON_SIZE,
    borderRadius: radiusMd,
    backgroundColor: colorSurface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colorBorderLight,
    ...shadowWashi,
  },
  locationButtonPressed: {
    opacity: 0.75,
  },
  locationButtonDisabled: {
    opacity: 0.5,
  },
  offlineContainer: {
    height: MAP_HEIGHT,
    backgroundColor: colorBackground,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colorBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing3,
    paddingHorizontal: spacing4,
  },
  offlineText: {
    ...textXs,
    color: colorTextTertiary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colorActionPrimary,
    borderRadius: radiusMd,
    paddingVertical: spacing2,
    paddingHorizontal: spacing4,
    minWidth: RETRY_BUTTON_MIN_WIDTH,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    ...textXs,
    color: colorActionPrimaryText,
    fontWeight: '600',
  },
});
