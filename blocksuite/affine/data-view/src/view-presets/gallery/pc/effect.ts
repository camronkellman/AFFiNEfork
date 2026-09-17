import { GalleryCard, GalleryViewUI } from './view.js';

export function pcEffects() {
  if (!customElements.get('affine-data-view-gallery')) {
    customElements.define('affine-data-view-gallery', GalleryViewUI);
  }
  if (!customElements.get('affine-data-view-gallery-card')) {
    customElements.define('affine-data-view-gallery-card', GalleryCard);
  }
}
