import { cssVarV2 } from '@toeverything/theme/v2';
import { globalStyle, style } from '@vanilla-extract/css';

export const root = style({
  containerType: 'inline-size',
});

export const editor = style({
  vars: {
    '--affine-editor-side-padding': '96px',
  },
  minHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
});

export const pageActions = style({
  position: 'sticky',
  top: 0,
  zIndex: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 6,
  minHeight: 48,
  padding: '8px 16px',
  boxSizing: 'border-box',
  borderBottom: `1px solid ${cssVarV2('layer/insideBorder/border')}`,
  background: cssVarV2('layer/background/primary'),
});

globalStyle(`[data-full-width-layout="true"] ${editor}`, {
  vars: {
    '--affine-editor-width': '100%',
    '--affine-editor-side-padding': '72px',
  },
});

export const affineDocViewport = style({
  display: 'flex',
  flexDirection: 'column',
  userSelect: 'none',
  containerName: 'viewport',
  containerType: 'inline-size',
  background: cssVarV2('layer/background/primary'),
});
