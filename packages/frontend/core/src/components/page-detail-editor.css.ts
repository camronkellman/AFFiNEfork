import { style } from '@vanilla-extract/css';

export const accessDenied = style({
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  minHeight: 320,
  padding: 32,
  color: 'var(--affine-text-secondary-color)',
  textAlign: 'center',
});

export const accessDeniedTitle = style({
  color: 'var(--affine-text-primary-color)',
  fontSize: 16,
});

export const editor = style({
  flex: 1,
  selectors: {
    '&.full-screen': {
      width: '100%',
      minWidth: 0,
      vars: {
        '--affine-editor-width': '100%',
        '--affine-editor-side-padding': '72px',
      },
    },
  },
  '@media': {
    'screen and (max-width: 800px)': {
      selectors: {
        '&.is-public': {
          vars: {
            '--affine-editor-width': '100%',
            '--affine-editor-side-padding': '24px',
          },
        },
      },
    },
  },
});

export const coverShell = style({
  position: 'relative',
  width: '100%',
  flexShrink: 0,
  overflow: 'hidden',
  selectors: {
    '&[data-repositioning]': {
      cursor: 'grab',
      touchAction: 'none',
      userSelect: 'none',
    },
    '&[data-repositioning]:active': {
      cursor: 'grabbing',
    },
  },
});

export const coverImage = style({
  display: 'block',
  width: '100%',
  height: 240,
  objectFit: 'cover',
  transformOrigin: 'center',
  willChange: 'transform, object-position',
});

export const coverActions = style({
  position: 'absolute',
  top: 14,
  right: 18,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 1,
  padding: 3,
  border: '1px solid rgba(255, 255, 255, 0.14)',
  borderRadius: 8,
  background: 'rgba(24, 24, 27, 0.82)',
  boxShadow: '0 4px 18px rgba(0, 0, 0, 0.24)',
  backdropFilter: 'blur(10px)',
  opacity: 0,
  pointerEvents: 'none',
  transition: 'opacity 120ms ease',
  selectors: {
    [`${coverShell}:hover &, ${coverShell}:focus-within &, ${coverShell}[data-repositioning] &`]:
      {
        opacity: 1,
        pointerEvents: 'auto',
      },
  },
});

export const coverAction = style({
  appearance: 'none',
  border: 0,
  borderRadius: 5,
  padding: '6px 10px',
  color: 'rgba(255,255,255,.88)',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      color: '#fff',
      background: 'rgba(255,255,255,.1)',
    },
  },
});

export const coverRepositionBar = style({
  position: 'absolute',
  left: '50%',
  bottom: 14,
  zIndex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '6px 8px 6px 12px',
  borderRadius: 8,
  color: '#fff',
  background: 'rgba(24, 24, 27, 0.86)',
  transform: 'translateX(-50%)',
  boxShadow: '0 4px 18px rgba(0,0,0,.25)',
});

export const coverPositionHint = style({
  fontSize: 12,
  lineHeight: '18px',
  pointerEvents: 'none',
});

export const coverZoomControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  paddingLeft: 8,
  borderLeft: '1px solid rgba(255,255,255,.14)',
});

export const coverZoomButton = style({
  width: 26,
  height: 26,
  padding: 0,
  border: 0,
  borderRadius: 5,
  color: '#fff',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 18,
  lineHeight: '26px',
  cursor: 'pointer',
  selectors: {
    '&:hover:not(:disabled)': {
      background: 'rgba(255,255,255,.1)',
    },
    '&:disabled': {
      color: 'rgba(255,255,255,.35)',
      cursor: 'default',
    },
  },
});

export const coverZoomValue = style({
  minWidth: 38,
  color: 'rgba(255,255,255,.78)',
  fontSize: 11,
  lineHeight: '18px',
  textAlign: 'center',
  pointerEvents: 'none',
});

export const coverAddRow = style({
  width: '100%',
  maxWidth: 'var(--affine-editor-width)',
  boxSizing: 'border-box',
  margin: '0 auto -28px',
  padding: '10px var(--affine-editor-side-padding, 24px) 0',
  position: 'relative',
  zIndex: 2,
  pointerEvents: 'none',
});

export const coverAddButton = style({
  appearance: 'none',
  border: 0,
  borderRadius: 5,
  padding: '5px 8px',
  color: 'var(--affine-text-disable-color)',
  background: 'transparent',
  fontFamily: 'inherit',
  fontSize: 12,
  lineHeight: '18px',
  cursor: 'pointer',
  pointerEvents: 'auto',
  opacity: 0,
  transition: 'opacity 120ms ease, background-color 120ms ease',
  selectors: {
    [`${coverAddRow}:hover &`]: { opacity: 1 },
    '&:focus-visible': { opacity: 1 },
    '&:hover': {
      color: 'var(--affine-text-primary-color)',
      background: 'var(--affine-hover-color)',
    },
  },
});
