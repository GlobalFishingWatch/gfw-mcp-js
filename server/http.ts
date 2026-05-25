import * as Sentry from '@sentry/node';
import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from '../mcp-server.js';
import { authenticate } from '../middleware/auth.js';
import { tokenStorage } from '../lib/api.js';

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

export async function startHttpServer(): Promise<void> {
  const port = parseInt(process.env.PORT ?? '4000', 10);
  const app = express();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.post('/mcp', authenticate, async (req, res) => {
    const token = req.headers.authorization!.substring(7);
    const mcpServer = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
      mcpServer.close();
    });

    await mcpServer.connect(transport);

    await tokenStorage.run(token, () =>
      transport.handleRequest(req, res, req.body),
    );
  });

  await new Promise<void>((resolve) => {
    app.listen(port, () => {
      console.error(`GFW MCP HTTP server running on port ${port}`);
      resolve();
    });
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
}
