import { isCloudinaryConfigured, signUpload } from "@/lib/cloudinary";
import { requireRole } from "@/lib/firebase-admin";
import { ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const ALLOWED_FOLDERS = ["ami/bukti", "ami/rtl", "ami/profil", "ami/lampiran"];

export async function POST(request) {
  if (!isCloudinaryConfigured()) {
    return Response.json({ error: "Cloudinary belum dikonfigurasi di server." }, { status: 503 });
  }

  try {
    await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status ?? 400 });
  }

  const { folder } = await request.json().catch(() => ({}));
  const safeFolder = ALLOWED_FOLDERS.includes(folder) ? folder : ALLOWED_FOLDERS[0];

  const signed = signUpload({ folder: safeFolder });
  return Response.json({
    ...signed,
    cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  });
}
