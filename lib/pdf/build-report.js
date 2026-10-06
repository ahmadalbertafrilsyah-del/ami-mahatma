import "server-only";

import { renderToBuffer } from "@react-pdf/renderer";

import { getAdmin } from "../firebase-admin";
import { computeScores } from "../scoring";
import { ReportDocument } from "./report-document";

/** Firestore Timestamp menjadi Date biasa agar aman dipakai komponen PDF. */
function normalize(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object" && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, normalize(v)]));
  }
  return value;
}

/**
 * Mengambil dokumen audit beserta instrumen dan temuannya, lalu memastikan
 * pemanggil berhak mengaksesnya.
 */
export async function loadAuditBundle(auditId, { uid, role }) {
  const { db } = getAdmin();

  const auditSnap = await db.collection("audits").doc(auditId).get();
  if (!auditSnap.exists) {
    const error = new Error("Dokumen audit tidak ditemukan.");
    error.status = 404;
    throw error;
  }
  const audit = normalize({ id: auditSnap.id, ...auditSnap.data() });

  const berhak = role === "admin" || (audit.auditorUids ?? []).includes(uid);
  if (!berhak) {
    const error = new Error("Anda tidak ditugaskan pada dokumen audit ini.");
    error.status = 403;
    throw error;
  }

  const instrumentSnap = await db.collection("instruments").doc(audit.instrumentId).get();
  if (!instrumentSnap.exists) {
    const error = new Error("Instrumen audit tidak ditemukan.");
    error.status = 404;
    throw error;
  }
  const instrument = normalize({ id: instrumentSnap.id, ...instrumentSnap.data() });

  const findingsSnap = await db
    .collection("audits")
    .doc(auditId)
    .collection("findings")
    .orderBy("createdAt")
    .get();
  const findings = findingsSnap.docs.map((d) => normalize({ id: d.id, ...d.data() }));

  return { audit, instrument, findings, scores: computeScores(instrument, audit) };
}

/** Nama berkas yang rapi dan aman dipakai di header Content-Disposition. */
export function reportFileName(audit) {
  const slug = `${audit.institutionNama ?? "lembaga"}-${audit.periodNama ?? ""}`
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `laporan-ami-${slug || "audit"}.pdf`;
}

export async function buildReportPdf(bundle, { penerbit } = {}) {
  return renderToBuffer(<ReportDocument {...bundle} penerbit={penerbit} />);
}
