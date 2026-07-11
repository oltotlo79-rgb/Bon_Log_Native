/**
 * @module components/hormone/HormoneInteractionDiagramView
 * ホルモン相互作用ダイアグラムを WebView 内のインライン SVG で描画する。
 * Web 版 HormoneInteractionDiagram.tsx（ノード=円、エッジ=線）を忠実に再現する。
 *
 * Why WebView: RN は SVG 未対応のため、react-native-webview（盆栽園マップ = components/shops/BonsaiMapView.tsx
 * と同じ手法）でブラウザの SVG レンダリングエンジンを利用する。CDN 依存はなくインライン生成のみでネットワーク不要。
 * ノードタップ・フィルタ変更は postMessage / injectJavaScript でネイティブ側と同期する。
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import {
  colorSurface,
  colorSurfaceMuted,
  colorBorderLight,
  colorTextTertiary,
  colorActionPrimary,
  colorActionPrimaryText,
  colorDiagramEdgeSynergy,
  colorDiagramEdgeAntagonism,
  colorDiagramEdgeModulation,
  colorDiagramNodeMajor,
  colorDiagramNodeSecondary,
  colorDiagramNodeSelected,
  colorDiagramNodeSelectedBorder,
  spacing2,
  spacing3,
  spacing4,
  radiusMd,
  textSm,
  textXs,
} from '@/lib/constants/design-tokens';
import { ERR_LOAD_FAILED } from '@/lib/constants/errors';

// ---------------------------------------------------------------------------
// 定数（Web 版 lib/constants/hormone-techniques.ts の DIAGRAM_* と同値）
// ---------------------------------------------------------------------------

const DIAGRAM_VIEWBOX_WIDTH = 600;
const DIAGRAM_VIEWBOX_HEIGHT = 500;
const DIAGRAM_NODE_RADIUS = 28;
const DIAGRAM_NODE_LABEL_FONT_SIZE = 11;
const DIAGRAM_NODE_LABEL_MAX_LENGTH = 5;
const DIAGRAM_NODE_LABEL_TRUNCATE_LENGTH = 4;
const DIAGRAM_MAJOR_NODE_RADIUS_PX = 130;
const DIAGRAM_SECONDARY_NODE_RADIUS_PX = 210;
const DIAGRAM_STROKE_WHITE = '#ffffff';

// postMessage('ready') が届かない場合（JS 実行エラー等）に無限ローディングへ陥らないための猶予時間。
const DIAGRAM_READY_TIMEOUT_MS = 5000;

const RETRY_BUTTON_MIN_WIDTH = 96;

// WebView 診断コード表示欄に載せる JS エラーメッセージの最大文字数（長文の生ログ化を防ぐ）。
const DIAGRAM_ERROR_DETAIL_MAX_LENGTH = 120;

// ---------------------------------------------------------------------------
// 型
// ---------------------------------------------------------------------------

export type DiagramHormoneNode = {
  id: string;
  name: string;
  category: string;
};

export type DiagramInteractionEdge = {
  id: string;
  hormoneAId: string;
  hormoneBId: string;
  type: string;
};

type Props = {
  hormones: DiagramHormoneNode[];
  interactions: DiagramInteractionEdge[];
  activeTypes: ReadonlySet<string>;
  onNodeSelect: (nodeId: string | null) => void;
};

/**
 * 実機での「読み込みに失敗しました」報告の切り分け用診断コード。
 * このダイアグラムはネットワーク非依存（CDN・タイル等のサブリソース取得なし）のため、
 * onError/onHttpError の発火は常にメインドキュメント相当の失敗として扱ってよい
 * （BonsaiMapView.tsx のようなサブリソース起因の onHttpError は発生し得ない）。
 */
type DiagramErrorKind = 'ERR_MAIN_FRAME' | 'ERR_JS' | 'ERR_TIMEOUT';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * ホルモン名・相互作用データ等の動的値に `</script` 相当の文字列が含まれると、
 * HTML パーサーがそこでタグを終端してしまい以降の JS が丸ごと無効になる
 * （BonsaiMapView.tsx と同種の古典的な事故。埋め込み JSON にのみ適用する）。
 */
function escapeEmbeddedClosingTags(raw: string): string {
  return raw.replace(/<\/(script|style)/gi, '<\\/$1');
}

