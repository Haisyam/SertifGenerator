import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { storageDir } from "../../../lib/storage";

export const runtime = "nodejs";

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".zip") return "application/zip";
  if (ext === ".otf") return "font/otf";
  if (ext === ".ttf") return "font/ttf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
};

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json({ error: "Parameter key wajib." }, { status: 400 });
    }

    const resolvedPath = path.resolve(storageDir, key);
    
    // Security check: prevent directory traversal
    if (!resolvedPath.startsWith(storageDir)) {
      return NextResponse.json({ error: "Akses tidak sah." }, { status: 403 });
    }

    try {
      const data = await fs.readFile(resolvedPath);
      const filename = path.basename(resolvedPath);

      return new NextResponse(data, {
        headers: {
          "Content-Type": getContentType(resolvedPath),
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      if (err.code === "ENOENT") {
        return NextResponse.json({ error: "File tidak ditemukan." }, { status: 404 });
      }
      throw err;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Gagal mengunduh file." },
      { status: 500 }
    );
  }
}
