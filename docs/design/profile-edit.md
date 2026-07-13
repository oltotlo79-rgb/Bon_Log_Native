# プロフィール編集画面 UI/UX 仕様 — Bon_Log Native

作成日: 2026-06-19
最終改訂: 2026-07-13（実装 `app/settings/profile/index.tsx` / `components/profile/LocationField.tsx` / `components/profile/BonsaiHistoryField.tsx` / `components/profile/BirthdayField.tsx` / `hooks/use-profile-edit.ts` の確認結果に基づき §2・§7・§8.2 を全面改訂。居住地・盆栽歴・誕生日はいずれも自由入力のテキストフィールドではなく、トリガー→モーダルのグループ選択 / 日付ピッカーであることが判明したため是正した。誕生日の年齢制限（最小13歳）は Web に対応する制約がなく実装にも存在しないため撤回。保存ボタンの活性条件も `isDirty` を要求しない実装に合わせて修正した）
同日追記（2026-07-13 第2回改訂・Web 準拠監査）: bio 文字数カウンタの警告色について Web (`components/user/ProfileEditForm.tsx`) の実装を確認し、§7.2・§14 を更新した。Web には動的カウンタ・警告色のいずれも存在しないことを確認したため、Native も「残り文字数接近時の警告色」は採用しない方針で確定した（詳細は §7.2 参照）。あわせて bio の文字数上限（200文字）が Web と一致していることを cfw 側のソース（`lib/constants/limits/post.ts`）で再確認した
対象画面:
- `settings/profile` — プロフィール編集

前提:
- `design-tokens.md` §2.3 のトークン名を使用する
- `navigation-structure.md` §4.3（設定画面群）・§5.1（スタックヘッダー）に準拠
- `common-states.md` の 4 状態（ローディング / 空 / エラー / オフライン）を適用する
- `auth-forms.md` §0.2 / §0.3 の入力フィールド基本仕様（AuthTextField・FormErrorMessage）を流用する
- `post-composer.md` §8 の ImageAttachmentGrid に準じた画像選択仕様を適用する
- 居住地・誕生日はグループ付き / 日付のみのモーダル選択（`components/profile/LocationField.tsx` / `components/profile/BirthdayField.tsx`。§7.3・§7.5 参照）。盆栽歴は年・月それぞれの数値ピッカー（`components/profile/BonsaiHistoryField.tsx`。§7.4 参照）

---

## 1. 概要・目的

自分のプロフィールを編集する画面。ニックネーム・自己紹介・居住地・盆栽歴・誕生日・公開設定・アバター画像・ヘッダー画像を変更できる。

### 1.1 解決する問題

- プロフィール情報を手軽に更新できるモバイル向け UI を提供する
- アバター（円形）とヘッダー（横長）という 2 種類の画像の選択・プレビューを直感的に提示する
- 居住地・盆栽歴・誕生日は自由入力ではなく統制されたピッカー UI にすることで、入力ミス・表記ゆれ（都道府県名の誤字等）を防ぐ

---

## 2. 画面構成（ワイヤーフレーム）

### 2.1 全体レイアウト

> **改訂注記（2026-07-13）:** 居住地・盆栽歴・誕生日のワイヤーフレームを実装（トリガーボタン→モーダル選択）に合わせて修正した。旧仕様はこれらを自由入力のテキストフィールドとして描いていたが誤りだった。

