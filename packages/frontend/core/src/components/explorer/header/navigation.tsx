import { WorkbenchLink } from '@affine/core/modules/workbench';
import { useI18n } from '@affine/i18n';
import track from '@affine/track';

import * as styles from './navigation.css';

const items = [
  {
    value: 'docs',
    label: 'com.affine.docs.header',
    testId: 'workspace-docs-button',
    to: '/all',
  },
] as const;

export const ExplorerNavigation = ({ active }: { active: string }) => {
  const t = useI18n();

  return (
    <div className={styles.container}>
      {items.map(item => (
        <WorkbenchLink
          key={item.value}
          data-testid={item.testId}
          data-active={active === item.value}
          to={item.to}
          onClick={() => {
            track.allDocs.header.navigation.navigateAllDocsRouter({
              control: item.value,
            });
          }}
          className={styles.item}
        >
          {t[item.label]()}
        </WorkbenchLink>
      ))}
    </div>
  );
};
