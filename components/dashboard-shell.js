"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";
import { Button, cx } from "./ui";
import { BrandLogo } from "./brand-logo";
import { APP_NAME, APP_TAGLINE, ROLE_LABEL } from "@/lib/constants";
import { initials } from "@/lib/format";

export function DashboardShell({ nav, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const current =
    nav.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href))) ??
    nav[0];

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen lg:flex">
      {/* Latar gelap menu seluler (z-30), di bawah laci (z-40). */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={cx(
          "fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] transition-opacity duration-200 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col bg-slate-950 text-slate-300 transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0",
          open ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandLogo size={40} />
          <span className="min-w-0">
            <strong className="block truncate text-sm font-semibold text-white">{APP_NAME}</strong>
            <span className="block truncate text-xs text-slate-400">{APP_TAGLINE}</span>
          </span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Tutup menu"
          >
            ✕
          </button>
        </div>

        <nav className="scroll-slim flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map((item) => {
            const active = item.href === current?.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={cx(
                  "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" />
                )}
                <span aria-hidden="true" className="w-4 text-center text-base">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600/20 text-xs font-semibold text-emerald-300">
              {initials(profile?.nama || profile?.email || "?")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">
                {profile?.nama || "Pengguna"}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {ROLE_LABEL[profile?.role] ?? "-"}
              </span>
            </span>
          </div>
          <Button
            variant="ghost"
            className="mt-1 w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white"
            onClick={handleLogout}
          >
            <span aria-hidden="true">⎋</span> Keluar
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-static sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label="Buka menu"
            aria-expanded={open}
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-slate-400">{APP_NAME}</p>
            <h2 className="truncate text-sm font-semibold text-slate-900">{current?.label}</h2>
          </div>

          <span className="hidden shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20 ring-inset sm:inline-block">
            {ROLE_LABEL[profile?.role] ?? APP_NAME}
          </span>
        </header>

        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