```
┌─────────────────────────────────────────────────────────────┐
│ ← [セーフエリア上端]                                         │
│                                                             │
│ [スタックヘッダー]                                           │
│   左: 「← 戻る」                                            │
│   中央: 「プロフィールを編集」                               │
│   右: 「保存する」（テキストボタン）                         │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ [ScrollView]                                                │
│                                                             │
│   [画像編集セクション]                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                                                     │   │
│   │  [ヘッダー画像（横長 4:1 プレビュー）]              │   │
│   │  [＋ / 変更アイコン 右下に重なる]                   │   │
│   │                                                     │   │
│   │      [アバター画像（円形 80pt）]（左寄り / 下方オーバーラップ）│
│   │      [＋ / 変更アイコン 右下]                        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [フォームエラー（表示時のみ）]                             │
│                                                             │
│   [ニックネーム（必須）]                                     │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 山田太郎（初期値）                     40/50        │   │
│   └─────────────────────────────────────────────────────┘   │
│   [エラー文言（blur 時 / API エラー時）]                     │
│                                                             │
│   [自己紹介（任意）]                                         │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 松柏が好きで...（初期値）                           │   │
│   │                                                     │   │
│   │                                           0/200     │   │  ← 常に colorTextSecondary（警告色なし。§7.2 参照）
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [居住地（任意）— LocationField（トリガー→グループ付きモーダル）]│
│   ┌─────────────────────────────────────────────────────┐  ▼│
│   │ 居住地を選択                                         │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   [盆栽を始めた時期（任意）— BonsaiHistoryField]              │
│   ┌──────────────────────┐  ┌──────────────────┐            │
│   │ 年を選択            ▼│  │ 月を選択        ▼│（開始年選択後のみ表示）│
│   └──────────────────────┘  └──────────────────┘            │
│                                                             │
│   [誕生日（任意）— BirthdayField（DatePickerField ラップ）]  │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 誕生日を選択                             [カレンダー]│   │
│   └─────────────────────────────────────────────────────┘   │
│   ※ 選択済みの場合のみ右に [✕ 削除] ボタン                  │
│                                                             │
│   [アカウントの公開 / 非公開]                                │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ プロフィールを公開する     [トグルスイッチ]          │   │
│   └─────────────────────────────────────────────────────┘   │
│   [ヒントテキスト: 非公開にすると...の説明]                  │
│                                                             │
│   [底部余白（spacing12）]                                    │
│                                                             │
│ ← [セーフエリア下端]                                         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 入力フィールド一覧

| フィールド | 種類 | 必須 | 文字数上限 | 備考 |
|-----------|------|------|-----------|------|
| ニックネーム | 1 行テキスト | 必須 | 50 文字（`MAX_NICKNAME_LENGTH`）| 文字数カウンタを表示 |
| 自己紹介（bio）| 複数行テキスト | 任意 | **200 文字**（`MAX_BIO_LENGTH`）| 文字数カウンタを表示。旧仕様は 300 文字だったが実装は 200 文字。カウンタに警告色の段階は設けない（§7.2 参照） |
| 居住地（location）| `LocationField`（トリガー→グループ付きモーダルの単一選択）| 任意 | 100 文字（`MAX_LOCATION_LENGTH`。ただし選択肢はすべて上限を大きく下回る短い文字列のため実質到達しない）| 自由入力不可。§7.3 参照 |
| 盆栽歴（開始年・開始月）| `BonsaiHistoryField`（年・月それぞれ数値ピッカーのトリガー→モーダル）| 任意 | — | 自由入力不可。§7.4 参照 |
| 誕生日 | `BirthdayField`（`DatePickerField` ラップ・日付のみピッカー）| 任意 | — | 最大値=本日。最小値の制限なし（年齢制限なし）。§7.5 参照 |
| 公開設定（isPublic）| トグルスイッチ | — | — | true: 公開 / false: 非公開 |
| アバター画像 | 画像選択 | 任意 | — | 円形プレビュー |
| ヘッダー画像 | 画像選択 | 任意 | — | 横長（4:1）プレビュー |

---

## 3. ナビゲーション

| 項目 | 内容 |
|------|------|
| 配置 | `settings/profile`（`settings/` スタック内）|
| 遷移元 | `(tabs)/profile`（プロフィール画面の「プロフィールを編集」ボタン）または `settings/index` のリスト項目 |
| 遷移先（保存成功）| `router.back()`（settings/profile を閉じて戻る）|
| 遷移先（キャンセル）| `router.back()`（変更がある場合は破棄確認を表示）|
| ディープリンク | 不要 |

**iOS / Android 差異:**
- iOS: スワイプバックによるスタックポップが可能。変更がある場合は Expo Router の `navigation.addListener('beforeRemove', ...)` で阻止し、破棄確認を表示する（実装確認済み）
- Android: ハードウェアバックボタンで戻る際も同じ `beforeRemove` リスナーが働き、破棄確認を表示する

---

## 4. コンポーネント分割

```
ProfileEditScreen                  ← 画面全体のコンテナ
├── ProfileEditHeader              ← スタックヘッダー（戻る / タイトル / 保存する。独自実装）
├── ProfileImageEditor             ← ヘッダー画像 + アバター画像の編集エリア
├── FormErrorMessage               ← フォーム全体エラーバナー（auth-forms.md §0.3 流用）
├── AuthTextField（ニックネーム）  ← auth-forms.md 流用 + 文字数カウンタ
├── TextInput（自己紹介）          ← 多行テキスト + 文字数カウンタ（画面ローカル実装）
├── LocationField                  ← 居住地（トリガー→グループ付きモーダル。§7.3）
├── BonsaiHistoryField             ← 盆栽歴（開始年・月それぞれの数値ピッカー。§7.4）
├── BirthdayField                  ← 誕生日（`DatePickerField` ラップ。§7.5）
├── PublicToggleField              ← 公開設定トグル
└── DiscardConfirmDialog           ← 破棄確認ダイアログ
```

### 4.1 props 概要

**ProfileEditScreen**

| prop 名 | 意味 |
|---------|------|
| 特になし | 自分のプロフィールデータは `useCurrentUserProfileQuery()` から取得する |

**ProfileImageEditor**

| prop 名 | 意味 |
|---------|------|
| `avatarUrl` / `headerUrl` | 現在の画像 URL（サーバー保存済み値。null なら未設定）|
| `avatarLocalUri` / `headerLocalUri` | 選択直後のローカル URI（保存前プレビュー用）|
| `onAvatarChange` / `onHeaderChange` | 画像変更後のローカル URI コールバック |
| `onAvatarRemove` / `onHeaderRemove` | 画像削除コールバック |
| `isDisabled` | 保存中など外部から無効化するフラグ |

> §6 の画像編集エリアの詳細仕様は今回の改訂では再検証していない（2026-06-19 版のまま）。§7 のテキスト・ピッカー系フィールドのみが本改訂の対象。

---

## 5. データの流れ

### 5.1 初期値の取得

- `useCurrentUserProfileQuery()`（TanStack Query）で自分のプロフィールを取得する
- `hooks/use-profile-edit.ts` の `useProfileEdit(profile)` がフォーム状態の初期値として展開する

### 5.2 プロフィール更新

1. フォーム送信時、`buildUpdateRequest()` が初期値と現在値を比較し、**変更があったフィールドのみ**を含むリクエストを構築する（部分更新。`nickname` / `bio` / `location` / `bonsaiStartYear` / `bonsaiStartMonth` / `birthDate` / `isPublic` / `avatarUrl` / `headerUrl`）
2. 画像変更がある場合: `useUploadImageMutation()` で presigned URL 取得 → R2 に直接 PUT → 返ってきた URL をリクエストに含める（アバター・ヘッダーそれぞれ個別にアップロード）
3. `useUpdateProfileMutation(profile.id)` で `PATCH`（部分更新であることは実装で確認済み。エンドポイントの正本は OpenAPI）
4. 成功後: プロフィールクエリを invalidate し、`router.back()` で前の画面に戻る

### 5.3 必要なデータ項目（初期値として展開するもの）

| フィールド名 | 意味 |
|------------|------|
| `nickname` | ニックネーム |
| `bio` | 自己紹介 |
| `location` | 居住地（`LocationField` の選択肢のいずれかの文字列、または空文字）|
| `bonsaiStartYear` | 盆栽歴の開始年（整数 or null）|
| `bonsaiStartMonth` | 盆栽歴の開始月（1〜12 or null）|
| `birthDate` | 誕生日（ISO 8601 日付文字列 or null）|
| `isPublic` | 公開設定（boolean）|
| `avatarUrl` | アバター画像 URL（null 許容）|
| `headerUrl` | ヘッダー画像 URL（null 許容）|

---

## 6. 画像編集エリア（ProfileImageEditor）の詳細仕様

> 本セクションは 2026-06-19 版のまま。今回の改訂（§7 のフィールド是正）では実装ファイル `components/profile/ProfileImageEditor.tsx` を再検証していないため、記述と実装に差異がある場合は今後の改訂で確認すること。

### 6.1 ヘッダー画像（HeaderImagePicker）

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│       [ヘッダー画像プレビュー / 未設定はグレー背景]          │
│       アスペクト比: 4:1（画面幅 - padding の全幅）           │
│                                                             │
│                                           [✏ 編集 44pt]    │
└─────────────────────────────────────────────────────────────┘
```

