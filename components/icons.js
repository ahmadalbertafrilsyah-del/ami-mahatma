/**
 * Ikon garis tipis, satu gaya untuk seluruh aplikasi. Semuanya memakai
 * `currentColor` sehingga warnanya cukup diatur lewat kelas teks induknya,
 * dan ikut berubah sendiri saat tema berganti.
 */

const BASE = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
};

function make(paths) {
  const Icon = ({ className = "size-5" }) => (
    <svg {...BASE} className={className}>
      {paths}
    </svg>
  );
  return Icon;
}

export const IconGrid = make(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
  </>
);

export const IconUsers = make(
  <>
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20a6.2 6.2 0 0 1 12.4 0" />
    <path d="M16.2 5.1a3.4 3.4 0 0 1 0 6.3M17.6 14.5a6.2 6.2 0 0 1 3.6 5.5" />
  </>
);

export const IconBuilding = make(
  <>
    <path d="M3.5 21h17" />
    <path d="M5.5 21V5.2a1.2 1.2 0 0 1 .8-1.13l7-2.33a1.2 1.2 0 0 1 1.58 1.14V21" />
    <path d="M14.9 21V9.5h3a1.2 1.2 0 0 1 1.2 1.2V21" />
    <path d="M8.6 7.4h3M8.6 11h3M8.6 14.6h3" />
  </>
);

export const IconCalendar = make(
  <>
    <rect x="3" y="4.8" width="18" height="16.2" rx="2.2" />
    <path d="M3 9.8h18M8 2.6v4.2M16 2.6v4.2" />
    <path d="M7.6 14h2.2M14.2 14h2.2M7.6 17.6h2.2M14.2 17.6h2.2" />
  </>
);

export const IconClipboard = make(
  <>
    <path d="M9 3.6h6a1.4 1.4 0 0 1 1.4 1.4v.7H7.6V5A1.4 1.4 0 0 1 9 3.6Z" />
    <path d="M16.4 5.3h1.9A1.7 1.7 0 0 1 20 7v12.3a1.7 1.7 0 0 1-1.7 1.7H5.7A1.7 1.7 0 0 1 4 19.3V7a1.7 1.7 0 0 1 1.7-1.7h1.9" />
    <path d="M8.4 11.6h7.2M8.4 15.4h4.6" />
  </>
);

export const IconSwap = make(
  <>
    <path d="M4 8.2h12.4M13.2 4.8 16.8 8.2l-3.6 3.4" />
    <path d="M20 15.8H7.6M10.8 12.4 7.2 15.8l3.6 3.4" />
  </>
);

export const IconReport = make(
  <>
    <path d="M13.4 2.8H7A2 2 0 0 0 5 4.8v14.4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.4Z" />
    <path d="M13.4 2.8v4.4a1.2 1.2 0 0 0 1.2 1.2H19" />
    <path d="M8.8 13h6.4M8.8 16.6h4" />
  </>
);

export const IconFlag = make(
  <>
    <path d="M5.4 21.2V3.4" />
    <path d="M5.4 4.4c4.4-2 8.8 2 13.2 0v9.4c-4.4 2-8.8-2-13.2 0" />
  </>
);

export const IconChart = make(
  <>
    <path d="M3.6 20.4h16.8" />
    <path d="M7 20.4v-6.2M12 20.4V6.6M17 20.4v-9.4" />
  </>
);

export const IconMenu = make(<path d="M3.8 6.6h16.4M3.8 12h16.4M3.8 17.4h16.4" />);

export const IconClose = make(<path d="M6 6l12 12M18 6 6 18" />);

export const IconChevronLeft = make(<path d="M14.6 5.4 8 12l6.6 6.6" />);

export const IconChevronRight = make(<path d="M9.4 5.4 16 12l-6.6 6.6" />);

export const IconChevronDown = make(<path d="M5.4 9.4 12 16l6.6-6.6" />);

export const IconLogout = make(
  <>
    <path d="M14.4 3.6H18A2 2 0 0 1 20 5.6v12.8a2 2 0 0 1-2 2h-3.6" />
    <path d="M9.6 16.2 13.8 12 9.6 7.8M13.8 12H3.8" />
  </>
);

export const IconDots = make(
  <>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </>
);

export const IconCheck = make(<path d="M4.8 12.6 9.6 17.4 19.2 6.6" />);

export const IconUserPlus = make(
  <>
    <circle cx="10" cy="8" r="3.6" />
    <path d="M3.4 20.4a6.6 6.6 0 0 1 13.2 0" />
    <path d="M18.6 6.6v5.2M21.2 9.2H16" />
  </>
);

export const IconHome = make(
  <>
    <path d="M3.6 10.4 12 3.4l8.4 7" />
    <path d="M5.6 9v10.6a1 1 0 0 0 1 1h10.8a1 1 0 0 0 1-1V9" />
    <path d="M9.8 20.6v-5.8h4.4v5.8" />
  </>
);

/** Peta nama → komponen, dipakai oleh daftar navigasi di tiap layout. */
export const NAV_ICONS = {
  grid: IconGrid,
  users: IconUsers,
  building: IconBuilding,
  calendar: IconCalendar,
  clipboard: IconClipboard,
  swap: IconSwap,
  report: IconReport,
  flag: IconFlag,
  chart: IconChart,
  home: IconHome,
};
