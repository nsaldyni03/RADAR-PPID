export const SALURAN_MASUK_OPTIONS = [
  'WhatsApp',
  'Email',
  'Formulir Online',
  'Surat Fisik',
] as const;

export type SaluranMasuk = (typeof SALURAN_MASUK_OPTIONS)[number];

export const KATEGORI_INFORMASI_OPTIONS = [
  'Berkala',
  'Serta Merta',
  'Setiap Saat',
  'Perlu Telaah',
] as const;

export type KategoriInformasi = (typeof KATEGORI_INFORMASI_OPTIONS)[number];

export const SEKSI_TEKNIS_OPTIONS = [
  'Seksi Prasarana',
  'Seksi Lalu Lintas & Sarana',
  'Seksi Keselamatan & Pengawasan',
  'Subbagian Tata Usaha',
] as const;

export type SeksiTeknis = (typeof SEKSI_TEKNIS_OPTIONS)[number];

export const STATUS_TIKET_OPTIONS = [
  'Baru Masuk',
  'Didisposisikan Pimpinan',
  'Diproses Seksi Teknis',
  'Perpanjangan 7 Hari',
  'Data Terkirim / Selesai',
] as const;

export type StatusTiket = (typeof STATUS_TIKET_OPTIONS)[number];

export const INDIKATOR_SLA_OPTIONS = ['Hijau', 'Kuning', 'Merah'] as const;

export type IndikatorSLA = (typeof INDIKATOR_SLA_OPTIONS)[number];

export interface TiketPPID {
  nomor_tiket: string;
  kode_pemohon: string;
  saluran_masuk: SaluranMasuk;
  ringkasan_permohonan: string;
  kategori_informasi: KategoriInformasi;
  rekomendasi_seksi_teknis: SeksiTeknis;
  status_tiket: StatusTiket;
  sisa_hari_kerja: number;
  indikator_sla: IndikatorSLA;
  butuh_konfirmasi: boolean;
  catatan_data_atau_perpanjangan_teknis: string;
  draf_tanggapan_pimpinan: string;
}

export interface RingkasanPPID {
  total_tiket: number;
  sla_hijau: number;
  sla_kuning: number;
  sla_merah: number;
  butuh_perpanjangan: number;
}

export interface RadarPpidPayload {
  ringkasan: RingkasanPPID;
  daftar_tiket: TiketPPID[];
}

export interface UploadedAttachmentPayload {
  name: string;
  mimeType: string;
  size: number;
  dataBase64: string;
}

export interface LeadershipAlertLog {
  id: string;
  dikirimPada: string;
  penerima: string;
  jumlahTiketMendesak: number;
  nomorTiket: string[];
  pesanRingkas: string;
}

export function hitungIndikatorSla(sisaHariKerja: number): IndikatorSLA {
  if (sisaHariKerja > 3) {
    return 'Hijau';
  }
  if (sisaHariKerja >= 1) {
    return 'Kuning';
  }
  return 'Merah';
}

export function hitungRingkasanTiket(daftarTiket: TiketPPID[]): RingkasanPPID {
  let slaHijau = 0;
  let slaKuning = 0;
  let slaMerah = 0;
  let butuhPerpanjangan = 0;

  for (const tiket of daftarTiket) {
    if (tiket.indikator_sla === 'Hijau') slaHijau += 1;
    else if (tiket.indikator_sla === 'Kuning') slaKuning += 1;
    else slaMerah += 1;

    if (
      tiket.status_tiket === 'Perpanjangan 7 Hari' ||
      (tiket.indikator_sla !== 'Hijau' && tiket.status_tiket !== 'Data Terkirim / Selesai')
    ) {
      butuhPerpanjangan += 1;
    }
  }

  return {
    total_tiket: daftarTiket.length,
    sla_hijau: slaHijau,
    sla_kuning: slaKuning,
    sla_merah: slaMerah,
    butuh_perpanjangan: butuhPerpanjangan,
  };
}
