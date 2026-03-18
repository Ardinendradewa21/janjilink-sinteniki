"use client";

// ─── ActionItems ──────────────────────────────────────────────────────────────
// Komponen daftar tindakan (checklist) pasca-meeting.
//
// Fitur:
//  • Tampilkan semua action item dengan checkbox selesai/belum
//  • Tambah item baru via input teks + Enter atau tombol Tambah
//  • Hapus item dengan tombol trash
//  • Optimistic update: UI langsung berubah sebelum server merespons
//    sehingga terasa lebih responsif
//
// Props:
//  • bookingId     — ID booking pemilik daftar ini
//  • initialItems  — data action items dari DB (di-render server component)

import { useTransition, useState, useRef } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  addActionItem,
  toggleActionItem,
  deleteActionItem,
} from "@/server/actions/meeting";

// Tipe satu item dalam daftar
interface Item {
  id: string;
  text: string;
  isDone: boolean;
  order: number;
}

interface ActionItemsProps {
  bookingId: string;
  initialItems: Item[];
}

export function ActionItems({ bookingId, initialItems }: ActionItemsProps) {
  // Daftar item di state lokal — diinisialisasi dari data server,
  // lalu diperbarui secara optimistik saat user berinteraksi.
  const [items, setItems] = useState<Item[]>(initialItems);

  // Teks input untuk item baru
  const [newText, setNewText] = useState("");

  // useTransition untuk operasi tambah — agar tombol bisa di-disable saat loading
  const [isAdding, startAdding] = useTransition();

  // Set ID item yang sedang diproses (toggle/hapus) — untuk disable sementara
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Ref ke input agar bisa di-focus ulang setelah tambah item
  const inputRef = useRef<HTMLInputElement>(null);

  // ─── handleAdd ──────────────────────────────────────────────────────────────
  // Tambah action item baru. Pakai optimistic update: item muncul di UI
  // langsung dengan ID sementara, lalu diganti ID asli dari server.
  function handleAdd() {
    const trimmed = newText.trim();
    if (!trimmed) return;

    // ID sementara (optimistik) — diganti saat server merespons
    const tempId = `temp_${Date.now()}`;

    // Optimistic: tambahkan dulu ke state lokal sebelum await server
    const optimisticItem: Item = {
      id: tempId,
      text: trimmed,
      isDone: false,
      order: items.length,
    };
    setItems((prev) => [...prev, optimisticItem]);
    setNewText(""); // kosongkan input segera

    startAdding(async () => {
      const result = await addActionItem(bookingId, trimmed);

      if (result.error) {
        // Rollback: hapus item optimistik jika server gagal
        setItems((prev) => prev.filter((i) => i.id !== tempId));
        toast.error(result.error);
      } else if (result.id) {
        // Ganti ID sementara dengan ID asli dari database
        setItems((prev) =>
          prev.map((i) => (i.id === tempId ? { ...i, id: result.id! } : i))
        );
      }

      // Kembalikan fokus ke input agar user bisa langsung ketik lagi
      inputRef.current?.focus();
    });
  }

  // ─── handleToggle ────────────────────────────────────────────────────────────
  // Toggle status selesai/belum untuk satu item.
  // Optimistic: ubah state lokal dulu, rollback jika server gagal.
  async function handleToggle(id: string, currentDone: boolean) {
    if (processingId) return; // hindari double-click
    setProcessingId(id);

    const newDone = !currentDone;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isDone: newDone } : i))
    );

    const result = await toggleActionItem(id, newDone);

    if (result.error) {
      // Rollback jika server gagal
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isDone: currentDone } : i))
      );
      toast.error(result.error);
    }

    setProcessingId(null);
  }

  // ─── handleDelete ─────────────────────────────────────────────────────────
  // Hapus satu action item. Optimistic: hilangkan dari UI dulu,
  // kembalikan jika server gagal.
  async function handleDelete(id: string) {
    if (processingId) return;
    setProcessingId(id);

    // Simpan item sebelum dihapus untuk kemungkinan rollback
    const deleted = items.find((i) => i.id === id);

    // Optimistic: hapus dari state lokal segera
    setItems((prev) => prev.filter((i) => i.id !== id));

    const result = await deleteActionItem(id);

    if (result.error) {
      // Rollback: kembalikan item yang gagal dihapus
      if (deleted) setItems((prev) => [...prev, deleted]);
      toast.error(result.error);
    }

    setProcessingId(null);
  }

  // Hitung progress: berapa item yang sudah selesai
  const doneCount = items.filter((i) => i.isDone).length;

  return (
    <div className="space-y-3">
      {/* Header + progress */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-stone-700">
          Action Items
        </label>
        {items.length > 0 && (
          <span className="text-xs text-stone-400">
            {doneCount}/{items.length} selesai
          </span>
        )}
      </div>

      {/* Progress bar: hanya tampil jika ada items */}
      {items.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Daftar action items */}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-lg border border-stone-100 bg-white px-3 py-2.5 transition-colors"
          >
            {/* Checkbox toggle selesai/belum */}
            <input
              type="checkbox"
              checked={item.isDone}
              onChange={() => handleToggle(item.id, item.isDone)}
              disabled={processingId === item.id}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
            />

            {/* Teks item — coret jika sudah selesai */}
            <span
              className={`flex-1 text-sm leading-relaxed ${
                item.isDone ? "text-stone-400 line-through" : "text-stone-700"
              }`}
            >
              {item.text}
            </span>

            {/* Tombol hapus — muncul saat hover */}
            <button
              onClick={() => handleDelete(item.id)}
              disabled={!!processingId}
              title="Hapus action item"
              className="shrink-0 rounded p-0.5 text-stone-300 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {/* Input tambah item baru */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          // Enter shortcut: tambah item tanpa harus klik tombol
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Tambah action item baru..."
          disabled={isAdding}
          className="flex-1 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:opacity-50"
        />
        <button
          onClick={handleAdd}
          disabled={isAdding || !newText.trim()}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Tambah
        </button>
      </div>
    </div>
  );
}
