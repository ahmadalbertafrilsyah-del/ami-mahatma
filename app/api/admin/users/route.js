import { requireRole } from "@/lib/firebase-admin";
import { fail, ok, readJson, route } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const VALID_ROLES = Object.values(ROLES);

/**
 * Menerjemahkan kode galat Firebase Auth menjadi kalimat yang berguna bagi
 * administrator. Kode yang tidak dikenali dibiarkan apa adanya agar penyebab
 * sebenarnya tetap terlihat.
 */
function authMessage(err) {
  switch (err?.code) {
    case "auth/email-already-exists":
      return "Email ini sudah terdaftar di sistem autentikasi.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/invalid-password":
      return "Kata sandi tidak memenuhi syarat Firebase (minimal 6 karakter).";
    case "auth/user-not-found":
      return "Akun tidak ditemukan di sistem autentikasi.";
    default:
      return err?.message || "Gagal memproses akun di Firebase Authentication.";
  }
}

/**
 * Admin membuat akun pengguna lewat Admin SDK agar sesi admin yang sedang
 * berjalan tidak tergantikan (yang terjadi bila memakai createUser di klien).
 */
export const POST = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { auth, db, FieldValue } = ctx;
  const { email, password, nama, role, telepon = "" } = await readJson(request);

  if (!email || !password || !nama || !role) {
    return fail("Nama, email, kata sandi, dan peran wajib diisi.");
  }
  if (!VALID_ROLES.includes(role)) return fail("Peran tidak dikenali.");
  if (String(password).length < 8) return fail("Kata sandi minimal 8 karakter.");

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: String(email).trim().toLowerCase(),
      password: String(password),
      displayName: String(nama).trim(),
    });
  } catch (err) {
    return fail(authMessage(err));
  }

  try {
    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        uid: userRecord.uid,
        email: String(email).trim().toLowerCase(),
        nama: String(nama).trim(),
        role,
        telepon: String(telepon ?? ""),
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  } catch (err) {
    // Akun autentikasi sudah terlanjur dibuat tetapi profilnya gagal ditulis.
    // Tanpa pembersihan ini, email tersebut akan tertolak selamanya pada
    // percobaan berikutnya padahal penggunanya tidak pernah muncul di daftar.
    await auth.deleteUser(userRecord.uid).catch(() => {});
    return fail(`Akun gagal disimpan di basis data: ${err.message}`, 500);
  }

  return ok({ uid: userRecord.uid });
});

/** Memperbarui profil, peran, status aktif, atau kata sandi pengguna. */
export const PATCH = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { auth, db, FieldValue, uid: actorUid } = ctx;
  const { uid, nama, role, active, password, telepon } = await readJson(request);

  if (!uid) return fail("UID pengguna wajib disertakan.");
  if (role && !VALID_ROLES.includes(role)) return fail("Peran tidak dikenali.");

  // Menjaga agar sistem tidak kehilangan seluruh administratornya.
  if (uid === actorUid && (active === false || (role && role !== ROLES.ADMIN))) {
    return fail("Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri.");
  }

  const authPatch = {};
  if (nama) authPatch.displayName = String(nama).trim();
  if (typeof active === "boolean") authPatch.disabled = !active;
  if (password) {
    if (String(password).length < 8) return fail("Kata sandi minimal 8 karakter.");
    authPatch.password = String(password);
  }

  if (Object.keys(authPatch).length) {
    try {
      await auth.updateUser(uid, authPatch);
    } catch (err) {
      return fail(authMessage(err));
    }
  }

  const docPatch = { updatedAt: FieldValue.serverTimestamp() };
  if (nama) docPatch.nama = String(nama).trim();
  if (role) docPatch.role = role;
  if (typeof active === "boolean") {
    docPatch.active = active;
    // Mengaktifkan akun sekaligus menutup antrean persetujuannya, agar
    // pendaftar yang sudah disetujui tidak terus muncul sebagai "menunggu".
    if (active) docPatch.pendingApproval = false;
  }
  if (typeof telepon === "string") docPatch.telepon = telepon;

  try {
    await db.collection("users").doc(uid).set(docPatch, { merge: true });
  } catch (err) {
    return fail(`Profil gagal diperbarui: ${err.message}`, 500);
  }

  return ok();
});

/** Menghapus akun autentikasi sekaligus profilnya. */
export const DELETE = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { auth, db, FieldValue, uid: actorUid } = ctx;
  const uid = new URL(request.url).searchParams.get("uid");

  if (!uid) return fail("UID pengguna wajib disertakan.");
  if (uid === actorUid) return fail("Anda tidak dapat menghapus akun sendiri.");

  await auth.deleteUser(uid).catch(() => {});

  try {
    await db.collection("users").doc(uid).delete();
  } catch (err) {
    return fail(`Profil gagal dihapus: ${err.message}`, 500);
  }

  return ok();
});
