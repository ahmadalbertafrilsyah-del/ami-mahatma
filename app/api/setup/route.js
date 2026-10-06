import { FieldValue } from "firebase-admin/firestore";

import { adminConfigStatus, getAdmin, isAdminConfigured } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

async function adminExists(db) {
  const snap = await db.collection("users").where("role", "==", ROLES.ADMIN).limit(1).get();
  return !snap.empty;
}

export async function GET() {
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
}

/**
 * Membuat administrator pertama. Endpoint menutup diri begitu satu akun
 * administrator sudah ada, sehingga tidak bisa dipakai ulang sebagai pintu masuk.
 */
export async function POST(request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "Firebase Admin belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const { auth, db } = getAdmin();

  if (await adminExists(db)) {
    return Response.json(
      { error: "Administrator sudah ada. Inisialisasi hanya dapat dilakukan sekali." },
      { status: 409 }
    );
  }

  const { email, password, nama } = await request.json().catch(() => ({}));
  if (!email || !password || !nama) {
    return Response.json({ error: "Nama, email, dan kata sandi wajib diisi." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return Response.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
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

    return Response.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
