"use client";

import { Children, cloneElement, createContext, isValidElement, useContext, useEffect } from "react";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------------------------------------------------------- warna --- */

const TONE = {
  emerald: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const BAR_TONE = {
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
  red: "bg-red-500",
  blue: "bg-blue-500",
  slate: "bg-slate-400",
};

export function Badge({ tone = "slate", children, className }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-xs leading-4 font-semibold ring-1 ring-inset",
        TONE[tone] ?? TONE.slate,
        className
      )}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

/* ----------------------------------------------------------------- kartu --- */

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cx(
        "print-flat rounded-2xl border border-slate-200/80 bg-surface shadow-sm shadow-black/[0.04]",
        !className?.includes("p-") && "p-4 sm:p-5",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Judul di dalam kartu yang memakai padding 0 (biasanya kartu tabel). */
export function CardHeader({ title, description, actions, className }) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4",
        className
      )}
    >
      <div className="min-w-0">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- tombol --- */

const BUTTON_VARIANTS = {
  primary:
    "bg-brand text-white shadow-sm shadow-black/15 hover:bg-brand-strong active:bg-brand-stronger disabled:bg-brand/40 disabled:shadow-none",
  soft: "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 disabled:text-slate-400",
  outline:
    "border border-slate-300 bg-surface text-slate-700 hover:border-slate-400 hover:bg-slate-50 disabled:text-slate-400",
  danger:
    "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100 disabled:text-red-300",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:text-slate-300",
};

/*
  Tinggi minimum pada layar sempit mengikuti anjuran target sentuh (sekitar
  44px untuk tombol utama). Di layar lebar, tempat penunjuknya tetikus,
  tingginya dibiarkan mengikuti isi agar tata letak tidak longgar.
*/
const BUTTON_SIZES = {
  sm: "px-3 py-1.5 text-xs gap-1.5 max-sm:min-h-9 max-sm:px-3.5",
  md: "px-4 py-2.5 text-sm gap-2 max-sm:min-h-11",
};

export function Button({ variant = "primary", size = "md", className, type = "button", ...rest }) {
  return (
    <button
      type={type}
      className={cx(
        "app-chrome inline-flex items-center justify-center rounded-xl font-semibold whitespace-nowrap transition-[background-color,color,transform] select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:active:scale-100",
        BUTTON_SIZES[size] ?? BUTTON_SIZES.md,
        BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary,
        className
      )}
      {...rest}
    />
  );
}

/* ---------------------------------------------------------------- kolom isian --- */

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={cx("block min-w-0", className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600 uppercase">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1.5 block text-xs font-semibold text-red-600">{error}</span>}
    </label>
  );
}

const CONTROL =
  "w-full rounded-xl border border-slate-300 bg-surface px-3 py-2.5 text-sm text-slate-900 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 disabled:bg-slate-50 disabled:text-slate-500";

export function Input({ className, ...rest }) {
  return <input className={cx(CONTROL, className)} {...rest} />;
}

