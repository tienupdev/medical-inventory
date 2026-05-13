import { NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id, name FROM inventory_category ORDER BY name",
    );
    return NextResponse.json({ categories: rows });
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { error: "Lỗi truy vấn cơ sở dữ liệu" },
      { status: 500 },
    );
  }
}
