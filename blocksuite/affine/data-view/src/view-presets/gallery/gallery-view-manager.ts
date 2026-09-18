import { createIdentifier } from '@blocksuite/global/di';
import { computed, type ReadonlySignal } from '@preact/signals-core';

import type { Property } from '../../core/view-manager/property.js';
import type { ViewManager } from '../../core/view-manager/view-manager.js';
import { TableSingleView } from '../table/table-view-manager.js';
import type { GalleryCardSize, GalleryViewData } from './define.js';

export interface GalleryCoverResolver {
  resolve(value: unknown): Promise<string | undefined>;
  recordCover?(rowId: string):
    | {
        source$: ReadonlySignal<string | undefined>;
        position$: ReadonlySignal<number | undefined>;
        positionX$: ReadonlySignal<number | undefined>;
        positionY$: ReadonlySignal<number | undefined>;
        zoom$: ReadonlySignal<number | undefined>;
      }
    | undefined;
  recordDescription?(rowId: string): ReadonlySignal<string | undefined>;
  setRecordCover?(rowId: string, source?: string): void;
  setRecordCoverTransform?(
    rowId: string,
    transform: { x: number; y: number; zoom: number }
  ): void;
  duplicateRecord?(
    rowId: string
  ): string | undefined | Promise<string | undefined>;
  deleteRecord?(rowId: string): void;
}

export const GalleryCoverProvider = createIdentifier<GalleryCoverResolver>(
  'GalleryCoverProvider'
);

export class GallerySingleView extends TableSingleView {
  private get galleryData() {
    return this.data$.value as unknown as GalleryViewData | undefined;
  }

  cardSize$ = computed<GalleryCardSize>(
    () => this.galleryData?.card?.size ?? 'medium'
  );

  coverColumnId$ = computed(() => {
    const configured =
      this.galleryData?.card?.coverColumnId ??
      this.galleryData?.header?.imageColumn;
    if (configured && this.dataSource.properties$.value.includes(configured)) {
      return configured;
    }
    return this.dataSource.properties$.value.find(id => {
      const type = this.dataSource.propertyTypeGet(id);
      return type === 'image' || type === 'attachment';
    });
  });

  cardProperties$ = computed(() => {
    const title = this.titleProperty?.id;
    const icon = this.iconProperty?.id;
    const cover = this.coverColumnId$.value;
    return this.properties$.value.filter(
      property =>
        property.id !== title && property.id !== icon && property.id !== cover
    );
  });

  setCardSize(size: GalleryCardSize) {
    this.dataUpdate(() => ({ card: { ...this.galleryData?.card, size } }));
  }

  setCoverColumn(columnId?: string) {
    this.dataUpdate(() => ({
      card: {
        size: this.galleryData?.card?.size ?? 'medium',
        coverColumnId: columnId,
      },
      header: {
        ...this.galleryData?.header,
        imageColumn: columnId,
      },
    }));
  }

  get titleProperty(): Property | undefined {
    const configured = this.mainProperties$.value.titleColumn;
    const id =
      (configured && this.dataSource.properties$.value.includes(configured)
        ? configured
        : undefined) ??
      this.propertiesRaw$.value.find(
        property => property.type$.value === 'title'
      )?.id;
    return id ? this.propertyGetOrCreate(id) : undefined;
  }

  get iconProperty(): Property | undefined {
    const configured = this.mainProperties$.value.iconColumn;
    const id =
      (configured && this.dataSource.properties$.value.includes(configured)
        ? configured
        : undefined) ??
      (this.dataSource.properties$.value.includes('type') ? 'type' : undefined);
    return id ? this.propertyGetOrCreate(id) : undefined;
  }

  get coverProperty(): Property | undefined {
    const id = this.coverColumnId$.value;
    return id ? this.propertyGetOrCreate(id) : undefined;
  }

  constructor(viewManager: ViewManager, viewId: string) {
    super(viewManager, viewId);
  }
}
