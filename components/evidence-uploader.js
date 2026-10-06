"use client";

import { useRef, useState } from "react";

import { Button, Notice, ProgressBar, Spinner, cx } from "./ui";
import { MAX_UPLOAD_LABEL, deleteEvidence, formatBytes, uploadEvidence } from "@/lib/upload";

/**
 * Daftar bukti untuk satu indikator atau satu temuan.
 * `files` adalah array metadata Cloudinary; `onChange` menerima array baru.
 */
export function EvidenceUploader({ files = [], onChange, folder = "ami/bukti", readOnly = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  async function handleFiles(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;

    setError("");
    setBusy(true);
    const uploaded = [];
    try {
      for (const file of picked) {
        setProgress(0);
        uploaded.push(await uploadEvidence(file, { folder, onProgress: setProgress }));
      }
      onChange([...files, ...uploaded]);
    } catch (err) {
      setError(err.message);
      // Berkas yang sempat terunggah tetap dicatat agar tidak jadi sampah tak terlacak.
      if (uploaded.length) onChange([...files, ...uploaded]);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }

  async function handleRemove(file) {
    setError("");
    const next = files.filter((f) => f.publicId !== file.publicId);
    onChange(next);
    try {
      await deleteEvidence(file.publicId, file.resourceType);
    } catch (err) {
      setError(`Berkas dilepas dari daftar, tetapi gagal dihapus di Cloudinary: ${err.message}`);
    }
  }

  return (
    <div>
      {files.length > 0 && (
        <ul className="mb-2 space-y-2">
          {files.map((file) => (
            <li
              key={file.publicId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-surface p-2"
            >
              {file.resourceType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={file.url}
                  alt={file.name}
                  className="size-10 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500 uppercase">
                  {(file.format || "file").slice(0, 4)}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-semibold text-emerald-700 hover:underline"
                >
                  {file.name}
                </a>
                <span className="text-xs text-slate-400">{formatBytes(file.bytes)}</span>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => handleRemove(file)}
                  className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  Hapus
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={handleFiles}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          />
          <Button
            variant="outline"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cx("w-full border-dashed", busy && "opacity-70")}
          >
            {busy ? <Spinner /> : "+"}
            {busy ? `Mengunggah... ${progress}%` : `Unggah bukti (maks ${MAX_UPLOAD_LABEL}/berkas)`}
          </Button>
          {busy && <ProgressBar value={progress} className="mt-2" />}
        </>
      )}

      {readOnly && files.length === 0 && (
        <p className="text-xs text-slate-400">Belum ada bukti yang dilampirkan.</p>
      )}

      {error && (
        <Notice tone="red" className="mt-2">
          {error}
        </Notice>
      )}
    </div>
  );
}
