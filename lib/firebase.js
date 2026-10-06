import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

/**
 * Tanpa konfigurasi nyata, getAuth() melempar saat modul dievaluasi sehingga
 * `next build` gagal pada tahap prerender. Nilai pengganti menjaga build tetap
 * berjalan; pemakaian sebenarnya di browser tetap memerlukan kredensial asli,
 * dan halaman login menampilkan peringatan lewat `firebaseConfigured`.
 */
const config = firebaseConfigured
  ? firebaseConfig
  : {
      apiKey: "missing-firebase-config",
      authDomain: "missing.firebaseapp.com",
      projectId: "missing-firebase-config",
      appId: "missing-firebase-config",
    };

if (!firebaseConfigured && typeof window !== "undefined") {
  console.error(
    "Konfigurasi Firebase belum lengkap. Salin .env.local.example menjadi .env.local dan isi variabel NEXT_PUBLIC_FIREBASE_*."
  );
}

const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
