# Maestro E2E 実行手順書

このファイル 1 つで `.maestro/` 配下の E2E フローを実行できることを目指す。
不明点があれば本文中の「要確認」「公式ドキュメント参照」の指示に従うこと。

対象アプリ: `com.bonlog.app`（`app.json` の `android.package` / `ios.bundleIdentifier`）。
2026-07-29 時点で Maestro CLI は未導入・実機/エミュレータでの実行は一度も行われていない
（`docs/handoff-to-codex-2026-07-14.md` §7-D、§10.1、§11.4 参照）。

---

## 1. 前提条件

| 項目 | 内容 |
|------|------|
| OS | Windows 11（本手順書は Windows 前提。macOS/Linux は 2.1 の公式ドキュメントを参照） |
| Java | JDK 17 以上。`JAVA_HOME` が設定されていること（Maestro CLI 自体の実行に必要） |
| Android SDK / エミュレータ | Android Studio + AVD、または実機（USB デバッグ有効・`adb devices` で見えること）。`.claude/rules/setup-dev.md` の開発環境セットアップを先に完了させる |
| development build | `npx expo run:android` で作成した development build が対象デバイスにインストール済みであること。Push (expo-notifications) を含む一部ネイティブ機能は Expo Go では動かないため、**Expo Go での代用は不可** |
| Metro バンドラ | development build は JS バンドルを Metro から取得する。`npx expo start`（または `npx expo run:android` を実行したままのターミナル）を起動し続けておくこと。閉じると起動時に "no bundle" 相当のエラーになる |
| テストアカウント | メールアドレス・パスワードでログイン可能な Bon_Log アカウント（Google ログインのみのアカウントは `00_login.yaml` では使えない）。アカウント状態の要件は 5 章参照 |
| 環境変数 | `MAESTRO_LOGIN_EMAIL` / `MAESTRO_LOGIN_PASSWORD`（`00_login.yaml` が要求。フロー内コメント参照） |
| API 接続先 | 既定はビルド時の `EXPO_PUBLIC_API_BASE_URL`（通常は本番 `https://www.bon-log.com`）。書き込みを伴うためローカルサーバー（`../Bon_Log_cfw` の `npm run dev` + `http://10.0.2.2:3000`）での検証を推奨（`.claude/rules/setup-dev.md` 準拠） |

---

## 2. Maestro CLI のインストール（Windows）

以下は公式ドキュメント（2026-07-29 確認時点）の手順をそのまま記載する。将来 URL やダウンロード形式が変わる可能性があるため、食い違う場合は公式ドキュメントを優先すること。

- 公式インストールガイド: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli
- CLI コマンド一覧: https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options

### 2.1 前提: Java 17+

```
java -version
```

17 未満、または未インストールの場合は Oracle JDK / Temurin JDK / SDKMAN のいずれかで JDK 17+ を導入し、`JAVA_HOME` を設定する（公式ドキュメントの Prerequisites 節）。

### 2.2 インストール手順（GitHub Release の zip を展開する方式）

1. 最新の `maestro.zip` をダウンロードする:
   `https://github.com/mobile-dev-inc/maestro/releases/latest/download/maestro.zip`
   （GitHub Releases ページ: https://github.com/mobile-dev-inc/Maestro/releases）
2. 任意の安定した場所に展開する（例: `C:\maestro`）
3. PowerShell で `bin` フォルダを `PATH` に追加する:
   ```powershell
   setx PATH "%PATH%;C:\maestro\bin"
   ```
4. ターミナルを再起動して変更を反映する
5. 動作確認:
   ```
   maestro --help
   ```

WSL2 経由でのインストールも公式ドキュメントに記載があるが、ADB のポートブリッジ設定が必要で複雑なため、公式ドキュメントも「本当に必要な場合のみ」使用を推奨している。特別な理由がない限り、上記の Windows ネイティブ手順を使うこと。

### 2.3 デバイス接続の確認

Maestro はローカルの adb 経由でデバイスを操作する。CLI 導入後、対象デバイス（エミュレータ or 実機）が見えることを確認する:

