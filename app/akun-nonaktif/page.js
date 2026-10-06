"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

import { useAuth } from "@/components/auth-provider";
import { Button, Card } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
import { APP_NAME } from "@/lib/constants";

export default function AkunNonaktifPage() {
  const { profile, user, logout } = useAuth();
  const router = useRouter();

  const belumTerdaftar = Boolean(user) && !profile;
  const menungguPersetujuan = Boolean(profile?.pendingApproval) && profile?.active === false;

  const judul = belumTerdaftar
    ? "Profil belum terdaftar"
    : menungguPersetujuan
      ? "Menunggu persetujuan administrator"
      : "Akun dinonaktifkan";

  const penjelasan = belumTerdaftar
    ? "Akun Anda sudah ada di sistem autentikasi, tetapi belum memiliki profil dan peran. Hubungi administrator sistem untuk pendaftaran peran."
    : menungguPersetujuan
      ? "Pendaftaran Anda sudah diterima. Administrator akan memeriksa data Anda terlebih dahulu; begitu disetujui, Anda langsung dapat masuk ke dashboard auditor dengan email dan kata sandi yang sama."
      : "Akses akun Anda sedang dinonaktifkan oleh administrator. Hubungi administrator sistem bila ini keliru.";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="grid min-h-screen-dvh place-items-center bg-canvas p-5">
      <Card className="w-full max-w-md text-center">
        <BrandLogo size={44} className="mx-auto" />

        <div
          className={`mx-auto mt-5 grid size-12 place-items-center rounded-2xl text-xl font-bold ${
            menungguPersetujuan ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-600"
          }`}
        >
          {menungguPersetujuan ? "⏳" : "!"}
        </div>

        <h1 className="mt-4 text-xl font-bold text-balance text-slate-900">{judul}</h1>
        <p className="mt-2 text-sm leading-relaxed text-pretty text-slate-500">{penjelasan}</p>

        {user?.email && (
          <p className="mt-3 text-xs font-semibold text-slate-400">Masuk sebagai {user.email}</p>
        )}

        <Button variant="soft" className="mt-6 w-full" onClick={handleLogout}>
          Keluar
        </Button>

        <Link
          href="/"
          className="mt-4 inline-block text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Kembali ke halaman depan {APP_NAME}
        </Link>
      </Card>
    </div>
  );
}
