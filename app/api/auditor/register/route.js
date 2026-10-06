import { FieldValue } from "firebase-admin/firestore";

import { getAdmin, isAdminConfigured } from "@/lib/firebase-admin";
import { fail, ok, readJson, route } from "@/lib/api-response";
import { INSTITUTION_STATUS, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/*
  Pembatas laju sederhana. Endpoint ini terbuka tanpa autentikasi, sehingga
  tanpa pembatas seseorang dapat membuat akun secara beruntun. Penyimpanannya
  di memori proses: cukup untuk menahan penyalahgunaan dari satu sumber, dan
  tidak menambah ketergantungan baru. Pada penyebaran dengan banyak instance,
  ganti dengan penyimpanan bersama bila diperlukan.
*/
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const attempts = new Map();

function rateLimited(ip) {
  const now = Date.now();

  // Membuang catatan kedaluwarsa agar peta tidak tumbuh tanpa batas.
  for (const [key, times] of attempts) {
    const fresh = times.filter((t) => now - t < WINDOW_MS);
    if (fresh.length) attempts.set(key, fresh);
    else attempts.delete(key);
  }

  const times = attempts.get(ip) ?? [];
  if (times.length >= MAX_PER_WINDOW) return true;
  attempts.set(ip, [...times, now]);
  return false;
}

function clientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function text(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

/**
 * Pendaftaran auditor secara mandiri.
 *
 * Akun dibuat lewat Admin SDK dengan profil `active: false`. Auditor dapat
 * masuk, tetapi diarahkan ke halaman "menunggu verifikasi" sampai seorang
 * administrator mengaktifkannya di menu Pengguna. Dengan begitu data lembaga,
 * audit, dan temuan tidak pernah terbuka bagi pendaftar yang belum diperiksa.
 *
 * Data lembaga bersifat opsional; bila diisi, lembaga ikut tercatat sebagai
 * pendaftaran berstatus "menunggu verifikasi" dan ditautkan ke auditornya.
 */
export const POST = route(async (request) => {
  if (!isAdminConfigured()) {
    return fail("Pendaftaran belum dapat diproses: server belum dikonfigurasi.", 503);
  }

  if (rateLimited(clientIp(request))) {
    return fail("Terlalu banyak percobaan pendaftaran. Coba lagi dalam satu jam.", 429);
  }

  const body = await readJson(request);

  const nama = text(body.nama, 120);
  const email = text(body.email, 150).toLowerCase();
  const password = String(body.password ?? "");
  const telepon = text(body.telepon, 25);
  const instansi = text(body.instansi, 150);

  if (!nama || nama.length < 3) return fail("Nama lengkap wajib diisi, minimal 3 karakter.");
  if (!EMAIL_RE.test(email)) return fail("Format email tidak valid.");
  if (password.length < 8) return fail("Kata sandi minimal 8 karakter.");
  if (telepon && telepon.replace(/\D/g, "").length < 9) {
    return fail("Nomor telepon belum lengkap.");
  }

  // Lembaga opsional. Dianggap diisi begitu namanya dicantumkan.
  const lembaga = body.lembaga ?? {};
  const lembagaNama = text(lembaga.nama, 150);
  const daftarkanLembaga = Boolean(lembagaNama);

  let institutionPayload = null;
  if (daftarkanLembaga) {
    if (lembagaNama.length < 3) return fail("Nama lembaga minimal 3 karakter.");

    const kepalaEmail = text(lembaga.kepalaEmail, 150).toLowerCase();
    if (kepalaEmail && !EMAIL_RE.test(kepalaEmail)) {
      return fail("Format email kepala sekolah tidak valid.");
    }

    institutionPayload = {
      nama: lembagaNama,
      jenjang: text(lembaga.jenjang, 40),
      npsn: text(lembaga.npsn, 20),
      alamat: text(lembaga.alamat, 250),
      kota: text(lembaga.kota, 80),
      kepalaNama: text(lembaga.kepalaNama, 120),
      kepalaEmail,
      kepalaWhatsapp: text(lembaga.kepalaWhatsapp, 25),
    };
  }

  const { auth, db } = getAdmin();

  // Pemeriksaan awal supaya pesannya jelas; `createUser` tetap menjadi
  // penentu akhir bila ada dua pendaftaran bersamaan.
  const existing = await auth.getUserByEmail(email).catch(() => null);
  if (existing) {
    return fail(
      "Email ini sudah terdaftar. Silakan masuk, atau pakai tautan lupa kata sandi bila Anda lupa sandinya.",
      409
    );
  }

  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName: nama });
  } catch (err) {
    if (err?.code === "auth/email-already-exists") {
      return fail("Email ini sudah terdaftar. Silakan masuk.", 409);
    }
    return fail(err?.message || "Gagal membuat akun di Firebase Authentication.");
  }

  try {
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      nama,
      role: ROLES.AUDITOR,
      telepon,
      instansi,
      // Menunggu persetujuan administrator.
      active: false,
      pendingApproval: true,
      sumber: "mandiri",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    await auth.deleteUser(userRecord.uid).catch(() => {});
    return fail(`Pendaftaran gagal disimpan: ${err.message}`, 500);
  }

  let institutionId = null;
  if (institutionPayload) {
    try {
      const ref = await db.collection("institutions").add({
        ...institutionPayload,
        status: INSTITUTION_STATUS.PENDING,
        sumber: "auditor",
        didaftarkanOlehUid: userRecord.uid,
        didaftarkanOlehNama: nama,
        createdAt: FieldValue.serverTimestamp(),
      });
      institutionId = ref.id;
    } catch (err) {
      // Akun tetap dipertahankan: auditor sudah terdaftar dan tinggal
      // menunggu persetujuan. Lembaganya dapat ditambahkan belakangan.
      console.error("[auditor/register] lembaga gagal disimpan:", err);
      return ok({
        uid: userRecord.uid,
        institutionId: null,
        warning:
          "Akun Anda berhasil dibuat, tetapi data lembaga gagal disimpan. Sampaikan data lembaga kepada administrator setelah akun disetujui.",
      });
    }
  }

  return ok({ uid: userRecord.uid, institutionId });
});
