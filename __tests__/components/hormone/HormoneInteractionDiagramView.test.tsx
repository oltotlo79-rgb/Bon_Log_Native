/**
 * components/hormone/HormoneInteractionDiagramView のコンポーネントテスト。
 * WebView 内インライン SVG によるノード描画（Web 版 HormoneInteractionDiagram.tsx 移植）の
 * postMessage プロトコル（ready / error / nodeSelected）とタイムアウトフォールバックを検証する。
 *
 * WebView は __tests__/setup.ts の一元モックを使用する（ad-hoc モックを散在させない）。
 */

import React from 'react';
import { screen, fireEvent, act, render } from '@testing-library/react-native';
import {
  HormoneInteractionDiagramView,
  type DiagramHormoneNode,
  type DiagramInteractionEdge,
} from '@/components/hormone/HormoneInteractionDiagramView';

function makeHormones(): DiagramHormoneNode[] {
  return [
    { id: 'h1', name: 'オーキシン', category: 'major' },
    { id: 'h2', name: 'サイトカイニン', category: 'major' },
  ];
}

function makeInteractions(): DiagramInteractionEdge[] {
  return [
    { id: 'i1', hormoneAId: 'h1', hormoneBId: 'h2', type: 'antagonistic' },
  ];
}

function postMessageToWebView(payload: unknown) {
  const webview = screen.getByTestId('mock-webview');
  fireEvent(webview, 'message', { nativeEvent: { data: JSON.stringify(payload) } });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('HormoneInteractionDiagramView - 初期表示', () => {
  it('WebView が accessibilityLabel 付きで表示される', () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );
    expect(screen.getByLabelText('ホルモン相互作用のネットワーク図')).toBeTruthy();
  });

  it('ready 受信前は読み込み中インジケータが表示される', () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );
    expect(screen.getByText('ダイアグラムを読み込み中...')).toBeTruthy();
  });
});

describe('HormoneInteractionDiagramView - postMessage: ready', () => {
  it('type="ready" を受け取ると読み込み中インジケータが消える', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'ready' });
    });

    expect(screen.queryByText('ダイアグラムを読み込み中...')).toBeNull();
  });
});

describe('HormoneInteractionDiagramView - postMessage: error', () => {
  it('type="error" を受け取るとエラー表示 + 再試行ボタンが出る', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'error', message: 'JS 実行エラー' });
    });

    expect(screen.getByRole('button', { name: 'ダイアグラムを再読み込み' })).toBeTruthy();
    expect(screen.queryByTestId('mock-webview')).toBeNull();
  });

  it('再試行ボタンをタップすると WebView が再表示される', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'error' });
    });
    expect(screen.getByRole('button', { name: 'ダイアグラムを再読み込み' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'ダイアグラムを再読み込み' }));

    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });

  it('WebView の onError（ネイティブ読み込み失敗）でもエラー表示になる', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    const webview = screen.getByTestId('mock-webview');
    await act(async () => {
      fireEvent(webview, 'error');
    });

    expect(screen.getByRole('button', { name: 'ダイアグラムを再読み込み' })).toBeTruthy();
  });
});

describe('HormoneInteractionDiagramView - postMessage: nodeSelected', () => {
  it('有効な nodeId を受け取ると onNodeSelect が呼ばれる', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'nodeSelected', nodeId: 'h1' });
    });

    expect(onNodeSelect).toHaveBeenCalledWith('h1');
  });

  it('nodeId=null（選択解除）を受け取ると onNodeSelect が null で呼ばれる', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'nodeSelected', nodeId: null });
    });

    expect(onNodeSelect).toHaveBeenCalledWith(null);
  });

  it('nodeId が文字列でも null でもない場合は onNodeSelect が呼ばれない（型ガード）', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'nodeSelected', nodeId: 42 });
    });

    expect(onNodeSelect).not.toHaveBeenCalled();
  });

  it('不正な JSON が来ても例外が発生しない（型ガード）', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    const webview = screen.getByTestId('mock-webview');
    await act(async () => {
      expect(() => {
        fireEvent(webview, 'message', { nativeEvent: { data: '不正なJSON{{{' } });
      }).not.toThrow();
    });
  });
});