```
maestro list-devices
adb devices
```

---

## 3. 実行コマンド

`package.json` の `test:e2e` は以下の通り:

```
"test:e2e": "maestro test .maestro/"
```

### 3.1 全フロー一括実行

```bash
maestro test .maestro/ -e MAESTRO_LOGIN_EMAIL=your-account@example.com -e MAESTRO_LOGIN_PASSWORD=your-password
```

またはリポジトリの npm スクリプト経由（環境変数は先に export/set しておくか `-e` 相当の仕組みが npm 経由では渡しにくいため、直接 `maestro test` を叩く方法を推奨）:

```bash
npm run test:e2e -- -e MAESTRO_LOGIN_EMAIL=your-account@example.com -e MAESTRO_LOGIN_PASSWORD=your-password
```

**注意（4 章・7 章で詳述）**: `.maestro/` 配下の 10 フローには「フィードが空であること」（`01`）と「フィードに投稿があること」（`07`〜`09`）という**両立しない前提**が混在する。単一のテストアカウントで `maestro test .maestro/` を一括実行すると、どちらかのフロー群が必ず失敗する。まず 4 章を読んでから実行すること。

### 3.2 個別フロー実行

```bash
maestro test .maestro/00_login.yaml -e MAESTRO_LOGIN_EMAIL=xxx -e MAESTRO_LOGIN_PASSWORD=xxx
```

### 3.3 部分実行（サブセット指定）

`maestro test` はスペース区切りで複数ファイルを受け付ける（`maestro-cli-commands-and-options` の `<flowFiles>...` 参照）。ログイン済みセッションに依存するフローは `00_login.yaml` を必ず先頭に含める:

```bash
maestro test .maestro/00_login.yaml .maestro/02_tab_navigation.yaml .maestro/03_fab_post_new.yaml -e MAESTRO_LOGIN_EMAIL=xxx -e MAESTRO_LOGIN_PASSWORD=xxx
```

### 3.4 並列実行（shard）は使わない

`--shard-all` / `--shard-split` はフローを複数デバイスへ分配する機能だが、`01`〜`09` は前フローが確立したログイン済みセッション（`clearState: false`）に依存する順序依存フローのため、このスイートでは使用しないこと。

---

## 4. 実行順序と、フィード状態に関する重要な制約

`.maestro/` の全フローは `appId: com.bonlog.app` で、`00_login.yaml` のみ `launchApp: clearState: true`（アプリデータを消してから起動）、`01`〜`09` は `launchApp: clearState: false`（前フローのログイン状態を引き継ぐ）。ファイル名の `00`〜`09` の連番はこの依存関係を表しており、**`00_login.yaml` を必ず最初に実行すること**。

`maestro test .maestro/` にフォルダを渡した場合、ファイル名の辞書順（`00`→`09`）で実行される。個別・部分実行する場合も同じ順序を保つこと。

### 4.1 両立しないフィード前提（一括実行できない理由）

| フロー | 必要なフィード状態 |
|--------|-------------------|
| `01_feed_empty_state.yaml` | フィードが**空**（未フォロー、または自分の投稿もない） |
| `07_like_post_toggle.yaml` / `08_report_post_flow.yaml` / `09_block_user_confirm_dialog.yaml` | フィード先頭に**他ユーザーの投稿が最低1件**表示されている（テストアカウントが誰かをフォロー済み） |

同一アカウントでこの両方を同時に満たすことはできない。したがって:

- **推奨**: 2 種類のテストアカウント（またはアカウント状態）を用意し、2 回に分けて実行する
  - パス A（未フォロー・空アカウント）: `00, 01, 02, 03, 04, 05, 06`
  - パス B（フォロー済み・フィードに投稿あり）: `00, 02, 03, 04, 05, 06, 07, 08, 09`（`01` は除外）
- どうしても 1 アカウントで一括実行したい場合は、`01` か `07`〜`09` のどちらかが失敗することを許容し、その失敗が**アカウント状態起因であってアプリの不具合ではない**と判断できるようにしておくこと

