const GFW_BASE = 'https://gateway.api.globalfishingwatch.org';

/**
 * Fetch wrapper for the GFW API.
 * Automatically injects the Bearer token from API_KEY env var when present.
 * Throws an Error if the response is not OK.
 */
export async function gfwFetch(
  path: string,
  params?: Record<string, string>,
): Promise<Response> {
  const url = new URL(`${GFW_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const apiKey = process.env.API_KEY;
  console.error(`Making GFW API request to ${url}`);
  const response = await fetch(url.toString(), {
    headers: {
      ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      Referer: 'gfw-mcp-js',
    },
  });

  if (!response.ok) {
    throw new Error(`GFW API error ${response.status}: ${response.statusText}`);
  }

  return response;
}
