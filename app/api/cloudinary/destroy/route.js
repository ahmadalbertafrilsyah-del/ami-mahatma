import { destroyAsset, isCloudinaryConfigured } from "@/lib/cloudinary";
import { fail, ok, readJson, route } from "@/lib/api-response";
import { requireRole } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const POST = route(async (request) => {
  if (!isCloudinaryConfigured()) {
    return fail("Cloudinary belum dikonfigurasi di server.", 503);
  }

  try {
    await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { publicId, resourceType = "image" } = await readJson(request);
  if (!publicId) {
    return fail("publicId wajib disertakan.");
  }

  try {
    return ok({ result: await destroyAsset(publicId, resourceType) });
  } catch (err) {
    return fail(err.message);
  }
});
