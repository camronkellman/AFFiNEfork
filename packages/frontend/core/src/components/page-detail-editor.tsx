import './page-detail-editor.css';

import { ImageIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { AffineEditorContainer } from '../blocksuite/block-suite-editor';
import { BlockSuiteEditor } from '../blocksuite/block-suite-editor';
import { DocService } from '../modules/doc';
import { EditorService } from '../modules/editor';
import { EditorSettingService } from '../modules/editor-setting';
import { useCoverImageUrl } from './hooks/affine/use-cover-image-url';
import * as styles from './page-detail-editor.css';

declare global {
  // oxlint-disable-next-line no-var
  var currentEditor: AffineEditorContainer | undefined;
}

export type OnLoadEditor = (
  editor: AffineEditorContainer
) => (() => void) | void;

export interface PageDetailEditorProps {
  onLoad?: OnLoadEditor;
  readonly?: boolean;
}

type DocMetaWithHeaderImage = {
  headerImage?: string;
  headerImagePosition?: number;
  headerImagePositionX?: number;
  headerImagePositionY?: number;
  headerImageZoom?: number;
};

type CoverDrag = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startPositionX: number;
  startPositionY: number;
  width: number;
  height: number;
};

const clampPosition = (value: number) => Math.min(100, Math.max(0, value));

