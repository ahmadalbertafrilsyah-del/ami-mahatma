import { requireRole } from "@/lib/firebase-admin";
import { buildReportPdf, loadAuditBundle, reportFileName } from "@/lib/pdf/build-report";
import { ROLES } from "@/lib/constants";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Mengunduh laporan audit sebagai berkas PDF A4. */
export async function GET(request, { params }) {
  const { auditId } = await params;

  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status ?? 400 });
  }

  try {
    const bundle = await loadAuditBundle(auditId, {
      uid: ctx.uid,
      role: ctx.profile.role,
    });
    const pdf = await buildReportPdf(bundle, {
      penerbit: process.env.NEXT_PUBLIC_ORG_NAME || APP_NAME,
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${reportFileName(bundle.audit)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: err.status ?? 500 });
  }
}
