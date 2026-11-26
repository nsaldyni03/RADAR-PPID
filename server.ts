import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fs from 'fs';
import mammoth from 'mammoth';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  INDIKATOR_SLA_OPTIONS,
  KATEGORI_INFORMASI_OPTIONS,
  SALURAN_MASUK_OPTIONS,
  SEKSI_TEKNIS_OPTIONS,
  STATUS_TIKET_OPTIONS,
  hitungIndikatorSla,
} from './src/shared/types.ts';
import type {
  IndikatorSLA,
  KategoriInformasi,
  LeadershipAlertLog,
  RadarPpidPayload,
  SaluranMasuk,
  SeksiTeknis,
  StatusTiket,
  TiketPPID,
  UploadedAttachmentPayload,
} from './src/shared/types.ts';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DEFAULT_GEMINI_MODEL = 'gemini-4-hydrogen';
const MAX_FILES = 10;
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per berkas

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const leadershipAlertsHistory: LeadershipAlertLog[] = [];

function getGeminiModelName(): string {
  const configured = process.env.GEMINI_MODEL?.trim();
  return configured && configured.length > 0 ? configured : DEFAULT_GEMINI_MODEL;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY_MISSING');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function coerceEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string') {
    const exact = allowed.find((item) => item === value.trim());
    if (exact) return exact;
    const lower = value.trim().toLowerCase();
    const insensitive = allowed.find((item) => item.toLowerCase() === lower);
    if (insensitive) return insensitive;
  }
  return fallback;
}

