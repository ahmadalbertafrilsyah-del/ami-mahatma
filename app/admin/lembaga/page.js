"use client";

import { useState } from "react";
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { apiFetch } from "@/lib/api-client";
import { authHeaders } from "@/components/auth-provider";
import { ExcelImportModal } from "@/components/excel-import";
import {
  INSTITUTION_STATUS,
  INSTITUTION_STATUS_LABEL,
  INSTITUTION_STATUS_TONE,
  JENJANG,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Row,
  Select,
  Spinner,
  Table,
  Tabs,
  Td,
  Textarea,
} from "@/components/ui";

const EMPTY = {
  nama: "",
  jenjang: "",
  kepalaNama: "",
  kepalaEmail: "",
  kepalaWhatsapp: "",
  npsn: "",
  alamat: "",
  kota: "",
  catatan: "",
};

export default function LembagaPage() {
  const { data: list, loading } = useQuerySnapshot(
    () => query(collection(db, "institutions"), orderBy("createdAt", "desc")),
    []
  );
  const { data: audits } = useQuerySnapshot(() => query(collection(db, "audits")), []);

  const [tab, setTab] = useState(INSTITUTION_STATUS.PENDING);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const counts = {
    [INSTITUTION_STATUS.PENDING]: list.filter((m) => m.status === INSTITUTION_STATUS.PENDING).length,
    [INSTITUTION_STATUS.ACTIVE]: list.filter((m) => m.status === INSTITUTION_STATUS.ACTIVE).length,
    [INSTITUTION_STATUS.REJECTED]: list.filter((m) => m.status === INSTITUTION_STATUS.REJECTED)
      .length,
  };

  const visible = list.filter((m) => {
    if (tab !== "semua" && (m.status ?? INSTITUTION_STATUS.PENDING) !== tab) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${m.nama} ${m.kepalaNama ?? ""} ${m.kepalaEmail ?? ""} ${m.kota ?? ""}`
      .toLowerCase()
      .includes(q);
  });

  async function setStatus(institution, status) {
    try {
      await updateDoc(doc(db, "institutions", institution.id), {
        status,
        updatedAt: serverTimestamp(),
      });
      setBanner({
        tone: status === INSTITUTION_STATUS.ACTIVE ? "emerald" : "amber",
        text: `${institution.nama} ditandai "${INSTITUTION_STATUS_LABEL[status]}".`,
      });
    } catch (err) {
      setBanner({ tone: "red", text: err.message });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) {
      setError("Nama lembaga wajib diisi.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const payload = { ...form, nama: form.nama.trim(), updatedAt: serverTimestamp() };
      if (modal.mode === "create") {
        await addDoc(collection(db, "institutions"), {
          ...payload,
          status: INSTITUTION_STATUS.ACTIVE,
          sumber: "admin",
          createdAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "institutions", modal.data.id), payload);
      }
      setModal(null);
      setBanner({ tone: "emerald", text: "Data lembaga tersimpan." });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Menghapus lembaga lewat route handler, bukan langsung dari klien, karena
   * dokumen audit menyimpan temuan pada subkoleksi yang hanya dapat dihapus
   * menyeluruh oleh Admin SDK.
   */
  async function remove(institution) {
    const terpakai = audits.filter((a) => a.institutionId === institution.id).length;

    const peringatan =
      terpakai > 0
        ? `Hapus "${institution.nama}"?\n\nLembaga ini punya ${terpakai} dokumen audit. Seluruh dokumen audit beserta temuan dan rencana tindak lanjutnya ikut terhapus permanen.\n\nBila Anda hanya ingin menghentikannya, tekan Batal lalu pakai tombol Tolak agar riwayatnya tetap utuh.`
        : `Hapus data lembaga "${institution.nama}"?`;

    if (!confirm(peringatan)) return;

    setBusy(true);
    try {
      const url = `/api/admin/institutions?id=${encodeURIComponent(institution.id)}${
        terpakai > 0 ? "&cascade=1" : ""
      }`;
      const body = await apiFetch(url, { method: "DELETE", headers: await authHeaders() });

      setBanner({
        tone: "amber",
        text: body.deletedAudits
          ? `${institution.nama} dihapus beserta ${body.deletedAudits} dokumen auditnya.`
          : `${institution.nama} dihapus.`,
      });
    } catch (err) {
      setBanner({ tone: "red", text: `Gagal menghapus: ${err.message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Pendaftaran & Data"
        title="Lembaga"
        description="Pendaftaran yang masuk dari formulir publik beserta seluruh satuan pendidikan yang diaudit."
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Impor Excel
            </Button>
            <Button
              onClick={() => {
                setForm(EMPTY);
                setError("");
                setModal({ mode: "create" });
              }}
            >
              + Tambah Lembaga
            </Button>
          </>
        }
      />

      {banner && (
        <Notice tone={banner.tone} className="mb-4">
          {banner.text}
        </Notice>
      )}

      {counts[INSTITUTION_STATUS.PENDING] > 0 && (
        <Notice tone="amber" className="mb-4">
          <b>{counts[INSTITUTION_STATUS.PENDING]} pendaftaran menunggu verifikasi.</b> Periksa
          datanya, lalu tandai Terverifikasi agar lembaga dapat dibuatkan dokumen audit.
        </Notice>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              {
                value: INSTITUTION_STATUS.PENDING,
                label: "Menunggu",
                count: counts[INSTITUTION_STATUS.PENDING] || null,
              },
              {
                value: INSTITUTION_STATUS.ACTIVE,
                label: "Terverifikasi",
                count: counts[INSTITUTION_STATUS.ACTIVE] || null,
              },
              {
                value: INSTITUTION_STATUS.REJECTED,
                label: "Ditolak",
                count: counts[INSTITUTION_STATUS.REJECTED] || null,
              },
              { value: "semua", label: "Semua", count: list.length || null },
            ]}
          />
          <Input
            placeholder="Cari nama lembaga, kepala sekolah, atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto sm:max-w-xs"
          />
        </div>
      </Card>

      <Card className="p-0">
        <Table
          head={["Lembaga", "Kepala Sekolah", "Kontak", "Status", "Didaftarkan", "Aksi"]}
          empty={loading ? "Memuat..." : "Tidak ada lembaga pada tampilan ini."}
        >
          {visible.length > 0
            ? visible.map((m) => (
                <Row key={m.id}>
                  <Td>
                    <div className="font-semibold text-slate-800">{m.nama}</div>
                    <div className="text-xs text-slate-500">
                      {[m.jenjang, m.kota].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </Td>
                  <Td className="text-slate-700">{m.kepalaNama || "-"}</Td>
                  <Td className="text-slate-600">
                    <div className="break-all">{m.kepalaEmail || "-"}</div>
                    {m.kepalaWhatsapp && (
                      <a
                        href={`https://wa.me/${m.kepalaWhatsapp.replace(/\D/g, "").replace(/^0/, "62")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        {m.kepalaWhatsapp}
                      </a>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={INSTITUTION_STATUS_TONE[m.status] ?? "amber"}>
                      {INSTITUTION_STATUS_LABEL[m.status] ?? "Menunggu Verifikasi"}
                    </Badge>
                  </Td>
                  <Td className="text-slate-500">
                    {formatDate(m.createdAt)}
                    <div className="text-xs text-slate-400">
                      {m.sumber === "publik" ? "formulir publik" : "input admin"}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {m.status !== INSTITUTION_STATUS.ACTIVE && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-emerald-700 hover:bg-emerald-50"
                          onClick={() => setStatus(m, INSTITUTION_STATUS.ACTIVE)}
                        >
                          Verifikasi
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setForm({ ...EMPTY, ...m });
                          setError("");
                          setModal({ mode: "edit", data: m });
                        }}
                      >
                        Ubah
                      </Button>
                      {m.status !== INSTITUTION_STATUS.REJECTED && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStatus(m, INSTITUTION_STATUS.REJECTED)}
                        >
                          Tolak
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => remove(m)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </Td>
                </Row>
              ))
            : null}
        </Table>
      </Card>

      <ExcelImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Impor Lembaga dari Excel"
        description="Tambahkan banyak satuan pendidikan sekaligus lewat satu berkas."
        endpoint="/api/admin/institutions/import"
        templateName="template-impor-lembaga-sim-ami.xlsx"
        satuan="lembaga"
        limitNote="Format .xlsx, maksimal 2 MB dan 300 baris. Berkas diperiksa lebih dulu — belum ada data yang disimpan pada tahap ini."
        rowMeta={(r) =>
          [r.kota, r.statusLembaga ? INSTITUTION_STATUS_LABEL[r.statusLembaga] : null]
            .filter(Boolean)
            .join(" · ")
        }
        successNote="Lengkapi data yang masih kosong lewat tombol Ubah pada tiap barisnya."
        onFinished={(hasil) =>
          setBanner({
            tone: hasil.gagal > 0 ? "amber" : "emerald",
            text: `Impor selesai: ${hasil.dibuat} lembaga ditambahkan, ${hasil.gagal} baris dilewati.`,
          })
        }
      />

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        size="lg"
        title={modal?.mode === "create" ? "Tambah Lembaga" : "Ubah Data Lembaga"}
        footer={
          <>
            <Button variant="soft" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button form="lembaga-form" type="submit" disabled={busy}>
              {busy && <Spinner />} Simpan
            </Button>
          </>
        }
      >
        <form id="lembaga-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama lembaga" required className="sm:col-span-2">
              <Input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                placeholder="Nama satuan pendidikan"
              />
            </Field>
            <Field label="Jenjang">
              <Select
                value={form.jenjang}
                onChange={(e) => setForm({ ...form, jenjang: e.target.value })}
              >
                <option value="">Pilih jenjang</option>
                {JENJANG.map((j) => (
                  <option key={j}>{j}</option>
                ))}
              </Select>
            </Field>
            <Field label="NPSN / NSM">
              <Input value={form.npsn} onChange={(e) => setForm({ ...form, npsn: e.target.value })} />
            </Field>
            <Field label="Nama kepala sekolah">
              <Input
                value={form.kepalaNama}
                onChange={(e) => setForm({ ...form, kepalaNama: e.target.value })}
              />
            </Field>
            <Field label="Email kepala sekolah">
              <Input
                type="email"
                value={form.kepalaEmail}
                onChange={(e) => setForm({ ...form, kepalaEmail: e.target.value })}
              />
            </Field>
            <Field label="Nomor WhatsApp">
              <Input
                value={form.kepalaWhatsapp}
                onChange={(e) => setForm({ ...form, kepalaWhatsapp: e.target.value })}
              />
            </Field>
            <Field label="Kota / Kabupaten">
              <Input value={form.kota} onChange={(e) => setForm({ ...form, kota: e.target.value })} />
            </Field>
            <Field label="Alamat" className="sm:col-span-2">
              <Input
                value={form.alamat}
                onChange={(e) => setForm({ ...form, alamat: e.target.value })}
              />
            </Field>
            <Field label="Catatan internal" className="sm:col-span-2">
              <Textarea
                rows={2}
                value={form.catatan}
                onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                placeholder="Tidak ditampilkan ke pihak lembaga."
              />
            </Field>
          </div>
          {error && <Notice tone="red">{error}</Notice>}
        </form>
      </Modal>
    </>
  );
}
