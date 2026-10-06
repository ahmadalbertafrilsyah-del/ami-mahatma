import { isCloudinaryConfigured, signUpload } from "@/lib/cloudinary";
import { fail, readJson, route } from "@/lib/api-response";
import { requireRole } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = ["ami/bukti", "ami/rtl", "ami/profil", "ami/lampiran"];

export const POST = route(async (request) => {
  if (!isCloudinaryConfigured()) {
    return fail("Cloudinary belum dikonfigurasi di server.", 503);
  }

  try {
    await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  const { folder } = await readJson(request);
  const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : ALLOWED_FOLDERS[0];

  const signed = signUpload({ folder: safeFolder });
  return Response.json({
    ...signed,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
});
