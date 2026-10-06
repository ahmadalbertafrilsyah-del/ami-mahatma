"use client";

import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { db } from "./firebase";

const EMPTY_LIST = { data: [], loading: false, error: null };
const EMPTY_DOC = { data: null, loading: false, error: null };

/**
 * Berlangganan sebuah query Firestore.
 *
 * `build` dipanggil ulang hanya ketika `deps` berubah; isi `deps` harus berupa
 * nilai sederhana (id, string, angka) karena dipakai sebagai kunci langganan.
 */
export function useQuerySnapshot(build, deps = [], { enabled = true } = {}) {
  const key = JSON.stringify(deps);
  const [state, setState] = useState({ key: null, data: [], error: null });

  // Disimpan di ref agar fungsi build yang dibuat ulang tiap render tidak
  // memaksa langganan dibuat ulang.
  const buildRef = useRef(build);
  useEffect(() => {
    buildRef.current = build;
  });

  useEffect(() => {
    if (!enabled) return;
    const unsub = onSnapshot(
      buildRef.current(),
      (snap) => setState({ key, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null }),
      (error) => setState({ key, data: [], error })
    );
    return unsub;
  }, [enabled, key]);

  if (!enabled) return EMPTY_LIST;
  return { data: state.data, loading: state.key !== key, error: state.error };
}

/** Berlangganan satu dokumen, misal `audits/abc123`. */
export function useDocSnapshot(path, { enabled = true } = {}) {
  const key = Array.isArray(path) ? path.join("/") : path;
  const active = enabled && Boolean(key);
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    if (!active) return;
    const unsub = onSnapshot(
      doc(db, ...key.split("/")),
      (snap) => setState({ key, data: snap.exists() ? { id: snap.id, ...snap.data() } : null, error: null }),
      (error) => setState({ key, data: null, error })
    );
    return unsub;
  }, [active, key]);

  if (!active) return EMPTY_DOC;
  return { data: state.data, loading: state.key !== key, error: state.error };
}
