import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import {
  AlertCircle,
  Database,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { UploadedAttachmentPayload } from '../shared/types.ts';

interface InputPanelProps {
  teksInput: string;
  onChangeTeks: (value: string) => void;
  berkas: UploadedAttachmentPayload[];
  onAddBerkas: (files: UploadedAttachmentPayload[]) => void;
  onRemoveBerkas: (index: number) => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  validationError: string | null;
  apiError: string | null;
  onRetry: () => void;
}

const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.pdf', '.docx', '.txt'];
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Gagal membaca berkas ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function InputPanel({
  teksInput,
  onChangeTeks,
  berkas,
  onAddBerkas,
  onRemoveBerkas,
  onLoadSample,
  onClearAll,
  onSubmit,
  isLoading,
  validationError,
  apiError,
  onRetry,
}: InputPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function processFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);

    if (berkas.length + fileList.length > MAX_FILES) {
      setFileError(`Maksimal ${MAX_FILES} berkas dapat diunggah dalam satu sesi pemrosesan.`);
      return;
    }

    const prepared: UploadedAttachmentPayload[] = [];
    for (const file of Array.from(fileList)) {
      const lower = file.name.toLowerCase();
      const validExt = ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
      if (!validExt) {
        setFileError(
          `Format "${file.name}" tidak didukung. Gunakan file gambar (JPG/PNG) atau dokumen (PDF/DOCX/TXT).`,
        );
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        setFileError(`Ukuran berkas "${file.name}" melebihi batas maksimal 10 MB.`);
        return;
      }

      try {
        const dataBase64 = await readFileAsBase64(file);
        prepared.push({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          dataBase64,
        });
      } catch {
        setFileError(`Berkas "${file.name}" gagal dibaca. Silakan coba unggah ulang.`);
        return;
      }
    }

    if (prepared.length > 0) {
      onAddBerkas(prepared);
    }
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    void processFiles(e.target.files);
    e.target.value = '';
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    void processFiles(e.dataTransfer.files);
  }

  return (
    <section
      id="panel-input"
      aria-labelledby="heading-input-permohonan"
      className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2
            id="heading-input-permohonan"
            className="font-display text-lg font-bold text-slate-900"
          >
            Registrasi &amp; Ekstraksi Permohonan Informasi Publik
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Masukkan teks rincian permohonan atau unggah tangkapan layar / surat resmi untuk
            dianonimkan dan didisposisikan otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onLoadSample}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border border-[#2A9ED3]/40 bg-[#2A9ED3]/10 text-[#1d6f96] hover:bg-[#2A9ED3]/20 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Database className="w-4 h-4" aria-hidden="true" />
            <span>Muat Contoh Data</span>
          </button>

          {(teksInput.trim().length > 0 || berkas.length > 0) && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        {/* Kolom Teks Permohonan */}
        <div className="lg:col-span-7 flex flex-col">
          <label
            htmlFor="input-teks-permohonan"
            className="text-sm font-semibold text-slate-800 mb-2"
          >
            Rincian Permohonan (Saluran Masuk, Tanggal, Identitas Pemohon, Isi Permintaan)
          </label>
          <textarea
            id="input-teks-permohonan"
            rows={8}
            value={teksInput}
            onChange={(e) => onChangeTeks(e.target.value)}
            disabled={isLoading}
            placeholder={
              'Contoh:\nSaluran Masuk: WhatsApp / Email / Formulir Online / Surat Fisik\nTanggal Masuk: 18 November 2026\nIdentitas Pemohon: Nama, NIK, No. HP, Email (akan disamarkan otomatis menjadi Pemohon-01)\nRincian Informasi Diminta: Data rekapitulasi keselamatan perlintasan sebidang di lintas Surabaya–Sidoarjo tahun 2025–2026.'
            }
            className="w-full flex-1 min-h-[190px] rounded-lg border border-slate-300 bg-slate-50/50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#2F318B] focus:outline-none focus:ring-2 focus:ring-[#2F318B]/15 transition-colors resize-y"
          />
        </div>

        {/* Kolom Unggah Berkas */}
        <div className="lg:col-span-5 flex flex-col">
          <span className="text-sm font-semibold text-slate-800 mb-2">
            Lampiran Gambar atau Dokumen (Opsional)
          </span>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            aria-label="Unggah berkas gambar JPG atau PNG atau dokumen PDF, DOCX, TXT"
            className={`flex flex-col items-center justify-center text-center rounded-lg border border-dashed px-4 py-6 cursor-pointer transition-colors min-h-[132px] ${
              isDragging
                ? 'border-[#2F318B] bg-[#2F318B]/5'
                : 'border-slate-300 bg-slate-50 hover:border-[#2A9ED3] hover:bg-[#2A9ED3]/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf,.docx,.txt,image/jpeg,image/png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-6 h-6 text-[#2F318B] mb-2" aria-hidden="true" />
            <p className="text-sm font-medium text-slate-800">
              Seret berkas ke sini atau klik untuk memilih
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Format: JPG, PNG, PDF, DOCX, TXT · Maks. 10 MB per berkas
            </p>
          </div>

          {berkas.length > 0 && (
            <ul className="mt-3 space-y-2 max-h-[120px] overflow-y-auto pr-1">
              {berkas.map((file, idx) => {
                const isImage = file.mimeType.startsWith('image/');
                return (
                  <li
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isImage ? (
                        <ImageIcon className="w-4 h-4 text-[#2A9ED3] shrink-0" aria-hidden="true" />
                      ) : (
                        <FileText className="w-4 h-4 text-[#2F318B] shrink-0" aria-hidden="true" />
                      )}
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-500 font-mono tabular-nums shrink-0">
                        {formatBytes(file.size)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveBerkas(idx);
                      }}
                      aria-label={`Hapus berkas ${file.name}`}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {fileError && (
            <p className="mt-2 text-xs text-red-700 font-medium" role="alert">
              {fileError}
            </p>
          )}
        </div>
      </div>

      {/* Pesan Error Validasi Input Kosong */}
      {validationError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Pesan Error AI Gagal / Sibuk + Tombol Coba Lagi */}
      {apiError && (
        <div
          role="alert"
          className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={onRetry}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-700 text-white hover:bg-red-800 transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Coba lagi</span>
          </button>
        </div>
      )}

      {/* Bar Aksi Bawah */}
      <div className="mt-5 pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-xs text-slate-500">
          Privasi otomatis: Nama, NIK, telepon, dan email pemohon disamarkan menjadi{' '}
          <span className="font-mono text-slate-700">Pemohon-01</span>,{' '}
          <span className="font-mono text-slate-700">Pemohon-02</span>, dan seterusnya.
        </p>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-[#2F318B] text-white hover:bg-[#23256e] transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F318B]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Memproses Permohonan...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4 text-[#FDD100]" aria-hidden="true" />
              <span>Lacak</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
