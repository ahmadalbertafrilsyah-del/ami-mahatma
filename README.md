# SIM-AMI

Sistem informasi manajemen **Audit Mutu Internal (AMI)** untuk satuan pendidikan. Dua dashboard bertugas — **Administrator** dan **Auditor** — sementara pimpinan satuan pendidikan cukup mendaftar lewat formulir publik tanpa perlu akun.

Dibangun dengan Next.js 16 (App Router) + Tailwind CSS v4, Firebase Authentication & Firestore, serta Cloudinary untuk penyimpanan bukti berupa gambar dan dokumen.

---

## Alur kerja

1. **Pendaftaran publik.** Di halaman depan (`/`), kepala sekolah mengisi nama, email, nomor WhatsApp, dan nama sekolah. Data langsung masuk ke koleksi `institutions` berstatus `pending`.
   Calon auditor punya jalur sendiri di `/daftar-auditor`: ia membuat akunnya dan — bila mau — sekalian mendaftarkan satu lembaga. Akun auditor hasil pendaftaran mandiri tersimpan dengan `active: false` dan `pendingApproval: true`, sehingga baru dapat masuk ke dashboard setelah disetujui administrator di menu **Pengguna**.
2. **Verifikasi.** Administrator memeriksa pendaftaran di menu **Lembaga**, menandainya *Terverifikasi*, lalu membuka periode AMI dan menugaskan auditor.
3. **Penilaian.** Auditor membuka penugasannya dan mengisi **ceklis** indikator (skala 1–4) beserta catatan kondisi dan bukti pendukung.
4. **Temuan & tindak lanjut.** Indikator berskor 1–2 muncul sebagai kandidat temuan. Auditor menetapkannya menjadi temuan, mencatat akar penyebab dan rencana perbaikan, lalu menutupnya setelah perbaikan terbukti.
5. **Laporan.** Rekap skor per area, prioritas perbaikan, dan daftar temuan dapat dicetak atau disimpan sebagai PDF dari browser.

## Peran dan menu

| Peran | Menu |
| --- | --- |
| Administrator | Ringkasan, Pengguna, Lembaga, Periode AMI, Instrumen, Penugasan Auditor, Laporan |
| Auditor | Penugasan Saya, Temuan & RTL, Rekap Skor |
| Kepala sekolah | *Tidak punya akun* — cukup formulir pendaftaran di halaman depan |

Akun auditor dapat dibuat dua arah: dibuatkan administrator lewat menu **Pengguna**, atau didaftarkan sendiri lewat `/daftar-auditor` lalu disetujui administrator.

---

## Persiapan

### 1. Firebase

