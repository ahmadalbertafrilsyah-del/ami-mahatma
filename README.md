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

### 0. Versi Node.js

Proyek ini **menuntut Node.js 22 ke atas**, dinyatakan pada field `engines` di `package.json`. Syarat itu datang dari `firebase-admin` 14 beserta turunannya (`@google-cloud/firestore` 9, `google-auth-library` 11) yang semuanya memasang `"node": ">=22"`.

Ini bukan sekadar anjuran. Pada runtime yang lebih tua, seluruh rantai impor `firebase-admin` gagal dimuat, dan kegagalan itu terjadi **saat modul route dibaca** — sebelum kode penanganan galat mana pun sempat berjalan. Akibatnya setiap endpoint di `/api/*` menjawab HTTP 500 berbadan kosong, sementara halaman biasa tetap tampil normal karena tidak menyentuh pustaka itu. Gejalanya menyesatkan: aplikasi tampak hidup, tetapi tidak ada satu pun tindakan yang berhasil.

Saat menyebarkan ke hosting, pastikan pengaturan versi Node.js-nya 22 atau lebih baru. Di Vercel: **Project Settings → General → Node.js Version**. Setelah deploy ulang, buka `/api/setup` di peramban — jawaban yang sehat berupa JSON seperti `{"configured":true,"adminExists":true}`. Bila yang muncul tetap halaman kosong atau galat, isi JSON-nya kini menyebutkan versi Node yang sedang dipakai beserta penyebabnya.

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
   - **Pengguna** → buat akun auditor satu per satu, impor banyak akun sekaligus dari berkas Excel, dan setujui pendaftaran auditor mandiri yang masuk.
   - **Lembaga** → impor banyak lembaga sekaligus dari Excel, dan hapus lembaga bila perlu; lembaga yang masih punya dokumen audit meminta konfirmasi tambahan karena audit dan temuannya ikut terhapus.
   - **Lembaga** → verifikasi pendaftaran yang masuk, atau tambahkan lembaga secara manual.
   - **Periode AMI** → buat periode, pilih instrumen, set status **Berjalan**, lalu klik *Generate Audit* (hanya lembaga berstatus Terverifikasi yang dibuatkan dokumen).
   - **Penugasan Auditor** → tetapkan auditor untuk tiap dokumen audit.

---

## Impor dari Excel

Tersedia di dua tempat: menu **Pengguna** → **Impor Excel** untuk akun auditor, dan menu **Lembaga** → **Impor Excel** untuk satuan pendidikan. Keduanya memakai alur yang sama.

1. **Unduh template.** Berkas .xlsx beserta lembar **Petunjuk**. Seluruh kolom berformat teks agar angka nol di depan nomor telepon dan NPSN tidak terpangkas Excel.
2. **Unggah berkas terisi.** Berkas hanya **diperiksa** lebih dulu — belum ada data yang disimpan. Pratinjau menampilkan status per baris: siap, atau gagal beserta alasannya.
3. **Impor.** Hasil akhirnya dirangkum per baris; satu baris yang gagal tidak membatalkan sisanya.

| | Pengguna | Lembaga |
| --- | --- | --- |
| Kolom wajib | Nama Lengkap, Email, Kata Sandi | Nama Lembaga |
| Kolom lain | Telepon, Peran (auditor/admin) | Jenjang, NPSN, Kota, Alamat, Nama/Email/WhatsApp kepala sekolah, Status |
| Baris ditolak bila | email ganda di berkas, email sudah terdaftar, kata sandi di bawah 8 karakter, peran tidak dikenali | nama ganda di berkas, nama sudah terdaftar, status tidak dikenali, email kepala tidak valid |

Batas satu berkas: 300 baris dan 2 MB. Nama kolom dicocokkan secara longgar — "Nama Sekolah", "Kabupaten", "No Telepon", dan "WhatsApp" ikut dikenali — dan baris judul dicari sampai sepuluh baris pertama, sehingga berkas yang diberi judul di bagian atas tetap terbaca. Nomor yang terlanjur tersimpan sebagai angka dipulihkan nol di depannya.

Kata sandi pada berkas pengguna hanya berlaku sebagai kata sandi awal. Mintalah setiap pengguna menggantinya lewat **Lupa kata sandi** pada halaman masuk.

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
  api/        setup, admin/users, admin/users/import, admin/institutions,
              admin/institutions/import, auditor/register,
              laporan/[auditId] (PDF + email), cloudinary/sign, cloudinary/destroy
  login/      setup/       akun-nonaktif/      daftar-auditor/
  manifest.js  manifest PWA agar aplikasi dapat dipasang ke layar utama
components/   auth-provider, theme-provider, dashboard-shell, audit-form,
              audit-report, report-actions, evidence-uploader, excel-import,
              brand-logo, icons, ui
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
