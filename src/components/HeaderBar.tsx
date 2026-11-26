import { BellRing } from 'lucide-react';

interface HeaderBarProps {
  urgentCount: number;
  hasTickets: boolean;
  onOpenAlertModal: () => void;
}

export function HeaderBar({
  urgentCount,
  hasTickets,
  onOpenAlertModal,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="h-1 w-full bg-[#FDD100]" aria-hidden="true" />
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zona 1: Brand wordmark satu baris */}
        <a
          href="#top"
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F318B] rounded-md"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="28" height="28" rx="6" fill="#2F318B" />
            <circle cx="14" cy="14" r="7.5" stroke="#2A9ED3" strokeWidth="1.5" />
            <circle cx="14" cy="14" r="3" fill="#FDD100" />
            <path d="M14 4V8M14 20V24M4 14H8M20 14H24" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span className="font-display text-lg font-bold tracking-tight text-[#2F318B]">
            RADAR-PPID
          </span>
        </a>

        {/* Zona 2: Navigasi ringkas satu baris */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#panel-input"
            className="hover:text-[#2F318B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Input Permohonan
          </a>
          <a
            href="#ringkasan-sla"
            className="hover:text-[#2F318B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Ringkasan SLA
          </a>
          <a
            href="#daftar-tiket"
            className="hover:text-[#2F318B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Daftar Tiket
          </a>
          <a
            href="#catatan-kepatuhan"
            className="hover:text-[#2F318B] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Ketentuan SLA
          </a>
        </nav>

        {/* Zona 3: 1 tombol aksi utama */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenAlertModal}
            disabled={!hasTickets}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed bg-[#2F318B] text-white hover:bg-[#23256e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F318B]"
          >
            <BellRing className="w-4 h-4 text-[#FDD100]" aria-hidden="true" />
            <span>Peringatan Pimpinan</span>
            {urgentCount > 0 && (
              <span className="font-mono tabular-nums text-xs font-bold bg-[#FDD100] text-slate-900 px-1.5 py-0.5 rounded">
                {urgentCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