- プレビューサイズ: 幅 = 画面幅 / 高さ = 幅 × 0.25（4:1 比）
- `expo-image` / `contentFit: "cover"`
- 未設定時の背景: `colorSurfaceMuted`（`#f0f0f0`）+ 中央に Camera 系アイコン（24pt / `colorTextSecondary`）
- 編集ボタン: プレビュー右下に絶対配置（44 × 44pt）/ 背景: `colorActionPrimary` / 角丸: `radiusFull`
  - アイコン: Pencil 系 16pt / `colorActionPrimaryText`
  - `accessibilityLabel`: 「ヘッダー画像を変更」
- プレビュー全体のタップでも編集ボタンと同じ操作（画像選択を起動）
- 選択後はプレビューをローカル URI で即時更新（保存は「保存する」ボタン押下時）

### 6.2 アバター画像（AvatarImagePicker）

```
[アバター円 80pt]（ヘッダー画像の左下オーバーラップ配置）
  ├── [プレビュー画像 / 未設定はイニシャル]
  └── [✏ 編集ボタン 右下 / 直径 28pt]
```

- サイズ: 80 × 80pt / `borderRadius: radiusFull`
- 枠線: 3pt solid `colorBackground`（背景との境界を白で区切る / Web 版のアバター外縁表示に相当）
- 未設定時: ニックネーム先頭 1 文字 / `textXl` / `colorTextSecondary` / 背景 `colorSurfaceMuted`
- 編集ボタン（オーバーレイ）: 直径 28pt / `colorActionPrimary` 背景 / Pencil 系アイコン 12pt
  - 位置: アバター円の右下（`position: absolute` / `bottom: 0` / `right: 0`）
  - `accessibilityLabel`: 「プロフィール写真を変更」
- アバター全体のタップでも画像選択を起動
- アバターの位置: ヘッダー画像の左下から `spacing4`（16pt）の位置に `marginTop: -40pt`（半径分）で重なる

### 6.3 画像選択の共通フロー

1. ボタンタップ → 選択肢を ActionSheet で表示
   - 「写真ライブラリから選択」
   - 「カメラで撮影」
   - 「現在の画像を削除」（画像が設定済みの場合のみ）
   - 「キャンセル」
2. ライブラリまたはカメラ起動（`expo-image-picker`）
3. 選択後: `expo-image-manipulator` で圧縮・リサイズ
   - アバター: 最大 400 × 400pt に正方形クロップ後、圧縮
   - ヘッダー: 最大 1500 × 375pt に 4:1 クロップ後、圧縮
   - 具体的な圧縮品質・リサイズ値は `lib/constants/` に定数化（**frontend への申し送り**）
4. ローカルプレビューを即時更新する

**権限がない場合:** `auth-forms.md` §0.8 に準じる（`Alert.alert()` で設定アプリへの誘導を表示）

---

## 7. フォームフィールドの詳細仕様

### 7.1 ニックネーム（NicknameField）

- `AuthTextField` を流用する（`auth-forms.md` §0.2 仕様）
- ラベル: 「ニックネーム」+ 必須マーク（`*` / `colorError`）
- `placeholder`: 「表示名（50文字以内）」
- `maxLength: 50`（`MAX_NICKNAME_LENGTH`）
- `autoCapitalize: "none"` / `autoCorrect: false`
- `textContentType: "username"` / `autoComplete: "username"`
- 文字数カウンタ: 入力フィールド右端内側に `{N}/50`（`textSm` / `colorTextSecondary`）
- `keyboardType: "default"` / `returnKeyType: "next"`

