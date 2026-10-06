import { getAdmin, requireRole } from "@/lib/firebase-admin";
import { fail, route } from "@/lib/api-response";
import { buildReportPdf, loadAuditBundle, reportFileName } from "@/lib/pdf/build-report";
import { buildReportEmail, isMailerConfigured, sendMail } from "@/lib/mailer";
import { APP_NAME, AUDIT_STATUS, ROLES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Status konfigurasi email, dipakai UI untuk menonaktifkan tombol kirim. */
export const GET = route(async () => Response.json({ configured: isMailerConfigured() }));

/** Mengirim laporan audit beserta lampiran PDF ke kepala sekolah. */
export const POST = route(async (request, { params }) => {
  const { auditId } = await params;

  let ctx;
  try {
    ctx = await requireRole(request, [ROLES.ADMIN, ROLES.AUDITOR]);
  } catch (err) {
    return fail(err.message, err.status ?? 401);
  }

  if (!isMailerConfigured()) {
    return Response.json(
      { error: "Pengiriman email belum dikonfigurasi di server. Isi variabel SMTP_* di .env.local." },
      { status: 503 }
    );
  }

  try {
    const bundle = await loadAuditBundle(auditId, { uid: ctx.uid, role: ctx.profile.role });
    const { audit } = bundle;

    const body = await request.json().catch(() => ({}));
    const tujuan = (body.to || audit.kepalaEmail || "").trim();
    if (!tujuan) {
      return Response.json(
        { error: "Email kepala sekolah belum tercatat pada dokumen audit ini." },
        { status: 400 }
      );
    }
    if (audit.status !== AUDIT_STATUS.COMPLETED) {
      return Response.json(
        { error: "Tandai audit selesai terlebih dahulu sebelum mengirim laporan." },
        { status: 400 }
      );
    }

    const pdf = await buildReportPdf(bundle, {
      penerbit: process.env.NEXT_PUBLIC_ORG_NAME || APP_NAME,
    });
    const { subject, text, html } = buildReportEmail(bundle);

    await sendMail({
      to: tujuan,
      subject,
      text,
      html,
      attachments: [{ filename: reportFileName(audit), content: pdf, contentType: "application/pdf" }],
    });

    const { db, FieldValue } = await getAdmin();
    await db.collection("audits").doc(auditId).set(
      {
        emailTerakhirKe: tujuan,
        emailTerakhirPada: FieldValue.serverTimestamp(),
        emailTerakhirOleh: ctx.profile.nama ?? ctx.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return Response.json({ ok: true, to: tujuan });
  } catch (err) {
    return fail(err.message, err.status ?? 500);
  }
});
