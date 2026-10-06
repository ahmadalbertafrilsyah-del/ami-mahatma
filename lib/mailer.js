import "server-only";

import nodemailer from "nodemailer";

import { APP_NAME, APP_TAGLINE } from "./constants";

function readConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  return {
    host,
    port,
    // Port 465 memakai TLS langsung; port lain memulai dengan STARTTLS.
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: { user, pass },
  };
}

export function isMailerConfigured() {
  return readConfig() !== null;
}

export function mailFrom() {
  const nama = process.env.NEXT_PUBLIC_ORG_NAME || APP_NAME;
  const alamat = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  return alamat.includes("<") ? alamat : `"${nama}" <${alamat}>`;
}

export async function sendMail({ to, subject, text, html, attachments }) {
  const config = readConfig();
  if (!config) {
    const error = new Error(
      "Pengiriman email belum dikonfigurasi. Isi SMTP_HOST, SMTP_USER, dan SMTP_PASS di .env.local."
    );
    error.status = 503;
    throw error;
  }

  const transporter = nodemailer.createTransport(config);
  return transporter.sendMail({ from: mailFrom(), to, subject, text, html, attachments });
}

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** Isi surel pengantar laporan audit untuk kepala sekolah. */
export function buildReportEmail({ audit, scores, findings }) {
  const organisasi = process.env.NEXT_PUBLIC_ORG_NAME || APP_NAME;
  const skor = scores.overall === null ? "-" : scores.overall.toFixed(2);
  const predikat = scores.status ? scores.status.label : "belum dinilai";
  const terbuka = findings.filter((f) => f.status !== "closed").length;
  const tanggal = dateFmt.format(
    audit.completedAt instanceof Date ? audit.completedAt : new Date()
  );

  const subject = `Laporan Audit Mutu Internal — ${audit.institutionNama} (${audit.periodNama})`;

  const baris = [
    `Yth. ${audit.kepalaNama || "Kepala Sekolah"},`,
    "",
    `Audit mutu internal terhadap ${audit.institutionNama} pada periode ${audit.periodNama} telah selesai dilaksanakan pada ${tanggal}.`,
    "",
    "Ringkasan hasil:",
    `- Skor mutu: ${skor} dari 4 (${predikat})`,
    `- Indikator dinilai: ${scores.answered} dari ${scores.total}`,
    `- Jumlah temuan: ${findings.length} (${terbuka} masih terbuka)`,
    "",
    "Laporan lengkap beserta daftar temuan dan rencana tindak lanjut terlampir dalam berkas PDF.",
    "Mohon rencana tindak lanjut dilaksanakan sesuai target waktu yang tercantum, dan perkembangannya disampaikan kepada auditor untuk verifikasi.",
    "",
    "Hormat kami,",
    organisasi,
    APP_TAGLINE,
  ];

  const text = baris.join("\n");

  const html = `
<div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#1e293b;max-width:640px">
  <p>Yth. <strong>${escapeHtml(audit.kepalaNama || "Kepala Sekolah")}</strong>,</p>
  <p style="text-align:justify">
    Audit mutu internal terhadap <strong>${escapeHtml(audit.institutionNama)}</strong> pada periode
    <strong>${escapeHtml(audit.periodNama)}</strong> telah selesai dilaksanakan pada ${tanggal}.
  </p>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:18px 0;width:100%">
    <tr style="background:#ecfdf5">
      <td style="border:1px solid #d1fae5"><strong>Skor mutu</strong></td>
      <td style="border:1px solid #d1fae5">${skor} dari 4 — ${escapeHtml(predikat)}</td>
    </tr>
    <tr>
      <td style="border:1px solid #e2e8f0"><strong>Indikator dinilai</strong></td>
      <td style="border:1px solid #e2e8f0">${scores.answered} dari ${scores.total}</td>
    </tr>
    <tr style="background:#f8fafc">
      <td style="border:1px solid #e2e8f0"><strong>Jumlah temuan</strong></td>
      <td style="border:1px solid #e2e8f0">${findings.length} temuan, ${terbuka} masih terbuka</td>
    </tr>
  </table>
  <p style="text-align:justify">
    Laporan lengkap beserta daftar temuan dan rencana tindak lanjut terlampir dalam berkas PDF.
    Mohon rencana tindak lanjut dilaksanakan sesuai target waktu yang tercantum, dan perkembangannya
    disampaikan kepada auditor untuk proses verifikasi.
  </p>
  <p style="margin-top:24px">
    Hormat kami,<br />
    <strong>${escapeHtml(organisasi)}</strong><br />
    <span style="color:#64748b">${APP_TAGLINE}</span>
  </p>
</div>`.trim();

  return { subject, text, html };
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
