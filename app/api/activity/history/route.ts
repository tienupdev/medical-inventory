import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const inventoryId = parseInt(searchParams.get("inventory_id") ?? "", 10);
  const now = new Date();
  const month = parseInt(
    searchParams.get("month") ?? String(now.getMonth() + 1),
    10,
  );
  const year = parseInt(
    searchParams.get("year") ?? String(now.getFullYear()),
    10,
  );

  if (isNaN(inventoryId) || inventoryId <= 0) {
    return NextResponse.json(
      { error: "inventory_id không hợp lệ" },
      { status: 400 },
    );
  }

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const firstDayNextMonth = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, count_change, description, created_at
       FROM inventory_activity
       WHERE inventory_id = ?
         AND created_at >= ?
         AND created_at < ?
       ORDER BY created_at DESC`,
      [inventoryId, firstDay, firstDayNextMonth],
    );

    const activities = rows.map((r) => ({
      id: r.id,
      count_change: Number(r.count_change),
      description: r.description ?? null,
      created_at:
        r.created_at instanceof Date
          ? r.created_at.toISOString()
          : String(r.created_at),
    }));

    return NextResponse.json({ activities });
  } catch (err) {
    console.error("[GET /api/activity]", err);
    return NextResponse.json(
      { error: "Lỗi truy vấn cơ sở dữ liệu" },
      { status: 500 },
    );
  }
}
