"use client";

import { useState } from "react";
import { collection, orderBy, query } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useQuerySnapshot } from "@/lib/hooks";
import { ROLES, ROLE_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { authHeaders, useAuth } from "@/components/auth-provider";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Notice,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Row,
} from "@/components/ui";

const EMPTY = { nama: "", email: "", password: "", role: ROLES.AUDITOR, telepon: "" };

export default function PenggunaPage() {
  const { profile } = useAuth();
  const { data: users, loading } = useQuerySnapshot(
    () => query(collection(db, "users"), orderBy("nama")),
    []
  );

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', data }
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null);

  const visible = users.filter((u) => {
    if (filter !== "all" && u.role !== filter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.nama} ${u.email}`.toLowerCase().includes(q);
  });

  function openCreate() {
    setForm(EMPTY);
    setError("");
    setModal({ mode: "create" });
  }

  function openEdit(user) {
    setForm({
      nama: user.nama ?? "",
      email: user.email ?? "",
      password: "",
      role: user.role,
      telepon: user.telepon ?? "",
    });
    setError("");
    setModal({ mode: "edit", data: user });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const isCreate = modal.mode === "create";
      const payload = isCreate
        ? { ...form }
        : {
            uid: modal.data.uid,
            nama: form.nama,
            role: form.role,
            telepon: form.telepon,
            ...(form.password ? { password: form.password } : {}),
          };

      const res = await fetch("/api/admin/users", {
        method: isCreate ? "POST" : "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Gagal menyimpan pengguna.");

      setBanner({
        tone: "emerald",
        text: isCreate ? `Akun ${form.nama} berhasil dibuat.` : "Perubahan pengguna tersimpan.",
      });
      setModal(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(user) {
    const nextActive = user.active === false;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify({ uid: user.uid, active: nextActive }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setBanner({
        tone: "emerald",
        text: nextActive ? `${user.nama} diaktifkan kembali.` : `${user.nama} dinonaktifkan.`,
      });
    } catch (err) {
      setBanner({ tone: "red", text: err.message });
    }
  }

  async function removeUser(user) {
    if (!confirm(`Hapus akun ${user.nama} (${user.email}) secara permanen?`)) return;
    try {
      const res = await fetch(`/api/admin/users?uid=${encodeURIComponent(user.uid)}`, {
        method: "DELETE",
        headers: await authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setBanner({ tone: "emerald", text: `Akun ${user.nama} dihapus.` });
    } catch (err) {
      setBanner({ tone: "red", text: err.message });
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Manajemen Akses"
        title="Pengguna"
        description="Kelola akun administrator dan auditor beserta peran serta status aktifnya."
        actions={<Button onClick={openCreate}>+ Tambah Pengguna</Button>}
      />

      {banner && (
        <Notice tone={banner.tone} className="mb-4">
          {banner.text}
        </Notice>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Cari nama atau email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:max-w-45">
            <option value="all">Semua peran</option>
            {Object.values(ROLES).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card className="p-0">
        <Table
          head={["Nama", "Peran", "Telepon", "Status", "Dibuat", "Aksi"]}
          empty={loading ? "Memuat..." : "Belum ada pengguna yang cocok."}
        >
          {visible.length > 0
            ? visible.map((u) => (
                <Row key={u.id}>
                  <Td>
                    <div className="font-bold text-slate-800">{u.nama}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        u.role === ROLES.ADMIN ? "red" : "blue"
                      }
                    >
                      {ROLE_LABEL[u.role] ?? u.role}
                    </Badge>
                  </Td>
                  <Td className="text-slate-600">{u.telepon || "-"}</Td>
                  <Td>
                    <Badge tone={u.active === false ? "slate" : "emerald"}>
                      {u.active === false ? "Nonaktif" : "Aktif"}
                    </Badge>
                  </Td>
                  <Td className="text-slate-500">{formatDate(u.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        Ubah
                      </Button>
                      {u.uid !== profile?.uid && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActive(u)}
                          >
                            {u.active === false ? "Aktifkan" : "Nonaktifkan"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm" className="text-red-600 hover:bg-red-50"
                            onClick={() => removeUser(u)}
                          >
                            Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  </Td>
                </Row>
              ))
            : null}
        </Table>
      </Card>

      <Modal
        open={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal?.mode === "create" ? "Tambah Pengguna" : "Ubah Pengguna"}
        description={
          modal?.mode === "create"
            ? "Akun dibuat langsung di Firebase Authentication beserta profil perannya."
            : modal?.data?.email
        }
        footer={
          <>
            <Button variant="soft" onClick={() => setModal(null)}>
              Batal
            </Button>
            <Button form="user-form" type="submit" disabled={busy}>
              {busy && <Spinner />} Simpan
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nama lengkap" required>
            <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
          </Field>
          <Field
            label="Email"
            required={modal?.mode === "create"}
            hint={modal?.mode === "edit" ? "Email tidak dapat diubah." : null}
          >
            <Input
              type="email"
              value={form.email}
              disabled={modal?.mode === "edit"}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field
            label={modal?.mode === "create" ? "Kata sandi" : "Kata sandi baru"}
            required={modal?.mode === "create"}
            hint={
              modal?.mode === "edit"
                ? "Kosongkan bila tidak ingin mengubah."
                : "Minimal 8 karakter."
            }
          >
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Peran" required>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {Object.values(ROLES).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Telepon">
              <Input
                value={form.telepon}
                onChange={(e) => setForm({ ...form, telepon: e.target.value })}
                placeholder="08xx"
              />
            </Field>
          </div>
          {error && <Notice tone="red">{error}</Notice>}
        </form>
      </Modal>
    </>
  );
}
