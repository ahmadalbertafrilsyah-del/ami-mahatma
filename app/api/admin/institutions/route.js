import { requireRole } from "@/lib/firebase-admin";
import { fail, ok, route } from "@/lib/api-response";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/**
 * Menghapus satu lembaga.
 *
 * Penghapusan dari sisi klien tidak memadai karena dokumen audit menyimpan
 * temuan pada subkoleksi `findings`. Menghapus dokumen induknya lewat SDK
 * klien meninggalkan subkoleksi itu menggantung: datanya tetap ada di
 * Firestore, tidak terlihat di mana pun, dan tetap terhitung sebagai
 * penyimpanan. `recursiveDelete` milik Admin SDK membereskan seluruh pohonnya.
 *
 * Tanpa `cascade=1`, lembaga yang masih memiliki dokumen audit ditolak dan
 * jumlahnya dilaporkan, supaya riwayat audit tidak lenyap karena salah klik.
 */
export const DELETE = route(async (request) => {
  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { db } = ctx;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const cascade = searchParams.get("cascade") === "1";

  if (!id) return fail("ID lembaga wajib disertakan.");

  const ref = db.collection("institutions").doc(id);
  const snap = await ref.get();
  if (!snap.exists) return fail("Lembaga tidak ditemukan.", 404);

  const audits = await db.collection("audits").where("institutionId", "==", id).get();

  if (audits.size > 0 && !cascade) {
    return fail(
      `Lembaga ini masih memiliki ${audits.size} dokumen audit.`,
      409,
      { auditCount: audits.size }
    );
  }

  // Dokumen audit dihapus beserta subkoleksi temuannya.
  for (const doc of audits.docs) {
    await db.recursiveDelete(doc.ref);
  }

  await ref.delete();

  return ok({ deletedAudits: audits.size });
});
