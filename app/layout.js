import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";
import { THEME_INIT_SCRIPT, ThemeProvider } from "@/components/theme-provider";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: `${APP_NAME} | ${APP_TAGLINE}`,
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  // Logo bersumber dari satu berkas, public/icon.png.
  icons: { icon: "/icon.png", shortcut: "/icon.png", apple: "/icon.png" },
  appleWebApp: {
    capable: true,
    title: APP_NAME,
    statusBarStyle: "default",
  },
  // Nomor telepon di dalam teks tidak diubah menjadi tautan otomatis oleh
  // Safari, yang kerap merusak tata letak tabel.
  formatDetection: { telephone: false },
  openGraph: {
    title: `${APP_NAME} | ${APP_TAGLINE}`,
    description: APP_DESCRIPTION,
    images: ["/icon.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Konten boleh mengisi area takik; jarak amannya diatur lewat kelas
  // `pt-safe`/`pb-safe` di globals.css.
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // Skrip tema menulis atribut ini sebelum React menghidrasi; peringatan
      // ketidakcocokan hidrasi untuk <html> karenanya ditekan di sini.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
