import { DefaultInlineManagerExtension } from '@blocksuite/affine-inline-preset';
import type { DetailSlotProps } from '@blocksuite/data-view';
import type {
  GallerySingleView,
  KanbanSingleView,
  TableSingleView,
} from '@blocksuite/data-view/view-presets';
import { WithDisposable } from '@blocksuite/global/lit';
import type { EditorHost } from '@blocksuite/std';
import { ShadowlessElement } from '@blocksuite/std';
import { cssVarV2 } from '@toeverything/theme/v2';
import { css, html, unsafeCSS } from 'lit';
import { property, query } from 'lit/decorators.js';

export class BlockRenderer
  extends WithDisposable(ShadowlessElement)
  implements DetailSlotProps
{
  static override styles = css`
    database-datasource-block-renderer {
      padding-top: 36px;
      padding-bottom: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 12px;
      border-bottom: 1px solid ${unsafeCSS(cssVarV2.layer.insideBorder.border)};
      font-size: var(--affine-font-base);
      line-height: var(--affine-line-height);
    }

    database-datasource-block-renderer .tips-placeholder {
      display: none;
    }

    .record-cover-shell {
      position: relative;
      width: 100%;
      height: 220px;
      overflow: hidden;
      border-radius: 8px;
      background: var(--affine-background-secondary-color);
    }

    .record-cover-shell img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .record-cover-actions {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      overflow: hidden;
      border: 1px solid var(--affine-border-color);
      border-radius: 7px;
      background: var(--affine-background-overlay-panel-color);
      box-shadow: var(--affine-shadow-2);
    }

    .record-cover-action,
    .record-add-cover {
      appearance: none;
      border: 0;
      color: var(--affine-text-primary-color);
      background: transparent;
      font: inherit;
      cursor: pointer;
    }

    .record-cover-action {
      padding: 7px 10px;
      border-right: 1px solid var(--affine-border-color);
    }

    .record-cover-action:last-child {
      border-right: 0;
    }

    .record-cover-action:hover,
    .record-add-cover:hover {
      background: var(--affine-hover-color);
    }

    .record-cover-position {
      position: absolute;
      right: 12px;
      bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border: 1px solid var(--affine-border-color);
      border-radius: 7px;
      color: var(--affine-text-primary-color);
      background: var(--affine-background-overlay-panel-color);
      font-size: 12px;
    }

    .record-add-cover {
      width: max-content;
      margin-top: 2px;
      padding: 6px 10px;
      border-radius: 6px;
      color: var(--affine-text-secondary-color);
    }

    database-datasource-block-renderer rich-text {
      font-size: 15px;
      line-height: 24px;
    }

    database-datasource-block-renderer.empty rich-text::before {
      content: 'Untitled';
      position: absolute;
      color: var(--affine-text-disable-color);
      font-size: 15px;
      line-height: 24px;
      user-select: none;
      pointer-events: none;
    }

    .database-block-detail-header-icon {
      width: 20px;
      height: 20px;
      padding: 2px;
      border-radius: 4px;
      background-color: var(--affine-background-secondary-color);
    }

    .database-block-detail-header-icon svg {
      width: 16px;
      height: 16px;
    }
  `;

  get attributeRenderer() {
    return this.inlineManager.getRenderer();
  }

  get attributesSchema() {
    return this.inlineManager.getSchema();
  }

  get inlineManager() {
    return this.host.std.get(DefaultInlineManagerExtension.identifier);
  }

  get model() {
    return this.host?.store.getBlock(this.rowId)?.model;
  }

  private repositioning = false;

  private get cover() {
    return this.model?.props['meta:cover'] as string | undefined;
  }

  private get coverPosition() {
    return (
      (this.model?.props['meta:coverPosition'] as number | undefined) ?? 50
    );
  }

  private readonly chooseCover = (event: Event) => {
    event.stopPropagation();
    this.coverInput?.click();
  };

  private readonly onCoverSelected = (event: Event) => {
    event.stopPropagation();
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file?.type.startsWith('image/') || !this.model) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string' || !this.model) return;
      this.host.store.updateBlock(this.model, {
        'meta:cover': reader.result,
        'meta:coverPosition': 50,
      });
      this.repositioning = false;
      this.requestUpdate();
    });
    reader.readAsDataURL(file);
  };

  private readonly removeCover = (event: Event) => {
    event.stopPropagation();
    if (!this.model) return;
    this.host.store.updateBlock(this.model, {
      'meta:cover': undefined,
      'meta:coverPosition': undefined,
    });
    this.repositioning = false;
    this.requestUpdate();
  };

  private readonly toggleReposition = (event: Event) => {
    event.stopPropagation();
    this.repositioning = !this.repositioning;
    this.requestUpdate();
  };

  private readonly updateCoverPosition = (event: Event) => {
    event.stopPropagation();
    if (!this.model) return;
    const input = event.currentTarget as HTMLInputElement;
    this.host.store.updateBlock(this.model, {
      'meta:coverPosition': Number(input.value),
    });
    this.requestUpdate();
  };

  override connectedCallback() {
    super.connectedCallback();
    if (this.model && this.model.text) {
      const cb = () => {
        if (this.model?.text?.length == 0) {
          this.classList.add('empty');
        } else {
          this.classList.remove('empty');
        }
      };
      this.model.text.yText.observe(cb);
      this.disposables.add(() => {
        this.model?.text?.yText.unobserve(cb);
      });
    }
    this._disposables.addFromEvent(
      this,
      'keydown',
      e => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
        if (
          e.key === 'Backspace' &&
          !e.shiftKey &&
          !e.metaKey &&
          this.model?.text?.length === 0
        ) {
          e.stopPropagation();
          e.preventDefault();
          return;
        }
      },
      true
    );
  }

  protected override render(): unknown {
    const model = this.model;
    if (!model) {
      return;
    }
    return html`
      <input
        class="record-cover-input"
        type="file"
        accept="image/*"
        hidden
        @change=${this.onCoverSelected}
      />
      ${this.renderCover()} ${this.renderIcon()}
      <rich-text
        .yText=${model.text}
        .attributesSchema=${this.attributesSchema}
        .attributeRenderer=${this.attributeRenderer}
        .embedChecker=${this.inlineManager.embedChecker}
        .markdownMatches=${this.inlineManager.markdownMatches}
        class="inline-editor"
      ></rich-text>
    `;
  }

  private renderCover() {
    if (!this.cover) {
      return this.view.readonly$.value
        ? undefined
        : html`<button class="record-add-cover" @click=${this.chooseCover}>
            + Add cover
          </button>`;
    }
    return html`<div class="record-cover-shell">
      <img
        src=${this.cover}
        alt="Record cover"
        style="object-position:center ${this.coverPosition}%"
      />
      ${
        this.view.readonly$.value
          ? undefined
          : html`
              <div class="record-cover-actions">
                <button class="record-cover-action" @click=${this.chooseCover}>
                  Change
                </button>
                <button
                  class="record-cover-action"
                  @click=${this.toggleReposition}
                >
                  Reposition
                </button>
                <button class="record-cover-action" @click=${this.removeCover}>
                  Remove
                </button>
              </div>
              ${
                this.repositioning
                  ? html`<label class="record-cover-position">
                      <span>Position</span>
                      <input
                        aria-label="Cover vertical position"
                        type="range"
                        min="0"
                        max="100"
                        .value=${String(this.coverPosition)}
                        @input=${this.updateCoverPosition}
                      />
                    </label>`
                  : undefined
              }
            `
      }
    </div>`;
  }

  renderIcon() {
    const iconColumn = this.view.mainProperties$.value.iconColumn;
    if (!iconColumn) {
      return;
    }
    return html` <div class="database-block-detail-header-icon">
      ${this.view.cellGetOrCreate(this.rowId, iconColumn).value$.value}
    </div>`;
  }

  @property({ attribute: false })
  accessor host!: EditorHost;

  @query('.record-cover-input')
  accessor coverInput!: HTMLInputElement;

  @property({ attribute: false })
  accessor openDoc!: (docId: string) => void;

  @property({ attribute: false })
  accessor rowId!: string;

  @property({ attribute: false })
  accessor view!: TableSingleView | KanbanSingleView | GallerySingleView;
}
