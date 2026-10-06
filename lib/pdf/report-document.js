import "server-only";

import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  APP_NAME,
  APP_TAGLINE,
  FINDING_CATEGORY_LABEL,
  FINDING_STATUS_LABEL,
} from "../constants";

// 1 cm = 28,35 pt. Margin surat dinas: kiri 3 cm, lainnya 2,5 cm.
const CM = 28.35;

// Pemenggalan bawaan memotong kata Indonesia di tempat yang keliru
// ("reflek-si", "Kuriku-lum"), jadi kata dibiarkan utuh.
Font.registerHyphenationCallback((word) => [word]);

/**
 * Gaya dokumen mengikuti ketentuan: kertas A4, Times New Roman 12 pt,
 * spasi baris 1,5, dan paragraf rata kiri-kanan.
 *
 * "Times-Roman" adalah salah satu font baku PDF, jadi tidak perlu memuat
 * berkas font apa pun dan hasilnya tetap Times New Roman di semua pembaca.
 */
const styles = StyleSheet.create({
  page: {
    paddingTop: 2.5 * CM,
    paddingBottom: 2.5 * CM,
    paddingLeft: 3 * CM,
    paddingRight: 2.5 * CM,
    fontFamily: "Times-Roman",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#000000",
  },

  kop: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    paddingBottom: 8,
    marginBottom: 16,
  },
  kopNama: { fontFamily: "Times-Bold", fontSize: 14, textAlign: "center" },
  kopSub: { fontSize: 11, textAlign: "center" },

  judul: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    textAlign: "center",
    textDecoration: "underline",
    marginBottom: 4,
  },
  subJudul: { fontSize: 12, textAlign: "center", marginBottom: 16 },

  bab: {
    fontFamily: "Times-Bold",
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  paragraf: { textAlign: "justify", marginBottom: 6 },

  // Daftar identitas: label dengan lebar tetap agar titik dua sejajar.
  identitasBaris: { flexDirection: "row", marginBottom: 2 },
  identitasLabel: { width: 150 },
  identitasPemisah: { width: 12 },
  identitasNilai: { flex: 1 },

  tabel: { borderWidth: 1, borderColor: "#000000", marginTop: 4, marginBottom: 8 },
  trKepala: { flexDirection: "row", backgroundColor: "#e8e8e8" },
  tr: { flexDirection: "row" },
  th: {
    fontFamily: "Times-Bold",
    fontSize: 11,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  td: {
    fontSize: 11,
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
  },
  tdAkhir: { borderRightWidth: 0 },

  temuan: { marginBottom: 12 },
  temuanJudul: { fontFamily: "Times-Bold", marginBottom: 2 },
  temuanBaris: { flexDirection: "row", marginBottom: 2 },
  temuanLabel: { width: 130, fontFamily: "Times-Bold", fontSize: 11 },
  temuanNilai: { flex: 1, fontSize: 11, textAlign: "justify" },

  ttdWrap: { flexDirection: "row", justifyContent: "flex-end", marginTop: 28 },
  ttdKolom: { width: 200, alignItems: "center" },
  ttdNama: { marginTop: 56, fontFamily: "Times-Bold", textDecoration: "underline" },

  nomorHalaman: {
    position: "absolute",
    bottom: 1.5 * CM,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 10,
    color: "#444444",
  },
});

const dateFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function tanggal(value, fallback = "-") {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : dateFmt.format(d);
}

function Identitas({ label, value }) {
  return (
    <View style={styles.identitasBaris}>
      <Text style={styles.identitasLabel}>{label}</Text>
      <Text style={styles.identitasPemisah}>:</Text>
      <Text style={styles.identitasNilai}>{value || "-"}</Text>
    </View>
  );
}

function BarisTemuan({ label, value }) {
  return (
    <View style={styles.temuanBaris}>
      <Text style={styles.temuanLabel}>{label}</Text>
      <Text style={styles.temuanNilai}>{value || "-"}</Text>
    </View>
  );
}

/**
 * Laporan audit mutu internal lengkap dengan rekap skor, daftar temuan,
 * dan rencana tindak lanjut.
 */
