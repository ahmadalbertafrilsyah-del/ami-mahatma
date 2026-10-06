"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { ROLE_HOME } from "@/lib/constants";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      unsubProfile?.();
      unsubProfile = null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // Dipantau real time agar perubahan peran oleh Admin langsung berlaku.
      unsubProfile = onSnapshot(
        doc(db, "users", nextUser.uid),
        (snap) => {
          setProfile(snap.exists() ? { uid: snap.id, ...snap.data() } : null);
          setLoading(false);
        },
        () => {
          setProfile(null);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubProfile?.();
      unsubAuth();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      role: profile?.role ?? null,
      isActive: profile ? profile.active !== false : false,
      login: (email, password) => signInWithEmailAndPassword(auth, email.trim(), password),
      logout: () => signOut(auth),
      resetPassword: (email) => sendPasswordResetEmail(auth, email.trim()),
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam AuthProvider.");
  return ctx;
}

/**
 * Menjaga sebuah area dashboard. Mengembalikan status siap-render agar
 * halaman tidak sempat menampilkan data sebelum peran dipastikan.
 */
export function useRoleGuard(allowedRoles) {
  const { user, profile, loading, role, isActive } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!profile || !isActive) {
      router.replace("/akun-nonaktif");
      return;
    }
    if (!allowedRoles.includes(role)) {
      router.replace(ROLE_HOME[role] ?? "/login");
    }
  }, [loading, user, profile, isActive, role, allowedRoles, router]);

  return {
    ready: !loading && Boolean(user) && Boolean(profile) && isActive && allowedRoles.includes(role),
    loading,
    profile,
    user,
    role,
  };
}


/** Header Authorization untuk memanggil route handler. */
export async function authHeaders() {
  const current = auth.currentUser;
  if (!current) throw new Error("Sesi berakhir. Silakan masuk kembali.");
  const token = await current.getIdToken();
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}
