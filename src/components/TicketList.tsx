import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  LayoutGrid,
  Search,
  ShieldAlert,
  Table as TableIcon,
} from 'lucide-react';
import { SEKSI_TEKNIS_OPTIONS } from '../shared/types.ts';
import type { IndikatorSLA, TiketPPID } from '../shared/types.ts';

export type SlaFilterValue = 'Semua' | IndikatorSLA | 'Konfirmasi';
export type ViewMode = 'tabel' | 'kartu';

interface TicketListProps {
  tiketList: TiketPPID[];
  selectedTicketNo: string | null;
  onSelectTicket: (nomorTiket: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  slaFilter: SlaFilterValue;
  onSlaFilterChange: (val: SlaFilterValue) => void;
  seksiFilter: string;
  onSeksiFilterChange: (val: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isLoading: boolean;
  hasAnyData: boolean;
  onLoadSample: () => void;
}

function SlaIndicatorInline({
  indikator,
  sisaHari,
}: {
  indikator: IndikatorSLA;
  sisaHari: number;
}) {
  const hariLabel =
    sisaHari < 0
      ? `Terlambat ${Math.abs(sisaHari)} hari kerja`
      : sisaHari === 0
        ? 'Hari terakhir (0 hari kerja)'
        : `Sisa ${sisaHari} hari kerja`;

  if (indikator === 'Merah') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="font-mono tabular-nums">Merah · {hariLabel}</span>
      </div>
    );
  }

  if (indikator === 'Kuning') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span className="font-mono tabular-nums">Kuning · {hariLabel}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span className="font-mono tabular-nums">Hijau · {hariLabel}</span>
    </div>
  );
}

