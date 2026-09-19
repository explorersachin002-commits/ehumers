import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { seedInitialDataIfNeeded } from './server/db.js';
import { apiRouter } from './server/routes/api.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and seed database if empty
  try {
    seedInitialDataIfNeeded();
  } catch (e) {
    console.error('Database initialization warning:', e);
  }

  // Middleware for JSON body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Disable caching on all API endpoints to guarantee real-time updates and fresh ledger sync
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
  });

  // API Routes FIRST
  app.use('/api', apiRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Global JSON Error Handler for /api to guarantee no HTML 500 pages are sent to client fetch()
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error handler caught:', err);
    if (res.headersSent) {
      return next(err);
    }
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
      error: err.message || 'An internal server error occurred',
      code: err.code || 'INTERNAL_SERVER_ERROR',
    });
  });

  // Vite middleware for development vs Static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Office Registry Server listening on http://0.0.0.0:${PORT}`);
  });

  // Ensure keep-alive connections don't prematurely close under reverse proxy or during slow user entry
  server.keepAliveTimeout = 120000; // 120 seconds
  server.headersTimeout = 125000; // 125 seconds
  server.requestTimeout = 300000; // 5 minutes
}

startServer();
