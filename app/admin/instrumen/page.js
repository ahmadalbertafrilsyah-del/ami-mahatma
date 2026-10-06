"use client";

import { useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { DEFAULT_INSTRUMENT } from "@/lib/default-instrument";
import { DEFAULT_RUBRICS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import {
  Button,
  Card,
  Notice,
  PageHeader,
  Spinner,
  Table,
  Td,
  Row,
} from "@/components/ui";

export default function InstrumenPage() {
  const { data: instruments, loading } = useQuerySnapshot(
    () => query(collection(db, "instruments"), orderBy("createdAt", "desc")),
    []
  );
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState("");
  const [error, setError] = useState("");

  function countIndicators(instrument) {
    return (instrument.areas || []).reduce((sum, a) => sum + (a.questions?.length || 0), 0);
  }

  async function seedDefault() {
    setBusy(true);
    setError("");
    setBanner("");
    try {
      await addDoc(collection(db, "instruments"), {
        ...DEFAULT_INSTRUMENT,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setBanner("Instrumen bawaan berhasil ditambahkan.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(instrument) {
    setBusy(true);
    try {
      const { id, createdAt, updatedAt, ...rest } = instrument;
      await addDoc(collection(db, "instruments"), {
        ...rest,
        nama: `${rest.nama} (salinan)`,
        versi: `${rest.versi || "1.0"}-copy`,
        rubrics: rest.rubrics?.length ? rest.rubrics : DEFAULT_RUBRICS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setBanner("Instrumen disalin. Sunting salinan tanpa mengganggu periode berjalan.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(instrument) {
    const used = await getDocs(
      query(collection(db, "periods"), where("instrumentId", "==", instrument.id))
    );
    if (!used.empty) {
      setError(
        `Instrumen ini dipakai pada ${used.size} periode AMI dan tidak dapat dihapus. Salin lalu sunting salinannya.`
      );
      return;
    }
    if (!confirm(`Hapus instrumen "${instrument.nama}"?`)) return;
    try {
      await deleteDoc(doc(db, "instruments", instrument.id));
      setBanner("Instrumen dihapus.");
    } catch (err) {
      setError(`Gagal menghapus instrumen: ${err.message}`);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Perangkat Audit"
        title="Instrumen AMI"
        description="Kelola area, indikator, kriteria, dan rekomendasi awal yang dipakai pada setiap periode."
        actions={
          <Button onClick={seedDefault} disabled={busy}>
            {busy && <Spinner />} Seed Instrumen Bawaan
          </Button>
        }
      />

      {banner && (
        <Notice tone="emerald" className="mb-4">
          {banner}
        </Notice>
      )}
      {error && (
        <Notice tone="red" className="mb-4">
          {error}
        </Notice>
      )}

      {!loading && !instruments.length && (
        <Notice tone="blue" className="mb-4">
          Belum ada instrumen. Klik <b>Seed Instrumen Bawaan</b> untuk memuat 6 area dan 18 indikator
          standar, lalu sunting sesuai kebutuhan.
        </Notice>
      )}

      <Card className="p-0">
        <Table
          head={["Instrumen", "Versi", "Area", "Indikator", "Diperbarui", "Aksi"]}
          empty={loading ? "Memuat..." : "Belum ada instrumen."}
        >
          {instruments.length > 0
            ? instruments.map((i) => (
                <Row key={i.id}>
                  <Td>
                    <div className="font-bold text-slate-800">{i.nama}</div>
                    {i.deskripsi && (
                      <div className="max-w-md text-xs text-slate-500">{i.deskripsi}</div>
                    )}
                  </Td>
                  <Td className="text-slate-600">{i.versi}</Td>
                  <Td className="text-slate-600">{i.areas?.length ?? 0}</Td>
                  <Td className="text-slate-600">{countIndicators(i)}</Td>
                  <Td className="text-slate-500">{formatDate(i.updatedAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/admin/instrumen/${i.id}`}>
                        <Button variant="ghost" size="sm">
                          Sunting
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => duplicate(i)}
                        disabled={busy}
                      >
                        Salin
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm" className="text-red-600 hover:bg-red-50"
                        onClick={() => remove(i)}
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
    </>
  );
}
