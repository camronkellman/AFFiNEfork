import { PlusIcon } from '@blocksuite/icons/lit';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { AFFINE_ADD_BLOCK_WIDGET } from '../consts.js';

export class AffineAddBlockWidget extends LitElement {
  static override styles = css`
    :host {
      display: block;
      pointer-events: none;
    }

    .affine-add-block-widget {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-top: 2px;
      cursor: pointer;
      border-radius: 4px;
      color: var(
        --affine-text-secondary-color,
        var(--affine-placeholder-color)
      );
      background: color-mix(
        in srgb,
        var(--affine-hover-color) 55%,
        transparent
      );
      border: none;
      padding: 0;
      transition:
        color 0.2s ease,
        background 0.2s ease;
      pointer-events: auto;
      user-select: none;
      box-sizing: border-box;
    }

    .affine-add-block-widget:hover {
      background: var(--affine-hover-color);
      color: var(--affine-text-primary-color);
    }

    .affine-add-block-widget svg {
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }
  `;

  @property({ type: Boolean })
  accessor visible = false;

  private readonly _handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    this.dispatchEvent(
      new CustomEvent('add-block', { bubbles: true, composed: true })
    );
  };

  override render() {
    if (!this.visible) return html``;

    return html`
      <button
        class="affine-add-block-widget"
        title="Click to add a block below"
        aria-label="Add block below"
        @click=${this._handleClick}
      >
        ${PlusIcon({ width: '14', height: '14' })}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_ADD_BLOCK_WIDGET]: AffineAddBlockWidget;
  }
}
