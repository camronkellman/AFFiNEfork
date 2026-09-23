import {
  type StoreExtensionContext,
  StoreExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import {
  CalloutBlockSchemaExtension,
  ColumnBlockSchemaExtension,
  ColumnsBlockSchemaExtension,
} from '@blocksuite/affine-model';

import { CalloutBlockMarkdownAdapterExtension } from './adapters/markdown';

export class CalloutStoreExtension extends StoreExtensionProvider {
  override name = 'affine-callout-block';

  override setup(context: StoreExtensionContext) {
    super.setup(context);
    context.register(CalloutBlockSchemaExtension);
    context.register(ColumnsBlockSchemaExtension);
    context.register(ColumnBlockSchemaExtension);
    context.register(CalloutBlockMarkdownAdapterExtension);
  }
}
