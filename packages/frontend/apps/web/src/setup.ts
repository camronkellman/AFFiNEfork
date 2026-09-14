import '@affine/core/bootstrap/browser';
import '@affine/core/bootstrap/cleanup';
import '@affine/component/theme';

import { viewportRuntimeConfig } from '@blocksuite/affine/std/gfx';

const isHaloDocsEmbedded = (
  globalThis as typeof globalThis & {
    __HALO_DOCS_COMPILED_PACKAGE__?: boolean;
  }
).__HALO_DOCS_COMPILED_PACKAGE__;

// The full Getting Started canvas contains many live blocks, connectors and
// images. When embedded, defer their expensive per-element refreshes while a
// pan/zoom gesture is active and move the scene with one compositor transform.
// The final native render is restored immediately after the gesture.
if (isHaloDocsEmbedded) {
  viewportRuntimeConfig.VIEWPORT_REFRESH_PIXEL_THRESHOLD = 60;
  viewportRuntimeConfig.VIEWPORT_REFRESH_MAX_INTERVAL = 300;
  viewportRuntimeConfig.SKIP_REFRESH_DURING_GESTURE = true;
  viewportRuntimeConfig.POST_GESTURE_REFRESH_DELAY = 220;
  viewportRuntimeConfig.CANVAS_DPR_CAP_BY_ZOOM = [
    [0.25, 1],
    [0.5, 1.5],
    [0.8, 2],
  ];
}
