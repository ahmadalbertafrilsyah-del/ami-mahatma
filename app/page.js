"use client";

import { useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { db, firebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/components/auth-provider";
import {
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  INSTITUTION_STATUS,
  JENJANG,
  ROLE_HOME,
} from "@/lib/constants";
import { Button, Card, Field, Input, Notice, Select, Spinner } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggleButton } from "@/components/theme-provider";
import { IconUserPlus } from "@/components/icons";

const EMPTY = { kepalaNama: "", kepalaEmail: "", kepalaWhatsapp: "", nama: "", jenjang: "" };

const LANGKAH = [
  ["1. Pendaftaran", "Pimpinan satuan pendidikan mendaftar lewat formulir di halaman ini."],
  ["2. Verifikasi", "Administrator memeriksa data lembaga dan menugaskan auditor."],
  ["3. Penilaian", "Auditor mengisi ceklis indikator beserta bukti pendukungnya."],
  ["4. Temuan & Tindak Lanjut", "Temuan ditetapkan, rencana perbaikan disusun dan dipantau."],
];

export default function BerandaPage() {
  const { user, role, loading } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  function patch(value) {
    setForm((f) => ({ ...f, ...value }));
  }

  function validate() {
    if (!form.kepalaNama.trim()) return "Nama kepala sekolah wajib diisi.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.kepalaEmail.trim())) return "Format email tidak valid.";
    if (form.kepalaWhatsapp.replace(/\D/g, "").length < 9) return "Nomor WhatsApp belum lengkap.";
    if (!form.nama.trim()) return "Nama sekolah wajib diisi.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const message = validate();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setBusy(true);
    try {
      await addDoc(collection(db, "institutions"), {
        nama: form.nama.trim(),
        jenjang: form.jenjang || "",
        kepalaNama: form.kepalaNama.trim(),
        kepalaEmail: form.kepalaEmail.trim().toLowerCase(),
        kepalaWhatsapp: form.kepalaWhatsapp.trim(),
        status: INSTITUTION_STATUS.PENDING,
        sumber: "publik",
        createdAt: serverTimestamp(),
      });
      setDone(true);
      setForm(EMPTY);
    } catch (err) {
      setError(
        err.code === "permission-denied"
          ? "Pendaftaran ditolak server. Pastikan aturan keamanan Firestore terbaru sudah diterapkan."
          : err.message
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen-dvh">
      <header className="pt-safe sticky top-0 z-20 border-b border-slate-200/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
          <BrandLogo size={36} />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-slate-900">
              {APP_NAME}
            </strong>
            <span className="block truncate text-xs text-slate-500">{APP_TAGLINE}</span>
          </span>
          <ThemeToggleButton />
          {!loading && user && role ? (
            <Link href={ROLE_HOME[role] ?? "/login"}>
              <Button size="sm">Buka Dashboard</Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Masuk sebagai Petugas
              </Button>
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(24rem,26rem)] lg:gap-14">
          <section>
            <p className="text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase">
              {APP_TAGLINE}
            </p>
            <h1 className="mt-3 text-4xl leading-[1.1] font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
              Audit mutu internal untuk setiap satuan pendidikan
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-pretty text-slate-600">
              {APP_DESCRIPTION}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {LANGKAH.map(([judul, isi]) => (
                <Card key={judul} className="bg-surface/70">
                  <p className="font-semibold text-slate-900">{judul}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{isi}</p>
                </Card>
              ))}
            </div>

            {/* Jalur kedua: auditor mendaftarkan akunnya sendiri. Terpisah dari
                formulir pendaftaran lembaga di sebelah kanan. */}
            <Card className="mt-6 flex flex-wrap items-center gap-4 border-emerald-200/70 bg-emerald-50/60">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
                <IconUserPlus />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-900">Anda seorang auditor?</p>
                <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                  Daftarkan akun Anda sendiri, sekaligus boleh mendaftarkan lembaga yang akan
                  diaudit.
                </p>
              </div>
              <Link href="/daftar-auditor" className="max-sm:w-full">
                <Button variant="outline" className="max-sm:w-full">
                  Daftar Auditor
                </Button>
              </Link>
            </Card>

            <p className="mt-8 text-sm text-slate-500">
              Sudah punya akun administrator atau auditor?{" "}
              <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
                Masuk di sini
              </Link>
              .
            </p>
          </section>

          {/* ------------------------------------------- formulir pendaftaran */}
          <section id="daftar" className="lg:sticky lg:top-24">
            <Card className="p-0">
              <div className="border-b border-slate-200/80 px-5 py-4">
                <h2 className="font-semibold text-slate-900">Daftarkan Lembaga</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Tidak perlu membuat akun. Data langsung masuk ke administrator untuk diverifikasi.
                </p>
              </div>

              {done ? (
                <div className="px-5 py-8 text-center">
                  <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-xl text-emerald-700">
                    ✓
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-900">Pendaftaran terkirim</h3>
                  <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-slate-500">
                    Administrator akan memverifikasi data lembaga Anda dan menugaskan auditor.
                    Informasi lanjutan dikirim melalui email atau WhatsApp yang Anda cantumkan.
                  </p>
                  <Button variant="soft" className="mt-5" onClick={() => setDone(false)}>
                    Daftarkan lembaga lain
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
                  {!firebaseConfigured && (
                    <Notice tone="red">
                      Konfigurasi Firebase belum lengkap, formulir belum dapat mengirim data.
                    </Notice>
                  )}

                  <Field label="Nama kepala sekolah" required>
                    <Input
                      value={form.kepalaNama}
                      onChange={(e) => patch({ kepalaNama: e.target.value })}
                      placeholder="Nama lengkap beserta gelar"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" required>
                    <Input
                      type="email"
                      value={form.kepalaEmail}
                      onChange={(e) => patch({ kepalaEmail: e.target.value })}
                      placeholder="nama@sekolah.sch.id"
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Nomor WhatsApp" required hint="Contoh: 081234567890">
                    <Input
                      type="tel"
                      inputMode="tel"
                      value={form.kepalaWhatsapp}
                      onChange={(e) => patch({ kepalaWhatsapp: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      autoComplete="tel"
                    />
                  </Field>
                  <Field label="Nama sekolah" required>
                    <Input
                      value={form.nama}
                      onChange={(e) => patch({ nama: e.target.value })}
                      placeholder="Nama satuan pendidikan"
                    />
                  </Field>
                  <Field label="Jenjang">
                    <Select
                      value={form.jenjang}
                      onChange={(e) => patch({ jenjang: e.target.value })}
                    >
                      <option value="">Pilih jenjang (opsional)</option>
                      {JENJANG.map((j) => (
                        <option key={j}>{j}</option>
                      ))}
                    </Select>
                  </Field>

                  {error && <Notice tone="red">{error}</Notice>}

                  <Button
                    type="submit"
                    className="w-full py-3"
                    disabled={busy || !firebaseConfigured}
                  >
                    {busy && <Spinner />}
                    {busy ? "Mengirim..." : "Kirim Pendaftaran"}
                  </Button>
                  <p className="text-center text-xs text-slate-400">
                    Data yang dikirim hanya dipakai untuk keperluan audit mutu internal.
                  </p>
                </form>
              )}
            </Card>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 py-8">
        <p className="text-center text-xs text-slate-400">
          {APP_NAME} · {APP_TAGLINE}
        </p>
      </footer>
    </div>
  );
}
