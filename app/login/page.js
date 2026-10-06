"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button, Field, Input, Notice, Spinner } from "@/components/ui";
import { ThemeSwitch } from "@/components/theme-provider";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME, APP_TAGLINE, ROLE_HOME } from "@/lib/constants";
import { firebaseConfigured } from "@/lib/firebase";

const AUTH_ERRORS = {
  "auth/invalid-credential": "Email atau kata sandi salah.",
  "auth/invalid-email": "Format email tidak valid.",
  "auth/user-disabled": "Akun ini telah dinonaktifkan.",
  "auth/too-many-requests": "Terlalu banyak percobaan. Coba lagi beberapa saat.",
  "auth/network-request-failed": "Koneksi bermasalah. Periksa jaringan Anda.",
};

export default function LoginPage() {
  const router = useRouter();
  const { user, role, loading, isActive, login, resetPassword } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(isActive ? (ROLE_HOME[role] ?? "/akun-nonaktif") : "/akun-nonaktif");
  }, [loading, user, role, isActive, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.email.trim() || !form.password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    setBusy(true);
    try {
      await login(form.email, form.password);
      // Pengalihan ditangani efek di atas setelah profil peran termuat.
    } catch (err) {
      setError(AUTH_ERRORS[err.code] || "Gagal masuk. Periksa kembali kredensial Anda.");
      setBusy(false);
    }
  }

  async function handleReset() {
    setError("");
    setInfo("");
    if (!form.email.trim()) {
      setError("Isi email terlebih dahulu untuk menerima tautan atur ulang.");
      return;
    }
    try {
      await resetPassword(form.email);
      setInfo(`Tautan atur ulang kata sandi dikirim ke ${form.email.trim()}.`);
    } catch (err) {
      setError(AUTH_ERRORS[err.code] || "Gagal mengirim tautan atur ulang.");
    }
  }

  return (
    <div className="grid min-h-screen-dvh lg:grid-cols-[1.05fr_minmax(26rem,0.95fr)]">
      <div className="relative hidden flex-col justify-center overflow-hidden bg-shell p-12 text-white lg:flex xl:p-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(90rem_50rem_at_-10%_-10%,#065f46_0%,transparent_55%),radial-gradient(70rem_40rem_at_110%_110%,#0f766e_0%,transparent_50%)]" />
        <div className="pointer-events-none absolute -right-32 -bottom-44 size-[460px] rounded-full border border-white/10 bg-white/[0.03]" />
        <div className="relative">
          <BrandLogo size={56} rounded="rounded-2xl" className="mb-6" />
          <p className="text-xs font-extrabold tracking-[0.14em] text-emerald-400 uppercase">
            {APP_TAGLINE}
          </p>
          <h1 className="mt-3 text-4xl leading-[1.08] font-bold tracking-tight xl:text-5xl">
            {APP_NAME}
          </h1>
          <p className="mt-4 max-w-xl leading-relaxed text-white/70">
            Halaman masuk khusus petugas. Pimpinan satuan pendidikan tidak perlu akun — cukup
            mendaftar lewat formulir di halaman depan. Calon auditor dapat mendaftarkan akunnya
            sendiri dan menunggu persetujuan administrator.
          </p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-2">
            {[
              ["Auditor", "Mengisi ceklis penilaian, menetapkan temuan, dan memantau tindak lanjut."],
              ["Administrator", "Memverifikasi pendaftaran, menyusun instrumen, dan menugaskan auditor."],
            ].map(([title, desc]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-snug backdrop-blur-sm"
              >
                <b className="block font-semibold">{title}</b>
                <span className="text-white/65">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-safe pb-safe flex items-center justify-center bg-surface px-5 py-10 sm:px-12">
        <div className="w-full max-w-sm">
          <p className="text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase">
            Akses Petugas
          </p>
          <h2 className="mt-2 text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900 sm:text-3xl">
            Masuk ke {APP_NAME}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Gunakan akun administrator atau auditor yang telah didaftarkan.
          </p>

          {!firebaseConfigured && (
            <Notice tone="red" className="mt-5">
              Konfigurasi Firebase belum lengkap. Salin <code>.env.local.example</code> menjadi{" "}
              <code>.env.local</code>, isi variabel <b>NEXT_PUBLIC_FIREBASE_*</b>, lalu jalankan ulang
              server.
            </Notice>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Email">
              <Input
                type="email"
                autoComplete="email"
                placeholder="nama@instansi.sch.id"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Kata sandi">
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>

            {error && <Notice tone="red">{error}</Notice>}
            {info && <Notice tone="emerald">{info}</Notice>}

            <Button type="submit" className="w-full py-3" disabled={busy}>
              {busy && <Spinner />}
              {busy ? "Memproses..." : "Masuk ke Dashboard"}
            </Button>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleReset}
              className="font-bold text-emerald-700 hover:underline"
            >
              Lupa kata sandi?
            </button>
            <Link href="/" className="font-semibold text-slate-400 hover:text-slate-600">
              Halaman depan
            </Link>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <p className="text-sm text-slate-500">Belum punya akun auditor?</p>
            <Link href="/daftar-auditor" className="mt-2 block">
              <Button variant="outline" className="w-full">
                Daftar sebagai Auditor
              </Button>
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Akun auditor baru aktif setelah disetujui administrator.
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <ThemeSwitch />
          </div>
        </div>
      </div>
    </div>
  );
}
