"use client";

import Link from "next/link";
import { collection, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { useAuditorAudits } from "@/lib/use-auditor-audits";
import { AUDIT_STATUS_LABEL, AUDIT_STATUS_TONE } from "@/lib/constants";
import { computeScores, formatScore } from "@/lib/scoring";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingScreen,
  PageHeader,
  Table,
  Td,
  Row,
} from "@/components/ui";

export default function AuditorRekapPage() {
  const { audits, loading } = useAuditorAudits();
  const { data: instruments } = useQuerySnapshot(() => query(collection(db, "instruments")), []);

  if (loading) return <LoadingScreen />;

  if (!audits.length) {
    return (
      <>
        <PageHeader eyebrow="Analisis" title="Rekap Skor" />
        <EmptyState title="Belum ada penugasan" />
      </>
    );
  }

  const rows = audits.map((a) => {
    const instrument = instruments.find((i) => i.id === a.instrumentId);
    const scores = instrument ? computeScores(instrument, a) : null;
    return { ...a, overall: scores?.overall ?? null, areas: scores?.areas ?? [] };
  });

  const areaIds = rows[0]?.areas.map((x) => x.id) ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Analisis"
        title="Rekap Skor"
        description="Skor mutu seluruh lembaga yang Anda audit, beserta rinciannya per area."
        actions={
          <Button variant="soft" className="no-print" onClick={() => window.print()}>
            Cetak / Simpan PDF
          </Button>
        }
      />

      <Card className="p-0">
        <Table
          head={["Lembaga", "Periode", "Status", "Skor Mutu", ...areaIds, ""]}
          empty="Belum ada data."
        >
          {rows.map((r) => {
            return (
              <Row key={r.id}>
                <Td className="font-semibold text-slate-800">{r.institutionNama}</Td>
                <Td className="text-slate-600">{r.periodNama}</Td>
                <Td>
                  <Badge tone={AUDIT_STATUS_TONE[r.status]}>
                    {AUDIT_STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </Td>
                <Td className="font-bold text-emerald-700 tabular-nums">
                  {formatScore(r.overall)}
                </Td>
                {r.areas.map((a) => (
                  <Td key={a.id} className="text-center text-slate-600">
                    {formatScore(a.avg)}
                  </Td>
                ))}
                <Td className="no-print">
                  <Link href={`/auditor/audit/${r.id}`}>
                    <Button variant="ghost" size="sm">
                      Buka
                    </Button>
                  </Link>
                </Td>
              </Row>
            );
          })}
        </Table>
      </Card>
    </>
  );
}
