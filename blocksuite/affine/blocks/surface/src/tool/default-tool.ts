import { resetNativeSelection } from '@blocksuite/affine-shared/utils';
import { DisposableGroup } from '@blocksuite/global/disposable';
import type { IVec } from '@blocksuite/global/gfx';
import type { PointerEventState } from '@blocksuite/std';
import {
  BaseTool,
  type GfxModel,
  InteractivityIdentifier,
  isGfxGroupCompatibleModel,
} from '@blocksuite/std/gfx';
import { effect } from '@preact/signals-core';

import { calPanDelta } from './panning-utils.js';

export enum DefaultModeDragType {
  /** Moving selected contents */
  ContentMoving = 'content-moving',
  /** Native range dragging inside active note block */
  NativeEditing = 'native-editing',
  /** Default void state */
  None = 'none',
  /** Expanding the dragging area, select the content covered inside */
  Selecting = 'selecting',
}

export class DefaultTool extends BaseTool {
  static override toolName: string = 'default';

  private _edgeScrollingFrame: number | null = null;

  private _edgeScrollingDelta: IVec | null = null;

  private _edgeScrollingLastTime: number | null = null;

  private _selectionFrame: number | null = null;

  private readonly _clearDisposable = () => {
    if (this._disposables) {
      this._disposables.dispose();
      this._disposables = null;
    }
  };

  private readonly _clearSelectingState = () => {
    this._stopEdgeScrolling();
    if (this._selectionFrame !== null) {
      cancelAnimationFrame(this._selectionFrame);
      this._selectionFrame = null;
    }
    this._clearDisposable();
  };

  private _disposables: DisposableGroup | null = null;

  private _scrollViewport(delta: IVec) {
    this.gfx.viewport.applyDeltaCenter(delta[0], delta[1]);
  }

  private _spaceTranslationRect: null | {
    w: number;
    h: number;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } = null;

  private readonly _enableEdgeScrolling = (delta: IVec) => {
    this._edgeScrollingDelta = delta;
    if (this._edgeScrollingFrame !== null) return;

    // Preserve the donor's 30ms pan velocity while painting at the display's
    // refresh rate. Applying the full delta every animation frame makes a 60Hz
    // display pan almost twice as far and can skip past the intended objects.
    this._scrollViewport(delta);
    this._edgeScrollingLastTime = performance.now();

    const scroll = (time: number) => {
      const currentDelta = this._edgeScrollingDelta;
      if (!currentDelta) {
        this._edgeScrollingFrame = null;
        this._edgeScrollingLastTime = null;
        return;
      }

      const elapsed = Math.min(
        50,
        time - (this._edgeScrollingLastTime ?? time)
      );
      const velocityScale = elapsed / 30;
      this._scrollViewport([
        currentDelta[0] * velocityScale,
        currentDelta[1] * velocityScale,
      ]);
      this._edgeScrollingLastTime = time;
      this._edgeScrollingFrame = requestAnimationFrame(scroll);
    };

    this._edgeScrollingFrame = requestAnimationFrame(scroll);
  };

  private readonly _stopEdgeScrolling = () => {
    this._edgeScrollingDelta = null;
    this._edgeScrollingLastTime = null;
    if (this._edgeScrollingFrame !== null) {
      cancelAnimationFrame(this._edgeScrollingFrame);
      this._edgeScrollingFrame = null;
    }
  };

  private _toBeMoved: GfxModel[] = [];

  private readonly _updateSelection = () => {
    const { gfx } = this;

    if (gfx.keyboard.spaceKey$.peek() && this._spaceTranslationRect) {
      const { w, h, startX, startY, endX, endY } = this._spaceTranslationRect;
      const { endX: lastX, endY: lastY } = this.controller.draggingArea$.peek();

      const dx = lastX - endX;
      const dy = lastY - endY;

      this.controller.draggingArea$.value = {
        x: Math.min(startX + dx, lastX),
        y: Math.min(startY + dy, lastY),
        w,
        h,
        startX: startX + dx,
        startY: startY + dy,
        endX: endX + dx,
        endY: endY + dy,
      };
    }

    const elements = this.interactivity?.handleBoxSelection({
      box: this.controller.draggingArea$.peek(),
    });

    if (!elements) return;

    this.selection.set({
      elements: elements.map(el => el.id),
      editing: false,
    });
  };

