import {
  Checkbox,
  ContextMenu,
  DragHandle as DragHandleIcon,
  Tooltip,
  useDraggable,
} from '@affine/component';
import { DocsService } from '@affine/core/modules/doc';
import { DocDisplayMetaService } from '@affine/core/modules/doc-display-meta';
import {
  WorkbenchLink,
  WorkbenchService,
} from '@affine/core/modules/workbench';
import type { AffineDNDData } from '@affine/core/types/dnd';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';
import type { DocMeta } from '@blocksuite/affine/store';
import {
  AutoTidyUpIcon,
  PropertyIcon,
  ResizeTidyUpIcon,
} from '@blocksuite/icons/rc';
import { LiveData, useLiveData, useService } from '@toeverything/infra';
import {
  type HTMLProps,
  memo,
  type ReactNode,
  type SVGProps,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { PagePreview } from '../../page-list/page-content-preview';
import { useCoverImageUrl } from '../../hooks/affine/use-cover-image-url';
import { DocExplorerContext } from '../context';
import { quickActions } from '../quick-actions.constants';
import * as styles from './doc-list-item.css';
import { MoreMenuButton, MoreMenuContent } from './more-menu';
import { CardViewProperties, ListViewProperties } from './properties';

const emptyDocMeta$ = new LiveData<Partial<DocMeta>>({});

type CardCoverDrag = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPositionX: number;
  startPositionY: number;
  width: number;
  height: number;
};

const clampCoverPosition = (value: number) => Math.min(100, Math.max(0, value));

export type DocListItemView = 'list' | 'grid' | 'masonry';

export const DocListViewIcon = ({
  view,
  ...props
}: { view: DocListItemView } & SVGProps<SVGSVGElement>) => {
  const Component = {
    list: PropertyIcon,
    grid: ResizeTidyUpIcon,
    masonry: AutoTidyUpIcon,
  }[view];

  return <Component {...props} />;
};

export interface DocListItemProps {
  docId: string;
  groupId: string;
}

class MixId {
  static connector = '||';
  static create(groupId: string, docId: string) {
    return `${groupId}${this.connector}${docId}`;
  }
  static parse(mixId: string) {
    if (!mixId) {
      return { groupId: null, docId: null };
    }
    const [groupId, docId] = mixId.split(this.connector);
    return { groupId, docId };
  }
}
export const DocListItem = ({ ...props }: DocListItemProps) => {
  const workbench = useService(WorkbenchService).workbench;
  const contextValue = useContext(DocExplorerContext);
  const view = useLiveData(contextValue.view$) ?? 'list';
  const groups = useLiveData(contextValue.groups$);
  const selectMode = useLiveData(contextValue.selectMode$);
  const selectedDocIds = useLiveData(contextValue.selectedDocIds$);
  const prevCheckAnchorId = useLiveData(contextValue.prevCheckAnchorId$);

  const handleMultiSelect = useCallback(
    (prevCursor: string, currCursor: string) => {
      const flattenList = groups.flatMap(group =>
        group.items.map(docId => MixId.create(group.key, docId))
      );

      const prev = contextValue.selectedDocIds$?.value ?? [];
      const prevIndex = flattenList.indexOf(prevCursor);
      const currIndex = flattenList.indexOf(currCursor);

      const lowerIndex = Math.min(prevIndex, currIndex);
      const upperIndex = Math.max(prevIndex, currIndex);

      const resSet = new Set(prev);
      const handledSet = new Set<string>();
      for (let i = lowerIndex; i <= upperIndex; i++) {
        const mixId = flattenList[i];
        const { groupId, docId } = MixId.parse(mixId);
        if (groupId === null || docId === null) {
          continue;
        }
        if (handledSet.has(docId) || mixId === prevCursor) {
          continue;
        }
        if (resSet.has(docId)) {
          resSet.delete(docId);
        } else {
          resSet.add(docId);
        }
        handledSet.add(docId);
      }

      contextValue.selectedDocIds$?.next(Array.from(resSet));
      contextValue.prevCheckAnchorId$?.next(currCursor);
    },
    [contextValue, groups]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<Element>) => {
      const { docId, groupId } = props;
      const currCursor = MixId.create(groupId, docId);
      if (selectMode || e.shiftKey) {
        e.preventDefault();
      }

      if (selectMode) {
        if (e.shiftKey && prevCheckAnchorId) {
          // do multi select
          handleMultiSelect(prevCheckAnchorId, currCursor);
        } else {
          contextValue.selectedDocIds$?.next(
            contextValue.selectedDocIds$.value.includes(docId)
              ? contextValue.selectedDocIds$.value.filter(id => id !== docId)
              : [...contextValue.selectedDocIds$.value, docId]
          );
          contextValue.prevCheckAnchorId$?.next(currCursor);
        }
      } else {
        if (e.shiftKey) {
          contextValue.selectMode$?.next(true);
          contextValue.selectedDocIds$?.next([docId]);
          contextValue.prevCheckAnchorId$?.next(currCursor);
          return;
        } else {
          // The compiled module uses an in-memory router inside HALO. Cancel
          // the anchor immediately so the browser never leaves the CRM route,
          // then replace the active workbench route deterministically.
          e.preventDefault();
          e.stopPropagation();
          track.allDocs.list.doc.openDoc();
          workbench.openDoc(docId, {
            at: 'active',
            replaceHistory: true,
          });
          return;
        }
      }
    },
    [
      contextValue,
      handleMultiSelect,
      prevCheckAnchorId,
      props,
      selectMode,
      workbench,
    ]
  );

  const { dragRef, CustomDragPreview } = useDraggable<AffineDNDData>(
    () => ({
      canDrag: true,
      data: {
        entity: {
          type: 'doc',
          id: props.docId as string,
        },
        from: {
          at: 'all-docs:list',
        },
      },
    }),
    [props.docId]
  );

  return (
    <>
      <WorkbenchLink
        ref={dragRef}
        draggable={false}
        to={`/${props.docId}`}
        onClick={handleClick}
        data-selected={selectedDocIds.includes(props.docId)}
        className={styles.root}
        data-testid={`doc-list-item`}
        data-doc-id={props.docId}
      >
        {view === 'list' ? (
          <ListViewDoc {...props} />
        ) : (
          <CardViewDoc {...props} />
        )}
      </WorkbenchLink>
      <CustomDragPreview>
        <div className={styles.dragPreview}>
          <RawDocIcon id={props.docId} className={styles.dragPreviewIcon} />
          <RawDocTitle id={props.docId} />
        </div>
      </CustomDragPreview>
    </>
  );
};

