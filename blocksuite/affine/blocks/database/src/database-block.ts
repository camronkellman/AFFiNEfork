import { CaptionedBlockComponent } from '@blocksuite/affine-components/caption';
import {
  menu,
  popMenu,
  popupTargetFromElement,
} from '@blocksuite/affine-components/context-menu';
import { DropIndicator } from '@blocksuite/affine-components/drop-indicator';
import { PeekViewProvider } from '@blocksuite/affine-components/peek';
import { toast } from '@blocksuite/affine-components/toast';
import type {
  DatabaseBlockModel,
  ParagraphBlockModel,
} from '@blocksuite/affine-model';
import {
  EDGELESS_TOP_CONTENTEDITABLE_SELECTOR,
  REFERENCE_NODE,
} from '@blocksuite/affine-shared/consts';
import {
  BlockElementCommentManager,
  CommentProviderIdentifier,
  DocModeProvider,
  FeatureFlagService,
  NotificationProvider,
  type TelemetryEventMap,
  TelemetryProvider,
} from '@blocksuite/affine-shared/services';
import type { AffineTextAttributes } from '@blocksuite/affine-shared/types';
import { createDefaultDoc } from '@blocksuite/affine-shared/utils';
import { getDropResult } from '@blocksuite/affine-widget-drag-handle';
import {
  createRecordDetail,
  createUniComponentFromWebComponent,
  DataViewRootUILogic,
  type DataViewSelection,
  type DataViewUILogicBase,
  type DataViewWidget,
  type DataViewWidgetProps,
  defineUniComponent,
  ExternalGroupByConfigProvider,
  lazy,
  renderUniLit,
  type SingleView,
  uniMap,
} from '@blocksuite/data-view';
import {
  CalendarExternalSourceProvider,
  GalleryCoverProvider,
} from '@blocksuite/data-view/view-presets';
import { widgetPresets } from '@blocksuite/data-view/widget-presets';
import { IS_MOBILE } from '@blocksuite/global/env';
import { Rect } from '@blocksuite/global/gfx';
import {
  CommentIcon,
  CopyIcon,
  DeleteIcon,
  MoreHorizontalIcon,
} from '@blocksuite/icons/lit';
import { type BlockComponent, BlockSelection } from '@blocksuite/std';
import { RANGE_SYNC_EXCLUDE_ATTR } from '@blocksuite/std/inline';
import { type BaseTextAttributes, Slice, Text } from '@blocksuite/store';
import { autoUpdate } from '@floating-ui/dom';
import { computed, signal } from '@preact/signals-core';
import { html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { styleMap } from 'lit/directives/style-map.js';

import { popSideDetail } from './components/layout.js';
import { DatabaseConfigExtension } from './config.js';
import { EditorHostKey } from './context/host-context.js';
import { DatabaseBlockDataSource } from './data-source.js';
import {
  databaseBlockStyles,
  databaseContentStyles,
  databaseHeaderBarStyles,
  databaseHeaderContainerStyles,
  databaseOpsStyles,
  databaseTitleRowStyles,
  databaseTitleStyles,
  databaseToolbarRowStyles,
  databaseViewBarContainerStyles,
} from './database-block-styles.js';
import { BlockRenderer } from './detail-panel/block-renderer.js';
import { NoteRenderer } from './detail-panel/note-renderer.js';
import { DatabaseSelection } from './selection.js';
import { currentViewStorage } from './utils/current-view.js';
import { getSingleDocIdFromText } from './utils/title-doc.js';
import type { DatabaseViewExtensionOptions } from './view';

export class DatabaseBlockComponent extends CaptionedBlockComponent<DatabaseBlockModel> {
  private readonly clickDatabaseOps = (e: MouseEvent) => {
    const options = this.optionsConfig.configure(this.model, {
      items: [
        menu.input({
          initialValue: this.model.props.title.toString(),
          placeholder: 'Database title',
          onChange: text => {
            this.model.props.title.replace(
              0,
              this.model.props.title.length,
              text
            );
          },
        }),
        menu.action({
          prefix: CommentIcon(),
          name: 'Comment',
          hide: () => !this.std.getOptional(CommentProviderIdentifier),
          select: () => {
            this.std.getOptional(CommentProviderIdentifier)?.addComment([
              new BlockSelection({
                blockId: this.blockId,
              }),
            ]);
          },
        }),
        menu.action({
          prefix: CopyIcon(),
          name: 'Copy',
          select: () => {
            const slice = Slice.fromModels(this.store, [this.model]);
            this.std.clipboard
              .copySlice(slice)
              .then(() => {
                toast(this.host, 'Copied to clipboard');
              })
              .catch(console.error);
          },
        }),
        menu.group({
          items: [
            menu.action({
              prefix: DeleteIcon(),
              class: {
                'delete-item': true,
              },
              name: 'Delete Database',
              select: () => {
                this.model.children.slice().forEach(block => {
                  this.store.deleteBlock(block);
                });
                this.store.deleteBlock(this.model);
              },
            }),
          ],
        }),
      ],
    });

    popMenu(popupTargetFromElement(e.currentTarget as HTMLElement), {
      options,
    });
  };

  private readonly dataSource = lazy(() => {
    const dataSource = new DatabaseBlockDataSource(this.model, dataSource => {
      dataSource.serviceSet(EditorHostKey, this.host);
      const coverUrls = new Map<string, string>();
      const resolveCover = async (
        value: unknown
      ): Promise<string | undefined> => {
        if (typeof value === 'string') {
          if (/^(data:|blob:|https?:)/.test(value)) return value;
          const cached = coverUrls.get(value);
          if (cached) return cached;
          const blob = await this.host.store.blobSync.get(value);
          if (!blob?.type.startsWith('image/')) return;
          const url = URL.createObjectURL(blob);
          coverUrls.set(value, url);
          return url;
        }
        if (value && typeof value === 'object') {
          const items = Object.values(value as Record<string, unknown>);
          const image = items.find(item => {
            if (!item || typeof item !== 'object') return false;
            const mime = (item as { mime?: unknown }).mime;
            return typeof mime !== 'string' || mime.startsWith('image/');
          }) as { id?: unknown } | undefined;
          return typeof image?.id === 'string'
            ? resolveCover(image.id)
            : undefined;
        }
        return;
      };
      dataSource.serviceSet(GalleryCoverProvider, {
        resolve: resolveCover,
        recordCover: rowId => {
          const model = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          if (!model) return;
          return {
            source$: model.props['meta:cover$'],
            position$: model.props['meta:coverPosition$'],
            positionX$: model.props['meta:galleryCoverPositionX$'],
            positionY$: model.props['meta:galleryCoverPositionY$'],
            zoom$: model.props['meta:galleryCoverZoom$'],
          };
        },
        recordDescription: rowId => {
          const model = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          return model?.props['meta:description$'];
        },
        setRecordCover: (rowId, source) => {
          const model = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          if (!model) return;
          this.host.store.updateBlock(model, {
            'meta:cover': source,
            'meta:coverPosition': source ? 50 : undefined,
            'meta:galleryCoverPositionX': source ? 50 : undefined,
            'meta:galleryCoverPositionY': source ? 50 : undefined,
            'meta:galleryCoverZoom': source ? 1 : undefined,
          });
          const docId = getSingleDocIdFromText(model.text);
          if (docId) {
            this.host.store.workspace.meta.setDocMeta(docId, {
              headerImage: source,
              headerImagePosition: source ? 50 : undefined,
              headerImagePositionX: source ? 50 : undefined,
              headerImagePositionY: source ? 50 : undefined,
              headerImageZoom: source ? 1.2 : undefined,
            });
          }
        },
        setRecordCoverTransform: (rowId, transform) => {
          const model = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          if (!model) return;
          this.host.store.updateBlock(model, {
            'meta:coverPosition': transform.y,
            'meta:galleryCoverPositionX': transform.x,
            'meta:galleryCoverPositionY': transform.y,
            'meta:galleryCoverZoom': transform.zoom,
          });
        },
        duplicateRecord: async rowId => {
          const source = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          if (!source) return;
          const sourceIndex = this.model.children.findIndex(
            child => child.id === rowId
          );
          const duplicateId = dataSource.rowAdd(sourceIndex + 1);
          const duplicate = this.host.store.getBlock(duplicateId)?.model as
            | ParagraphBlockModel
            | undefined;
          if (!duplicate) return;
          this.host.store.updateBlock(duplicate, {
            text: new Text(source.text?.toString() ?? ''),
            'meta:cover': source.props['meta:cover'],
            'meta:coverPosition': source.props['meta:coverPosition'],
            'meta:galleryCoverPositionX':
              source.props['meta:galleryCoverPositionX'],
            'meta:galleryCoverPositionY':
              source.props['meta:galleryCoverPositionY'],
            'meta:galleryCoverZoom': source.props['meta:galleryCoverZoom'],
            'meta:description': source.props['meta:description'],
          });
          dataSource.properties$.value.forEach(propertyId => {
            if (propertyId === 'title' || propertyId === 'type') return;
            const value = dataSource.cellValueGet(rowId, propertyId);
            if (value === undefined) return;
            try {
              dataSource.cellValueChange(
                duplicateId,
                propertyId,
                structuredClone(value)
              );
            } catch {
              dataSource.cellValueChange(duplicateId, propertyId, value);
            }
          });
          const sourceDocId = getSingleDocIdFromText(source.text);
          if (sourceDocId) {
            const workspace = this.host.store.workspace;
            const sourceDoc = workspace
              .getDoc(sourceDocId)
              ?.getStore({ id: sourceDocId });
            if (sourceDoc) {
              sourceDoc.load();
              const title =
                workspace.meta.getDocMeta(sourceDocId)?.title ??
                source.text?.toString() ??
                '';
              const duplicateDoc = createDefaultDoc(workspace, { title });
              const snapshot = sourceDoc
                .getTransformer()
                .sliceToSnapshot(
                  Slice.fromModels(sourceDoc, [
                    ...(sourceDoc.root?.children ?? []),
                  ])
                );
              if (snapshot && duplicateDoc.root) {
                duplicateDoc.root.children.forEach(child =>
                  duplicateDoc.deleteBlock(child)
                );
                await duplicateDoc
                  .getTransformer()
                  .snapshotToSlice(
                    snapshot,
                    duplicateDoc,
                    duplicateDoc.root.id
                  );
              }
              duplicate.text?.replace(
                0,
                duplicate.text.length,
                REFERENCE_NODE,
                {
                  reference: {
                    type: 'LinkedPage',
                    pageId: duplicateDoc.id,
                  },
                } satisfies AffineTextAttributes as BaseTextAttributes
              );
              const sourceMeta = workspace.meta.getDocMeta(sourceDocId);
              workspace.meta.setDocMeta(duplicateDoc.id, {
                title,
                headerImage: sourceMeta?.headerImage,
                headerImagePosition: sourceMeta?.headerImagePosition,
                headerImagePositionX: sourceMeta?.headerImagePositionX,
                headerImagePositionY: sourceMeta?.headerImagePositionY,
                headerImageZoom: sourceMeta?.headerImageZoom,
                description: sourceMeta?.description,
                databaseRecord: true,
                databaseRecordParentDocId: this.model.store.id,
                databaseRecordDatabaseId: this.model.id,
                databaseRecordRowId: duplicateId,
              });
            }
          }
          return duplicateId;
        },
        deleteRecord: rowId => {
          const row = this.host.store.getBlock(rowId)?.model as
            | ParagraphBlockModel
            | undefined;
          const docId = getSingleDocIdFromText(row?.text);
          if (docId) {
            this.host.store.workspace.meta.setDocMeta(docId, { trash: true });
          }
          dataSource.rowDelete([rowId]);
        },
      });
      this.std.provider
        .getAll(ExternalGroupByConfigProvider)
        .forEach(config => {
          dataSource.serviceSet(
            ExternalGroupByConfigProvider(config.name),
            config
          );
        });
      this.std.provider
        .getAll(CalendarExternalSourceProvider)
        .forEach(source => {
          dataSource.serviceSet(
            CalendarExternalSourceProvider(source.id),
            source
          );
        });
    });
    const id = currentViewStorage.getCurrentView(this.model.id);
    if (id && dataSource.viewManager.viewGet(id)) {
      dataSource.viewManager.setCurrentView(id);
    }
    return dataSource;
  });

  private readonly renderTitle = (dataViewLogic: DataViewUILogicBase) => {
    return html` <affine-database-title
      class="${databaseTitleStyles}"
      .titleText="${this.model.props.title}"
      .dataViewLogic="${dataViewLogic}"
    ></affine-database-title>`;
  };

  createTemplate = (
    data: {
      view: SingleView;
      rowId: string;
    },
    openDoc: (docId: string) => void
  ) => {
    return createRecordDetail({
      ...data,
      openDoc,
      detail: {
        header: uniMap(
          createUniComponentFromWebComponent(BlockRenderer),
          props => ({
            ...props,
            host: this.host,
          })
        ),
        note: uniMap(
          createUniComponentFromWebComponent(NoteRenderer),
          props => ({
            ...props,
            model: this.model,
            host: this.host,
          })
        ),
      },
    });
  };

  headerWidget: DataViewWidget = defineUniComponent(
    (props: DataViewWidgetProps) => {
      return html`
        <div class="${databaseHeaderContainerStyles}">
          <div class="${databaseTitleRowStyles}">
            ${this.renderTitle(props.dataViewLogic)} ${this.renderDatabaseOps()}
          </div>
          <div class="${databaseToolbarRowStyles} ${databaseHeaderBarStyles}">
            <div class="${databaseViewBarContainerStyles}">
              ${renderUniLit(widgetPresets.viewBar, {
                ...props,
                onChangeView: id => {
                  currentViewStorage.setCurrentView(this.blockId, id);
                },
              })}
            </div>
            ${renderUniLit(this.toolsWidget, props)}
          </div>
          ${renderUniLit(widgetPresets.quickSettingBar, props)}
        </div>
      `;
    }
  );

  indicator = new DropIndicator();

  onDrag = (evt: MouseEvent, id: string): (() => void) => {
    const result = getDropResult(evt);
    if (result && result.rect) {
      document.body.append(this.indicator);
      this.indicator.rect = Rect.fromLWTH(
        result.rect.left,
        result.rect.width,
        result.rect.top,
        result.rect.height
      );
      return () => {
        this.indicator.remove();
        const model = this.store.getBlock(id)?.model;
        const target = result.modelState.model;
        let parent = this.store.getParent(target.id);
        const shouldInsertIn = result.placement === 'in';
        if (shouldInsertIn) {
          parent = target;
        }
        if (model && target && parent) {
          if (shouldInsertIn) {
            this.store.moveBlocks([model], parent);
          } else {
            this.store.moveBlocks(
              [model],
              parent,
              target,
              result.placement === 'before'
            );
          }
        }
      };
    }
    this.indicator.remove();
    return () => {};
  };

  private readonly setSelection = (
    selection: DataViewSelection | undefined
  ) => {
    if (selection) {
      getSelection()?.removeAllRanges();
    }
    this.selection.setGroup(
      'note',
      selection
        ? [
            new DatabaseSelection({
              blockId: this.blockId,
              viewSelection: selection,
            }),
          ]
        : []
    );
  };

  private readonly toolsWidget: DataViewWidget = widgetPresets.createTools({
    table: [
      widgetPresets.tools.filter,
      widgetPresets.tools.sort,
      widgetPresets.tools.search,
      widgetPresets.tools.viewOptions,
      widgetPresets.tools.tableAddRow,
    ],
    kanban: [
      widgetPresets.tools.filter,
      widgetPresets.tools.sort,
      widgetPresets.tools.search,
      widgetPresets.tools.viewOptions,
      widgetPresets.tools.tableAddRow,
    ],
    calendar: [
      widgetPresets.tools.filter,
      widgetPresets.tools.search,
      widgetPresets.tools.viewOptions,
      widgetPresets.tools.tableAddRow,
    ],
    gallery: [
      widgetPresets.tools.filter,
      widgetPresets.tools.sort,
      widgetPresets.tools.search,
      widgetPresets.tools.viewOptions,
      widgetPresets.tools.tableAddRow,
    ],
  });

  private readonly viewSelection$ = computed(() => {
    const databaseSelection = this.selection.value.find(
      (selection): selection is DatabaseSelection => {
        if (selection.blockId !== this.blockId) {
          return false;
        }
        return selection instanceof DatabaseSelection;
      }
    );
    return databaseSelection?.viewSelection;
  });

  private readonly virtualPadding$ = signal(0);

  get optionsConfig(): DatabaseViewExtensionOptions {
    return {
      configure: (_model, options) => options,
      ...this.std.getOptional(DatabaseConfigExtension.identifier),
    };
  }

  get isCommentHighlighted() {
    return (
      this.std
        .getOptional(BlockElementCommentManager)
        ?.isBlockCommentHighlighted(this.model) ?? false
    );
  }

  override get topContenteditableElement() {
    if (this.std.get(DocModeProvider).getEditorMode() === 'edgeless') {
      return this.closest<BlockComponent>(
        EDGELESS_TOP_CONTENTEDITABLE_SELECTOR
      );
    }
    return this.rootComponent;
  }

  private renderDatabaseOps() {
    if (this.dataSource.value.readonly$.value) {
      return nothing;
    }
    return html` <div
      data-testid="database-ops"
      class="${databaseOpsStyles}"
      @click="${this.clickDatabaseOps}"
    >
      ${MoreHorizontalIcon()}
    </div>`;
  }

  override connectedCallback() {
    super.connectedCallback();

    this.setAttribute(RANGE_SYNC_EXCLUDE_ATTR, 'true');
    this.classList.add(databaseBlockStyles);
    queueMicrotask(() => {
      this.ensureTrailingParagraph();
      this.markLinkedRowsAsDatabaseRecords();
    });
    this.listenFullWidthChange();
    this.handleMobileEditing();
    this.disposables.add(
      this.model.store.workspace.meta.docMetaUpdated.subscribe(() =>
        this.syncLinkedRowPageMetadata()
      )
    );
  }

  private markLinkedRowsAsDatabaseRecords() {
    const meta = this.model.store.workspace.meta;
    this.model.children.forEach(row => {
      const docId = getSingleDocIdFromText(row.text);
      if (!docId || meta.getDocMeta(docId)?.databaseRecord) return;
      meta.setDocMeta(docId, {
        databaseRecord: true,
        databaseRecordParentDocId: this.model.store.id,
        databaseRecordDatabaseId: this.model.id,
        databaseRecordRowId: row.id,
      });
    });
    this.syncLinkedRowPageMetadata();
  }

  private syncLinkedRowPageMetadata() {
    if (this.model.store.readonly) return;
    const meta = this.model.store.workspace.meta;
    this.model.children.forEach(row => {
      const docId = getSingleDocIdFromText(row.text);
      if (!docId) return;
      const docMeta = meta.getDocMeta(docId);
      if (!docMeta) return;
      const paragraph = row as ParagraphBlockModel;
      const nextCover = docMeta.headerImage;
      if (
        paragraph.props['meta:cover'] === nextCover &&
        paragraph.props['meta:description'] === docMeta.description
      ) {
        return;
      }
      this.model.store.updateBlock(paragraph, {
        'meta:cover': nextCover,
        'meta:description': docMeta.description,
      });
    });
  }

  private createGalleryRecordPage(rowId: string) {
    const row = this.model.store.getBlock(rowId)?.model as
      | ParagraphBlockModel
      | undefined;
    if (!row) return;
    const title = row.text?.toString() ?? '';
    const page = createDefaultDoc(this.model.store.workspace, { title });
    row.text?.replace(0, row.text.length, REFERENCE_NODE, {
      reference: {
        type: 'LinkedPage',
        pageId: page.id,
      },
    } satisfies AffineTextAttributes as BaseTextAttributes);
    this.model.store.workspace.meta.setDocMeta(page.id, {
      databaseRecord: true,
      databaseRecordParentDocId: this.model.store.id,
      databaseRecordDatabaseId: this.model.id,
      databaseRecordRowId: rowId,
      headerImage: row.props['meta:cover'],
      headerImagePosition: 50,
      headerImagePositionX: 50,
      headerImagePositionY: 50,
      headerImageZoom: 1.2,
    });
    return page.id;
  }

  private ensureTrailingParagraph() {
    const store = this.model.store;
    if (
      !this.isConnected ||
      store.readonly ||
      this.std.get(DocModeProvider).getEditorMode() === 'edgeless' ||
      store.getNext(this.model)
    ) {
      return;
    }
    const parent = store.getParent(this.model);
    if (!parent) return;
    store.addBlock('affine:paragraph', {}, parent.id);
  }

  listenFullWidthChange() {
    if (this.std.get(DocModeProvider).getEditorMode() === 'edgeless') {
      return;
    }
    this.disposables.add(
      autoUpdate(this.host, this, () => {
        const padding =
          this.getBoundingClientRect().left -
          this.host.getBoundingClientRect().left;
        this.virtualPadding$.value = Math.max(0, padding - 72);
      })
    );
  }

  handleMobileEditing() {
    if (!IS_MOBILE) return;

    let notifyClosed = true;
    const handler = () => {
      if (
        !this.std
          .get(FeatureFlagService)
          .getFlag('enable_mobile_database_editing')
      ) {
        const notification = this.std.getOptional(NotificationProvider);
        if (notification && notifyClosed) {
          notifyClosed = false;
          notification.notify({
            title: html`<div
              style=${styleMap({
                whiteSpace: 'wrap',
              })}
            >
              Mobile database editing is not supported yet. You can open it in
              experimental features, or edit it in desktop mode.
            </div>`,
            accent: 'warning',
            onClose: () => {
              notifyClosed = true;
            },
          });
        }
      }
    };

    this.disposables.addFromEvent(this, 'click', handler);
  }

  private readonly dataViewRootLogic = lazy(
    () =>
      new DataViewRootUILogic({
        virtualPadding$: this.virtualPadding$,
        bindHotkey: hotkeys => {
          return {
            dispose: this.host.event.bindHotkey(hotkeys, {
              blockId: this.topContenteditableElement?.blockId ?? this.blockId,
            }),
          };
        },
        handleEvent: (name, handler) => {
          return {
            dispose: this.host.event.add(name, handler, {
              blockId: this.blockId,
            }),
          };
        },
        selection$: this.viewSelection$,
        setSelection: this.setSelection,
        dataSource: this.dataSource.value,
        headerWidget: this.headerWidget,
        onDrag: this.onDrag,
        clipboard: this.std.clipboard,
        dnd: this.std.dnd,
        notification: {
          toast: message => {
            const notification = this.std.getOptional(NotificationProvider);
            if (notification) {
              notification.toast(message);
            } else {
              toast(this.host, message);
            }
          },
        },
        eventTrace: (key, params) => {
          const telemetryService = this.std.getOptional(TelemetryProvider);
          telemetryService?.track(key, {
            ...(params as TelemetryEventMap[typeof key]),
            blockId: this.blockId,
          });
        },
        detailPanelConfig: {
          openDetailPanel: (target, data) => {
            const peekViewService = this.std.getOptional(PeekViewProvider);
            if (peekViewService) {
              const openDoc = (docId: string) => {
                return peekViewService.peek({
                  docId,
                  databaseId: this.blockId,
                  databaseDocId: this.model.store.id,
                  databaseRowId: data.rowId,
                  target: this,
                });
              };
              const doc = getSingleDocIdFromText(
                this.model.store.getBlock(data.rowId)?.model?.text
              );
              if (doc) {
                return openDoc(doc);
              }
              if (data.view.type === 'gallery') {
                const pageId = this.createGalleryRecordPage(data.rowId);
                if (pageId) return openDoc(pageId);
              }
              const abort = new AbortController();
              return new Promise<void>(focusBack => {
                peekViewService
                  .peek(
                    {
                      target,
                      template: this.createTemplate(data, docId => {
                        // abort.abort();
                        openDoc(docId).then(focusBack).catch(focusBack);
                      }),
                    },
                    { abortSignal: abort.signal }
                  )
                  .then(focusBack)
                  .catch(focusBack);
              });
            } else {
              return popSideDetail(
                this.createTemplate(data, () => {
                  //
                })
              );
            }
          },
        },
      })
  );
  override renderBlock() {
    const widgets = html`${repeat(
      Object.entries(this.widgets),
      ([id]) => id,
      ([_, widget]) => widget
    )}`;

    return html`
      <div contenteditable="false" class="${databaseContentStyles}">
        ${this.dataViewRootLogic.value.render()} ${widgets}
      </div>
    `;
  }

  override accessor useZeroWidth = true;
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-database': DatabaseBlockComponent;
  }
}
