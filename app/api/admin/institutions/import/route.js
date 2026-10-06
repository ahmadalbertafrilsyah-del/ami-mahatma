import { FieldValue } from "firebase-admin/firestore";

import { requireRole } from "@/lib/firebase-admin";
import { fail, ok, route } from "@/lib/api-response";
import { buildWorkbook, readSheet } from "@/lib/xlsx";
import { INSTITUTION_STATUS, JENJANG, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";
// Impor menulis ratusan dokumen; batas waktu bawaan sebagian hosting terlalu
// pendek untuk itu.
export const maxDuration = 60;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_ROWS = 300;
const MAX_BYTES = 2 * 1024 * 1024;
/** Firestore membatasi satu batch pada 500 operasi tulis. */
const BATCH_SIZE = 400;

const HEADER_ALIASES = {
  "nama lembaga": "nama",
  nama: "nama",
  "nama sekolah": "nama",
  "nama satuan pendidikan": "nama",
  "satuan pendidikan": "nama",
  jenjang: "jenjang",
  "jenjang pendidikan": "jenjang",
  npsn: "npsn",
  kota: "kota",
  "kota kabupaten": "kota",
  kabupaten: "kota",
  alamat: "alamat",
  "nama kepala sekolah": "kepalaNama",
  "kepala sekolah": "kepalaNama",
  "kepala madrasah": "kepalaNama",
  "email kepala sekolah": "kepalaEmail",
  "email kepala": "kepalaEmail",
  email: "kepalaEmail",
  "whatsapp kepala sekolah": "kepalaWhatsapp",
  "whatsapp kepala": "kepalaWhatsapp",
  whatsapp: "kepalaWhatsapp",
  "no whatsapp": "kepalaWhatsapp",
  telepon: "kepalaWhatsapp",
  status: "status",
};

const COLUMNS = [
  { header: "Nama Lembaga*", key: "nama", width: 34 },
  { header: "Jenjang", key: "jenjang", width: 18 },
  { header: "NPSN", key: "npsn", width: 14 },
  { header: "Kota / Kabupaten", key: "kota", width: 22 },
  { header: "Alamat", key: "alamat", width: 38 },
  { header: "Nama Kepala Sekolah", key: "kepalaNama", width: 28 },
  { header: "Email Kepala Sekolah", key: "kepalaEmail", width: 30 },
  { header: "WhatsApp Kepala Sekolah", key: "kepalaWhatsapp", width: 22 },
  { header: "Status", key: "status", width: 16 },
];

const EXAMPLES = [
  {
    nama: "MA Darul Ma'arif",
    jenjang: "SMA / MA",
    npsn: "20512345",
    kota: "Lamongan",
    alamat: "Jl. KH Abdurrohman Musthofa No. 21",
    kepalaNama: "M. Ahsanu Taqwim, S.Pd.",
    kepalaEmail: "kepala@darulmaarif.sch.id",
    kepalaWhatsapp: "081234567890",
    status: "aktif",
  },
  {
    nama: "SMP Nurul Huda",
    jenjang: "SMP / MTs",
    npsn: "20598765",
    kota: "Gresik",
    alamat: "Jl. Raya Sukodadi No. 7",
    kepalaNama: "Siti Rahmawati, M.Pd.",
    kepalaEmail: "kepala@nurulhuda.sch.id",
    kepalaWhatsapp: "081298765432",
    status: "pending",
  },
];

const NOTES = [
  "Petunjuk pengisian template impor lembaga SIM-AMI",
  "",
  "1. Hapus dua baris contoh berwarna abu-abu sebelum mengisi data Anda.",
  "2. Hanya kolom Nama Lembaga yang wajib diisi. Kolom lain boleh dikosongkan dan dilengkapi belakangan lewat tombol Ubah.",
  "3. Nama lembaga harus unik. Nama yang sudah ada di sistem akan dilewati dan dilaporkan pada ringkasan hasil impor.",
  `4. Kolom Jenjang sebaiknya diisi salah satu dari: ${JENJANG.join(", ")}. Nilai lain tetap diterima apa adanya.`,
  `5. Kolom Status menerima "aktif" (langsung terverifikasi), "pending" (menunggu verifikasi), atau "ditolak". Bila dikosongkan, status otomatis "aktif" karena data dimasukkan oleh administrator.`,
  "6. Tulis NPSN dan nomor WhatsApp apa adanya, misalnya 081234567890. Seluruh kolom sudah berformat teks agar angka nol di depan tidak hilang.",
  "7. Jangan mengubah nama kolom pada baris pertama, karena nama itulah yang dibaca sistem.",
  `8. Satu berkas maksimal ${MAX_ROWS} baris data.`,
  "",
  "Setelah berkas siap, buka menu Lembaga pada dashboard Administrator, klik 'Impor Excel', lalu unggah berkas ini. Sistem menampilkan pratinjau beserta catatan per baris sebelum data benar-benar disimpan.",
];

/** Nilai status yang diterima pada kolom Status. */
const STATUS_ALIASES = {
  aktif: INSTITUTION_STATUS.ACTIVE,
  terverifikasi: INSTITUTION_STATUS.ACTIVE,
  verified: INSTITUTION_STATUS.ACTIVE,
  pending: INSTITUTION_STATUS.PENDING,
  menunggu: INSTITUTION_STATUS.PENDING,
  "menunggu verifikasi": INSTITUTION_STATUS.PENDING,
  ditolak: INSTITUTION_STATUS.REJECTED,
  tolak: INSTITUTION_STATUS.REJECTED,
};

/**
 * Memulihkan angka nol di depan nomor dan NPSN.
 *
 * Sel yang diisi sebagai angka kehilangan nol di depannya, karena sebuah
 * bilangan tidak pernah bisa diawali nol. Nilai 10–12 digit berawalan "8"
 * dapat dipastikan nomor 08xx yang kehilangan nol tersebut.
 */
function normalizeNomor(value) {
  const teks = String(value ?? "").trim();
  if (/^8\d{9,11}$/.test(teks)) return `0${teks}`;
  return teks;
}

/** Kunci pembanding nama lembaga: beda spasi dan besar-kecil huruf dianggap sama. */
function namaKey(nama) {
  return nama.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Mengunduh berkas template .xlsx. */
export const GET = route(async (request) => {
  try {
    await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const buffer = await buildWorkbook({
    sheetName: "Lembaga",
    columns: COLUMNS,
    examples: EXAMPLES,
    notes: NOTES,
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-lembaga-sim-ami.xlsx"',
      "Cache-Control": "no-store",
    },
  });
});

/**
 * Mengimpor lembaga dari berkas .xlsx.
 *
 * Dengan `?dryRun=1` berkas hanya diperiksa dan hasilnya dikembalikan sebagai
 * pratinjau — tidak ada satu pun dokumen yang ditulis.
 */
export const POST = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { db } = ctx;
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let file;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return fail("Berkas tidak terbaca. Pastikan Anda mengunggah berkas .xlsx.");
  }

  if (!file || typeof file.arrayBuffer !== "function") return fail("Berkas belum dipilih.");
  if (file.size > MAX_BYTES) return fail("Ukuran berkas melebihi 2 MB.");

  let rows;
  try {
    rows = await readSheet(await file.arrayBuffer(), { headerAliases: HEADER_ALIASES });
  } catch (err) {
    return fail(err.message || "Berkas Excel tidak dapat dibaca.");
  }

  if (!rows.length) return fail("Tidak ada baris data yang dapat dibaca dari berkas.");
  if (rows.length > MAX_ROWS) {
    return fail(`Berkas memuat ${rows.length} baris. Maksimal ${MAX_ROWS} baris per impor.`);
  }

  // Nama lembaga yang sudah ada, dibaca sekali untuk seluruh berkas.
  const existing = new Set();
  const snap = await db.collection("institutions").select("nama").get();
  for (const doc of snap.docs) {
    const nama = doc.get("nama");
    if (typeof nama === "string") existing.add(namaKey(nama));
  }

  const terlihat = new Set();
  const hasil = rows.map((row) => {
    const nama = (row.nama ?? "").trim();
    const statusRaw = (row.status ?? "").trim().toLowerCase();
    const status = statusRaw ? STATUS_ALIASES[statusRaw] : INSTITUTION_STATUS.ACTIVE;
    const kepalaEmail = (row.kepalaEmail ?? "").trim().toLowerCase();

    const dasar = { baris: row._baris, nama, kota: (row.kota ?? "").trim(), status };

    if (!nama) return { ...dasar, pesan: "Nama lembaga kosong.", hasilStatus: "gagal" };
    if (nama.length < 3) {
      return { ...dasar, pesan: "Nama lembaga kurang dari 3 karakter.", hasilStatus: "gagal" };
    }
    if (statusRaw && !status) {
      return {
        ...dasar,
        pesan: `Status "${statusRaw}" tidak dikenali. Pakai "aktif", "pending", atau "ditolak".`,
        hasilStatus: "gagal",
      };
    }
    if (kepalaEmail && !EMAIL_RE.test(kepalaEmail)) {
      return { ...dasar, pesan: "Format email kepala sekolah tidak valid.", hasilStatus: "gagal" };
    }

    const kunci = namaKey(nama);
    if (terlihat.has(kunci)) {
      return { ...dasar, pesan: "Nama ini muncul lebih dari sekali di berkas.", hasilStatus: "gagal" };
    }
    if (existing.has(kunci)) {
      return { ...dasar, pesan: "Lembaga dengan nama ini sudah terdaftar.", hasilStatus: "gagal" };
    }
    terlihat.add(kunci);

    return {
      ...dasar,
      hasilStatus: "siap",
      data: {
        nama,
        jenjang: (row.jenjang ?? "").trim(),
        npsn: normalizeNomor(row.npsn),
        kota: (row.kota ?? "").trim(),
        alamat: (row.alamat ?? "").trim(),
        kepalaNama: (row.kepalaNama ?? "").trim(),
        kepalaEmail,
        kepalaWhatsapp: normalizeNomor(row.kepalaWhatsapp),
        status,
      },
    };
  });

  // Bentuk jawaban disamakan dengan impor pengguna agar satu komponen
  // pratinjau dapat melayani keduanya.
  const keluar = (r) => ({
    baris: r.baris,
    nama: r.nama,
    kota: r.kota,
    statusLembaga: r.data?.status ?? null,
    status: r.hasilStatus,
    pesan: r.pesan ?? null,
  });

  const siap = hasil.filter((r) => r.hasilStatus === "siap");

  if (dryRun) {
    return ok({
      dryRun: true,
      total: hasil.length,
      siap: siap.length,
      gagal: hasil.length - siap.length,
      rows: hasil.map(keluar),
    });
  }

  let dibuat = 0;
  try {
    for (let i = 0; i < siap.length; i += BATCH_SIZE) {
      const potongan = siap.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const r of potongan) {
        batch.set(db.collection("institutions").doc(), {
          ...r.data,
          sumber: "impor",
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();

      for (const r of potongan) {
        r.hasilStatus = "dibuat";
        r.pesan = "Lembaga tersimpan.";
      }
      dibuat += potongan.length;
    }
  } catch (err) {
    // Batch yang gagal menyisakan barisnya tetap bertanda "siap"; jumlah yang
    // sudah tersimpan dilaporkan apa adanya agar impor ulang tidak menggandakan
    // data — nama yang sudah masuk akan tertolak sebagai duplikat.
    for (const r of siap) {
      if (r.hasilStatus === "siap") {
        r.hasilStatus = "gagal";
        r.pesan = `Gagal disimpan: ${err.message}`;
      }
    }
  }

  return ok({
    dryRun: false,
    total: hasil.length,
    dibuat,
    gagal: hasil.length - dibuat,
    rows: hasil.map(keluar),
  });
});
