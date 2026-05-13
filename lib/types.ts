export interface InventoryCategory {
  id: number;
  name: string;
}

export interface InventoryItem {
  id: number;
  category_id: number;
  category_name: string;
  unit: string;
  name: string;
  count: number;
  opening_stock: number;
  imported: number;
  exported: number;
  closing_stock: number;
}

export interface ActivityPayload {
  inventory_id: number;
  count_change: number;
  description?: string;
  type: "import" | "export";
  created_at?: string;
}
export interface ActivityEntry {
  id: number;
  count_change: number;
  description: string | null;
  created_at: string;
}
