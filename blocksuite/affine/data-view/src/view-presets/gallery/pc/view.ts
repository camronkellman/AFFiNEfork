import type { MenuConfig } from '@blocksuite/affine-components/context-menu';
import { menu } from '@blocksuite/affine-components/context-menu';
import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import { PlusIcon } from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { css, html, nothing } from 'lit';
import { property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import {
  createUniComponentFromWebComponent,
  renderUniLit,
} from '../../../core/index.js';
import {
  DataViewUIBase,
  DataViewUILogicBase,
} from '../../../core/view/data-view-base.js';
import type { GalleryCardSize } from '../define.js';
import {
  GalleryCoverProvider,
  type GallerySingleView,
} from '../gallery-view-manager.js';

const cardWidths: Record<GalleryCardSize, string> = {
  small: '180px',
  medium: '240px',
  large: '320px',
};

export class GalleryViewUILogic extends DataViewUILogicBase<GallerySingleView> {
  clearSelection = () => this.setSelection(undefined);

  addRow = (_position: InsertToPosition) => {
    if (this.view.readonly$.value) return;
    const rowId = this.view.rowAdd('end');
    this.root.openDetailPanel({ view: this.view, rowId });
    return rowId;
  };

  focusFirstCell = () => {};
  showIndicator = (_evt: MouseEvent) => false;
  hideIndicator = () => {};
  moveTo = (_id: string, _evt: MouseEvent) => {};

  getViewOptionsSettingItems = (): MenuConfig[] => [
    menu.subMenu({
      name: 'Card size',
      options: {
        items: (['small', 'medium', 'large'] as const).map(size =>
          menu.action({
            name: `${size[0]?.toUpperCase()}${size.slice(1)}`,
            select: () => this.view.setCardSize(size),
          })
        ),
      },
    }),
    menu.subMenu({
      name: 'Card cover',
      options: {
        items: [
          menu.action({
            name: 'None',
            select: () => this.view.setCoverColumn(undefined),
          }),
          ...this.view.propertiesRaw$.value
            .filter(property => {
              const type = property.type$.value;
              return type === 'image' || type === 'attachment';
            })
            .map(property =>
              menu.action({
                name: property.name$.value || 'Image',
                select: () => this.view.setCoverColumn(property.id),
              })
            ),
        ],
      },
    }),
  ];

  renderer = createUniComponentFromWebComponent(GalleryViewUI);
}

const galleryStyles = css`
  affine-data-view-gallery {
    display: block;
    width: 100%;
  }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(var(--gallery-card-width), 1fr)
    );
    gap: 16px;
    padding: 12px 0 4px;
    align-items: start;
  }
  .gallery-new-card {
    min-height: 116px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 1px dashed var(--affine-border-color);
    border-radius: 10px;
    color: var(--affine-text-secondary-color);
    cursor: pointer;
    background: transparent;
    font: inherit;
  }
  .gallery-new-card:hover {
    color: var(--affine-text-primary-color);
    background: var(--affine-hover-color);
  }
`;

export class GalleryViewUI extends DataViewUIBase<GalleryViewUILogic> {
  static override styles = galleryStyles;

  private readonly addCard = () => this.logic.addRow('end');

  override render() {
    const view = this.logic.view;
    const width = cardWidths[view.cardSize$.value];
    return html`
      ${
        this.logic.headerWidget
          ? renderUniLit(this.logic.headerWidget, { dataViewLogic: this.logic })
          : nothing
      }
      <div class="gallery-grid" style="--gallery-card-width:${width}">
        ${repeat(
          view.rows$.value,
          row => row.rowId,
          row => html`
            <affine-data-view-gallery-card
              .logic=${this.logic}
              .rowId=${row.rowId}
            ></affine-data-view-gallery-card>
          `
        )}
        ${
          view.readonly$.value
            ? nothing
            : html`<button class="gallery-new-card" @click=${this.addCard}>
                ${PlusIcon()} New page
              </button>`
        }
      </div>
    `;
  }
}

const cardStyles = css`
  affine-data-view-gallery-card {
    display: block;
    overflow: hidden;
    min-width: 0;
    border: 1px solid var(--affine-border-color);
    border-radius: 10px;
    background: var(--affine-background-secondary-color);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background-color 120ms ease;
  }
  affine-data-view-gallery-card:hover {
    transform: translateY(-1px);
    border-color: var(--affine-text-disable-color);
    background: var(--affine-hover-color);
  }
  .gallery-cover {
    aspect-ratio: 16 / 9;
    width: 100%;
    overflow: hidden;
    background:
      radial-gradient(
        circle at 20% 20%,
        rgba(79, 156, 249, 0.28),
        transparent 45%
      ),
      linear-gradient(
        135deg,
        var(--affine-background-tertiary-color),
        var(--affine-background-secondary-color)
      );
    border-bottom: 1px solid var(--affine-border-color);
  }
  .gallery-cover img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
  .gallery-content {
    padding: 12px 14px 14px;
    min-height: 78px;
  }
  .gallery-title {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    color: var(--affine-text-primary-color);
    font-size: 15px;
    line-height: 22px;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .gallery-icon {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    padding-top: 1px;
  }
  .gallery-properties {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-top: 9px;
  }
  .gallery-property {
    display: flex;
    gap: 8px;
    min-width: 0;
    color: var(--affine-text-secondary-color);
    font-size: 12px;
    line-height: 18px;
  }
  .gallery-property-name {
    flex: 0 0 38%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gallery-property-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--affine-text-primary-color);
  }
`;

export class GalleryCard extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = cardStyles;

  @property({ attribute: false }) accessor logic!: GalleryViewUILogic;
  @property({ attribute: false }) accessor rowId!: string;
  @state() private accessor coverUrl: string | undefined;
  private coverRequest = 0;

  private get view() {
    return this.logic.view;
  }

  private readonly open = (event: MouseEvent) => {
    event.stopPropagation();
    this.logic.root.openDetailPanel({ view: this.view, rowId: this.rowId });
  };

  private async loadCover() {
    const request = ++this.coverRequest;
    const property = this.view.coverProperty;
    const value = property?.cellGetOrCreate(this.rowId).value$.value;
    if (!value) {
      this.coverUrl = undefined;
      return;
    }
    const resolver = this.view.serviceGet(GalleryCoverProvider);
    const resolved = resolver
      ? await resolver.resolve(value)
      : typeof value === 'string'
        ? value
        : undefined;
    if (request === this.coverRequest) this.coverUrl = resolved;
  }

  override connectedCallback() {
    super.connectedCallback();
    this.disposables.add(
      this.view.coverColumnId$.subscribe(() => void this.loadCover())
    );
    const cover = this.view.coverProperty;
    if (cover) {
      this.disposables.add(
        cover
          .cellGetOrCreate(this.rowId)
          .value$.subscribe(() => void this.loadCover())
      );
    }
    this.loadCover().catch(console.error);
  }

  override render() {
    const recordCover = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordCover?.(this.rowId);
    const recordCoverUrl = recordCover?.source$.value;
    const coverPosition = recordCover?.position$.value ?? 50;
    const coverUrl = recordCoverUrl ?? this.coverUrl;
    const titleCell = this.view.titleProperty?.cellGetOrCreate(this.rowId);
    const titleJson = titleCell?.jsonValue$.value;
    const title =
      (typeof titleJson === 'string'
        ? titleJson
        : titleCell?.stringValue$.value) || 'Untitled';
    const icon = this.view.iconProperty?.cellGetOrCreate(this.rowId).value$
      .value;
    const properties = this.view.cardProperties$.value.flatMap(property => {
      const value = property.cellGetOrCreate(this.rowId).stringValue$.value;
      return value ? [{ property, value }] : [];
    });
    return html`
      <div @click=${this.open}>
        ${
          recordCoverUrl || this.view.coverColumnId$.value
            ? html`<div class="gallery-cover">
                ${
                  coverUrl
                    ? html`<img
                        src=${coverUrl}
                        alt=""
                        style="object-position:center ${coverPosition}%"
                      />`
                    : nothing
                }
              </div>`
            : nothing
        }
        <div class="gallery-content">
          <div class="gallery-title">
            ${icon ? html`<span class="gallery-icon">${icon}</span>` : nothing}
            <span>${title}</span>
          </div>
          <div class="gallery-properties">
            ${properties.slice(0, 4).map(
              ({ property, value }) => html`
                <div class="gallery-property">
                  <span class="gallery-property-name"
                    >${property.name$.value}</span
                  >
                  <span class="gallery-property-value">${value}</span>
                </div>
              `
            )}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-gallery': GalleryViewUI;
    'affine-data-view-gallery-card': GalleryCard;
  }
}
