import { FieldValue } from "firebase-admin/firestore";

import { requireRole } from "@/lib/firebase-admin";
import { fail, ok, route } from "@/lib/api-response";
import { buildWorkbook, readSheet } from "@/lib/xlsx";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";
// Impor membuat ratusan akun; batas waktu bawaan sebagian hosting terlalu
// pendek untuk itu.
export const maxDuration = 60;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Memulihkan angka nol di depan nomor telepon.
 *
 * Bila sel nomor telepon diisi sebagai angka (bukan teks), Excel membuang nol
 * di depannya, sehingga "081234567890" tersimpan menjadi 81234567890. Sebuah
 * bilangan tidak pernah bisa diawali nol, jadi nilai 10–12 digit yang diawali
 * "8" dapat dipastikan merupakan nomor 08xx yang kehilangan nol tersebut.
 * Bentuk lain — termasuk nomor berawalan +62 atau 62 — dibiarkan apa adanya.
 */
function normalizeTelepon(value) {
  const teks = value.trim();
  if (/^8\d{9,11}$/.test(teks)) return `0${teks}`;
  return teks;
}
const MAX_ROWS = 300;
const MAX_BYTES = 2 * 1024 * 1024;
/** Jumlah akun yang dibuat serentak. */
const CONCURRENCY = 8;

/** Nama kolom yang diterima, dalam bentuk ternormalisasi (huruf kecil tanpa tanda baca). */
const HEADER_ALIASES = {
  "nama lengkap": "nama",
  nama: "nama",
  "nama auditor": "nama",
  email: "email",
  "alamat email": "email",
  "kata sandi": "password",
  "kata sandi awal": "password",
  password: "password",
  sandi: "password",
  telepon: "telepon",
  "no telepon": "telepon",
  "nomor telepon": "telepon",
  whatsapp: "telepon",
  hp: "telepon",
  peran: "role",
  role: "role",
  jabatan: "role",
};

const COLUMNS = [
  { header: "Nama Lengkap*", key: "nama", width: 30 },
  { header: "Email*", key: "email", width: 32 },
  { header: "Kata Sandi*", key: "password", width: 20 },
  { header: "Telepon", key: "telepon", width: 18 },
  { header: "Peran", key: "role", width: 16 },
];

const EXAMPLES = [
  {
    nama: "Siti Rahmawati, M.Pd.",
    email: "siti.rahmawati@contoh.sch.id",
    password: "sandiAwal123",
    telepon: "081234567890",
    role: "auditor",
  },
  {
    nama: "Budi Santoso, S.Pd.",
    email: "budi.santoso@contoh.sch.id",
    password: "sandiAwal456",
    telepon: "081298765432",
    role: "auditor",
  },
];

const NOTES = [
  "Petunjuk pengisian template impor pengguna SIM-AMI",
  "",
  "1. Hapus dua baris contoh berwarna abu-abu sebelum mengisi data Anda.",
  "2. Kolom bertanda * wajib diisi: Nama Lengkap, Email, dan Kata Sandi.",
  "3. Email harus unik. Email yang sudah terdaftar akan dilewati dan dilaporkan pada ringkasan hasil impor.",
  "4. Kata sandi minimal 8 karakter. Ini hanya kata sandi awal — mintalah setiap pengguna menggantinya lewat menu 'Lupa kata sandi' setelah berhasil masuk.",
  `5. Kolom Peran hanya menerima "auditor" atau "admin". Bila dikosongkan, peran otomatis diisi "auditor".`,
  "6. Kolom Telepon boleh dikosongkan. Tulis apa adanya, misalnya 081234567890.",
  "7. Jangan mengubah nama kolom pada baris pertama, karena nama itulah yang dibaca sistem.",
  `8. Satu berkas maksimal ${MAX_ROWS} baris data.`,
  "",
  "Setelah berkas siap, buka menu Pengguna pada dashboard Administrator, klik 'Impor Excel', lalu unggah berkas ini. Sistem akan menampilkan pratinjau beserta catatan per baris sebelum akun benar-benar dibuat.",
];

/** Mengunduh berkas template .xlsx. */
export const GET = route(async (request) => {
  try {
    await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const buffer = await buildWorkbook({
    sheetName: "Pengguna",
    columns: COLUMNS,
    examples: EXAMPLES,
    notes: NOTES,
  });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-impor-pengguna-sim-ami.xlsx"',
      "Cache-Control": "no-store",
    },
  });
});

/**
 * Mengimpor pengguna dari berkas .xlsx.
 *
 * Dengan `?dryRun=1` berkas hanya diperiksa dan hasilnya dikembalikan sebagai
 * pratinjau — tidak ada akun yang dibuat. Pratinjau ini yang membuat impor
 * aman dipakai: administrator melihat lebih dulu baris mana yang akan dibuat
 * dan baris mana yang bermasalah, sebelum ada satu pun akun terbentuk.
 */
