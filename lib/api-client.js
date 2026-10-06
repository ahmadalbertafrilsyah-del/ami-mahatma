"use client";

/**
 * Pemanggil route handler dari sisi peramban.
 *
 * `res.json()` yang dipanggil langsung akan melempar "Unexpected end of JSON
 * input" setiap kali server menjawab tanpa body — misalnya pada HTTP 500,
 * 502 dari proxy, atau saat sambungan terputus di tengah jalan. Pesan itu
 * menyesatkan karena menunjuk ke pengurai JSON, bukan ke penyebabnya.
 *
 * Fungsi di bawah membaca jawaban sebagai teks lebih dulu, baru mengurainya,
 * sehingga pesan yang sampai ke pengguna selalu menyebut kode status dan isi
 * jawaban yang sesungguhnya diterima.
 */

const STATUS_HINT = {
  401: "Sesi Anda sudah berakhir. Muat ulang halaman lalu masuk kembali.",
  403: "Akun Anda tidak memiliki akses ke tindakan ini.",
  404: "Alamat yang dituju tidak ditemukan di server.",
  413: "Data yang dikirim terlalu besar.",
  429: "Terlalu banyak permintaan. Coba lagi beberapa saat.",
  500: "Server gagal memproses permintaan. Periksa log server untuk detailnya.",
  502: "Server perantara tidak memberi jawaban.",
  503: "Layanan sedang tidak tersedia.",
  504: "Server terlalu lama menjawab.",
};

export async function apiFetch(url, options = {}) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    // Gagal sebelum sempat ada jawaban: jaringan putus, server mati, atau
    // permintaan dibatalkan.
    throw new Error("Tidak dapat menghubungi server. Periksa koneksi Anda, lalu coba lagi.");
  }

  const text = await res.text().catch(() => "");

  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const message =
      (body && typeof body.error === "string" && body.error) ||
      STATUS_HINT[res.status] ||
      (text ? `Server menjawab ${res.status}: ${text.slice(0, 200)}` : null) ||
      `Server menjawab dengan kode ${res.status}.`;

    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  if (body === null) {
    throw new Error(
      `Server menjawab ${res.status} tanpa data yang dapat dibaca. Periksa log server untuk detailnya.`
    );
  }

  return body;
}
