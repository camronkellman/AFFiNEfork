import type { Subject } from 'rxjs';

export type Tag = {
  id: string;
  value: string;
  color: string;
};
export type DocsPropertiesMeta = {
  tags?: {
    options: Tag[];
  };
};
export type DocPageIcon =
  | { type: 'emoji'; unicode: string }
  | { type: 'affine-icon'; name: string; color: string };
export interface DocMeta {
  id: string;
  title: string;
  tags: string[];
  createDate: number;
  updatedDate?: number;
  favorite?: boolean;
  trash?: boolean;
  /** Optional page cover stored as a blob ID or a legacy URL/data URL. */
  headerImage?: string;
  /** Vertical focal point for the page cover, from 0 to 100. */
  headerImagePosition?: number;
  /** Horizontal focal point for the page cover, from 0 to 100. */
  headerImagePositionX?: number;
  /** Vertical focal point for the page cover, from 0 to 100. */
  headerImagePositionY?: number;
  /** Cover scale, where 1 is the original cover fit. */
  headerImageZoom?: number;
  /** Short, intentional summary shown beneath the title and on doc cards. */
  description?: string;
  /** Page icon mirrored onto database cards for linked record pages. */
  pageIcon?: DocPageIcon;
  /** True when this document belongs to a database row instead of All Docs. */
  databaseRecord?: boolean;
  /** The document containing the owning database block. */
  databaseRecordParentDocId?: string;
  /** The owning database block. */
  databaseRecordDatabaseId?: string;
  /** The database row represented by this document. */
  databaseRecordRowId?: string;
}

export interface WorkspaceMeta {
  get docMetas(): DocMeta[];

  addDocMeta(props: DocMeta, index?: number): void;
  getDocMeta(id: string): DocMeta | undefined;
  setDocMeta(id: string, props: Partial<DocMeta>): void;
  removeDocMeta(id: string): void;

  get properties(): DocsPropertiesMeta;
  setProperties(meta: DocsPropertiesMeta): void;

  get docs(): unknown[] | undefined;
  initialize(): void;

  docMetaAdded: Subject<string>;
  docMetaRemoved: Subject<string>;
  docMetaUpdated: Subject<void>;
}
