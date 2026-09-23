import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { css } from 'lit';

import {
  ADD_BLOCK_WIDGET_WIDTH,
  DRAG_HANDLE_CONTAINER_WIDTH,
} from './config.js';

export const styles = css`
  .affine-drag-handle-widget {
    display: flex;
    position: absolute;
    left: 0;
    top: 0;
    contain: size layout;
    pointer-events: none;
  }

  .affine-drag-handle-widget.menu-open {
    contain: none;
  }

  .affine-add-block-widget-container {
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    width: ${ADD_BLOCK_WIDGET_WIDTH + 6}px;
    min-height: 12px;
    pointer-events: none;
    user-select: none;
    box-sizing: border-box;
  }

  .affine-drag-handle-container {
    top: 0;
    left: 0;
    position: absolute;
    display: flex;
    justify-content: center;
    width: ${DRAG_HANDLE_CONTAINER_WIDTH}px;
    min-height: 12px;
    pointer-events: auto;
    user-select: none;
    box-sizing: border-box;
    border-radius: 6px;
  }
  .affine-drag-handle-container:hover {
    cursor: grab;
    background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
  }
  .affine-drag-handle-container:active {
    cursor: grabbing;
  }

  .affine-drag-handle-grabber {
    width: 4px;
    height: 100%;
    border-radius: 1px;
    background: var(--affine-placeholder-color);
    transition: width 0.25s ease;
  }

  .affine-drag-handle-grabber.dots {
    width: 28px;
    height: 28px;
    box-sizing: border-box;
    padding: 0;
    border-radius: 6px;
    display: grid;
    grid-template-columns: repeat(2, 3px);
    grid-template-rows: repeat(3, 3px);
    place-content: center;
    gap: 3px 5px;
    background-color: transparent;
    transition: unset;
  }

  .affine-drag-handle-grabber.dots.gfx-dots {
    width: 14px;
    height: 26px;
    padding: 0;
    gap: 2px 3px;
    border-radius: 4px;
    transform: translateX(-100%);
  }

  .affine-drag-handle-grabber.dots:hover {
    background-color: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
  }

  .affine-drag-handle-grabber.dots > .dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background-color: ${unsafeCSSVarV2('icon/secondary')};
  }

  .block-actions-menu {
    position: fixed;
    z-index: 10000;
    width: 252px;
    max-height: min(460px, calc(100vh - 24px));
    overflow: auto;
    padding: 6px;
    border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    border-radius: 8px;
    background: ${unsafeCSSVarV2('layer/background/primary')};
    box-shadow: 0 8px 24px rgb(0 0 0 / 24%);
    pointer-events: auto;
    box-sizing: border-box;
  }

  .block-actions-search-row {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }

  .block-actions-search {
    min-width: 0;
    width: 100%;
    height: 34px;
    padding: 0 10px;
    border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    border-radius: 7px;
    outline: none;
    color: ${unsafeCSSVarV2('text/primary')};
    background: ${unsafeCSSVarV2('layer/background/secondary')};
    font: inherit;
    font-size: 14px;
  }

  .block-actions-search:focus {
    border-color: ${unsafeCSSVarV2('button/primary')};
    box-shadow: 0 0 0 2px rgb(35 131 226 / 24%);
  }

  .block-actions-back {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border: 0;
    border-radius: 7px;
    color: ${unsafeCSSVarV2('text/primary')};
    background: transparent;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
  }

  .block-actions-section-label {
    padding: 7px 8px 4px;
    color: ${unsafeCSSVarV2('text/secondary')};
    font-size: 11px;
    font-weight: 600;
  }

  .block-action,
  .block-color-action {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    min-height: 34px;
    padding: 6px 8px;
    border: 0;
    border-radius: 7px;
    color: ${unsafeCSSVarV2('text/primary')};
    background: transparent;
    font: inherit;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }

  .block-action:hover,
  .block-action:focus-visible,
  .block-color-action:hover,
  .block-color-action:focus-visible,
  .block-actions-back:hover,
  .block-actions-back:focus-visible {
    outline: none;
    background: ${unsafeCSSVarV2('layer/background/hoverOverlay')};
  }

  .block-action-icon,
  .block-action-symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    color: ${unsafeCSSVarV2('icon/primary')};
    font-size: 18px;
  }

  .block-action-icon svg {
    width: 18px;
    height: 18px;
  }

  .block-action .chevron {
    margin-left: auto;
    color: ${unsafeCSSVarV2('icon/secondary')};
    font-size: 19px;
  }

  .block-action.danger {
    color: ${unsafeCSSVarV2('status/error')};
  }

  .block-actions-divider {
    height: 1px;
    margin: 4px;
    background: ${unsafeCSSVarV2('layer/insideBorder/border')};
  }

  .block-color-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
  }

  .block-color-swatch {
    width: 18px;
    height: 18px;
    flex: 0 0 18px;
    border: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    border-radius: 50%;
    background: var(--swatch-color, currentColor);
  }

  .block-actions-hint {
    margin: 5px 4px 0;
    padding: 6px 4px 1px;
    border-top: 1px solid ${unsafeCSSVarV2('layer/insideBorder/border')};
    color: ${unsafeCSSVarV2('text/secondary')};
    font-size: 10px;
  }

  @media print {
    .affine-drag-handle-widget {
      display: none;
    }
  }
  .affine-drag-hover-rect {
    position: absolute;
    top: 0;
    left: 0;
    border-radius: 6px;
    background: var(--affine-hover-color);
    pointer-events: none;
    z-index: 2;
    animation: expand 0.25s forwards;
  }
  @keyframes expand {
    0% {
      width: 0;
      height: 0;
    }
  }
`;