const RawDocIcon = memo(function RawDocIcon({
  id,
  ...props
}: HTMLProps<SVGSVGElement>) {
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const Icon = useLiveData(id ? docDisplayMetaService.icon$(id) : null);
  return <Icon {...props} />;
});
const RawDocTitle = memo(function RawDocTitle({ id }: { id: string }) {
  const docDisplayMetaService = useService(DocDisplayMetaService);
  const title = useLiveData(docDisplayMetaService.title$(id));
  return title;
});
const RawDocPreview = memo(function RawDocPreview({
  id,
  loading,
}: {
  id: string;
  loading?: ReactNode;
}) {
  return <PagePreview pageId={id} fallback={loading} />;
});
const DragHandle = memo(function DragHandle({
  id,
  ...props
}: HTMLProps<HTMLDivElement>) {
  const contextValue = useContext(DocExplorerContext);
  const selectMode = useLiveData(contextValue.selectMode$);
  const showDragHandle = useLiveData(contextValue.showDragHandle$);

  if (selectMode || !id || !showDragHandle) {
    return null;
  }

  return (
    <div {...props}>
      <DragHandleIcon />
    </div>
  );
});
const Select = memo(function Select({
  id,
  ...props
}: HTMLProps<HTMLDivElement>) {
  const contextValue = useContext(DocExplorerContext);
  const selectMode = useLiveData(contextValue.selectMode$);
  const selectedDocIds = useLiveData(contextValue.selectedDocIds$);

  const handleSelectChange = useCallback(() => {
    id && contextValue.selectedDocIds$?.next([id]);
  }, [id, contextValue]);

  if (!id) {
    return null;
  }

  return (
    <div
      data-select-mode={selectMode}
      data-testid={`doc-list-item-select`}
      {...props}
    >
      <Checkbox
        checked={selectedDocIds.includes(id)}
        onChange={handleSelectChange}
      />
    </div>
  );
});
// Different with RawDocIcon, refer to `ExplorerDisplayPreference.showDocIcon`
const DocIcon = memo(function DocIcon({
  id,
  ...props
}: HTMLProps<HTMLDivElement>) {
  const contextValue = useContext(DocExplorerContext);
  const showDocIcon = useLiveData(contextValue.showDocIcon$);
  if (!showDocIcon) {
    return null;
  }
  return (
    <div {...props}>
      <RawDocIcon id={id} />
    </div>
  );
});
const DocTitle = memo(function DocTitle({
  id,
  ...props
}: HTMLProps<HTMLDivElement>) {
  if (!id) return null;
  return (
    <div {...props}>
      <RawDocTitle id={id} />
    </div>
  );
});
const DocPreview = memo(function DocPreview({
  id,
  loading,
  ...props
}: HTMLProps<HTMLDivElement> & { loading?: ReactNode }) {
  const contextValue = useContext(DocExplorerContext);
  const showDocPreview = useLiveData(contextValue.showDocPreview$);

  if (!id || !showDocPreview) return null;

  return (
    <div {...props}>
      <RawDocPreview id={id} loading={loading} />
    </div>
  );
});

