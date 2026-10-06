"use client";

import {
  AUDIT_STATUS_LABEL,
  AUDIT_STATUS_TONE,
  FINDING_CATEGORY_LABEL,
  FINDING_CATEGORY_TONE,
  FINDING_STATUS_LABEL,
  FINDING_STATUS_TONE,
} from "@/lib/constants";
import { computeScores, flattenQuestions, formatScore, priorityAreas } from "@/lib/scoring";
import { formatDate } from "@/lib/format";
import { Badge, Card, EmptyState, ProgressBar, Row, Table, Td } from "./ui";
import { EvidenceUploader } from "./evidence-uploader";

/** Laporan audit siap cetak. */
export function AuditReport({ audit, instrument, findings = [], showEvidence = true }) {
  if (!audit || !instrument) {
    return <EmptyState title="Data audit belum tersedia" />;
  }

  const scores = computeScores(instrument, audit);
  const questions = flattenQuestions(instrument);
  const priorities = priorityAreas(scores);

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-[0.14em] text-emerald-700 uppercase">
              Laporan Audit Mutu Internal
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {audit.institutionNama}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {audit.institutionJenjang ? `${audit.institutionJenjang} · ` : ""}
              Periode {audit.periodNama} · Instrumen {instrument.nama} v{instrument.versi}
            </p>
          </div>
          <Badge tone={AUDIT_STATUS_TONE[audit.status]}>
            {AUDIT_STATUS_LABEL[audit.status] ?? audit.status}
          </Badge>
        </div>

        <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Skor mutu</dt>
            <dd className="text-3xl font-bold text-emerald-700 tabular-nums">
              {formatScore(scores.overall)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Predikat</dt>
            <dd className="mt-1">
              {scores.status ? (
                <Badge tone={scores.status.tone}>{scores.status.label}</Badge>
              ) : (
                <span className="text-slate-400">Belum dinilai</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Indikator dinilai</dt>
            <dd className="mt-1 font-semibold text-slate-700 tabular-nums">
              {scores.answered} / {scores.total}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Auditor</dt>
            <dd className="mt-1 font-semibold text-slate-700">
              {audit.auditorNama?.length ? audit.auditorNama.join(", ") : "-"}
            </dd>
          </div>
        </dl>

        <dl className="mt-5 grid gap-5 border-t border-slate-200/80 pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Kepala sekolah</dt>
            <dd className="mt-1 text-slate-700">{audit.kepalaNama || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Kontak</dt>
            <dd className="mt-1 break-words text-slate-700">
              {audit.kepalaEmail || "-"}
              {audit.kepalaWhatsapp ? ` · ${audit.kepalaWhatsapp}` : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500 uppercase">Diselesaikan</dt>
            <dd className="mt-1 text-slate-700">{formatDate(audit.completedAt, "belum")}</dd>
          </div>
        </dl>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Profil Mutu per Area</h3>
          <div className="space-y-4">
            {scores.areas.map((area) => (
              <div key={area.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 font-medium text-slate-700">
                    <span className="mr-1.5 font-mono text-xs text-slate-400">{area.id}</span>
                    {area.title}
                  </span>
                  <Badge tone={area.status?.tone ?? "slate"}>{formatScore(area.avg)}</Badge>
                </div>
                <ProgressBar
                  value={area.avg ? (area.avg / 4) * 100 : 0}
                  tone={area.status?.tone === "red" ? "red" : area.status?.tone === "amber" ? "amber" : "emerald"}
                  className="mt-2"
                />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold text-slate-900">Prioritas Perbaikan</h3>
          {priorities.length === 0 ? (
            <p className="text-sm text-slate-500">Belum ada data skor.</p>
          ) : (
            <ol className="space-y-3">
              {priorities.map((area, i) => (
                <li key={area.id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {i + 1}. {area.title}
                  </p>
                  <p className="text-xs text-slate-500">Skor area {formatScore(area.avg)}</p>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <Card className="p-0">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Rekap Penilaian Indikator</h3>
        </div>
        <Table head={["Kode", "Indikator", "Skor", "Catatan Auditor"]} empty="Instrumen kosong.">
          {questions.length > 0
            ? questions.map((q) => {
                const answer = audit.answers?.[q.id];
                return (
                  <Row key={q.id}>
                    <Td className="font-mono text-xs font-semibold text-slate-600">{q.id}</Td>
                    <Td className="max-w-md text-slate-700">{q.text}</Td>
                    <Td className="font-bold text-emerald-700 tabular-nums">
                      {answer?.score ?? "-"}
                    </Td>
                    <Td className="max-w-sm text-slate-500">{answer?.catatan || "-"}</Td>
                  </Row>
                );
              })
            : null}
        </Table>
      </Card>

      <Card className="p-0">
        <div className="border-b border-slate-200/80 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Temuan &amp; Rencana Tindak Lanjut</h3>
        </div>
        {findings.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-500">
            Belum ada temuan yang ditetapkan auditor.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {findings.map((f, i) => (
              <article key={f.id} className="px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h4 className="min-w-60 flex-1 font-semibold text-pretty text-slate-900">
                    {i + 1}. {f.indikatorId ? `${f.indikatorId} — ` : ""}
                    {f.judul}
                  </h4>
                  <div className="flex shrink-0 gap-2">
                    <Badge tone={FINDING_CATEGORY_TONE[f.kategori]}>
                      {FINDING_CATEGORY_LABEL[f.kategori] ?? f.kategori}
                    </Badge>
                    <Badge tone={FINDING_STATUS_TONE[f.status]}>
                      {FINDING_STATUS_LABEL[f.status] ?? f.status}
                    </Badge>
                  </div>
                </div>
                <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
                  <Detail label="Kondisi" value={f.kondisi} />
                  <Detail label="Kriteria" value={f.kriteria} />
                  <Detail label="Akibat / risiko" value={f.akibat} />
                  <Detail label="Akar penyebab" value={f.akarPenyebab} />
                  <Detail label="Rekomendasi auditor" value={f.rekomendasi} />
                  <Detail label="Rencana perbaikan" value={f.rtl?.rencana} />
                  <Detail label="Penanggung jawab" value={f.rtl?.penanggungJawab} />
                  <Detail label="Target selesai" value={formatDate(f.rtl?.target, "-")} />
                  {f.verifikasiCatatan && (
                    <Detail label="Catatan penutupan" value={f.verifikasiCatatan} />
                  )}
                </dl>
                {showEvidence && f.rtl?.files?.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-1.5 text-xs font-bold text-slate-500 uppercase">
                      Bukti tindak lanjut
                    </p>
                    <EvidenceUploader files={f.rtl.files} onChange={() => {}} readOnly />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 leading-relaxed text-pretty text-slate-700">{value || "-"}</dd>
    </div>
  );
}
