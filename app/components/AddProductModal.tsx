"use client";

import { useState, useEffect } from "react";
import type { InventoryCategory } from "@/lib/types";
import clsx from "clsx";

const NEW_CATEGORY_SENTINEL = "__new__";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function AddProductModal({ onClose, onCreated }: Props) {
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/categories");
        const data = await res.json();
        setCategories(data.categories ?? []);
      } catch {
        // non-fatal — user can still type a new category
      } finally {
        setLoadingCats(false);
      }
    })();
  }, []);

  const isNewCategory = categoryId === NEW_CATEGORY_SENTINEL;

  const handleSubmit = async () => {
    setError("");
    if (!name.trim()) {
      setError("Vui lòng nhập tên sản phẩm");
      return;
    }
    if (!unit.trim()) {
      setError("Vui lòng nhập đơn vị tính");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn danh mục");
      return;
    }
    if (isNewCategory && !newCategoryName.trim()) {
      setError("Vui lòng nhập tên danh mục mới");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim(),
          category_id: isNewCategory ? null : parseInt(categoryId, 10),
          new_category_name: isNewCategory ? newCategoryName.trim() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Có lỗi xảy ra");
        return;
      }
      onCreated();
    } catch {
      setError("Không thể kết nối máy chủ");
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  const inputCls = clsx(
    "border border-gray-200 rounded-lg px-3 py-2 text-sm w-full outline-none",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all",
  );

  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-product-title"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-[440px] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-blue-50">
          <h2 id="add-product-title" className="text-base font-bold">
            ➕ Thêm sản phẩm mới
          </h2>
          <button
            className="text-lg text-gray-400 leading-none px-1.5 py-0.5 rounded hover:bg-gray-200 hover:text-gray-800 transition-colors"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 flex flex-col gap-3.5">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ap-name"
              className="text-[13px] font-medium text-gray-600"
            >
              Tên sản phẩm
            </label>
            <input
              id="ap-name"
              type="text"
              placeholder="Nhập tên sản phẩm..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className={inputCls}
              autoComplete="off"
              autoFocus
            />
          </div>

          {/* Unit */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ap-unit"
              className="text-[13px] font-medium text-gray-600"
            >
              Đơn vị tính
            </label>
            <input
              id="ap-unit"
              type="text"
              placeholder="kg, thùng, chai, hộp..."
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className={inputCls}
              autoComplete="off"
            />
          </div>

          {/* Category */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="ap-category"
              className="text-[13px] font-medium text-gray-600"
            >
              Danh mục
            </label>
            {loadingCats ? (
              <div className="text-[13px] text-gray-400 flex items-center gap-2 py-1">
                <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
                Đang tải danh mục...
              </div>
            ) : (
              <select
                id="ap-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={clsx(inputCls, "bg-white cursor-pointer")}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CATEGORY_SENTINEL}>
                  ➕ Thêm danh mục mới...
                </option>
              </select>
            )}
          </div>

          {/* New category name */}
          {isNewCategory && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ap-new-cat"
                className="text-[13px] font-medium text-gray-600"
              >
                Tên danh mục mới
              </label>
              <input
                id="ap-new-cat"
                type="text"
                placeholder="Nhập tên danh mục..."
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                className={inputCls}
                autoComplete="off"
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-[13px]">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex justify-end gap-2.5">
          <button
            className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
            onClick={onClose}
            disabled={submitting}
          >
            Huỷ
          </button>
          <button
            className="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Đang lưu..." : "Thêm sản phẩm"}
          </button>
        </div>
      </div>
    </div>
  );
}
