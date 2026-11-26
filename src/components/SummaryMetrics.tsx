import { AlertTriangle, CheckCircle2, Clock, FileStack, ShieldAlert } from 'lucide-react';
import type { RingkasanPPID } from '../shared/types.ts';

interface SummaryMetricsProps {
  ringkasan: RingkasanPPID;
}

export function SummaryMetrics({ ringkasan }: SummaryMetricsProps) {
  const items = [
    {
      label: 'Total Tiket',
      sublabel: 'Teregistrasi sesi ini',
      value: ringkasan.total_tiket,
      icon: FileStack,
      valueClass: 'text-[#2F318B]',
      iconClass: 'text-[#2F318B]',
    },
    {
      label: 'SLA Hijau',
      sublabel: 'Sisa > 3 hari kerja',
      value: ringkasan.sla_hijau,
      icon: CheckCircle2,
      valueClass: 'text-emerald-700',
      iconClass: 'text-emerald-600',
    },
    {
      label: 'SLA Kuning',
      sublabel: 'Prioritas 1–3 hari kerja',
      value: ringkasan.sla_kuning,
      icon: Clock,
      valueClass: 'text-amber-700',
      iconClass: 'text-amber-600',
    },
    {
      label: 'SLA Merah',
      sublabel: 'Melewati batas 10 hari',
      value: ringkasan.sla_merah,
      icon: ShieldAlert,
      valueClass: 'text-red-700',
      iconClass: 'text-red-600',
    },
    {
      label: 'Butuh Perpanjangan',
      sublabel: 'Kandidat / status +7 hari',
      value: ringkasan.butuh_perpanjangan,
      icon: AlertTriangle,
      valueClass: 'text-[#1d6f96]',
      iconClass: 'text-[#2A9ED3]',
    },
  ];

  return (
    <section id="ringkasan-sla" aria-label="Ringkasan metrik SLA permohonan informasi">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                <Icon className={`w-4 h-4 shrink-0 ${item.iconClass}`} aria-hidden="true" />
              </div>
              <div className="mt-3">
                <p
                  className={`font-mono tabular-nums text-2xl sm:text-3xl font-bold tracking-tight ${item.valueClass}`}
                >
                  {item.value}
                </p>
                <p className="text-xs text-slate-500 mt-1">{item.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
