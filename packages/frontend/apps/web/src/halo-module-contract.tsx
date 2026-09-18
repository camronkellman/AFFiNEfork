import type { ComponentType, PropsWithChildren, ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type HaloDocsCapability = 'view' | 'edit' | 'share' | 'admin';

export interface HaloDocsIdentity {
  userId: string;
  email: string;
  displayName?: string;
  clientId: string;
  workspaceId: string;
  expiresAt: string;
  capabilities: HaloDocsCapability[];
  roles?: string[];
  availableRoles?: string[];
}

export interface HaloDocsHostContext {
  identity: HaloDocsIdentity;
  tokens: {
    requestContext?: string;
  };
}

export interface HaloDocsModuleRootProps {
  host: HaloDocsHostContext;
  donorApp: ComponentType;
  expectedClientId?: string;
  children?: ReactNode;
}

const HostContext = createContext<HaloDocsHostContext | null>(null);

export function useHaloDocsHost() {
  const context = useContext(HostContext);
  if (!context) {
    throw new Error('HaloDocsModuleRoot must be mounted by HALO CRM');
  }
  return context;
}

export function assertHaloDocsIdentity(
  identity: HaloDocsIdentity,
  expectedClientId: string
) {
  if (identity.clientId !== expectedClientId) {
    throw new Error('HALO Docs client mismatch');
  }
  if (Date.parse(identity.expiresAt) <= Date.now()) {
    throw new Error('HALO Docs identity expired');
  }
  if (
    !identity.userId ||
    !identity.workspaceId ||
    identity.capabilities.length === 0
  ) {
    throw new Error('HALO Docs identity is incomplete');
  }
}

export function HaloDocsModuleRoot({
  host,
  donorApp: DonorApp,
  children,
  expectedClientId = 'halo-crm',
}: PropsWithChildren<HaloDocsModuleRootProps>) {
  assertHaloDocsIdentity(host.identity, expectedClientId);
  return (
    <HostContext.Provider value={host}>
      {children}
      <DonorApp />
    </HostContext.Provider>
  );
}
