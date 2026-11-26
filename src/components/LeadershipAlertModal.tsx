import { useEffect, useState } from 'react';
import { BellRing, Check, Copy, Loader2, Send, X } from 'lucide-react';
import type { LeadershipAlertLog, TiketPPID } from '../shared/types.ts';

interface LeadershipAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  urgentTickets: TiketPPID[];
  alertHistory: LeadershipAlertLog[];
  onAlertSent: (log: LeadershipAlertLog) => void;
}

function buildDefaultAlertMessage(tickets: TiketPPID[]): string {
  if (tickets.length === 0) {
    return 'Yth. Kepala Balai Teknik Perkeretaapian Kelas I Surabaya,\n\nSaat ini seluruh tiket permohonan informasi publik berada dalam status SLA Hijau dan terpantau aman.\n\nHormat kami,\nAdmin PPID BTP Kelas I Surabaya';
  }

  const lines = tickets.map((t, idx) => {
    const slaNote =
      t.indikator_sla === 'Merah'
        ? `OVERDUE (${t.sisa_hari_kerja} hari kerja)`
        : t.indikator_sla === 'Kuning'
          ? `PRIORITAS TINGGI (sisa ${t.sisa_hari_kerja} hari kerja)`
          : 'BUTUH KONFIRMASI';
    const konfirmasiFlag = t.butuh_konfirmasi ? ' · Perlu Konfirmasi' : '';
    return `${idx + 1}. [${t.nomor_tiket} / ${t.kode_pemohon}] ${slaNote}${konfirmasiFlag}\n   Unit Tujuan: ${t.rekomendasi_seksi_teknis}\n   Ringkasan: ${t.ringkasan_permohonan}`;
  });

  return [
    'Yth. Kepala Balai Teknik Perkeretaapian Kelas I Surabaya,',
    '',
    `Mohon perhatian dan arahan disposisi segera untuk ${tickets.length} tiket permohonan informasi publik berikut yang mendekati/melampaui batas SLA UU KIP atau memerlukan konfirmasi teknis:`,
    '',
    ...lines,
    '',
    'Mohon penetapan disposisi dan instruksi tindak lanjut kepada Seksi Teknis terkait.',
    '',
    'Hormat kami,',
    'Admin PPID Pelaksana — BTP Kelas I Surabaya',
  ].join('\n');
}

export function LeadershipAlertModal({
  isOpen,
  onClose,
  urgentTickets,
  alertHistory,
  onAlertSent,
}: LeadershipAlertModalProps) {
  const [penerima, setPenerima] = useState(
    'Kepala Balai Teknik Perkeretaapian Kelas I Surabaya',
  );
  const [pesan, setPesan] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPesan(buildDefaultAlertMessage(urgentTickets));
      setSendError(null);
      setSendSuccess(null);
      setCopied(false);
    }
  }, [isOpen, urgentTickets]);

  if (!isOpen) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pesan);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleSendAlert() {
    setSendError(null);
    setSendSuccess(null);

    if (urgentTickets.length === 0) {
      setSendError('Tidak ada tiket mendesak (Kuning/Merah/Konfirmasi) untuk dieskalasikan.');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/ppid/peringatan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          penerima,
          nomorTiket: urgentTickets.map((t) => t.nomor_tiket),
          pesanRingkas: pesan,
        }),
      });

      const data = (await response.json()) as { log?: LeadershipAlertLog; error?: string };
      if (!response.ok || !data.log) {
        throw new Error(data.error || 'Gagal mencatat pengiriman peringatan pimpinan.');
      }

      onAlertSent(data.log);
      setSendSuccess(
        `Peringatan berhasil dikirim ke ${penerima} (${data.log.dikirimPada} WIB).`,
      );
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Gagal mengirim peringatan.');
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-peringatan-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-[1px]"
    >
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <BellRing className="w-5 h-5 text-[#2F318B]" aria-hidden="true" />
            <h2
              id="modal-peringatan-title"
              className="font-display text-base font-bold text-slate-900"
            >
              Peringatan Status &amp; Eskalasi Pimpinan
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela peringatan pimpinan"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
            Menampilkan <strong className="font-mono tabular-nums">{urgentTickets.length}</strong>{' '}
            tiket yang memerlukan tindak lanjut segera (SLA Merah Overdue, SLA Kuning Prioritas
            Tinggi, atau butuh konfirmasi teknis). Seluruh identitas pemohon tetap disamarkan.
          </div>

          <div>
            <label
              htmlFor="select-penerima-pimpinan"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Penerima Peringatan
            </label>
            <select
              id="select-penerima-pimpinan"
              value={penerima}
              onChange={(e) => setPenerima(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#2F318B] focus:outline-none"
            >
              <option value="Kepala Balai Teknik Perkeretaapian Kelas I Surabaya">
                Kepala Balai Teknik Perkeretaapian Kelas I Surabaya
              </option>
              <option value="Atasan PPID / Kepala Subbagian Tata Usaha">
                Atasan PPID / Kepala Subbagian Tata Usaha
              </option>
              <option value="Seluruh Kepala Seksi Teknis & Pimpinan BTP Surabaya">
                Seluruh Kepala Seksi Teknis &amp; Pimpinan BTP Surabaya
              </option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label
                htmlFor="textarea-pesan-peringatan"
                className="block text-xs font-semibold text-slate-700"
              >
                Pratinjau Pesan Pemberitahuan Pimpinan
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span className="text-emerald-700">Tersalin</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Salin Pesan</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              id="textarea-pesan-peringatan"
              rows={9}
              value={pesan}
              onChange={(e) => setPesan(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-2.5 text-xs leading-relaxed text-slate-900 focus:bg-white focus:border-[#2F318B] focus:outline-none resize-y"
            />
          </div>

          {sendError && (
            <p className="text-xs font-medium text-red-700" role="alert">
              {sendError}
            </p>
          )}
          {sendSuccess && (
            <p
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800"
              role="status"
            >
              {sendSuccess}
            </p>
          )}

          {alertHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Riwayat Peringatan Terkirim (Sesi Prototipe)
              </p>
              <ul className="space-y-1.5 max-h-28 overflow-y-auto text-xs text-slate-600">
                {alertHistory.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 py-1 border-b border-slate-100 last:border-b-0"
                  >
                    <span className="truncate">
                      {item.penerima} ({item.jumlahTiketMendesak} tiket)
                    </span>
                    <span className="font-mono tabular-nums text-slate-500 shrink-0">
                      {item.dikirimPada}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSendAlert}
            disabled={isSending || urgentTickets.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-[#2F318B] text-white hover:bg-[#23256e] disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="w-3.5 h-3.5 text-[#FDD100]" aria-hidden="true" />
            )}
            <span>Kirim Peringatan ke Pimpinan</span>
          </button>
        </div>
      </div>
    </div>
  );
}
