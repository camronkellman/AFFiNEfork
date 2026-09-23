import { describe, expect, it } from 'vitest';

import { type BlockInfo, getSelectingBlockPaths, isGutterDrag } from '../utils';

const block = (id: string, left: number, top: number): BlockInfo =>
  ({
    element: {
      blockId: id,
      model: { id, children: [] },
      childElementCount: 0,
      store: { getParent: () => ({ id: 'column-parent' }) },
    },
    rect: { left, top, width: 100, height: 30 },
  }) as unknown as BlockInfo;

describe('page drag selection across columns', () => {
  const blocks = [
    block('first-top', 0, 100),
    block('first-target', 0, 215),
    block('first-bottom', 0, 500),
    block('second-top', 200, 100),
    block('second-target', 200, 210),
  ];

  it('selects a later column even after an earlier column extends below the drag', () => {
    expect(
      getSelectingBlockPaths(blocks, {
        left: 190,
        top: 195,
        width: 120,
        height: 50,
      })
    ).toEqual(['second-target']);
  });

  it('selects complete rows across both columns for a gutter drag', () => {
    expect(isGutterDrag(blocks, -20, 215)).toBe(true);
    expect(
      getSelectingBlockPaths(blocks, {
        left: -1,
        top: 195,
        width: 302,
        height: 50,
      })
    ).toEqual(['first-target', 'second-target']);
  });

  it('keeps a drag started inside a column spatial', () => {
    expect(isGutterDrag(blocks, 210, 215)).toBe(false);
  });
});