**バリデーション（blur 時）:**
- 空チェック → `ERR_NICKNAME_REQUIRED`「ニックネームを入力してください。」
- 50 文字超 → `ERR_NICKNAME_TOO_LONG(50)`「ニックネームは50文字以内で入力してください。」

**API エラー:**
- ニックネームが予約済み（400 VALIDATION_ERROR）→ フィールド下にインラインエラー `ERR_NICKNAME_RESERVED`「このユーザー名は利用できません。別のユーザー名をご利用ください。」

**（2026-07-13 修正）:** 重複エラー文言を実装済みの `ERR_NICKNAME_RESERVED` の実際の文言に合わせて修正した（旧仕様の想定文言とは異なる）。

### 7.2 自己紹介 bio（BioField）

- `TextInput` / `multiline: true`
- ラベル: 「自己紹介（任意）」
- `placeholder`: 「盆栽への想いや、育てている樹種など...」
- 最小高さ: 80pt（3 行分）/ 最大高さ: 160pt（内部スクロール）
- 文字数カウンタ: テキストエリア右下 `{N}/200`（`textSm` / `colorTextSecondary`）
- ボーダー仕様: `auth-forms.md` §0.2 と同一（通常: `colorBorder` 1pt / エラー時: `colorError` 1pt）

**（2026-07-13 修正）:** 文字数上限を旧仕様の 300 文字から **200 文字**（`MAX_BIO_LENGTH`）へ修正した。

**カウンタの警告色について（2026-07-13 第2回改訂・確定仕様）:**

> **旧稿の撤回:** 本節は第1回改訂時点で「実装のカウンタ配色は『残り30文字以下で警告色に変化』という設計意図（`bioNearLimit` フラグ）を持つが、対応するスタイル `bioCounterWarning` の実際の色指定は `colorTextSecondary`（通常色と同じ）になっており、見た目上は警告時も変化しない」という**現状の記録のみ**を書き、最終的な仕様としてどちらが正しいかは決めていなかった（§14 に未解決事項として残していた）。今回、Web 側の実装を確認しこの点を確定した。

**Web の実装確認結果（`Bon_Log_cfw/components/user/ProfileEditForm.tsx`）:** Web の bio フィールドは `<Textarea maxLength={MAX_BIO_LENGTH} />` の下に静的なヒントテキスト `<p className="text-xs text-muted-foreground">最大200文字</p>` を表示するのみで、**入力中の残り文字数を動的に数えるカウンタ（`{N}/200` のような表示）自体が存在しない**。したがって警告色に変化する仕組みも当然存在しない。Web はブラウザの `maxLength` 属性でそもそも 200 文字を超える入力を受け付けない（越境状態に到達しない）。

**確定仕様:** Web に警告色の挙動が存在しない以上、Web 準拠の原則により Native も「残り文字数接近時に警告色へ変化する」という段階（近接警告）を**採用しない**。

- `{N}/200` の**動的カウンタ表示自体は Native 独自の UX 加点として維持する**（Web にない機能だが、削除は本改訂のスコープ外。件2の依頼は警告色の要否判定のみ）
- カウンタの色は **`colorTextSecondary` で固定**とし、`MAX_BIO_LENGTH` に近づいても変化させない（＝ `bioNearLimit` という「残り30文字」の閾値判定そのものを視覚表現に使わない）
- **上限超過時（`bioLength > MAX_BIO_LENGTH`）のみ `colorError` に変化させる。** これは Native 側で「サーバーの上限を超えた入力を許可しつつ、超過をインラインエラーで知らせる」独自の UX（`errors.bio` のインラインエラー表示と対）であり、Web のような `maxLength` によるハード制限（超過状態そのものに到達しない）とは異なる設計だが、これは本改訂のスコープ外（既存のまま維持してよい）。上限超過状態を赤色で警告する挙動自体は他の入力エラー表現（`colorError`）と一貫しており妥当と判断する
- 新規の警告色トークンは提案しない（`colorWarning`（`#b45309`）は `lib/constants/design-tokens.ts` に既存だが、今回の結論により bio カウンタでは使用しない）

**frontend 実装仕様（何をどう変えるか）:**

1. `app/settings/profile/index.tsx` の `bioNearLimit` 判定（`bioLength > MAX_BIO_LENGTH - BIO_WARNING_THRESHOLD`）と、それに連動する `styles.bioCounterWarning` の適用（`bioNearLimit && styles.bioCounterWarning`）を削除する。これにより見た目は変化しない（`bioCounterWarning` は現状 `colorTextSecondary` で通常色と同値のため、削除しても表示上のデグレードはない）
2. `bioCounterWarning` スタイル定義・`BIO_WARNING_THRESHOLD` 定数は死んだコードになるため、あわせて削除してよい（削除するかどうかは frontend の裁量。visual には無関係）
3. `bioCounterError`（`colorError`）と `bioOverLimit` 判定はそのまま維持する（変更不要）
4. 結果として bio カウンタの色は「`colorTextSecondary` 固定、ただし上限超過時のみ `colorError`」という 2 状態のみになる

**バリデーション（blur 時）:**
- 200 文字超 → `ERR_BIO_TOO_LONG(200)`「自己紹介は200文字以内で入力してください。」

**bio 文字数上限の Web 一致確認（core 引き継ぎ事項なし）:** Web 側 `Bon_Log_cfw/lib/constants/limits/post.ts` の `MAX_BIO_LENGTH = 200` と、Native 側 `lib/constants/limits/auth.ts` の `MAX_BIO_LENGTH = 200` は**両方とも 200 文字で一致している**ことを本改訂で再確認した。相違はないため core への追加の指摘事項はない。

