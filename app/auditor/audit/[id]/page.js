"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useDocSnapshot, useQuerySnapshot } from "@/lib/hooks";
import { useAuth } from "@/components/auth-provider";
import {
  AUDIT_STATUS,
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
  FINDING_CATEGORY,
  FINDING_CATEGORY_LABEL,
  FINDING_CATEGORY_TONE,
  FINDING_STATUS,
  FINDING_STATUS_LABEL,
  FINDING_STATUS_TONE,
  categoryFromScore,
} from "@/lib/constants";
import { candidateFindings, computeProgress } from "@/lib/scoring";
import { toDateInput } from "@/lib/format";
import { AuditForm } from "@/components/audit-form";
import { AuditReport } from "@/components/audit-report";
import { ReportActions } from "@/components/report-actions";
import { EvidenceUploader } from "@/components/evidence-uploader";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  LoadingScreen,
  Modal,
  Notice,
  PageHeader,
  Select,
  Spinner,
  Tabs,
  Textarea,
  cx,
} from "@/components/ui";

const TABS = [
  ["ceklis", "Ceklis Penilaian"],
  ["temuan", "Temuan & RTL"],
  ["laporan", "Laporan"],
];

const EMPTY_FINDING = {
  indikatorId: "",
  areaId: "",
  judul: "",
  kategori: FINDING_CATEGORY.MINOR,
  kondisi: "",
  kriteria: "",
  akibat: "",
  rekomendasi: "",
};

