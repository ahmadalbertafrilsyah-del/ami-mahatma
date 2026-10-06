"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useDocSnapshot, useQuerySnapshot } from "@/lib/hooks";
import { AuditReport } from "@/components/audit-report";
import { ReportActions } from "@/components/report-actions";
import { Button, LoadingScreen, Notice } from "@/components/ui";

export default function LaporanDetailPage() {
  const { id } = useParams();
  const { data: audit, loading } = useDocSnapshot(`audits/${id}`);
  const { data: instrument } = useDocSnapshot(`instruments/${audit?.instrumentId}`, {
    enabled: Boolean(audit?.instrumentId),
  });
  const { data: findings } = useQuerySnapshot(
    () => query(collection(db, "audits", id, "findings"), orderBy("createdAt")),
    [id],
    { enabled: Boolean(id) }
  );

  if (loading) return <LoadingScreen label="Memuat laporan..." />;
  if (!audit) {
    return (
      <Notice tone="red">
        Dokumen audit tidak ditemukan.{" "}
        <Link href="/admin/laporan" className="font-bold underline">
          Kembali
        </Link>
      </Notice>
    );
  }

  return (
    <>
      <div className="no-print mb-5">
        <Link href="/admin/laporan">
          <Button variant="soft">← Kembali ke rekap</Button>
        </Link>
      </div>
      <div className="space-y-6">
        <ReportActions audit={audit} />
        <AuditReport audit={audit} instrument={instrument} findings={findings} />
      </div>
    </>
  );
}
