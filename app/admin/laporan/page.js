"use client";

import { useState } from "react";
import Link from "next/link";
import { collection, orderBy, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { AUDIT_STATUS, AUDIT_STATUS_LABEL, AUDIT_STATUS_TONE } from "@/lib/constants";
import { computeScores, formatScore } from "@/lib/scoring";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Select,
  StatCard,
  Table,
  Td,
  Row,
} from "@/components/ui";

export default function LaporanPage() {
  const { data: periods } = useQuerySnapshot(
    () => query(collection(db, "periods"), orderBy("createdAt", "desc")),
    []
  );
  const [periodId, setPeriodId] = useState("");
  const activeId = periodId || periods.find((p) => p.status === "active")?.id || periods[0]?.id || "";
  const period = periods.find((p) => p.id === activeId);

  const { data: audits, loading } = useQuerySnapshot(
    () => query(collection(db, "audits"), where("periodId", "==", activeId)),
    [activeId],
    { enabled: Boolean(activeId) }
  );
  const { data: instruments } = useQuerySnapshot(() => query(collection(db, "instruments")), []);
  const instrument = instruments.find((i) => i.id === period?.instrumentId);

  const rows = audits
    .map((a) => {
      const scores = instrument ? computeScores(instrument, a) : null;
      return { ...a, overall: scores?.overall ?? null, areas: scores?.areas ?? [] };
    })
    .sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  const scored = rows.filter((r) => typeof r.overall === "number");
  const rata = scored.length
    ? scored.reduce((s, r) => s + r.overall, 0) / scored.length
    : null;
  const selesai = rows.filter((r) => r.status === AUDIT_STATUS.COMPLETED).length;

  return (
    <>
      <PageHeader
        eyebrow="Dokumentasi"
        title="Laporan AMI"
        description="Rekapitulasi skor mutu seluruh lembaga pada satu periode audit."
        actions={
          <Button variant="soft" className="no-print" onClick={() => window.print()}>
            Cetak / Simpan PDF
          </Button>
        }
      />

      <Card className="no-print mb-5">
        <Select value={activeId} onChange={(e) => setPeriodId(e.target.value)} className="sm:max-w-sm">
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama} {p.status === "active" ? "(berjalan)" : ""}
            </option>
          ))}
        </Select>
      </Card>

      {!activeId && <EmptyState title="Belum ada periode AMI" />}

      {activeId && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Dokumen audit" value={rows.length} foot={period?.nama} />
            <StatCard label="Audit selesai" value={selesai} tone="emerald" foot="Status selesai" />
            <StatCard
              label="Rata-rata skor"
              value={formatScore(rata)}
              tone={rata >= 3 ? "emerald" : rata >= 2 ? "amber" : "red"}
              foot="Skala 1–4"
            />
            <StatCard
              label="Lembaga dinilai"
              value={scored.length}
              foot={`dari ${rows.length} dokumen`}
            />
          </div>

          <Card className="p-0">
            <Table
              head={[
                "Lembaga",
                "Status",
                "Skor",
                ...(instrument?.areas ?? []).map((a) => a.id),
                "Disubmit",
                "",
              ]}
              empty={loading ? "Memuat..." : "Belum ada dokumen audit pada periode ini."}
            >
              {rows.length > 0
                ? rows.map((r) => (
                    <Row key={r.id}>
                      <Td>
                        <div className="font-bold text-slate-800">{r.institutionNama}</div>
                        <div className="text-xs text-slate-500">{r.institutionJenjang}</div>
                      </Td>
                      <Td>
                        <Badge tone={AUDIT_STATUS_TONE[r.status]}>
                          {AUDIT_STATUS_LABEL[r.status] ?? r.status}
                        </Badge>
                      </Td>
                      <Td className="font-black text-emerald-700">{formatScore(r.overall)}</Td>
                      {r.areas.map((a) => (
                        <Td key={a.id} className="text-center text-slate-600">
                          {formatScore(a.avg)}
                        </Td>
                      ))}
                      <Td className="text-slate-500">{formatDate(r.submittedAt)}</Td>
                      <Td className="no-print">
                        <Link href={`/admin/laporan/${r.id}`}>
                          <Button variant="ghost" size="sm">
                            Detail
                          </Button>
                        </Link>
                      </Td>
                    </Row>
                  ))
                : null}
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