### 7.3 居住地（LocationField）

> **改訂注記（2026-07-13）:** 旧仕様は「`AuthTextField` を流用した自由入力（100文字以内）」だったが、実装 `components/profile/LocationField.tsx` は Web の `<select>`（`components/user/ProfileEditForm.tsx` の optgroup 構成）に合わせたグループ付きモーダルの単一選択であり、自由入力は提供しない。

- トリガーボタン: 高さ 48pt / ボーダー `colorBorder` 1pt / 角丸 `radiusMd`。ラベル「居住地（任意）」はトリガーの上に常時表示
- 未選択時のトリガーテキスト: 「居住地を選択」（`colorTextTertiary`）。選択済みは選択した値をそのまま表示
- タップ → 画面下からスライドアップするモーダル（`SectionList`。タイトル「居住地を選択」+ 閉じるボタン）
- グループ構成（`LOCATION_GROUPS`。`lib/constants/locations.ts`）: 「日本の地方」（北海道〜沖縄の 11 地方）「都道府県」（47 都道府県）「国・地域」「大陸・地域」「その他」（海外）の 5 グループ（`stickySectionHeadersEnabled`）
- 各行: `accessibilityRole="radio"` / タップで即選択してモーダルを閉じる。選択中の行にチェックマーク（`colorActionPrimary`）
- 選択済みの場合、トリガー右に `close-circle` の削除ボタン（`accessibilityLabel="居住地を削除"`。タップで空文字に戻す）
- 閉じる手段: 背景スクリムタップ / ヘッダーの `×` ボタン / Android バック・iOS スワイプダウン

**バリデーション:** 選択肢は `LOCATION_GROUPS` に含まれる短い固定文字列のみのため、100 文字（`MAX_LOCATION_LENGTH`）超過は実質発生しない。`hooks/use-profile-edit.ts` の `validateLocation` は依然として存在するが、`LocationField` は `onBlur` を呼び出さないため、実運用でこのバリデーションが発火することはない。

### 7.4 盆栽歴（BonsaiHistoryField）

> **改訂注記（2026-07-13）:** 旧仕様は「開始年・開始月をテキスト入力（`number-pad`）で受け付ける」としていたが、実装 `components/profile/BonsaiHistoryField.tsx` は Web の `<select name="bonsaiStartYear">` / `<select name="bonsaiStartMonth">` に合わせた、年・月それぞれ独立したトリガー→数値選択モーダルである。

```
「盆栽を始めた時期（任意）」
┌──────────────────────┐  ┌──────────────────┐
│ 年を選択            ▼│  │ 月を選択        ▼│
└──────────────────────┘  └──────────────────┘
```

- 開始年トリガー: 未選択時「年を選択」、選択済みは「{年}年」。タップでモーダル（タイトル「開始年を選択」）を開き、`USER_BONSAI_START_MIN_YEAR`（1900年）〜現在年までを**新しい年が先頭に来る降順**で一覧表示する単一選択リスト
- 開始月トリガー: **開始年が未選択の間は非表示**（Web にはこの制約はないが、Native の既存 UX として踏襲）。開始年選択後に表示され、未選択時「月を選択」、選択済みは「{月}月」。タップでモーダル（タイトル「開始月を選択」）を開き、1〜12 を一覧表示する単一選択リスト
- 開始年をクリアすると開始月も連動してクリアされる（`setBonsaiStartYear` の実装）
- 両トリガーとも明示的な「クリア（✕）」ボタンは持たない。値を変えるには再度モーダルを開いて選び直す
- 各行: `accessibilityRole="radio"` / タップで即選択してモーダルを閉じる

**バリデーション:** ピッカーが提示する値は常に範囲内（1900〜現在年 / 1〜12）のため、`validateBonsaiStartYear` / `validateBonsaiStartMonth` が実際にエラーを返すことは通常の操作では発生しない（`LocationField` 同様、`onBlur` は呼ばれない）。

### 7.5 誕生日（BirthdayField）

> **改訂注記（2026-07-13）:** 旧仕様は「iOS: BottomSheet 内の DateTimePicker / Android: ネイティブの DatePickerAndroid」という記述自体は概ね正しかったが、実装は共通コンポーネント `components/common/DatePickerField.tsx`（`bonsai.md` §4.3 の取得日・記録日と同一コンポーネント）を「誕生日（任意）」ラベル・`maximumDate=本日` でラップした `components/profile/BirthdayField.tsx` である。**年齢範囲による下限制限（最小13歳等）は設けない**（Web の `<input type="date" max={今日}>` に対応する下限制約が存在しないため）。

```
「誕生日（任意）」
┌─────────────────────────────────────────────────────────────┐
│ 誕生日を選択                                              [カレンダー]│
└─────────────────────────────────────────────────────────────┘
```

- 表示形式: 選択済みは「{YYYY}年{M}月{D}日」（`textBase` / `colorTextPrimary`）
- 未設定: `placeholder` 「誕生日を選択」（`colorTextTertiary`）
- フィールドをタップ → 日付ピッカーを表示する
  - **Android:** `DateTimePickerAndroid.open({ mode: 'date' })` のネイティブダイアログが単体で開く
  - **iOS:** フィールド直下に `RNDateTimePicker`（`display="spinner"`）が**インライン展開**し、「完了」ボタンで閉じる
- 右端の [✕] ボタン: 設定済みの場合のみ表示。タップで誕生日を削除（null に設定）
  - `accessibilityLabel`: 「誕生日を削除」/ タップターゲット 44pt（`hitSlop` で確保）
