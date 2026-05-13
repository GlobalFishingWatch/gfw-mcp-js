import { fetch, ProxyAgent } from 'undici';
import { resolveToken } from '../cli/auth';

const GFW_BASE = 'https://gateway.api.globalfishingwatch.org';

const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;

/**
 * Fetch wrapper for the GFW API.
 * Automatically injects the Bearer token from API_KEY env var when present.
 * Respects HTTPS_PROXY / HTTP_PROXY environment variables.
 * Throws an Error if the response is not OK.
 */
export async function gfwFetch(
  path: string,
  params?: Record<string, string>,
): Promise<any> {
  const url = new URL(`${GFW_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const apiKey = resolveToken();
  if (process.env.GFW_DEBUG) console.error(`GFW API request: ${url.pathname}`);
  const response = await fetch(url.toString(), {
    headers: {
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      Referer: 'gfw-mcp-js',
    },
    dispatcher,
  } as any);

  if (!response.ok) {
    throw new Error(`GFW API error ${response.status}: ${response.statusText}`);
  }

  return response;
}
