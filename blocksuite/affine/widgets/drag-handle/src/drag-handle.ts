import './components/add-block-widget.js';

import { updateBlockType } from '@blocksuite/affine-block-note';
import { EdgelessCRUDIdentifier } from '@blocksuite/affine-block-surface';
import type { RootBlockModel } from '@blocksuite/affine-model';
import {
  focusTextModel,
  textConversionConfigs,
} from '@blocksuite/affine-rich-text';
import {
  copySelectedModelsCommand,
  deleteSelectedModelsCommand,
  draftSelectedModelsCommand,
  duplicateSelectedModelsCommand,
  getSelectedModelsCommand,
} from '@blocksuite/affine-shared/commands';
import { DocModeProvider } from '@blocksuite/affine-shared/services';
import {
  isInsideEdgelessEditor,
  isInsidePageEditor,
} from '@blocksuite/affine-shared/utils';
import { DisposableGroup } from '@blocksuite/global/disposable';
import type { IVec, Point, Rect } from '@blocksuite/global/gfx';
import {
  CopyIcon,
  DeleteIcon,
  DuplicateIcon,
  PaletteIcon,
} from '@blocksuite/icons/lit';
import { type BlockComponent, WidgetComponent } from '@blocksuite/std';
import type { GfxModel } from '@blocksuite/std/gfx';
import { computed, type ReadonlySignal, signal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { query, state } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { styleMap } from 'lit/directives/style-map.js';

//focustextmodel rich text should be added in package.json file and import from there
import type { AFFINE_DRAG_HANDLE_WIDGET } from './consts.js';
import { RectHelper } from './helpers/rect-helper.js';
import { SelectionHelper } from './helpers/selection-helper.js';
import { styles } from './styles.js';
import { updateDragHandleClassName } from './utils.js';
import { DragEventWatcher } from './watchers/drag-event-watcher.js';
import { EdgelessWatcher } from './watchers/edgeless-watcher.js';
import { HandleEventWatcher } from './watchers/handle-event-watcher.js';
import { KeyboardEventWatcher } from './watchers/keyboard-event-watcher.js';
import { PageWatcher } from './watchers/page-watcher.js';
import { PointerEventWatcher } from './watchers/pointer-event-watcher.js';

export class AffineDragHandleWidget extends WidgetComponent<RootBlockModel> {
  static override styles = styles;

  private _anchorModelDisposables: DisposableGroup | null = null;

  /**
   * Used to handle drag behavior
   */
  private readonly _dragEventWatcher = new DragEventWatcher(this);

  private readonly _handleEventWatcher = new HandleEventWatcher(this);

  private readonly _keyboardEventWatcher = new KeyboardEventWatcher(this);

  private readonly _pageWatcher = new PageWatcher(this);

  private readonly _reset = () => {
    this.dragging = false;

    this.isDragHandleHovered = false;

    this.pointerEventWatcher.reset();
  };

  /**
   * Insert a new empty paragraph block below the currently hovered block
   * and move the cursor into it.
   */
  private readonly _handleAddBlock = () => {
    const anchorBlockId = this.anchorBlockId.peek();
    if (!anchorBlockId) return;

    const block = this.anchorBlockComponent.peek();
    if (!block) return;

    const { store } = this;
    const parent = store.getParent(block.model);
    if (!parent) return;

    const index = parent.children.indexOf(block.model);
    if (index < 0) return;
    store.captureSync();
    const newBlockId = store.addBlock(
      'affine:paragraph',
      {},
      parent,
      index + 1
    );

    if (!newBlockId) return;

    this.host.updateComplete
      .then(() => {
        focusTextModel(this.std, newBlockId);
      })
      .catch(console.error);

    this.hide();
  };

  private readonly _closeActionsMenu = () => {
    this.actionsMenuOpen = false;
    this.actionsMenuPanel = 'main';
    this.actionsSearch = '';
    this.actionsAnchorBlockId = null;
  };

  private readonly _getActionsBlock = () =>
    this.actionsAnchorBlockId
      ? this.std.view.getBlock(this.actionsAnchorBlockId)
      : null;

  private readonly _selectActionsBlock = () => {
    const block = this._getActionsBlock();
    if (!block) return null;
    this.selectionHelper.setSelectedBlocks([block]);
    return block;
  };

  private readonly _convertActionsBlock = (
    flavour: string,
    type?: string,
    toggleLevel?: 0 | 1 | 2 | 3 | 4
  ) => {
    if (!this._selectActionsBlock()) return;
    this.std.command.exec(updateBlockType, {
      flavour,
      ...(type && {
        props: {
          type,
          ...(type === 'toggle'
            ? { collapsed: false, toggleLevel: toggleLevel ?? 0 }
            : {}),
        },
      }),
    });
    this._closeActionsMenu();
  };

  private readonly _formatActionsBlock = (color?: string) => {
    const block = this._selectActionsBlock();
    const text = block?.model.text;
    if (!text || text.length === 0) return;
    text.format(0, text.length, { color });
    this._closeActionsMenu();
  };

  private readonly _copyActionsBlock = () => {
    if (!this._selectActionsBlock()) return;
    this.std.command
      .chain()
      .pipe(getSelectedModelsCommand)
      .pipe(draftSelectedModelsCommand)
      .pipe(copySelectedModelsCommand)
      .run();
    this._closeActionsMenu();
  };

  private readonly _duplicateActionsBlock = () => {
    if (!this._selectActionsBlock()) return;
    this.std.command
      .chain()
      .pipe(getSelectedModelsCommand)
      .pipe(duplicateSelectedModelsCommand)
      .run();
    this._closeActionsMenu();
  };

  private readonly _deleteActionsBlock = () => {
    if (!this._selectActionsBlock()) return;
    this.std.command
      .chain()
      .pipe(getSelectedModelsCommand)
      .pipe(deleteSelectedModelsCommand)
      .run();
    this._closeActionsMenu();
  };

  openActionsMenu = () => {
    const block = this.anchorBlockComponent.peek();
    if (!block || this.store.readonly || this.mode !== 'page') return;

    const rect = this.dragHandleGrabber.getBoundingClientRect();
    const menuHeight = Math.min(460, window.innerHeight - 24);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    this.actionsMenuPosition = {
      left: Math.max(12, Math.min(rect.left, window.innerWidth - 264)),
      top:
        below >= menuHeight || below >= above
          ? rect.bottom + 6
          : Math.max(12, rect.top - menuHeight - 6),
    };
    this.actionsMenuMaxHeight = Math.min(
      menuHeight,
      below >= menuHeight || below >= above
        ? window.innerHeight - this.actionsMenuPosition.top - 12
        : above - 6
    );
    this.actionsAnchorBlockId = block.blockId;
    this.actionsMenuPanel = 'main';
    this.actionsSearch = '';
    this.actionsMenuOpen = true;
    // Opening the six-dot menu is not itself a block-selection action. Keeping
    // the previous text/block selection alive also keeps AFFiNE's formatting
    // toolbar open underneath this menu, leaving two overlapping toolbars.
    // The chosen menu action selects the block immediately before it runs.
    this.std.selection.set([]);
    window.getSelection()?.removeAllRanges();
  };

  private actionsAnchorBlockId: string | null = null;

  @state()
  accessor activeDragHandle: 'block' | 'gfx' | null = null;

  @state()
  accessor showAddBlockWidget = false;

  @state()
  accessor actionsMenuOpen = false;

  @state()
  accessor actionsMenuPanel: 'main' | 'turn-into' | 'color' = 'main';

  @state()
  accessor actionsSearch = '';

  @state()
  accessor actionsMenuPosition = { left: 0, top: 0 };

  @state()
  accessor actionsMenuMaxHeight = 460;

  anchorBlockId = signal<string | null>(null);

  anchorBlockComponent = computed<BlockComponent | null>(() => {
    if (!this.anchorBlockId.value) return null;

    return this.std.view.getBlock(this.anchorBlockId.value);
  });

  anchorEdgelessElement: ReadonlySignal<GfxModel | null> = computed(() => {
    if (!this.anchorBlockId.value) return null;
    if (this.mode === 'page') return null;

    const crud = this.std.get(EdgelessCRUDIdentifier);
    const edgelessElement = crud.getElementById(this.anchorBlockId.value);
    return edgelessElement;
  });

  // Single block: drag handle should show on the vertical middle of the first line of element
  center: IVec = [0, 0];

  dragging = false;

  suppressHandleClick = false;

  rectHelper = new RectHelper(this);

  draggingAreaRect: ReadonlySignal<Rect | null> = computed(
    this.rectHelper.getDraggingAreaRect
  );

  lastDragPoint: Point | null = null;

  edgelessWatcher = new EdgelessWatcher(this);

  handleAnchorModelDisposables = () => {
    const block = this.anchorBlockComponent.peek();
    if (!block) return;
    const blockModel = block.model;

    if (this._anchorModelDisposables) {
      this._anchorModelDisposables.dispose();
      this._anchorModelDisposables = null;
    }

    this._anchorModelDisposables = new DisposableGroup();

    this._anchorModelDisposables.add(
      blockModel.deleted.subscribe(() => this.hide())
    );
  };

  /**
   * @param force Reset the dragging state
   */
  hide = (force = false) => {
    if (this.actionsMenuOpen && !force) return;
    if (this.dragging && !force) return;
    updateDragHandleClassName();

    this.isDragHandleHovered = false;

    this.anchorBlockId.value = null;
    this.dragHoverRect = null;
    this.activeDragHandle = null;
    this.showAddBlockWidget = false;

    if (this.dragHandleContainer) {
      this.dragHandleContainer.removeAttribute('style');
      this.dragHandleContainer.style.display = 'none';
    }
    if (this.dragHandleGrabber) {
      this.dragHandleGrabber.removeAttribute('style');
    }
    if (this.addBlockWidgetContainer) {
      this.addBlockWidgetContainer.removeAttribute('style');
      this.addBlockWidgetContainer.style.display = 'none';
    }

    if (force) {
      this._reset();
    }
  };

  isDragHandleHovered = false;

  get isBlockDragHandleVisible() {
    return this.activeDragHandle === 'block';
  }

  get isGfxDragHandleVisible() {
    return this.activeDragHandle === 'gfx';
  }

  noteScale = signal(1);

  pointerEventWatcher = new PointerEventWatcher(this);

  scale = signal(1);

  scaleInNote = computed(() => this.scale.value * this.noteScale.value);

  selectionHelper = new SelectionHelper(this);

  get dragHandleContainerOffsetParent() {
    return this.dragHandleContainer.parentElement!;
  }

  get mode() {
    return this.std.get(DocModeProvider).getEditorMode();
  }

  get rootComponent() {
    return this.block;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.pointerEventWatcher.watch();
    this._keyboardEventWatcher.watch();
    this._dragEventWatcher.watch();
  }

  override disconnectedCallback() {
    this.hide(true);
    this._disposables.dispose();
    this._anchorModelDisposables?.dispose();
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this.hide(true);
    this._disposables.addFromEvent(this.host, 'pointerleave', () => {
      this.hide();
    });
    this._handleEventWatcher.watch();
    this._disposables.addFromEvent(document, 'pointerdown', event => {
      if (!this.actionsMenuOpen) return;
      const path = event.composedPath();
      if (path.includes(this.dragHandleGrabber)) return;
      if (
        path.some(
          target =>
            target instanceof Element && target.closest?.('.block-actions-menu')
        )
      )
        return;
      this._closeActionsMenu();
    });

    if (isInsidePageEditor(this.host)) {
      this._pageWatcher.watch();
    } else if (isInsideEdgelessEditor(this.host)) {
      this.edgelessWatcher.watch();
    }
  }

  override render() {
    const hoverRectStyle = styleMap(
      this.dragHoverRect && this.activeDragHandle
        ? {
            width: `${this.dragHoverRect.width}px`,
            height: `${this.dragHoverRect.height}px`,
            top: `${this.dragHoverRect.top}px`,
            left: `${this.dragHoverRect.left}px`,
          }
        : {
            display: 'none',
          }
    );
    const isGfx = this.activeDragHandle === 'gfx';
    const showDots = this.activeDragHandle !== null;
    const classes = {
      'affine-drag-handle-grabber': true,
      dots: showDots,
      'gfx-dots': isGfx,
    };
    const widgetClasses = {
      'affine-drag-handle-widget': true,
      'menu-open': this.actionsMenuOpen,
    };
    const actionsMenuStyle = styleMap({
      left: `${this.actionsMenuPosition.left}px`,
      top: `${this.actionsMenuPosition.top}px`,
      maxHeight: `${this.actionsMenuMaxHeight}px`,
    });
    const query = this.actionsSearch.trim().toLowerCase();
    const conversionItems = textConversionConfigs.filter(
      item =>
        item.flavour !== 'affine:divider' &&
        this.store.schema.flavourSchemaMap.has(item.flavour) &&
        (!query || item.name.toLowerCase().includes(query))
    );
    const colors = [
      ['Default', undefined],
      ['Red', '#e25555'],
      ['Orange', '#d9822b'],
      ['Yellow', '#c99a19'],
      ['Green', '#3f9b6d'],
      ['Blue', '#4b82d0'],
      ['Purple', '#8a63c7'],
      ['Grey', '#8b8d93'],
    ] as const;

    return html`
      <div class=${classMap(widgetClasses)}>
        <div class="affine-add-block-widget-container">
          <affine-add-block-widget
            .visible=${this.showAddBlockWidget && this.mode === 'page'}
            @add-block=${this._handleAddBlock}
          ></affine-add-block-widget>
        </div>
        <div class="affine-drag-handle-container">
          <div class=${classMap(classes)}>
            ${
              showDots
                ? html`
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                    <div class="dot"></div>
                  `
                : nothing
            }
          </div>
        </div>
        <div class="affine-drag-hover-rect" style=${hoverRectStyle}></div>
        ${
          this.actionsMenuOpen
            ? html`
                <div
                  class="block-actions-menu"
                  style=${actionsMenuStyle}
                  role="menu"
                  @pointerdown=${(event: PointerEvent) =>
                    event.stopPropagation()}
                  @click=${(event: MouseEvent) => event.stopPropagation()}
                >
                  <div class="block-actions-search-row">
                    ${
                      this.actionsMenuPanel !== 'main'
                        ? html`<button
                            class="block-actions-back"
                            aria-label="Back"
                            @click=${() => {
                              this.actionsMenuPanel = 'main';
                            }}
                          >
                            ‹
                          </button>`
                        : nothing
                    }
                    <input
                      class="block-actions-search"
                      type="search"
                      placeholder=${
                        this.actionsMenuPanel === 'main'
                          ? 'Search actions…'
                          : this.actionsMenuPanel === 'turn-into'
                            ? 'Search block types…'
                            : 'Search colors…'
                      }
                      .value=${this.actionsSearch}
                      @input=${(event: InputEvent) => {
                        this.actionsSearch = (
                          event.currentTarget as HTMLInputElement
                        ).value;
                      }}
                    />
                  </div>

                  ${
                    this.actionsMenuPanel === 'turn-into'
                      ? html`
                          <div class="block-actions-section-label">
                            Turn into
                          </div>
                          ${conversionItems.map(
                            item => html`
                              <button
                                class="block-action"
                                role="menuitem"
                                @click=${() =>
                                  this._convertActionsBlock(
                                    item.flavour,
                                    item.type
                                  )}
                              >
                                <span class="block-action-icon"
                                  >${item.icon}</span
                                ><span>${item.name}</span>
                              </button>
                            `
                          )}
                          ${([0, 1, 2, 3, 4] as const)
                            .filter(level =>
                              (level === 0
                                ? 'toggle list'
                                : `toggle heading ${level}`
                              ).includes(query)
                            )
                            .map(
                              level => html`
                                <button
                                  class="block-action"
                                  role="menuitem"
                                  @click=${() =>
                                    this._convertActionsBlock(
                                      'affine:list',
                                      'toggle',
                                      level
                                    )}
                                >
                                  <span class="block-action-icon">▸</span>
                                  <span
                                    >${
                                      level === 0
                                        ? 'Toggle list'
                                        : `Toggle heading ${level}`
                                    }</span
                                  >
                                </button>
                              `
                            )}
                        `
                      : this.actionsMenuPanel === 'color'
                        ? html`
                            <div class="block-actions-section-label">Color</div>
                            <div class="block-color-grid">
                              ${colors
                                .filter(([name]) =>
                                  name.toLowerCase().includes(query)
                                )
                                .map(
                                  ([name, color]) => html`
                                    <button
                                      class="block-color-action"
                                      role="menuitem"
                                      @click=${() =>
                                        this._formatActionsBlock(color)}
                                    >
                                      <span
                                        class="block-color-swatch"
                                        style=${
                                          color
                                            ? `--swatch-color: ${color}`
                                            : ''
                                        }
                                      ></span>
                                      <span>${name}</span>
                                    </button>
                                  `
                                )}
                            </div>
                          `
                        : html`
                            <div class="block-actions-section-label">Block</div>
                            ${
                              !query || 'turn into'.includes(query)
                                ? html`<button
                                    class="block-action"
                                    role="menuitem"
                                    @click=${() => {
                                      this.actionsMenuPanel = 'turn-into';
                                      this.actionsSearch = '';
                                    }}
                                  >
                                    <span class="block-action-symbol">↪</span>
                                    <span>Turn into</span
                                    ><span class="chevron">›</span>
                                  </button>`
                                : nothing
                            }
                            ${
                              !query || 'color'.includes(query)
                                ? html`<button
                                    class="block-action"
                                    role="menuitem"
                                    @click=${() => {
                                      this.actionsMenuPanel = 'color';
                                      this.actionsSearch = '';
                                    }}
                                  >
                                    <span class="block-action-icon"
                                      >${PaletteIcon()}</span
                                    ><span>Color</span
                                    ><span class="chevron">›</span>
                                  </button>`
                                : nothing
                            }
                            <div class="block-actions-divider"></div>
                            ${
                              !query || 'copy'.includes(query)
                                ? html`<button
                                    class="block-action"
                                    role="menuitem"
                                    @click=${this._copyActionsBlock}
                                  >
                                    <span class="block-action-icon"
                                      >${CopyIcon()}</span
                                    ><span>Copy</span>
                                  </button>`
                                : nothing
                            }
                            ${
                              !query || 'duplicate'.includes(query)
                                ? html`<button
                                    class="block-action"
                                    role="menuitem"
                                    @click=${this._duplicateActionsBlock}
                                  >
                                    <span class="block-action-icon"
                                      >${DuplicateIcon()}</span
                                    ><span>Duplicate</span>
                                  </button>`
                                : nothing
                            }
                            ${
                              !query || 'delete'.includes(query)
                                ? html`<button
                                    class="block-action danger"
                                    role="menuitem"
                                    @click=${this._deleteActionsBlock}
                                  >
                                    <span class="block-action-icon"
                                      >${DeleteIcon()}</span
                                    ><span>Delete</span>
                                  </button>`
                                : nothing
                            }
                            <div class="block-actions-hint">
                              Hold and drag the six dots to move this block
                            </div>
                          `
                  }
                </div>
              `
            : nothing
        }
      </div>
    `;
  }

  @query('.affine-drag-handle-container')
  accessor dragHandleContainer!: HTMLDivElement;

  @query('.affine-drag-handle-grabber')
  accessor dragHandleGrabber!: HTMLDivElement;

  @query('.affine-add-block-widget-container')
  accessor addBlockWidgetContainer!: HTMLDivElement;

  @state()
  accessor dragHoverRect: {
    width: number;
    height: number;
    left: number;
    top: number;
  } | null = null;
}

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_DRAG_HANDLE_WIDGET]: AffineDragHandleWidget;
  }
}
