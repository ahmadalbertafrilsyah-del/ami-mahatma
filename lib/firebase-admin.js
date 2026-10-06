import "server-only";

/**
 * Service account dibaca dari satu env var berisi JSON (hasil unduhan dari
 * Firebase Console > Project settings > Service accounts), atau dari tiga env
 * var terpisah bila lebih nyaman disimpan di panel hosting.
 */
function readServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const trimmed = raw.trim();
    const json = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    return JSON.parse(json);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKey) {
    // Private key di file .env biasanya memakai "\n" literal.
    return { projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, "\n") };
  }

  return null;
}

let cached = null;

/**
 * Mengembalikan { auth, db, FieldValue } atau melempar bila kredensial belum
 * diatur.
 *
 * `firebase-admin` sengaja dimuat lewat import dinamis, bukan import statis di
 * puncak berkas. Pustaka itu beserta turunannya (@google-cloud/firestore,
 * google-auth-library) menuntut Node 22 ke atas; bila berjalan di runtime yang
 * lebih tua, impornya gagal. Dengan import statis kegagalan itu terjadi saat
 * modul route dimuat — sebelum satu baris pun kode penanganan galat sempat
 * berjalan — sehingga hosting hanya menjawab HTTP 500 berbadan kosong yang
 * tidak menjelaskan apa pun. Dimuat di sini, kegagalan yang sama tertangkap
 * pembungkus `route()` dan sampai ke pemanggil sebagai pesan yang terbaca.
 */
export async function getAdmin() {
  if (cached) return cached;

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    throw new Error(
      "Firebase Admin belum dikonfigurasi. Isi FIREBASE_SERVICE_ACCOUNT (JSON atau base64) di .env.local, atau di Environment Variables pada panel hosting."
    );
  }

  let appModule;
  let authModule;
  let firestoreModule;
  try {
    [appModule, authModule, firestoreModule] = await Promise.all([
      import("firebase-admin/app"),
      import("firebase-admin/auth"),
      import("firebase-admin/firestore"),
    ]);
  } catch (err) {
    // Pesan aslinya disertakan apa adanya: kegagalan di tahap ini hampir
    // selalu soal resolusi modul di lingkungan hosting, dan rinciannya itulah
    // yang menunjuk ke berkas penyebabnya.
    throw new Error(
      `Pustaka firebase-admin gagal dimuat di server. ` +
        `Node.js ${process.version}. Galat asli: ${err.message}`
    );
  }

  const { cert, getApp, getApps, initializeApp } = appModule;
  const { getAuth } = authModule;
  const { getFirestore, FieldValue } = firestoreModule;

  const app = getApps().length ? getApp() : initializeApp({ credential: cert(serviceAccount) });

  const db = getFirestore(app);

  /*
    Firestore dipaksa memakai REST, bukan gRPC.

    Secara bawaan Admin SDK membuka kanal gRPC, dan pembentukan kanal itulah
    biaya terbesar pada pemanggilan pertama sebuah instance — jauh melampaui
    waktu tulisnya sendiri yang hanya puluhan milidetik. Pada hosting tanpa
    server, tiap permintaan berpeluang mendarat di instance yang baru dingin,
    sehingga biaya tersebut terbayar berulang kali.

    Dibungkus try/catch karena `settings()` menolak dipanggil dua kali pada
    instance Firestore yang sama; pada modul yang dimuat ulang saat
    pengembangan hal itu wajar terjadi dan bukan kesalahan.
  */
  try {
    db.settings({ preferRest: true });
  } catch {
    // Pengaturan sudah terpasang sebelumnya; biarkan apa adanya.
  }

  cached = { auth: getAuth(app), db, FieldValue };
  return cached;
}

/**
 * Status kredensial beserta alasannya. Kredensial yang ada tetapi rusak
 * dibedakan dari kredensial yang memang belum diisi, supaya pesan di halaman
 * /setup menunjuk ke masalah yang sebenarnya.
 */
export function adminConfigStatus() {
  const adaVariabel = Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT ||
      (process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY)
  );

  if (!adaVariabel) {
    return {
      configured: false,
      reason:
        "FIREBASE_SERVICE_ACCOUNT belum terbaca. Isi di .env.local lalu jalankan ulang npm run dev — variabel lingkungan hanya dibaca saat server dinyalakan. Pada hosting, isi di Environment Variables lalu deploy ulang.",
    };
  }

  try {
    readServiceAccount();
    return { configured: true };
  } catch (err) {
    return {
      configured: false,
      reason: `Kredensial terbaca tetapi tidak dapat diurai: ${err.message}. Pastikan seluruh isi JSON berada pada satu baris, atau pakai versi base64-nya.`,
    };
  }
}

export function isAdminConfigured() {
  return adminConfigStatus().configured;
}

/**
 * Memverifikasi ID token dari header Authorization dan memastikan pemanggil
 * punya salah satu peran yang diizinkan. Peran dibaca dari dokumen users/{uid}
 * sehingga perubahan peran oleh Admin langsung berlaku.
 */
export async function requireRole(request, allowedRoles) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    const error = new Error("Token tidak ditemukan.");
    error.status = 401;
    throw error;
  }

  const { auth, db, FieldValue } = await getAdmin();
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch {
    const error = new Error("Token tidak valid atau sudah kedaluwarsa.");
    error.status = 401;
    throw error;
  }

  const snap = await db.collection("users").doc(decoded.uid).get();
  const profile = snap.exists ? snap.data() : null;
  if (!profile || profile.active === false) {
    const error = new Error("Akun tidak aktif atau belum terdaftar.");
    error.status = 403;
    throw error;
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const error = new Error("Anda tidak memiliki akses ke tindakan ini.");
    error.status = 403;
    throw error;
  }

  return { uid: decoded.uid, profile, auth, db, FieldValue };
}
