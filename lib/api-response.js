import "server-only";

/**
 * Pembungkus route handler.
 *
 * Latar belakangnya: bila sebuah route handler melempar galat yang tidak
 * tertangkap, Next.js menjawab dengan HTTP 500 **tanpa body sama sekali**.
 * Di sisi peramban, `await res.json()` pada jawaban kosong itu melempar
 * "Unexpected end of JSON input" — pesan yang tidak menjelaskan apa pun
 * tentang kesalahan yang sebenarnya terjadi di server.
 *
 * `route()` menutup celah tersebut: apa pun yang terjadi, pemanggil selalu
 * menerima JSON berisi `error`, sementara galat aslinya dicatat lengkap di
 * log server untuk ditelusuri.
 */
export function route(handler) {
  return async function wrapped(request, context) {
    try {
      const response = await handler(request, context);

      // Handler yang lupa mengembalikan Response juga tidak boleh berakhir
      // sebagai jawaban kosong.
      if (!(response instanceof Response)) {
        console.error("[api] handler tidak mengembalikan Response:", response);
        return fail("Server tidak memberikan jawaban yang sah.", 500);
      }
      return response;
    } catch (err) {
      console.error("[api] galat tidak tertangkap:", err);
      return fail(messageOf(err), statusOf(err));
    }
  };
}

function statusOf(err) {
  const status = Number(err?.status);
  return Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
}

function messageOf(err) {
  const raw = typeof err?.message === "string" ? err.message.trim() : "";
  return raw || "Terjadi kesalahan di server. Periksa log server untuk detailnya.";
}

/** Jawaban galat berbentuk JSON. */
export function fail(message, status = 400, extra) {
  return Response.json({ error: message, ...extra }, { status });
}

/** Jawaban sukses berbentuk JSON. */
export function ok(data = {}) {
  return Response.json({ ok: true, ...data });
}

/** Galat yang membawa kode status HTTP-nya sendiri. */
export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

/**
 * Membaca body JSON tanpa pernah melempar. Body kosong, bukan JSON, atau
 * bernilai `null` sama-sama menjadi objek kosong, sehingga destrukturisasi
 * di handler aman dilakukan.
 */
export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}
