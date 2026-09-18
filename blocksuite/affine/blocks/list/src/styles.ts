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
