"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/ui";
import { ROLES } from "@/lib/constants";

const ALLOWED = [ROLES.ADMIN];

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: "▦", exact: true },
  { href: "/admin/pengguna", label: "Pengguna", icon: "◍" },
  { href: "/admin/lembaga", label: "Lembaga", icon: "⌂" },
  { href: "/admin/periode", label: "Periode AMI", icon: "◷" },
  { href: "/admin/instrumen", label: "Instrumen", icon: "✎" },
  { href: "/admin/penugasan", label: "Penugasan Auditor", icon: "⇄" },
  { href: "/admin/laporan", label: "Laporan", icon: "▤" },
];

export default function AdminLayout({ children }) {
  const { ready } = useRoleGuard(ALLOWED);
  if (!ready) return <LoadingScreen />;
  return <DashboardShell nav={NAV}>{children}</DashboardShell>;
}
