"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { InventoryItem, ActivityEntry } from "@/lib/types";
import { groupByCategory } from "@/lib/utils";
import InventoryTable from "../components/InventoryTable";
import ActivityModal from "../components/ActivityModal";
import AddProductModal from "../components/AddProductModal";
import { useAtom } from "jotai";
import { historyCacheAtom, selectedMonthAtom } from "../store/history";

interface ModalState {
  open: boolean;
  type: "import" | "export";
  item: InventoryItem | null;
}

export default function InventoryPage() {
  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useAtom(selectedMonthAtom);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isCurrentMonth, setIsCurrentMonth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const [modal, setModal] = useState<ModalState>({
    open: false,
    type: "import",
    item: null,
  });
  const [modalCount, setModalCount] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalDate, setModalDate] = useState("");
  const [modalError, setModalError] = useState("");
  const [stockAtDate, setStockAtDate] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [historyCache, setHistoryCache] = useAtom(historyCacheAtom);
  const [historyLoading, setHistoryLoading] = useState<Set<number>>(new Set());

  const monthInputRef = useRef<HTMLInputElement>(null);

  const [showAddProduct, setShowAddProduct] = useState(false);

  const [ymYear, ymMonth] = selectedMonth.split("-");
  const month = parseInt(ymMonth, 10);
  const year = parseInt(ymYear, 10);

  useEffect(() => {
    setModalDate(todayValue());
  }, []);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setFetchError("");
    setExpanded(new Set());
    setHistoryCache(new Map());
    try {
      const res = await fetch(`/api/inventory?month=${month}&year=${year}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFetchError(data.error ?? "Lỗi tải dữ liệu");
        return;
      }
      const data = await res.json();
      setItems(data.items ?? []);
      setIsCurrentMonth(data.isCurrentMonth ?? false);
    } catch {
      setFetchError("Không thể kết nối tới cơ sở dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const toggleExpand = async (itemId: number) => {
    const next = new Set(expanded);
    if (next.has(itemId)) {
      next.delete(itemId);
      setExpanded(next);
      return;
    }
    next.add(itemId);
    setExpanded(next);
    if (historyCache.has(itemId)) return;
    setHistoryLoading((prev) => new Set(prev).add(itemId));
    try {
      const res = await fetch(
        `/api/activity/history?inventory_id=${itemId}&month=${month}&year=${year}`,
      );
      const data = await res.json();
      setHistoryCache((prev) =>
        new Map(prev).set(itemId, data.activities ?? []),
      );
    } catch {
      setHistoryCache((prev) => new Map(prev).set(itemId, []));
    } finally {
      setHistoryLoading((prev) => {
        const s = new Set(prev);
        s.delete(itemId);
        return s;
      });
    }
  };

  // Fetch stock-at-date whenever the export modal is open and date changes
  useEffect(() => {
    if (!modal.open || modal.type !== "export" || !modal.item || !modalDate) {
      setStockAtDate(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/inventory/stock-at-date?inventory_id=${modal.item.id}&date=${modalDate}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setStockAtDate(d.stock ?? null);
      })
      .catch(() => {
        if (!cancelled) setStockAtDate(null);
      });
    return () => {
      cancelled = true;
    };
  }, [modal.open, modal.type, modal.item, modalDate]);

  const todayValue = () => new Date().toISOString().slice(0, 10);

  const openModal = (
    e: React.MouseEvent,
    type: "import" | "export",
    item: InventoryItem,
  ) => {
    e.stopPropagation();
    setModal({ open: true, type, item });
    setModalCount("");
    setModalDescription("");
    setModalError("");
  };

  const closeModal = () => {
    if (submitting) return;
    setModal({ open: false, type: "import", item: null });
  };

  const handleSubmit = async () => {
    if (!modal.item) return;
    const count = parseFloat(modalCount);
    if (isNaN(count) || count <= 0) {
      setModalError("Vui lòng nhập số lượng hợp lệ (> 0)");
      return;
    }
    setSubmitting(true);
    setModalError("");
    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventory_id: modal.item.id,
          count_change: count,
          description: modalDescription.trim() || undefined,
          type: modal.type,
          created_at: modalDate || todayValue(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      setHistoryCache((prev) => {
        const m = new Map(prev);
        m.delete(modal.item!.id);
        return m;
      });
      closeModal();
      fetchInventory();
    } catch {
      setModalError("Không thể kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const [search, setSearch] = useState("");

  const groups = groupByCategory(
    search.trim()
      ? items.filter((i) =>
          i.name.toLowerCase().includes(search.trim().toLowerCase()),
        )
      : items,
  );

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-sm text-gray-800">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center gap-6 flex-wrap">
          <h1 className="text-xl font-bold text-blue-600 whitespace-nowrap">
            Quản lý xuất nhập kho
          </h1>
          {/* Search bar */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
              🔍
            </span>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-9 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all bg-white"
              autoComplete="off"
            />
            {search && (
              <button
                className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            onClick={() => setShowAddProduct(true)}
          >
            Thêm sản phẩm
          </button>
          <div className="flex items-center gap-2.5 ml-auto">
            {/* Custom Vietnamese display — click triggers native picker */}
            <div
              className="relative inline-flex border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-800 bg-white font-semibold cursor-pointer hover:border-blue-400 transition-colors select-none"
              onClick={() => monthInputRef.current?.showPicker()}
            >
              Tháng {String(month).padStart(2, "0")}/{year}
              <input
                ref={monthInputRef}
                id="month-select"
                type="month"
                value={selectedMonth}
                max={currentMonthValue}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                tabIndex={-1}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-[1024px] w-full mx-auto my-6 px-6">
        {fetchError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            <strong>Lỗi:</strong> {fetchError}
          </div>
        )}

        {/* Search bar removed — moved to header */}

        {loading ? (
          <div className="flex items-center gap-3 px-12 py-12 text-gray-400 text-[15px]">
            <div className="w-[22px] h-[22px] border-[3px] border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <span>Đang tải dữ liệu...</span>
          </div>
        ) : (
          <InventoryTable
            groups={groups}
            isCurrentMonth={isCurrentMonth}
            expanded={expanded}
            historyCache={historyCache}
            historyLoading={historyLoading}
            onToggle={toggleExpand}
            onOpenModal={openModal}
          />
        )}
      </main>

      {/* Add Product Modal */}
      {showAddProduct && (
        <AddProductModal
          onClose={() => setShowAddProduct(false)}
          onCreated={() => {
            setShowAddProduct(false);
            fetchInventory();
          }}
        />
      )}

      {/* Activity Modal */}
      {modal.open && modal.item && (
        <ActivityModal
          type={modal.type}
          item={modal.item}
          count={modalCount}
          description={modalDescription}
          date={modalDate}
          stockAtDate={stockAtDate}
          error={modalError}
          submitting={submitting}
          onCountChange={setModalCount}
          onDescriptionChange={setModalDescription}
          onDateChange={setModalDate}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
