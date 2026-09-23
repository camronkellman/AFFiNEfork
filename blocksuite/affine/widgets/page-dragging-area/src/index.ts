import type { RootBlockModel } from '@blocksuite/affine-model';
import { ViewportElementProvider } from '@blocksuite/affine-shared/services';
import {
  autoScroll,
  getScrollContainer,
} from '@blocksuite/affine-shared/utils';
import {
  BlockComponent,
  BlockSelection,
  type PointerEventState,
  WidgetComponent,
  WidgetViewExtension,
} from '@blocksuite/std';
import { literal, unsafeStatic } from 'lit/static-html.js';

import {
  type BlockInfo,
  getSelectingBlockPaths,
  isDragArea,
  isGutterDrag,
  type Rect,
} from './utils';

export const AFFINE_PAGE_DRAGGING_AREA_WIDGET =
  'affine-page-dragging-area-widget';

export class AffinePageDraggingAreaWidget extends WidgetComponent<RootBlockModel> {
  static excludeFlavours: string[] = ['affine:note', 'affine:surface'];

  private _dragging = false;

  private _initialPointer = { x: 0, y: 0 };

  private _initialScrollOffset = { left: 0, top: 0 };

  private _lastPointerState: PointerEventState | null = null;

  private _rafID = 0;

  private _gutterDrag = false;

  private _selectedBlockIds: string | null = null;

  private readonly _preventNativeSelection = (event: Event) => {
    event.preventDefault();
  };

