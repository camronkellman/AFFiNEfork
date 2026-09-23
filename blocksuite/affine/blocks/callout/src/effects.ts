import { CalloutBlockComponent } from './callout-block';
import { ColumnBlockComponent, ColumnsBlockComponent } from './columns-block';
import { IconPickerWrapper } from './icon-picker-wrapper';

export function effects() {
  customElements.define('affine-callout', CalloutBlockComponent);
  customElements.define('affine-columns', ColumnsBlockComponent);
  customElements.define('affine-column', ColumnBlockComponent);
  customElements.define('icon-picker-wrapper', IconPickerWrapper);
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-callout': CalloutBlockComponent;
    'icon-picker-wrapper': IconPickerWrapper;
  }
}