export const PageDetailEditor = ({
  onLoad,
  readonly,
}: PageDetailEditorProps) => {
  const editor = useService(EditorService).editor;
  const mode = useLiveData(editor.mode$);
  const defaultOpenProperty = useLiveData(editor.defaultOpenProperty$);

  const doc = useService(DocService).doc;
  const docMeta = useLiveData(doc.meta$) as DocMetaWithHeaderImage | null;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverDragRef = useRef<CoverDrag | null>(null);
  const coverPositionRef = useRef({ x: 50, y: 50 });
  const [repositioning, setRepositioning] = useState(false);
  const [coverPositionX, setCoverPositionX] = useState(50);
  const [coverPositionY, setCoverPositionY] = useState(50);
  const [coverZoom, setCoverZoom] = useState(1.2);
  const coverUrl = useCoverImageUrl(
    docMeta?.headerImage,
    editor.doc.blockSuiteDoc.blobSync
  );
  const pageWidth = useLiveData(doc.properties$.selector(p => p.pageWidth));

  const isSharedMode = editor.isSharedMode;
  const editorSetting = useService(EditorSettingService).editorSetting;
  const settings = useLiveData(
    editorSetting.settings$.selector(s => ({
      fontFamily: s.fontFamily,
      customFontFamily: s.customFontFamily,
      fullWidthLayout: s.fullWidthLayout,
    }))
  );
  const fullWidthLayout = pageWidth
    ? pageWidth === 'fullWidth'
    : settings.fullWidthLayout;

  useEffect(() => {
    editor.doc.blockSuiteDoc.readonly = readonly ?? false;
  }, [editor, readonly]);

  useEffect(() => {
    const x = docMeta?.headerImagePositionX ?? 50;
    const y =
      docMeta?.headerImagePositionY ?? docMeta?.headerImagePosition ?? 50;
    coverPositionRef.current = { x, y };
    setCoverPositionX(x);
    setCoverPositionY(y);
    setCoverZoom(docMeta?.headerImageZoom ?? 1.2);
  }, [
    docMeta?.headerImage,
    docMeta?.headerImagePosition,
    docMeta?.headerImagePositionX,
    docMeta?.headerImagePositionY,
    docMeta?.headerImageZoom,
  ]);

  useEffect(() => {
    if (mode !== 'page') {
      coverDragRef.current = null;
      setRepositioning(false);
    }
  }, [mode]);

  const chooseCover = useCallback(() => {
    coverInputRef.current?.click();
  }, []);

  const onCoverSelected = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      try {
        const blobId = await editor.doc.blockSuiteDoc.blobSync.set(file);
        doc.record.setMeta({
          headerImage: blobId,
          headerImagePosition: 50,
          headerImagePositionX: 50,
          headerImagePositionY: 50,
          headerImageZoom: 1.2,
        });
      } catch (error) {
        console.error('Failed to save page cover', error);
      }
    },
    [doc, editor.doc.blockSuiteDoc.blobSync]
  );

  const removeCover = useCallback(() => {
    setRepositioning(false);
    doc.record.setMeta({
      headerImage: undefined,
      headerImagePosition: undefined,
      headerImagePositionX: undefined,
      headerImagePositionY: undefined,
      headerImageZoom: undefined,
    });
  }, [doc]);

  const startCoverDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!repositioning) return;
      if ((event.target as HTMLElement).closest('button')) return;
      event.preventDefault();
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
    [coverPositionX, coverPositionY, repositioning]
  );

  const moveCover = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const drag = coverDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const deltaX = ((event.clientX - drag.startClientX) / drag.width) * 500;
    const deltaY = ((event.clientY - drag.startClientY) / drag.height) * 100;
    const x = clampPosition(drag.startPositionX - deltaX);
    const y = clampPosition(drag.startPositionY - deltaY);
    coverPositionRef.current = { x, y };
    setCoverPositionX(x);
    setCoverPositionY(y);
  }, []);

  const finishCoverDrag = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const drag = coverDragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      coverDragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      const { x, y } = coverPositionRef.current;
      doc.record.setMeta({
        headerImagePosition: y,
        headerImagePositionX: x,
        headerImagePositionY: y,
      });
    },
    [doc]
  );

  const showPageCover = mode === 'page';
  const coverTranslateX = ((50 - coverPositionX) / 50) * ((coverZoom - 1) * 50);

  const changeCoverZoom = useCallback(
    (delta: number) => {
      const nextZoom = Math.min(
        2,
        Math.max(0.5, Number((coverZoom + delta).toFixed(1)))
      );
      setCoverZoom(nextZoom);
      doc.record.setMeta({ headerImageZoom: nextZoom });
    },
    [coverZoom, doc]
  );

  return (
    <>
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onCoverSelected}
      />
      {showPageCover && docMeta?.headerImage && coverUrl ? (
        <div
          className={styles.coverShell}
          data-repositioning={repositioning || undefined}
          onPointerDown={startCoverDrag}
          onPointerMove={moveCover}
          onPointerUp={finishCoverDrag}
          onPointerCancel={finishCoverDrag}
        >
          <img
            className={styles.coverImage}
            src={coverUrl}
            alt="Document cover"
            draggable={false}
            style={{
              objectPosition: `center ${coverPositionY}%`,
              transform: `translateX(${coverTranslateX}%) scale(${coverZoom})`,
            }}
          />
          {!readonly && (
            <>
              <div className={styles.coverActions}>
                <button className={styles.coverAction} onClick={chooseCover}>
                  Change
                </button>
                <button
                  className={styles.coverAction}
                  onClick={() => setRepositioning(value => !value)}
                >
                  {repositioning ? 'Done' : 'Reposition'}
                </button>
                <button className={styles.coverAction} onClick={removeCover}>
                  Remove
                </button>
              </div>
              {repositioning && (
                <div className={styles.coverRepositionBar}>
                  <span className={styles.coverPositionHint}>
                    Drag the image to reposition
                  </span>
                  <span className={styles.coverZoomControls}>
                    <button
                      className={styles.coverZoomButton}
                      type="button"
                      aria-label="Zoom cover out"
                      disabled={coverZoom <= 0.5}
                      onClick={() => changeCoverZoom(-0.1)}
                    >
                      −
                    </button>
                    <span className={styles.coverZoomValue}>
                      {Math.round(coverZoom * 100)}%
                    </span>
                    <button
                      className={styles.coverZoomButton}
                      type="button"
                      aria-label="Zoom cover in"
                      disabled={coverZoom >= 2}
                      onClick={() => changeCoverZoom(0.1)}
                    >
                      +
                    </button>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

      <BlockSuiteEditor
        className={clsx(styles.editor, {
          'full-screen': !isSharedMode && fullWidthLayout,
          'is-public': isSharedMode,
        })}
        mode={mode}
        defaultOpenProperty={defaultOpenProperty}
        page={editor.doc.blockSuiteDoc}
        shared={isSharedMode}
        readonly={readonly}
        headerAction={
          showPageCover && !readonly && !docMeta?.headerImage ? (
            <button
              type="button"
              className={styles.coverAddButton}
              onClick={chooseCover}
            >
              <ImageIcon className={styles.coverAddIcon} />
              <span>Add cover</span>
            </button>
          ) : undefined
        }
        onEditorReady={onLoad}
      />
    </>
  );
};
