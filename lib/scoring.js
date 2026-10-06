import { statusFromScore } from "./constants";

export function flattenQuestions(instrument) {
  if (!instrument?.areas) return [];
  return instrument.areas.flatMap((area) =>
    area.questions.map((q) => ({ ...q, areaId: area.id, areaTitle: area.title }))
  );
}

export function scoreOf(audit, qid) {
  const score = audit?.answers?.[qid]?.score;
  return typeof score === "number" ? score : null;
}

export function computeProgress(instrument, audit) {
  const questions = flattenQuestions(instrument);
  const total = questions.length;
  if (!total) return { total: 0, filled: 0, percent: 0 };
  const filled = questions.filter((q) => scoreOf(audit, q.id) !== null).length;
  return { total, filled, percent: Math.round((filled / total) * 100) };
}

/** Rekap skor per area dan keseluruhan berdasarkan penilaian auditor. */
export function computeScores(instrument, audit) {
  const areas = (instrument?.areas || []).map((area) => {
    const scores = area.questions.map((q) => scoreOf(audit, q.id)).filter((s) => s !== null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    return {
      id: area.id,
      title: area.title,
      total: area.questions.length,
      answered: scores.length,
      avg,
      status: avg === null ? null : statusFromScore(avg),
    };
  });

  const questions = flattenQuestions(instrument);
  const all = questions.map((q) => scoreOf(audit, q.id)).filter((s) => s !== null);
  const overall = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;

  return {
    areas,
    overall,
    answered: all.length,
    total: questions.length,
    status: overall === null ? null : statusFromScore(overall),
  };
}

/** Indikator berskor 1-2 menjadi kandidat temuan. */
export function candidateFindings(instrument, audit) {
  return flattenQuestions(instrument)
    .map((q) => ({ ...q, score: scoreOf(audit, q.id) }))
    .filter((q) => q.score !== null && q.score <= 2)
    .sort((a, b) => a.score - b.score);
}

export function priorityAreas(scores, limit = 3) {
  return [...scores.areas]
    .filter((a) => a.avg !== null)
    .sort((a, b) => a.avg - b.avg)
    .slice(0, limit);
}

export function formatScore(value) {
  return typeof value === "number" ? value.toFixed(2) : "-";
}
