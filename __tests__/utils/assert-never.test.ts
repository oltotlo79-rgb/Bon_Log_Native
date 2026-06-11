import { assertNever } from '@/lib/utils/assert-never';

type Direction = 'north' | 'south' | 'east' | 'west';

function describeDirection(dir: Direction): string {
  switch (dir) {
    case 'north':
      return '北';
    case 'south':
      return '南';
    case 'east':
      return '東';
    case 'west':
      return '西';
    default:
      return assertNever(dir);
  }
}

describe('assertNever', () => {
  it('全ての Direction を網羅できる', () => {
    expect(describeDirection('north')).toBe('北');
    expect(describeDirection('south')).toBe('南');
    expect(describeDirection('east')).toBe('東');
    expect(describeDirection('west')).toBe('西');
  });

  it('未知の値が渡されると Error を throw する', () => {
    expect(() => assertNever('unknown' as never)).toThrow('Unexpected value');
  });
});