### 4.2 通知の前提（05）

`05_notifications_empty_state.yaml` はテストアカウントの通知が 0 件であることを前提とする。パス B（フォロー済みアカウント）で実行する場合でも、そのアカウント宛にいいね・コメント等が届いていなければ通知は 0 件のままなので両立可能。事前に通知タブを目視確認しておくこと。

---

## 5. 各フローの説明

| # | ファイル | 検証内容 | 前提条件 | 目安時間 |
|---|---------|---------|---------|---------|
| 00 | `00_login.yaml` | メール・パスワードでログイン→フィード（ホーム）へ遷移 | 未認証状態から開始（`clearState: true`）。`MAESTRO_LOGIN_EMAIL`/`MAESTRO_LOGIN_PASSWORD` | 15〜20秒 |
| 01 | `01_feed_empty_state.yaml` | フィード空状態のメッセージ・「ユーザーを検索」ボタン・FAB表示 | ログイン済み。フィードが空（4.1 参照） | 5秒 |
| 02 | `02_tab_navigation.yaml` | ボトムナビ（検索/通知/プロフィール/ホーム）の遷移完了 | ログイン済み | 10秒 |
| 03 | `03_fab_post_new.yaml` | FABタップ→新規投稿画面表示（「キャンセル」「投稿する」ボタン） | ログイン済み。フィード画面表示済み | 5秒 |
| 04 | `04_post_composer_discard.yaml` | 投稿本文入力→キャンセル→破棄確認ダイアログ→破棄→フィードへ戻る | ログイン済み | 10秒 |
| 05 | `05_notifications_empty_state.yaml` | 通知タブの空状態メッセージ | ログイン済み。通知0件（4.2参照） | 5秒 |
| 06 | `06_profile_and_settings_navigation.yaml` | プロフィール→設定→ブロックリスト/ミュートリストへの往復遷移 | ログイン済み | 15秒 |
| 07 | `07_like_post_toggle.yaml` | いいねトグル（いいね→取り消し→元に戻る） | ログイン済み。フィード先頭に投稿あり（4.1参照） | 10秒 |
| 08 | `08_report_post_flow.yaml` | 投稿の通報導線（理由選択→詳細入力→キャンセル） | ログイン済み。フィード先頭に他ユーザー投稿あり | 15秒 |
| 09 | `09_block_user_confirm_dialog.yaml` | ユーザーブロック確認ダイアログへの到達→キャンセル | ログイン済み。フィード先頭に他ユーザー投稿あり | 15秒 |

目安時間はフロー内のステップ数から見積もった参考値であり、実測値ではない（実機のスペック・ネットワーク状態に依存する）。

---

## 6. 非破壊設計であることの明記

| フロー | バックエンドに実データを残すか |
|--------|-------------------------------|
| `00_login.yaml` | 残さない（ログインのみ） |
| `01_feed_empty_state.yaml` | 残さない（閲覧のみ） |
| `02_tab_navigation.yaml` | 残さない（画面遷移のみ） |
| `03_fab_post_new.yaml` | 残さない（画面表示確認のみ、入力・送信なし） |
| `04_post_composer_discard.yaml` | **残さない（設計上の非破壊）**。本文を入力するが送信せず「破棄する」を選んでキャンセルする |
| `05_notifications_empty_state.yaml` | 残さない（閲覧のみ） |
| `06_profile_and_settings_navigation.yaml` | 残さない（画面遷移のみ） |
| `07_like_post_toggle.yaml` | いいね→取り消しの2タップで実行するが、`LikeButton` はデバウンス後に API を呼ぶため連続2タップでは実質的にサーバー状態を変えない設計（フロー内コメント参照）。ただしデバウンス実装が変わった場合はこの前提が崩れる点に注意 |
| `08_report_post_flow.yaml` | **残さない（設計上の非破壊）**。通報理由・詳細まで入力するが「通報をキャンセルして閉じる」を選び、送信ボタン（「通報する」）は押さない |
| `09_block_user_confirm_dialog.yaml` | **残さない（設計上の非破壊）**。ブロック確認ダイアログの「キャンセル」を選び、実際のブロックは実行しない |