- **最大値:** 本日（`maximumDate={new Date()}`）。未来日は選択不可
- **最小値:** 制限なし（**旧仕様にあった「最大120年前まで／最小13歳以上」の年齢制限は撤回**。Web に対応する制約が存在しないため、Native も設けない）

**（2026-07-13 解決）:** 旧 §14 未確定事項「最小年齢制限の有無」はこの撤回で解決済み。

### 7.6 公開設定トグル（PublicToggleField）

```
┌─────────────────────────────────────────────────────────────┐
│ プロフィールを公開する                        [  ●  ]       │
│ ─────────────────────────────────────────────────────────── │
│ 非公開にすると、フォロワー以外のユーザーから  │
│ あなたの投稿やプロフィールが見えなくなります。 │
└─────────────────────────────────────────────────────────────┘
```

- 行の高さ: 56pt（タップターゲット確保）
- トグルスイッチ: React Native の `Switch`
  - ON（公開）: `trackColor: colorActionPrimary`（`#2e2e2e`）
  - OFF（非公開）: `trackColor: colorSurfaceMuted`（`#f0f0f0`）
- ヒントテキスト（トグル行の下）: `textSm` / `colorTextSecondary` / `spacing2`（8pt）上マージン
- `accessibilityRole="switch"` / `accessibilityLabel="プロフィールを公開する"` / `accessibilityState: { checked: isPublic }`

---

## 8. ヘッダーの「保存する」ボタン（ProfileEditHeader）

### 8.1 仕様

- 位置: スタックヘッダーの右端
- スタイル: テキストボタン / `textBase`（14pt）/ `fontWeight: 600`

| 状態 | 表示 | 条件 |
|------|------|------|
| 活性 | `colorActionPrimary` テキスト | §8.2 の条件をすべて満たす |
| 無効 | `colorTextTertiary` テキスト（不透明度 0.4）| §8.2 の条件を満たさない |
| 保存中 | テキスト非表示 + `ActivityIndicator`（`colorActionPrimary`）| API 呼び出し中 |

- `accessibilityLabel`: 「プロフィールを保存する」
- `accessibilityState: { disabled }`

### 8.2 保存ボタンの活性条件

> **改訂注記（2026-07-13）:** 旧仕様は「初期値からいずれかのフィールドが変更されている（`isDirty`）」を活性条件に含めていたが、実装 `app/settings/profile/index.tsx` はこの条件を含まない。画面のコメントには「Web の ProfileEditForm は loading 中のみ保存ボタンを disabled にする（`isDirty` 相当の判定は行わない）」と明記されている。

`canSave = isValid && !isSaving && isOnline`

以下を**すべて**満たす場合のみ活性化する:
1. ニックネームが 1 文字以上 50 文字以内（`validateNickname`）
2. 自己紹介が 200 文字以内（`validateBio`）
3. 居住地が 100 文字以内（`validateLocation`。§7.3 の通り実質常に満たす）
4. 盆栽歴の開始年・開始月が範囲内（`validateBonsaiStartYear` / `validateBonsaiStartMonth`。§7.4 の通り実質常に満たす）
5. 保存処理中でない（`!isSaving`）
6. **オンラインである（`isOnline`）** — 旧仕様にはこの条件はなかったが、実装は `useOnlineStatus()` の結果を活性条件に含めている

**変更の有無（`isDirty`）は活性条件に含まれない。** 変更していなくても上記条件を満たせば「保存する」は押せる（＝未変更のまま送信すると、`buildUpdateRequest()` が空のリクエストボディを送る可能性がある）。`isDirty` は §3 の破棄確認（戻る操作時に確認ダイアログを出すか）にのみ使われる。

---

## 9. 状態とインタラクション

### 9.1 ローディング（初期値取得中）

- 取得中: `ScreenLoading`（`variant="spinner"`）を画面中央に表示する
- ヘッダーの「保存する」は disabled
- スケルトン UI の代わりに spinner を使う

### 9.2 保存中

- ヘッダーの「保存する」ボタンをスピナーに切り替える
- 「← 戻る」ボタンを disabled にする（保存中の離脱を防ぐ）
- フォームの全フィールドを disabled にする

### 9.3 保存成功

- `router.back()` で前の画面に戻る
- 成功トースト: 「プロフィールを保存しました」を表示する
- プロフィールクエリを invalidate する

### 9.4 保存失敗

- フォームの全フィールドを re-enable する
- `FormErrorMessage` にエラーを表示する（`auth-forms.md` §0.3 の仕様に準拠）
- ニックネーム重複（400 VALIDATION_ERROR）はニックネームフィールド直下にインライン表示する（§7.1 参照）

---

## 10. エッジケース

### 10.1 ローディング

- 初期値取得中: `ScreenLoading`（spinner）
- 画面に pull-to-refresh は設けない（フォーム画面のため不要）

### 10.2 空状態

- フォーム画面に「空」状態は存在しない（初期値がある = 自分のプロフィールが必ず存在する）

### 10.3 エラー

