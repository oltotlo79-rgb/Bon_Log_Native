# アーキテクチャ規約

## レイヤ構造

プロジェクトは 4 層に分かれる。上から下への依存のみ許可、逆方向・横断依存は禁止。

```
┌────────────────────────────────────────────────────────────┐
│  app/, components/, hooks/   (Presentation)                │
│  └─ スクリーン / UI コンポーネント / UI フック             │
├────────────────────────────────────────────────────────────┤
│  lib/queries/                (Server State)                │
│  └─ TanStack Query フック + クエリキー + invalidation 表   │
├────────────────────────────────────────────────────────────┤
│  lib/api/  lib/auth/  lib/push/  lib/billing/ (Integration)│
│  └─ OpenAPI 生成クライアント / トークン / 外部 SDK 連携    │
├────────────────────────────────────────────────────────────┤
│  lib/constants/, lib/utils/, types/  (Foundation)          │
│  └─ 定数 / 純粋関数 / 共有型                               │
└────────────────────────────────────────────────────────────┘
                    │ REST + Bearer トークン
                    ▼
      Bon_Log_cfw の /api/v1/*（別リポジトリ。ここでは変更しない）
```

## 配置判断基準

### `app/` に置く
- Expo Router のルーティングと画面合成のみ。**薄く保つ**
- ビジネスロジック・データ整形を書かない（フックか utils に出す）

### `components/` に置く
- 再利用 UI。データはフック経由か props で注入し、表示に徹する

### `lib/queries/` に置く
- サーバーデータの取得・更新フック（`useFeedQuery`, `useCreatePostMutation` 等）
- クエリキー定義（`keys.ts`）と invalidation 対応表
- UI（React Native コンポーネント）に依存しない

### `lib/api/` に置く
- 通信のみ。生成クライアント（`generated/`）とラッパー
- React に依存しない（どの層からも import 可能だが、呼び出しは原則 `lib/queries/` 経由）

### 判断フロー

```
サーバーのデータを読む / 書く？
├─ Yes → lib/queries/{feature}.ts のフック（内部で lib/api/ を呼ぶ）
└─ No
   ├─ 複数画面から使う UI 部品？ → components/{feature}/
   ├─ 複数箇所から使う Client 処理？ → hooks/use-{name}.ts
   ├─ 複数箇所から使う純粋ロジック？ → lib/utils/
   └─ 画面固有の軽い処理？ → その画面ファイル内の private 関数
```

## 依存方向の遵守

```
✅ app/ → components/ → hooks/
✅ app/, components/ → lib/queries/ → lib/api/
✅ lib/auth/ → lib/api/          // トークン refresh の呼び出し
✅ どの層 → lib/constants/, lib/utils/, types/
❌ lib/api/ → lib/queries/       // 逆依存（循環になる）
❌ lib/** → components/, app/    // 基盤層が UI に依存（禁止）
❌ components/, app/ → lib/api/ 直接  // クエリ層を飛ばした生フェッチ（キャッシュ管理が壊れる）
```

## 自動生成コードの扱い

- `lib/api/generated/` は `npm run generate:api` の出力。**直接編集禁止**
- 再生成で消える変更を入れない。拡張・加工はラッパー側（`lib/api/client.ts` 等）で行う

## サーバー側の変更が必要になったら

- API エンドポイント・レスポンス形状・DB スキーマは **Bon_Log_cfw の管轄**。このリポジトリでは変更できない
- 必要なエンドポイント・フィールド・挙動を明文化し、ユーザー（Bon_Log_cfw 側の作業）に引き継ぐ
- 暫定対応としてクライアント側で複数 API を叩いて合成する場合も、リクエスト連打（N+1 相当）をしない。本来はサーバーの services 層へ押し下げる方針（計画書 工事#2）

## 拡張時のチェックリスト

新機能 X を追加するとき:

- [ ] スクリーンを `app/` に、UI を `components/{x}/` に配置
- [ ] データ取得・更新フックを `lib/queries/{x}.ts` に配置（クエリキーは `keys.ts` に追加）
- [ ] ミューテーションの invalidation 対応表を更新
- [ ] 定数・制限値を `lib/constants/` に追加
- [ ] テストを `__tests__/` に配置（src 構成をミラー）
- [ ] 主要フローに関わるなら Maestro フロー（`.maestro/`）を追加・更新