  private readonly _scheduleSelectionUpdate = () => {
    if (this._selectionFrame !== null) return;

    this._selectionFrame = requestAnimationFrame(() => {
      this._selectionFrame = null;
      if (
        this.movementDragging &&
        this.dragType === DefaultModeDragType.Selecting
      ) {
        this._updateSelection();
      }
    });
  };

  dragType = DefaultModeDragType.None;

  movementDragging = false;

  /**
   * Get the end position of the dragging area in the model coordinate
   */
  get dragLastPos() {
    const { endX, endY } = this.controller.draggingArea$.peek();

    return [endX, endY] as IVec;
  }

  /**
   * Get the start position of the dragging area in the model coordinate
   */
  get dragStartPos() {
    const { startX, startY } = this.controller.draggingArea$.peek();

    return [startX, startY] as IVec;
  }

  get selection() {
    return this.gfx.selection;
  }

  get interactivity() {
    return this.std.getOptional(InteractivityIdentifier);
  }

  private async _cloneContent() {
    const clonedResult = await this.interactivity?.requestElementClone({
      elements: this._toBeMoved,
    });

    if (!clonedResult) return;

    this._toBeMoved = clonedResult.elements;
    this.selection.set({
      elements: this._toBeMoved.map(e => e.id),
      editing: false,
    });
  }

  private _determineDragType(evt: PointerEventState): DefaultModeDragType {
    const { x, y } = this.controller.lastMousePos$.peek();
    if (this.selection.isInSelectedRect(x, y)) {
      return this.selection.editing
        ? DefaultModeDragType.NativeEditing
        : DefaultModeDragType.ContentMoving;
    } else {
      const checked = this.interactivity?.handleElementSelection(evt);

      if (checked) {
        return DefaultModeDragType.ContentMoving;
      } else {
        return DefaultModeDragType.Selecting;
      }
    }
  }

  private initializeDragState(
    dragType: DefaultModeDragType,
    event: PointerEventState
  ) {
    this.dragType = dragType;

    this._clearDisposable();
    this._disposables = new DisposableGroup();

    // If the drag type is selecting, set up the dragging area disposable group
    // If the viewport updates when dragging, should update the dragging area and selection
    if (this.dragType === DefaultModeDragType.Selecting) {
      this._disposables.add(
        this.gfx.viewport.viewportUpdated.subscribe(() => {
          if (
            this.dragType === DefaultModeDragType.Selecting &&
            this.controller.dragging$.peek()
          ) {
            this._scheduleSelectionUpdate();
          }
        })
      );
      return;
    }

    if (this.dragType === DefaultModeDragType.ContentMoving) {
      if (this.interactivity) {
        this.doc.captureSync();
        this.interactivity.handleElementMove({
          movingElements: this._toBeMoved,
          event: event.raw,
          onDragEnd: () => {
            this.doc.captureSync();
          },
        });
      }
      return;
    }
  }

  override click(e: PointerEventState) {
    if (this.doc.readonly) return;

    if (!this.interactivity?.handleElementSelection(e)) {
      this.selection.clear();
      resetNativeSelection(null);
    }

    this.interactivity?.dispatchEvent('click', e);
  }

  override deactivate() {
    this._stopEdgeScrolling();
    this._clearDisposable();
  }

  override doubleClick(e: PointerEventState) {
    if (this.doc.readonly) {
      const viewport = this.gfx.viewport;
      if (viewport.zoom === 1) {
        this.gfx.fitToScreen();
      } else {
        // Zoom to 100% and Center
        const [x, y] = viewport.toModelCoord(e.x, e.y);
        viewport.setViewport(1, [x, y], true);
      }
      return;
    }

    this.interactivity?.dispatchEvent('dblclick', e);
  }

