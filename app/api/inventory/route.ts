import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const now = new Date();

  const month = parseInt(
    searchParams.get("month") ?? String(now.getMonth() + 1),
    10,
  );
  const year = parseInt(
    searchParams.get("year") ?? String(now.getFullYear()),
    10,
  );

  const isCurrentMonth =
    year === now.getFullYear() && month === now.getMonth() + 1;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const firstDayNextMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        i.id,
        i.category_id,
        ic.name  AS category_name,
        i.unit,
        i.name,
        i.count,
        COALESCE((
          SELECT SUM(ia.count_change)
          FROM inventory_activity ia
          WHERE ia.inventory_id = i.id
            AND ia.created_at < ?
        ), 0) AS opening_stock,
        COALESCE((
          SELECT SUM(ia.count_change)
          FROM inventory_activity ia
          WHERE ia.inventory_id = i.id
            AND ia.count_change > 0
            AND ia.created_at >= ?
            AND ia.created_at < ?
        ), 0) AS imported,
        COALESCE((
          SELECT SUM(ABS(ia.count_change))
          FROM inventory_activity ia
          WHERE ia.inventory_id = i.id
            AND ia.count_change < 0
            AND ia.created_at >= ?
            AND ia.created_at < ?
        ), 0) AS exported,
        COALESCE((
          SELECT SUM(ia.count_change)
          FROM inventory_activity ia
          WHERE ia.inventory_id = i.id
            AND ia.created_at < ?
        ), 0) AS closing_stock_historical
      FROM inventory i
      JOIN inventory_category ic ON ic.id = i.category_id
      ORDER BY ic.name, i.name
      `,
      [
        firstDay,
        firstDay,
        firstDayNextMonth,
        firstDay,
        firstDayNextMonth,
        firstDayNextMonth,
      ],
    );

    const items = rows.map((row) => ({
      id: row.id,
      category_id: row.category_id,
      category_name: row.category_name,
      unit: row.unit,
      name: row.name,
      count: Number(row.count),
      opening_stock: Number(row.opening_stock),
      imported: Number(row.imported),
      exported: Number(row.exported),
      closing_stock: isCurrentMonth
        ? Number(row.count)
        : Number(row.closing_stock_historical),
    }));

    return NextResponse.json({ items, isCurrentMonth });
  } catch (err) {
    console.error("[GET /api/inventory]", err);
    return NextResponse.json(
      { error: "Lỗi kết nối cơ sở dữ liệu" },
      { status: 500 },
    );
  }
}
