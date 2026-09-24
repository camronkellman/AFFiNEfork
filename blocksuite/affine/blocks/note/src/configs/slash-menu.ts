import {
  formatBlockCommand,
  type TextFormatConfig,
  textFormatConfigs,
} from '@blocksuite/affine-inline-preset';
import type { ColumnsBlockModel } from '@blocksuite/affine-model';
import {
  focusTextModel,
  type TextAlignConfig,
  textAlignConfigs,
  type TextConversionConfig,
  textConversionConfigs,
} from '@blocksuite/affine-rich-text';
import {
  getSelectedModelsCommand,
  getTextSelectionCommand,
} from '@blocksuite/affine-shared/commands';
import { isInsideBlockByFlavour } from '@blocksuite/affine-shared/utils';
import {
  type SlashMenuActionItem,
  type SlashMenuConfig,
  SlashMenuConfigExtension,
  type SlashMenuItem,
} from '@blocksuite/affine-widget-slash-menu';
import { HeadingsIcon, ToggleRightIcon } from '@blocksuite/icons/lit';
import { BlockSelection } from '@blocksuite/std';
import { html } from 'lit';

import { updateBlockAlign, updateBlockType } from '../commands';
import { tooltips } from './tooltips';

let basicIndex = 0;
const noteSlashMenuConfig: SlashMenuConfig = {
  items: [
    ...textConversionConfigs
      .filter(i => i.type && ['h1', 'h2', 'h3', 'text'].includes(i.type))
      .map(config => createConversionItem(config, `0_Basic@${basicIndex++}`)),
    {
      name: 'Other Headings',
      icon: HeadingsIcon(),
      group: `0_Basic@${basicIndex++}`,
      subMenu: textConversionConfigs
        .filter(i => i.type && ['h4', 'h5', 'h6'].includes(i.type))
        .map(config => createConversionItem(config)),
    },
    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:code')
      .map(config => createConversionItem(config, `0_Basic@${basicIndex++}`)),

    ...textConversionConfigs
      .filter(i => i.type && ['divider', 'quote'].includes(i.type))
      .map(
        config =>
          ({
            ...createConversionItem(config, `0_Basic@${basicIndex++}`),
            when: ({ model }) =>
              model.store.schema.flavourSchemaMap.has(config.flavour) &&
              !isInsideBlockByFlavour(
                model.store,
                model,
                'affine:edgeless-text'
              ),
          }) satisfies SlashMenuActionItem
      ),

    ...textConversionConfigs
      .filter(i => i.flavour === 'affine:list')
      .map((config, index) =>
        createConversionItem(config, `1_List@${index++}`)
      ),
    createToggleListItem('Toggle List', 0, 3, ['togglelist', 'toggle']),
    ...([1, 2, 3, 4] as const).map((level, index) =>
      createToggleListItem(`Toggle List ${index + 1}`, level, index + 4, [
        `togglelist${index + 1}`,
        `toggleheading${index + 1}`,
      ])
    ),

    ...([1, 2, 3, 4, 5] as const).map(
      count =>
        ({
          name: count === 1 ? '1 column' : `${count} columns`,
          description:
            count === 1
              ? 'Return a column layout to normal page flow.'
              : `Create ${count} editable, resizable columns.`,
          searchAlias: [
            'column',
            'columns',
            `column${count}`,
            `columns${count}`,
          ],
          icon: html`<svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            ${Array.from(
              { length: count },
              (_, index) => html`<rect
                x=${1 + index * (18 / count)}
                y="3"
                width=${18 / count - 2}
                height="14"
                rx="1"
                stroke="currentColor"
                stroke-width="1.3"
              ></rect>`
            )}
          </svg>`,
          group: `3_Layout@${count}`,
          when: ({ model }) => {
            if (!model.store.schema.flavourSchemaMap.has('affine:columns'))
              return false;
            const parent = model.store.getParent(model);
            return (
              parent?.flavour === 'affine:note' ||
              parent?.flavour === 'affine:column'
            );
          },
          action: ({ std, model }) => {
            const store = std.store;
            const parent = store.getParent(model);
            if (!parent) return;
            if (count === 1) {
              const row =
                parent.flavour === 'affine:column'
                  ? store.getParent(parent)
                  : null;
              const outer = row ? store.getParent(row) : null;
              if (row?.flavour === 'affine:columns' && outer) {
                for (const column of row.children) {
                  if (column.children.length) {
                    store.moveBlocks([...column.children], outer, row, true);
                  }
                }
                store.deleteBlock(row);
              } else {
                std.command.exec(updateBlockType, {
                  flavour: 'affine:paragraph',
                  props: { type: 'text' },
                });
              }
              return;
            }
            const existing =
              parent.flavour === 'affine:column'
                ? store.getParent(parent)
                : null;
            if (existing?.flavour === 'affine:columns') {
              const row = existing as ColumnsBlockModel;
              const columns = [...row.children];
              if (columns.length > count) {
                const destination = columns[count - 1];
                for (const column of columns.slice(count)) {
                  if (column.children.length) {
                    store.moveBlocks([...column.children], destination);
                  }
                  store.deleteBlock(column);
                }
              } else {
                for (let index = columns.length; index < count; index++) {
                  const columnId = store.addBlock('affine:column', {}, row);
                  const column = store.getBlock(columnId)?.model;
                  if (column) store.addBlock('affine:paragraph', {}, column);
                }
              }
              row.props.widths$.value = Array.from(
                { length: count },
                () => 100 / count
              );
              if (model.text?.length === 0) store.deleteBlock(model);
              return;
            }
            const [rowId] = store.addSiblingBlocks(
              model,
              [
                {
                  flavour: 'affine:columns',
                  props: {
                    widths: Array.from({ length: count }, () => 100 / count),
                  },
                },
              ],
              'after'
            );
            const row = rowId ? store.getBlock(rowId)?.model : null;
            if (!row) return;
            let firstParagraph: string | undefined;
            for (let index = 0; index < count; index++) {
              const columnId = store.addBlock('affine:column', {}, row);
              const column = store.getBlock(columnId)?.model;
              if (!column) continue;
              const paragraphId = store.addBlock(
                'affine:paragraph',
                {},
                column
              );
              if (index === 0) firstParagraph = paragraphId;
            }
            if (model.text?.length === 0) store.deleteBlock(model);
            if (firstParagraph) focusTextModel(std, firstParagraph);
          },
        }) satisfies SlashMenuActionItem
    ),

    ...textAlignConfigs.map((config, index) =>
      createAlignItem(config, `2_Align@${index++}`)
    ),

    ...textFormatConfigs
      .filter(i => !['Code', 'Link'].includes(i.name))
      .map((config, index) =>
        createTextFormatItem(config, `2_Style@${index++}`)
      ),
  ],
};

