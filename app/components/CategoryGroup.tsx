import React from "react";
import type { InventoryItem, ActivityEntry } from "@/lib/types";
import InventoryRow from "./InventoryRow";

interface Group {
  name: string;
  items: InventoryItem[];
}

interface Props {
  group: Group;
  isCurrentMonth: boolean;
  colSpan: number;
  expanded: Set<number>;
  historyCache: Map<number, ActivityEntry[]>;
  historyLoading: Set<number>;
  onToggle: (id: number) => void;
  onOpenModal: (
    e: React.MouseEvent,
    type: "import" | "export",
    item: InventoryItem,
  ) => void;
}

export default function CategoryGroup({
  group,
  isCurrentMonth,
  colSpan,
  expanded,
  historyCache,
  historyLoading,
  onToggle,
  onOpenModal,
}: Props) {
  return (
    <React.Fragment>
      {/* Category header row */}
      <tr className="bg-gray-100">
        <td
          colSpan={colSpan}
          className="px-2 py-1.5 text-xs font-bold uppercase text-blue-600 border-b border-gray-200"
        >
          {group.name}
        </td>
      </tr>

      {/* Item rows */}
      {group.items.map((item) => (
        <InventoryRow
          key={item.id}
          item={item}
          isOpen={expanded.has(item.id)}
          isLoadingHist={historyLoading.has(item.id)}
          history={historyCache.get(item.id) ?? []}
          colSpan={colSpan}
          isCurrentMonth={isCurrentMonth}
          onToggle={() => onToggle(item.id)}
          onOpenModal={onOpenModal}
        />
      ))}
    </React.Fragment>
  );
}
