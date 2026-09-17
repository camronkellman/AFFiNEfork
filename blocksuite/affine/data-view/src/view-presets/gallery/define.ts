import type { FilterGroup } from '../../core/filter/types.js';
import type { Sort } from '../../core/sort/types.js';
import { type BasicViewDataType, viewType } from '../../core/view/data-view.js';
import { GallerySingleView } from './gallery-view-manager.js';

export const galleryViewType = viewType('gallery');

export type GalleryCardSize = 'small' | 'medium' | 'large';

export type GalleryViewData = BasicViewDataType<
  typeof galleryViewType.type,
  {
    columns: Array<{ id: string; width: number; hide?: boolean }>;
    filter: FilterGroup;
    sort?: Sort;
    header?: {
      titleColumn?: string;
      iconColumn?: string;
      imageColumn?: string;
    };
    card: {
      size: GalleryCardSize;
      coverColumnId?: string;
    };
  }
>;

export const galleryViewModel = galleryViewType.createModel<GalleryViewData>({
  defaultName: 'Gallery View',
  dataViewManager: GallerySingleView,
  defaultData: viewManager => {
    const properties = viewManager.dataSource.properties$.value;
    const coverColumnId = properties.find(id => {
      const type = viewManager.dataSource.propertyTypeGet(id);
      return type === 'image' || type === 'attachment';
    });
    return {
      columns: properties.map(id => ({ id, width: 200 })),
      filter: {
        type: 'group',
        op: 'and',
        conditions: [],
      },
      header: {
        titleColumn: properties.find(
          id => viewManager.dataSource.propertyTypeGet(id) === 'title'
        ),
        iconColumn: 'type',
        imageColumn: coverColumnId,
      },
      card: {
        size: 'medium',
        coverColumnId,
      },
    };
  },
});
