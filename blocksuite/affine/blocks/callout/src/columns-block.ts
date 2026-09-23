import type {
  ColumnBlockModel,
  ColumnsBlockModel,
} from '@blocksuite/affine-model';
import { focusTextModel } from '@blocksuite/affine-rich-text';
import { BlockComponent } from '@blocksuite/std';
import { css, html } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

const MIN_COLUMN_WIDTH = 12;

export class ColumnsBlockComponent extends BlockComponent<ColumnsBlockModel> {
  static override styles = css`
    :host { display: block; margin: 12px 0; }
    .columns { position: relative; display: grid; gap: 18px; align-items: start; }
    .column-handle { position: absolute; top: 0; bottom: 0; width: 12px; margin-left: -6px; z-index: 2; cursor: col-resize; touch-action: none; }
    .column-handle::after { content: ''; display: block; width: 2px; height: 100%; margin: 0 auto; background: transparent; border-radius: 2px; }
    .column-handle:hover::after, .column-handle:active::after { background: var(--affine-primary-color, #2b8cff); }
    @media (max-width: 700px) {
      .columns { grid-template-columns: minmax(0, 1fr) !important; }
      .column-handle { display: none; }
    }
  `;

  private _resize(event: PointerEvent, index: number) {
    if (this.store.readonly) return;
    event.preventDefault();
    event.stopPropagation();
    const handle = event.currentTarget as HTMLElement;
    const container = this.renderRoot.querySelector<HTMLElement>('.columns');
    if (!container) return;
    const startX = event.clientX;
    const widths = this._widths();
    const available = container.clientWidth - (widths.length - 1) * 18;
    if (available <= 0) return;
    handle.setPointerCapture(event.pointerId);
    const move = (moveEvent: PointerEvent) => {
      const delta = ((moveEvent.clientX - startX) / available) * 100;
      const bounded = Math.max(
        MIN_COLUMN_WIDTH - widths[index],
        Math.min(widths[index + 1] - MIN_COLUMN_WIDTH, delta)
      );
      const next = [...widths];
      next[index] = widths[index] + bounded;
      next[index + 1] = widths[index + 1] - bounded;
      this.model.props.widths$.value = next;
    };
    const stop = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }

  private _resizeWithKeyboard(event: KeyboardEvent, index: number) {
    if (this.store.readonly || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const widths = this._widths();
    const delta = event.key === 'ArrowRight' ? 2 : -2;
    const bounded = Math.max(
      MIN_COLUMN_WIDTH - widths[index],
      Math.min(widths[index + 1] - MIN_COLUMN_WIDTH, delta)
    );
    const next = [...widths];
    next[index] += bounded;
    next[index + 1] -= bounded;
    this.model.props.widths$.value = next;
  }

  private _widths() {
    const count = this.model.children.length;
    const saved = this.model.props.widths$.value;
    if (saved.length === count && saved.every(width => width >= MIN_COLUMN_WIDTH)) {
      return saved;
    }
    return Array.from({ length: count }, () => 100 / count);
  }

  override renderBlock() {
    const widths = this._widths();
    const stops = widths.slice(0, -1).map((_, index) =>
      widths.slice(0, index + 1).reduce((sum, width) => sum + width, 0)
    );
    return html`
      <div class="columns affine-block-children-container"
        style=${styleMap({ gridTemplateColumns: widths.map(width => `${width}fr`).join(' ') })}>
        ${this.renderChildren(this.model)}
        ${repeat(stops, (_, index) => index, (stop, index) => html`
          <div class="column-handle" contenteditable="false" role="separator"
            aria-label="Resize columns"
            aria-orientation="vertical" tabindex="0"
            style=${styleMap({ left: `calc(${stop}% + ${index * 18 + 9 - (stop / 100) * (widths.length - 1) * 18}px)` })}
            @pointerdown=${(event: PointerEvent) => this._resize(event, index)}
            @keydown=${(event: KeyboardEvent) => this._resizeWithKeyboard(event, index)}></div>
        `)}
      </div>
    `;
  }
}

export class ColumnBlockComponent extends BlockComponent<ColumnBlockModel> {
  static override styles = css`
    :host { display: block; min-width: 0; }
    .column { min-height: 42px; min-width: 0; padding: 2px 0; }
    .empty { color: var(--affine-text-secondary-color, #888); opacity: 0; cursor: text; }
    :host(:hover) .empty { opacity: .75; }
  `;

  private _addFirstBlock(event: MouseEvent) {
    if (this.store.readonly || this.model.children.length) return;
    event.stopPropagation();
    const id = this.store.addBlock('affine:paragraph', {}, this.model);
    focusTextModel(this.std, id);
  }

  override renderBlock() {
    return html`<div class="column affine-block-children-container"
      @click=${(event: MouseEvent) => this._addFirstBlock(event)}>
      ${this.model.children.length
        ? this.renderChildren(this.model)
        : html`<span class="empty">Click to add a block</span>`}
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-columns': ColumnsBlockComponent;
    'affine-column': ColumnBlockComponent;
  }
}
