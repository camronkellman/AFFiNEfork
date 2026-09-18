import { style } from '@vanilla-extract/css';

export const value = style({
  width: '100%',
});

export const trigger = style({
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minWidth: 0,
  padding: '4px 8px',
  border: 0,
  borderRadius: 4,
  color: 'var(--affine-text-primary-color)',
  background: 'transparent',
  font: 'inherit',
  lineHeight: '20px',
  textAlign: 'left',
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      background: 'var(--affine-hover-color)',
    },
    '&:disabled': {
      cursor: 'default',
    },
  },
});

export const summary = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});
