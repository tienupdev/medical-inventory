import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { ActivityEntry, ActivityPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function DELETE(request: NextRequest) {
  let body: ActivityEntry;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ" },
      { status: 400 },
    );
  }

  const { id } = body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM inventory_activity WHERE id = ?", [id]);
    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("[DELETE /api/activity/delete]", err);
    return NextResponse.json({ error: "Lỗi khi xoá dữ liệu" }, { status: 500 });
  } finally {
    connection.release();
  }
}
