import { NextResponse } from "next/server";
import { parseExcelBuffer } from "../../../lib/excel";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("excel");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File Excel tidak ditemukan." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const rows = await parseExcelBuffer(buffer, { requireSebagai: false });
    return NextResponse.json({ count: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Gagal membaca Excel." },
      { status: 500 }
    );
  }
}
