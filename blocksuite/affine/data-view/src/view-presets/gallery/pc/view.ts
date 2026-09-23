import type { MenuConfig } from '@blocksuite/affine-components/context-menu';
import {
  menu,
  popMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import type { InsertToPosition } from '@blocksuite/affine-shared/utils';
import { SignalWatcher, WithDisposable } from '@blocksuite/global/lit';
import * as pageIcons from '@blocksuite/icons/lit';
import {
  CopyIcon,
  DeleteIcon,
  ImageIcon,
  MoreHorizontalIcon,
  PlusIcon,
} from '@blocksuite/icons/lit';
import { ShadowlessElement } from '@blocksuite/std';
import { css, html, nothing, type TemplateResult } from 'lit';
import { property, query, state } from 'lit/decorators.js';
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
    align-items: stretch;
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
    position: relative;
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
    min-height: 240px;
  }
  affine-data-view-gallery-card:hover {
    transform: translateY(-1px);
    border-color: var(--affine-text-disable-color);
    background: var(--affine-hover-color);
  }
  .gallery-cover {
    position: relative;
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
    object-fit: contain;
    transform-origin: center;
    will-change: transform, object-position;
  }
  .gallery-cover[data-repositioning] {
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  .gallery-cover[data-repositioning]:active {
    cursor: grabbing;
  }
  .gallery-cover-adjustment {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 10px;
    box-sizing: border-box;
    background: rgba(0, 0, 0, 0.08);
  }
  .gallery-cover-adjustment-bar {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 8px;
    color: #fff;
    background: rgba(24, 24, 27, 0.88);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
  }
  .gallery-cover-adjustment-bar button {
    height: 26px;
    padding: 0 8px;
    border: 0;
    border-radius: 5px;
    color: inherit;
    background: transparent;
    font: inherit;
    font-size: 12px;
    cursor: pointer;
  }
  .gallery-cover-adjustment-bar button:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .gallery-cover-zoom {
    min-width: 38px;
    color: rgba(255, 255, 255, 0.72);
    font-size: 11px;
    text-align: center;
  }
  .gallery-content {
    padding: 12px 44px 44px 14px;
    min-height: 104px;
    box-sizing: border-box;
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
  .gallery-description {
    display: -webkit-box;
    margin-top: 9px;
    overflow: hidden;
    color: var(--affine-text-secondary-color);
    font-size: 13px;
    line-height: 19px;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
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
  .gallery-card-menu {
    position: absolute;
    right: 10px;
    bottom: 10px;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    color: var(--affine-icon-color);
    background: transparent;
    cursor: pointer;
  }
  .gallery-card-menu:hover,
  .gallery-card-menu:focus-visible {
    color: var(--affine-text-primary-color);
    background: var(--affine-hover-color);
  }
  .gallery-card-menu svg {
    width: 18px;
    height: 18px;
  }
`;

export class GalleryCard extends SignalWatcher(
  WithDisposable(ShadowlessElement)
) {
  static override styles = cardStyles;

  @property({ attribute: false }) accessor logic!: GalleryViewUILogic;
  @property({ attribute: false }) accessor rowId!: string;
  @query('.gallery-cover-input') accessor coverInput!: HTMLInputElement;
  @state() private accessor coverUrl: string | undefined;
  @state() private accessor recordCoverUrl: string | undefined;
  @state() private accessor repositioning = false;
  @state() private accessor draftPositionX = 50;
  @state() private accessor draftPositionY = 50;
  @state() private accessor draftZoom = 1;
  private coverInteractionLocked = false;
  private suppressOpenUntil = 0;
  private scrollSnapshot:
    | {
        elements: Array<{
          element: HTMLElement;
          left: number;
          top: number;
        }>;
        windowX: number;
        windowY: number;
      }
    | undefined;
  private coverDrag:
    | {
        pointerId: number;
        clientX: number;
        clientY: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined;
  private coverRequest = 0;
  private recordCoverRequest = 0;

  private get view() {
    return this.logic.view;
  }

  private readonly open = (event: MouseEvent) => {
    event.stopPropagation();
    if (
      this.coverInteractionLocked ||
      this.repositioning ||
      performance.now() < this.suppressOpenUntil
    ) {
      return;
    }
    this.logic.root.openDetailPanel({ view: this.view, rowId: this.rowId });
  };

  private readonly onCoverSelected = async (event: Event) => {
    event.stopPropagation();
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file?.type.startsWith('image/')) {
      this.restoreScrollPosition();
      return;
    }
    try {
      const provider = this.view.serviceGet(GalleryCoverProvider);
      const source = provider?.upload
        ? await provider.upload(file)
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
              if (typeof reader.result === 'string') resolve(reader.result);
              else reject(new Error('Cover image could not be read'));
            });
            reader.addEventListener('error', () => reject(reader.error));
            reader.readAsDataURL(file);
          });
      this.view
        .serviceGet(GalleryCoverProvider)
        ?.setRecordCover?.(this.rowId, source);
      this.draftPositionX = 50;
      this.draftPositionY = 50;
      this.draftZoom = 1;
      this.coverInteractionLocked = true;
      this.suppressOpenUntil = Number.POSITIVE_INFINITY;
      this.repositioning = true;
    } catch (error) {
      console.error('Failed to save gallery cover', error);
      this.restoreScrollPosition();
    }
  };

  private captureScrollPosition() {
    const elements: Array<{
      element: HTMLElement;
      left: number;
      top: number;
    }> = [];
    let current: Node | null = this.parentNode;
    const visited = new Set<HTMLElement>();
    while (current) {
      if (
        current instanceof HTMLElement &&
        !visited.has(current) &&
        (current.scrollHeight > current.clientHeight ||
          current.scrollWidth > current.clientWidth)
      ) {
        visited.add(current);
        elements.push({
          element: current,
          left: current.scrollLeft,
          top: current.scrollTop,
        });
      }
      if (current.parentNode) {
        current = current.parentNode;
      } else {
        const root = current.getRootNode();
        current = root instanceof ShadowRoot ? root.host : null;
      }
    }
    this.scrollSnapshot = {
      elements,
      windowX: window.scrollX,
      windowY: window.scrollY,
    };
  }

  private restoreScrollPosition() {
    const snapshot = this.scrollSnapshot;
    this.scrollSnapshot = undefined;
    if (!snapshot) return;
    const restore = () => {
      snapshot.elements.forEach(({ element, left, top }) => {
        element.scrollLeft = left;
        element.scrollTop = top;
      });
      window.scrollTo(snapshot.windowX, snapshot.windowY);
    };
    queueMicrotask(restore);
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
  }

  private runPreservingScroll(action: () => unknown) {
    this.captureScrollPosition();
    try {
      return action();
    } finally {
      this.restoreScrollPosition();
    }
  }

  private readonly openMenu = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const provider = this.view.serviceGet(GalleryCoverProvider);
    const hasCover = Boolean(
      provider?.recordCover?.(this.rowId)?.source$.value
    );
    popMenu(popupTargetFromElement(event.currentTarget as HTMLElement), {
      options: {
        items: [
          menu.action({
            name: hasCover ? 'Change cover' : 'Add cover',
            prefix: ImageIcon(),
            select: () => {
              this.captureScrollPosition();
              this.coverInput.click();
            },
          }),
          ...(hasCover
            ? [
                menu.action({
                  name: 'Reposition cover',
                  prefix: ImageIcon(),
                  select: () => this.beginRepositioning(),
                }),
                menu.action({
                  name: 'Remove cover',
                  prefix: DeleteIcon(),
                  select: () => {
                    this.coverInteractionLocked = false;
                    this.repositioning = false;
                    this.runPreservingScroll(() =>
                      provider?.setRecordCover?.(this.rowId)
                    );
                  },
                }),
              ]
            : []),
          menu.action({
            name: 'Duplicate page',
            prefix: CopyIcon(),
            select: () =>
              this.runPreservingScroll(() =>
                provider?.duplicateRecord?.(this.rowId)
              ),
          }),
          menu.action({
            name: 'Delete page',
            prefix: DeleteIcon(),
            class: { 'delete-item': true },
            select: () =>
              this.runPreservingScroll(() =>
                provider?.deleteRecord?.(this.rowId)
              ),
          }),
        ],
      },
    });
  };

  private beginRepositioning() {
    this.captureScrollPosition();
    const cover = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordCover?.(this.rowId);
    this.draftPositionX = cover?.positionX$.value ?? 50;
    this.draftPositionY =
      cover?.positionY$.value ?? cover?.position$.value ?? 50;
    this.draftZoom = cover?.zoom$.value ?? 1;
    this.coverInteractionLocked = true;
    this.suppressOpenUntil = performance.now() + 300;
    this.repositioning = true;
  }

  private readonly startCoverDrag = (event: PointerEvent) => {
    if (!this.repositioning) return;
    if ((event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget as HTMLElement;
    const bounds = element.getBoundingClientRect();
    this.coverDrag = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: this.draftPositionX,
      y: this.draftPositionY,
      width: bounds.width,
      height: bounds.height,
    };
    this.suppressOpenUntil = Number.POSITIVE_INFINITY;
    element.setPointerCapture(event.pointerId);
  };

  private readonly moveCover = (event: PointerEvent) => {
    const drag = this.coverDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    this.draftPositionX = Math.min(
      100,
      Math.max(0, drag.x + ((event.clientX - drag.clientX) / drag.width) * 100)
    );
    this.draftPositionY = Math.min(
      100,
      Math.max(0, drag.y + ((event.clientY - drag.clientY) / drag.height) * 100)
    );
  };

  private readonly finishCoverDrag = (event: PointerEvent) => {
    if (this.coverDrag?.pointerId !== event.pointerId) return;
    this.coverDrag = undefined;
    const element = event.currentTarget as HTMLElement;
    if (element.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    this.suppressOpenUntil = Number.POSITIVE_INFINITY;
  };

  private readonly adjustZoom = (event: MouseEvent, delta: number) => {
    event.preventDefault();
    event.stopPropagation();
    this.draftZoom = Math.min(
      2,
      Math.max(0.5, Number((this.draftZoom + delta).toFixed(1)))
    );
  };

  private readonly saveRepositioning = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.view
      .serviceGet(GalleryCoverProvider)
      ?.setRecordCoverTransform?.(this.rowId, {
        x: this.draftPositionX,
        y: this.draftPositionY,
        zoom: this.draftZoom,
      });
    this.coverInteractionLocked = false;
    this.suppressOpenUntil = performance.now() + 300;
    this.repositioning = false;
    this.restoreScrollPosition();
  };

  private readonly cancelRepositioning = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    this.coverDrag = undefined;
    this.coverInteractionLocked = false;
    this.suppressOpenUntil = performance.now() + 300;
    this.repositioning = false;
    this.restoreScrollPosition();
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

  private async loadRecordCover(value?: string) {
    const request = ++this.recordCoverRequest;
    if (!value) {
      this.recordCoverUrl = undefined;
      return;
    }
    this.recordCoverUrl = undefined;
    const resolved = await this.view
      .serviceGet(GalleryCoverProvider)
      ?.resolve(value);
    if (request === this.recordCoverRequest) {
      this.recordCoverUrl = resolved;
    }
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
    const recordCover = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordCover?.(this.rowId);
    if (recordCover) {
      this.disposables.add(
        recordCover.source$.subscribe(value => {
          void this.loadRecordCover(value).catch(console.error);
        })
      );
      void this.loadRecordCover(recordCover.source$.value).catch(console.error);
    }
    this.loadCover().catch(console.error);
  }

  override render() {
    const recordCover = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordCover?.(this.rowId);
    const recordCoverSource = recordCover?.source$.value;
    const coverPositionX = this.repositioning
      ? this.draftPositionX
      : (recordCover?.positionX$.value ?? 50);
    const coverPositionY = this.repositioning
      ? this.draftPositionY
      : (recordCover?.positionY$.value ?? recordCover?.position$.value ?? 50);
    const coverZoom = this.repositioning
      ? this.draftZoom
      : (recordCover?.zoom$.value ?? 1);
    const coverUrl = this.recordCoverUrl ?? this.coverUrl;
    const titleCell = this.view.titleProperty?.cellGetOrCreate(this.rowId);
    const titleJson = titleCell?.jsonValue$.value;
    const title =
      (typeof titleJson === 'string'
        ? titleJson
        : titleCell?.stringValue$.value) || 'Untitled';
    const icon = this.view.iconProperty?.cellGetOrCreate(this.rowId).value$
      .value;
    const pageIcon = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordIcon?.(this.rowId).value;
    const pageIconRenderer =
      pageIcon?.type === 'affine-icon'
        ? (pageIcons as Record<
            string,
            (options?: { style?: string }) => TemplateResult
          >)[`${pageIcon.name}Icon`]
        : undefined;
    const displayedIcon =
      pageIcon?.type === 'emoji'
        ? pageIcon.unicode
        : pageIconRenderer && pageIcon?.type === 'affine-icon'
          ? pageIconRenderer({ style: `color:${pageIcon.color}` })
          : icon;
    const properties = this.view.cardProperties$.value.flatMap(property => {
      const value = property.cellGetOrCreate(this.rowId).stringValue$.value;
      return value ? [{ property, value }] : [];
    });
    const description = this.view
      .serviceGet(GalleryCoverProvider)
      ?.recordDescription?.(this.rowId).value;
    return html`
      <input
        class="gallery-cover-input"
        type="file"
        accept="image/*"
        hidden
        @change=${this.onCoverSelected}
        @cancel=${() => this.restoreScrollPosition()}
      />
      <div @click=${this.open}>
        ${
          recordCoverSource || this.view.coverColumnId$.value
            ? html`<div
                class="gallery-cover"
                data-repositioning=${this.repositioning || nothing}
                @pointerdown=${this.startCoverDrag}
                @pointermove=${this.moveCover}
                @pointerup=${this.finishCoverDrag}
                @pointercancel=${this.finishCoverDrag}
              >
                ${
                  coverUrl
                    ? html`<img
                        src=${coverUrl}
                        alt=""
                        draggable="false"
                        style="object-position:center;transform:translate3d(${
                          coverPositionX - 50
                        }%, ${coverPositionY - 50}%, 0) scale(${coverZoom})"
                      />`
                    : nothing
                }
                ${
                  this.repositioning
                    ? html`<div
                        class="gallery-cover-adjustment"
                        @click=${(event: MouseEvent) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <div class="gallery-cover-adjustment-bar">
                          <button
                            type="button"
                            @click=${this.saveRepositioning}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            @click=${this.cancelRepositioning}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            aria-label="Zoom out"
                            ?disabled=${coverZoom <= 0.5}
                            @click=${(event: MouseEvent) =>
                              this.adjustZoom(event, -0.1)}
                          >
                            −
                          </button>
                          <span class="gallery-cover-zoom"
                            >${Math.round(coverZoom * 100)}%</span
                          >
                          <button
                            type="button"
                            aria-label="Zoom in"
                            ?disabled=${coverZoom >= 2}
                            @click=${(event: MouseEvent) =>
                              this.adjustZoom(event, 0.1)}
                          >
                            +
                          </button>
                        </div>
                      </div>`
                    : nothing
                }
              </div>`
            : nothing
        }
        <div class="gallery-content">
          <div class="gallery-title">
            ${
              displayedIcon
                ? html`<span class="gallery-icon">${displayedIcon}</span>`
                : nothing
            }
            <span>${title}</span>
          </div>
          ${
            description
              ? html`<div class="gallery-description">${description}</div>`
              : nothing
          }
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
      <button
        class="gallery-card-menu"
        aria-label="Page actions"
        title="Page actions"
        @click=${this.openMenu}
      >
        ${MoreHorizontalIcon()}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-data-view-gallery': GalleryViewUI;
    'affine-data-view-gallery-card': GalleryCard;
  }
}