export const POST = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { auth, db } = ctx;
  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  let file;
  try {
    const form = await request.formData();
    file = form.get("file");
  } catch {
    return fail("Berkas tidak terbaca. Pastikan Anda mengunggah berkas .xlsx.");
  }

  if (!file || typeof file.arrayBuffer !== "function") {
    return fail("Berkas belum dipilih.");
  }
  if (file.size > MAX_BYTES) {
    return fail("Ukuran berkas melebihi 2 MB.");
  }

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

  // Tahap 1: pemeriksaan yang tidak menyentuh jaringan.
  const terlihat = new Set();
  const hasil = rows.map((row) => {
    const nama = (row.nama ?? "").trim();
    const email = (row.email ?? "").trim().toLowerCase();
    const password = (row.password ?? "").trim();
    const telepon = normalizeTelepon(row.telepon ?? "");
    const roleRaw = (row.role ?? "").trim().toLowerCase();
    const role = roleRaw || ROLES.AUDITOR;

    const dasar = { baris: row._baris, nama, email, role, telepon };

    if (!nama) return { ...dasar, status: "gagal", pesan: "Nama lengkap kosong." };
    if (!email) return { ...dasar, status: "gagal", pesan: "Email kosong." };
    if (!EMAIL_RE.test(email)) return { ...dasar, status: "gagal", pesan: "Format email tidak valid." };
    if (!password) return { ...dasar, status: "gagal", pesan: "Kata sandi kosong." };
    if (password.length < 8) {
      return { ...dasar, status: "gagal", pesan: "Kata sandi kurang dari 8 karakter." };
    }
    if (!Object.values(ROLES).includes(role)) {
      return {
        ...dasar,
        status: "gagal",
        pesan: `Peran "${roleRaw}" tidak dikenali. Pakai "auditor" atau "admin".`,
      };
    }
    if (terlihat.has(email)) {
      return { ...dasar, status: "gagal", pesan: "Email ini muncul lebih dari sekali di berkas." };
    }
    terlihat.add(email);

    return { ...dasar, status: "siap", password };
  });

  // Tahap 2: email yang sudah ada di Firebase Authentication. Diperiksa
  // sekaligus lewat getUsers agar tidak menembak satu permintaan per baris.
  const kandidat = hasil.filter((r) => r.status === "siap");
  if (kandidat.length) {
    const identifiers = kandidat.map((r) => ({ email: r.email }));
    const sudahAda = new Set();

    // getUsers dibatasi 100 identitas per panggilan.
    for (let i = 0; i < identifiers.length; i += 100) {
      const { users } = await auth.getUsers(identifiers.slice(i, i + 100));
      for (const u of users) if (u.email) sudahAda.add(u.email.toLowerCase());
    }

    for (const r of kandidat) {
      if (sudahAda.has(r.email)) {
        r.status = "gagal";
        r.pesan = "Email sudah terdaftar di sistem.";
        delete r.password;
      }
    }
  }

  const siap = hasil.filter((r) => r.status === "siap");

  if (dryRun) {
    return ok({
      dryRun: true,
      total: hasil.length,
      siap: siap.length,
      gagal: hasil.length - siap.length,
      rows: hasil.map(({ password, ...rest }) => rest),
    });
  }

  /*
    Tahap 3: pembuatan akun.

    Dikerjakan beberapa baris sekaligus, bukan satu per satu. Satu panggilan
    createUser memakan sekitar satu detik, sehingga 300 baris berurutan akan
    menghabiskan lima menit dan pasti melewati batas waktu fungsi. Dengan
    delapan baris serentak, waktunya turun ke orde puluhan detik.

    Profil Firestore untuk tiap kelompok ditulis sekaligus dalam satu batch —
    satu perjalanan jaringan, bukan delapan. Bila batch itu gagal, akun
    autentikasi sekelompok itu dibatalkan kembali supaya emailnya tidak
    terkunci oleh akun yang tidak pernah muncul di daftar mana pun.
  */
  let dibuat = 0;

  for (let i = 0; i < siap.length; i += CONCURRENCY) {
    const kelompok = siap.slice(i, i + CONCURRENCY);

    const terbuat = await Promise.all(
      kelompok.map(async (r) => {
        try {
          const userRecord = await auth.createUser({
            email: r.email,
            password: r.password,
            displayName: r.nama,
          });
          return { r, uid: userRecord.uid };
        } catch (err) {
          r.status = "gagal";
          r.pesan =
            err?.code === "auth/email-already-exists"
              ? "Email sudah terdaftar di sistem."
              : err?.message || "Gagal membuat akun.";
          return null;
        }
      })
    );

    const berhasil = terbuat.filter(Boolean);
    if (!berhasil.length) continue;

    try {
      const batch = db.batch();
      for (const { r, uid } of berhasil) {
        batch.set(db.collection("users").doc(uid), {
          uid,
          email: r.email,
          nama: r.nama,
          role: r.role,
          telepon: r.telepon,
          active: true,
          sumber: "impor",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();

      for (const { r } of berhasil) {
        r.status = "dibuat";
        r.pesan = "Akun berhasil dibuat.";
        dibuat += 1;
      }
    } catch (err) {
      await Promise.all(berhasil.map(({ uid }) => auth.deleteUser(uid).catch(() => {})));
      for (const { r } of berhasil) {
        r.status = "gagal";
        r.pesan = `Profil gagal disimpan: ${err.message}`;
      }
    }
  }

  for (const r of siap) delete r.password;

  return ok({
    dryRun: false,
    total: hasil.length,
    dibuat,
    gagal: hasil.length - dibuat,
    rows: hasil.map(({ password, ...rest }) => rest),
  });
});
