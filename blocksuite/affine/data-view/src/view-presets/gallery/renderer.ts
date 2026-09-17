import './pc/effect.js';

import { createIcon } from '../../core/utils/uni-icon.js';
import { galleryViewModel } from './define.js';
import { GalleryViewUILogic } from './pc/view.js';

export const galleryViewMeta = galleryViewModel.createMeta({
  icon: createIcon('ImageIcon'),
  pcLogic: () => GalleryViewUILogic,
});
