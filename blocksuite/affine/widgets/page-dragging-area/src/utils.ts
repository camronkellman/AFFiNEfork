import {
  BLOCK_ID_ATTR,
  type BlockComponent,
  type PointerEventState,
} from '@blocksuite/std';

export type Rect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type BlockInfo = {
  element: BlockComponent;
  rect: Rect;
};

export function isGutterDrag(
  blocks: BlockInfo[],
  anchorX: number,
  anchorY: number
) {
  const leaves = blocks.filter(block => !block.element.model.children.length);
  const rowCandidates = leaves.length ? leaves : blocks;
  const distanceToRow = (block: BlockInfo) =>
    Math.max(
      block.rect.top - anchorY,
      anchorY - block.rect.top - block.rect.height,
      0
    );
  const nearestDistance = Math.min(...rowCandidates.map(distanceToRow));
  const nearestRow = rowCandidates.filter(
    block => distanceToRow(block) === nearestDistance
  );
  const rowLeft = Math.min(...nearestRow.map(block => block.rect.left));
  return nearestRow.length > 0 && anchorX < rowLeft && anchorX >= rowLeft - 180;
}

function rectIntersects(a: Rect, b: Rect) {
  return (
    a.left < b.left + b.width &&
    a.left + a.width > b.left &&
    a.top < b.top + b.height &&
    a.top + a.height > b.top
  );
}

function rectIncludesTopAndBottom(a: Rect, b: Rect) {
  return a.top <= b.top && a.top + a.height >= b.top + b.height;
}

function filterBlockInfos(blockInfos: BlockInfo[], userRect: Rect) {
  // Block tree order is not visual top-to-bottom order in a columns layout.
  // An early break after the first column skipped every later column.
  return blockInfos.filter(
    blockInfo => blockInfo.rect.top <= userRect.top + userRect.height
  );
}

function filterBlockInfosByParent(
  parentInfos: BlockInfo,
  userRect: Rect,
  filteredBlockInfos: BlockInfo[]
) {
  const targetBlock = parentInfos.element;
  let results = [parentInfos];
  if (targetBlock.childElementCount > 0) {
    const childBlockInfos = targetBlock.childBlocks
      .map(el =>
        filteredBlockInfos.find(
          blockInfo => blockInfo.element.model.id === el.model.id
        )
      )
      .filter(block => block) as BlockInfo[];
    const firstIndex = childBlockInfos.findIndex(
      bl => rectIntersects(bl.rect, userRect) && bl.rect.top < userRect.top
    );
    const lastIndex = childBlockInfos.findIndex(
      bl =>
        rectIntersects(bl.rect, userRect) &&
        bl.rect.top + bl.rect.height > userRect.top + userRect.height
    );

    if (firstIndex !== -1 && lastIndex !== -1) {
      results = childBlockInfos.slice(firstIndex, lastIndex + 1);
    }
  }

  return results;
}

export function getSelectingBlockPaths(
  blockInfos: BlockInfo[],
  userRect: Rect
) {
  const filteredBlockInfos = filterBlockInfos(blockInfos, userRect);
  const len = filteredBlockInfos.length;
  const blockPaths: string[] = [];
  let singleTargetParentBlock: BlockInfo | null = null;
  let blocks: BlockInfo[] = [];
  if (len === 0) return blockPaths;

  // To get the single target parent block info
  for (const block of filteredBlockInfos) {
    const rect = block.rect;

    if (
      rectIntersects(userRect, rect) &&
      rectIncludesTopAndBottom(rect, userRect)
    ) {
      singleTargetParentBlock = block;
    }
  }

  if (singleTargetParentBlock) {
    blocks = filterBlockInfosByParent(
      singleTargetParentBlock,
      userRect,
      filteredBlockInfos
    );
  } else {
    // If there is no block contains the top and bottom of the userRect
    // Then get all the blocks that intersect with the userRect
    for (const block of filteredBlockInfos) {
      if (rectIntersects(userRect, block.rect)) {
        blocks.push(block);
      }
    }
  }

  // Filter out the blocks which parent is in the blocks
  // oxlint-disable-next-line typescript/prefer-for-of
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const parent = blocks[i].element.store.getParent(block.element.model);
    const parentId = parent?.id;
    if (parentId) {
      const isParentInBlocks = blocks.some(
        block => block.element.model.id === parentId
      );
      if (!isParentInBlocks) {
        blockPaths.push(blocks[i].element.blockId);
      }
    }
  }

  return blockPaths;
}

export function isDragArea(e: PointerEventState) {
  const el = e.raw.target;
  if (!(el instanceof Element)) {
    return false;
  }
  if (
    el.closest('a, button, input, textarea, select, [contenteditable="true"]')
  ) {
    return false;
  }
  const block = el.closest<BlockComponent>(`[${BLOCK_ID_ATTR}]`);
  if (!block) {
    return false;
  }
  // The visible gutter belongs to the nearest block element, not always to
  // the root/note wrapper. Let any non-interactive block surface start a range
  // drag so the selection begins exactly where the pointer is pressed.
  return true;
}
