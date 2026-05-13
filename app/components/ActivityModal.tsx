import type { InventoryItem } from "@/lib/types";
import { fmt } from "@/lib/utils";
import clsx from "clsx";

interface Props {
  type: "import" | "export";
  item: InventoryItem;
  count: string;
  description: string;
  date: string;
  error: string;
  submitting: boolean;
  onCountChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onDateChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function ActivityModal({
  type,
  item,
  count,
  description,
  date,
  error,
  submitting,
  onCountChange,
  onDescriptionChange,
  onDateChange,
  onClose,
  onSubmit,
}: Props) {
  const isImport = type === "import";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSubmit();
    if (e.key === "Escape") onClose();
  };

  const inputCls = clsx(
    "border border-gray-200 rounded-lg px-3 py-2 text-sm w-full outline-none",
    "focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all",
    // do not allow auto suggestion
  );

  // Fix: only attach handleKeyDown to the inner modal, not the overlay,
  // so keyboard events don't bubble up and fire onSubmit twice.
  return (
    <div
      className="fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-[440px] overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 ${
            isImport ? "bg-green-50" : "bg-orange-50"
          }`}
        >
          <h2 id="modal-title" className="text-base font-bold">
            {isImport ? "📥 Nhập kho" : "📤 Xuất kho"}
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
          <p className="text-base font-semibold text-gray-800">{item.name}</p>

          {!isImport && (
            <p className="text-[13px] text-gray-600">
              Tồn hiện tại:{" "}
              <strong className={item.count < 3 ? "text-red-600" : ""}>
                {fmt(item.count)} {item.unit}
              </strong>
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-count"
              className="text-[13px] font-medium text-gray-600 flex items-center gap-1.5"
            >
              Số lượng
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-normal">
                {item.unit}
              </span>
            </label>
            <input
              id="modal-count"
              type="number"
              min="0.01"
              step="any"
              placeholder="Nhập số lượng..."
              value={count}
              onChange={(e) => onCountChange(e.target.value)}
              className={inputCls}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-desc"
              className="text-[13px] font-medium text-gray-600"
            >
              Ghi chú (tuỳ chọn)
            </label>
            <input
              id="modal-desc"
              type="text"
              placeholder="Nhập ghi chú..."
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className={inputCls}
              autoComplete="off"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="modal-date"
              className="text-[13px] font-medium text-gray-600"
            >
              Ngày
            </label>
            <input
              id="modal-date"
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              className={inputCls}
            />
          </div>

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
            className={`inline-flex items-center justify-center px-5 py-2 text-sm font-semibold rounded-md disabled:opacity-55 disabled:cursor-not-allowed transition-colors ${
              isImport
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-orange-100 text-orange-600 hover:bg-orange-200"
            }`}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Đang lưu..."
              : isImport
                ? "Xác nhận nhập"
                : "Xác nhận xuất"}
          </button>
        </div>
      </div>
    </div>
  );
}
