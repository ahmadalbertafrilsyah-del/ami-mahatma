"use client";

import { useEffect, useState } from "react";

import { authHeaders } from "./auth-provider";
import { Badge, Button, Card, Field, Input, Notice, Spinner } from "./ui";
import { AUDIT_STATUS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

/**
 * Panel unduh PDF dan pengiriman laporan ke kepala sekolah.
 * PDF dirakit di server (A4, Times New Roman 12 pt, spasi 1,5, rata kiri-kanan).
 */
export function ReportActions({ audit }) {
  const [mailerReady, setMailerReady] = useState(null);
  const [tujuan, setTujuan] = useState(audit.kepalaEmail ?? "");
  const [unduh, setUnduh] = useState(false);
  const [kirim, setKirim] = useState(false);
  const [message, setMessage] = useState(null);

  const selesai = audit.status === AUDIT_STATUS.COMPLETED;

  useEffect(() => {
    fetch(`/api/laporan/${audit.id}/email`)
      .then((r) => r.json())
      .then((d) => setMailerReady(Boolean(d.configured)))
      .catch(() => setMailerReady(false));
  }, [audit.id]);

  async function unduhPdf() {
    setUnduh(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/laporan/${audit.id}`, { headers: await authHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Gagal membuat berkas PDF.");
      }

      const blob = await res.blob();
      const nama =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] ?? "laporan-ami.pdf";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nama;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setMessage({ tone: "red", text: err.message });
    } finally {
      setUnduh(false);
    }
  }

  async function kirimEmail() {
    if (!tujuan.trim()) {
      setMessage({ tone: "red", text: "Alamat email tujuan wajib diisi." });
      return;
    }
    if (!confirm(`Kirim laporan audit beserta lampiran PDF ke ${tujuan.trim()}?`)) return;

    setKirim(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/laporan/${audit.id}/email`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ to: tujuan.trim() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal mengirim email.");
      setMessage({ tone: "emerald", text: `Laporan terkirim ke ${body.to}.` });
    } catch (err) {
      setMessage({ tone: "red", text: err.message });
    } finally {
      setKirim(false);
    }
  }

  return (
    <Card className="no-print p-0">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">Unduh &amp; Kirim Laporan</h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Berkas PDF memakai kertas A4, Times New Roman 12 pt, spasi 1,5, dan paragraf rata
            kiri-kanan.
          </p>
        </div>
        {audit.emailTerakhirPada && (
          <Badge tone="emerald">Terkirim {formatDateTime(audit.emailTerakhirPada)}</Badge>
        )}
      </div>

      <div className="space-y-4 px-5 py-5">
        {!selesai && (
          <Notice tone="amber">
            Audit belum ditandai selesai. PDF tetap dapat diunduh sebagai draf, tetapi pengiriman
            email baru terbuka setelah audit diselesaikan.
          </Notice>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <Field label="Email kepala sekolah" className="min-w-60 flex-1">
            <Input
              type="email"
              value={tujuan}
              onChange={(e) => setTujuan(e.target.value)}
              placeholder="nama@sekolah.sch.id"
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={unduhPdf} disabled={unduh}>
              {unduh && <Spinner />}
              {unduh ? "Menyiapkan..." : "Unduh PDF"}
            </Button>
            <Button onClick={kirimEmail} disabled={kirim || !selesai || mailerReady === false}>
              {kirim && <Spinner />}
              {kirim ? "Mengirim..." : "Kirim ke Email"}
            </Button>
          </div>
        </div>

        {mailerReady === false && (
          <Notice tone="amber">
            Pengiriman email belum aktif. Isi variabel <b>SMTP_HOST</b>, <b>SMTP_USER</b>, dan{" "}
            <b>SMTP_PASS</b> di <code>.env.local</code>, lalu jalankan ulang server.
          </Notice>
        )}

        {audit.emailTerakhirPada && (
          <p className="text-xs text-slate-500">
            Pengiriman terakhir ke <b>{audit.emailTerakhirKe}</b> pada{" "}
            {formatDateTime(audit.emailTerakhirPada)}
            {audit.emailTerakhirOleh ? ` oleh ${audit.emailTerakhirOleh}` : ""}.
          </p>
        )}

        {message && <Notice tone={message.tone}>{message.text}</Notice>}
      </div>
    </Card>
  );
}
