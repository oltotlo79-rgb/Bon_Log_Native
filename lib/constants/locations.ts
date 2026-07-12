/**
 * @module lib/constants/locations
 * 居住地域の選択肢定義（プロフィール編集フォームの統制入力用）。
 * cfw 出典: lib/constants/locations.ts の LOCATION_GROUPS / ALL_LOCATIONS を値レベルで完全ミラーする
 * （components/user/ProfileEditForm.tsx の <select> グループ構成と一致させる）。
 * 47都道府県の並び順は cfw の LOCATION_GROUPS 内の元データ（地方ブロックごとのまとまり）を維持しており、
 * lib/constants/prefectures.ts の PREFECTURES（都道府県コード順）とは順序が異なる。
 */

export type LocationOption = {
  readonly value: string;
  readonly label: string;
};

export type LocationGroup = {
  readonly label: string;
  readonly options: readonly LocationOption[];
};

export const LOCATION_GROUPS: readonly LocationGroup[] = [
  {
    label: '日本の地方',
    options: [
      { value: '北海道', label: '北海道' },
      { value: '東北', label: '東北' },
      { value: '関東', label: '関東' },
      { value: '北陸', label: '北陸' },
      { value: '甲信越', label: '甲信越' },
      { value: '東海', label: '東海' },
      { value: '近畿', label: '近畿' },
      { value: '中国地方', label: '中国地方' },
      { value: '四国', label: '四国' },
      { value: '九州', label: '九州' },
      { value: '沖縄', label: '沖縄' },
    ],
  },
  {
    label: '都道府県',
    options: [
      { value: '北海道', label: '北海道' },
      { value: '青森県', label: '青森県' },
      { value: '岩手県', label: '岩手県' },
      { value: '宮城県', label: '宮城県' },
      { value: '秋田県', label: '秋田県' },
      { value: '山形県', label: '山形県' },
      { value: '福島県', label: '福島県' },
      { value: '茨城県', label: '茨城県' },
      { value: '栃木県', label: '栃木県' },
      { value: '群馬県', label: '群馬県' },
      { value: '埼玉県', label: '埼玉県' },
      { value: '千葉県', label: '千葉県' },
      { value: '東京都', label: '東京都' },
      { value: '神奈川県', label: '神奈川県' },
      { value: '新潟県', label: '新潟県' },
      { value: '山梨県', label: '山梨県' },
      { value: '長野県', label: '長野県' },
      { value: '富山県', label: '富山県' },
      { value: '石川県', label: '石川県' },
      { value: '福井県', label: '福井県' },
      { value: '岐阜県', label: '岐阜県' },
      { value: '静岡県', label: '静岡県' },
      { value: '愛知県', label: '愛知県' },
      { value: '三重県', label: '三重県' },
      { value: '滋賀県', label: '滋賀県' },
      { value: '京都府', label: '京都府' },
      { value: '大阪府', label: '大阪府' },
      { value: '兵庫県', label: '兵庫県' },
      { value: '奈良県', label: '奈良県' },
      { value: '和歌山県', label: '和歌山県' },
      { value: '鳥取県', label: '鳥取県' },
      { value: '島根県', label: '島根県' },
      { value: '岡山県', label: '岡山県' },
      { value: '広島県', label: '広島県' },
      { value: '山口県', label: '山口県' },
      { value: '徳島県', label: '徳島県' },
      { value: '香川県', label: '香川県' },
      { value: '愛媛県', label: '愛媛県' },
      { value: '高知県', label: '高知県' },
      { value: '福岡県', label: '福岡県' },
      { value: '佐賀県', label: '佐賀県' },
      { value: '長崎県', label: '長崎県' },
      { value: '熊本県', label: '熊本県' },
      { value: '大分県', label: '大分県' },
      { value: '宮崎県', label: '宮崎県' },
      { value: '鹿児島県', label: '鹿児島県' },
      { value: '沖縄県', label: '沖縄県' },
    ],
  },
  {
    label: '国・地域',
    options: [
      { value: '日本', label: '日本' },
      { value: '台湾', label: '台湾' },
      { value: '韓国', label: '韓国' },
      { value: '中国', label: '中国' },
      { value: '香港', label: '香港' },
      { value: 'シンガポール', label: 'シンガポール' },
      { value: 'タイ', label: 'タイ' },
      { value: 'ベトナム', label: 'ベトナム' },
      { value: 'インドネシア', label: 'インドネシア' },
      { value: 'フィリピン', label: 'フィリピン' },
      { value: 'マレーシア', label: 'マレーシア' },
      { value: 'インド', label: 'インド' },
      { value: 'オーストラリア', label: 'オーストラリア' },
      { value: 'ニュージーランド', label: 'ニュージーランド' },
      { value: 'アメリカ', label: 'アメリカ' },
      { value: 'カナダ', label: 'カナダ' },
      { value: 'メキシコ', label: 'メキシコ' },
      { value: 'ブラジル', label: 'ブラジル' },
      { value: 'イギリス', label: 'イギリス' },
      { value: 'フランス', label: 'フランス' },
      { value: 'ドイツ', label: 'ドイツ' },
      { value: 'イタリア', label: 'イタリア' },
      { value: 'スペイン', label: 'スペイン' },
      { value: 'オランダ', label: 'オランダ' },
      { value: 'ベルギー', label: 'ベルギー' },
      { value: 'スイス', label: 'スイス' },
    ],
  },
  {
    label: '大陸・地域',
    options: [
      { value: 'アジア', label: 'アジア' },
      { value: '東南アジア', label: '東南アジア' },
      { value: 'ヨーロッパ', label: 'ヨーロッパ' },
      { value: '北アメリカ', label: '北アメリカ' },
      { value: '南アメリカ', label: '南アメリカ' },
      { value: 'オセアニア', label: 'オセアニア' },
      { value: 'アフリカ', label: 'アフリカ' },
      { value: '中東', label: '中東' },
    ],
  },
  {
    label: 'その他',
    options: [
      { value: '海外', label: '海外' },
      { value: '非公開', label: '非公開' },
    ],
  },
] as const;

/** LOCATION_GROUPS を1次元配列に展開した全地域オプション。バリデーション・検索用。 */
export const ALL_LOCATIONS: readonly LocationOption[] = LOCATION_GROUPS.flatMap(
  (group) => group.options
);
