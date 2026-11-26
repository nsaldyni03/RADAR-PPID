import { mapServiceError, processTindakLanjut } from '../_lib/ppidService.ts';

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

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Metode HTTP tidak diizinkan. Gunakan POST.' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as { teksInput?: unknown; berkas?: unknown })
        : ((req.body ?? {}) as { teksInput?: unknown; berkas?: unknown });

    const validated = await processTindakLanjut(body);
    res.status(200).json(validated);
  } catch (error: unknown) {
    const mapped = mapServiceError(error);
    res.status(mapped.statusCode).json({
      error: mapped.error,
      statusCode: mapped.statusCode,
    });
  }
}
