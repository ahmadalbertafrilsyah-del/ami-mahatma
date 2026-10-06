"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Button, Card, Field, Input, LoadingScreen, Notice, Spinner } from "@/components/ui";

export default function SetupPage() {
  const [state, setState] = useState(null);
  const [form, setForm] = useState({ nama: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ configured: false, adminExists: false }));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal membuat administrator.");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <LoadingScreen label="Memeriksa status sistem..." />;

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <Card className="w-full max-w-md">
        <p className="text-xs font-extrabold tracking-[0.12em] text-emerald-700 uppercase">
          Inisialisasi
        </p>
        <h1 className="mt-1 text-2xl font-black text-slate-900">Administrator Pertama</h1>
        <p className="mt-1 text-sm text-slate-500">
          Halaman ini hanya aktif selama belum ada akun administrator di sistem.
        </p>

        {!state.configured && (
          <Notice tone="red" className="mt-5">
            {state.reason ||
              "Firebase Admin belum dikonfigurasi. Isi FIREBASE_SERVICE_ACCOUNT di .env.local, lalu jalankan ulang server pengembangan."}
          </Notice>
        )}

        {state.configured && state.adminExists && !done && (
          <Notice tone="amber" className="mt-5">
            Administrator sudah terdaftar. Silakan masuk melalui halaman login.
          </Notice>
        )}

        {done && (
          <Notice tone="emerald" className="mt-5">
            Administrator berhasil dibuat. Silakan masuk, lalu seed instrumen bawaan dari menu
            Instrumen.
          </Notice>
        )}

        {state.configured && !state.adminExists && !done && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <Field label="Nama lengkap" required>
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama administrator"
              />
            </Field>
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="admin@maarif.sch.id"
              />
            </Field>
            <Field label="Kata sandi" required hint="Minimal 8 karakter.">
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </Field>
            {error && <Notice tone="red">{error}</Notice>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Spinner />}
              {busy ? "Membuat..." : "Buat Administrator"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-5 block text-center text-sm font-bold text-emerald-700 hover:underline"
        >
          Ke halaman login
        </Link>
      </Card>
    </div>
  );
}
