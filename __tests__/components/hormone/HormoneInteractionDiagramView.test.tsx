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