function validateAndNormalizeOutput(raw: unknown): RadarPpidPayload {
  let candidate: unknown = raw;
  if (Array.isArray(raw)) {
    if (raw.length === 0) {
      throw new Error('AI mengembalikan array kosong.');
    }
    candidate = raw[0];
  }

  if (!candidate || typeof candidate !== 'object') {
    throw new Error('Format JSON dari AI tidak sesuai objek yang diharapkan.');
  }

  const record = candidate as Record<string, unknown>;
  const rawList = record.daftar_tiket;
  if (!Array.isArray(rawList)) {
    throw new Error('Properti daftar_tiket tidak ditemukan atau bukan array.');
  }

  const normalizedTickets: TiketPPID[] = rawList.map((item, idx) => {
    const t = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;

    const nomorTiket =
      typeof t.nomor_tiket === 'string' && t.nomor_tiket.trim().length > 0
        ? t.nomor_tiket.trim()
        : `PPID-2026-${String(idx + 1).padStart(4, '0')}`;

    const kodePemohon =
      typeof t.kode_pemohon === 'string' && /^Pemohon-\d+/i.test(t.kode_pemohon.trim())
        ? t.kode_pemohon.trim()
        : `Pemohon-${String(idx + 1).padStart(2, '0')}`;

    const saluranMasuk = coerceEnum<SaluranMasuk>(
      t.saluran_masuk,
      SALURAN_MASUK_OPTIONS,
      'Formulir Online',
    );

    const ringkasanPermohonan =
      typeof t.ringkasan_permohonan === 'string' && t.ringkasan_permohonan.trim().length > 0
        ? t.ringkasan_permohonan.trim()
        : 'Permohonan informasi publik perkeretaapian.';

    const kategoriInformasi = coerceEnum<KategoriInformasi>(
      t.kategori_informasi,
      KATEGORI_INFORMASI_OPTIONS,
      'Perlu Telaah',
    );

    const rekomendasiSeksi = coerceEnum<SeksiTeknis>(
      t.rekomendasi_seksi_teknis,
      SEKSI_TEKNIS_OPTIONS,
      'Subbagian Tata Usaha',
    );

    const statusTiket = coerceEnum<StatusTiket>(
      t.status_tiket,
      STATUS_TIKET_OPTIONS,
      'Baru Masuk',
    );

    const parsedDays =
      typeof t.sisa_hari_kerja === 'number' && Number.isFinite(t.sisa_hari_kerja)
        ? Math.round(t.sisa_hari_kerja)
        : 10;

    const computedSla = hitungIndikatorSla(parsedDays);
    const indikatorSla = coerceEnum<IndikatorSLA>(
      t.indikator_sla,
      INDIKATOR_SLA_OPTIONS,
      computedSla,
    );

    const butuhKonfirmasi = Boolean(t.butuh_konfirmasi);

    const catatan =
      typeof t.catatan_data_atau_perpanjangan_teknis === 'string'
        ? t.catatan_data_atau_perpanjangan_teknis.trim()
        : '';

    const drafTanggapan =
      typeof t.draf_tanggapan_pimpinan === 'string' && t.draf_tanggapan_pimpinan.trim().length > 0
        ? t.draf_tanggapan_pimpinan.trim()
        : 'Yth. Pemohon Informasi Publik,\n\nTerima kasih telah menghubungi PPID Balai Teknik Perkeretaapian Kelas I Surabaya. Permohonan Anda telah kami registrasikan dan sedang dalam proses penelaahan oleh unit teknis terkait sesuai ketentuan UU No. 14 Tahun 2008 tentang Keterbukaan Informasi Publik.\n\nHormat kami,\nPPID Balai Teknik Perkeretaapian Kelas I Surabaya';

    return {
      nomor_tiket: nomorTiket,
      kode_pemohon: kodePemohon,
      saluran_masuk: saluranMasuk,
      ringkasan_permohonan: ringkasanPermohonan,
      kategori_informasi: kategoriInformasi,
      rekomendasi_seksi_teknis: rekomendasiSeksi,
      status_tiket: statusTiket,
      sisa_hari_kerja: parsedDays,
      indikator_sla: indikatorSla,
      butuh_konfirmasi: butuhKonfirmasi,
      catatan_data_atau_perpanjangan_teknis: catatan,
      draf_tanggapan_pimpinan: drafTanggapan,
    };
  });

  let slaHijau = 0;
  let slaKuning = 0;
  let slaMerah = 0;
  let butuhPerpanjangan = 0;

  for (const t of normalizedTickets) {
    if (t.indikator_sla === 'Hijau') slaHijau += 1;
    else if (t.indikator_sla === 'Kuning') slaKuning += 1;
    else slaMerah += 1;

    if (
      t.status_tiket === 'Perpanjangan 7 Hari' ||
      (t.indikator_sla !== 'Hijau' && t.status_tiket !== 'Data Terkirim / Selesai')
    ) {
      butuhPerpanjangan += 1;
    }
  }

  const rawSummary =
    record.ringkasan && typeof record.ringkasan === 'object'
      ? (record.ringkasan as Record<string, unknown>)
      : {};

  return {
    ringkasan: {
      total_tiket: normalizedTickets.length,
      sla_hijau:
        typeof rawSummary.sla_hijau === 'number' && rawSummary.sla_hijau >= 0
          ? slaHijau
          : slaHijau,
      sla_kuning:
        typeof rawSummary.sla_kuning === 'number' && rawSummary.sla_kuning >= 0
          ? slaKuning
          : slaKuning,
      sla_merah:
        typeof rawSummary.sla_merah === 'number' && rawSummary.sla_merah >= 0
          ? slaMerah
          : slaMerah,
      butuh_perpanjangan:
        typeof rawSummary.butuh_perpanjangan === 'number' && rawSummary.butuh_perpanjangan >= 0
          ? Math.max(butuhPerpanjangan, Math.round(rawSummary.butuh_perpanjangan))
          : butuhPerpanjangan,
    },
    daftar_tiket: normalizedTickets,
  };
}

function getTodayJakartaFormatted(): string {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function extractAttachmentPart(file: UploadedAttachmentPayload) {
  if (!file || typeof file.name !== 'string' || typeof file.dataBase64 !== 'string') {
    throw new Error('Format berkas unggahan tidak valid.');
  }

  const lowerName = file.name.toLowerCase();
  let mimeType = file.mimeType;

  if (!mimeType || mimeType === 'application/octet-stream') {
    if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) mimeType = 'image/jpeg';
    else if (lowerName.endsWith('.png')) mimeType = 'image/png';
    else if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
    else if (lowerName.endsWith('.docx'))
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    else if (lowerName.endsWith('.txt')) mimeType = 'text/plain';
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `Format berkas "${file.name}" tidak didukung. Gunakan JPG, PNG, PDF, DOCX, atau TXT.`,
    );
  }

  const buffer = Buffer.from(file.dataBase64, 'base64');
  if (buffer.byteLength > MAX_FILE_BYTES) {
    throw new Error(`Ukuran berkas "${file.name}" melebihi batas maksimal 10 MB.`);
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    const extractedText = result.value.trim();
    return {
      text: `[Lampiran Dokumen DOCX: ${file.name}]\n${extractedText || '(Dokumen kosong atau tidak terbaca)'}`,
    };
  }

  if (mimeType === 'text/plain') {
    const textContent = buffer.toString('utf-8').trim();
    return {
      text: `[Lampiran Berkas TXT: ${file.name}]\n${textContent || '(Berkas teks kosong)'}`,
    };
  }

  return {
    inlineData: {
      mimeType,
      data: file.dataBase64,
    },
  };
}

const radarResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      ringkasan: {
        type: Type.OBJECT,
        properties: {
          total_tiket: { type: Type.INTEGER },
          sla_hijau: { type: Type.INTEGER },
          sla_kuning: { type: Type.INTEGER },
          sla_merah: { type: Type.INTEGER },
          butuh_perpanjangan: { type: Type.INTEGER },
        },
        required: [
          'total_tiket',
          'sla_hijau',
          'sla_kuning',
          'sla_merah',
          'butuh_perpanjangan',
        ],
      },
      daftar_tiket: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nomor_tiket: { type: Type.STRING },
            kode_pemohon: { type: Type.STRING },
            saluran_masuk: { type: Type.STRING },
            ringkasan_permohonan: { type: Type.STRING },
            kategori_informasi: { type: Type.STRING },
            rekomendasi_seksi_teknis: { type: Type.STRING },
            status_tiket: { type: Type.STRING },
            sisa_hari_kerja: { type: Type.INTEGER },
            indikator_sla: { type: Type.STRING },
            butuh_konfirmasi: { type: Type.BOOLEAN },
            catatan_data_atau_perpanjangan_teknis: { type: Type.STRING },
            draf_tanggapan_pimpinan: { type: Type.STRING },
          },
          required: [
            'nomor_tiket',
            'kode_pemohon',
            'saluran_masuk',
            'ringkasan_permohonan',
            'kategori_informasi',
            'rekomendasi_seksi_teknis',
            'status_tiket',
            'sisa_hari_kerja',
            'indikator_sla',
            'butuh_konfirmasi',
            'catatan_data_atau_perpanjangan_teknis',
            'draf_tanggapan_pimpinan',
          ],
        },
      },
    },
    required: ['ringkasan', 'daftar_tiket'],
  },
};

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
    const body = req.body as {
      penerima?: unknown;
      nomorTiket?: unknown;
      pesanRingkas?: unknown;
    };

    const penerima =
      typeof body.penerima === 'string' && body.penerima.trim().length > 0
        ? body.penerima.trim()
        : 'Kepala Balai Teknik Perkeretaapian Kelas I Surabaya';

    const nomorTiket = Array.isArray(body.nomorTiket)
      ? body.nomorTiket.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
      : [];

    const pesanRingkas =
      typeof body.pesanRingkas === 'string' && body.pesanRingkas.trim().length > 0
        ? body.pesanRingkas.trim()
        : '';

    if (nomorTiket.length === 0 || !pesanRingkas) {
      res.status(400).json({
        error: 'Daftar nomor tiket prioritas dan isi pesan peringatan wajib diisi.',
      });
      return;
    }

    const logEntry: LeadershipAlertLog = {
      id: `ALR-${Date.now()}`,
      dikirimPada: new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date()),
      penerima,
      jumlahTiketMendesak: nomorTiket.length,
      nomorTiket,
      pesanRingkas,
    };

    leadershipAlertsHistory.unshift(logEntry);
    if (leadershipAlertsHistory.length > 20) {
      leadershipAlertsHistory.length = 20;
    }

    res.json({ status: 'terkirim', log: logEntry });
  });

  app.post('/api/ppid/tindak-lanjut', async (req, res) => {
    try {
      const body = req.body as {
        teksInput?: unknown;
        berkas?: unknown;
      };

      const teksInput = typeof body.teksInput === 'string' ? body.teksInput.trim() : '';
      const berkasList = Array.isArray(body.berkas)
        ? (body.berkas as UploadedAttachmentPayload[])
        : [];

      if (!teksInput && berkasList.length === 0) {
        res.status(400).json({
          error:
            'Input kosong: Mohon masukkan rincian permohonan informasi publik atau unggah minimal satu berkas (JPG, PNG, PDF, DOCX, TXT) sebelum menekan Lacak.',
        });
        return;
      }

      if (berkasList.length > MAX_FILES) {
        res.status(400).json({
          error: `Maksimal ${MAX_FILES} berkas dapat diunggah dalam satu kali pemrosesan.`,
        });
        return;
      }

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> =
        [];

      for (const berkas of berkasList) {
        const part = await extractAttachmentPart(berkas);
        parts.push(part);
      }

      const todayStr = getTodayJakartaFormatted();
      const promptText = [
        `Tanggal acuan hari ini (WIB): ${todayStr}.`,
        'Analisis seluruh data permohonan informasi publik di bawah ini dan dari seluruh lampiran (gambar/PDF/DOCX/TXT) yang disertakan.',
        'Ekstrak setiap permohonan sebagai tiket terpisah pada daftar_tiket.',
        teksInput
          ? `\n=== TEKS INPUT ADMIN PPID ===\n${teksInput}`
          : '\n(Tidak ada teks tambahan; ekstrak seluruh permohonan dari dokumen/gambar terlampir.)',
      ].join('\n');

      parts.push({ text: promptText });

      const systemInstruction = `Kamu adalah RADAR-PPID, AI Agent resmi untuk simulasi layanan Pejabat Pengelola Informasi dan Dokumentasi (PPID) pada Balai Teknik Perkeretaapian Kelas I Surabaya (Direktorat Jenderal Perkeretaapian, Kementerian Perhubungan RI).

Tugasmu adalah membaca teks input dan/atau lampiran gambar/dokumen permohonan informasi publik, lalu menghasilkan JSON terstruktur sesuai skema yang diberikan dengan mematuhi SELURUH aturan berikut secara ketat:

1. ATURAN PRIVASI & ANONIMISASI (MUTLAK):
   - Setiap identitas pribadi pemohon yang terbaca dari teks maupun gambar/dokumen (nama lengkap, NIK, nomor WhatsApp/telepon, alamat rumah, akun media sosial, dan alamat email) WAJIB disamarkan secara otomatis menjadi kode Pemohon-01, Pemohon-02, Pemohon-03, dan seterusnya secara berurutan.
   - DILARANG keras mencantumkan nama asli, NIK, nomor telepon, atau email pemohon di field mana pun (termasuk di ringkasan_permohonan, catatan_data_atau_perpanjangan_teknis, maupun draf_tanggapan_pimpinan).

2. ATURAN DISPOSISI & PENANDAAN KONFIRMASI:
   - Klasifikasikan kategori_informasi secara tepat ke salah satu dari: "Berkala", "Serta Merta", "Setiap Saat", atau "Perlu Telaah".
   - Berikan rekomendasi_seksi_teknis yang paling relevan dari empat unit kerja berikut:
     * "Seksi Prasarana" (jalur kereta api, rel, jembatan, stasiun, proyek jalur ganda/double track, elektrifikasi, persinyalan/telekomunikasi).
     * "Seksi Lalu Lintas & Sarana" (data perjalanan KA, grafik perjalanan, naik-turun penumpang, angkutan barang, sarana lokomotif/kereta).
     * "Seksi Keselamatan & Pengawasan" (kecelakaan kereta api, perlintasan sebidang/JPL, audit keselamatan, inspeksi darurat, mitigasi gangguan operasional).
     * "Subbagian Tata Usaha" (kepegawaian, BMN/aset lahan, kerja sama/perjanjian umum, anggaran umum, surat-menyurat & tata kelola PPID).
   - Apabila rincian informasi tidak jelas/terlalu luas, gambar/dokumen tampak buram/terpotong, atau menyangkut informasi yang berpotensi dikecualikan/sensitif (seperti rincian RAB internal penyedia jasa, kontrak rahasia, atau data pribadi pihak ketiga sesuai Pasal 17 UU KIP), WAJIB tandai butuh_konfirmasi = true dan tuliskan secara jelas hal yang perlu dikonfirmasi pada field catatan_data_atau_perpanjangan_teknis.

3. ATURAN PRIORITAS SLA & PERPANJANGAN WAKTU (UU KIP No. 14 Tahun 2008):
   - Batas waktu standar penyelesaian tiket adalah 10 hari kerja sejak tanggal masuk hingga tanggal acuan hari ini (${todayStr}), dengan memperhitungkan hari kerja Senin–Jumat.
   - Hitung sisa_hari_kerja secara realistis (dapat bernilai negatif jika sudah melewati 10 hari kerja).
   - Tentukan indikator_sla berdasarkan sisa_hari_kerja:
     * sisa_hari_kerja > 3 -> "Hijau"
     * sisa_hari_kerja 1 sampai 3 -> "Kuning" (Prioritas Tinggi)
     * sisa_hari_kerja <= 0 -> "Merah" (Overdue)
   - Tentukan status_tiket yang sesuai dari: "Baru Masuk", "Didisposisikan Pimpinan", "Diproses Seksi Teknis", "Perpanjangan 7 Hari", atau "Data Terkirim / Selesai".
   - Jika tiket memerlukan perpanjangan waktu +7 hari kerja (karena kompleksitas/lintas unit/mendekati tenggat) atau perlu penjelasan teknis awal, isi field catatan_data_atau_perpanjangan_teknis secara informatif dalam bahasa Indonesia baku.

4. ATURAN GAYA KELUARAN & FORMAT DRAF TANGGAPAN:
   - Seluruh teks wajib berbahasa Indonesia baku yang sopan, informatif, netral, profesional, dan mengacu pada prosedur PPID DJKA / Kementerian Perhubungan (Balai Teknik Perkeretaapian Kelas I Surabaya).
   - Draf tanggapan pimpinan (draf_tanggapan_pimpinan) TIDAK BOLEH menjanjikan ketersediaan atau pengiriman dokumen yang belum dikonfirmasi oleh Seksi Teknis (gunakan frasa seperti "sedang dalam proses verifikasi dan koordinasi dengan unit teknis terkait" atau "memerlukan konfirmasi/klarifikasi rincian lebih lanjut").
   - Gunakan nomor tiket berurutan berformat "PPID-2026-0001", "PPID-2026-0002", dst.
   - Hitung angka ringkasan secara akurat sesuai jumlah tiket pada daftar_tiket.`;

      const ai = getGeminiClient();
      const modelName = getGeminiModelName();

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: radarResponseSchema,
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error('Respons dari Gemini AI kosong.');
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('[RADAR-PPID] JSON Parse Error from Gemini:', parseErr, rawText);
        throw new Error('Respons AI tidak berupa JSON yang valid.');
      }

      const validated = validateAndNormalizeOutput(parsedJson);
      res.json(validated);
    } catch (error: unknown) {
      const errObj = error as { status?: number; statusCode?: number; message?: string; code?: unknown };
      const statusCode =
        typeof errObj?.status === 'number'
          ? errObj.status
          : typeof errObj?.statusCode === 'number'
            ? errObj.statusCode
            : 500;
      const originalMessage = errObj?.message || String(error);

      console.error(
        `[RADAR-PPID] Gemini API Error (status=${statusCode}): ${originalMessage}`,
        error,
      );

      if (originalMessage === 'GEMINI_API_KEY_MISSING') {
        res.status(503).json({
          error:
            'Kunci API Gemini belum terpasang pada konfigurasi server (GEMINI_API_KEY). Silakan atur pada panel Secrets terlebih dahulu.',
          statusCode: 503,
        });
        return;
      }

      if (statusCode === 400 || statusCode === 403) {
        res.status(statusCode).json({
          error:
            'Permintaan ditolak oleh layanan AI atau kunci API belum valid. Silakan periksa konfigurasi GEMINI_API_KEY di panel Secrets dan coba lagi.',
          statusCode,
        });
        return;
      }

      if (statusCode === 429) {
        res.status(429).json({
          error:
            'Layanan AI sedang sibuk atau mencapai batas permintaan sementara. Mohon tunggu beberapa saat lalu tekan "Coba lagi".',
          statusCode,
        });
        return;
      }

      res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
        error:
          'Maaf, terjadi kendala saat memproses permohonan melalui layanan AI. Silakan tekan tombol "Coba lagi".',
        statusCode,
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