| エラー種別 | 表示箇所 | エラー定数カテゴリ |
|-----------|---------|-----------------|
| 初期値取得失敗 | `ScreenError`（onRetry: 再フェッチ）| `ERR_PROFILE_LOAD_FAILED` |
| ニックネーム重複 (400 VALIDATION_ERROR) | ニックネームフィールド直下インライン | `ERR_NICKNAME_RESERVED` |
| バリデーションエラー (400・その他) | `FormErrorMessage` | `messageForApiError(err.code)` |
| ネットワークエラー | `FormErrorMessage` | `ERR_NETWORK` |
| サーバーエラー (5xx) | `FormErrorMessage` | `ERR_SERVER` |
| 画像アップロード失敗 | `FormErrorMessage` | `ERR_MEDIA_UPLOAD_FAILED` |

### 10.4 オフライン

- `OfflineBanner` を画面上部に表示する
- フォームの入力は継続可能（保存だけブロック）
- **「保存する」ボタン自体がオフライン時は disabled になる**（§8.2 の `canSave` にオンライン条件を含むため。旧仕様の「タップ時にオフライン検知」よりも一段階早いタイミングでブロックされる）
- ボタンが仮に押された場合の防御として、`handleSave` 内でも `!isOnline` を再チェックし `ERR_OFFLINE_ACTION` を `FormErrorMessage` に表示する

### 10.5 破棄確認（未保存の変更がある場合に戻る）

変更がある状態で戻ろうとした場合（「← 戻る」タップ / iOS スワイプバック / Android バックボタン）:

```
タイトル: 「変更を破棄しますか？」
本文:     「保存されていない変更は失われます。」
ボタン:
  [編集を続ける]  — テキストボタン / colorTextSecondary
  [破棄する]      — 塗りつぶし / colorError / colorTextInverse
```

変更がない場合（フィールドが初期値のまま）は確認なしで即戻る。

実装は 2 経路で `isDirty` をチェックする: ①「← 戻る」ボタンの `onPress` 内で直接判定、② `navigation.addListener('beforeRemove', ...)` でスワイプバック・ハードウェアバックなど画面遷移全般をガードする。

---

## 11. コピー案（文言一覧）

| 箇所 | 文言 |
|------|------|
| ヘッダータイトル | 「プロフィールを編集」|
| 「← 戻る」ボタン | 「← 戻る」|
| 「保存する」ボタン | 「保存する」|
| 「保存する」（送信中）| （スピナーのみ）|
| ニックネームラベル | 「ニックネーム ＊」（＊ は必須マーク）|
| ニックネーム placeholder | 「表示名（50文字以内）」|
| 自己紹介ラベル | 「自己紹介（任意）」|
| 自己紹介 placeholder | 「盆栽への想いや、育てている樹種など...」|
| 居住地ラベル | 「居住地（任意）」|
| 居住地トリガー（未選択）| 「居住地を選択」|
| 居住地モーダルタイトル | 「居住地を選択」|
| 居住地削除ボタン | `accessibilityLabel="居住地を削除"` |
| 盆栽歴ラベル | 「盆栽を始めた時期（任意）」|
| 盆栽歴 年トリガー（未選択）| 「年を選択」|
| 盆栽歴 月トリガー（未選択）| 「月を選択」|
| 盆栽歴 年モーダルタイトル | 「開始年を選択」|
| 盆栽歴 月モーダルタイトル | 「開始月を選択」|
| 誕生日ラベル | 「誕生日（任意）」|
| 誕生日 placeholder | 「誕生日を選択」|
| 誕生日削除ボタン | `accessibilityLabel="誕生日を削除"` |
| 公開設定ラベル | 「プロフィールを公開する」|
| 公開設定ヒント | 「非公開にすると、フォロワー以外のユーザーからあなたの投稿やプロフィールが見えなくなります。」|
| アバター変更ボタン（accessibilityLabel）| 「プロフィール写真を変更」|
| ヘッダー変更ボタン（accessibilityLabel）| 「ヘッダー画像を変更」|
| 画像選択シート「ライブラリ」| 「写真ライブラリから選択」|
| 画像選択シート「カメラ」| 「カメラで撮影」|
| 画像選択シート「削除」| 「現在の画像を削除」|
| 保存成功トースト | 「プロフィールを保存しました」|
| 破棄確認タイトル | 「変更を破棄しますか？」|
| 破棄確認本文 | 「保存されていない変更は失われます。」|
| 破棄確認（続ける）| 「編集を続ける」|
| 破棄確認（破棄）| 「破棄する」|
| ニックネーム空エラー | 「ニックネームを入力してください。」|
| ニックネーム超過エラー | 「ニックネームは50文字以内で入力してください。」|
| ニックネーム重複エラー | 「このユーザー名は利用できません。別のユーザー名をご利用ください。」|
| bio 超過エラー | 「自己紹介は200文字以内で入力してください。」|
| 居住地超過エラー | 「居住地域は100文字以内で入力してください。」（実質発生しない。§7.3 参照）|

**（2026-07-13 修正）:** ニックネーム重複エラー・bio 超過エラーの文言、および居住地エラーの定数名（`ERR_LOCATION_TOO_LONG`。旧仕様は「居住地は100文字以内で入力してください」という異なる文言を想定していた）を実装済みの実際の値に合わせて修正した。旧仕様にあった「年範囲エラー」「月範囲エラー」の行は、盆栽歴が自由入力でなくなったことで実質到達しなくなったため削除した（`hooks/use-profile-edit.ts` にバリデーション関数自体は残っているが、UI から `onBlur` が発火しない。§7.4 参照）。

---

## 12. アクセシビリティ

