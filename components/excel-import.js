"use client";

import { useRef, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "./auth-provider";
import { Badge, Button, Card, Modal, Notice, Spinner, cx } from "./ui";
import { IconCheck, IconClose, IconReport } from "./icons";

const STATUS_TONE = { siap: "blue", dibuat: "emerald", gagal: "red" };
const STATUS_LABEL = { siap: "Siap", dibuat: "Dibuat", gagal: "Gagal" };

/**
 * Impor data dari berkas Excel.
 *
 * Alurnya tiga langkah: unduh template → unggah berkas yang hanya diperiksa
 * (pratinjau) → impor sungguhan. Langkah pratinjau sengaja dipisah karena
 * impor menulis data sungguhan; administrator perlu melihat baris mana yang
 * bermasalah sebelum ada satu pun baris tersimpan.
 *
 * Dipakai bersama oleh impor pengguna dan impor lembaga; yang berbeda hanya
 * alamat endpoint, teksnya, dan cara satu baris diringkas pada pratinjau.
 */
export function ExcelImportModal({
  open,
  onClose,
  onFinished,
  title,
  description,
  endpoint,
  templateName,
  limitNote,
  satuan = "baris",
  rowTitle = (r) => r.nama,
  rowMeta = () => "",
  successNote = null,
}) {
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // hasil pemeriksaan
  const [result, setResult] = useState(null); // hasil impor sungguhan
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // 'template' | 'periksa' | 'impor'

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  /** Template diambil dengan header otentikasi, lalu disimpan sebagai berkas. */
  async function unduhTemplate() {
    setError("");
    setBusy("template");
    try {
      const res = await fetch(endpoint, { headers: await authHeaders() });
      if (!res.ok) {
        const teks = await res.text().catch(() => "");
        let pesan = `Server menjawab ${res.status}.`;
        try {
          pesan = JSON.parse(teks).error ?? pesan;
        } catch {
          // Jawaban bukan JSON; pesan status di atas sudah cukup.
        }
        throw new Error(pesan);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = templateName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Objek URL dilepas setelah unduhan dimulai agar memori tidak tertahan.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (err) {
      setError(`Gagal mengunduh template: ${err.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function kirim(berkas, dryRun) {
    const form = new FormData();
    form.append("file", berkas);

    // Content-Type sengaja tidak disetel: peramban harus menuliskannya
    // sendiri agar menyertakan batas (boundary) multipart.
    const { Authorization } = await authHeaders();

    return apiFetch(`${endpoint}${dryRun ? "?dryRun=1" : ""}`, {
      method: "POST",
      headers: { Authorization },
      body: form,
    });
  }

  async function handleFile(e) {
    const berkas = e.target.files?.[0];
    if (!berkas) return;

    setFile(berkas);
    setPreview(null);
    setResult(null);
    setError("");
    setBusy("periksa");
    try {
      setPreview(await kirim(berkas, true));
    } catch (err) {
      setError(err.message);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } finally {
      setBusy(null);
    }
  }

  async function handleImport() {
    if (!file) return;
    setError("");
    setBusy("impor");
    try {
      const body = await kirim(file, false);
      setResult(body);
      setPreview(null);
      onFinished?.(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  }

  const rows = result?.rows ?? preview?.rows ?? [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="lg"
      title={title}
      description={description}
      footer={
        result ? (
          <Button onClick={handleClose}>Selesai</Button>
        ) : (
          <>
            <Button variant="soft" onClick={handleClose}>
              Batal
            </Button>
            <Button
              onClick={handleImport}
              disabled={!preview || preview.siap === 0 || busy !== null}
            >
              {busy === "impor" && <Spinner />}
              {preview?.siap ? `Impor ${preview.siap} ${satuan}` : "Impor"}
            </Button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* --------------------------------------------------- 1. template */}
        <Card className="flex flex-wrap items-center gap-4 bg-surface-2">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
            <IconReport />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">1. Unduh template</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
              Berisi kolom yang benar beserta lembar petunjuk pengisian.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={unduhTemplate}
            disabled={busy !== null}
            className="max-sm:w-full"
          >
            {busy === "template" && <Spinner />}
            Unduh Template
          </Button>
        </Card>

        {/* ----------------------------------------------------- 2. berkas */}
        <div>
          <p className="font-semibold text-slate-900">2. Unggah berkas terisi</p>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">
            {limitNote}
          </p>

          <label
            className={cx(
              "mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition-colors",
              file
                ? "border-emerald-300 bg-emerald-50/60"
                : "border-slate-300 hover:border-brand hover:bg-surface-2"
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFile}
              disabled={busy !== null}
              className="sr-only"
            />
            {busy === "periksa" ? (
              <span className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <Spinner /> Memeriksa berkas...
              </span>
            ) : file ? (
              <>
                <span className="font-semibold break-all text-slate-800">{file.name}</span>
                <span className="mt-1 text-xs text-slate-500">
                  Ketuk untuk memilih berkas lain
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-slate-700">Pilih berkas Excel</span>
                <span className="mt-1 text-xs text-slate-500">atau seret berkas ke sini</span>
              </>
            )}
          </label>
        </div>

        {error && <Notice tone="red">{error}</Notice>}

        {/* ---------------------------------------------------- 3. ringkas */}
        {(preview || result) && (
          <div>
            <p className="font-semibold text-slate-900">
              {result ? "Hasil impor" : "3. Pratinjau"}
            </p>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <RingkasanSel label="Total baris" value={(result ?? preview).total} />
              <RingkasanSel
                label={result ? "Berhasil" : "Siap diimpor"}
                value={result ? result.dibuat : preview.siap}
                tone="emerald"
              />
              <RingkasanSel
                label="Bermasalah"
                value={result ? result.gagal : preview.gagal}
                tone={(result ? result.gagal : preview.gagal) > 0 ? "red" : "slate"}
              />
            </div>

            {result && (
              <Notice tone={result.gagal > 0 ? "amber" : "emerald"} className="mt-3">
                {result.gagal > 0 ? (
                  <>
                    <b>
                      {result.dibuat} {satuan} dibuat
                    </b>
                    , {result.gagal} baris dilewati. Perbaiki baris yang gagal di berkas Anda, lalu
                    impor ulang — data yang sudah masuk tidak akan terduplikasi.
                  </>
                ) : (
                  <>
                    <b>
                      Seluruh {result.dibuat} {satuan} berhasil dibuat.
                    </b>{" "}
                    {successNote}
                  </>
                )}
              </Notice>
            )}

            {!result && preview.siap === 0 && (
              <Notice tone="red" className="mt-3">
                Tidak ada baris yang dapat diimpor. Perbaiki catatan di bawah lalu unggah ulang.
              </Notice>
            )}

            <ul className="scroll-slim mt-3 max-h-72 space-y-2 overflow-y-auto">
              {rows.map((r) => (
                <li
                  key={r.baris}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2.5"
                >
                  <span
                    className={cx(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg",
                      r.status === "gagal"
                        ? "bg-red-50 text-red-600"
                        : "bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {r.status === "gagal" ? (
                      <IconClose className="size-3.5" />
                    ) : (
                      <IconCheck className="size-3.5" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {rowTitle(r) || <span className="text-slate-400">(tanpa nama)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      Baris {r.baris}
                      {rowMeta(r)}
                    </p>
                    {r.pesan && (
                      <p
                        className={cx(
                          "mt-0.5 text-xs",
                          r.status === "gagal" ? "text-red-600" : "text-slate-400"
                        )}
                      >
                        {r.pesan}
                      </p>
                    )}
                  </div>

                  <Badge tone={STATUS_TONE[r.status]} className="shrink-0">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}

function RingkasanSel({ label, value, tone = "slate" }) {
  const warna = {
    emerald: "text-emerald-700",
    red: "text-red-600",
    slate: "text-slate-900",
  };
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5 text-center">
      <p className={cx("text-2xl font-bold tabular-nums", warna[tone])}>{value}</p>
      <p className="mt-0.5 text-[11px] leading-tight font-semibold text-slate-500 uppercase">
        {label}
      </p>
    </div>
  );
}
