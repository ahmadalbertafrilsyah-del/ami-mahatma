"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/ui";
import { ROLES } from "@/lib/constants";

const ALLOWED = [ROLES.ADMIN];

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: "grid", exact: true },
  { href: "/admin/pengguna", label: "Pengguna", icon: "users" },
  { href: "/admin/lembaga", label: "Lembaga", icon: "building" },
  { href: "/admin/periode", label: "Periode AMI", icon: "calendar" },
  { href: "/admin/instrumen", label: "Instrumen", icon: "clipboard" },
  { href: "/admin/penugasan", label: "Penugasan Auditor", icon: "swap" },
  { href: "/admin/laporan", label: "Laporan", icon: "report" },
];

export default function AdminLayout({ children }) {
  const { ready } = useRoleGuard(ALLOWED);
  if (!ready) return <LoadingScreen />;
  return <DashboardShell nav={NAV}>{children}</DashboardShell>;
}
