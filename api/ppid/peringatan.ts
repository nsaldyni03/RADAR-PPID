import {
  HttpServiceError,
  leadershipAlertsHistory,
  recordLeadershipAlert,
} from '../_lib/ppidService.ts';

interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status: (code: number) => {
    json: (data: unknown) => void;
  };
  setHeader: (name: string, value: string) => void;
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json({ riwayat: leadershipAlertsHistory });
    return;
  }

  if (req.method === 'POST') {
    try {
      const body =
        typeof req.body === 'string'
          ? (JSON.parse(req.body) as {
              penerima?: unknown;
              nomorTiket?: unknown;
              pesanRingkas?: unknown;
            })
          : ((req.body ?? {}) as {
              penerima?: unknown;
              nomorTiket?: unknown;
              pesanRingkas?: unknown;
            });

      const logEntry = recordLeadershipAlert(body);
      res.status(200).json({ status: 'terkirim', log: logEntry });
    } catch (error: unknown) {
      if (error instanceof HttpServiceError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      res.status(500).json({ error: 'Gagal mencatat pengiriman peringatan pimpinan.' });
    }
    return;
  }

  res.setHeader('Allow', 'GET, POST');
  res.status(405).json({ error: 'Metode HTTP tidak diizinkan.' });
}