const listMoreMenuContentOptions = {
  side: 'bottom',
  align: 'end',
  sideOffset: 12,
  alignOffset: -4,
} as const;
export const ListViewDoc = ({ docId }: DocListItemProps) => {
  const t = useI18n();
  const docsService = useService(DocsService);
  const doc = useLiveData(docsService.list.doc$(docId));
  const contextValue = useContext(DocExplorerContext);
  const showMoreOperation = useLiveData(contextValue.showMoreOperation$);

  if (!doc) {
    return null;
  }

  return (
    <ContextMenu
      asChild
      disabled={!showMoreOperation}
      items={<MoreMenuContent docId={docId} />}
    >
      <li className={styles.listViewRoot}>
        <DragHandle id={docId} className={styles.listDragHandle} />
        <Select id={docId} className={styles.listSelect} />
        <DocIcon id={docId} className={styles.listIcon} />
        <div className={styles.listBrief}>
          <DocTitle
            id={docId}
            className={styles.listTitle}
            data-testid="doc-list-item-title"
          />
          <DocPreview id={docId} className={styles.listPreview} />
        </div>
        <div className={styles.listSpace} />
        <ListViewProperties docId={docId} />
        {quickActions.map(action => {
          return (
            <Tooltip key={action.key} content={t.t(action.name)}>
              <action.Component doc={doc} />
            </Tooltip>
          );
        })}
        <MoreMenuButton
          docId={docId}
          contentOptions={listMoreMenuContentOptions}
        />
      </li>
    </ContextMenu>
  );
};

const cardMoreMenuContentOptions = {
  side: 'bottom',
  align: 'end',
  sideOffset: 12,
  alignOffset: -4,
} as const;