function formatErrorDiagnostics(kind: DiagramErrorKind, detail: string | null): string {
  return detail !== null && detail.length > 0 ? `${kind}: ${detail}` : kind;
}

// ---------------------------------------------------------------------------
// インライン SVG + JS を持つ HTML 文書の生成
// ノード位置計算・ハイライト・フィルタ・選択ロジックは Web 版 calculatePositions /
// isNodeHighlighted / isEdgeConnected を JS に移植したもの。
// ---------------------------------------------------------------------------

function buildDiagramHtml(
  hormones: DiagramHormoneNode[],
  interactions: DiagramInteractionEdge[],
): string {
  const nodesJson = escapeEmbeddedClosingTags(JSON.stringify(hormones));
  const edgesJson = escapeEmbeddedClosingTags(JSON.stringify(interactions));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; width: 100%; overflow: hidden; background: ${colorSurface}; }
  svg { width: 100%; height: 100%; display: block; }
  text { font-family: sans-serif; user-select: none; }
  g.node { cursor: pointer; }
</style>
</head>
<body>
<svg id="diagram" viewBox="0 0 ${DIAGRAM_VIEWBOX_WIDTH} ${DIAGRAM_VIEWBOX_HEIGHT}" role="img" aria-label="ホルモン相互作用ダイアグラム"></svg>
<script>
  var hormones = ${nodesJson};
  var interactions = ${edgesJson};
  var activeTypes = new Set(['synergistic', 'antagonistic', 'modulatory']);
  var selectedNodeId = null;

  var MAJOR_COLOR = '${colorDiagramNodeMajor}';
  var SECONDARY_COLOR = '${colorDiagramNodeSecondary}';
  var SELECTED_COLOR = '${colorDiagramNodeSelected}';
  var SELECTED_BORDER_COLOR = '${colorDiagramNodeSelectedBorder}';
  var EDGE_COLORS = {
    synergistic: '${colorDiagramEdgeSynergy}',
    antagonistic: '${colorDiagramEdgeAntagonism}',
    modulatory: '${colorDiagramEdgeModulation}'
  };
  var FALLBACK_EDGE_COLOR = '${colorBorderLight}';

  function notifyError(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: String(message) }));
    }
  }

  window.onerror = function (message) {
    notifyError(message);
    return true;
  };

  function post(payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function truncateLabel(name) {
    if (name.length > ${DIAGRAM_NODE_LABEL_MAX_LENGTH}) {
      return name.slice(0, ${DIAGRAM_NODE_LABEL_TRUNCATE_LENGTH}) + '…';
    }
    return name;
  }

  function calculatePositions() {
    var cx = ${DIAGRAM_VIEWBOX_WIDTH} / 2;
    var cy = ${DIAGRAM_VIEWBOX_HEIGHT} / 2;
    var major = hormones.filter(function (h) { return h.category === 'major'; });
    var secondary = hormones.filter(function (h) { return h.category === 'secondary'; });
    var positions = {};

    major.forEach(function (h, i) {
      var angle = (2 * Math.PI * i) / major.length - Math.PI / 2;
      positions[h.id] = {
        x: cx + ${DIAGRAM_MAJOR_NODE_RADIUS_PX} * Math.cos(angle),
        y: cy + ${DIAGRAM_MAJOR_NODE_RADIUS_PX} * Math.sin(angle)
      };
    });

    secondary.forEach(function (h, i) {
      var angle = (2 * Math.PI * i) / secondary.length - Math.PI / 2;
      positions[h.id] = {
        x: cx + ${DIAGRAM_SECONDARY_NODE_RADIUS_PX} * Math.cos(angle),
        y: cy + ${DIAGRAM_SECONDARY_NODE_RADIUS_PX} * Math.sin(angle)
      };
    });

    return positions;
  }

  var positions = calculatePositions();

  function svgEl(tag, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (key) {
      el.setAttribute(key, attrs[key]);
    });
    return el;
  }

  function isEdgeConnected(edge) {
    if (!selectedNodeId) return true;
    return edge.hormoneAId === selectedNodeId || edge.hormoneBId === selectedNodeId;
  }

  function isNodeHighlighted(nodeId) {
    if (!selectedNodeId) return true;
    if (nodeId === selectedNodeId) return true;
    return interactions.some(function (edge) {
      if (!activeTypes.has(edge.type)) return false;
      return (edge.hormoneAId === selectedNodeId && edge.hormoneBId === nodeId) ||
        (edge.hormoneBId === selectedNodeId && edge.hormoneAId === nodeId);
    });
  }

  function selectNode(nodeId) {
    selectedNodeId = selectedNodeId === nodeId ? null : nodeId;
    render();
    post({ type: 'nodeSelected', nodeId: selectedNodeId });
  }

  function setActiveTypes(types) {
    activeTypes = new Set(types);
    render();
  }

  function render() {
    interactions.forEach(function (edge) {
      var line = document.getElementById('edge-' + edge.id);
      if (!line) return;
      var active = activeTypes.has(edge.type);
      line.style.display = active ? '' : 'none';
      if (!active) return;
      var connected = isEdgeConnected(edge);
      line.setAttribute('opacity', connected ? '1' : '0.15');
      line.setAttribute('stroke-width', connected && selectedNodeId ? '3' : '2');
    });

    hormones.forEach(function (h) {
      var g = document.getElementById('node-' + h.id);
      if (!g) return;
      var highlighted = isNodeHighlighted(h.id);
      g.setAttribute('opacity', highlighted ? '1' : '0.2');
      var circle = g.querySelector('circle');
      var isSelected = selectedNodeId === h.id;
      circle.setAttribute('fill', isSelected ? SELECTED_COLOR : (h.category === 'major' ? MAJOR_COLOR : SECONDARY_COLOR));
      circle.setAttribute('stroke', isSelected ? SELECTED_BORDER_COLOR : '${DIAGRAM_STROKE_WHITE}');
      circle.setAttribute('stroke-width', isSelected ? '3' : '2');
    });
  }

  function buildDiagram() {
    var svg = document.getElementById('diagram');

    interactions.forEach(function (edge) {
      var a = positions[edge.hormoneAId];
      var b = positions[edge.hormoneBId];
      if (!a || !b) return;
      var color = EDGE_COLORS[edge.type] || FALLBACK_EDGE_COLOR;
      var line = svgEl('line', {
        id: 'edge-' + edge.id,
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        stroke: color,
        'stroke-width': '2',
        opacity: '1'
      });
      svg.appendChild(line);
    });

    hormones.forEach(function (h) {
      var pos = positions[h.id];
      if (!pos) return;
      var g = svgEl('g', { id: 'node-' + h.id, class: 'node' });
      g.addEventListener('click', function () { selectNode(h.id); });

      var circle = svgEl('circle', {
        cx: pos.x,
        cy: pos.y,
        r: ${DIAGRAM_NODE_RADIUS},
        fill: h.category === 'major' ? MAJOR_COLOR : SECONDARY_COLOR,
        stroke: '${DIAGRAM_STROKE_WHITE}',
        'stroke-width': '2'
      });
      g.appendChild(circle);

      var text = svgEl('text', {
        x: pos.x,
        y: pos.y,
        'text-anchor': 'middle',
        dy: '0.35em',
        fill: '${DIAGRAM_STROKE_WHITE}',
        'font-size': '${DIAGRAM_NODE_LABEL_FONT_SIZE}',
        'font-weight': 'bold'
      });
      text.textContent = truncateLabel(h.name);
      g.appendChild(text);

      var title = svgEl('title', {});
      title.textContent = h.name;
      g.appendChild(title);

      svg.appendChild(g);
    });

    render();
    post({ type: 'ready' });
  }

  try {
    buildDiagram();
  } catch (e) {
    notifyError(e && e.message ? e.message : String(e));
  }
