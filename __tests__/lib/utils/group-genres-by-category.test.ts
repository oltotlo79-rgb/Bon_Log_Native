/**
 * @module __tests__/lib/utils/group-genres-by-category
 * groupGenresByCategory のユニットテスト。
 * GENRE_CATEGORY_ORDER 準拠の並び・未知カテゴリの末尾追加・空入力を検証する。
 */

import { groupGenresByCategory, type CategorizedGenre } from '@/lib/utils/group-genres-by-category';
import { GENRE_CATEGORY_ORDER } from '@/lib/constants/limits/post';

describe('groupGenresByCategory', () => {
  it('空配列を渡すと空配列が返る', () => {
    expect(groupGenresByCategory([])).toEqual([]);
  });

  it('1件のジャンルを渡すとそのカテゴリのグループ1件が返る', () => {
    const items: CategorizedGenre[] = [{ id: 'g1', name: '黒松', category: '松柏類' }];
    expect(groupGenresByCategory(items)).toEqual([{ category: '松柏類', genres: items }]);
  });

  it('同一カテゴリの複数ジャンルは1つのグループにまとまる（出現順を維持）', () => {
    const items: CategorizedGenre[] = [
      { id: 'g1', name: '黒松', category: '松柏類' },
      { id: 'g2', name: '五葉松', category: '松柏類' },
    ];
    const result = groupGenresByCategory(items);
    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe('松柏類');
    expect(result[0]?.genres.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('GENRE_CATEGORY_ORDER に準拠した順でグループが並ぶ（入力順は無視する）', () => {
    // 入力は GENRE_CATEGORY_ORDER と逆順（その他が先頭、松柏類が末尾）で与える
    const items: CategorizedGenre[] = [
      { id: 'g-sonota', name: 'その他ジャンル', category: 'その他' },
      { id: 'g-kusa', name: '苔', category: '草もの' },
      { id: 'g-matsu', name: '黒松', category: '松柏類' },
    ];
    const result = groupGenresByCategory(items);
    expect(result.map((group) => group.category)).toEqual(['松柏類', '草もの', 'その他']);
  });

  it('該当ジャンルが1件もないカテゴリのグループは生成しない', () => {
    const items: CategorizedGenre[] = [{ id: 'g1', name: '黒松', category: '松柏類' }];
    const result = groupGenresByCategory(items);
    const categories = result.map((group) => group.category);
    for (const category of GENRE_CATEGORY_ORDER) {
      if (category !== '松柏類') {
        expect(categories).not.toContain(category);
      }
    }
    expect(result).toHaveLength(1);
  });

  it('GENRE_CATEGORY_ORDER に存在しない未知カテゴリは末尾に追加される', () => {
    const items: CategorizedGenre[] = [
      { id: 'g-known', name: '黒松', category: '松柏類' },
      { id: 'g-unknown', name: '謎ジャンル', category: '未知カテゴリ' },
    ];
    const result = groupGenresByCategory(items);
    expect(result.map((group) => group.category)).toEqual(['松柏類', '未知カテゴリ']);
  });

  it('複数の未知カテゴリは出現順を維持したまま末尾に追加される', () => {
    const items: CategorizedGenre[] = [
      { id: 'g-b', name: 'ジャンルB', category: '未知B' },
      { id: 'g-a', name: 'ジャンルA', category: '未知A' },
      { id: 'g-known', name: '黒松', category: '松柏類' },
    ];
    const result = groupGenresByCategory(items);
    expect(result.map((group) => group.category)).toEqual(['松柏類', '未知B', '未知A']);
  });

  it('全カテゴリが埋まっている場合は GENRE_CATEGORY_ORDER と同じ並びになる', () => {
    const items: CategorizedGenre[] = GENRE_CATEGORY_ORDER.map((category, index) => ({
      id: `g-${index}`,
      name: `ジャンル${index}`,
      category,
    }));
    const result = groupGenresByCategory(items);
    expect(result.map((group) => group.category)).toEqual([...GENRE_CATEGORY_ORDER]);
  });

  it('各グループの genres は元アイテムの参照をそのまま保持する', () => {
    const genre: CategorizedGenre = { id: 'g1', name: '黒松', category: '松柏類' };
    const result = groupGenresByCategory([genre]);
    expect(result[0]?.genres[0]).toBe(genre);
  });
});
