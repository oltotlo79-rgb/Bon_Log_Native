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
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigation,
} from 'react-native-webview/lib/WebViewTypes';
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
import { LEAFLET_CSS_CONTENT, LEAFLET_JS_CONTENT } from '@/components/shops/leaflet-vendor';

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

// Leaflet 本体は同梱済みでネットワーク非依存だが、タイル読み込み待ちや低スペック端末での
// 初期化遅延を考慮し、postMessage('ready') が一定時間届かなければエラー表示へフォールバックする。
const MAP_READY_TIMEOUT_MS = 20000;

// Android の loadDataWithBaseURL 経路を使わせ、referer/origin を持たせるための baseUrl。
// これがないと一部ネットワーク環境で WebView 内リクエストが素性不明として扱われることがある。
const MAP_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://www.bon-log.com';

// OSM タイル配信ホスト。タイル画像の 4xx/5xx は地図自体の動作を妨げないため致命扱いしない。
const MAP_TILE_HOST = 'tile.openstreetmap.org';
const MAP_TILE_URL_TEMPLATE = `https://{s}.${MAP_TILE_HOST}/{z}/{x}/{y}.png`;

// WebView 診断コード表示欄に載せる JS エラーメッセージの最大文字数（長文の生ログ化を防ぐ）。
const MAP_ERROR_DETAIL_MAX_LENGTH = 120;

// 実機で postMessage 橋が機能しない端末があるため、ready/error/shopSelected を
// document.title 経由でも送る（経路B）。location.hash の変更でしか onNavigationStateChange は
// 再発火しないため、送信のたびにこのプレフィックス + 連番を hash に載せる。
const MAP_TITLE_HASH_PREFIX = 'bonsaiMapStatus';

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

/**
 * 実機での「読み込みに失敗しました」報告の切り分け用診断コード。
 * ユーザーの次回報告でどの経路の失敗かを判別できるよう、小さく画面に表示する。
 */
type MapErrorKind = 'ERR_MAIN_FRAME' | 'ERR_JS' | 'ERR_TIMEOUT';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** タイル画像（サブリソース）の失敗はメインドキュメントの致命的失敗として扱わない */
function isMainFrameFailureUrl(url: string): boolean {
  return !url.includes(MAP_TILE_HOST);
}

/**
 * 同梱 leaflet.js/css や店舗名等の動的値に `</script`・`</style` 相当の文字列が
 * 含まれると、HTML パーサーがそこでタグを終端してしまい以降の JS/CSS が丸ごと
 * 無効になる（古典的な事故）。埋め込み文字列にのみ適用し、テンプレート自体が
 * 意図的に書く開始・終了タグは対象外にする。
 */
function escapeEmbeddedClosingTags(raw: string): string {
  return raw.replace(/<\/(script|style)/gi, '<\\/$1');
}

function formatErrorDiagnostics(kind: MapErrorKind, detail: string | null): string {
  return detail !== null && detail.length > 0 ? `${kind}: ${detail}` : kind;
}

/**
 * WebView 内スクリプトから届く ready/error/status/shopSelected の統一表現。
 * postMessage（経路A）と document.title（経路B・Cの再送先）のどちらから来ても同じ形に正規化する。
 */
type MapSignal =
  | { type: 'ready'; bridge: boolean | null }
  | { type: 'error'; message: string | null; bridge: boolean | null }
  | { type: 'status'; stage: string | null; message: string | null; bridge: boolean | null }
  | { type: 'shopSelected'; shopId: string };

type MapSignalEnvelope = {
  signal: MapSignal;
  /** title 経由の送信にのみ付与される単調増加の連番（postMessage 経由は null） */
  seq: number | null;
};

type MapDiagnostics = {
  bridge: boolean | null;
  stage: string | null;
  message: string | null;
};

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function readBooleanField(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
}

