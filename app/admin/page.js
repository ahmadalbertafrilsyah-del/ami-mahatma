"use client";

import Link from "next/link";
import { collection, orderBy, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import {
  AUDIT_STATUS,
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
  INSTITUTION_STATUS,
  PERIOD_STATUS_LABEL,
  ROLES,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  Row,
  StatCard,
  Table,
  Td,
} from "@/components/ui";

export default function AdminDashboardPage() {
  const { data: users } = useQuerySnapshot(() => query(collection(db, "users")), []);
  const { data: lembaga } = useQuerySnapshot(() => query(collection(db, "institutions")), []);
  const { data: periods } = useQuerySnapshot(
    () => query(collection(db, "periods"), orderBy("createdAt", "desc")),
    []
  );
  const activePeriod = periods.find((p) => p.status === "active") ?? null;

  const { data: audits } = useQuerySnapshot(
    () => query(collection(db, "audits"), where("periodId", "==", activePeriod?.id ?? "-")),
    [activePeriod?.id],
    { enabled: Boolean(activePeriod) }
  );

  const auditorCount = users.filter((u) => u.role === ROLES.AUDITOR && u.active !== false).length;
  const pending = lembaga.filter((m) => (m.status ?? "pending") === INSTITUTION_STATUS.PENDING);
  const verified = lembaga.filter((m) => m.status === INSTITUTION_STATUS.ACTIVE).length;
  const selesai = audits.filter((a) => a.status === AUDIT_STATUS.COMPLETED).length;
  const unassigned = audits.filter((a) => !(a.auditorUids?.length > 0)).length;

  return (
    <>
      <PageHeader
        eyebrow="Administrasi"
        title="Ringkasan Sistem"
        description="Pantau pendaftaran lembaga, kesiapan periode AMI, penugasan auditor, dan progres audit."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Menunggu verifikasi"
          value={pending.length}
          tone={pending.length ? "amber" : "slate"}
          foot="Pendaftaran dari formulir publik"
        />
        <StatCard label="Lembaga terverifikasi" value={verified} foot="Siap masuk siklus audit" />
        <StatCard label="Auditor aktif" value={auditorCount} foot="Akun berperan auditor" />
        <StatCard
          label="Audit selesai"
          value={selesai}
          tone="emerald"
          foot={
            activePeriod
              ? `dari ${audits.length} dokumen · ${activePeriod.nama}`
              : "Belum ada periode berjalan"
          }
        />
      </div>

      {pending.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-amber-900">
                {pending.length} pendaftaran lembaga menunggu verifikasi
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                Terbaru: {pending.slice(0, 3).map((m) => m.nama).join(", ")}
                {pending.length > 3 ? ", dan lainnya" : ""}
              </p>
            </div>
            <Link href="/admin/lembaga">
              <Button variant="outline">Periksa Pendaftaran</Button>
            </Link>
          </div>
        </Card>
      )}

      {!activePeriod && (
        <EmptyState
          className="mt-6"
          title="Belum ada periode AMI yang berjalan"
          description="Buat periode audit dan tetapkan statusnya menjadi Berjalan, lalu generate dokumen audit untuk lembaga terverifikasi."
          action={
            <Link href="/admin/periode">
              <Button>Kelola Periode</Button>
            </Link>
          }
        />
      )}

      {unassigned > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50/70">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-amber-900">
                {unassigned} dokumen audit belum punya auditor
              </p>
              <p className="mt-0.5 text-sm text-amber-800">
                Tanpa auditor, ceklis penilaian tidak dapat dikerjakan.
              </p>
            </div>
            <Link href="/admin/penugasan">
              <Button variant="outline">Atur Penugasan</Button>
            </Link>
          </div>
        </Card>
      )}

      <h2 className="mt-8 mb-3 font-semibold text-slate-900">Periode AMI</h2>
      <Card className="p-0">
        <Table head={["Periode", "Tahun", "Rentang", "Status", "Audit"]} empty="Belum ada periode.">
          {periods.length > 0
            ? periods.map((p) => (
                <Row key={p.id}>
                  <Td className="font-semibold text-slate-800">{p.nama}</Td>
                  <Td className="tabular-nums">{p.tahun ?? "-"}</Td>
                  <Td className="whitespace-nowrap text-slate-500">
                    {formatDate(p.mulai)} – {formatDate(p.selesai)}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        p.status === "active" ? "emerald" : p.status === "closed" ? "slate" : "blue"
                      }
                    >
                      {PERIOD_STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </Td>
                  <Td>{p.id === activePeriod?.id ? `${audits.length} dokumen` : "-"}</Td>
                </Row>
              ))
            : null}
        </Table>
      </Card>

      {activePeriod && (
        <>
          <h2 className="mt-8 mb-3 font-semibold text-slate-900">
            Status Audit Periode {activePeriod.nama}
          </h2>
          <Card className="p-0">
            <Table
              head={["Lembaga", "Status", "Auditor", "Diselesaikan"]}
              empty="Belum ada dokumen audit."
            >
              {audits.length > 0
                ? audits.map((a) => (
                    <Row key={a.id}>
                      <Td className="font-semibold text-slate-800">
                        {a.institutionNama ?? a.institutionId}
                      </Td>
                      <Td>
                        <Badge tone={AUDIT_STATUS_TONE[a.status]}>
                          {AUDIT_STATUS_LABEL[a.status] ?? a.status}
                        </Badge>
                      </Td>
                      <Td className="text-slate-600">
                        {a.auditorNama?.length ? a.auditorNama.join(", ") : "Belum ditugaskan"}
                      </Td>
                      <Td className="text-slate-500">{formatDate(a.completedAt, "-")}</Td>
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
