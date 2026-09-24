import { describe, expect, it } from 'vitest';

import { type BlockInfo, getSelectingBlockPaths } from '../utils';

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

  it('selects blocks in both columns when the drag spans them', () => {
    expect(
      getSelectingBlockPaths(blocks, {
        left: -1,
        top: 195,
        width: 302,
        height: 50,
      })
    ).toEqual(['first-target', 'second-target']);
  });

  it('selects both side-by-side blocks for a thin drag across one row', () => {
    expect(
      getSelectingBlockPaths(blocks, {
        left: 50,
        top: 220,
        width: 200,
        height: 10,
      })
    ).toEqual(['first-target', 'second-target']);
  });
});
