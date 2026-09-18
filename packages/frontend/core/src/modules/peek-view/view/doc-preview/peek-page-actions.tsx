import { FavoriteButton } from '@affine/core/blocksuite/block-suite-header/favorite';
import { InfoButton } from '@affine/core/blocksuite/block-suite-header/info';
import { PageHeaderMenuButton } from '@affine/core/blocksuite/block-suite-header/menu';
import { SharePageButton } from '@affine/core/modules/share-menu';
import { WorkspaceService } from '@affine/core/modules/workspace';
import type { Store } from '@blocksuite/affine/store';
import { useService } from '@toeverything/infra';

import * as styles from './doc-peek-view.css';

export const PeekPageActions = ({ page }: { page: Store }) => {
  const workspace = useService(WorkspaceService).workspace;

  return (
    <div className={styles.pageActions}>
      <FavoriteButton pageId={page.id} />
      <InfoButton docId={page.id} />
      <PageHeaderMenuButton page={page} containerWidth={1000} />
      <SharePageButton workspace={workspace} page={page} />
    </div>
  );
};
