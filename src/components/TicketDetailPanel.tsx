import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ShieldAlert,
} from 'lucide-react';
import {
  SEKSI_TEKNIS_OPTIONS,
  STATUS_TIKET_OPTIONS,
} from '../shared/types.ts';
import type { SeksiTeknis, StatusTiket, TiketPPID } from '../shared/types.ts';

interface TicketDetailPanelProps {
  tiket: TiketPPID | null;
  onUpdateTicket: (nomorTiket: string, patch: Partial<TiketPPID>) => void;
  onExtendSla7Days: (nomorTiket: string) => void;
}

export function TicketDetailPanel({
  tiket,
  onUpdateTicket,
  onExtendSla7Days,
}: TicketDetailPanelProps) {
  const [copiedDraft, setCopiedDraft] = useState(false);

  useEffect(() => {
    setCopiedDraft(false);
  }, [tiket?.nomor_tiket]);

  if (!tiket) {
    return (
      <aside
        aria-label="Panel detail tiket dan disposisi"
        className="bg-white border border-slate-200 rounded-xl p-6 text-center"
      >
        <p className="font-display text-base font-bold text-slate-900">
          Detail &amp; Disposisi Tiket
        </p>
        <p className="text-sm text-slate-600 mt-1.5">
          Pilih salah satu tiket pada daftar untuk memeriksa rincian anonimisasi, mengubah
          disposisi Seksi Teknis, mencatat alasan perpanjangan +7 hari, atau menyunting draf
          tanggapan Pimpinan.
        </p>
      </aside>
    );
  }

  const requiresWrittenReason =
    tiket.status_tiket === 'Perpanjangan 7 Hari' ||
    tiket.status_tiket === 'Data Terkirim / Selesai';
  const missingWrittenReason =
    requiresWrittenReason && tiket.catatan_data_atau_perpanjangan_teknis.trim().length === 0;

  async function handleCopyDraft() {
    if (!tiket) return;
    try {
      await navigator.clipboard.writeText(tiket.draf_tanggapan_pimpinan);
      setCopiedDraft(true);
      window.setTimeout(() => setCopiedDraft(false), 2000);
    } catch {
      setCopiedDraft(false);
    }
  }

  return (
    <aside
      aria-label={`Detail tiket ${tiket.nomor_tiket}`}
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5 lg:sticky lg:top-20"
    >
      {/* Header Tiket */}
      <div className="pb-4 border-b border-slate-200 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono tabular-nums text-sm font-bold text-[#2F318B]">
            {tiket.nomor_tiket}
          </span>
          <span className="text-xs font-medium text-slate-600">
            {tiket.saluran_masuk} · {tiket.kategori_informasi}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono font-semibold text-slate-800">
            Pemohon Tersamarkan: {tiket.kode_pemohon}
          </span>

          {tiket.indikator_sla === 'Merah' ? (
            <span className="inline-flex items-center gap-1 font-semibold text-red-700 font-mono tabular-nums">
              <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
              SLA Merah ({tiket.sisa_hari_kerja} hari)
            </span>
          ) : tiket.indikator_sla === 'Kuning' ? (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              SLA Kuning (Sisa {tiket.sisa_hari_kerja} hari)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 font-mono tabular-nums">
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              SLA Hijau (Sisa {tiket.sisa_hari_kerja} hari)
            </span>
          )}
        </div>

        <p className="text-sm text-slate-800 leading-relaxed pt-1">
          {tiket.ringkasan_permohonan}
        </p>
      </div>

      {/* Penanda Konfirmasi (Aturan 2) */}
      {tiket.butuh_konfirmasi && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-950 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-bold">Perlu Konfirmasi Sebelum Data Dikirimkan</p>
              <p className="mt-0.5 leading-relaxed text-amber-900">
                Permohonan ini terdeteksi memiliki rincian kurang jelas, dokumen buram/terpotong,
                atau menyangkut informasi sensitif/dikecualikan. Verifikasi dengan pemohon atau
                Pejabat Pengelola Informasi terlebih dahulu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateTicket(tiket.nomor_tiket, { butuh_konfirmasi: false })
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tandai Sudah Dikonfirmasi</span>
          </button>
        </div>
      )}

      {/* Kontrol Disposisi Pimpinan & Status Tiket */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="select-seksi-teknis"
            className="block text-xs font-semibold text-slate-700 mb-1.5"
          >
            Disposisi Pimpinan — Seksi Teknis Tujuan
          </label>
          <select
            id="select-seksi-teknis"
            value={tiket.rekomendasi_seksi_teknis}
            onChange={(e) =>
              onUpdateTicket(tiket.nomor_tiket, {
                rekomendasi_seksi_teknis: e.target.value as SeksiTeknis,
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#2F318B] focus:outline-none cursor-pointer"
          >
            {SEKSI_TEKNIS_OPTIONS.map((seksi) => (
              <option key={seksi} value={seksi}>
                {seksi}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="select-status-tiket"
              className="block text-xs font-semibold text-slate-700"
            >
              Status Penyelesaian Tiket
            </label>
            {tiket.status_tiket !== 'Perpanjangan 7 Hari' &&
              tiket.status_tiket !== 'Data Terkirim / Selesai' && (
                <button
                  type="button"
                  onClick={() => onExtendSla7Days(tiket.nomor_tiket)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#1d6f96] hover:text-[#2F318B] cursor-pointer"
                >
                  <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Perpanjangan +7 Hari</span>
                </button>
              )}
          </div>
          <select
            id="select-status-tiket"
            value={tiket.status_tiket}
            onChange={(e) =>
              onUpdateTicket(tiket.nomor_tiket, {
                status_tiket: e.target.value as StatusTiket,
              })
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 focus:border-[#2F318B] focus:outline-none cursor-pointer"
          >
            {STATUS_TIKET_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catatan Data / Alasan Perpanjangan Seksi Teknis (Aturan 3) */}
      <div>
        <label
          htmlFor="textarea-catatan-teknis"
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          Catatan Data / Alasan Perpanjangan Seksi Teknis
          {requiresWrittenReason && (
            <span className="text-red-700 font-semibold"> (Wajib diisi)</span>
          )}
        </label>
        <textarea
          id="textarea-catatan-teknis"
          rows={3}
          value={tiket.catatan_data_atau_perpanjangan_teknis}
          onChange={(e) =>
            onUpdateTicket(tiket.nomor_tiket, {
              catatan_data_atau_perpanjangan_teknis: e.target.value,
            })
          }
          placeholder="Isi catatan ketersediaan data, hal yang perlu dikonfirmasi, atau alasan tertulis perpanjangan waktu +7 hari kerja / penyelesaian tiket..."
          className={`w-full rounded-lg border px-3 py-2 text-xs leading-relaxed text-slate-900 focus:outline-none resize-y ${
            missingWrittenReason
              ? 'border-red-400 bg-red-50/40 focus:border-red-600'
              : 'border-slate-300 bg-slate-50/50 focus:bg-white focus:border-[#2F318B]'
          }`}
        />
        {missingWrittenReason && (
          <p className="mt-1 text-xs font-medium text-red-700" role="alert">
            Sesuai ketentuan UU KIP, Seksi Teknis wajib mengisi alasan tertulis untuk status
            &ldquo;{tiket.status_tiket}&rdquo;.
          </p>
        )}
      </div>

      {/* Draf Tanggapan Pimpinan (Aturan 4) */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <label
            htmlFor="textarea-draf-tanggapan"
            className="block text-xs font-semibold text-slate-700"
          >
            Draf Tanggapan Pimpinan (Dapat Disunting)
          </label>
          <button
            type="button"
            onClick={handleCopyDraft}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {copiedDraft ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                <span className="text-emerald-700">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Salin Draf</span>
              </>
            )}
          </button>
        </div>
        <textarea
          id="textarea-draf-tanggapan"
          rows={6}
          value={tiket.draf_tanggapan_pimpinan}
          onChange={(e) =>
            onUpdateTicket(tiket.nomor_tiket, {
              draf_tanggapan_pimpinan: e.target.value,
            })
          }
          className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2.5 text-xs leading-relaxed text-slate-900 focus:bg-white focus:border-[#2F318B] focus:outline-none resize-y"
        />
      </div>
    </aside>
  );
}
