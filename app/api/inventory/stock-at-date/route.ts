import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const inventoryId = parseInt(searchParams.get("inventory_id") ?? "", 10);
  const date = searchParams.get("date"); // YYYY-MM-DD

  if (isNaN(inventoryId) || inventoryId <= 0) {
    return NextResponse.json(
      { error: "inventory_id không hợp lệ" },
      { status: 400 },
    );
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date không hợp lệ" }, { status: 400 });
  }

  try {
    // current persisted count
    const [itemRows] = await pool.query<RowDataPacket[]>(
      "SELECT count FROM inventory WHERE id = ?",
      [inventoryId],
    );
    if (itemRows.length === 0) {
      return NextResponse.json(
        { error: "Không tìm thấy hàng hoá" },
        { status: 404 },
      );
    }
    const currentTotal = Number(itemRows[0].count);

    // sum of all activity AFTER end-of-day on the chosen date
    const endOfDay = `${date} 23:59:59`;
    const [futureRows] = await pool.query<RowDataPacket[]>(
      "SELECT COALESCE(SUM(count_change), 0) AS future_delta FROM inventory_activity WHERE inventory_id = ? AND created_at > ?",
      [inventoryId, endOfDay],
    );
    const futureDelta = Number(futureRows[0].future_delta);
    const stockAtDate = currentTotal - futureDelta;

    return NextResponse.json({ stock: stockAtDate });
  } catch (err) {
    console.error("[GET /api/inventory/stock-at-date]", err);
    return NextResponse.json(
      { error: "Lỗi truy vấn cơ sở dữ liệu" },
      { status: 500 },
    );
  }
}
