import './setup';

import { Telemetry } from '@affine/core/components/telemetry';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app';
import {
  HaloDocsModuleRoot,
  type HaloDocsHostContext,
} from './halo-module-contract';

export interface HaloDocsMountOptions {
  host: HaloDocsHostContext;
  backendBase?: string;
  initialPath?: string;
}

type HaloDocsGlobals = typeof globalThis & {
  __HALO_DOCS_COMPILED_PACKAGE__?: boolean;
  __HALO_DOCS_INITIAL_PATH__?: string;
  HaloDocsModule?: { mount: typeof mountHaloDocs };
};

function installRequestBridge(host: HaloDocsHostContext, backendBase?: string) {
  if (!backendBase) return () => {};

  const nativeFetch = window.fetch;
  const target = backendBase.replace(/\/$/, '');
  const bridgedFetch: typeof window.fetch = (input, init = {}) => {
    const request = new Request(input, init);
    const url = new URL(request.url, location.href);
    const rootRequest =
      url.origin === location.origin &&
      (url.pathname === '/api' ||
        url.pathname.startsWith('/api/') ||
        url.pathname === '/graphql' ||
        url.pathname.startsWith('/graphql/'));

    if (!rootRequest && !request.url.startsWith(target)) {
      return nativeFetch(input, init);
    }

    const backendRequest = rootRequest
      ? new Request(`${target}${url.pathname}${url.search}`, request)
      : request;
    const requestContext = host.tokens.requestContext;
    if (requestContext) {
      backendRequest.headers.set('x-siso-request-context', requestContext);
    }
    return nativeFetch(backendRequest, { ...init, credentials: 'include' });
  };

  window.fetch = bridgedFetch;
  return () => {
    if (window.fetch === bridgedFetch) window.fetch = nativeFetch;
  };
}

export function mountHaloDocs(
  target: HTMLElement,
  options: HaloDocsMountOptions
) {
  const globals = globalThis as HaloDocsGlobals;
  globals.__HALO_DOCS_INITIAL_PATH__ =
    options.initialPath ?? `/workspace/${options.host.identity.workspaceId}/all`;
  // The compiled-package loader installs its bridge before evaluating this
  // bundle because AFFiNE captures fetch during module initialization.
  const removeRequestBridge = globals.__HALO_DOCS_COMPILED_PACKAGE__
    ? () => {}
    : installRequestBridge(options.host, options.backendBase);
  const root = createRoot(target);
  root.render(
    <StrictMode>
      <Telemetry />
      <HaloDocsModuleRoot host={options.host} donorApp={App} />
    </StrictMode>
  );
  return () => {
    root.unmount();
    removeRequestBridge();
    delete globals.__HALO_DOCS_INITIAL_PATH__;
  };
}

const globals = globalThis as HaloDocsGlobals;
globals.HaloDocsModule = { mount: mountHaloDocs };

function mountStandaloneApp() {
  const target = document.getElementById('app');
  if (!target) return;
  createRoot(target).render(
    <StrictMode>
      <Telemetry />
      <App />
    </StrictMode>
  );
}

if (!globals.__HALO_DOCS_COMPILED_PACKAGE__) {
  try {
    mountStandaloneApp();
  } catch (err) {
    console.error('Failed to bootstrap app', err);
  }
}
