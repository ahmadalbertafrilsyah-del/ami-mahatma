"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { useLocalValue, useSystemPrefersDark, writeLocal } from "@/lib/client-store";
import { cx } from "./ui";

const STORAGE_KEY = "sim-ami-theme";
const MODES = ["light", "dark", "system"];

const ThemeContext = createContext(null);

/**
 * Skrip yang ditanam di <head> sebelum React menyalakan diri. Tanpa ini, tema
 * terang sempat terlihat sekejap sebelum tema gelap dipasang — kedipan yang
 * paling kentara saat aplikasi dibuka dari layar utama ponsel.
 *
 * Disimpan sebagai string karena harus berjalan secara sinkron, mendahului
 * hidrasi. `data-theme` hanya dipasang untuk pilihan eksplisit; mode "system"
 * sengaja membiarkan atribut kosong agar media query di globals.css bekerja.
 */
export const THEME_INIT_SCRIPT = `(function(){try{
var m=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});
if(m==="light"||m==="dark"){document.documentElement.setAttribute("data-theme",m);}
}catch(e){}})();`;

function applyMode(mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function ThemeProvider({ children }) {
  // Dibaca langsung dari penyimpanan, bukan disalin ke state: di server
  // hasilnya null sehingga render awal selalu "system" dan cocok dengan HTML
  // yang dikirim, lalu React menyegarkannya sendiri setelah hidrasi.
  const stored = useLocalValue(STORAGE_KEY);
  const systemDark = useSystemPrefersDark();

  const mode = MODES.includes(stored) ? stored : "system";

  const change = useCallback((next) => {
    if (!MODES.includes(next)) return;
    applyMode(next);
    writeLocal(STORAGE_KEY, next === "system" ? null : next);
  }, []);

  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  const value = useMemo(
    () => ({ mode, resolved, setMode: change, toggle: () => change(resolved === "dark" ? "light" : "dark") }),
    [mode, resolved, change]
  );

  // Warna bilah status peramban seluler mengikuti tema aktif.
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", resolved === "dark" ? "#0a0f16" : "#ffffff");
  }, [resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam ThemeProvider.");
  return ctx;
}

const SUN = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="size-4">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const MOON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
);

const AUTO = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-4">
    <rect x="2.5" y="4" width="19" height="13" rx="2" />
    <path d="M8 20h8" />
  </svg>
);

const OPTIONS = [
  { value: "light", label: "Terang", icon: SUN },
  { value: "dark", label: "Gelap", icon: MOON },
  { value: "system", label: "Ikut sistem", icon: AUTO },
];

/** Pemilih tema tiga posisi. */
export function ThemeSwitch({ className }) {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema tampilan"
      className={cx(
        "inline-flex items-center gap-0.5 rounded-xl border border-slate-200 bg-surface-2 p-0.5",
        className
      )}
    >
      {OPTIONS.map((opt) => {
        const active = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.label}
            onClick={() => setMode(opt.value)}
            className={cx(
              "grid size-8 place-items-center rounded-lg transition-colors",
              active
                ? "bg-surface text-brand shadow-sm ring-1 ring-slate-200"
                : "text-slate-400 hover:text-slate-700"
            )}
          >
            {opt.icon}
            <span className="sr-only">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Tombol tunggal terang/gelap, untuk bilah atas yang ruangnya sempit. */
export function ThemeToggleButton({ className }) {
  const { resolved, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === "dark" ? "Beralih ke tema terang" : "Beralih ke tema gelap"}
      className={cx(
        "grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200",
        className
      )}
    >
      {resolved === "dark" ? SUN : MOON}
    </button>
  );
}
