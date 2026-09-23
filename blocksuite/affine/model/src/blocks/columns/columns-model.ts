import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
} from '@blocksuite/store';

export type ColumnsProps = {
  widths: number[];
};

export const ColumnsBlockSchema = defineBlockSchema({
  flavour: 'affine:columns',
  props: (): ColumnsProps => ({ widths: [] }),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['affine:note', 'affine:column'],
    children: ['affine:column'],
  },
  toModel: () => new ColumnsBlockModel(),
});

export class ColumnsBlockModel extends BlockModel<ColumnsProps> {}

export const ColumnsBlockSchemaExtension =
  BlockSchemaExtension(ColumnsBlockSchema);

export const ColumnBlockSchema = defineBlockSchema({
  flavour: 'affine:column',
  props: () => ({}),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['affine:columns'],
    children: [
      '@content',
      'affine:database',
      'affine:data-view',
      'affine:callout',
      'affine:columns',
    ],
  },
  toModel: () => new ColumnBlockModel(),
});

export class ColumnBlockModel extends BlockModel {}

export const ColumnBlockSchemaExtension =
  BlockSchemaExtension(ColumnBlockSchema);