---

## 7. 詰まりやすい点と対処

### 7.1 セレクタが見つからない（`assertVisible` / `tapOn` がタイムアウトする）

- development build と `.maestro/` のフローが同じコミットのものか確認する（`accessibilityLabel` / `testID` が変わっている可能性）
- `maestro hierarchy` コマンドで現在の画面のビュー階層を確認できる（公式ドキュメント: https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options ）
- Maestro Studio（GUI、`maestro studio` で起動）を使うと、実行中の画面から要素とセレクタを対話的に確認できる

### 7.2 `00_login.yaml` で "ログイン" のテキストが見つからない

- development build が旧セッションのトークンを保持していて、起動直後に自動でフィードへ遷移している可能性がある（`clearState: true` を使っているため通常は起きないが、secure-store がクリアされない実装変更があった場合は要確認）
- API 接続先（`EXPO_PUBLIC_API_BASE_URL`）がビルド時の設定と一致しているか確認する

### 7.3 `07`〜`09` が失敗する（"投稿のオプションを開く" が見つからない）

4.1 節の通り、これらのフローは**フィード先頭に他ユーザーの投稿がある**ことを前提とした index 依存の設計（`index: 0`）。テストアカウントが誰もフォローしていない、またはフィードが空の場合は必ず失敗する。テストアカウントで誰か（他ユーザー）をフォローし、フィードに投稿が表示される状態にしてから実行すること。

逆に `01_feed_empty_state.yaml` はフィードが空であることを前提とするため、`07`〜`09` を通したアカウントのまま `01` を実行すると失敗する（4.1参照）。

### 7.4 `09` の "^@.+ をブロック$" のようなラベルがマッチしない

このラベルは対象ユーザーのニックネームを含む動的文言（`@{ニックネーム} をブロック`）。フロー内では正規表現でマッチさせているため、通常はニックネームの内容に依存せず動作するはずだが、ニックネームに正規表現の特殊文字（`^` `$` 等）が含まれる特殊なテストデータの場合は一致しないことがある。テストアカウントがフォローするユーザーのニックネームを確認する。

### 7.5 Metro バンドラが見えない／JS バンドルの読み込みでアプリが止まる

development build は Metro（`npx expo start` 相当）からバンドルを取得する。PC を再起動した、ターミナルを閉じた等でバンドラが停止していないか確認する。実機の場合は PC と同じ Wi-Fi に接続されているか、`adb reverse` が必要な USB 接続かも確認する。

### 7.6 `maestro test` がデバイスを見つけられない

`adb devices` で対象デバイスが `device` 状態（`unauthorized`/`offline` でない）になっているか確認する。複数デバイス接続時は `--udid`/`--device` オプションでの指定が必要（2章のCLIコマンド一覧参照）。

### 7.7 通知権限ダイアログ等の OS ダイアログでフローが止まる

`push-notifications.md` の方針上、通知許可はログイン後の文脈依存タイミングで要求される。もし OS の許可ダイアログがフロー実行中に予期せず出た場合、Maestro のフロー定義に許可ダイアログへの対処（`tapOn` 等）が含まれていないため止まる可能性がある。その場合はフロー本体の修正が必要になるため、**セレクタ・フロー本体の変更はこのタスクの担当範囲外**（本ドキュメント整備タスクでは行わない）。事象を記録し、上位エージェントへ差し戻すこと。

---

## 8. 参考リンク（公式ドキュメント）

- Maestro Docs トップ: https://docs.maestro.dev/
- Maestro CLI インストール: https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli
- Maestro CLI コマンド一覧: https://docs.maestro.dev/maestro-cli/maestro-cli-commands-and-options
- Flows（YAML 構文リファレンス）: https://docs.maestro.dev/maestro-flows
- GitHub Releases（Windows 用 zip）: https://github.com/mobile-dev-inc/Maestro/releases

実機 QA（E2E で自動検証できない項目）は `.maestro/MANUAL-QA.md` を参照。
