"use client";

import { useState } from "react";
import Link from "next/link";

import { apiFetch } from "@/lib/api-client";
import { APP_NAME, APP_TAGLINE, JENJANG } from "@/lib/constants";
import { Button, Card, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggleButton } from "@/components/theme-provider";
import { IconCheck } from "@/components/icons";

const EMPTY_AKUN = { nama: "", email: "", password: "", ulangi: "", telepon: "", instansi: "" };

const EMPTY_LEMBAGA = {
  nama: "",
  jenjang: "",
  npsn: "",
  kota: "",
  alamat: "",
  kepalaNama: "",
  kepalaEmail: "",
  kepalaWhatsapp: "",
};

export default function DaftarAuditorPage() {
  const [akun, setAkun] = useState(EMPTY_AKUN);
  const [lembaga, setLembaga] = useState(EMPTY_LEMBAGA);
  const [isiLembaga, setIsiLembaga] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);

  function patchAkun(value) {
    setAkun((f) => ({ ...f, ...value }));
  }

  function patchLembaga(value) {
    setLembaga((f) => ({ ...f, ...value }));
  }

  function validate() {
    if (akun.nama.trim().length < 3) return "Nama lengkap wajib diisi, minimal 3 karakter.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(akun.email.trim())) return "Format email tidak valid.";
    if (akun.password.length < 8) return "Kata sandi minimal 8 karakter.";
    if (akun.password !== akun.ulangi) return "Ulangi kata sandi belum sama.";
    if (akun.telepon && akun.telepon.replace(/\D/g, "").length < 9)
      return "Nomor telepon belum lengkap.";
    if (isiLembaga && lembaga.nama.trim().length < 3)
      return "Nama lembaga minimal 3 karakter, atau lewati bagian lembaga.";
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
      const body = await apiFetch("/api/auditor/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: akun.nama,
          email: akun.email,
          password: akun.password,
          telepon: akun.telepon,
          instansi: akun.instansi,
          // Dikirim hanya bila bagian lembaga memang diisi.
          lembaga: isiLembaga ? lembaga : null,
        }),
      });

      setDone({
        email: akun.email.trim().toLowerCase(),
        lembaga: isiLembaga && body.institutionId ? lembaga.nama.trim() : null,
        warning: body.warning ?? null,
      });
      setAkun(EMPTY_AKUN);
      setLembaga(EMPTY_LEMBAGA);
      setIsiLembaga(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen-dvh">
      <header className="pt-safe sticky top-0 z-20 border-b border-slate-200/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <BrandLogo size={36} />
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-slate-900">
              {APP_NAME}
            </strong>
            <span className="block truncate text-xs text-slate-500">{APP_TAGLINE}</span>
          </span>
          <ThemeToggleButton />
          <Link href="/login">
            <Button variant="outline" size="sm">
              Masuk
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        {done ? (
          <Card className="mx-auto max-w-lg text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
              <IconCheck className="size-7" />
            </div>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Pendaftaran terkirim</h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
              Akun auditor untuk <b className="text-slate-700">{done.email}</b> sudah dibuat dan
              sedang menunggu persetujuan administrator. Anda akan dapat masuk ke dashboard begitu
              akun disetujui.
            </p>

            {done.lembaga && (
              <Notice tone="emerald" className="mt-5 text-left">
                Lembaga <b>{done.lembaga}</b> ikut terdaftar dan menunggu verifikasi administrator.
              </Notice>
            )}

            {done.warning && (
              <Notice tone="amber" className="mt-4 text-left">
                {done.warning}
              </Notice>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link href="/login" className="sm:w-44">
                <Button className="w-full">Ke halaman masuk</Button>
              </Link>
              <Link href="/" className="sm:w-44">
                <Button variant="soft" className="w-full">
                  Halaman depan
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase">
                Pendaftaran Auditor
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance text-slate-900 sm:text-4xl">
                Daftarkan diri sebagai auditor
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-pretty text-slate-500">
                Buat akun auditor Anda sendiri, dan bila perlu sekalian daftarkan lembaga yang akan
                diaudit. Akun baru aktif setelah disetujui administrator, sehingga data audit tetap
                terjaga.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-2 lg:items-start">
              {/* ------------------------------------------------------ akun */}
              <Card className="p-0">
                <div className="border-b border-slate-200/80 px-5 py-4">
                  <h2 className="font-semibold text-slate-900">1. Data akun auditor</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Dipakai untuk masuk ke dashboard auditor.
                  </p>
                </div>

                <div className="space-y-4 px-5 py-5">
                  <Field label="Nama lengkap" required>
                    <Input
                      value={akun.nama}
                      onChange={(e) => patchAkun({ nama: e.target.value })}
                      placeholder="Nama lengkap beserta gelar"
                      autoComplete="name"
                    />
                  </Field>
                  <Field label="Email" required hint="Dipakai sebagai nama pengguna saat masuk.">
                    <Input
                      type="email"
                      value={akun.email}
                      onChange={(e) => patchAkun({ email: e.target.value })}
                      placeholder="nama@instansi.sch.id"
                      autoComplete="email"
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Kata sandi" required hint="Minimal 8 karakter.">
                      <Input
                        type="password"
                        value={akun.password}
                        onChange={(e) => patchAkun({ password: e.target.value })}
                        autoComplete="new-password"
                      />
                    </Field>
                    <Field label="Ulangi kata sandi" required>
                      <Input
                        type="password"
                        value={akun.ulangi}
                        onChange={(e) => patchAkun({ ulangi: e.target.value })}
                        autoComplete="new-password"
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Telepon / WhatsApp">
                      <Input
                        type="tel"
                        inputMode="tel"
                        value={akun.telepon}
                        onChange={(e) => patchAkun({ telepon: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        autoComplete="tel"
                      />
                    </Field>
                    <Field label="Asal instansi">
                      <Input
                        value={akun.instansi}
                        onChange={(e) => patchAkun({ instansi: e.target.value })}
                        placeholder="Instansi tempat Anda bertugas"
                      />
                    </Field>
                  </div>
                </div>
              </Card>

              {/* --------------------------------------------------- lembaga */}
              <Card className="p-0">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-900">
                      2. Data lembaga{" "}
                      <span className="text-sm font-medium text-slate-400">(opsional)</span>
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">
                      Lewati bagian ini bila Anda hanya ingin membuat akun.
                    </p>
                  </div>
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isiLembaga}
                      onChange={(e) => setIsiLembaga(e.target.checked)}
                      className="size-4 accent-emerald-700"
                    />
                    Isi data lembaga
                  </label>
                </div>

                {isiLembaga ? (
                  <div className="space-y-4 px-5 py-5">
                    <Field label="Nama lembaga" required>
                      <Input
                        value={lembaga.nama}
                        onChange={(e) => patchLembaga({ nama: e.target.value })}
                        placeholder="Nama satuan pendidikan"
                      />
                    </Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Jenjang">
                        <Select
                          value={lembaga.jenjang}
                          onChange={(e) => patchLembaga({ jenjang: e.target.value })}
                        >
                          <option value="">Pilih jenjang</option>
                          {JENJANG.map((j) => (
                            <option key={j}>{j}</option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="NPSN">
                        <Input
                          value={lembaga.npsn}
                          onChange={(e) => patchLembaga({ npsn: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    </div>

                    <Field label="Kota / Kabupaten">
                      <Input
                        value={lembaga.kota}
                        onChange={(e) => patchLembaga({ kota: e.target.value })}
                      />
                    </Field>
                    <Field label="Alamat">
                      <Textarea
                        value={lembaga.alamat}
                        onChange={(e) => patchLembaga({ alamat: e.target.value })}
                        rows={2}
                      />
                    </Field>

                    <div className="border-t border-slate-200/80 pt-4">
                      <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Kontak kepala sekolah
                      </p>
                      <div className="space-y-4">
                        <Field label="Nama kepala sekolah">
                          <Input
                            value={lembaga.kepalaNama}
                            onChange={(e) => patchLembaga({ kepalaNama: e.target.value })}
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Email">
                            <Input
                              type="email"
                              value={lembaga.kepalaEmail}
                              onChange={(e) => patchLembaga({ kepalaEmail: e.target.value })}
                            />
                          </Field>
                          <Field label="WhatsApp">
                            <Input
                              type="tel"
                              inputMode="tel"
                              value={lembaga.kepalaWhatsapp}
                              onChange={(e) => patchLembaga({ kepalaWhatsapp: e.target.value })}
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="px-5 py-8 text-center">
                    <p className="text-sm leading-relaxed text-slate-500">
                      Bagian ini dilewati. Centang <b>Isi data lembaga</b> di atas bila Anda ingin
                      sekalian mendaftarkan sebuah satuan pendidikan.
                    </p>
                    <p className="mt-3 text-xs text-slate-400">
                      Kepala sekolah juga dapat mendaftarkan lembaganya sendiri lewat{" "}
                      <Link href="/" className="font-semibold text-emerald-700 hover:underline">
                        formulir di halaman depan
                      </Link>
                      .
                    </p>
                  </div>
                )}
              </Card>

              {/* ------------------------------------------------------ aksi */}
              <div className="lg:col-span-2">
                {error && <Notice tone="red">{error}</Notice>}

                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-md text-xs leading-relaxed text-slate-400">
                    Dengan mendaftar, Anda menyetujui bahwa data di atas diperiksa administrator
                    untuk keperluan audit mutu internal.
                  </p>
                  <Button type="submit" className="w-full py-3 sm:w-auto sm:px-8" disabled={busy}>
                    {busy && <Spinner />}
                    {busy ? "Mengirim..." : "Daftar sebagai Auditor"}
                  </Button>
                </div>

                <p className="mt-6 text-center text-sm text-slate-500 sm:text-left">
                  Sudah punya akun?{" "}
                  <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
                    Masuk di sini
                  </Link>
                  .
                </p>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
