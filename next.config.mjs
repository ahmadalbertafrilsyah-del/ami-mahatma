/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
    exceljs dipakai hanya di route handler dan membawa sejumlah modul Node
    (aliran berkas zip, buffer). Dibiarkan di luar bundel agar diambil
    langsung dari node_modules saat dijalankan, bukan dirangkum ke dalam
    berkas server oleh bundler.
  */
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
