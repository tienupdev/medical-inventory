import type { InventoryItem } from "./types";

export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function groupByCategory(
  items: InventoryItem[],
): { name: string; items: InventoryItem[] }[] {
  const map = new Map<string, InventoryItem[]>();
  for (const item of items) {
    const existing = map.get(item.category_name);
    if (existing) existing.push(item);
    else map.set(item.category_name, [item]);
  }
  return Array.from(map.entries()).map(([name, items]) => ({ name, items }));
}
