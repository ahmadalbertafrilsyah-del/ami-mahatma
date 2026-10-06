export const APP_NAME = "SIM-AMI";
export const APP_TAGLINE = "Sistem Audit Mutu Internal";
export const APP_DESCRIPTION =
  "Platform audit mutu internal untuk satuan pendidikan: pendaftaran lembaga, penilaian indikator oleh auditor, temuan, dan rencana tindak lanjut.";

export const ROLES = {
  ADMIN: "admin",
  AUDITOR: "auditor",
};

export const ROLE_LABEL = {
  admin: "Administrator",
  auditor: "Auditor",
};

export const ROLE_HOME = {
  admin: "/admin",
  auditor: "/auditor",
};

/** Status pendaftaran lembaga yang masuk lewat formulir publik. */
export const INSTITUTION_STATUS = {
  PENDING: "pending",
  ACTIVE: "aktif",
  REJECTED: "ditolak",
};

export const INSTITUTION_STATUS_LABEL = {
  pending: "Menunggu Verifikasi",
  aktif: "Terverifikasi",
  ditolak: "Ditolak",
};

export const INSTITUTION_STATUS_TONE = {
  pending: "amber",
  aktif: "emerald",
  ditolak: "slate",
};

/** Siklus hidup satu dokumen audit yang dikerjakan auditor. */
export const AUDIT_STATUS = {
  DRAFT: "draft",
  COMPLETED: "completed",
};

export const AUDIT_STATUS_LABEL = {
  draft: "Sedang Dikerjakan",
  completed: "Selesai",
};

export const AUDIT_STATUS_TONE = {
  draft: "amber",
  completed: "emerald",
};

export const FINDING_CATEGORY = {
  MAJOR: "mayor",
  MINOR: "minor",
  OBSERVATION: "observasi",
};

export const FINDING_CATEGORY_LABEL = {
  mayor: "Ketidaksesuaian Mayor",
  minor: "Ketidaksesuaian Minor",
  observasi: "Observasi",
};

export const FINDING_CATEGORY_TONE = {
  mayor: "red",
  minor: "amber",
  observasi: "blue",
};

export const FINDING_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  CLOSED: "closed",
};

export const FINDING_STATUS_LABEL = {
  open: "Terbuka",
  in_progress: "Dalam Perbaikan",
  closed: "Ditutup",
};

export const FINDING_STATUS_TONE = {
  open: "red",
  in_progress: "amber",
  closed: "emerald",
};

export const PERIOD_STATUS_LABEL = {
  draft: "Draf",
  active: "Berjalan",
  closed: "Ditutup",
};

/** Jenjang umum, tidak terikat satu yayasan atau wilayah tertentu. */
export const JENJANG = [
  "TK / RA / PAUD",
  "SD / MI",
  "SMP / MTs",
  "SMA / MA",
  "SMK / MAK",
  "Lainnya",
];

/** Rubrik penilaian 1-4 yang dipakai seluruh instrumen. */
export const DEFAULT_RUBRICS = [
  { score: 1, label: "Kurang", desc: "Belum dilaksanakan atau belum ada bukti yang memadai." },
  {
    score: 2,
    label: "Cukup Baik",
    desc: "Sudah dilakukan, tetapi belum konsisten, sistematis, atau belum ditindaklanjuti.",
  },
  {
    score: 3,
    label: "Baik",
    desc: "Dilaksanakan secara sistematis dan digunakan untuk mendukung perbaikan.",
  },
  {
    score: 4,
    label: "Sangat Baik",
    desc: "Dilaksanakan konsisten, berbasis bukti, berdampak, dan dipantau keberlanjutannya.",
  },
];

export function statusFromScore(s) {
  if (s >= 3.5) return { label: "Kekuatan", tone: "emerald" };
  if (s >= 2.75) return { label: "Baik / Sesuai", tone: "emerald" };
  if (s >= 2) return { label: "Perlu Perbaikan", tone: "amber" };
  return { label: "Prioritas Tinggi", tone: "red" };
}

/** Skor 1-2 otomatis menjadi kandidat temuan. */
export function categoryFromScore(score) {
  if (score <= 1) return FINDING_CATEGORY.MAJOR;
  if (score === 2) return FINDING_CATEGORY.MINOR;
  return FINDING_CATEGORY.OBSERVATION;
}
