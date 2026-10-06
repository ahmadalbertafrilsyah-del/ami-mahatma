"use client";

import { useMemo, useState } from "react";

import { DEFAULT_RUBRICS } from "@/lib/constants";
import { computeProgress } from "@/lib/scoring";
import {
  Badge,
  Button,
  Card,
  Notice,
  ProgressBar,
  Spinner,
  StickyToolbar,
  Textarea,
  cx,
} from "./ui";
import { EvidenceUploader } from "./evidence-uploader";

/**
 * Ceklis instrumen audit yang diisi auditor: skor per indikator, catatan
 * kondisi, dan bukti pendukung.
 */
export function AuditForm({ audit, instrument, readOnly = false, onSave, actions }) {
  const rubrics = instrument?.rubrics?.length ? instrument.rubrics : DEFAULT_RUBRICS;

  // Disemai sekali dari dokumen. Pemanggil memberi prop `key` berbasis id audit
  // agar state tersetel ulang ketika berpindah dokumen.
  const [draft, setDraft] = useState(() => audit?.answers ?? {});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const merged = useMemo(() => ({ ...audit, answers: draft }), [audit, draft]);
  const progress = computeProgress(instrument, merged);

  function patch(qid, value) {
    setDirty(true);
    setMessage(null);
    setDraft((d) => ({ ...d, [qid]: { ...(d[qid] ?? {}), ...value } }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await onSave(draft);
      setDirty(false);
      setMessage({ tone: "emerald", text: "Perubahan tersimpan." });
    } catch (err) {
      setMessage({ tone: "red", text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!instrument) {
    return <Notice tone="red">Instrumen untuk dokumen audit ini tidak ditemukan.</Notice>;
  }

  return (
    <div>
      <StickyToolbar>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <div className="min-w-45 flex-1">
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="font-semibold text-slate-600">Progres penilaian</span>
              <span className="font-semibold text-slate-900 tabular-nums">
                {progress.filled}/{progress.total}
                <span className="ml-1 font-normal text-slate-400">({progress.percent}%)</span>
              </span>
            </div>
            <ProgressBar value={progress.percent} className="mt-2" />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {dirty && !readOnly && (
              <span className="text-xs font-semibold text-amber-600">Belum tersimpan</span>
            )}
            {!readOnly && (
              <Button variant="soft" onClick={save} disabled={saving || !dirty}>
                {saving && <Spinner />}
                {dirty ? "Simpan Draf" : "Tersimpan"}
              </Button>
            )}
            {actions}
          </div>
        </div>

        {message && (
          <Notice tone={message.tone} className="mt-3">
            {message.text}
          </Notice>
        )}
      </StickyToolbar>

      <div className="space-y-6">
        {instrument.areas.map((area) => (
          <Card key={area.id} className="overflow-hidden p-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/70 px-4 py-3.5 sm:px-5">
              <h3 className="text-sm font-semibold text-balance text-slate-900">
                <span className="mr-2 inline-grid size-6 place-items-center rounded-lg bg-brand text-xs text-white">
                  {area.id}
                </span>
                {area.title}
              </h3>
              <Badge className="shrink-0">{area.questions.length} indikator</Badge>
            </div>

            <div className="divide-y divide-slate-100">
              {area.questions.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  rubrics={rubrics}
                  readOnly={readOnly}
                  value={draft[q.id] ?? {}}
                  onPatch={(value) => patch(q.id, value)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuestionRow({ question, rubrics, readOnly, value, onPatch }) {
  const selected = value.score ?? null;

  return (
    <section className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h4 className="min-w-60 flex-1 leading-relaxed font-semibold text-pretty text-slate-900">
          <span className="mr-2 font-mono text-xs text-slate-400">{question.id}</span>
          {question.text}
        </h4>
        {selected !== null && (
          <Badge tone={selected <= 2 ? (selected === 1 ? "red" : "amber") : "emerald"}>
            Skor {selected}
          </Badge>
        )}
      </div>

      {question.criterion && (
        <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm leading-relaxed text-pretty text-slate-600">
          <span className="font-semibold text-slate-700">Kriteria: </span>
          {question.criterion}
        </p>
      )}

      <p className="mt-4 mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">
        Tingkat kinerja
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {rubrics.map((r) => {
          const active = selected === r.score;
          return (
            <label
              key={r.score}
              className={cx(
                "flex gap-2.5 rounded-xl border p-3 transition",
                active
                  ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/15"
                  : "border-slate-200 bg-surface",
                readOnly ? "cursor-default opacity-85" : "cursor-pointer hover:border-emerald-400"
              )}
            >
              <input
                type="radio"
                name={question.id}
                value={r.score}
                checked={active}
                disabled={readOnly}
                onChange={() => onPatch({ score: r.score })}
                className="mt-0.5 size-4 shrink-0 accent-emerald-600"
              />
              <span className="min-w-0">
                <span
                  className={cx(
                    "block text-xs font-semibold",
                    active ? "text-emerald-900" : "text-slate-800"
                  )}
                >
                  {r.score}. {r.label}
                </span>
                <span className="mt-1 block text-xs leading-snug text-pretty text-slate-500">
                  {r.desc}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Catatan kondisi
          </p>
          <Textarea
            rows={3}
            value={value.catatan ?? ""}
            disabled={readOnly}
            placeholder="Fakta yang ditemukan, hasil wawancara, atau kecukupan bukti."
            onChange={(e) => onPatch({ catatan: e.target.value })}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
            Bukti pendukung
          </p>
          <EvidenceUploader
            files={value.files ?? []}
            onChange={(files) => onPatch({ files })}
            folder="ami/bukti"
            readOnly={readOnly}
          />
        </div>
      </div>
    </section>
  );
}
