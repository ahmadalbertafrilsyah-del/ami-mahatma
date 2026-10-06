import { DEFAULT_RUBRICS } from "./constants";

/**
 * Instrumen bawaan (6 area, 18 indikator) yang di-seed Admin ke Firestore
 * pada pemakaian pertama. Setelah di-seed, sumber kebenaran ada di Firestore.
 */
export const DEFAULT_INSTRUMENT = {
  nama: "Instrumen AMI Satuan Pendidikan",
  versi: "1.0",
  deskripsi:
    "Instrumen audit mutu internal kepemimpinan satuan pendidikan dengan skala penilaian 1-4 beserta kriteria dan rekomendasi awal.",
  rubrics: DEFAULT_RUBRICS,
  areas: [
    {
      id: "A",
      title: "Refleksi, Evaluasi Kinerja, dan Pengembangan Profesional",
      questions: [
        {
          id: "A1",
          text: "Sekolah menyediakan waktu dan mekanisme refleksi kinerja bagi guru dan tenaga kependidikan secara rutin.",
          criterion:
            "Refleksi dilakukan secara sadar, terencana, dan menggunakan bukti yang relevan untuk perbaikan pembelajaran.",
          recommendation:
            "Tetapkan jadwal refleksi berkala dan gunakan data hasil belajar, umpan balik, atau bukti pembelajaran sebagai dasar pembahasan.",
        },
        {
          id: "A2",
          text: "Evaluasi kinerja guru dilakukan secara berkala dan menghasilkan informasi yang digunakan untuk perbaikan.",
          criterion:
            "Evaluasi kinerja menggambarkan kemampuan mengajar, interaksi dengan murid, pengembangan kurikulum, dan kontribusi guru.",
          recommendation:
            "Bangun siklus evaluasi kinerja yang diikuti umpan balik, target perbaikan, dan pemantauan tindak lanjut.",
        },
        {
          id: "A3",
          text: "Guru memiliki rencana pengembangan profesional berdasarkan hasil evaluasi kinerja dan refleksi.",
          criterion:
            "Rencana pengembangan profesional disusun berdasarkan kebutuhan kompetensi yang teridentifikasi.",
          recommendation:
            "Susun rencana pengembangan profesional per guru yang memuat kebutuhan kompetensi, kegiatan, waktu, dan indikator keberhasilan.",
        },
      ],
    },
    {
      id: "B",
      title: "Visi, Misi, Partisipasi, dan Perencanaan Berbasis Data",
      questions: [
        {
          id: "B1",
          text: "Visi dan misi sekolah dipahami serta dikomunikasikan secara jelas kepada pemangku kepentingan.",
          criterion:
            "Visi dan misi menjadi rujukan aktivitas, program, dan kebijakan sekolah, bukan sekadar dokumen.",
          recommendation:
            "Perkuat komunikasi visi-misi melalui forum warga sekolah dan kaitkan setiap program prioritas dengan arah strategis sekolah.",
        },
        {
          id: "B2",
          text: "Sekolah membangun komunikasi dan kolaborasi berkala dengan guru, tenaga kependidikan, orang tua/wali, dan mitra.",
          criterion:
            "Kolaborasi digunakan untuk mendukung penyelenggaraan layanan pendidikan dan pencapaian visi-misi.",
          recommendation:
            "Buat agenda komunikasi dan kemitraan rutin yang memiliki tujuan, catatan hasil, dan tindak lanjut.",
        },
        {
          id: "B3",
          text: "Evaluasi/refleksi sekolah menggunakan data dan melibatkan pihak yang relevan.",
          criterion:
            "Data digunakan untuk mengenali kekuatan, masalah, dan kebutuhan perbaikan layanan.",
          recommendation:
            "Gunakan Rapor Pendidikan, hasil asesmen, supervisi, umpan balik murid/orang tua, dan data internal sebagai dasar refleksi.",
        },
        {
          id: "B4",
          text: "Rencana kerja tahunan disusun berdasarkan hasil evaluasi/refleksi berbasis data.",
          criterion:
            "Rencana kerja menjadi rujukan pengelolaan sumber daya dan fokus perbaikan layanan.",
          recommendation:
            "Hubungkan setiap masalah prioritas dengan program, indikator hasil, jadwal, penanggung jawab, dan sumber daya.",
        },
      ],
    },
    {
      id: "C",
      title: "Pengelolaan Anggaran",
      questions: [
        {
          id: "C1",
          text: "Anggaran sekolah disusun sesuai prioritas perbaikan layanan yang telah direncanakan.",
          criterion:
            "Penganggaran mendukung program yang paling berdampak pada kebutuhan belajar murid.",
          recommendation:
            "Petakan hubungan antara hasil evaluasi, program perbaikan, dan alokasi anggaran.",
        },
        {
          id: "C2",
          text: "Penyusunan anggaran melibatkan komite atau pihak terkait secara transparan.",
          criterion:
            "Proses penganggaran menunjukkan keterlibatan pihak relevan dan transparansi.",
          recommendation:
            "Dokumentasikan keterlibatan komite/pihak terkait melalui notulen, berita acara, atau dokumen persetujuan.",
        },
        {
          id: "C3",
          text: "Penggunaan anggaran dilaporkan secara berkala kepada pemangku kepentingan.",
          criterion: "Pelaporan berkala mencerminkan akuntabilitas pengelolaan anggaran.",
          recommendation:
            "Tetapkan mekanisme laporan realisasi anggaran dan forum penyampaian kepada pihak yang berkepentingan.",
        },
      ],
    },
    {
      id: "D",
      title: "Pengelolaan Sarana dan Prasarana",
      questions: [
        {
          id: "D1",
          text: "Perencanaan sarana dan prasarana didasarkan pada analisis kebutuhan pembelajaran.",
          criterion:
            "Sarpras berfungsi sebagai pendukung kebutuhan belajar, bukan sekadar kelengkapan fisik.",
          recommendation:
            "Gunakan analisis kebutuhan belajar sebagai dasar daftar prioritas pengadaan sarpras.",
        },
        {
          id: "D2",
          text: "Sarana dan prasarana yang tersedia dimanfaatkan secara optimal untuk pembelajaran.",
          criterion:
            "Pemanfaatan sarpras relevan dengan kebutuhan pembelajaran dan dapat digunakan warga sekolah.",
          recommendation:
            "Evaluasi tingkat pemanfaatan sarpras dan susun strategi optimalisasi fasilitas yang belum digunakan.",
        },
        {
          id: "D3",
          text: "Sekolah memiliki mekanisme pemeliharaan sarana dan prasarana yang berjalan.",
          criterion: "Aset dipelihara agar aman, layak, dan dapat terus dimanfaatkan.",
          recommendation:
            "Susun jadwal pemeliharaan, pencatatan kondisi aset, dan penanggung jawab pemeliharaan.",
        },
      ],
    },
    {
      id: "E",
      title: "Pengembangan Kurikulum Satuan Pendidikan",
      questions: [
        {
          id: "E1",
          text: "Kurikulum sekolah disusun berdasarkan karakteristik satuan pendidikan dan kebutuhan belajar murid.",
          criterion:
            "Kurikulum relevan dengan karakteristik sekolah dan kebutuhan murid serta merujuk kurikulum nasional.",
          recommendation:
            "Perbarui analisis karakteristik sekolah dan gunakan hasilnya dalam penyusunan kurikulum.",
        },
        {
          id: "E2",
          text: "Kurikulum sekolah dievaluasi secara berkala menggunakan data yang relevan.",
          criterion: "Evaluasi kurikulum memastikan kurikulum tetap sesuai kebutuhan belajar murid.",
          recommendation:
            "Tetapkan mekanisme evaluasi kurikulum dengan melibatkan data pembelajaran, refleksi guru, dan kebutuhan murid.",
        },
        {
          id: "E3",
          text: "Kurikulum menjadi rujukan nyata dalam pengorganisasian dan perencanaan pembelajaran.",
          criterion:
            "Kurikulum memandu pembelajaran intrakurikuler, kokurikuler, ekstrakurikuler, dan program satuan pendidikan.",
          recommendation:
            "Pastikan keterhubungan antara kurikulum sekolah, tujuan pembelajaran, program tahunan, dan praktik kelas.",
        },
      ],
    },
    {
      id: "F",
      title: "Budaya Mutu dan Iklim Satuan Pendidikan",
      questions: [
        {
          id: "F1",
          text: "Sekolah memiliki budaya perbaikan berkelanjutan yang terlihat dalam evaluasi, tindak lanjut, dan monitoring.",
          criterion:
            "Perbaikan mutu berjalan sebagai siklus, bukan hanya kegiatan sesaat menjelang audit atau akreditasi.",
          recommendation:
            "Tetapkan siklus evaluasi-perbaikan-monitoring dengan jadwal dan bukti tindak lanjut.",
        },
        {
          id: "F2",
          text: "Sekolah menjaga lingkungan belajar yang aman, inklusif, dan menghargai keberagaman.",
          criterion:
            "Warga sekolah memperoleh lingkungan yang aman secara fisik dan psikis serta kebutuhan belajar yang diperhatikan.",
          recommendation:
            "Petakan risiko lingkungan belajar, mekanisme pelaporan, penanganan, dan dukungan bagi murid yang membutuhkan.",
        },
      ],
    },
  ],
};
