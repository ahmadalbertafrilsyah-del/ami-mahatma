"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferensi tampilan yang disimpan di localStorage.
 *
 * Dibaca lewat `useSyncExternalStore`, bukan lewat `useState` + `useEffect`.
 * Alasannya dua: localStorage adalah sumber data di luar React sehingga
 * membacanya di dalam efek memicu render bertingkat, dan cara ini membuat
 * seluruh komponen yang memakai kunci yang sama ikut tersegarkan serentak —
 * termasuk ketika nilainya berubah dari tab lain.
 *
 * Seluruh akses dibungkus try/catch karena localStorage melempar di mode
 * penyamaran dan ketika penyimpanan situs diblokir.
 */

const listeners = new Set();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange) {
  listeners.add(onChange);
  // Perubahan dari tab lain.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function readLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeLocal(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Nilai tetap berlaku untuk sesi ini meski tidak dapat disimpan.
  }
  emit();
}

/**
 * Nilai tersimpan untuk sebuah kunci. Di server selalu `null`, sehingga hasil
 * render awal cocok dan React menyegarkannya sendiri setelah hidrasi.
 */
export function useLocalValue(key) {
  const getSnapshot = useCallback(() => readLocal(key), [key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

/* ------------------------------------------------------- preferensi sistem */

const MEDIA_DARK = "(prefers-color-scheme: dark)";

function subscribeMedia(onChange) {
  const mq = window.matchMedia(MEDIA_DARK);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getMediaSnapshot() {
  return window.matchMedia(MEDIA_DARK).matches;
}

/** Apakah sistem operasi sedang memakai tema gelap. */
export function useSystemPrefersDark() {
  return useSyncExternalStore(subscribeMedia, getMediaSnapshot, () => false);
}