export const CardViewDoc = ({ docId }: DocListItemProps) => {
  const t = useI18n();
  const contextValue = useContext(DocExplorerContext);
  const selectMode = useLiveData(contextValue.selectMode$);
  const docsService = useService(DocsService);
  const doc = useLiveData(docsService.list.doc$(docId));
  const docMeta = useLiveData(doc?.meta$ ?? emptyDocMeta$);
  const showMoreOperation = useLiveData(contextValue.showMoreOperation$);
  const coverDragRef = useRef<CardCoverDrag | null>(null);
  const coverPositionRef = useRef({ x: 50, y: 50 });
  const [adjustingCover, setAdjustingCover] = useState(false);
  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [coverZoom, setCoverZoom] = useState(1.2);
  const coverUrl = useCoverImageUrl(
    docMeta.headerImage,
    doc?.blockSuiteDoc?.blobSync
  );

  useEffect(() => {
    const x = docMeta.headerImagePositionX ?? 50;
    const y = docMeta.headerImagePositionY ?? docMeta.headerImagePosition ?? 50;
    coverPositionRef.current = { x, y };
    setCoverPositionX(x);
    setCoverPositionY(y);
    setCoverZoom(docMeta.headerImageZoom ?? 1.2);
  }, [
    docMeta.headerImage,
    docMeta.headerImagePosition,
    docMeta.headerImagePositionX,
    docMeta.headerImagePositionY,
    docMeta.headerImageZoom,
  ]);

  const startCoverAdjustment = useCallback(() => {
    setAdjustingCover(true);
  }, []);

  const stopCardEvent = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const startCoverDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!adjustingCover) return;
      if ((event.target as HTMLElement).closest('button')) return;
      stopCardEvent(event);
      const bounds = event.currentTarget.getBoundingClientRect();
      coverDragRef.current = {
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startPositionX: coverPositionX,
        startPositionY: coverPositionY,
        width: bounds.width,
        height: bounds.height,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [adjustingCover, coverPositionX, coverPositionY, stopCardEvent]
  );

  const moveCover = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = coverDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      stopCardEvent(event);
      const deltaX = ((event.clientX - drag.startClientX) / drag.width) * 500;
      const deltaY = ((event.clientY - drag.startClientY) / drag.height) * 100;
      const x = clampCoverPosition(drag.startPositionX - deltaX);
      const y = clampCoverPosition(drag.startPositionY - deltaY);
      coverPositionRef.current = { x, y };
      setCoverPositionX(x);
      setCoverPositionY(y);
    },
    [stopCardEvent]
  );

  const finishCoverDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = coverDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      stopCardEvent(event);
      coverDragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const { x, y } = coverPositionRef.current;
      doc?.record.setMeta({
        headerImagePosition: y,
        headerImagePositionX: x,
        headerImagePositionY: y,
      });
    },
    [doc, stopCardEvent]
  );

  const changeCoverZoom = useCallback(
    (event: React.MouseEvent, delta: number) => {
      stopCardEvent(event);
      const nextZoom = Math.min(
        2,
        Math.max(1, Number((coverZoom + delta).toFixed(1)))
      );
      setCoverZoom(nextZoom);
      doc?.record.setMeta({ headerImageZoom: nextZoom });
    },
    [coverZoom, doc, stopCardEvent]
  );

  const finishCoverAdjustment = useCallback(
    (event: React.MouseEvent) => {
      stopCardEvent(event);
      setAdjustingCover(false);
    },
    [stopCardEvent]
  );

  const coverTranslateX = ((50 - coverPositionX) / 50) * ((coverZoom - 1) * 50);

  if (!doc) {
    return null;
  }

  return (
    <ContextMenu
      asChild
      disabled={!showMoreOperation}
      items={
        <MoreMenuContent
          docId={docId}
          hasCover={!!docMeta.headerImage}
          onAdjustCover={startCoverAdjustment}
        />
      }
    >
      <li className={styles.cardViewRoot}>
        <DragHandle id={docId} className={styles.cardDragHandle} />
        {docMeta.headerImage && coverUrl ? (
          <div
            className={styles.cardViewCoverViewport}
            data-adjusting={adjustingCover || undefined}
            onClick={adjustingCover ? stopCardEvent : undefined}
            onPointerDown={startCoverDrag}
            onPointerMove={moveCover}
            onPointerUp={finishCoverDrag}
            onPointerCancel={finishCoverDrag}
          >
            <img
              className={styles.cardViewCover}
              src={coverUrl}
              alt=""
              draggable={false}
              style={{
                objectPosition: `center ${coverPositionY}%`,
                transform: `translateX(${coverTranslateX}%) scale(${coverZoom})`,
              }}
            />
            {adjustingCover ? (
              <div className={styles.cardCoverControls}>
                <button
                  className={styles.cardCoverControlButton}
                  type="button"
                  aria-label="Zoom cover out"
                  disabled={coverZoom <= 1}
                  onClick={event => changeCoverZoom(event, -0.1)}
                >
                  −
                </button>
                <span className={styles.cardCoverZoomValue}>
                  {Math.round(coverZoom * 100)}%
                </span>
                <button
                  className={styles.cardCoverControlButton}
                  type="button"
                  aria-label="Zoom cover in"
                  disabled={coverZoom >= 2}
                  onClick={event => changeCoverZoom(event, 0.1)}
                >
                  +
                </button>
                <button
                  className={styles.cardCoverDoneButton}
                  type="button"
                  onClick={finishCoverAdjustment}
                >
                  Done
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        <header className={styles.cardViewHeader}>
          <DocIcon id={docId} className={styles.cardViewIcon} />
          <DocTitle
            id={docId}
            className={styles.cardViewTitle}
            data-testid="doc-list-item-title"
          />
        </header>
        {docMeta.description ? (
          <div className={styles.cardPreviewContainer}>
            {docMeta.description}
          </div>
        ) : null}
        <footer className={styles.cardViewFooter}>
          <CardViewProperties docId={docId} />
          <div className={styles.cardViewActions}>
            {quickActions.map(action => {
              return (
                <Tooltip key={action.key} content={t.t(action.name)}>
                  <action.Component size="16" doc={doc} />
                </Tooltip>
              );
            })}
            {selectMode ? (
              <Select id={docId} className={styles.cardViewCheckbox} />
            ) : (
              <MoreMenuButton
                docId={docId}
                hasCover={!!docMeta.headerImage}
                onAdjustCover={startCoverAdjustment}
                contentOptions={cardMoreMenuContentOptions}
                iconProps={{ size: '16' }}
              />
            )}
          </div>
        </footer>
      </li>
    </ContextMenu>
  );
};
