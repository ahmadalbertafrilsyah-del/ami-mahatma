"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useDocSnapshot } from "@/lib/hooks";
import { DEFAULT_RUBRICS } from "@/lib/constants";
import {
  Button,
  Card,
  Field,
  Input,
  LoadingScreen,
  Notice,
  PageHeader,
  Textarea,
  cx,
} from "@/components/ui";

/** Membuat id indikator berikutnya untuk sebuah area, misal "B5". */
function nextQuestionId(area) {
  const used = new Set((area.questions || []).map((q) => q.id));
  let n = (area.questions?.length ?? 0) + 1;
  while (used.has(`${area.id}${n}`)) n += 1;
  return `${area.id}${n}`;
}

function nextAreaId(areas) {
  const used = new Set(areas.map((a) => a.id));
  for (let i = 0; i < 26; i += 1) {
    const id = String.fromCharCode(65 + i);
    if (!used.has(id)) return id;
  }
  return `A${areas.length + 1}`;
}

/** Memindahkan satu elemen array satu langkah ke atas atau ke bawah. */
function move(list, index, delta) {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export default function InstrumenEditorPage() {
  const { id } = useParams();
  const { data: instrument, loading } = useDocSnapshot(`instruments/${id}`);

  if (loading) return <LoadingScreen label="Memuat instrumen..." />;
  if (!instrument) {
    return (
      <Notice tone="red">
        Instrumen tidak ditemukan.{" "}
        <Link href="/admin/instrumen" className="font-semibold underline">
          Kembali ke daftar
        </Link>
      </Notice>
    );
  }

  // `key` memastikan draf disemai ulang bila dokumen yang dibuka berganti.
  return <InstrumenEditor key={instrument.id} id={id} instrument={instrument} />;
}

function InstrumenEditor({ id, instrument }) {
  const [draft, setDraft] = useState(() => ({
    nama: instrument.nama ?? "",
    versi: instrument.versi ?? "1.0",
    deskripsi: instrument.deskripsi ?? "",
    rubrics: instrument.rubrics?.length ? instrument.rubrics : DEFAULT_RUBRICS,
    areas: instrument.areas ?? [],
  }));
  const [openAreas, setOpenAreas] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");

  const totalIndicators = draft.areas.reduce((s, a) => s + (a.questions?.length ?? 0), 0);
  const allOpen = draft.areas.length > 0 && openAreas.size === draft.areas.length;

  function toggleArea(index) {
    setOpenAreas((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function toggleAll() {
    setOpenAreas(allOpen ? new Set() : new Set(draft.areas.map((_, i) => i)));
  }

  const patchArea = (index, patch) =>
    setDraft((d) => ({
      ...d,
      areas: d.areas.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));

  const patchQuestion = (areaIndex, qIndex, patch) =>
    setDraft((d) => ({
      ...d,
      areas: d.areas.map((a, i) =>
        i === areaIndex
          ? { ...a, questions: a.questions.map((q, j) => (j === qIndex ? { ...q, ...patch } : q)) }
          : a
      ),
    }));

  const moveArea = (index, delta) => {
    setDraft((d) => ({ ...d, areas: move(d.areas, index, delta) }));
    // Urutan berubah, sehingga indeks yang terbuka tidak lagi menunjuk area yang sama.
    setOpenAreas(new Set());
  };

  const moveQuestion = (areaIndex, qIndex, delta) =>
    setDraft((d) => ({
      ...d,
      areas: d.areas.map((a, i) =>
        i === areaIndex ? { ...a, questions: move(a.questions ?? [], qIndex, delta) } : a
      ),
    }));

  function addArea() {
    setOpenAreas((prev) => new Set(prev).add(draft.areas.length));
    setDraft((d) => ({
      ...d,
      areas: [...d.areas, { id: nextAreaId(d.areas), title: "", questions: [] }],
    }));
  }

  const removeArea = (index) => {
    if (!confirm("Hapus area ini beserta seluruh indikatornya?")) return;
    setDraft((d) => ({ ...d, areas: d.areas.filter((_, i) => i !== index) }));
    setOpenAreas(new Set());
  };

  const addQuestion = (areaIndex) =>
    setDraft((d) => ({
      ...d,
      areas: d.areas.map((a, i) =>
        i === areaIndex
          ? {
              ...a,
              questions: [
                ...(a.questions || []),
                { id: nextQuestionId(a), text: "", criterion: "", recommendation: "" },
              ],
            }
          : a
      ),
    }));

  const removeQuestion = (areaIndex, qIndex) =>
    setDraft((d) => ({
      ...d,
      areas: d.areas.map((a, i) =>
        i === areaIndex ? { ...a, questions: a.questions.filter((_, j) => j !== qIndex) } : a
      ),
    }));

  function validate() {
    if (!draft.nama.trim()) return "Nama instrumen wajib diisi.";
    const ids = new Set();
    for (const area of draft.areas) {
      if (!area.id?.trim()) return "Setiap area harus punya kode.";
      if (!area.title?.trim()) return `Area ${area.id} belum punya judul.`;
      for (const q of area.questions || []) {
        if (!q.id?.trim()) return `Indikator pada area ${area.id} belum punya kode.`;
        if (ids.has(q.id)) return `Kode indikator ${q.id} terduplikasi.`;
        ids.add(q.id);
        if (!q.text?.trim()) return `Pernyataan indikator ${q.id} masih kosong.`;
      }
    }
    return null;
  }

  async function save() {
    const message = validate();
    if (message) {
      setError(message);
      setBanner("");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await updateDoc(doc(db, "instruments", id), { ...draft, updatedAt: serverTimestamp() });
      setBanner("Instrumen tersimpan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Sunting Instrumen"
        title={draft.nama || "Instrumen tanpa nama"}
        description="Susun area, indikator, kriteria, dan rekomendasi awal yang dipakai lembaga saat mengisi evaluasi diri."
        actions={
          <Link href="/admin/instrumen">
            <Button variant="soft">← Daftar instrumen</Button>
          </Link>
        }
      />

      {banner && (
        <Notice tone="emerald" className="mb-4">
          {banner}
        </Notice>
      )}
      {error && (
        <Notice tone="red" className="mb-4">
          {error}
        </Notice>
      )}

      <Notice tone="amber" className="mb-6">
        Menyunting instrumen yang sedang dipakai periode berjalan dapat membuat jawaban lama tidak
        lagi berpasangan dengan indikatornya. Untuk perubahan besar, salin instrumen lalu pakai
        salinannya pada periode berikutnya.
      </Notice>

      {/* ------------------------------------------------- identitas instrumen */}
      <Card className="p-0">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Identitas Instrumen</h2>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Field label="Nama instrumen" required>
            <Input
              value={draft.nama}
              onChange={(e) => setDraft({ ...draft, nama: e.target.value })}
              placeholder="Instrumen AMI Satuan Pendidikan"
            />
          </Field>
          <Field label="Versi">
            <Input
              value={draft.versi}
              onChange={(e) => setDraft({ ...draft, versi: e.target.value })}
              placeholder="1.0"
            />
          </Field>
          <Field label="Deskripsi" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={draft.deskripsi}
              onChange={(e) => setDraft({ ...draft, deskripsi: e.target.value })}
              placeholder="Ringkas kegunaan instrumen ini."
            />
          </Field>
        </div>
      </Card>

      {/* --------------------------------------------------------------- area */}
      <div className="mt-8 mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Area &amp; Indikator</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {draft.areas.length} area · {totalIndicators} indikator
          </p>
        </div>
        {draft.areas.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allOpen ? "Ciutkan semua" : "Bentangkan semua"}
          </Button>
        )}
      </div>

      {draft.areas.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <p className="font-semibold text-slate-700">Instrumen ini belum punya area</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Tambahkan area terlebih dahulu, lalu isi indikator di dalamnya.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {draft.areas.map((area, ai) => {
            const expanded = openAreas.has(ai);
            const count = area.questions?.length ?? 0;
            return (
              <Card key={ai} className="overflow-hidden p-0">
                {/* Kepala area: ringkasan yang selalu terlihat */}
                <div
                  className={cx(
                    "flex items-start gap-3 px-4 py-3.5 sm:px-5",
                    expanded && "border-b border-slate-200/80 bg-slate-50/70"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleArea(ai)}
                    aria-expanded={expanded}
                    className="flex min-w-0 flex-1 items-start gap-3 text-left"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-sm font-bold text-white">
                      {area.id || "?"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">
                        {area.title || (
                          <span className="font-normal text-slate-400 italic">Area tanpa judul</span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {count} indikator ·{" "}
                        {expanded ? "klik untuk menutup" : "klik untuk menyunting"}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={cx(
                        "mt-1 shrink-0 text-slate-400 transition-transform",
                        expanded && "rotate-180"
                      )}
                    >
                      ▾
                    </span>
                  </button>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <IconButton
                      label="Pindah area ke atas"
                      disabled={ai === 0}
                      onClick={() => moveArea(ai, -1)}
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      label="Pindah area ke bawah"
                      disabled={ai === draft.areas.length - 1}
                      onClick={() => moveArea(ai, 1)}
                    >
                      ↓
                    </IconButton>
                    <IconButton label="Hapus area" danger onClick={() => removeArea(ai)}>
                      ✕
                    </IconButton>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-5 px-4 py-5 sm:px-5">
                    <div className="grid gap-4 sm:grid-cols-[6rem_minmax(0,1fr)]">
                      <Field label="Kode">
                        <Input
                          value={area.id}
                          onChange={(e) => patchArea(ai, { id: e.target.value.toUpperCase() })}
                          className="text-center font-mono font-semibold"
                        />
                      </Field>
                      <Field label="Judul area" required>
                        <Input
                          value={area.title}
                          onChange={(e) => patchArea(ai, { title: e.target.value })}
                          placeholder="Misal: Pengelolaan Anggaran"
                        />
                      </Field>
                    </div>

                    {count === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                        Area ini belum punya indikator.
                      </p>
                    ) : (
                      <ol className="space-y-4">
                        {area.questions.map((q, qi) => (
                          <QuestionEditor
                            key={qi}
                            number={qi + 1}
                            question={q}
                            isFirst={qi === 0}
                            isLast={qi === count - 1}
                            onPatch={(patch) => patchQuestion(ai, qi, patch)}
                            onMove={(delta) => moveQuestion(ai, qi, delta)}
                            onRemove={() => removeQuestion(ai, qi)}
                          />
                        ))}
                      </ol>
                    )}

                    <Button
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => addQuestion(ai)}
                    >
                      + Tambah indikator di area {area.id || "ini"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Button variant="outline" className="mt-4 w-full border-dashed py-3" onClick={addArea}>
        + Tambah area baru
      </Button>

      {/* ------------------------------------------------------------- rubrik */}
      <Card className="mt-8 p-0">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Rubrik Penilaian</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Empat tingkat kinerja ini muncul pada setiap indikator saat lembaga mengisi evaluasi
            diri.
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {draft.rubrics.map((r, i) => (
            <div key={r.score} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-sm font-bold text-slate-50">
                  {r.score}
                </span>
                <Input
                  value={r.label}
                  aria-label={`Label skor ${r.score}`}
                  className="font-semibold"
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      rubrics: d.rubrics.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x
                      ),
                    }))
                  }
                />
              </div>
              <Textarea
                rows={2}
                value={r.desc}
                aria-label={`Keterangan skor ${r.score}`}
                className="mt-3"
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    rubrics: d.rubrics.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="print-static bottom-above-nav sticky z-[26] -mx-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-surface/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <p className="text-xs text-slate-500">
          {draft.areas.length} area · {totalIndicators} indikator
        </p>
        <Button onClick={save} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>
    </>
  );
}

function QuestionEditor({ number, question, isFirst, isLast, onPatch, onMove, onRemove }) {
  return (
    <li className="overflow-hidden rounded-xl border border-slate-200">
      <div className="flex items-center gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-2.5">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-200 text-xs font-bold text-slate-600 tabular-nums">
          {number}
        </span>
        <Input
          value={question.id}
          aria-label="Kode indikator"
          onChange={(e) => onPatch({ id: e.target.value.toUpperCase() })}
          className="w-24 py-1.5 text-center font-mono text-xs font-semibold"
        />
        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <IconButton label="Pindah ke atas" disabled={isFirst} onClick={() => onMove(-1)}>
            ↑
          </IconButton>
          <IconButton label="Pindah ke bawah" disabled={isLast} onClick={() => onMove(1)}>
            ↓
          </IconButton>
          <IconButton label="Hapus indikator" danger onClick={onRemove}>
            ✕
          </IconButton>
        </div>
      </div>

      <div className="space-y-4 bg-surface px-4 py-4">
        <Field label="Pernyataan indikator" required>
          <Textarea
            rows={2}
            value={question.text}
            onChange={(e) => onPatch({ text: e.target.value })}
            placeholder="Misal: Sekolah menyediakan mekanisme refleksi kinerja secara rutin."
          />
        </Field>
        <div className="grid gap-4 lg:grid-cols-2">
          <Field
            label="Kriteria"
            hint="Acuan kondisi yang seharusnya; ditampilkan sebagai rujukan saat menilai."
          >
            <Textarea
              rows={3}
              value={question.criterion ?? ""}
              onChange={(e) => onPatch({ criterion: e.target.value })}
            />
          </Field>
          <Field
            label="Rekomendasi awal"
            hint="Usulan perbaikan yang dipakai auditor ketika indikator ini menjadi temuan."
          >
            <Textarea
              rows={3}
              value={question.recommendation ?? ""}
              onChange={(e) => onPatch({ recommendation: e.target.value })}
            />
          </Field>
        </div>
      </div>
    </li>
  );
}

function IconButton({ label, children, danger, disabled, onClick }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "grid size-8 place-items-center rounded-lg text-sm transition",
        disabled
          ? "cursor-not-allowed text-slate-300"
          : danger
            ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      {children}
    </button>
  );
}
