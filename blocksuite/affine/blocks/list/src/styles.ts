import { css } from 'lit';

export const listPrefix = css`
  .affine-list-block__prefix {
    display: flex;
    color: var(--affine-blue-700);
    font-size: var(--affine-font-sm);
    user-select: none;
    position: relative;
  }

  .affine-list-block__numbered {
    min-width: 22px;
    height: 24px;
    margin-left: 2px;
  }

  .affine-list-block__todo-prefix {
    display: flex;
    align-items: center;
    cursor: pointer;
    width: 24px;
    height: 24px;
    color: var(--affine-icon-color);
  }

  .affine-list-block__todo-prefix.readonly {
    cursor: default;
  }

  .affine-list-block__todo-prefix > svg {
    width: 20px;
    height: 20px;
  }

  .affine-list-block__toggle-prefix {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    margin: 0 4px 0 -2px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    color: var(--affine-icon-color);
    background: transparent;
    cursor: pointer;
    transition:
      color 120ms ease,
      background 120ms ease;
  }

  .affine-list-block__toggle-prefix:hover,
  .affine-list-block__toggle-prefix:focus-visible {
    color: var(--affine-text-primary-color);
    background: var(--affine-hover-color);
    outline: none;
  }

  .affine-list-block__toggle-prefix > svg {
    width: 18px;
    height: 18px;
  }
`;

export const listBlockStyles = css`
  affine-list {
    display: block;
    font-size: var(--affine-font-base);
  }

  affine-list code {
    font-size: calc(var(--affine-font-base) - 3px);
    padding: 0px 4px 2px;
  }

  .affine-list-block-container {
    box-sizing: border-box;
    border-radius: 4px;
    position: relative;
  }
  .affine-list-block-container .affine-list-block-container {
    margin-top: 0;
  }
  .affine-list-rich-text-wrapper {
    position: relative;
    display: flex;
  }
  .affine-list-rich-text-wrapper rich-text {
    flex: 1;
    min-width: 0;
  }

  .affine-list-block-container[data-toggle-level]
    > .affine-list-rich-text-wrapper {
    align-items: flex-start;
    min-height: 32px;
  }

  .affine-list-block-container[data-toggle-level]
    > .affine-list-rich-text-wrapper
    > rich-text {
    padding-top: 2px;
  }

  .affine-toggle-children {
    min-height: 16px;
    margin: 4px 0 6px 12px;
    padding-top: 5px;
    padding-bottom: 5px;
    border-left: 2px solid var(--affine-border-color);
    border-radius: 0 6px 6px 0;
    transition:
      border-color 120ms ease,
      background 120ms ease;
  }

  .affine-list-block-container[data-toggle-level]:hover
    > .affine-toggle-children,
  .affine-list-block-container[data-toggle-level]:focus-within
    > .affine-toggle-children {
    border-left-color: var(--affine-primary-color);
    background: color-mix(in srgb, var(--affine-hover-color) 45%, transparent);
  }

  .affine-toggle-children--empty {
    min-height: 42px;
    padding-right: 8px;
  }

  .affine-toggle-empty-action {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 34px;
    padding: 5px 9px;
    border: 1px dashed var(--affine-border-color);
    border-radius: 6px;
    color: var(--affine-text-secondary-color);
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: text;
  }

  .affine-toggle-empty-action:hover,
  .affine-toggle-empty-action:focus-visible {
    border-color: var(--affine-primary-color);
    color: var(--affine-text-primary-color);
    background: var(--affine-hover-color);
    outline: none;
  }

  .affine-toggle-empty-plus {
    font-size: 18px;
    line-height: 1;
  }

  .affine-list-block-container[data-toggle-level='1']
    > .affine-list-rich-text-wrapper {
    font-size: var(--affine-font-h-1);
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: calc(1em + 8px);
  }

  .affine-list-block-container[data-toggle-level='2']
    > .affine-list-rich-text-wrapper {
    font-size: var(--affine-font-h-2);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: calc(1em + 10px);
  }

  .affine-list-block-container[data-toggle-level='3']
    > .affine-list-rich-text-wrapper {
    font-size: var(--affine-font-h-3);
    font-weight: 600;
    letter-spacing: -0.02em;
    line-height: calc(1em + 8px);
  }

  .affine-list-block-container[data-toggle-level='4']
    > .affine-list-rich-text-wrapper {
    font-size: var(--affine-font-h-4);
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: calc(1em + 8px);
  }

  .affine-list--checked {
    color: var(--affine-text-secondary-color);
  }

  ${listPrefix}
`;