export function ReportDocument({ audit, instrument, findings = [], scores, penerbit = APP_NAME }) {
  const lebarRekap = ["12%", "53%", "12%", "23%"];
  const lebarRtl = ["6%", "28%", "28%", "20%", "18%"];

  return (
    <Document
      title={`Laporan AMI - ${audit.institutionNama}`}
      author={penerbit}
      subject="Laporan Audit Mutu Internal"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.kop} fixed>
          <Text style={styles.kopNama}>{penerbit.toUpperCase()}</Text>
          <Text style={styles.kopSub}>{APP_TAGLINE}</Text>
        </View>

        <Text style={styles.judul}>LAPORAN AUDIT MUTU INTERNAL</Text>
        <Text style={styles.subJudul}>Periode {audit.periodNama}</Text>

        <Text style={styles.bab}>A. IDENTITAS LEMBAGA</Text>
        <Identitas label="Nama Lembaga" value={audit.institutionNama} />
        <Identitas label="Jenjang" value={audit.institutionJenjang} />
        <Identitas label="Kepala Sekolah" value={audit.kepalaNama} />
        <Identitas label="Email" value={audit.kepalaEmail} />
        <Identitas label="Nomor WhatsApp" value={audit.kepalaWhatsapp} />
        <Identitas label="Periode Audit" value={audit.periodNama} />
        <Identitas
          label="Instrumen"
          value={`${instrument.nama} versi ${instrument.versi ?? "1.0"}`}
        />
        <Identitas
          label="Auditor"
          value={audit.auditorNama?.length ? audit.auditorNama.join(", ") : "-"}
        />
        <Identitas label="Tanggal Penyelesaian" value={tanggal(audit.completedAt, "belum selesai")} />

        <Text style={styles.bab}>B. RINGKASAN HASIL</Text>
        <Text style={styles.paragraf}>
          Audit mutu internal terhadap {audit.institutionNama} dilaksanakan pada periode{" "}
          {audit.periodNama} menggunakan instrumen {instrument.nama}. Dari{" "}
          {scores.total} indikator yang tersedia, sebanyak {scores.answered} indikator telah dinilai
          dan menghasilkan skor mutu sebesar {scores.overall === null ? "-" : scores.overall.toFixed(2)}{" "}
          pada skala 1 sampai 4 dengan predikat {scores.status ? scores.status.label : "belum dinilai"}.
          Hasil audit ini memetakan kekuatan serta kesenjangan mutu yang menjadi dasar penyusunan
          rencana tindak lanjut perbaikan.
        </Text>

        <Text style={styles.bab}>C. REKAPITULASI SKOR PER AREA</Text>
        <View style={styles.tabel}>
          <View style={styles.trKepala} fixed>
            <Text style={[styles.th, { width: lebarRekap[0] }]}>Kode</Text>
            <Text style={[styles.th, { width: lebarRekap[1] }]}>Area Audit</Text>
            <Text style={[styles.th, { width: lebarRekap[2], textAlign: "center" }]}>Skor</Text>
            <Text style={[styles.th, styles.tdAkhir, { width: lebarRekap[3] }]}>Predikat</Text>
          </View>
          {scores.areas.map((area) => (
            <View style={styles.tr} key={area.id} wrap={false}>
              <Text style={[styles.td, { width: lebarRekap[0] }]}>{area.id}</Text>
              <Text style={[styles.td, { width: lebarRekap[1] }]}>{area.title}</Text>
              <Text style={[styles.td, { width: lebarRekap[2], textAlign: "center" }]}>
                {area.avg === null ? "-" : area.avg.toFixed(2)}
              </Text>
              <Text style={[styles.td, styles.tdAkhir, { width: lebarRekap[3] }]}>
                {area.status ? area.status.label : "-"}
              </Text>
            </View>
          ))}
          <View style={styles.tr} wrap={false}>
            <Text
              style={[
                styles.td,
                { width: `${parseFloat(lebarRekap[0]) + parseFloat(lebarRekap[1])}%`, fontFamily: "Times-Bold" },
              ]}
            >
              Skor Mutu Keseluruhan
            </Text>
            <Text
              style={[
                styles.td,
                { width: lebarRekap[2], textAlign: "center", fontFamily: "Times-Bold" },
              ]}
            >
              {scores.overall === null ? "-" : scores.overall.toFixed(2)}
            </Text>
            <Text
              style={[styles.td, styles.tdAkhir, { width: lebarRekap[3], fontFamily: "Times-Bold" }]}
            >
              {scores.status ? scores.status.label : "-"}
            </Text>
          </View>
        </View>

        <Text style={styles.bab}>D. TEMUAN AUDIT</Text>
        {findings.length === 0 ? (
          <Text style={styles.paragraf}>
            Tidak terdapat temuan yang ditetapkan pada pelaksanaan audit periode ini.
          </Text>
        ) : (
          findings.map((f, i) => (
            <View style={styles.temuan} key={f.id} wrap={false}>
              <Text style={styles.temuanJudul}>
                {i + 1}. {f.indikatorId ? `[${f.indikatorId}] ` : ""}
                {f.judul}
              </Text>
              <BarisTemuan
                label="Kategori"
                value={FINDING_CATEGORY_LABEL[f.kategori] ?? f.kategori}
              />
              <BarisTemuan label="Kondisi" value={f.kondisi} />
              <BarisTemuan label="Kriteria" value={f.kriteria} />
              <BarisTemuan label="Akibat / Risiko" value={f.akibat} />
              <BarisTemuan label="Akar Penyebab" value={f.akarPenyebab} />
              <BarisTemuan label="Rekomendasi" value={f.rekomendasi} />
              <BarisTemuan label="Status" value={FINDING_STATUS_LABEL[f.status] ?? f.status} />
            </View>
          ))
        )}

        <Text style={styles.bab} break={findings.length > 2}>
          E. RENCANA TINDAK LANJUT (RTL)
        </Text>
        {findings.length === 0 ? (
          <Text style={styles.paragraf}>
            Tidak ada rencana tindak lanjut karena tidak terdapat temuan pada periode ini.
          </Text>
        ) : (
          <View style={styles.tabel}>
            <View style={styles.trKepala} fixed>
              <Text style={[styles.th, { width: lebarRtl[0], textAlign: "center" }]}>No</Text>
              <Text style={[styles.th, { width: lebarRtl[1] }]}>Temuan</Text>
              <Text style={[styles.th, { width: lebarRtl[2] }]}>Rencana Perbaikan</Text>
              <Text style={[styles.th, { width: lebarRtl[3] }]}>Penanggung Jawab</Text>
              <Text style={[styles.th, styles.tdAkhir, { width: lebarRtl[4] }]}>Target</Text>
            </View>
            {findings.map((f, i) => (
              <View style={styles.tr} key={f.id} wrap={false}>
                <Text style={[styles.td, { width: lebarRtl[0], textAlign: "center" }]}>{i + 1}</Text>
                <Text style={[styles.td, { width: lebarRtl[1] }]}>
                  {f.indikatorId ? `[${f.indikatorId}] ` : ""}
                  {f.judul}
                </Text>
                <Text style={[styles.td, { width: lebarRtl[2], textAlign: "justify" }]}>
                  {f.rtl?.rencana || "-"}
                </Text>
                <Text style={[styles.td, { width: lebarRtl[3] }]}>
                  {f.rtl?.penanggungJawab || "-"}
                </Text>
                <Text style={[styles.td, styles.tdAkhir, { width: lebarRtl[4] }]}>
                  {tanggal(f.rtl?.target)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.bab}>F. PENUTUP</Text>
        <Text style={styles.paragraf}>
          Laporan ini disusun sebagai hasil audit mutu internal dan menjadi dasar perbaikan
          berkelanjutan bagi {audit.institutionNama}. Rencana tindak lanjut sebagaimana tercantum
          pada bagian E agar dilaksanakan sesuai target waktu yang telah ditetapkan, serta
          dilaporkan perkembangannya kepada auditor untuk proses verifikasi dan penutupan temuan.
        </Text>

        <View style={styles.ttdWrap} wrap={false}>
          <View style={styles.ttdKolom}>
            <Text>{tanggal(audit.completedAt, tanggal(new Date()))}</Text>
            <Text>Auditor,</Text>
            <Text style={styles.ttdNama}>
              {audit.auditorNama?.length ? audit.auditorNama[0] : "....................."}
            </Text>
          </View>
        </View>

        <Text
          style={styles.nomorHalaman}
          render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} dari ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