export default function AuditorAuditPage() {
  const { id } = useParams();
  const { profile } = useAuth();

  const { data: audit, loading } = useDocSnapshot(`audits/${id}`);
  const { data: instrument } = useDocSnapshot(`instruments/${audit?.instrumentId}`, {
    enabled: Boolean(audit?.instrumentId),
  });
  const { data: findings } = useQuerySnapshot(
    () => query(collection(db, "audits", id, "findings"), orderBy("createdAt")),
    [id],
    { enabled: Boolean(id) }
  );

  const [tab, setTab] = useState("ceklis");
  const [findingModal, setFindingModal] = useState(null);
  const [findingForm, setFindingForm] = useState(EMPTY_FINDING);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  if (loading) return <LoadingScreen label="Memuat dokumen audit..." />;
  if (!audit) return <Notice tone="red">Dokumen audit tidak ditemukan.</Notice>;

  const assigned = (audit.auditorUids ?? []).includes(profile?.uid);
  if (!assigned) {
    return <Notice tone="red">Anda tidak ditugaskan pada dokumen audit ini.</Notice>;
  }

  const selesai = audit.status === AUDIT_STATUS.COMPLETED;
  const progress = instrument
    ? computeProgress(instrument, audit)
    : { percent: 0, filled: 0, total: 0 };
  const candidates = instrument ? candidateFindings(instrument, audit) : [];
  const coveredIds = new Set(findings.map((f) => f.indikatorId));

  async function saveAnswers(answers) {
    await updateDoc(doc(db, "audits", id), { answers, updatedAt: serverTimestamp() });
  }

  async function complete() {
    if (progress.filled < progress.total) {
      setMessage({
        tone: "red",
        text: `Masih ada ${progress.total - progress.filled} indikator yang belum dinilai.`,
      });
      return;
    }
    if (!confirm("Tandai audit ini selesai? Ceklis akan terkunci dan laporan siap dicetak.")) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "audits", id), {
        status: AUDIT_STATUS.COMPLETED,
        completedAt: serverTimestamp(),
        completedBy: profile.uid,
        updatedAt: serverTimestamp(),
      });
      setMessage({ tone: "emerald", text: "Audit ditandai selesai." });
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (!confirm("Buka kembali audit ini agar ceklis dapat disunting?")) return;
    await updateDoc(doc(db, "audits", id), {
      status: AUDIT_STATUS.DRAFT,
      updatedAt: serverTimestamp(),
    });
    setMessage({ tone: "emerald", text: "Audit dibuka kembali." });
  }

  function openFindingFromCandidate(candidate) {
    setFindingForm({
      indikatorId: candidate.id,
      areaId: candidate.areaId,
      judul: candidate.text,
      kategori: categoryFromScore(candidate.score),
      kondisi: audit.answers?.[candidate.id]?.catatan || "",
      kriteria: candidate.criterion ?? "",
      akibat: "",
      rekomendasi: candidate.recommendation ?? "",
    });
    setFindingModal({ mode: "create" });
  }

  function openFindingEdit(finding) {
    setFindingForm({
      indikatorId: finding.indikatorId ?? "",
      areaId: finding.areaId ?? "",
      judul: finding.judul ?? "",
      kategori: finding.kategori ?? FINDING_CATEGORY.MINOR,
      kondisi: finding.kondisi ?? "",
      kriteria: finding.kriteria ?? "",
      akibat: finding.akibat ?? "",
      rekomendasi: finding.rekomendasi ?? "",
    });
    setFindingModal({ mode: "edit", data: finding });
  }

  async function saveFinding(e) {
    e.preventDefault();
    if (!findingForm.judul.trim()) {
      setMessage({ tone: "red", text: "Judul temuan wajib diisi." });
      return;
    }
    setBusy(true);
    try {
      if (findingModal.mode === "create") {
        await addDoc(collection(db, "audits", id, "findings"), {
          ...findingForm,
          status: FINDING_STATUS.OPEN,
          akarPenyebab: "",
          rtl: null,
          createdBy: profile.uid,
          createdByNama: profile.nama,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "audits", id, "findings", findingModal.data.id), {
          ...findingForm,
          updatedAt: serverTimestamp(),
        });
      }
      setFindingModal(null);
      setMessage({ tone: "emerald", text: "Temuan tersimpan." });
    } finally {
      setBusy(false);
    }
  }

  async function removeFinding(finding) {
    if (!confirm(`Hapus temuan "${finding.judul}" beserta rencana tindak lanjutnya?`)) return;
    await deleteDoc(doc(db, "audits", id, "findings", finding.id));
  }

  return (
    <>
      <PageHeader
        eyebrow={`Periode ${audit.periodNama}`}
        title={audit.institutionNama}
        description="Nilai setiap indikator berdasarkan bukti dan wawancara, lalu tetapkan temuan beserta rencana tindak lanjutnya."
        actions={
          <Link href="/auditor">
            <Button variant="soft">← Daftar penugasan</Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Badge tone={AUDIT_STATUS_TONE[audit.status]}>
          {AUDIT_STATUS_LABEL[audit.status] ?? audit.status}
        </Badge>
        <span className="text-sm text-slate-500">
          {progress.filled}/{progress.total} indikator dinilai
        </span>
        {audit.kepalaNama && (
          <span className="text-sm text-slate-500">
            Kepala sekolah: {audit.kepalaNama}
            {audit.kepalaWhatsapp ? ` · ${audit.kepalaWhatsapp}` : ""}
          </span>
        )}
      </div>

      {message && (
        <Notice tone={message.tone} className="mb-4">
          {message.text}
        </Notice>
      )}

      <Tabs
        className="mb-5"
        value={tab}
        onChange={setTab}
        items={TABS.map(([value, label]) => ({
          value,
          label,
          count: value === "temuan" && findings.length ? findings.length : null,
        }))}
      />

      {tab === "ceklis" && (
        <AuditForm
          key={audit.id}
          audit={audit}
          instrument={instrument}
          readOnly={selesai}
          onSave={saveAnswers}
          actions={
            selesai ? (
              <Button variant="outline" onClick={reopen}>
                Buka Kembali
              </Button>
            ) : (
              <Button onClick={complete} disabled={busy}>
                {busy && <Spinner />} Tandai Selesai
              </Button>
            )
          }
        />
      )}

      {tab === "temuan" && (
        <div className="space-y-6">
          <Card className="p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900">Kandidat Temuan</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Indikator berskor 1–2 pada ceklis. Tetapkan sebagai temuan bila bukti memang tidak
                  memenuhi kriteria.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFindingForm(EMPTY_FINDING);
                  setFindingModal({ mode: "create" });
                }}
              >
                + Temuan manual
              </Button>
            </div>

            {candidates.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Tidak ada indikator berskor 1–2 pada penilaian saat ini.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {candidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="min-w-50 flex-1">
                      <p className="text-sm font-medium text-pretty text-slate-800">
                        <span className="mr-1.5 font-mono text-xs text-slate-400">{c.id}</span>
                        {c.text}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.areaTitle} · skor {c.score}
                      </p>
                    </div>
                    {coveredIds.has(c.id) ? (
                      <Badge tone="emerald">Sudah jadi temuan</Badge>
                    ) : (
                      <Button variant="soft" size="sm" onClick={() => openFindingFromCandidate(c)}>
                        Tetapkan sebagai temuan
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Temuan Ditetapkan</h3>
            {findings.length === 0 ? (
              <EmptyState
                title="Belum ada temuan"
                description="Tetapkan temuan dari daftar kandidat di atas atau buat temuan manual."
              />
            ) : (
              <div className="space-y-4">
                {findings.map((f, i) => (
                  <FindingCard
                    key={f.id}
                    finding={f}
                    index={i}
                    auditId={id}
                    actorUid={profile?.uid}
                    onEdit={() => openFindingEdit(f)}
                    onDelete={() => removeFinding(f)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "laporan" && (
        <div className="space-y-6">
          <ReportActions audit={audit} />
          <AuditReport audit={audit} instrument={instrument} findings={findings} />
        </div>
      )}

      <Modal
        open={Boolean(findingModal)}
        onClose={() => setFindingModal(null)}
        size="lg"
        title={findingModal?.mode === "create" ? "Tetapkan Temuan" : "Ubah Temuan"}
        description="Rumuskan kondisi, kriteria, akibat, dan rekomendasi secara spesifik."
        footer={
          <>
            <Button variant="soft" onClick={() => setFindingModal(null)}>
              Batal
            </Button>
            <Button form="finding-form" type="submit" disabled={busy}>
              {busy && <Spinner />} Simpan
            </Button>
          </>
        }
      >
        <form id="finding-form" onSubmit={saveFinding} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode indikator">
              <Input
                value={findingForm.indikatorId}
                onChange={(e) => setFindingForm({ ...findingForm, indikatorId: e.target.value })}
                placeholder="Misal: B3"
              />
            </Field>
            <Field label="Kategori">
              <Select
                value={findingForm.kategori}
                onChange={(e) => setFindingForm({ ...findingForm, kategori: e.target.value })}
              >
                {Object.values(FINDING_CATEGORY).map((c) => (
                  <option key={c} value={c}>
                    {FINDING_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Judul temuan" required>
            <Textarea
              rows={2}
              value={findingForm.judul}
              onChange={(e) => setFindingForm({ ...findingForm, judul: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kondisi (fakta yang ditemukan)">
              <Textarea
                value={findingForm.kondisi}
                onChange={(e) => setFindingForm({ ...findingForm, kondisi: e.target.value })}
              />
            </Field>
            <Field label="Kriteria (acuan yang seharusnya)">
              <Textarea
                value={findingForm.kriteria}
                onChange={(e) => setFindingForm({ ...findingForm, kriteria: e.target.value })}
              />
            </Field>
            <Field label="Akibat / risiko">
              <Textarea
                value={findingForm.akibat}
                onChange={(e) => setFindingForm({ ...findingForm, akibat: e.target.value })}
              />
            </Field>
            <Field label="Rekomendasi auditor">
              <Textarea
                value={findingForm.rekomendasi}
                onChange={(e) => setFindingForm({ ...findingForm, rekomendasi: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Satu temuan beserta rencana tindak lanjut yang dicatat auditor. */
function FindingCard({ finding, index, auditId, actorUid, onEdit, onDelete }) {
  const [form, setForm] = useState(() => ({
    akarPenyebab: finding.akarPenyebab ?? "",
    rencana: finding.rtl?.rencana ?? "",
    pencegahan: finding.rtl?.pencegahan ?? "",
    penanggungJawab: finding.rtl?.penanggungJawab ?? "",
    target: toDateInput(finding.rtl?.target),
    files: finding.rtl?.files ?? [],
    verifikasiCatatan: finding.verifikasiCatatan ?? "",
  }));
  const [open, setOpen] = useState(index === 0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  function patch(value) {
    setForm((f) => ({ ...f, ...value }));
    setMessage(null);
  }

  async function persist(nextStatus) {
    setSaving(true);
    try {
      await updateDoc(doc(db, "audits", auditId, "findings", finding.id), {
        akarPenyebab: form.akarPenyebab,
        rtl: {
          rencana: form.rencana,
          pencegahan: form.pencegahan,
          penanggungJawab: form.penanggungJawab,
          target: form.target ? new Date(form.target) : null,
          files: form.files,
          updatedBy: actorUid ?? null,
        },
        verifikasiCatatan: form.verifikasiCatatan,
        ...(nextStatus ? { status: nextStatus } : {}),
        ...(nextStatus === FINDING_STATUS.CLOSED
          ? { closedAt: serverTimestamp(), closedBy: actorUid ?? null }
          : {}),
        updatedAt: serverTimestamp(),
      });
      setMessage({ tone: "emerald", text: "Tindak lanjut tersimpan." });
    } catch (err) {
      setMessage({ tone: "red", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  const rtlTerisi = Boolean(form.rencana.trim());

  return (
    <Card className="overflow-hidden p-0">
      {/* Kepala kartu: selalu terlihat, cukup untuk memindai daftar temuan. */}
      <div className="flex items-start gap-3 bg-slate-50/70 px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-900 text-xs font-bold text-white tabular-nums">
            {index + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold text-pretty text-slate-900">
              {finding.indikatorId && (
                <span className="mr-1.5 font-mono text-xs text-slate-400">
                  {finding.indikatorId}
                </span>
              )}
              {finding.judul}
            </span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <Badge tone={FINDING_CATEGORY_TONE[finding.kategori]}>
                {FINDING_CATEGORY_LABEL[finding.kategori] ?? finding.kategori}
              </Badge>
              <Badge tone={FINDING_STATUS_TONE[finding.status]}>
                {FINDING_STATUS_LABEL[finding.status] ?? finding.status}
              </Badge>
              <span className="text-xs text-slate-500">
                {rtlTerisi ? "RTL sudah diisi" : "RTL belum diisi"}
                {form.target ? ` · target ${form.target}` : ""}
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className={cx(
              "mt-1 shrink-0 text-slate-400 transition-transform",
              open && "rotate-180"
            )}
          >
            ▾
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Ubah
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:bg-red-50"
            onClick={onDelete}
          >
            Hapus
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200/80">
          <section className="px-4 py-5 sm:px-5">
            <h5 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              Rincian Temuan
            </h5>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <Block label="Kondisi" value={finding.kondisi} />
              <Block label="Kriteria" value={finding.kriteria} />
              <Block label="Akibat / risiko" value={finding.akibat} />
              <Block label="Rekomendasi" value={finding.rekomendasi} />
            </div>
          </section>

          <section className="border-t border-slate-100 bg-white px-4 py-5 sm:px-5">
            <h5 className="mb-3 text-xs font-bold tracking-wider text-slate-500 uppercase">
              Rencana Tindak Lanjut
            </h5>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Akar penyebab" className="sm:col-span-2">
                <Textarea
                  value={form.akarPenyebab}
                  onChange={(e) => patch({ akarPenyebab: e.target.value })}
                  placeholder="Mengapa kondisi ini terjadi?"
                />
              </Field>
              <Field label="Rencana perbaikan">
                <Textarea
                  value={form.rencana}
                  onChange={(e) => patch({ rencana: e.target.value })}
                  placeholder="Tindakan koreksi yang disepakati bersama lembaga."
                />
              </Field>
              <Field label="Tindakan pencegahan">
                <Textarea
                  value={form.pencegahan}
                  onChange={(e) => patch({ pencegahan: e.target.value })}
                  placeholder="Agar temuan serupa tidak terulang."
                />
              </Field>
              <Field label="Penanggung jawab">
                <Input
                  value={form.penanggungJawab}
                  onChange={(e) => patch({ penanggungJawab: e.target.value })}
                  placeholder="Nama atau jabatan"
                />
              </Field>
              <Field label="Target selesai">
                <Input
                  type="date"
                  value={form.target}
                  onChange={(e) => patch({ target: e.target.value })}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">
                  Bukti tindak lanjut
                </p>
                <EvidenceUploader
                  files={form.files}
                  onChange={(files) => patch({ files })}
                  folder="ami/rtl"
                />
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
            {finding.status === FINDING_STATUS.CLOSED ? (
              <Notice tone="emerald">
                <b>Temuan ditutup.</b> {finding.verifikasiCatatan || "Tanpa catatan penutupan."}
              </Notice>
            ) : (
              <Field label="Catatan penutupan">
                <Input
                  value={form.verifikasiCatatan}
                  onChange={(e) => patch({ verifikasiCatatan: e.target.value })}
                  placeholder="Dasar penutupan temuan, misal bukti perbaikan sudah memadai."
                />
              </Field>
            )}

            {message && <Notice tone={message.tone}>{message.text}</Notice>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="soft" onClick={() => persist(null)} disabled={saving}>
                {saving && <Spinner />} Simpan
              </Button>
              {finding.status === FINDING_STATUS.OPEN && (
                <Button
                  variant="outline"
                  onClick={() => persist(FINDING_STATUS.IN_PROGRESS)}
                  disabled={saving}
                >
                  Tandai Dalam Perbaikan
                </Button>
              )}
              {finding.status === FINDING_STATUS.CLOSED ? (
                <Button
                  variant="outline"
                  onClick={() => persist(FINDING_STATUS.OPEN)}
                  disabled={saving}
                >
                  Buka Kembali
                </Button>
              ) : (
                <Button onClick={() => persist(FINDING_STATUS.CLOSED)} disabled={saving}>
                  Tutup Temuan
                </Button>
              )}
            </div>
          </section>
        </div>
      )}
    </Card>
  );
}

function Block({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
      <p className="mt-0.5 leading-relaxed text-pretty text-slate-700">{value || "-"}</p>
    </div>
  );
}