function readSeqField(record: Record<string, unknown>): number | null {
  const value = record.seq;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * postMessage の data 文字列、または onNavigationStateChange の title 文字列のどちらからも
 * 呼べる共通パーサー。postMessage 橋が死んでいる端末では title 経由の文字列のみが届く。
 */
function parseMapSignalEnvelope(raw: string): MapSignalEnvelope | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || typeof parsed.type !== 'string') {
    return null;
  }

  const bridge = readBooleanField(parsed, 'bridge');
  const seq = readSeqField(parsed);

  if (parsed.type === 'ready') {
    return { signal: { type: 'ready', bridge }, seq };
  }

  if (parsed.type === 'error') {
    return { signal: { type: 'error', message: readStringField(parsed, 'message'), bridge }, seq };
  }

  if (parsed.type === 'status') {
    return {
      signal: {
        type: 'status',
        stage: readStringField(parsed, 'stage'),
        message: readStringField(parsed, 'message'),
        bridge,
      },
      seq,
    };
  }

  if (parsed.type === 'shopSelected') {
    const shopId = readStringField(parsed, 'shopId');
    return shopId !== null ? { signal: { type: 'shopSelected', shopId }, seq } : null;
  }

  return null;
}

/**
 * ERR_TIMEOUT は経路A/B/Cのどれからも ready/error が届かなかった場合に発生し、単体では
 * 手掛かりがない。届いていた診断（bridge有無・最後の __mapStatus）があれば detail へ含め、
 * 次回の実機報告で原因をさらに絞れるようにする。
 */
