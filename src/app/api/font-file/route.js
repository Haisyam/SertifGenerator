import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";

export const runtime = "nodejs";

const getTempBase = () => {
  if (process.env.VERCEL) return "/tmp";
  return os.tmpdir();
};

const tempBase = path.join(getTempBase(), "sertifgenerator").toLowerCase();

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".otf") return "font/otf";
  if (ext === ".ttf") return "font/ttf";
  return "application/octet-stream";
};

export async function GET(request) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const encoded = searchParams.get("p");
    if (!encoded) {
      return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });
    }
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const resolved = path.resolve(decoded);
    if (!resolved.toLowerCase().startsWith(tempBase)) {
      return NextResponse.json({ error: "Akses file tidak valid." }, { status: 403 });
    }
    const data = await fs.readFile(resolved);
    return new NextResponse(data, {
      headers: {
        "Content-Type": getContentType(resolved),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Gagal memuat font." },
      { status: 500 }
    );
  }
}
