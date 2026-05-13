import type { ActivityEntry, InventoryItem } from "@/lib/types";
import { fmt } from "@/lib/utils";
import clsx from "clsx";
import React from "react";
import HistoryPanel from "./HistoryPanel";

interface Props {
  item: InventoryItem;
  isOpen: boolean;
  isLoadingHist: boolean;
  history: ActivityEntry[];
  colSpan: number;
  isCurrentMonth: boolean;
  onToggle: () => void;
  onOpenModal: (
    e: React.MouseEvent,
    type: "import" | "export",
    item: InventoryItem,
  ) => void;
}

export default function InventoryRow({
  item,
  isOpen,
  isLoadingHist,
  history,
  colSpan,
  isCurrentMonth,
  onToggle,
  onOpenModal,
}: Props) {
  const isLow = item.closing_stock < 3 && isCurrentMonth;

  const tdCls = "px-3.5 py-1 border-b border-gray-100 align-middle";

  return (
    <React.Fragment>
      <tr
        className={clsx(
          "cursor-pointer transition-colors duration-100",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-blue-500",
          !isLow && isOpen ? "bg-blue-50" : "",
          !isLow && !isOpen ? "hover:bg-blue-50" : "",
          "h-[41px]",
        )}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        aria-expanded={isOpen}
      >
        {/* Chevron */}
        <td className={clsx(tdCls, "w-8 text-center pl-2.5 pr-1")}></td>

        {/* Name */}
        <td className={clsx(tdCls, isLow && "text-red-600 font-bold")}>
          {item.name}
        </td>

        {/* Unit */}
        <td className={tdCls}>{item.unit}</td>

        {/* Opening stock */}
        <td
          className={clsx(
            tdCls,
            "text-right tabular-nums",
            item.opening_stock === 0 && "text-gray-300",
          )}
        >
          {fmt(item.opening_stock)}
        </td>

        {/* Imported */}
        <td
          className={clsx(
            tdCls,
            "text-right tabular-nums font-medium",
            item.imported === 0 ? "text-gray-300" : "text-green-700",
          )}
        >
          {fmt(item.imported)}
        </td>

        {/* Exported */}
        <td
          className={clsx(
            tdCls,
            "text-right tabular-nums font-medium",
            item.exported === 0 ? "text-gray-300" : "text-orange-600",
          )}
        >
          {fmt(item.exported)}
        </td>

        {/* Closing stock */}
        <td
          className={clsx(
            tdCls,
            "text-right tabular-nums font-bold",
            isLow ? "text-red-600" : "",
          )}
        >
          {fmt(item.closing_stock)}
        </td>

        {/* Actions */}

        <td
          className={clsx(tdCls, "text-center")}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-center gap-1.5 w-[110px]">
            {isCurrentMonth && (
              <>
                <button
                  className="inline-flex items-center px-3 py-1.5 text-[13px] font-semibold rounded-md bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                  onClick={(e) => onOpenModal(e, "import", item)}
                >
                  Nhập
                </button>
                <button
                  className="inline-flex items-center px-3 py-1.5 text-[13px] font-semibold rounded-md bg-orange-100 text-orange-600 hover:bg-orange-200 disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
                  onClick={(e) => onOpenModal(e, "export", item)}
                >
                  Xuất
                </button>
              </>
            )}
          </div>
        </td>
      </tr>

      {isOpen && (
        <HistoryPanel
          isLoading={isLoadingHist}
          history={history}
          colSpan={colSpan}
        />
      )}
    </React.Fragment>
  );
}
