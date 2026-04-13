import * as Sentry from '@sentry/node';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { authenticate, API_KEY } from './middleware/auth.js';
import { createServer } from './mcp-server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

Sentry.init({
  dsn: 'https://02861a39640f96d39216f83d54f233cd@o4510353401577472.ingest.us.sentry.io/4511211505057792',
  environment: process.env.NODE_ENV || 'production',
  sendDefaultPii: true,
});

const app = express();
app.use(express.json());

const server = createServer();

// app.post('/mcp', authenticate, async (req, res) => {
//   const transport = new StreamableHTTPServerTransport({
//     sessionIdGenerator: undefined,
//     enableJsonResponse: true,
//   });

//   res.on('close', () => {
//     transport.close();
//   });

//   await server.connect(transport);
//   await transport.handleRequest(req, res, req.body);
// });

// const port = parseInt(process.env.PORT || '4000');
// app
//   .listen(port, () => {
//     console.error(`Demo MCP Server running on http://localhost:${port}/mcp`);
//     if (API_KEY) {
//       console.error('🔐 Authentication enabled: API key required');
//     } else {
//       console.error(
//         '⚠️  Authentication disabled: No API key configured (set API_KEY or MCP_API_KEY env var)'
//       );
//     }
//   })
//   .on('error', (error) => {
//     console.error('Server error:', error);
//     process.exit(1);
//   });

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Demo MCP Server running on stdio');
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
