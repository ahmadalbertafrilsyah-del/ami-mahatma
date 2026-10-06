"use client";

import { useState } from "react";
import { collection, doc, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { AUDIT_STATUS_LABEL, AUDIT_STATUS_TONE, ROLES } from "@/lib/constants";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Modal,
  Notice,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Row,
} from "@/components/ui";

export default function PenugasanPage() {
  const { data: periods } = useQuerySnapshot(
    () => query(collection(db, "periods"), orderBy("createdAt", "desc")),
    []
  );
  const [periodId, setPeriodId] = useState("");
  const activeId = periodId || periods.find((p) => p.status === "active")?.id || periods[0]?.id || "";

  const { data: audits, loading } = useQuerySnapshot(
    () => query(collection(db, "audits"), where("periodId", "==", activeId)),
    [activeId],
    { enabled: Boolean(activeId) }
  );
  const { data: auditors } = useQuerySnapshot(
    () => query(collection(db, "users"), where("role", "==", ROLES.AUDITOR)),
    []
  );

  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");

  const activeAuditors = auditors.filter((a) => a.active !== false);

  function openAssign(audit) {
    setSelected(audit.auditorUids ?? []);
    setModal(audit);
  }

  function toggle(uid) {
    setSelected((prev) => (prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]));
  }

  async function save() {
    setBusy(true);
    try {
      // Nama auditor disalin ke dokumen audit agar daftar tidak perlu join per baris.
      const namaList = selected.map(
        (uid) => activeAuditors.find((a) => a.uid === uid)?.nama ?? "Auditor"
      );
      await updateDoc(doc(db, "audits", modal.id), {
        auditorUids: selected,
        auditorNama: namaList,
        updatedAt: serverTimestamp(),
      });
      setBanner(`Penugasan untuk ${modal.institutionNama} diperbarui.`);
      setModal(null);
    } finally {
      setBusy(false);
    }
  }

  const sorted = [...audits].sort((a, b) =>
    (a.institutionNama ?? "").localeCompare(b.institutionNama ?? "")
  );
  const perAuditor = activeAuditors.map((a) => ({
    ...a,
    jumlah: audits.filter((x) => (x.auditorUids ?? []).includes(a.uid)).length,
  }));

  return (
    <>
      <PageHeader
        eyebrow="Distribusi Tugas"
        title="Penugasan Auditor"
        description="Tetapkan auditor yang mengerjakan ceklis penilaian untuk tiap lembaga."
      />

      {banner && (
        <Notice tone="emerald" className="mb-4">
          {banner}
        </Notice>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-60 flex-1">
            <span className="mb-1.5 block text-xs font-bold tracking-wide text-slate-600 uppercase">
              Periode
            </span>
            <Select value={activeId} onChange={(e) => setPeriodId(e.target.value)}>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama} {p.status === "active" ? "(berjalan)" : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {perAuditor.map((a) => (
              <Badge key={a.uid} tone={a.jumlah ? "blue" : "slate"}>
                {a.nama}: {a.jumlah}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {!activeId && (
        <EmptyState title="Belum ada periode AMI" description="Buat periode terlebih dahulu." />
      )}

      {activeId && (
        <Card className="p-0">
          <Table
            head={["Lembaga", "Kepala Sekolah", "Status Audit", "Auditor Ditugaskan", "Aksi"]}
            empty={
              loading
                ? "Memuat..."
                : "Belum ada dokumen audit pada periode ini. Jalankan Generate Audit di menu Periode."
            }
          >
            {sorted.length > 0
              ? sorted.map((a) => (
                  <Row key={a.id}>
                    <Td>
                      <div className="font-bold text-slate-800">{a.institutionNama}</div>
                      <div className="text-xs text-slate-500">{a.institutionJenjang}</div>
                    </Td>
                    <Td className="text-slate-600">
                      {a.kepalaNama || <span className="text-slate-400">-</span>}
                    </Td>
                    <Td>
                      <Badge tone={AUDIT_STATUS_TONE[a.status]}>
                        {AUDIT_STATUS_LABEL[a.status] ?? a.status}
                      </Badge>
                    </Td>
                    <Td>
                      {a.auditorUids?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {(a.auditorNama ?? []).map((n) => (
                            <Badge key={n} tone="blue">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm font-semibold text-amber-600">Belum ditugaskan</span>
                      )}
                    </Td>
                    <Td>
                      <Button variant="ghost" size="sm" onClick={() => openAssign(a)}>
                        Atur
                      </Button>
                    </Td>
                  </Row>
                ))
              : null}
          </Table>
        </Card>
      )}

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title="Penugasan Auditor"
        description={modal?.institutionNama}
        footer={
          <>
            <Button variant="soft" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy && <Spinner />} Simpan
            </Button>
          </>
        }
      >
        {activeAuditors.length === 0 ? (
          <Notice tone="amber">
            Belum ada akun berperan auditor yang aktif. Tambahkan lebih dulu di menu Pengguna.
          </Notice>
        ) : (
          <ul className="space-y-2">
            {activeAuditors.map((a) => (
              <li key={a.uid}>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300">
                  <input
                    type="checkbox"
                    checked={selected.includes(a.uid)}
                    onChange={() => toggle(a.uid)}
                    className="size-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-bold text-slate-800">{a.nama}</span>
                    <span className="block text-xs text-slate-500">{a.email}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
  );
}
