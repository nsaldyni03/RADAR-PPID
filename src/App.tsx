import { useMemo, useState } from 'react';
import { BellRing, Info, ShieldCheck } from 'lucide-react';
import { HeaderBar } from './components/HeaderBar.tsx';
import { InputPanel } from './components/InputPanel.tsx';
import { LeadershipAlertModal } from './components/LeadershipAlertModal.tsx';
import { SummaryMetrics } from './components/SummaryMetrics.tsx';
import { TicketDetailPanel } from './components/TicketDetailPanel.tsx';
import { TicketList } from './components/TicketList.tsx';
import type { SlaFilterValue, ViewMode } from './components/TicketList.tsx';
import { CONTOH_DATA_PERMOHONAN } from './data/contohData.ts';
import {
  hitungIndikatorSla,
  hitungRingkasanTiket,
} from './shared/types.ts';
import type {
  LeadershipAlertLog,
  RadarPpidPayload,
  TiketPPID,
  UploadedAttachmentPayload,
} from './shared/types.ts';

export default function App() {
  const [teksInput, setTeksInput] = useState('');
  const [berkas, setBerkas] = useState<UploadedAttachmentPayload[]>([]);
  const [daftarTiket, setDaftarTiket] = useState<TiketPPID[]>([]);
  const [selectedTicketNo, setSelectedTicketNo] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [slaFilter, setSlaFilter] = useState<SlaFilterValue>('Semua');
  const [seksiFilter, setSeksiFilter] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<ViewMode>('tabel');

  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
  const [alertHistory, setAlertHistory] = useState<LeadershipAlertLog[]>([]);

  const ringkasan = useMemo(
    () => hitungRingkasanTiket(daftarTiket),
    [daftarTiket],
  );

  const urgentTickets = useMemo(
    () =>
      daftarTiket.filter(
        (t) =>
          t.status_tiket !== 'Data Terkirim / Selesai' &&
          (t.indikator_sla === 'Merah' ||
            t.indikator_sla === 'Kuning' ||
            t.butuh_konfirmasi),
      ),
    [daftarTiket],
  );

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return daftarTiket.filter((tiket) => {
      if (slaFilter === 'Konfirmasi' && !tiket.butuh_konfirmasi) return false;
      if (
        (slaFilter === 'Hijau' || slaFilter === 'Kuning' || slaFilter === 'Merah') &&
        tiket.indikator_sla !== slaFilter
      ) {
        return false;
      }
      if (seksiFilter !== 'Semua' && tiket.rekomendasi_seksi_teknis !== seksiFilter) {
        return false;
      }
      if (q) {
        const haystack = [
          tiket.nomor_tiket,
          tiket.kode_pemohon,
          tiket.ringkasan_permohonan,
          tiket.rekomendasi_seksi_teknis,
          tiket.catatan_data_atau_perpanjangan_teknis,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [daftarTiket, searchQuery, slaFilter, seksiFilter]);

  const selectedTicket = useMemo(
    () => daftarTiket.find((t) => t.nomor_tiket === selectedTicketNo) ?? null,
    [daftarTiket, selectedTicketNo],
  );

  function handleLoadSample() {
    setTeksInput(CONTOH_DATA_PERMOHONAN);
    setValidationError(null);
    setApiError(null);
  }

  function handleClearAll() {
    setTeksInput('');
    setBerkas([]);
    setValidationError(null);
    setApiError(null);
  }

  function handleAddBerkas(files: UploadedAttachmentPayload[]) {
    setBerkas((prev) => [...prev, ...files]);
    setValidationError(null);
  }

  function handleRemoveBerkas(index: number) {
    setBerkas((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function submitToAi() {
    if (!teksInput.trim() && berkas.length === 0) {
      setValidationError(
        'Input kosong: Mohon masukkan rincian permohonan informasi publik atau unggah minimal satu berkas (JPG, PNG, PDF, DOCX, TXT) sebelum menekan Lacak.',
      );
      return;
    }

    setValidationError(null);
    setApiError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ppid/tindak-lanjut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teksInput,
          berkas,
        }),
      });

      const rawText = await response.text();
      let payload: (Partial<RadarPpidPayload> & { error?: string }) | null = null;
      try {
        payload = JSON.parse(rawText) as Partial<RadarPpidPayload> & { error?: string };
      } catch {
        payload = null;
      }

      if (!response.ok || !payload || !Array.isArray(payload.daftar_tiket)) {
        const fallbackMsg =
          response.status === 404
            ? 'Endpoint API (/api/ppid/tindak-lanjut) tidak ditemukan di server hosting (404). Pastikan fungsi serverless /api ikut ter-deploy.'
            : response.status === 413
              ? 'Ukuran permintaan atau lampiran terlalu besar untuk server hosting (413). Kurangi ukuran berkas lampiran lalu coba lagi.'
              : 'Layanan AI sedang sibuk atau mengalami gangguan sementara. Silakan tekan tombol "Coba lagi".';
        throw new Error(payload?.error || fallbackMsg);
      }

      setDaftarTiket(payload.daftar_tiket);
      setSelectedTicketNo(payload.daftar_tiket[0]?.nomor_tiket ?? null);
      setSlaFilter('Semua');
      setSeksiFilter('Semua');
      setSearchQuery('');
    } catch (err) {
      setApiError(
        err instanceof Error
          ? err.message
          : 'Maaf, terjadi kendala saat menghubungi server AI. Silakan tekan tombol "Coba lagi".',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleUpdateTicket(nomorTiket: string, patch: Partial<TiketPPID>) {
    setDaftarTiket((prev) =>
      prev.map((tiket) => {
        if (tiket.nomor_tiket !== nomorTiket) return tiket;
        return { ...tiket, ...patch };
      }),
    );
  }

  function handleExtendSla7Days(nomorTiket: string) {
    setDaftarTiket((prev) =>
      prev.map((tiket) => {
        if (tiket.nomor_tiket !== nomorTiket) return tiket;
        const newSisaHari = tiket.sisa_hari_kerja + 7;
        return {
          ...tiket,
          status_tiket: 'Perpanjangan 7 Hari',
          sisa_hari_kerja: newSisaHari,
          indikator_sla: hitungIndikatorSla(newSisaHari),
        };
      }),
    );
  }

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <HeaderBar
        urgentCount={urgentTickets.length}
        hasTickets={daftarTiket.length > 0}
        onOpenAlertModal={() => setIsAlertModalOpen(true)}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Identitas Instansi & Konteks Operasional */}
        <div className="space-y-2">
          <p className="text-xs sm:text-sm font-medium text-[#2F318B]">
            Balai Teknik Perkeretaapian Kelas I Surabaya · Direktorat Jenderal Perkeretaapian ·
            Kementerian Perhubungan
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 max-w-3xl text-balance">
            Pemantauan Layanan Informasi Publik &amp; Disposisi PPID
          </h1>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Registrasi otomatis permohonan informasi perkeretaapian dengan penyamaran identitas
            pemohon, klasifikasi kategori informasi UU KIP, pemantauan SLA 10 hari kerja, dan
            penyusunan draf tanggapan resmi Pimpinan.
          </p>
        </div>

        {/* Panel Input & Unggah Dokumen */}
        <InputPanel
          teksInput={teksInput}
          onChangeTeks={(val) => {
            setTeksInput(val);
            if (validationError) setValidationError(null);
          }}
          berkas={berkas}
          onAddBerkas={handleAddBerkas}
          onRemoveBerkas={handleRemoveBerkas}
          onLoadSample={handleLoadSample}
          onClearAll={handleClearAll}
          onSubmit={submitToAi}
          isLoading={isLoading}
          validationError={validationError}
          apiError={apiError}
          onRetry={submitToAi}
        />

        {/* Ringkasan Metrik SLA */}
        <SummaryMetrics ringkasan={ringkasan} />

        {/* Banner Peringatan Eskalasi Pimpinan (muncul otomatis jika ada tiket mendesak) */}
        {urgentTickets.length > 0 && (
          <div className="rounded-xl border border-[#2F318B]/25 bg-[#2F318B]/[0.04] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#FDD100] text-slate-900 shrink-0 mt-0.5">
                <BellRing className="w-4 h-4" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-slate-900">
                  Perhatian Pimpinan: <span className="font-mono tabular-nums">{urgentTickets.length}</span>{' '}
                  tiket perlu tindak lanjut segera
                </p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  Terdapat permohonan berstatus SLA Merah (Overdue), SLA Kuning (sisa 1–3 hari
                  kerja), atau memerlukan konfirmasi kejelasan dokumen sebelum dikirimkan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAlertModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#2F318B] text-white hover:bg-[#23256e] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <BellRing className="w-3.5 h-3.5 text-[#FDD100]" aria-hidden="true" />
              <span>Kirim Peringatan Pimpinan</span>
            </button>
          </div>
        )}

        {/* Workspace Daftar Tiket & Panel Detail Disposisi */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 xl:col-span-8">
            <TicketList
              tiketList={filteredTickets}
              selectedTicketNo={selectedTicketNo}
              onSelectTicket={setSelectedTicketNo}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              slaFilter={slaFilter}
              onSlaFilterChange={setSlaFilter}
              seksiFilter={seksiFilter}
              onSeksiFilterChange={setSeksiFilter}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isLoading={isLoading}
              hasAnyData={daftarTiket.length > 0}
              onLoadSample={handleLoadSample}
            />
          </div>

          <div className="lg:col-span-5 xl:col-span-4">
            <TicketDetailPanel
              tiket={selectedTicket}
              onUpdateTicket={handleUpdateTicket}
              onExtendSla7Days={handleExtendSla7Days}
            />
          </div>
        </div>

        {/* Ringkasan Ketentuan Layanan & SLA UU KIP */}
        <section
          id="catatan-kepatuhan"
          aria-labelledby="heading-ketentuan-sla"
          className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-[#2F318B]" aria-hidden="true" />
            <h2
              id="heading-ketentuan-sla"
              className="font-display text-base font-bold text-slate-900"
            >
              Standar Operasional &amp; Aturan SLA PPID (UU No. 14 Tahun 2008)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs text-slate-600 leading-relaxed">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">1. Anonimisasi Pemohon Tanpa Bias</p>
              <p>
                Identitas pribadi (nama, NIK, nomor telepon/WhatsApp, email) disamarkan otomatis
                menjadi <span className="font-mono text-slate-800">Pemohon-01</span>,{' '}
                <span className="font-mono text-slate-800">Pemohon-02</span>, dan seterusnya agar
                penilaian Pimpinan dan Seksi Teknis berlangsung objektif.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">2. Batas Waktu 10 + 7 Hari Kerja</p>
              <p>
                SLA Hijau (&gt; 3 hari kerja), SLA Kuning (1–3 hari kerja, prioritas tinggi), dan
                SLA Merah (&le; 0 hari kerja / Overdue). Perpanjangan +7 hari kerja atau status
                selesai wajib disertai alasan tertulis dari Seksi Teknis.
              </p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">
                3. Disposisi &amp; Konfirmasi Dokumen
              </p>
              <p>
                Pimpinan berwenang mengonfirmasi atau memindahkan Seksi Teknis tujuan. Permohonan
                yang buram, tidak jelas, atau menyangkut informasi dikecualikan ditandai untuk
                konfirmasi sebelum informasi diberikan.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer & Disclaimer */}
      <footer className="border-t border-slate-200 bg-white mt-8">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-3">
          <div className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
            <Info className="w-4 h-4 text-[#2A9ED3] shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong className="text-slate-800">Disclaimer:</strong> RADAR-PPID adalah prototipe
              pelatihan berbasis AI untuk simulasi layanan informasi publik di lingkungan Balai
              Teknik Perkeretaapian Kelas I Surabaya. Seluruh data awal merupakan data simulasi
              (dummy), tidak terhubung ke basis data produksi, dan setiap hasil klasifikasi,
              disposisi, maupun draf tanggapan wajib ditelaah serta diverifikasi oleh PPID dan
              Pimpinan sebelum diterbitkan secara resmi sesuai UU KIP.
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>Balai Teknik Perkeretaapian Kelas I Surabaya · Prototipe Pelatihan PPID</span>
            <span>Tanpa login · Penyimpanan sesi sementara</span>
          </div>
        </div>
      </footer>

      <LeadershipAlertModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        urgentTickets={urgentTickets}
        alertHistory={alertHistory}
        onAlertSent={(log) => setAlertHistory((prev) => [log, ...prev])}
      />
    </div>
  );
}
