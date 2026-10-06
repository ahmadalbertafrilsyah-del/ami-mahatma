"use client";

import { useRouter } from "next/navigation";

import { useAuth } from "@/components/auth-provider";
import { Button, Card } from "@/components/ui";

export default function AkunNonaktifPage() {
  const { profile, user, logout } = useAuth();
  const router = useRouter();

  const belumTerdaftar = Boolean(user) && !profile;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <Card className="max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-xl text-amber-600">
          !
        </div>
        <h1 className="mt-4 text-xl font-black text-slate-900">
          {belumTerdaftar ? "Profil belum terdaftar" : "Akun dinonaktifkan"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {belumTerdaftar
            ? "Akun Anda sudah ada di sistem autentikasi, tetapi belum memiliki profil dan peran. Hubungi administrator sistem untuk pendaftaran peran."
            : "Akses akun Anda sedang dinonaktifkan oleh administrator. Hubungi administrator sistem bila ini keliru."}
        </p>
        {user?.email && (
          <p className="mt-3 text-xs font-semibold text-slate-400">Masuk sebagai {user.email}</p>
        )}
        <Button variant="soft" className="mt-5 w-full" onClick={handleLogout}>
          Keluar
        </Button>
      </Card>
    </div>
  );
}