1. Buat project di [Firebase Console](https://console.firebase.google.com/).
2. **Authentication** → aktifkan metode **Email/Password**.
3. **Firestore Database** → buat database (mode produksi).
4. **Project settings → General → Your apps** → tambahkan Web app, salin konfigurasinya.
5. **Project settings → Service accounts** → *Generate new private key*, simpan file JSON-nya.

### 2. Cloudinary

Buat akun di [Cloudinary](https://cloudinary.com/), lalu salin **Cloud name**, **API Key**, dan **API Secret** dari dashboard. Unggahan ditandatangani di server, jadi *unsigned upload preset* tidak diperlukan.

### 3. Email (SMTP)

Dipakai untuk mengirim laporan audit beserta lampiran PDF ke kepala sekolah. Bisa memakai SMTP apa pun.

Dengan Gmail: aktifkan verifikasi dua langkah, buat **App Password** di <https://myaccount.google.com/apppasswords>, lalu isi `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` dengan alamat Gmail, dan `SMTP_PASS` dengan App Password tersebut (bukan kata sandi akun).

Bagian ini opsional — tanpa konfigurasi SMTP seluruh fitur lain tetap berjalan, hanya tombol kirim email yang dinonaktifkan beserta penjelasannya.

### 4. Logo

Logo bersumber dari satu berkas, **`public/icon.png`**. Ganti berkas itu untuk mengubah logo di sidebar, halaman depan, halaman login, favicon, dan pratinjau tautan. Disarankan gambar persegi minimal 512×512 piksel.

Nama penyelenggara yang tampil pada kop laporan PDF dan pengirim email diambil dari `NEXT_PUBLIC_ORG_NAME`.

### 5. Variabel lingkungan

```bash
cp .env.local.example .env.local
```

Isi seluruh nilainya. `FIREBASE_SERVICE_ACCOUNT` diisi **seluruh isi file JSON service account dalam satu baris** (atau versi base64-nya). Variabel ini rahasia — jangan pernah diberi awalan `NEXT_PUBLIC_`.

### 6. Aturan keamanan Firestore

Terapkan isi [firestore.rules](firestore.rules):

```bash
firebase deploy --only firestore:rules
```

Atau salin-tempel isinya ke **Firestore Database → Rules** di console.

Aturan ini penting karena formulir pendaftaran berjalan **tanpa login**. Penulisan publik dibatasi: hanya membuat dokumen baru di `institutions`, hanya dengan tujuh field yang ditentukan, status wajib `pending`, dan setiap nilainya dibatasi panjangnya. Membaca, mengubah, dan menghapus data lembaga tetap milik petugas.

### 7. Jalankan

```bash
npm install
npm run dev
```

Buka <http://localhost:3000>.

### 8. Inisialisasi data awal

1. Buka `/setup` untuk membuat **administrator pertama**. Halaman ini menutup diri sendiri begitu satu akun admin ada.
2. Masuk sebagai admin, lalu:
   - **Instrumen** → *Seed Instrumen Bawaan* (6 area, 18 indikator) dan sunting sesuai kebutuhan.
   - **Pengguna** → buat akun auditor, dan setujui pendaftaran auditor mandiri yang masuk.
   - **Lembaga** → verifikasi pendaftaran yang masuk, atau tambahkan lembaga secara manual.
   - **Periode AMI** → buat periode, pilih instrumen, set status **Berjalan**, lalu klik *Generate Audit* (hanya lembaga berstatus Terverifikasi yang dibuatkan dokumen).
   - **Penugasan Auditor** → tetapkan auditor untuk tiap dokumen audit.

---

## Struktur data Firestore

```
users/{uid}                 uid, email, nama, role (admin|auditor), telepon, active,
                            pendingApproval, instansi, sumber (mandiri bila daftar sendiri)
institutions/{id}           nama, jenjang, kepalaNama, kepalaEmail, kepalaWhatsapp,
                            npsn, alamat, kota, status (pending|aktif|ditolak),
                            sumber (publik|admin|auditor), didaftarkanOlehUid
instruments/{id}            nama, versi, rubrics[], areas[{ id, title, questions[] }]
periods/{id}                nama, tahun, instrumentId, mulai, selesai, status
audits/{id}                 periodId, institutionId, instrumentId, status, auditorUids[],
                            kepalaNama, kepalaEmail, kepalaWhatsapp,
                            answers{ [indikator]: { score, catatan, files[] } }
audits/{id}/findings/{fid}  indikatorId, kategori, judul, kondisi, kriteria, akibat,
                            rekomendasi, akarPenyebab, rtl{...}, status
```

Status dokumen audit: `draft` → `completed` (dapat dibuka kembali oleh auditor).
Status temuan: `open` → `in_progress` → `closed`.

## Struktur kode

```
app/
  page.js     halaman depan publik berisi formulir pendaftaran lembaga
  admin/      auditor/     dua dashboard beserta layout dan penjaga peran
  api/        setup, admin/users, auditor/register, laporan/[auditId] (PDF + email),
              cloudinary/sign, cloudinary/destroy
  login/      setup/       akun-nonaktif/      daftar-auditor/
  manifest.js  manifest PWA agar aplikasi dapat dipasang ke layar utama
components/   auth-provider, theme-provider, dashboard-shell, audit-form,
              audit-report, report-actions, evidence-uploader, brand-logo,
              icons, ui
lib/          firebase (klien), firebase-admin (server), cloudinary, upload,
              mailer, pdf/ (dokumen laporan A4), constants, scoring,
              hooks, format, default-instrument
firestore.rules
```

## Laporan PDF dan email

Dari tab **Laporan** pada dokumen audit (dashboard Auditor maupun Admin) tersedia dua tindakan:

- **Unduh PDF** — laporan dirakit di server memakai kertas **A4**, font **Times New Roman 12 pt**, **spasi baris 1,5**, dan paragraf **rata kiri-kanan**. Isinya: kop penyelenggara, identitas lembaga, ringkasan hasil, rekapitulasi skor per area, daftar temuan, tabel rencana tindak lanjut, penutup, kolom tanda tangan, dan nomor halaman. Tabel yang melewati batas halaman mengulang baris judulnya secara otomatis.
- **Kirim ke Email** — mengirim surel pengantar berisi ringkasan hasil ke alamat kepala sekolah, dengan laporan PDF sebagai lampiran. Tombol ini baru aktif setelah audit ditandai selesai. Waktu dan tujuan pengiriman terakhir dicatat pada dokumen audit.

## Catatan

- **Identitas aplikasi** (nama, tagline, deskripsi) terpusat di `APP_NAME`, `APP_TAGLINE`, dan `APP_DESCRIPTION` pada [constants.js](lib/constants.js). Ubah di sana untuk menyesuaikan dengan lembaga penyelenggara.
- **Pembuatan dan perubahan akun** berjalan lewat route handler `/api/admin/users` memakai Firebase Admin SDK, sehingga sesi admin yang sedang berjalan tidak tergantikan.
- API secret Cloudinary tidak pernah dikirim ke browser; klien hanya menerima signature untuk satu unggahan. Batas ukuran berkas 10 MB.
- **Logo** bersumber dari `public/icon.png` lewat komponen [brand-logo.js](components/brand-logo.js); mengganti berkas itu mengubah logo di seluruh aplikasi sekaligus favicon.
- Selain unduh PDF, halaman laporan tetap bisa dicetak langsung dari browser; kelas `no-print` menyembunyikan elemen navigasi saat dicetak.