| 要素 | 仕様 |
|------|------|
| 必須フィールドのラベル | 「ニックネーム（必須）」を `accessibilityLabel` に含める |
| 文字数カウンタ | `accessibilityLabel="{N}文字 / {上限}文字入力済み"` |
| アバター画像ピッカー | `accessibilityRole="imagebutton"` / `accessibilityLabel="プロフィール写真を変更。現在{設定状態}"` |
| ヘッダー画像ピッカー | `accessibilityRole="imagebutton"` / `accessibilityLabel="ヘッダー画像を変更。現在{設定状態}"` |
| 居住地トリガー | `accessibilityRole="button"` / `accessibilityLabel="居住地（任意）：{選択値 または 「居住地を選択」}"` |
| 居住地モーダル各行 | `accessibilityRole="radio"` / `accessibilityState: { selected }` |
| 盆栽歴 年/月トリガー | `accessibilityRole="button"` / `accessibilityLabel="開始年（任意）：{値}年" または "開始年（任意）：年を選択"`（月も同型）|
| 誕生日フィールド | `accessibilityRole="button"` / `accessibilityLabel="誕生日（任意）：{選択済み日付 または 「誕生日を選択」}"` |
| 誕生日削除ボタン | `accessibilityLabel="誕生日を削除"` / タップターゲット 44pt |
| 公開設定トグル | `accessibilityRole="switch"` / `accessibilityState: { checked }` |
| フォームエラーバナー | `accessibilityRole="alert"` / `accessibilityLiveRegion="assertive"` |
| インラインエラー（フィールド直下）| `accessibilityRole="alert"` |
| 「保存する」ボタン | `accessibilityState: { disabled }` |

---

## 13. 既存との一貫性メモ

| 既存要素 | 本仕様での扱い |
|---------|-------------|
| `auth-forms.md` §0.2（AuthTextField）| NicknameField に流用する（ラベル + フィールド + エラーの構造）|
| `auth-forms.md` §0.3（FormErrorMessage）| フォーム全体エラーバナーとして同仕様を流用する |
| `auth-forms.md` §0.7（KeyboardAvoidingView）| 入力フォームの KeyboardAvoidingView 設定を踏襲する |
| `post-card.md` §5.1（Avatar）| アバター画像の円形表示・フォールバック仕様（イニシャル表示）を踏襲する |
| `post-composer.md` §8（画像選択）| 画像添付の ActionSheet / 写真権限エラーの処理フローを踏襲する |
| `bonsai.md` §4.3（`DatePickerField`）| 誕生日（`BirthdayField`）はこの共通コンポーネントを内部でラップして使う。取得日・記録日と実装が同一 |
| `bonsai.md` §4.4（`TreeSpeciesField`）/ `events.md`（`EventPrefecturePickerModal`）| 居住地（`LocationField`）は「トリガー→モーダルの単一選択（グループ付き）」という同じ UI パターンを踏襲する |
| `ugc-safety.md` §3.4（ブロック後プロフィール）| プロフィール画面（`navigation-structure.md` §4.2）の編集ボタンが本画面への入口となる |
| `common-states.md`（ScreenLoading / ScreenError / OfflineBanner）| 初期値取得失敗 / ローディング / オフライン時に既存コンポーネントを再利用する |

---

## 14. 未確定事項・要判断

| 項目 | 内容 | 判断者 | 状態 |
|------|------|--------|------|
| PATCH エンドポイントの差分更新方式 | 部分更新か全件置き換えかを確認する | core | **解決済み（2026-07-13）**: 部分更新（`buildUpdateRequest` が差分のみ送信）|
| 各フィールドの最大文字数の正本 | bio・location 等がサーバー実装と一致しているか確認する | core | **解決済み（2026-07-13）**: bio=200 / location=100（`lib/constants/limits/auth.ts` で確認済み）。第2回改訂で Web 側 `Bon_Log_cfw/lib/constants/limits/post.ts` の `MAX_BIO_LENGTH = 200` とも再照合し、相違なしを確認 |
| 最小年齢制限 | 誕生日選択可能な最小年齢（13歳相当）の有無 | core / PM | **解決済み（2026-07-13）**: なし。§7.5 参照 |
| bonsaiStartMonth フィールドの存在 | サーバーの DB スキーマに `bonsaiStartMonth`（月）が存在するか確認する | core | **解決済み（2026-07-13）**: 存在する（`BonsaiHistoryField` で使用）|
| 誕生日の公開設定 | 誕生日を他ユーザーに公開するか非公開か、プロフィール表示での扱いはサーバー側ポリシーを確認する | core / PM | 未解決 |
| 画像のクロップ UI | アバター・ヘッダー選択後に手動クロップ（ピンチズーム等）を挟むか否か | PM | 未解決（§6 は本改訂の対象外）|
| 盆栽歴フィールドの iOS UX | 年・月それぞれのモーダル選択という現在の実装で iOS 上も統一されているため、旧仕様が懸念していた「テキスト入力 vs ピッカー」の論点は解消済み | frontend | **解決済み（2026-07-13）** |
| ユーザー識別子（@handle）の編集 | 変更可能か否か。変更可能な場合は別フィールドとして追加が必要 | core / PM | 未解決 |
| bio 文字数警告色の実装不備 | **解決済み（2026-07-13 第2回改訂）**: Web (`ProfileEditForm.tsx`) には動的カウンタ・警告色のいずれも存在しないことを確認した。Web 準拠のため Native も「残り文字数接近時の警告色」は採用しないことで確定。カウンタは `colorTextSecondary` 固定・上限超過時のみ `colorError` の 2 状態とする。frontend 実装仕様は §7.2 参照 | frontend | 解決済み（2026-07-13） |
