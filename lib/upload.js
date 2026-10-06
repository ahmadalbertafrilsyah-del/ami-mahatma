"use client";

import { auth } from "./firebase";

const MAX_BYTES = 10 * 1024 * 1024;

export const MAX_UPLOAD_LABEL = "10 MB";

/**
 * Unggah satu berkas bukti ke Cloudinary memakai signature dari route handler.
 * Mengembalikan metadata ringkas yang disimpan di Firestore.
 */
export async function uploadEvidence(file, { folder = "ami/bukti", onProgress } = {}) {
  if (file.size > MAX_BYTES) {
    throw new Error(`Ukuran berkas melebihi ${MAX_UPLOAD_LABEL}.`);
  }

  const user = auth.currentUser;
  if (!user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const token = await user.getIdToken();

  const signRes = await fetch("/api/cloudinary/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder }),
  });
  const signed = await signRes.json();
  if (!signRes.ok) throw new Error(signed.error || "Gagal menyiapkan unggahan.");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", signed.apiKey);
  form.append("timestamp", String(signed.timestamp));
  form.append("folder", signed.folder);
  form.append("signature", signed.signature);

  const result = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${signed.cloudName}/auto/upload`
    );
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body?.error?.message || "Unggahan ditolak Cloudinary."));
      } catch {
        reject(new Error("Respons Cloudinary tidak terbaca."));
      }
    };
    xhr.onerror = () => reject(new Error("Koneksi ke Cloudinary gagal."));
    xhr.send(form);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || "",
    bytes: result.bytes,
    name: file.name,
    uploadedAt: new Date().toISOString(),
    uploadedBy: user.uid,
  };
}

export async function deleteEvidence(publicId, resourceType = "image") {
  const user = auth.currentUser;
  if (!user) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const token = await user.getIdToken();

  const res = await fetch("/api/cloudinary/destroy", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ publicId, resourceType }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Gagal menghapus berkas.");
  }
}

export function isImage(file) {
  return file?.resourceType === "image";
}

export function formatBytes(bytes) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
