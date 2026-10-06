"use client";

import { DashboardShell } from "@/components/dashboard-shell";
import { useRoleGuard } from "@/components/auth-provider";
import { LoadingScreen } from "@/components/ui";
import { ROLES } from "@/lib/constants";

const ALLOWED = [ROLES.AUDITOR];

const NAV = [
  { href: "/auditor", label: "Penugasan Saya", icon: "▦", exact: true },
  { href: "/auditor/temuan", label: "Temuan & RTL", icon: "⚑" },
  { href: "/auditor/rekap", label: "Rekap Skor", icon: "▤" },
];

export default function AuditorLayout({ children }) {
  const { ready } = useRoleGuard(ALLOWED);
  if (!ready) return <LoadingScreen />;
  return <DashboardShell nav={NAV}>{children}</DashboardShell>;
}
