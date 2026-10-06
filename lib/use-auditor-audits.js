"use client";

import { collection, query, where } from "firebase/firestore";

import { db } from "./firebase";
import { useQuerySnapshot } from "./hooks";
import { useAuth } from "@/components/auth-provider";

/** Dokumen audit yang ditugaskan kepada auditor yang sedang masuk. */
export function useAuditorAudits() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? null;

  const { data, loading, error } = useQuerySnapshot(
    () => query(collection(db, "audits"), where("auditorUids", "array-contains", uid)),
    [uid],
    { enabled: Boolean(uid) }
  );

  const audits = [...data].sort((a, b) =>
    (a.institutionNama ?? "").localeCompare(b.institutionNama ?? "")
  );

  return { audits, loading, error, uid };
}