  private readonly _updateDraggingArea = (
    state: PointerEventState,
    shouldAutoScroll: boolean
  ) => {
    if (!this._viewport) {
      return;
    }
    const { clientX, clientY } = state.raw;
    const scrollLeft = this.scrollContainer?.scrollLeft ?? 0;
    const scrollTop = this.scrollContainer?.scrollTop ?? 0;
    const anchorX =
      this._initialPointer.x + this._initialScrollOffset.left - scrollLeft;
    const anchorY =
      this._initialPointer.y + this._initialScrollOffset.top - scrollTop;
    const blocks = this._allBlocksWithRect;
    // Dragging in the left gutter selects complete block rows, as in the
    // reference editor. Elsewhere, retain spatial selection for columns.
    const left = this._gutterDrag
      ? Math.min(...blocks.map(block => block.rect.left)) - 1
      : Math.min(anchorX, clientX);
    const right = this._gutterDrag
      ? Math.max(...blocks.map(block => block.rect.left + block.rect.width)) + 1
      : Math.max(anchorX, clientX);
    const top = Math.min(anchorY, clientY);
    const bottom = Math.max(anchorY, clientY);

    const userRect = {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
    this._selectBlocksByRect(userRect, blocks);
    this._lastPointerState = state;

    if (shouldAutoScroll && this.scrollContainer) {
      const rect = this.scrollContainer.getBoundingClientRect();
      const result = autoScroll(this.scrollContainer, state.raw.y - rect.top);
      if (!result) {
        this._clearRaf();
        return;
      }
    }
  };

  private get _allBlocksWithRect(): BlockInfo[] {
    if (!this._viewport) {
      return [];
    }
    const getAllNodeFromTree = (): BlockComponent[] => {
      const blocks: BlockComponent[] = [];
      this.host.view.walkThrough(node => {
        const view = node;
        if (!(view instanceof BlockComponent)) {
          return true;
        }
        if (
          view.model.role !== 'root' &&
          !AffinePageDraggingAreaWidget.excludeFlavours.includes(
            view.model.flavour
          ) &&
          // The columns are layout wrappers; their children are the selectable
          // blocks. Including both makes the wrapper swallow its children.
          !(
            (view.model.flavour === 'affine:columns' ||
              view.model.flavour === 'affine:column') &&
            view.model.children.length > 0
          )
        ) {
          blocks.push(view);
        }
        return;
      });
      return blocks;
    };

    const elements = getAllNodeFromTree();

    return elements.map(element => {
      const bounding = element.getBoundingClientRect();
      return {
        element,
        rect: {
          left: bounding.left,
          top: bounding.top,
          width: bounding.width,
          height: bounding.height,
        },
      };
    });
  }

  private get _viewport() {
    return this.std.get(ViewportElementProvider).viewport;
  }

  private get scrollContainer() {
    if (!this.block) {
      return null;
    }
    return getScrollContainer(this.block);
  }

  private _clearRaf() {
    if (this._rafID) {
      cancelAnimationFrame(this._rafID);
      this._rafID = 0;
    }
  }

  private _finishDrag() {
    this._clearRaf();
    this._dragging = false;
    document.removeEventListener(
      'selectstart',
      this._preventNativeSelection,
      true
    );
    this._gutterDrag = false;
    this._selectedBlockIds = null;
    this._initialPointer = { x: 0, y: 0 };
    this._initialScrollOffset = { left: 0, top: 0 };
    this._lastPointerState = null;
  }

  private _selectBlocksByRect(userRect: Rect, blocks: BlockInfo[]) {
    const blockPaths = getSelectingBlockPaths(blocks, userRect);
    const ids = blockPaths.join(',');
    if (ids === this._selectedBlockIds) return;
    this._selectedBlockIds = ids;
    const selections = blockPaths.map(blockPath => {
      return this.host.selection.create(BlockSelection, {
        blockId: blockPath,
      });
    });

    this.host.selection.setGroup('note', selections);
  }

  override connectedCallback() {
    super.connectedCallback();

    this.handleEvent(
      'dragStart',
      ctx => {
        const state = ctx.get('pointerState');
        const { button } = state.raw;
        if (button !== 0) return;
        if (!isDragArea(state)) return;
        if (!this._viewport) return;

        this._dragging = true;
        document.addEventListener(
          'selectstart',
          this._preventNativeSelection,
          true
        );
        window.getSelection()?.removeAllRanges();
        this._initialPointer = {
          x: state.raw.clientX,
          y: state.raw.clientY,
        };
        this._initialScrollOffset = {
          left: this.scrollContainer?.scrollLeft ?? 0,
          top: this.scrollContainer?.scrollTop ?? 0,
        };
        this._gutterDrag = isGutterDrag(
          this._allBlocksWithRect,
          state.raw.clientX,
          state.raw.clientY
        );

        return true;
      },
      { global: true }
    );

    this.handleEvent(
      'dragMove',
      ctx => {
        this._clearRaf();
        if (!this._dragging) {
          return;
        }

        const state = ctx.get('pointerState');
        // TODO(@L-Sun) support drag area for touch device
        if (state.raw.pointerType === 'touch') return;

        ctx.get('defaultState').event.preventDefault();
        window.getSelection()?.removeAllRanges();

        this._rafID = requestAnimationFrame(() => {
          this._updateDraggingArea(state, true);
        });

        return true;
      },
      { global: true }
    );

    this.handleEvent(
      'dragEnd',
      () => {
        this._finishDrag();
      },
      {
        global: true,
      }
    );

    this.handleEvent(
      'pointerMove',
      ctx => {
        if (this._dragging) {
          const state = ctx.get('pointerState');
          state.raw.preventDefault();
        }
      },
      {
        global: true,
      }
    );

    this._disposables.addFromEvent(document, 'pointercancel', () => {
      if (this._dragging) this._finishDrag();
    });
    this._disposables.addFromEvent(window, 'blur', () => {
      if (this._dragging) this._finishDrag();
    });
  }

  override disconnectedCallback() {
    this._finishDrag();
    this._disposables.dispose();
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this._disposables.addFromEvent(this.scrollContainer, 'scroll', () => {
      if (!this._dragging || !this._lastPointerState) return;

      const state = this._lastPointerState;
      this._rafID = requestAnimationFrame(() => {
        this._updateDraggingArea(state, false);
      });
    });
  }
}

export const pageDraggingAreaWidget = WidgetViewExtension(
  'affine:page',
  AFFINE_PAGE_DRAGGING_AREA_WIDGET,
  literal`${unsafeStatic(AFFINE_PAGE_DRAGGING_AREA_WIDGET)}`
);

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_PAGE_DRAGGING_AREA_WIDGET]: AffinePageDraggingAreaWidget;
  }
}
