/**
 * @module lib/constants/tree-species
 * マイ盆栽フォームの樹種選択肢定義（統制入力用）。
 * cfw 出典: components/bonsai/BonsaiForm.tsx の <select name="species"> に埋め込まれた
 * optgroup（松柏類・雑木類・草もの）の内容を値レベルで完全ミラーする。
 * Web 側は value と label が常に同一文字列のため、ここでは平坦な文字列配列として保持する。
 * bonsai レコードの species は自由入力欄（サーバー側 enum 制約なし）なので、この一覧は
 * クライアント側の選択候補（統制入力）を提供するものであり、他の値の入力を拒否する根拠にはしない。
 */

export type TreeSpeciesGroup = {
  readonly label: string;
  readonly options: readonly string[];
};

export const TREE_SPECIES_GROUPS: readonly TreeSpeciesGroup[] = [
  {
    label: '松柏類',
    options: [
      '黒松',
      '赤松',
      '五葉松',
      '真柏',
      '杜松',
      '檜',
      '椹',
      '檜葉/翌檜',
      '杉',
      '一位',
      'キャラボク',
      '蝦夷松',
      '落葉松',
      '米栂',
      '樅木',
      '榧',
      '槙',
      'その他松柏類',
    ],
  },
  {
    label: '雑木類',
    options: [
      '紅葉',
      '楓',
      '匂楓',
      '銀杏',
      '欅',
      '楡欅',
      '梅',
      '長寿梅/木瓜',
      '梅擬',
      '蔓梅擬/岩梅蔓',
      '縮緬蔓',
      '金豆',
      'ピラカンサ',
      '花梨',
      '台湾黄楊',
      'イボタ',
      '群雀',
      '香丁木/白丁木',
      '真弓',
      '小真弓',
      'ブナ',
      '梔子',
      'グミ',
      '桜',
      '皐月',
      '椿',
      '山茶花',
      '柿',
      '柘榴',
      '百日紅',
      '姫林檎/海棠',
      '柊',
      '針蔓柾',
      '蔦',
      'イヌビワ',
      '紫式部',
      'レンギョウ',
      'その他雑木類',
    ],
  },
  {
    label: '草もの',
    options: ['山野草', '苔'],
  },
] as const;

/** TREE_SPECIES_GROUPS を1次元配列に展開した全樹種一覧。検索・バリデーション用。 */
export const ALL_TREE_SPECIES: readonly string[] = TREE_SPECIES_GROUPS.flatMap(
  (group) => group.options
);