export function Select({ className, children, ...rest }) {
  return (
    <select className={cx(CONTROL, "appearance-none pr-9", className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, rows = 3, ...rest }) {
  return <textarea rows={rows} className={cx(CONTROL, "resize-y leading-relaxed", className)} {...rest} />;
}

/* ---------------------------------------------------------------- kepala halaman --- */

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-5 flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-bold tracking-[0.14em] text-emerald-700 uppercase sm:text-xs">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[1.6rem] leading-tight font-bold text-balance text-slate-900 sm:mt-1.5 sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-pretty text-slate-500">
            {description}
          </p>
        )}
      </div>
      {/*
        Di layar sempit tombol aksi dibagi rata selebar layar, seperti baris
        tombol pada aplikasi ponsel, alih-alih membungkus tidak beraturan
        begitu jumlahnya lebih dari satu.
      */}
      {actions && (
        <div className="flex shrink-0 gap-2 max-sm:[&>*]:flex-1 sm:flex-wrap lg:justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

/** Baris aksi yang menempel di bawah topbar. */
export function StickyToolbar({ children, className }) {
  return (
    <div
      className={cx(
        "print-static sticky-below-header z-10 -mx-4 mb-5 border-b border-slate-200/80 bg-surface/85 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- metrik --- */

const VALUE_TONE = {
  emerald: "text-emerald-700",
  amber: "text-amber-600",
  red: "text-red-600",
  blue: "text-blue-700",
  slate: "text-slate-900",
};

export function StatCard({ label, value, foot, tone = "slate", progress }) {
  return (
    <Card className="flex flex-col p-5">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={cx("mt-2 text-3xl font-bold tabular-nums", VALUE_TONE[tone] ?? VALUE_TONE.slate)}>
        {value}
      </p>
      {foot && <p className="mt-1 text-xs leading-snug text-slate-500">{foot}</p>}
      {typeof progress === "number" && <ProgressBar value={progress} className="mt-auto pt-3" />}
    </Card>
  );
}

export function ProgressBar({ value, className, tone = "emerald" }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={className}>
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={cx("h-full rounded-full transition-[width] duration-500", BAR_TONE[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- status --- */

export function EmptyState({ title, description, action, className }) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-dashed border-slate-300 bg-surface/60 px-6 py-14 text-center",
        className
      )}
    >
      <p className="font-semibold text-slate-800">{title}</p>
      {description && (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-pretty text-slate-500">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

const NOTICE_TONE = {
  blue: "border-blue-200 bg-blue-50 text-blue-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  red: "border-red-200 bg-red-50 text-red-800",
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function Notice({ tone = "blue", children, className }) {
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed text-pretty",
        NOTICE_TONE[tone] ?? NOTICE_TONE.blue,
        className
      )}
    >
      {children}
    </div>
  );
}

export function Spinner({ className }) {
  return (
    <span
      className={cx(
        "inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-hidden="true"
    />
  );
}

export function LoadingScreen({ label = "Memuat..." }) {
  return (
    <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3 text-slate-500">
      <Spinner className="size-6 text-emerald-600" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

/* ---------------------------------------------------------------- tab --- */

export function Tabs({ items, value, onChange, className }) {
  return (
    <div
      className={cx("scroll-slim -mx-1 flex gap-1 overflow-x-auto px-1 pb-1", className)}
      role="tablist"
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cx(
              "rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition",
              active
                ? "bg-brand text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cx(
                  "ml-2 rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  active ? "bg-white/20" : "bg-slate-200 text-slate-600"
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- tabel --- */

const TableContext = createContext([]);

/**
 * Tabel yang berubah menjadi daftar kartu di bawah breakpoint md, sehingga
 * tidak ada kolom yang terpotong atau tersembunyi di layar sempit. Setiap baris
 * dibungkus `<Row>` agar label kolom dapat disalin otomatis ke tiap sel.
 */
export function Table({ head, children, empty }) {
  const rows = Children.toArray(children).filter(Boolean);
  const isEmpty = rows.length === 0;

  return (
    <TableContext.Provider value={head}>
      <div className="scroll-slim w-full overflow-x-auto md:rounded-b-2xl">
        <table className="w-full border-collapse text-left text-sm max-md:block">
          <thead className="max-md:hidden">
            <tr className="border-b border-slate-200/80 bg-surface-2">
              {head.map((h, i) => (
                <th
                  key={`${h}-${i}`}
                  scope="col"
                  className="px-4 py-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="max-md:block max-md:space-y-3 max-md:p-3">
            {isEmpty ? (
              <tr className="max-md:block">
                <td
                  colSpan={head.length}
                  className="px-4 py-12 text-center text-sm text-slate-500 max-md:block"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    </TableContext.Provider>
  );
}

/**
 * Baris tabel. Menyalin judul kolom ke setiap sel sebagai `label`, yang dipakai
 * sebagai keterangan saat baris tampil berbentuk kartu di layar kecil.
 */
export function Row({ children, className, ...rest }) {
  const head = useContext(TableContext);
  const cells = Children.toArray(children);

  return (
    <tr
      className={cx(
        "transition-colors md:border-b md:border-slate-100 md:last:border-0 md:hover:bg-surface-2",
        "max-md:block max-md:rounded-xl max-md:border max-md:border-slate-200 max-md:bg-surface max-md:p-1",
        className
      )}
      {...rest}
    >
      {cells.map((cell, i) =>
        isValidElement(cell) && cell.props.label === undefined
          ? cloneElement(cell, { label: head[i] ?? "" })
          : cell
      )}
    </tr>
  );
}

export function Td({ className, children, label = "", ...rest }) {
  return (
    <td
      data-label={label}
      className={cx(
        "px-4 py-3 align-top",
        // Tampilan kartu: label kolom muncul di kiri, isi di kanan.
        "max-md:flex max-md:items-baseline max-md:justify-between max-md:gap-4 max-md:px-3 max-md:py-1.5",
        "max-md:before:shrink-0 max-md:before:text-[11px] max-md:before:font-bold max-md:before:tracking-wider max-md:before:text-slate-400 max-md:before:uppercase max-md:before:content-[attr(data-label)]",
        "max-md:first:border-b max-md:first:border-slate-100 max-md:first:pt-3 max-md:first:pb-3 max-md:last:pb-3",
        className
      )}
      {...rest}
    >
      <div className="min-w-0 max-md:text-right">{children}</div>
    </td>
  );
}

/* ---------------------------------------------------------------- dialog --- */

export function Modal({ open, onClose, title, description, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-[3px] sm:items-start sm:p-6 md:p-10"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Tutup dialog"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        tabIndex={-1}
      />
      <div
        className={cx(
          "animate-sheet-up relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl ring-1 ring-black/5 sm:max-h-[88dvh] sm:rounded-2xl",
          size === "lg" ? "sm:max-w-3xl" : size === "sm" ? "sm:max-w-sm" : "sm:max-w-xl"
        )}
      >
        {/* Pegangan geser: penanda khas lembar bawah pada aplikasi seluler. */}
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" />

        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-0.5 truncate text-sm text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="pb-safe flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-surface-2 px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
