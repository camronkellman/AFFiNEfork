import { z } from 'zod';

import type { DocMeta, DocsPropertiesMeta } from '../extension';
import type { Store } from '../model';

export type BlockSnapshot = {
  type: 'block';
  id: string;
  flavour: string;
  version?: number;
  props: Record<string, unknown>;
  children: BlockSnapshot[];
};

export const BlockSnapshotSchema: z.ZodType<BlockSnapshot> = z.object({
  type: z.literal('block'),
  id: z.string(),
  flavour: z.string(),
  version: z.number().optional(),
  props: z.record(z.unknown()),
  children: z.lazy(() => BlockSnapshotSchema.array()),
});

export type SliceSnapshot = {
  type: 'slice';
  content: BlockSnapshot[];
  workspaceId: string;
  pageId: string;
};

export const SliceSnapshotSchema: z.ZodType<SliceSnapshot> = z.object({
  type: z.literal('slice'),
  content: BlockSnapshotSchema.array(),
  workspaceId: z.string(),
  pageId: z.string(),
});

export type CollectionInfoSnapshot = {
  id: string;
  type: 'info';
  properties: DocsPropertiesMeta;
};

export type DocSnapshot = {
  type: 'page';
  meta: DocMeta;
  blocks: BlockSnapshot;
};

const DocMetaSchema = z.object({
  id: z.string(),
  title: z.string(),
  createDate: z.number(),
  tags: z.array(z.string()),
  headerImage: z.string().optional(),
  headerImagePosition: z.number().min(0).max(100).optional(),
  headerImagePositionX: z.number().min(0).max(100).optional(),
  headerImagePositionY: z.number().min(0).max(100).optional(),
  headerImageZoom: z.number().min(0.5).max(2).optional(),
  description: z.string().optional(),
  pageIcon: z
    .union([
      z.object({ type: z.literal('emoji'), unicode: z.string() }),
      z.object({
        type: z.literal('affine-icon'),
        name: z.string(),
        color: z.string(),
      }),
    ])
    .optional(),
  databaseRecord: z.boolean().optional(),
  databaseRecordParentDocId: z.string().optional(),
  databaseRecordDatabaseId: z.string().optional(),
  databaseRecordRowId: z.string().optional(),
});

export const DocSnapshotSchema: z.ZodType<DocSnapshot> = z.object({
  type: z.literal('page'),
  meta: DocMetaSchema,
  blocks: BlockSnapshotSchema,
});

export interface BlobCRUD {
  get: (key: string) => Promise<Blob | null> | Blob | null;
  set: (key: string, value: Blob) => Promise<string> | string;
  delete: (key: string) => Promise<void> | void;
  list: () => Promise<string[]> | string[];
}

export interface DocCRUD {
  create: (id: string) => Store;
  get: (id: string) => Store | null;
  delete: (id: string) => void;
}