  override dragEnd(e: PointerEventState) {
    this.interactivity?.dispatchEvent('dragend', e);

    // Always stop edge scrolling and pending selection work. In an embedded
    // editor, focus can change while a marquee crosses interactive content;
    // returning early here used to leave the edge-scroll loop running after
    // pointer-up.
    if (!this.movementDragging) {
      this._clearSelectingState();
      return;
    }

    if (this.dragType === DefaultModeDragType.Selecting) {
      if (this._selectionFrame !== null) {
        cancelAnimationFrame(this._selectionFrame);
        this._selectionFrame = null;
      }
      this._updateSelection();
    }

    this.movementDragging = false;
    this._toBeMoved = [];
    this._clearSelectingState();
    this.dragType = DefaultModeDragType.None;
  }

  override dragMove(e: PointerEventState) {
    this.interactivity?.dispatchEvent('dragmove', e);

    if (!this.movementDragging) {
      return;
    }

    const { viewport } = this.gfx;
    switch (this.dragType) {
      case DefaultModeDragType.Selecting: {
        // Record the last drag pointer position for auto panning and view port updating
        this._scheduleSelectionUpdate();
        const moveDelta = calPanDelta(viewport, e);
        if (moveDelta) {
          this._enableEdgeScrolling(moveDelta);
        } else {
          this._stopEdgeScrolling();
        }
        break;
      }
      case DefaultModeDragType.ContentMoving: {
        break;
      }
      case DefaultModeDragType.NativeEditing: {
        // TODO reset if drag out of note
        break;
      }
    }
  }

  // oxlint-disable-next-line typescript/no-misused-promises
  override async dragStart(e: PointerEventState) {
    const { preventDefaultState, handledByView } =
      this.interactivity?.dispatchEvent('dragstart', e) ?? {};

    if (this.selection.editing || preventDefaultState || handledByView) return;

    this.movementDragging = true;

    // Determine the drag type based on the current state and event
    let dragType = this._determineDragType(e);

    // Embedded content (PDFs, videos, synced docs, and other interactive
    // blocks) can otherwise take ownership of the pointer while a box
    // selection crosses it. Capture only an established marquee drag so a
    // pointer-up over embedded content still completes the selection. This
    // intentionally leaves clicks and element dragging on their native path.
    if (
      dragType === DefaultModeDragType.Selecting &&
      (
        globalThis as typeof globalThis & {
          __HALO_DOCS_COMPILED_PACKAGE__?: boolean;
        }
      ).__HALO_DOCS_COMPILED_PACKAGE__
    ) {
      const pointerTarget = this.std.host;
      if (pointerTarget.isConnected) {
        try {
          pointerTarget.setPointerCapture(e.raw.pointerId);
        } catch {
          // The browser releases pointer capture automatically if the source
          // element disappears during a drag, so failing to capture is safe.
        }
      }
    }

    const elements = this.selection.selectedElements;
    if (elements.some(e => e.isLocked())) return;

    const toBeMoved = new Set(elements);

    elements.forEach(element => {
      if (isGfxGroupCompatibleModel(element)) {
        element.descendantElements.forEach(ele => {
          toBeMoved.add(ele);
        });
      }
    });

    this._toBeMoved = Array.from(toBeMoved);

    // If alt key is pressed and content is moving, clone the content
    if (dragType === DefaultModeDragType.ContentMoving && e.keys.alt) {
      await this._cloneContent();
    }

    // Set up drag state
    this.initializeDragState(dragType, e);
  }

  override mounted() {
    this.disposable.add(
      effect(() => {
        const pressed = this.gfx.keyboard.spaceKey$.value;

        if (pressed) {
          const currentDraggingArea = this.controller.draggingArea$.peek();

          this._spaceTranslationRect = currentDraggingArea;
        } else {
          this._spaceTranslationRect = null;
        }
      })
    );
  }

  override pointerDown(e: PointerEventState): void {
    this.interactivity?.dispatchEvent('pointerdown', e);
  }

  override pointerMove(e: PointerEventState) {
    this.interactivity?.dispatchEvent('pointermove', e);
  }

  override pointerUp(e: PointerEventState) {
    this.interactivity?.dispatchEvent('pointerup', e);
  }

  override unmounted(): void {}
}