describe('HormoneInteractionDiagramView - ready タイムアウトフォールバック', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ready が一定時間届かない場合はエラー表示にフォールバックする', () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByRole('button', { name: 'ダイアグラムを再読み込み' })).toBeTruthy();
  });
});

describe('HormoneInteractionDiagramView - activeTypes 変更時の再描画', () => {
  it('ready 後に activeTypes が変わっても例外なく再描画される', async () => {
    const onNodeSelect = jest.fn();
    const { rerender } = render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      postMessageToWebView({ type: 'ready' });
    });

    expect(() => {
      rerender(
        <HormoneInteractionDiagramView
          hormones={makeHormones()}
          interactions={makeInteractions()}
          activeTypes={new Set(['synergistic'])}
          onNodeSelect={onNodeSelect}
        />
      );
    }).not.toThrow();

    expect(screen.getByTestId('mock-webview')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// 経路B: document.title 経由の信号（postMessage 橋が機能しない端末向けフォールバック）
// onNavigationStateChange の event.title に signal JSON を載せて送る（BonsaiMapView.tsx と同じ設計）。
// ---------------------------------------------------------------------------

function sendTitleSignal(payload: Record<string, unknown>) {
  const webview = screen.getByTestId('mock-webview');
  fireEvent(webview, 'navigationStateChange', { title: JSON.stringify(payload) });
}

describe('HormoneInteractionDiagramView - 経路B（title 経由の信号）', () => {
  it('title 経由で type="ready" を受け取ると読み込み中インジケータが消える', async () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    await act(async () => {
      sendTitleSignal({ type: 'ready', bridge: false, seq: 1 });
    });

    expect(screen.queryByText('ダイアグラムを読み込み中...')).toBeNull();
  });

  it('title 経由の nodeSelected でも onNodeSelect が呼ばれる', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      sendTitleSignal({ type: 'nodeSelected', nodeId: 'h1', seq: 1 });
    });

    expect(onNodeSelect).toHaveBeenCalledWith('h1');
  });

  it('連番 seq が重複しているとき、2回目の信号は無視される', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      sendTitleSignal({ type: 'nodeSelected', nodeId: 'h1', seq: 2 });
    });
    await act(async () => {
      // 同一 seq=2 の再送（重複）。processSignal の seq <= lastTitleSeqRef チェックで無視される
      sendTitleSignal({ type: 'nodeSelected', nodeId: 'h2', seq: 2 });
    });

    expect(onNodeSelect).toHaveBeenCalledTimes(1);
    expect(onNodeSelect).toHaveBeenCalledWith('h1');
  });

  it('連番 seq が増加していれば2回目の信号も処理される', async () => {
    const onNodeSelect = jest.fn();
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={onNodeSelect}
      />
    );

    await act(async () => {
      sendTitleSignal({ type: 'nodeSelected', nodeId: 'h1', seq: 1 });
    });
    await act(async () => {
      sendTitleSignal({ type: 'nodeSelected', nodeId: 'h2', seq: 2 });
    });

    expect(onNodeSelect).toHaveBeenCalledTimes(2);
    expect(onNodeSelect).toHaveBeenNthCalledWith(2, 'h2');
  });
});

describe('HormoneInteractionDiagramView - 経路B: ERR_TIMEOUT の診断表示', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('title 経由の status 信号で蓄積した診断が bridge=/lastStatus= として ERR_TIMEOUT の detail に表示される', () => {
    render(
      <HormoneInteractionDiagramView
        hormones={makeHormones()}
        interactions={makeInteractions()}
        activeTypes={new Set(['antagonistic'])}
        onNodeSelect={jest.fn()}
      />
    );

    act(() => {
      sendTitleSignal({
        type: 'status',
        stage: 'building',
        message: null,
        bridge: false,
        seq: 1,
      });
    });

    act(() => {
      // 本番の DIAGRAM_READY_TIMEOUT_MS（5秒）と同じ猶予でタイムアウトフォールバックする
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('ERR_TIMEOUT: bridge=no lastStatus=building')).toBeTruthy();
  });
});
