import "server-only";

import ExcelJS from "exceljs";

/**
 * Mengubah isi satu sel menjadi teks biasa.
 *
 * ExcelJS mengembalikan bentuk yang bermacam-macam tergantung bagaimana sel
 * itu diisi: email yang diketik di Excel otomatis menjadi objek hyperlink,
 * nomor telepon menjadi angka (dan "0812..." kehilangan angka nolnya), sel
 * berformula menjadi objek berisi rumus beserta hasilnya, dan teks kaya
 * menjadi potongan-potongan bergaya. Semua bentuk itu diratakan di sini agar
 * pemanggilnya cukup berurusan dengan string.
 */
export function cellText(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text.trim();
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("").trim();
    }
    if ("result" in value) return cellText(value.result);
    if ("hyperlink" in value) return String(value.hyperlink).replace(/^mailto:/i, "").trim();
  }

  return String(value).trim();
}

/** Membaca lembar kerja pertama menjadi daftar objek berkunci nama kolom. */
export async function readSheet(arrayBuffer, { headerAliases }) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Berkas tidak memuat lembar kerja apa pun.");

  // Baris judul dicari, bukan diasumsikan di baris 1, supaya berkas yang
  // diberi judul atau logo di bagian atas tetap terbaca.
  let headerRowNumber = 0;
  let columns = null;

  for (let r = 1; r <= Math.min(sheet.rowCount, 10); r += 1) {
    const row = sheet.getRow(r);
    const mapped = {};
    let found = 0;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const key = normalizeHeader(cellText(cell.value));
      const field = headerAliases[key];
      if (field && !(field in mapped)) {
        mapped[field] = colNumber;
        found += 1;
      }
    });

    if (found >= 2) {
      headerRowNumber = r;
      columns = mapped;
      break;
    }
  }

  if (!columns) {
    throw new Error(
      "Baris judul kolom tidak ditemukan. Pakai berkas template agar nama kolomnya sesuai."
    );
  }

  const rows = [];
  for (let r = headerRowNumber + 1; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    const record = { _baris: r };
    let kosong = true;

    for (const [field, colNumber] of Object.entries(columns)) {
      const text = cellText(row.getCell(colNumber).value);
      record[field] = text;
      if (text) kosong = false;
    }

    // Baris kosong di tengah atau di ujung tabel dilewati, bukan dilaporkan
    // sebagai galat — Excel kerap menyisakan baris bekas pakai.
    if (!kosong) rows.push(record);
  }

  return rows;
}

function normalizeHeader(text) {
  return text
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Membuat berkas .xlsx dari definisi kolom dan baris contoh. */
export async function buildWorkbook({ sheetName, columns, examples = [], notes = [] }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIM-AMI";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 24 }));

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.height = 24;
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
    cell.border = { bottom: { style: "thin", color: { argb: "FF065F46" } } };
  });

  for (const example of examples) sheet.addRow(example);

  // Baris contoh diberi warna berbeda agar jelas bahwa isinya harus diganti.
  for (let r = 2; r <= examples.length + 1; r += 1) {
    sheet.getRow(r).eachCell((cell) => {
      cell.font = { italic: true, color: { argb: "FF64748B" } };
    });
  }

  // Seluruh kolom dipaksa bertipe teks. Tanpa ini Excel memangkas angka nol di
  // depan nomor telepon, sehingga "081234567890" tersimpan jadi "81234567890".
  for (let i = 1; i <= columns.length; i += 1) {
    sheet.getColumn(i).numFmt = "@";
  }

  if (notes.length) {
    const guide = workbook.addWorksheet("Petunjuk");
    guide.getColumn(1).width = 100;
    notes.forEach((line, index) => {
      const row = guide.addRow([line]);
      row.alignment = { wrapText: true, vertical: "top" };
      if (index === 0) row.font = { bold: true, size: 13 };
    });
  }

  return workbook.xlsx.writeBuffer();
}
