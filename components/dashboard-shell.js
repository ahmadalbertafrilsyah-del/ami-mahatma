"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "./auth-provider";
import { cx } from "./ui";
import { BrandLogo } from "./brand-logo";
import { ThemeToggleButton } from "./theme-provider";
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDots,
  IconLogout,
  IconMenu,
  NAV_ICONS,
} from "./icons";
import { APP_NAME, APP_TAGLINE, ROLE_LABEL } from "@/lib/constants";
import { useLocalValue, writeLocal } from "@/lib/client-store";
import { initials } from "@/lib/format";

const COLLAPSE_KEY = "sim-ami-sidebar-collapsed";

/** Jumlah tombol navigasi bawah sebelum sisanya dirangkum ke tombol "Lainnya". */
const BOTTOM_SLOTS = 4;

function NavIcon({ name, className }) {
  const Icon = NAV_ICONS[name] ?? NAV_ICONS.grid;
  return <Icon className={className} />;
}

export function DashboardShell({ nav, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, logout } = useAuth();

  const [drawer, setDrawer] = useState(false); // laci seluler
  const [menu, setMenu] = useState(false); // menu akun di bilah atas
  const menuRef = useRef(null);

  // Pilihan lebar sidebar diingat antar kunjungan.
  const collapsed = useLocalValue(COLLAPSE_KEY) === "1";

  const current =
    nav.find((item) => (item.exact ? pathname === item.href : pathname.startsWith(item.href))) ??
    nav[0];

  function toggleCollapsed() {
    writeLocal(COLLAPSE_KEY, collapsed ? "0" : "1");
  }

  /** Dipanggil setiap tautan navigasi diklik: berpindah halaman menutup laci
   *  dan menu akun yang sedang terbuka. */
  function closeLayers() {
    setDrawer(false);
    setMenu(false);
  }

  // Esc menutup laci maupun menu akun.
  useEffect(() => {
    if (!drawer && !menu) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setDrawer(false);
      setMenu(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawer, menu]);

  // Laci menahan gulir halaman selama terbuka.
  useEffect(() => {
    if (!drawer) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawer]);

  // Klik di luar menutup menu akun.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenu(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menu]);

  // Berpindah halaman menutup lapisan yang sedang terbuka.
  useEffect(() => {
    setDrawer(false);
    setMenu(false);
  }, [pathname]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const bottomItems = nav.length > BOTTOM_SLOTS + 1 ? nav.slice(0, BOTTOM_SLOTS) : nav;
  const hasOverflow = bottomItems.length < nav.length;
  const overflowActive = hasOverflow && !bottomItems.some((item) => item.href === current?.href);

  /* --------------------------------------------------------------- sidebar */

  const sidebar = (
    <>
      <div className={cx("flex items-center gap-3 px-4 py-5", collapsed && "lg:justify-center lg:px-0")}>
        <BrandLogo size={38} />
        <span className={cx("min-w-0 flex-1", collapsed && "lg:hidden")}>
          <strong className="block truncate text-sm font-semibold text-white">{APP_NAME}</strong>
          <span className="block truncate text-xs text-white/55">{APP_TAGLINE}</span>
        </span>
        <button
          type="button"
          onClick={() => setDrawer(false)}
          className="-mr-1 rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Tutup menu"
        >
          <IconClose />
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
              title={collapsed ? item.label : undefined}
              className={cx(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "lg:justify-center lg:px-0",
                active ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
              )}
            >
              {active && (
                <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-emerald-400" />
              )}
              <NavIcon name={item.icon} className="size-5 shrink-0" />
              <span className={cx("truncate", collapsed && "lg:hidden")}>{item.label}</span>

              {/* Keterangan melayang menggantikan label yang disembunyikan. */}
              {collapsed && (
                <span className="pointer-events-none absolute left-full z-50 ml-2 hidden rounded-lg bg-shell-2 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg ring-1 ring-white/10 transition-opacity group-hover:opacity-100 lg:block">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div
          className={cx(
            "flex items-center gap-3 px-2 py-2",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
            {initials(profile?.nama || profile?.email || "?")}
          </span>
          <span className={cx("min-w-0 flex-1", collapsed && "lg:hidden")}>
            <span className="block truncate text-sm font-medium text-white">
              {profile?.nama || "Pengguna"}
            </span>
            <span className="block truncate text-xs text-white/55">
              {ROLE_LABEL[profile?.role] ?? "-"}
            </span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={cx(
            "mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white",
            collapsed && "lg:justify-center lg:px-0"
          )}
        >
          <IconLogout className="size-5 shrink-0" />
          <span className={cx(collapsed && "lg:hidden")}>Keluar</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen-dvh lg:flex">
      {/* Latar gelap laci seluler (z-30), di bawah laci (z-40). */}
      <div
        onClick={() => setDrawer(false)}
        aria-hidden="true"
        className={cx(
          "fixed inset-0 z-30 bg-black/50 backdrop-blur-[2px] transition-opacity duration-200 lg:hidden",
          drawer ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cx(
          "pt-safe fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col bg-shell transition-transform duration-200 ease-out",
          "lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:transition-[width] lg:duration-200",
          collapsed ? "lg:w-[4.75rem]" : "lg:w-[17rem]",
          drawer ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="print-static pt-safe sticky top-0 z-20 border-b border-slate-200/80 bg-surface/85 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawer(true)}
              className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 active:bg-slate-200 lg:hidden"
              aria-label="Buka menu"
              aria-expanded={drawer}
            >
              <IconMenu />
            </button>

            {/* Tombol ciutkan sidebar, hanya relevan pada layar lebar. */}
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200 lg:grid"
              aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
              aria-pressed={collapsed}
            >
              {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
            </button>

            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                {APP_NAME}
              </p>
              <h2 className="truncate text-sm font-semibold text-slate-900">{current?.label}</h2>
            </div>

            <ThemeToggleButton />

            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={menu}
                className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-100 active:bg-slate-200 sm:pl-2"
              >
                <span className="hidden text-right sm:block">
                  <span className="block max-w-[11rem] truncate text-xs font-semibold text-slate-900">
                    {profile?.nama || "Pengguna"}
                  </span>
                  <span className="block text-[11px] text-slate-500">
                    {ROLE_LABEL[profile?.role] ?? "-"}
                  </span>
                </span>
                <span className="grid size-9 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand ring-1 ring-brand/20">
                  {initials(profile?.nama || profile?.email || "?")}
                </span>
                <IconChevronDown className="hidden size-4 text-slate-400 sm:block" />
              </button>

              {menu && (
                <div
                  role="menu"
                  className="animate-fade-in absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-surface shadow-xl shadow-black/10"
                >
                  <div className="border-b border-slate-200 px-4 py-3">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {profile?.nama || "Pengguna"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{profile?.email}</p>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <IconLogout className="size-4" />
                    Keluar dari akun
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:pb-8">
          {children}
        </main>

        {/* ------------------------------------------- navigasi bawah seluler */}
        <nav
          className="print-static fixed inset-x-0 bottom-0 z-[25] border-t border-slate-200/80 bg-surface/90 backdrop-blur-md lg:hidden"
          aria-label="Navigasi utama"
        >
          <div className="mx-auto flex max-w-xl items-stretch justify-around px-1 pt-1">
            {bottomItems.map((item) => {
              const active = item.href === current?.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                    active ? "text-brand" : "text-slate-400 active:bg-slate-100"
                  )}
                >
                  <NavIcon name={item.icon} className={cx("size-6", active && "stroke-2")} />
                  <span className="w-full truncate text-center text-[10px] leading-tight font-semibold">
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {hasOverflow && (
              <button
                type="button"
                onClick={() => setDrawer(true)}
                className={cx(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-colors",
                  overflowActive ? "text-brand" : "text-slate-400 active:bg-slate-100"
                )}
              >
                <IconDots className="size-6" />
                <span className="w-full truncate text-center text-[10px] leading-tight font-semibold">
                  Lainnya
                </span>
              </button>
            )}
          </div>
          <div className="h-safe-bottom" />
        </nav>
      </div>
    </div>
  );
}
