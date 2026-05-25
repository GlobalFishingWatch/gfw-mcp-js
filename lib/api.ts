import { AsyncLocalStorage } from 'async_hooks';
import { fetch, ProxyAgent } from 'undici';
import { resolveToken } from '../cli/auth';

const { version } = require('../package.json');

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

// Stores the per-request GFW token injected by the HTTP server transport.
// Falls back to env / config when no context is active (stdio mode).
export const tokenStorage = new AsyncLocalStorage<string>();

export async function gfwFetch(
  path: string,
  params?: Record<string, string>,
): Promise<any> {
  const url = new URL(`${GFW_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const apiKey = tokenStorage.getStore() ?? resolveToken();
  if (process.env.GFW_DEBUG) console.error(`GFW API request: ${url.pathname}`);
  const response = await fetch(url.toString(), {
    headers: {
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      'User-Agent': `gfw-mcp-js/${version}`,
    },
    dispatcher,
  } as any);
  if (!response.ok) {
    throw new Error(`GFW API error ${response.status}: ${response.statusText}`);
  }

  return response;
}
