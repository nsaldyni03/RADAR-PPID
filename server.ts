import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  HttpServiceError,
  leadershipAlertsHistory,
  mapServiceError,
  processTindakLanjut,
  recordLeadershipAlert,
} from './api/_lib/ppidService.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'RADAR-PPID' });
  });

  app.get('/api/ppid/peringatan', (_req, res) => {
    res.json({ riwayat: leadershipAlertsHistory });
  });

  app.post('/api/ppid/peringatan', (req, res) => {
    try {
      const logEntry = recordLeadershipAlert(
        (req.body ?? {}) as {
          penerima?: unknown;
          nomorTiket?: unknown;
          pesanRingkas?: unknown;
        },
      );
      res.json({ status: 'terkirim', log: logEntry });
    } catch (error: unknown) {
      if (error instanceof HttpServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Gagal mencatat pengiriman peringatan pimpinan.' });
    }
  });

  app.post('/api/ppid/tindak-lanjut', async (req, res) => {
    try {
      const validated = await processTindakLanjut(
        (req.body ?? {}) as {
          teksInput?: unknown;
          berkas?: unknown;
        },
      );
      res.json(validated);
    } catch (error: unknown) {
      const mapped = mapServiceError(error);
      res.status(mapped.statusCode).json({
        error: mapped.error,
        statusCode: mapped.statusCode,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('/{*splat}', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RADAR-PPID server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[RADAR-PPID] Fatal startup error:', err);
  process.exit(1);
});