export function TicketList({
  tiketList,
  selectedTicketNo,
  onSelectTicket,
  searchQuery,
  onSearchChange,
  slaFilter,
  onSlaFilterChange,
  seksiFilter,
  onSeksiFilterChange,
  viewMode,
  onViewModeChange,
  isLoading,
  hasAnyData,
  onLoadSample,
}: TicketListProps) {
  const filterTabs: Array<{ value: SlaFilterValue; label: string }> = [
    { value: 'Semua', label: 'Semua' },
    { value: 'Merah', label: 'SLA Merah' },
    { value: 'Kuning', label: 'SLA Kuning' },
    { value: 'Hijau', label: 'SLA Hijau' },
    { value: 'Konfirmasi', label: 'Butuh Konfirmasi' },
  ];

  return (
    <section
      id="daftar-tiket"
      aria-labelledby="heading-daftar-tiket"
      className="bg-white border border-slate-200 rounded-xl overflow-hidden"
    >
      {/* Header & Toolbar Filter */}
      <div className="p-4 sm:p-5 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2
              id="heading-daftar-tiket"
              className="font-display text-lg font-bold text-slate-900"
            >
              Daftar Tiket &amp; Pemantauan Disposisi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tiket untuk menetapkan disposisi Seksi Teknis, mencatat perpanjangan +7 hari,
              atau menyunting draf tanggapan Pimpinan.
            </p>
          </div>

          {/* Toggle Tabel / Kartu */}
          <div
            role="group"
            aria-label="Mode tampilan daftar tiket"
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg self-start sm:self-auto shrink-0"
          >
            <button
              type="button"
              onClick={() => onViewModeChange('tabel')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'tabel'
                  ? 'bg-white text-[#2F318B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('kartu')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'kartu'
                  ? 'bg-white text-[#2F318B] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Kartu</span>
            </button>
          </div>
        </div>

        {/* Bar Pencarian & Filter */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {filterTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => onSlaFilterChange(tab.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  slaFilter === tab.value
                    ? 'bg-white text-[#2F318B] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari nomor tiket / ringkasan..."
                aria-label="Cari nomor tiket atau ringkasan permohonan"
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#2F318B] focus:outline-none"
              />
            </div>

            <select
              value={seksiFilter}
              onChange={(e) => onSeksiFilterChange(e.target.value)}
              aria-label="Filter berdasarkan Seksi Teknis"
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-700 focus:border-[#2F318B] focus:outline-none cursor-pointer"
            >
              <option value="Semua">Semua Seksi Teknis</option>
              {SEKSI_TEKNIS_OPTIONS.map((seksi) => (
                <option key={seksi} value={seksi}>
                  {seksi}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Konten Daftar Tiket */}
      {isLoading ? (
        <div className="p-5 space-y-3" aria-busy="true" aria-label="Memuat hasil analisis AI">
          {[1, 2, 3, 4].map((row) => (
            <div
              key={row}
              className="h-16 rounded-lg bg-slate-100 animate-pulse border border-slate-200/70"
            />
          ))}
        </div>
      ) : !hasAnyData ? (
        <div className="px-6 py-12 text-center max-w-md mx-auto">
          <p className="font-display text-base font-bold text-slate-900">
            Belum ada tiket permohonan diproses
          </p>
          <p className="text-sm text-slate-600 mt-1.5">
            Masukkan teks permohonan atau unggah berkas dokumen di panel atas, lalu klik{' '}
            <strong className="text-[#2F318B]">Lacak</strong>. Untuk simulasi cepat, Anda
            dapat memuat 6 contoh data layanan perkeretaapian.
          </p>
          <button
            type="button"
            onClick={onLoadSample}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border border-[#2A9ED3]/40 bg-[#2A9ED3]/10 text-[#1d6f96] hover:bg-[#2A9ED3]/20 transition-colors cursor-pointer"
          >
            <Database className="w-4 h-4" aria-hidden="true" />
            <span>Muat Contoh Data</span>
          </button>
        </div>
      ) : tiketList.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">
            Tidak ada tiket yang sesuai dengan filter pencarian.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Ubah kata kunci pencarian atau pilih filter SLA &ldquo;Semua&rdquo;.
          </p>
        </div>
      ) : viewMode === 'tabel' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4 whitespace-nowrap">Tiket &amp; Pemohon</th>
                <th className="py-3 px-4">Ringkasan Permohonan</th>
                <th className="py-3 px-4 whitespace-nowrap">Disposisi Seksi Teknis</th>
                <th className="py-3 px-4 whitespace-nowrap">Status &amp; SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {tiketList.map((tiket) => {
                const isSelected = tiket.nomor_tiket === selectedTicketNo;
                return (
                  <tr
                    key={tiket.nomor_tiket}
                    onClick={() => onSelectTicket(tiket.nomor_tiket)}
                    className={`cursor-pointer transition-colors align-top ${
                      isSelected
                        ? 'bg-[#2F318B]/[0.05]'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono tabular-nums text-xs font-bold text-[#2F318B]">
                        {tiket.nomor_tiket}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <span className="font-mono font-medium text-slate-800">
                          {tiket.kode_pemohon}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{tiket.saluran_masuk}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-md">
                      <p className="text-sm font-medium text-slate-900 line-clamp-2">
                        {tiket.ringkasan_permohonan}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>Kategori: {tiket.kategori_informasi}</span>
                        {tiket.butuh_konfirmasi && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                              Perlu Konfirmasi
                            </span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-800">
                      {tiket.rekomendasi_seksi_teknis}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-slate-800">
                        {tiket.status_tiket}
                      </div>
                      <div className="mt-1">
                        <SlaIndicatorInline
                          indikator={tiket.indikator_sla}
                          sisaHari={tiket.sisa_hari_kerja}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {tiketList.map((tiket) => {
            const isSelected = tiket.nomor_tiket === selectedTicketNo;
            return (
              <button
                key={tiket.nomor_tiket}
                type="button"
                onClick={() => onSelectTicket(tiket.nomor_tiket)}
                className={`text-left rounded-xl border p-4 transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#2F318B] bg-[#2F318B]/[0.04]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono tabular-nums font-bold text-[#2F318B]">
                        {tiket.nomor_tiket}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-slate-700">{tiket.kode_pemohon}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{tiket.saluran_masuk}</span>
                    </div>
                    <span className="font-medium text-slate-700 shrink-0">
                      {tiket.kategori_informasi}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 line-clamp-3">
                    {tiket.ringkasan_permohonan}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Unit:</span>
                    <span className="font-semibold text-slate-800">
                      {tiket.rekomendasi_seksi_teknis}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Status:</span>
                    <span className="font-medium text-slate-800">{tiket.status_tiket}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <SlaIndicatorInline
                      indikator={tiket.indikator_sla}
                      sisaHari={tiket.sisa_hari_kerja}
                    />
                    {tiket.butuh_konfirmasi && (
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                        Konfirmasi
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