function formatDiagnosticsDetail(diagnostics: MapDiagnostics): string | undefined {
  if (diagnostics.bridge === null && diagnostics.stage === null && diagnostics.message === null) {
    return undefined;
  }

  const bridgeText = diagnostics.bridge === null ? 'unknown' : diagnostics.bridge ? 'yes' : 'no';
  const parts = [`bridge=${bridgeText}`, `lastStatus=${diagnostics.stage ?? 'none'}`];

  if (diagnostics.message !== null && diagnostics.message.length > 0) {
    parts.push(`msg=${diagnostics.message}`);
  }

  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Leaflet HTML 生成
// マーカー SVG は Web 版 components/shop/Map.tsx の shopPinIcon と同一形状。
// ---------------------------------------------------------------------------

// injectedJavaScript は WebView のページ読み込み完了後に RN 側から自動注入される（経路C）。
// 経路A/Bが機能しなかった端末でも、__mapStatus の最終値を postMessage / title の両方で再送する。
const MAP_INJECTED_JAVASCRIPT = `
(function () {
  try {
    var status = window.__mapStatus || { stage: 'unknown', message: null };
    var bridge = typeof window.ReactNativeWebView !== 'undefined';
    var payload;
    if (status.stage === 'ready') {
      payload = { type: 'ready', bridge: bridge };
    } else if (status.stage === 'error') {
      payload = { type: 'error', message: status.message, bridge: bridge };
    } else {
      payload = { type: 'status', stage: status.stage, message: status.message, bridge: bridge };
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
    if (typeof window.__bonsaiReportViaTitle === 'function') {
      window.__bonsaiReportViaTitle(payload);
    }
  } catch (e) {}
})();
true;
`;

// shopSelected を title 経由（経路B）で読み取った直後に RN から注入し、title を空へ戻す。
// 連番と合わせて、同一タップの二重処理・title の残留を防ぐ。
const MAP_RESET_TITLE_JAVASCRIPT =
  "if (typeof window.__bonsaiResetTitle === 'function') { window.__bonsaiResetTitle(); } true;";

function buildLeafletHtml(shops: ShopMapItem[]): string {
  const markersJson = escapeEmbeddedClosingTags(
    JSON.stringify(
      shops.map((s) => ({
        id: s.id,
        name: s.name,
        lat: s.latitude,
        lng: s.longitude,
        address: s.address,
        rating: s.averageRating,
        reviewCount: s.reviewCount,
      }))
    )
  );

  // Leaflet 本体 (JS/CSS) は CDN からではなく同梱の vendor 文字列をインライン展開する
  // （実機で CDN 読み込みが失敗し「読み込みに失敗しました」になっていた根本原因への対処）。
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <style>${escapeEmbeddedClosingTags(LEAFLET_CSS_CONTENT)}</style>
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
  <script>${escapeEmbeddedClosingTags(LEAFLET_JS_CONTENT)}</script>
  <script>
    var shops = ${markersJson};

    var __mapStatusSeq = 0;

    function setMapStatus(stage, message) {
      window.__mapStatus = { stage: stage, message: message != null ? String(message) : null };
    }

    // document.title の変更は postMessage 橋に依存しない（経路B）。ただし title の書き換えだけでは
    // onNavigationStateChange は再発火しないため、location.hash も同時に変えて確実に発火させる。
    function sendViaTitle(payload) {
      __mapStatusSeq += 1;
      payload.seq = __mapStatusSeq;
      try {
        document.title = JSON.stringify(payload);
      } catch (e) {}
      try {
        location.hash = '${MAP_TITLE_HASH_PREFIX}' + __mapStatusSeq;
      } catch (e) {}
    }
    window.__bonsaiReportViaTitle = sendViaTitle;

    function resetSelectionTitle() {
      try {
        document.title = '';
      } catch (e) {}
    }
    window.__bonsaiResetTitle = resetSelectionTitle;

    setMapStatus('booting', null);

    function notifyError(message) {
      var bridge = typeof window.ReactNativeWebView !== 'undefined';
      setMapStatus('error', message);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(message), bridge: bridge }));
      }
      sendViaTitle({ type: 'error', message: String(message), bridge: bridge });
    }

    function notifyReady() {
      var bridge = typeof window.ReactNativeWebView !== 'undefined';
      setMapStatus('ready', null);
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready', bridge: bridge }));
      }
      sendViaTitle({ type: 'ready', bridge: bridge });
    }

    window.onerror = function (message) {
      notifyError(message);
      return true;
    };

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
      var bridge = typeof window.ReactNativeWebView !== 'undefined';
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'shopSelected', shopId: shopId, bridge: bridge }));
      }
      // 橋が死んでいる端末向けに title 経由（経路B）でも同じタップを送る。
      sendViaTitle({ type: 'shopSelected', shopId: shopId, bridge: bridge });
    }

    function moveToLocation(lat, lng) {
      if (window.__bonsaiMap) {
        window.__bonsaiMap.setView([lat, lng], ${MAP_GEOLOCATION_ZOOM});
      }
    }

    function initMap() {
      try {
        setMapStatus('initializing', null);

        if (typeof L === 'undefined') {
          notifyError('leaflet global is undefined after inline script evaluation');
          return;
        }

        var map = L.map('map', {
          center: [${MAP_DEFAULT_CENTER_LAT}, ${MAP_DEFAULT_CENTER_LNG}],
          zoom: ${MAP_DEFAULT_ZOOM},
          zoomControl: true
        });
        window.__bonsaiMap = map;
        setMapStatus('map-created', null);

        L.tileLayer('${MAP_TILE_URL_TEMPLATE}', {
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
        setMapStatus('markers-added', null);

        notifyReady();
      } catch (e) {
        notifyError(e && e.message ? e.message : String(e));
      }
    }
  </script>
</head>
<body>
<div id="map"></div>
<script>initMap();</script>
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
  const [errorKind, setErrorKind] = useState<MapErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  // 再試行時に WebView を完全に再マウントし、CDN 読み込みをやり直させるためのキー
  const [reloadAttempt, setReloadAttempt] = useState(0);
  // 経路A/B/Cのうち最初に届いた ready/error のみを状態に反映し、後着の重複反映を防ぐ
  const resolvedRef = useRef<'ready' | 'error' | null>(null);
  // title 経由（経路B・C）で処理済みの連番。同一内容の再送・重複発火を無視する
  const lastTitleSeqRef = useRef(0);
  // ERR_TIMEOUT の detail に出す診断値（bridge有無・最後の __mapStatus）
  const diagnosticsRef = useRef<MapDiagnostics>({ bridge: null, stage: null, message: null });

  const htmlContent = buildLeafletHtml(shops);

  const handleWebViewFailure = useCallback((kind: MapErrorKind, detail?: string) => {
    setIsMapReady(false);
    setWebViewLoadError(true);
    setErrorKind(kind);
    setErrorDetail(detail !== undefined ? detail.slice(0, MAP_ERROR_DETAIL_MAX_LENGTH) : null);
  }, []);

  const applyDiagnostics = useCallback(
    (bridge: boolean | null, stage: string | null, message: string | null) => {
      if (bridge !== null) {
        diagnosticsRef.current.bridge = bridge;
      }
      if (stage !== null) {
        diagnosticsRef.current.stage = stage;
      }
      if (message !== null) {
        diagnosticsRef.current.message = message;
      }
    },
    []
  );

  // postMessage（経路A）・title（経路B・Cの再送先）のどちらから届いた MapSignal もここで
  // 一本化して処理する。ready/error は最初に届いた 1 件のみを状態に反映する。
  const processSignal = useCallback(
    (envelope: MapSignalEnvelope) => {
      if (envelope.seq !== null) {
        if (envelope.seq <= lastTitleSeqRef.current) {
          return;
        }
        lastTitleSeqRef.current = envelope.seq;
      }

      const { signal } = envelope;

      if (signal.type === 'shopSelected') {
        router.push({ pathname: '/shops/[id]', params: { id: signal.shopId } });
        if (envelope.seq !== null) {
          // 連打対策: RN が読み取った直後に title を戻し、二重発火・残留を防ぐ
          webViewRef.current?.injectJavaScript(MAP_RESET_TITLE_JAVASCRIPT);
        }
        return;
      }

      if (signal.type === 'status') {
        applyDiagnostics(signal.bridge, signal.stage, signal.message);
        return;
      }

      if (resolvedRef.current !== null) {
        applyDiagnostics(signal.bridge, signal.type, signal.type === 'error' ? signal.message : null);
        return;
      }

      if (signal.type === 'ready') {
        resolvedRef.current = 'ready';
        applyDiagnostics(signal.bridge, 'ready', null);
        setIsMapReady(true);
        setWebViewLoadError(false);
        setErrorKind(null);
        setErrorDetail(null);
        return;
      }

      resolvedRef.current = 'error';
      applyDiagnostics(signal.bridge, 'error', signal.message);
      handleWebViewFailure('ERR_JS', signal.message ?? undefined);
    },
    [applyDiagnostics, handleWebViewFailure]
  );

  // Android の onError/onHttpError は OSM タイル画像の 4xx/5xx でも発火し得るため、
  // 失敗した URL がタイル配信ホストのときは致命扱いしない（地図自体は動作し続ける）。
  const handleWebViewError = useCallback(
    (event: WebViewErrorEvent) => {
      if (isMainFrameFailureUrl(event.nativeEvent.url)) {
        handleWebViewFailure('ERR_MAIN_FRAME');
      }
    },
    [handleWebViewFailure]
  );

  const handleWebViewHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      if (isMainFrameFailureUrl(event.nativeEvent.url)) {
        handleWebViewFailure('ERR_MAIN_FRAME');
      }
    },
    [handleWebViewFailure]
  );

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const envelope = parseMapSignalEnvelope(event.nativeEvent.data);
      if (envelope !== null) {
        processSignal(envelope);
      }
    },
    [processSignal]
  );

  // document.title の変更は postMessage 橋に依存しない（経路B）。ready/error/shopSelected を
  // JSON 化して title に載せる WebView 側実装と対になる。同一 title の再通知（onLoadStart 等での
  // 再発火）は processSignal 側の連番チェックで無視される。
  const handleNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      const envelope = parseMapSignalEnvelope(event.title);
      if (envelope !== null) {
        processSignal(envelope);
      }
    },
    [processSignal]
  );

  const handleRetryMapLoad = useCallback(() => {
    setIsMapReady(false);
    setWebViewLoadError(false);
    setErrorKind(null);
    setErrorDetail(null);
    resolvedRef.current = null;
    lastTitleSeqRef.current = 0;
    diagnosticsRef.current = { bridge: null, stage: null, message: null };
    setReloadAttempt((n) => n + 1);
  }, []);

  // 経路A/B/C いずれからも ready/error が一定時間届かない場合（CDN 遮断・スクリプト実行失敗等）は
  // 無限ローディングにせず、エラー表示 + 再試行導線へフォールバックする。
  useEffect(() => {
    if (!isOnline || isMapLoading || isMapError || webViewLoadError) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsMapReady((ready) => {
        if (!ready) {
          handleWebViewFailure('ERR_TIMEOUT', formatDiagnosticsDetail(diagnosticsRef.current));
        }
        return ready;
      });
    }, MAP_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isOnline, isMapLoading, isMapError, webViewLoadError, reloadAttempt, handleWebViewFailure]);

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
        {errorKind !== null && (
          <Text style={styles.errorDiagnosticsText}>
            {formatErrorDiagnostics(errorKind, errorDetail)}
          </Text>
        )}
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
        source={{ html: htmlContent, baseUrl: MAP_BASE_URL }}
        style={styles.webView}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onError={handleWebViewError}
        onHttpError={handleWebViewHttpError}
        injectedJavaScript={MAP_INJECTED_JAVASCRIPT}
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
  errorDiagnosticsText: {
    ...textXs,
    color: colorTextTertiary,
    textAlign: 'center',
    opacity: 0.7,
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
