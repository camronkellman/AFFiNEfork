import { Menu, MenuItem, PropertyValue } from '@affine/component';
import type { DocMeta } from '@blocksuite/affine/store';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, useMemo } from 'react';

import { DocService } from '../../modules/doc';
import {
  getHaloDocsAvailableRoles,
  getHaloDocsIdentity,
} from '../../utils/halo-docs-access';
import type { PropertyValueProps } from '../properties/types';
import * as styles from './role-access.css';

export const RoleAccessValue = ({ readonly, onChange }: PropertyValueProps) => {
  const doc = useService(DocService).doc;
  const meta = useLiveData(doc.meta$) as Partial<DocMeta>;
  const selectedRoles = useMemo(
    () => meta.viewerRoles ?? [],
    [meta.viewerRoles]
  );
  const availableRoles = useMemo(() => getHaloDocsAvailableRoles(), []);
  const identity = getHaloDocsIdentity();
  const canManage =
    !readonly &&
    (!meta.haloCreatedByUserId ||
      meta.haloCreatedByUserId === identity?.userId ||
      identity?.roles?.includes('Admin'));

  const summary = useMemo(() => {
    if (selectedRoles.length === 0) return 'Everyone';
    if (selectedRoles.length <= 2) return selectedRoles.join(', ');
    return `${selectedRoles.length} roles`;
  }, [selectedRoles]);

  const updateRoles = useCallback(
    (roles: string[]) => {
      const ownerId = meta.haloCreatedByUserId ?? getHaloDocsIdentity()?.userId;
      doc.record.setMeta({
        haloCreatedByUserId: ownerId,
        viewerRoles: roles,
      });
      onChange(roles, true);
    },
    [doc, meta.haloCreatedByUserId, onChange]
  );

  const toggleRole = useCallback(
    (role: string) => {
      updateRoles(
        selectedRoles.includes(role)
          ? selectedRoles.filter(item => item !== role)
          : [...selectedRoles, role]
      );
    },
    [selectedRoles, updateRoles]
  );

  const trigger = (
    <button className={styles.trigger} type="button" disabled={!canManage}>
      <span className={styles.summary}>{summary}</span>
    </button>
  );

  return (
    <PropertyValue
      className={styles.value}
      hoverable={false}
      readonly={!canManage}
    >
      {!canManage ? (
        trigger
      ) : (
        <Menu
          items={
            <>
              <MenuItem
                selected={selectedRoles.length === 0}
                onClick={() => updateRoles([])}
              >
                Everyone
              </MenuItem>
              {availableRoles.map(role => (
                <MenuItem
                  key={role}
                  checked={selectedRoles.includes(role)}
                  onSelect={event => event.preventDefault()}
                  onClick={() => toggleRole(role)}
                >
                  {role}
                </MenuItem>
              ))}
            </>
          }
          contentOptions={{
            align: 'start',
            onClick: event => event.stopPropagation(),
          }}
        >
          {trigger}
        </Menu>
      )}
    </PropertyValue>
  );
};
