import { destroyAsset, isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireRole } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!isCloudinaryConfigured()) {
    return Response.json({ error: "Cloudinary belum dikonfigurasi di server." }, { status: 503 });
  }

  try {
    await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status ?? 400 });
  }

  const { publicId, resourceType = "image" } = await request.json().catch(() => ({}));
  if (!publicId) {
    return Response.json({ error: "publicId wajib disertakan." }, { status: 400 });
  }

  try {
    const result = await destroyAsset(publicId, resourceType);
    return Response.json({ ok: true, result });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}
