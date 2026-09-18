import type { DocMeta } from '@blocksuite/affine/store';

interface HaloDocsHostIdentity {
  userId: string;
  roles?: string[];
  availableRoles?: string[];
}

interface HaloDocsHostValue {
  identity: HaloDocsHostIdentity;
}

type HaloDocsGlobal = typeof globalThis & {
  __HALO_DOCS_HOST__?: HaloDocsHostValue;
};

const FALLBACK_ROLES = [
  'Admin',
  'Manager',
  'Employee',
  'CSM',
  'DCR',
  'HR / Work Force',
  'VA',
  'Developer',
  'Chatter',
  'Marketing Team',
  'Outreach Team',
  'Creator',
];

export const getHaloDocsIdentity = () =>
  (globalThis as HaloDocsGlobal).__HALO_DOCS_HOST__?.identity;

export const getHaloDocsAvailableRoles = () => {
  const configured = getHaloDocsIdentity()?.availableRoles;
  return configured?.length ? configured : FALLBACK_ROLES;
};

export const canViewHaloDoc = (meta?: Partial<DocMeta> | null) => {
  const identity = getHaloDocsIdentity();
  if (!identity || !meta) return true;

  const viewerRoles = meta.viewerRoles ?? [];
  if (viewerRoles.length === 0) return true;
  if (identity.roles?.includes('Admin')) return true;
  if (meta.haloCreatedByUserId === identity.userId) return true;

  return identity.roles?.some(role => viewerRoles.includes(role)) ?? false;
};
