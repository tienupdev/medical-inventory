import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { ActivityPayload } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: ActivityPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ" },
      { status: 400 },
    );
  }

  const { inventory_id, count_change, description, type, created_at } = body;

  if (!inventory_id || !count_change || count_change <= 0) {
    return NextResponse.json(
      { error: "Số lượng phải là số dương hợp lệ" },
      { status: 400 },
    );
  }

  if (type !== "import" && type !== "export") {
    return NextResponse.json(
      { error: "Loại thao tác không hợp lệ" },
      { status: 400 },
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<RowDataPacket[]>(
      "SELECT count FROM inventory WHERE id = ? FOR UPDATE",
      [inventory_id],
    );

    if (rows.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: "Không tìm thấy hàng hoá" },
        { status: 404 },
      );
    }

    if (type === "export") {
      // Stock at the chosen date = current total minus all activity that happened AFTER that date
      const entryDate = created_at ? new Date(created_at) : new Date();
      // End of the chosen day (23:59:59.999)
      const endOfDay = new Date(entryDate);
      endOfDay.setHours(23, 59, 59, 999);

      const [futureRows] = await connection.query<RowDataPacket[]>(
        "SELECT COALESCE(SUM(count_change), 0) AS future_delta FROM inventory_activity WHERE inventory_id = ? AND created_at > ?",
        [inventory_id, endOfDay],
      );
      const currentTotal = Number(rows[0].count);
      const futureDelta = Number(futureRows[0].future_delta);
      const stockAtDate = currentTotal - futureDelta;

      if (count_change > stockAtDate) {
        await connection.rollback();
        return NextResponse.json(
          {
            error: `Số lượng xuất (${count_change}) vượt quá tồn kho tại ngày đã chọn (${stockAtDate})`,
          },
          { status: 400 },
        );
      }
    }

    const actualChange =
      type === "export" ? -Math.abs(count_change) : Math.abs(count_change);

    await connection.query(
      "INSERT INTO inventory_activity (inventory_id, count_change, description, created_at) VALUES (?, ?, ?, ?)",
      [
        inventory_id,
        actualChange,
        description ?? null,
        created_at ?? new Date(),
      ],
    );

    await connection.query(
      "UPDATE inventory SET count = count + ? WHERE id = ?",
      [actualChange, inventory_id],
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error("[POST /api/activity]", err);
    return NextResponse.json({ error: "Lỗi khi lưu dữ liệu" }, { status: 500 });
  } finally {
    connection.release();
  }
}
