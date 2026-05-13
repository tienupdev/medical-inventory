import React from "react";
import type { InventoryItem, ActivityEntry } from "@/lib/types";
import CategoryGroup from "./CategoryGroup";

interface Group {
  name: string;
  items: InventoryItem[];
}

interface Props {
  groups: Group[];
  isCurrentMonth: boolean;
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

export default function InventoryTable({
  groups,
  isCurrentMonth,
  expanded,
  historyCache,
  historyLoading,
  onToggle,
  onOpenModal,
}: Props) {
  // +1 for the chevron column
  const colSpan = 8;

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto max-w-[1024px]">
      <table className="w-full border-collapse min-w-[700px]">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="w-8" />
            <th className="px-3.5 min-w-[450px] py-3 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
              Tên hàng
            </th>
            <th className="max-w-[50px] px-3.5 py-3 text-left text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
              ĐVT
            </th>
            <th className="px-3.5 py-3 text-right text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
              Tồn đầu
            </th>
            <th className="px-3.5 py-3 text-right text-xs font-semibold uppercase whitespace-nowrap text-green-700">
              Nhập
            </th>
            <th className="px-3.5 py-3 text-right text-xs font-semibold uppercase whitespace-nowrap text-red-600">
              Xuất
            </th>
            <th className="px-3.5 py-3 text-right text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
              Tồn cuối
            </th>
            <th className="px-3.5 py-3 text-center text-xs font-semibold uppercase text-gray-500 whitespace-nowrap">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td
                colSpan={colSpan}
                className="text-center px-10 py-10 text-gray-400"
              >
                Không có dữ liệu
              </td>
            </tr>
          ) : (
            groups.map((group) => (
              <CategoryGroup
                key={group.name}
                group={group}
                isCurrentMonth={isCurrentMonth}
                colSpan={colSpan}
                expanded={expanded}
                historyCache={historyCache}
                historyLoading={historyLoading}
                onToggle={onToggle}
                onOpenModal={onOpenModal}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