</script>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const HormoneInteractionDiagramView = React.memo(function HormoneInteractionDiagramView({
  hormones,
  interactions,
  activeTypes,
  onNodeSelect,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const [isDiagramReady, setIsDiagramReady] = useState(false);
  const [webViewLoadError, setWebViewLoadError] = useState(false);
  const [errorKind, setErrorKind] = useState<DiagramErrorKind | null>(null);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  const htmlContent = useMemo(
    () => buildDiagramHtml(hormones, interactions),
    [hormones, interactions],
  );

  const handleWebViewFailure = useCallback((kind: DiagramErrorKind, detail?: string) => {
    setIsDiagramReady(false);
    setWebViewLoadError(true);
    setErrorKind(kind);
    setErrorDetail(
      detail !== undefined ? detail.slice(0, DIAGRAM_ERROR_DETAIL_MAX_LENGTH) : null
    );
  }, []);

  // このダイアグラムはサブリソース取得がないため onError/onHttpError は常にメインドキュメント
  // 相当の失敗として扱ってよい（BonsaiMapView.tsx のような URL 判定は不要）。
  const handleWebViewError = useCallback(() => {
    handleWebViewFailure('ERR_MAIN_FRAME');
  }, [handleWebViewFailure]);

  const handleWebViewHttpError = useCallback(() => {
    handleWebViewFailure('ERR_MAIN_FRAME');
  }, [handleWebViewFailure]);

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
        setIsDiagramReady(true);
        setWebViewLoadError(false);
        setErrorKind(null);
        setErrorDetail(null);
        return;
      }

      if (parsed.type === 'error') {
        const detail = typeof parsed.message === 'string' ? parsed.message : undefined;
        handleWebViewFailure('ERR_JS', detail);
        return;
      }

      if (parsed.type === 'nodeSelected') {
        const nodeId = parsed.nodeId;
        if (typeof nodeId === 'string' || nodeId === null) {
          onNodeSelect(nodeId);
        }
      }
    },
    [handleWebViewFailure, onNodeSelect],
  );

  const handleRetry = useCallback(() => {
    setIsDiagramReady(false);
    setWebViewLoadError(false);
    setErrorKind(null);
    setErrorDetail(null);
    setReloadAttempt((n) => n + 1);
  }, []);

  // postMessage('ready') が一定時間届かない場合（JS 実行失敗等）はエラー表示 + 再試行導線へフォールバックする。
  useEffect(() => {
    if (isDiagramReady || webViewLoadError) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setIsDiagramReady((ready) => {
        if (!ready) {
          handleWebViewFailure('ERR_TIMEOUT');
        }
        return ready;
      });
    }, DIAGRAM_READY_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isDiagramReady, webViewLoadError, reloadAttempt, handleWebViewFailure]);

  // フィルタ変更（activeTypes）を WebView 内の描画状態へ同期する。
  useEffect(() => {
    if (!isDiagramReady) {
      return;
    }
    const typesJson = JSON.stringify(Array.from(activeTypes));
    webViewRef.current?.injectJavaScript(`setActiveTypes(${typesJson}); true;`);
  }, [activeTypes, isDiagramReady]);

  if (webViewLoadError) {
    return (
      <View style={styles.errorContainer} accessibilityRole="text">
        <Ionicons
          name="alert-circle-outline"
          size={24}
          color={colorTextTertiary}
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        <Text style={styles.errorText}>{ERR_LOAD_FAILED}</Text>
        {errorKind !== null && (
          <Text style={styles.errorDiagnosticsText}>
            {formatErrorDiagnostics(errorKind, errorDetail)}
          </Text>
        )}
        <Pressable
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          onPress={handleRetry}
          accessibilityRole="button"
          accessibilityLabel="ダイアグラムを再読み込み"
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="ホルモン相互作用ダイアグラム">
      <WebView
        key={reloadAttempt}
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        originWhitelist={['*']}
        onMessage={handleMessage}
        onError={handleWebViewError}
        onHttpError={handleWebViewHttpError}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        scrollEnabled={false}
        // Android: 外側の ScrollView 内にネストしてもタッチが正しく WebView 側へ渡るために必要。
        nestedScrollEnabled
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={colorActionPrimary} />
            <Text style={styles.loadingText}>ダイアグラムを読み込み中...</Text>
          </View>
        )}
        accessibilityLabel="ホルモン相互作用のネットワーク図"
      />

      {!isDiagramReady && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="small" color={colorActionPrimary} />
          <Text style={styles.loadingText}>ダイアグラムを読み込み中...</Text>
        </View>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// スタイル
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: DIAGRAM_VIEWBOX_WIDTH / DIAGRAM_VIEWBOX_HEIGHT,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colorSurface,
  },
  webView: {
    flex: 1,
    backgroundColor: colorSurface,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colorSurface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing2,
  },
  loadingText: {
    ...textXs,
    color: colorTextTertiary,
  },
  errorContainer: {
    width: '100%',
    aspectRatio: DIAGRAM_VIEWBOX_WIDTH / DIAGRAM_VIEWBOX_HEIGHT,
    backgroundColor: colorSurfaceMuted,
    borderRadius: radiusMd,
    borderWidth: 1,
    borderColor: colorBorderLight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing3,
    padding: spacing4,
  },
  errorText: {
    ...textSm,
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