function createToggleListItem(
  name: string,
  toggleLevel: 0 | 1 | 2 | 3 | 4,
  index: number,
  searchAlias: string[]
): SlashMenuActionItem {
  return {
    name,
    description: 'Create a collapsible list for nested blocks.',
    icon: ToggleRightIcon(),
    searchAlias,
    group: `1_List@${index}`,
    when: ({ model }) => model.store.schema.flavourSchemaMap.has('affine:list'),
    action: ({ std }) => {
      std.command.exec(updateBlockType, {
        flavour: 'affine:list',
        props: { type: 'toggle', collapsed: false, toggleLevel },
      });
    },
  };
}

function createConversionItem(
  config: TextConversionConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, description, icon, flavour, type, searchAlias = [] } = config;
  return {
    name,
    group,
    description,
    icon,
    searchAlias,
    tooltip: tooltips[name],
    when: ({ model }) => model.store.schema.flavourSchemaMap.has(flavour),
    action: ({ std }) => {
      std.command.exec(updateBlockType, {
        flavour,
        props: { type },
      });
    },
  };
}

function createAlignItem(
  config: TextAlignConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { textAlign, name, icon } = config;
  return {
    name,
    group,
    icon,
    action: ({ std }) => {
      std.command
        .chain()
        .pipe(getTextSelectionCommand)
        .pipe(getSelectedModelsCommand, { types: ['text'] })
        .pipe(updateBlockAlign, { textAlign })
        .run();
    },
  };
}

function createTextFormatItem(
  config: TextFormatConfig,
  group?: SlashMenuItem['group']
): SlashMenuActionItem {
  const { name, icon, id, action } = config;
  return {
    name,
    icon,
    group,
    tooltip: tooltips[name],
    action: ({ std, model }) => {
      const { host } = std;

      if (model.text?.length !== 0) {
        std.command.exec(formatBlockCommand, {
          blockSelections: [
            std.selection.create(BlockSelection, {
              blockId: model.id,
            }),
          ],
          styles: { [id]: true },
        });
      } else {
        // like format bar when the line is empty
        action(host);
      }
    },
  };
}

export const NoteSlashMenuConfigExtension = SlashMenuConfigExtension(
  'affine:note',
  noteSlashMenuConfig
);
