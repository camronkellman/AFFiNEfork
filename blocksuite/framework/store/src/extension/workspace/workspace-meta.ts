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
export interface DocMeta {
  id: string;
  title: string;
  tags: string[];
  createDate: number;
  updatedDate?: number;
  favorite?: boolean;
  trash?: boolean;
  /** Optional page cover stored as a URL or data URL. */
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
