import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

/**
 * Manifest aplikasi web. Dengan berkas ini, SIM-AMI dapat dipasang ke layar
 * utama ponsel dan terbuka tanpa bilah alamat, sehingga terasa seperti
 * aplikasi tersendiri alih-alih sebuah tab peramban.
 */
export default function manifest() {
  const org = process.env.NEXT_PUBLIC_ORG_NAME;

  return {
    name: org ? `${APP_NAME} ${org}` : `${APP_NAME} — ${APP_TAGLINE}`,
    short_name: APP_NAME,
    description: APP_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f1f4f8",
    theme_color: "#047857",
    lang: "id",
    dir: "ltr",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Daftarkan Lembaga", url: "/" },
      { name: "Daftar sebagai Auditor", url: "/daftar-auditor" },
      { name: "Masuk", url: "/login" },
    ],
  };
}
