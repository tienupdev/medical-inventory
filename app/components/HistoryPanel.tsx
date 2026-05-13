import type { ActivityEntry } from "@/lib/types";
import { fmt, fmtDate } from "@/lib/utils";

interface Props {
  isLoading: boolean;
  history: ActivityEntry[];
  colSpan: number;
}

export default function HistoryPanel({ isLoading, history, colSpan }: Props) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="p-0 border-b border-gray-200 bg-blue-50/20"
      >
        <div className="px-9 pb-6 pt-1">
          {isLoading ? (
            <div className="flex items-center gap-2 text-gray-400 text-[13px] py-1">
              <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-[13px] text-gray-400 italic px-2.5">
              Không có giao dịch nào trong tháng này.
            </p>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase  text-gray-400">
                    Thời gian
                  </th>
                  <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase  text-gray-400">
                    Loại
                  </th>
                  <th className="px-2.5 py-1.5 text-right text-[11px] font-semibold uppercase  text-gray-400 tabular-nums">
                    Số lượng
                  </th>
                  <th className="px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase  text-gray-400">
                    Ghi chú
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => {
                  const isImport = entry.count_change > 0;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      <td className="px-2.5 py-[7px] text-gray-600">
                        {fmtDate(entry.created_at)}
                      </td>
                      <td className="px-2.5 py-[7px]">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            isImport
                              ? "bg-green-100 text-green-700"
                              : "bg-orange-100 text-orange-600"
                          }`}
                        >
                          {isImport ? "Nhập" : "Xuất"}
                        </span>
                      </td>
                      <td
                        className={`px-2.5 py-[7px] text-right tabular-nums font-medium ${
                          isImport ? "text-green-700" : "text-orange-600"
                        }`}
                      >
                        {isImport ? "+" : "−"}
                        {fmt(Math.abs(entry.count_change))}
                      </td>
                      <td className="px-2.5 py-[7px] text-gray-600">
                        {entry.description ?? (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </td>
    </tr>
  );
}
