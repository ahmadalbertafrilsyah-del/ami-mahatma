"use client";

import Link from "next/link";

import { useAuditorAudits } from "@/lib/use-auditor-audits";
import { AUDIT_STATUS, AUDIT_STATUS_LABEL, AUDIT_STATUS_TONE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  PageHeader,
  Row,
  StatCard,
  Table,
  Td,
} from "@/components/ui";

export default function AuditorDashboardPage() {
  const { audits, loading } = useAuditorAudits();

  if (loading) return <LoadingScreen />;

  const berjalan = audits.filter((a) => a.status === AUDIT_STATUS.DRAFT).length;
  const selesai = audits.filter((a) => a.status === AUDIT_STATUS.COMPLETED).length;

  // Yang belum selesai ditempatkan di urutan atas agar langsung terlihat.
  const antrian = [...audits].sort((a, b) => {
    const order = { [AUDIT_STATUS.DRAFT]: 0, [AUDIT_STATUS.COMPLETED]: 1 };
    return (order[a.status] ?? 9) - (order[b.status] ?? 9);
  });

  return (
    <>
      <PageHeader
        eyebrow="Audit Mutu Internal"
        title="Penugasan Saya"
        description="Lembaga yang menjadi tanggung jawab penilaian Anda pada siklus audit yang berjalan."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total penugasan" value={audits.length} foot="Seluruh periode" />
        <StatCard
          label="Sedang dikerjakan"
          value={berjalan}
          tone={berjalan ? "amber" : "slate"}
          foot="Ceklis belum ditandai selesai"
        />
        <StatCard label="Selesai" value={selesai} tone="emerald" foot="Laporan siap dicetak" />
      </div>

      {audits.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Belum ada penugasan"
          description="Administrator belum menugaskan Anda pada dokumen audit mana pun."
        />
      ) : (
        <Card className="mt-6 p-0">
          <Table
            head={["Lembaga", "Periode", "Status", "Kepala Sekolah", "Diperbarui", ""]}
            empty="Belum ada penugasan."
          >
            {antrian.map((a) => (
              <Row key={a.id}>
                <Td>
                  <div className="font-semibold text-slate-800">{a.institutionNama}</div>
                  <div className="text-xs text-slate-500">{a.institutionJenjang || "—"}</div>
                </Td>
                <Td className="text-slate-600">{a.periodNama}</Td>
                <Td>
                  <Badge tone={AUDIT_STATUS_TONE[a.status]}>
                    {AUDIT_STATUS_LABEL[a.status] ?? a.status}
                  </Badge>
                </Td>
                <Td className="text-slate-600">{a.kepalaNama || "-"}</Td>
                <Td className="text-slate-500">{formatDate(a.updatedAt, "-")}</Td>
                <Td>
                  <Link href={`/auditor/audit/${a.id}`}>
                    <Button variant={a.status === AUDIT_STATUS.DRAFT ? "primary" : "ghost"} size="sm">
                      {a.status === AUDIT_STATUS.DRAFT ? "Isi Ceklis" : "Buka"}
                    </Button>
                  </Link>
                </Td>
              </Row>
            ))}
          </Table>
        </Card>
      )}
    </>
  );
}
