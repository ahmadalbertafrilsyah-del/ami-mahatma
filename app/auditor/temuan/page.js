"use client";

import Link from "next/link";
import { collection, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { useAuditorAudits } from "@/lib/use-auditor-audits";
import {
  FINDING_CATEGORY_LABEL,
  FINDING_CATEGORY_TONE,
  FINDING_STATUS,
  FINDING_STATUS_LABEL,
  FINDING_STATUS_TONE,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  Notice,
  PageHeader,
  Table,
  Td,
  Row,
} from "@/components/ui";

export default function AuditorTemuanPage() {
  const { audits, loading } = useAuditorAudits();

  if (loading) return <LoadingScreen />;

  if (!audits.length) {
    return (
      <>
        <PageHeader eyebrow="Tindak Lanjut" title="Temuan & RTL" />
        <EmptyState title="Belum ada penugasan" description="Anda belum ditugaskan pada dokumen audit." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Tindak Lanjut"
        title="Temuan & RTL"
        description="Pantau rencana tindak lanjut dari seluruh lembaga yang Anda audit."
      />
      <Notice tone="blue" className="mb-5">
        Penyuntingan dan penutupan temuan dilakukan dari halaman dokumen audit, tab <b>Temuan &amp; RTL</b>.
      </Notice>
      <div className="space-y-6">
        {audits.map((a) => (
          <AuditFindings key={a.id} audit={a} />
        ))}
      </div>
    </>
  );
}

function AuditFindings({ audit }) {
  const { data: findings, loading } = useQuerySnapshot(
    () => query(collection(db, "audits", audit.id, "findings"), orderBy("createdAt")),
    [audit.id]
  );

  const open = findings.filter((f) => f.status !== FINDING_STATUS.CLOSED).length;
  const perbaikan = findings.filter((f) => f.status === FINDING_STATUS.IN_PROGRESS).length;

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="font-bold text-slate-800">{audit.institutionNama}</h3>
          <p className="text-xs text-slate-500">Periode {audit.periodNama}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {perbaikan > 0 && <Badge tone="amber">{perbaikan} dalam perbaikan</Badge>}
          <Badge tone={open ? "red" : "emerald"}>{open} temuan terbuka</Badge>
          <Link href={`/auditor/audit/${audit.id}`}>
            <Button variant="ghost" size="sm">
              Buka dokumen
            </Button>
          </Link>
        </div>
      </div>

      <Table
        head={["Indikator", "Temuan", "Kategori", "Status", "Rencana Perbaikan", "Target"]}
        empty={loading ? "Memuat..." : "Belum ada temuan pada dokumen ini."}
      >
        {findings.length > 0
          ? findings.map((f) => (
              <Row key={f.id}>
                <Td className="font-bold text-slate-700">{f.indikatorId || "-"}</Td>
                <Td className="max-w-xs text-slate-700">{f.judul}</Td>
                <Td>
                  <Badge tone={FINDING_CATEGORY_TONE[f.kategori]}>
                    {FINDING_CATEGORY_LABEL[f.kategori] ?? f.kategori}
                  </Badge>
                </Td>
                <Td>
                  <Badge tone={FINDING_STATUS_TONE[f.status]}>
                    {FINDING_STATUS_LABEL[f.status] ?? f.status}
                  </Badge>
                </Td>
                <Td className="max-w-xs text-slate-600">{f.rtl?.rencana || "-"}</Td>
                <Td className="whitespace-nowrap text-slate-500">{formatDate(f.rtl?.target)}</Td>
              </Row>
            ))
          : null}
      </Table>
    </Card>
  );
}
