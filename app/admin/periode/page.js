"use client";

import { useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { AUDIT_STATUS, INSTITUTION_STATUS, PERIOD_STATUS_LABEL } from "@/lib/constants";
import { formatDate, toDateInput } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Row,
} from "@/components/ui";

const EMPTY = {
  nama: "",
  tahun: new Date().getFullYear(),
  instrumentId: "",
  mulai: "",
  selesai: "",
  status: "draft",
  catatan: "",
};

export default function PeriodePage() {
  const { data: periods, loading } = useQuerySnapshot(
    () => query(collection(db, "periods"), orderBy("createdAt", "desc")),
    []
  );
  const { data: instruments } = useQuerySnapshot(() => query(collection(db, "instruments")), []);
  const { data: lembaga } = useQuerySnapshot(() => query(collection(db, "institutions"), orderBy("nama")), []);
  const { data: audits } = useQuerySnapshot(() => query(collection(db, "audits")), []);

  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");

  const auditCount = (periodId) => audits.filter((a) => a.periodId === periodId).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim() || !form.instrumentId) {
      setError("Nama periode dan instrumen wajib diisi.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const payload = {
        nama: form.nama.trim(),
        tahun: Number(form.tahun) || new Date().getFullYear(),
        instrumentId: form.instrumentId,
        mulai: form.mulai ? new Date(form.mulai) : null,
        selesai: form.selesai ? new Date(form.selesai) : null,
        status: form.status,
        catatan: form.catatan,
        updatedAt: serverTimestamp(),
      };

      if (payload.status === "active") await deactivateOthers(modal.data?.id);

      if (modal.mode === "create") {
        await addDoc(collection(db, "periods"), { ...payload, createdAt: serverTimestamp() });
      } else {
        await updateDoc(doc(db, "periods", modal.data.id), payload);
      }
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /** Hanya satu periode yang boleh berstatus berjalan agar dashboard tidak ambigu. */
  async function deactivateOthers(exceptId) {
    const snap = await getDocs(query(collection(db, "periods"), where("status", "==", "active")));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (d.id !== exceptId) batch.update(d.ref, { status: "closed", updatedAt: serverTimestamp() });
    });
    if (snap.size) await batch.commit();
  }

  /** Membuat dokumen audit kosong untuk setiap lembaga yang belum punya. */
  async function generateAudits(period) {
    const instrument = instruments.find((i) => i.id === period.instrumentId);
    if (!instrument) {
      setBanner("Instrumen periode ini tidak ditemukan.");
      return;
    }
    const existing = new Set(
      audits.filter((a) => a.periodId === period.id).map((a) => a.institutionId)
    );
    // Hanya lembaga terverifikasi yang masuk siklus audit.
    const terverifikasi = lembaga.filter((m) => m.status === INSTITUTION_STATUS.ACTIVE);
    const targets = terverifikasi.filter((m) => !existing.has(m.id));
    if (!targets.length) {
      setBanner(
        terverifikasi.length
          ? "Semua lembaga terverifikasi sudah memiliki dokumen audit pada periode ini."
          : "Belum ada lembaga berstatus Terverifikasi. Verifikasi pendaftaran di menu Lembaga terlebih dahulu."
      );
      return;
    }
    if (!confirm(`Buat ${targets.length} dokumen audit baru untuk periode ${period.nama}?`)) return;

    const batch = writeBatch(db);
    targets.forEach((m) => {
      batch.set(doc(collection(db, "audits")), {
        periodId: period.id,
        periodNama: period.nama,
        instrumentId: period.instrumentId,
        institutionId: m.id,
        institutionNama: m.nama,
        institutionJenjang: m.jenjang ?? "",
        kepalaNama: m.kepalaNama ?? "",
        kepalaEmail: m.kepalaEmail ?? "",
        kepalaWhatsapp: m.kepalaWhatsapp ?? "",
        status: AUDIT_STATUS.DRAFT,
        answers: {},
        auditorUids: [],
        auditorNama: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    setBanner(`${targets.length} dokumen audit dibuat.`);
  }

  async function remove(period) {
    if (auditCount(period.id) > 0) {
      alert("Periode ini sudah memiliki dokumen audit dan tidak dapat dihapus. Tutup periode saja.");
      return;
    }
    if (!confirm(`Hapus periode "${period.nama}"?`)) return;
    await deleteDoc(doc(db, "periods", period.id));
  }

  return (
    <>
      <PageHeader
        eyebrow="Siklus Audit"
        title="Periode AMI"
        description="Tentukan siklus audit, instrumen yang dipakai, dan rentang waktu pelaksanaannya."
        actions={
          <Button
            onClick={() => {
              setForm({ ...EMPTY, instrumentId: instruments[0]?.id ?? "" });
              setError("");
              setModal({ mode: "create" });
            }}
            disabled={!instruments.length}
          >
            + Tambah Periode
          </Button>
        }
      />

      {!instruments.length && (
        <Notice tone="amber" className="mb-4">
          Belum ada instrumen. Buka menu <b>Instrumen</b> dan seed instrumen bawaan terlebih dahulu.
        </Notice>
      )}
      {banner && (
        <Notice tone="emerald" className="mb-4">
          {banner}
        </Notice>
      )}

      <Card className="p-0">
        <Table
          head={["Periode", "Instrumen", "Rentang", "Status", "Dokumen Audit", "Aksi"]}
          empty={loading ? "Memuat..." : "Belum ada periode AMI."}
        >
          {periods.length > 0
            ? periods.map((p) => (
                <Row key={p.id}>
                  <Td>
                    <div className="font-bold text-slate-800">{p.nama}</div>
                    <div className="text-xs text-slate-500">Tahun {p.tahun}</div>
                  </Td>
                  <Td className="text-slate-600">
                    {instruments.find((i) => i.id === p.instrumentId)?.nama ?? "-"}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600">
                    {formatDate(p.mulai)} – {formatDate(p.selesai)}
                  </Td>
                  <Td>
                    <Badge
                      tone={p.status === "active" ? "emerald" : p.status === "closed" ? "slate" : "blue"}
                    >
                      {PERIOD_STATUS_LABEL[p.status] ?? p.status}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{auditCount(p.id)} dokumen</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({
                            ...EMPTY,
                            ...p,
                            mulai: toDateInput(p.mulai),
                            selesai: toDateInput(p.selesai),
                          });
                          setError("");
                          setModal({ mode: "edit", data: p });
                        }}
                      >
                        Ubah
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateAudits(p)}
                      >
                        Generate Audit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm" className="text-red-600 hover:bg-red-50"
                        onClick={() => remove(p)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </Td>
                </Row>
              ))
            : null}
        </Table>
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Tambah Periode AMI" : "Ubah Periode AMI"}
        description="Hanya satu periode yang dapat berstatus Berjalan pada satu waktu."
        footer={
          <>
            <Button variant="soft" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button form="period-form" type="submit" disabled={busy}>
              {busy && <Spinner />} Simpan
            </Button>
          </>
        }
      >
        <form id="period-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nama periode" required>
            <Input
              value={form.nama}
              onChange={(e) => setForm({ ...form, nama: e.target.value })}
              placeholder="Siklus AMI 2026"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tahun">
              <Input
                type="number"
                value={form.tahun}
                onChange={(e) => setForm({ ...form, tahun: e.target.value })}
              />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="draft">Draf</option>
                <option value="active">Berjalan</option>
                <option value="closed">Ditutup</option>
              </Select>
            </Field>
            <Field label="Mulai">
              <Input
                type="date"
                value={form.mulai}
                onChange={(e) => setForm({ ...form, mulai: e.target.value })}
              />
            </Field>
            <Field label="Selesai">
              <Input
                type="date"
                value={form.selesai}
                onChange={(e) => setForm({ ...form, selesai: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Instrumen" required>
            <Select
              value={form.instrumentId}
              onChange={(e) => setForm({ ...form, instrumentId: e.target.value })}
            >
              <option value="">Pilih instrumen</option>
              {instruments.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nama} (v{i.versi})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Catatan">
            <Input value={form.catatan} onChange={(e) => setForm({ ...form, catatan: e.target.value })} />
          </Field>
          {error && <Notice tone="red">{error}</Notice>}
        </form>
      </Modal>
    </>
  );
}
