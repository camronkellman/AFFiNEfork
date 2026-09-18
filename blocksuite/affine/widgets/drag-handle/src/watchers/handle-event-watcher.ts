import type { AffineDragHandleWidget } from '../drag-handle.js';

export class HandleEventWatcher {
  private readonly _onDragHandlePointerDown = () => {
    if (!this.widget.isBlockDragHandleVisible || !this.widget.anchorBlockId)
      return;

    this.widget.dragHoverRect = this.widget.draggingAreaRect.value;
  };

  private readonly _onDragHandlePointerEnter = () => {
    if (this.widget.isBlockDragHandleVisible && this.widget.anchorBlockId) {
      this.widget.isDragHandleHovered = true;
    } else if (this.widget.isGfxDragHandleVisible) {
      this.widget.dragHoverRect =
        this.widget.edgelessWatcher.hoveredElemAreaRect;
      this.widget.isDragHandleHovered = true;
    }
  };

  private readonly _onDragHandlePointerLeave = () => {
    this.widget.isDragHandleHovered = false;
    this.widget.dragHoverRect = null;

    if (this.widget.isGfxDragHandleVisible) return;

    if (this.widget.dragging) return;

    this.widget.pointerEventWatcher.showDragHandleOnHoverBlock();
  };

  private readonly _onDragHandlePointerUp = () => {
    if (!this.widget.isBlockDragHandleVisible) return;
    this.widget.dragHoverRect = null;
  };

  constructor(readonly widget: AffineDragHandleWidget) {}

  watch() {
    const { dragHandleContainer, disposables } = this.widget;

    // When pointer enter drag handle grabber
    // Extend drag handle grabber to the height of the hovered block
    disposables.addFromEvent(
      dragHandleContainer,
      'pointerenter',
      this._onDragHandlePointerEnter
    );

    disposables.addFromEvent(
      dragHandleContainer,
      'pointerdown',
      this._onDragHandlePointerDown
    );

    disposables.addFromEvent(
      dragHandleContainer,
      'pointerup',
      this._onDragHandlePointerUp
    );

    // When pointer leave drag handle grabber, should reset drag handle grabber style
    disposables.addFromEvent(
      dragHandleContainer,
      'pointerleave',
      this._onDragHandlePointerLeave
    );
  }
}
