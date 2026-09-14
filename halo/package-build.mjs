import { readFileSync, renameSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const frontend = root;
const sourceDist = resolve(frontend, 'packages/frontend/apps/web/dist');
const output = resolve(root, 'halo-module-dist');

execFileSync('corepack', ['yarn', 'affine', '@affine/web', 'build'], {
  cwd: frontend,
  stdio: 'inherit',
  env: {
    ...process.env,
    PUBLIC_PATH: '/',
    GITHUB_SHA: process.env.GITHUB_SHA ?? 'halo-docs-package',
    SISO_LOCAL_BACKEND_URL: process.env.SISO_LOCAL_BACKEND_URL ?? 'http://127.0.0.1:3012',
  },
});

rmSync(output, { recursive: true, force: true });
// The package is the final consumer of the generated dist. Move it instead
// of duplicating ~200 MiB of assets, which also keeps low-space build hosts
// from producing a partially copied package.
rmSync(output, { recursive: true, force: true });
renameSync(sourceDist, output);

const html = readFileSync(resolve(output, 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
const styles = [...html.matchAll(/<link[^>]+href="([^"]+\.css)"/g)].map(match => match[1]);
const mainScript = scripts.at(-1);
if (!mainScript) throw new Error('Rspack output has no browser entry script');

// The upstream app is root-hosted. Rewrite all root-relative URLs so a copied
// package remains self-contained under any nested host path.
const textFiles = readdirSync(output, { recursive: true })
  .map(file => resolve(output, String(file)))
  .filter(file => /\.(?:css|js|html|map)$/.test(file));
for (const file of textFiles) {
  let source = readFileSync(file, 'utf8');
  // Source maps and WASM fallbacks can retain the local checkout path. Keep
  // the compiled package portable and do not disclose the build machine.
  source = source.replaceAll(root, '/halo-docs-build');
  if (file.includes('/js/runtime.') && file.endsWith('.js')) {
    source = source.replace(/h\.p="?\/?"?/, 'h.p=globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href');
    source = source.replace('var t=h.p+h.u(e),c=Error();', 'var t=new URL(h.u(e),globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href).href,c=Error();');
    source = source.replace('var t=h.miniCssF(e),c=h.p+t;', 'var t=h.miniCssF(e),c=new URL(t,globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href).href;');
  }
  if (file.includes('/js/index.') && file.endsWith('.js')) {
    source = source.replaceAll('i.p=environment.publicPath', 'i.p=globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href');
    source = source.replaceAll('return(environment.subPath||"/")+"js/"+', 'return (globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href)+"js/"+');
    source = source.replace(/:\"\/imgs\//g, ':globalThis.__HALO_DOCS_ASSET_BASE__+"imgs/');
    source = source.replaceAll('url:environment.publicPath+"fonts/"+e.url.split("/").pop()', 'url:(globalThis.__HALO_DOCS_ASSET_BASE__||new URL("./",document.currentScript?.src||location.href).href)+"fonts/"+e.url.split("/").pop()');
    source = source.replace('let tj=(0,tr.M)("nbstore");', 'let tj=new URL((0,tr.M)("nbstore"),location.href);tj.searchParams.set("halo_docs_backend",globalThis.__HALO_DOCS_WORKER_BACKEND_BASE__||"/halo-docs-backend/");');
  }
  if (file.includes('/js/nbstore-') && file.endsWith('.worker.js')) {
    // The nbstore worker owns its HTTP fetches and cannot see the page fetch
    // bridge. Pass the host backend base through the worker URL (it is not a
    // credential), then preserve the configured nested path for API/GraphQL
    // requests and Socket.IO.
    source = `globalThis.__HALO_DOCS_COMPILED_PACKAGE__=true;globalThis.__HALO_DOCS_BACKEND_BASE__=new URL(new URLSearchParams(globalThis.location.search).get("halo_docs_backend")||"/halo-docs-backend/",globalThis.location.origin).href;globalThis.__HALO_DOCS_BACKEND_REQUEST__=e=>new URL(String(e).replace(/^\\/+/,""),globalThis.__HALO_DOCS_BACKEND_BASE__.replace(/\\/?$/, "/")).href;globalThis.__HALO_DOCS_SOCKET_PATH__=new URL("socket.io",globalThis.__HALO_DOCS_BACKEND_BASE__.replace(/\\/?$/, "/")).pathname;\n${source}`;
    const workerRequest = 'globalThis.__HALO_DOCS_BACKEND_REQUEST__';
    source = source.replaceAll('path:r?"/admin/api/cms/affine/socket.io":void 0', 'path:r?globalThis.__HALO_DOCS_SOCKET_PATH__:void 0');
    source = source.replaceAll('new URL(e,this.serverBaseUrl)', `${workerRequest}(e)`);
    source = source.replaceAll('new URL("/graphql",this.serverBaseUrl)', `${workerRequest}("/graphql")`);
    source = source.replaceAll('new URL(e,this.options.serverBaseUrl)', `${workerRequest}(e)`);
  }
  if (/\.(?:css|html)$/.test(file)) {
    source = source.replace(/(["'(])\/(?!\/)/g, '$1');
  }
  writeFileSync(file, source);
}

writeFileSync(resolve(output, 'halo-docs-module.js'), `
const assets = ${JSON.stringify({ scripts, styles })};
const assetBase = new URL('./', import.meta.url);
globalThis.__HALO_DOCS_COMPILED_PACKAGE__ = true;
globalThis.__HALO_DOCS_ASSET_BASE__ = assetBase.href;
let ready;
let donorUnmount;
let persistentContainer;
let activeTarget;
let nativeFetch;
let bridgedFetch;
function installRequestBridge(host, backendBase) {
  const target = new URL(backendBase || '/halo-docs-backend', location.origin).href.replace(/\\/$/, '');
  globalThis.__HALO_DOCS_WORKER_BACKEND_BASE__ = target;
  const bridgeState = globalThis.__HALO_DOCS_FETCH_BRIDGE_STATE || { target, context: '' };
  bridgeState.target = target;
  bridgeState.context = host?.tokens?.requestContext ?? '';
  globalThis.__HALO_DOCS_FETCH_BRIDGE_STATE = bridgeState;
  if (globalThis.__HALO_DOCS_FETCH_BRIDGE) return;
  nativeFetch = window.fetch.bind(window);
  // The host may pass an explicit backend base; compiled package mounts that
  // omit it still need the cookie-bearing same-origin CMS prefix.
  bridgedFetch = (input, init = {}) => {
    const request = new Request(input, init);
    const url = new URL(request.url, location.href);
    const rootRequest = url.origin === location.origin &&
      (url.pathname === '/api' || url.pathname.startsWith('/api/') ||
       url.pathname === '/graphql' || url.pathname.startsWith('/graphql/'));
    const state = globalThis.__HALO_DOCS_FETCH_BRIDGE_STATE;
    if (!rootRequest && !request.url.startsWith(state.target)) return nativeFetch(input, init);
    const backendRequest = rootRequest
      ? new Request(state.target + url.pathname + url.search, request)
      : request;
    backendRequest.headers.set('x-siso-request-context', state.context);
    return nativeFetch(backendRequest, { ...init, credentials: 'include' });
  };
  window.fetch = bridgedFetch;
  globalThis.__HALO_DOCS_FETCH_BRIDGE = true;
}
function removeRequestBridge() {
  if (bridgedFetch && window.fetch === bridgedFetch && nativeFetch) {
    window.fetch = nativeFetch;
  }
  bridgedFetch = undefined;
  nativeFetch = undefined;
  globalThis.__HALO_DOCS_FETCH_BRIDGE = false;
  delete globalThis.__HALO_DOCS_FETCH_BRIDGE_STATE;
}
function loadAssets() {
  if (ready) return ready;
  ready = Promise.all([
    ...assets.styles.map(href => new Promise((resolve, reject) => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.dataset.haloDocsStyle = ''; link.href = new URL(href.replace(/^\\//, ''), assetBase); link.onload = resolve; link.onerror = () => reject(new Error('HALO Docs stylesheet failed: ' + link.href)); document.head.append(link);
    })),
    ...assets.scripts.map(src => new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.async = false; script.src = new URL(src.replace(/^\\//, ''), assetBase); script.onload = resolve; script.onerror = () => reject(new Error('HALO Docs script failed: ' + script.src)); document.head.append(script);
    })),
  ]);
  return ready;
}
function setInitialPath(options) {
  const workspaceId = options.host?.identity?.workspaceId;
  globalThis.__HALO_DOCS_INITIAL_PATH__ = options.initialPath ??
    (workspaceId ? '/workspace/' + workspaceId + '/all' : '/workspace/local/all');
}
let prefetchReady;
function prefetchAssets() {
  if (prefetchReady) return prefetchReady;
  const preload = (href, as) => new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'preload'; link.as = as; link.href = new URL(href.replace(/^\\//, ''), assetBase);
    // A preload is an optimization only. If an edge refuses it, mount() will
    // still load the real stylesheet/script after installing the request bridge.
    link.onload = resolve; link.onerror = resolve; document.head.append(link);
  });
  prefetchReady = Promise.all([
    ...assets.styles.map(href => preload(href, 'style')),
    ...assets.scripts.map(src => preload(src, 'script')),
  ]).then(() => undefined);
  return prefetchReady;
}
export async function mount(target, host) {
  const options = host?.host ? host : { host };
  setInitialPath(options);
  // Install before evaluating donor scripts: AFFiNE captures fetch during
  // module initialization, before its React mount callback runs.
  installRequestBridge(options.host, options.backendBase);
  await loadAssets();
  document.querySelectorAll('link[data-halo-docs-style]').forEach(link => { link.disabled = false; });
  if (!globalThis.HaloDocsModule?.mount) throw new Error('HALO Docs compiled entry did not initialize');
  if (!persistentContainer) {
    persistentContainer = document.createElement('div');
    persistentContainer.dataset.haloDocsPersistentRoot = '';
    Object.assign(persistentContainer.style, {
      width: '100%',
      height: '100%',
      minHeight: '0',
      overflow: 'hidden',
    });
    target.replaceChildren(persistentContainer);
    donorUnmount = globalThis.HaloDocsModule.mount(persistentContainer, options);
    window.addEventListener('pagehide', () => {
      donorUnmount?.();
      donorUnmount = undefined;
      removeRequestBridge();
    }, { once: true });
  } else {
    // AFFiNE owns module-level framework, router, worker, and workbench
    // singletons. Destroying its React root and mounting those same singletons
    // again leaves the workbench visible but unsubscribed after the first CRM
    // route transition. Preserve the original donor root and reattach it.
    target.replaceChildren(persistentContainer);
    globalThis.workbench?.openAll?.({
      at: 'active',
      replaceHistory: true,
    });
  }
  activeTarget = target;
  requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  return () => unmount(target);
}
export async function preload(host) {
  if (host) {
    const options = host.host ? host : { host };
    setInitialPath(options);
    installRequestBridge(options.host, options.backendBase);
    await loadAssets();
    return;
  }
  await prefetchAssets();
}
export function unmount(target) {
  if (target && activeTarget && target !== activeTarget) return;
  persistentContainer?.remove();
  activeTarget = undefined;
  document.querySelectorAll('link[data-halo-docs-style]').forEach(link => { link.disabled = true; });
  delete globalThis.__HALO_DOCS_INITIAL_PATH__;
}
export const entry = ${JSON.stringify(mainScript)};
`.trimStart());

const files = readdirSync(output, { recursive: true })
  .map(file => String(file).replaceAll('\\', '/'))
  .filter(file => statSync(resolve(output, file)).isFile())
  .filter(file => file !== 'package-manifest.json')
  .sort()
  .map(file => {
    const bytes = readFileSync(resolve(output, file));
    return { path: file, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex') };
  });

writeFileSync(resolve(output, 'package-manifest.json'), JSON.stringify({
  package: '@halo/docs-module',
  entry: 'halo-docs-module.js',
  html: 'index.html',
  compiled: true,
  sourceBoundary: 'Rspack output only; no AFFiNE source files are shipped',
  assetBase: 'relative-to-entry-directory',
  assets: { scripts, styles },
  files,
  preload: { host: 'HaloDocsHostContext', returns: 'Promise<void>' },
  mount: { target: 'HTMLElement', host: 'HaloDocsHostContext', returns: 'Promise<() => void>' },
}, null, 2));
console.log(JSON.stringify({ output, entry: resolve(output, 'halo-docs-module.js'), assets: scripts.length + styles.length, files: files.length }));
