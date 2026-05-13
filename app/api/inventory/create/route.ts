import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import type { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    unit?: string;
    category_id?: number | null;
    new_category_name?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ" },
      { status: 400 },
    );
  }

  const { name, unit, category_id, new_category_name } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Tên sản phẩm không được để trống" },
      { status: 400 },
    );
  }
  if (!unit?.trim()) {
    return NextResponse.json(
      { error: "Đơn vị tính không được để trống" },
      { status: 400 },
    );
  }
  if (!category_id && !new_category_name?.trim()) {
    return NextResponse.json(
      { error: "Vui lòng chọn hoặc nhập danh mục" },
      { status: 400 },
    );
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    let finalCategoryId = category_id;

    if (!finalCategoryId && new_category_name?.trim()) {
      const [result] = await connection.query<ResultSetHeader>(
        "INSERT INTO inventory_category (name) VALUES (?)",
        [new_category_name.trim()],
      );
      finalCategoryId = result.insertId;
    }

    const [result] = await connection.query<ResultSetHeader>(
      "INSERT INTO inventory (category_id, unit, name, count) VALUES (?, ?, ?, 0)",
      [finalCategoryId, unit.trim(), name.trim()],
    );

    await connection.commit();
    return NextResponse.json({ id: result.insertId });
  } catch (err) {
    await connection.rollback();
    console.error("[POST /api/inventory]", err);
    return NextResponse.json({ error: "Lỗi khi lưu dữ liệu" }, { status: 500 });
  } finally {
    connection.release();
  }
}
