import { FieldValue } from "firebase-admin/firestore";

import { adminConfigStatus, getAdmin, isAdminConfigured } from "@/lib/firebase-admin";
import { fail, ok, readJson, route } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function adminExists(db) {
  const snap = await db.collection("users").where("role", "==", ROLES.ADMIN).limit(1).get();
  return !snap.empty;
}

export const GET = route(async () => {
  const status = adminConfigStatus();
  if (!status.configured) {
    return Response.json({ configured: false, adminExists: false, reason: status.reason });
  }
  try {
    const { db } = getAdmin();
    return Response.json({ configured: true, adminExists: await adminExists(db) });
  } catch (err) {
    // Kredensial terbaca tetapi ditolak Google, misal project tidak cocok atau
    // Firestore belum diaktifkan.
    return Response.json({ configured: false, adminExists: false, reason: err.message });
  }
});

/**
 * Membuat administrator pertama. Endpoint menutup diri begitu satu akun
 * administrator sudah ada, sehingga tidak bisa dipakai ulang sebagai pintu masuk.
 */
export const POST = route(async (request) => {
  if (!isAdminConfigured()) {
    return fail("Firebase Admin belum dikonfigurasi di server.", 503);
  }

  const { auth, db } = getAdmin();

  if (await adminExists(db)) {
    return fail("Administrator sudah ada. Inisialisasi hanya dapat dilakukan sekali.", 409);
  }

  const { email, password, nama } = await readJson(request);
  if (!email || !password || !nama) {
    return fail("Nama, email, dan kata sandi wajib diisi.");
  }
  if (String(password).length < 8) {
    return fail("Kata sandi minimal 8 karakter.");
  }

  try {
    // Akun yang sudah dibuat lewat Firebase Console boleh dipakai ulang.
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      await auth.updateUser(userRecord.uid, { password, displayName: nama });
    } catch {
      userRecord = await auth.createUser({ email, password, displayName: nama });
    }

    await db.collection("users").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email,
        nama,
        role: ROLES.ADMIN,
        telepon: "",
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return ok({ uid: userRecord.uid });
  } catch (err) {
    return fail(err.message);
  }
});
