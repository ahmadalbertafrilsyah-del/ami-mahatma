import { FieldValue } from "firebase-admin/firestore";

import { requireRole } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const VALID_ROLES = Object.values(ROLES);

function fail(err) {
  return Response.json({ error: err.message }, { status: err.status ?? 400 });
}

/**
 * Admin membuat akun pengguna lewat Admin SDK agar sesi admin yang sedang
 * berjalan tidak tergantikan (yang terjadi bila memakai createUser di klien).
 */
export async function POST(request) {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err);
  }

  const { auth, db } = ctx;
  const body = await request.json().catch(() => ({}));
  const { email, password, nama, role, telepon = "" } = body;

  if (!email || !password || !nama || !role) {
    return Response.json(
      { error: "Nama, email, kata sandi, dan peran wajib diisi." },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return Response.json({ error: "Peran tidak dikenali." }, { status: 400 });
  }
  if (String(password).length < 8) {
    return Response.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
  }
  
  try {
    const userRecord = await auth.createUser({ email, password, displayName: nama });
    await db.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      nama,
      role,
      telepon,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    const message =
      err.code === "auth/email-already-exists"
        ? "Email ini sudah terdaftar di sistem autentikasi."
        : err.message;
    return Response.json({ error: message }, { status: 400 });
  }
}

/** Memperbarui profil, peran, status aktif, atau kata sandi pengguna. */
export async function PATCH(request) {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err);
  }

  const { auth, db, uid: actorUid } = ctx;
  const body = await request.json().catch(() => ({}));
  const { uid, nama, role, active, password, telepon } = body;

  if (!uid) return Response.json({ error: "UID pengguna wajib disertakan." }, { status: 400 });
  if (role && !VALID_ROLES.includes(role)) {
    return Response.json({ error: "Peran tidak dikenali." }, { status: 400 });
  }
  // Menjaga agar sistem tidak kehilangan seluruh administratornya.
  if (uid === actorUid && (active === false || (role && role !== ROLES.ADMIN))) {
    return Response.json(
      { error: "Anda tidak dapat menonaktifkan atau menurunkan peran akun sendiri." },
      { status: 400 }
    );
  }

  try {
    const authPatch = {};
    if (nama) authPatch.displayName = nama;
    if (typeof active === "boolean") authPatch.disabled = !active;
    if (password) {
      if (String(password).length < 8) {
        return Response.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
      }
      authPatch.password = password;
    }
    if (Object.keys(authPatch).length) await auth.updateUser(uid, authPatch);

    const docPatch = { updatedAt: FieldValue.serverTimestamp() };
    if (nama) docPatch.nama = nama;
    if (role) docPatch.role = role;
    if (typeof active === "boolean") docPatch.active = active;
    if (typeof telepon === "string") docPatch.telepon = telepon;

    await db.collection("users").doc(uid).set(docPatch, { merge: true });

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

/** Menghapus akun autentikasi sekaligus profilnya. */
export async function DELETE(request) {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err);
  }

  const { auth, db, uid: actorUid } = ctx;
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) return Response.json({ error: "UID pengguna wajib disertakan." }, { status: 400 });
  if (uid === actorUid) {
    return Response.json({ error: "Anda tidak dapat menghapus akun sendiri." }, { status: 400 });
  }

  try {
    await auth.deleteUser(uid).catch(() => {});
    await db.collection("users").doc(uid).delete();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
