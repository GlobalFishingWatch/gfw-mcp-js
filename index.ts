import * as Sentry from '@sentry/node';
import { createServer } from './mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

Sentry.init({
  dsn: process.env.SENTRY_DSN || 'https://02861a39640f96d39216f83d54f233cd@o4510353401577472.ingest.us.sentry.io/4511211505057792',
  environment: process.env.NODE_ENV || 'production',
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
      try {
        const u = new URL(breadcrumb.data.url);
        breadcrumb.data.url = u.origin + u.pathname;
      } catch {
        breadcrumb.data.url = '[redacted]';
      }
    }
    return breadcrumb;
  },
});

const server = createServer();

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GFW MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  Sentry.captureException(error);
  Sentry.flush(2000).finally(() => process.exit(1));
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  Sentry.captureException(error);
  Sentry.flush(2000).finally(() => process.exit(1));
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  Sentry.captureException(reason);
  Sentry.flush(2000).finally(() => process.exit(1));
});
