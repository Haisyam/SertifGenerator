import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import os from "node:os";
import unzipper from "unzipper";
import fontkit from "@pdf-lib/fontkit";
import { createR2Key, uploadBufferToR2 } from "../../../lib/r2";

export const runtime = "nodejs";

const getTempBase = () => {
  if (process.env.VERCEL) return "/tmp";
  return os.tmpdir();
};

const tempBase = path.join(getTempBase(), "sertifgenerator");

const isFontFile = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".ttf" || ext === ".otf";
};

const isZip = (filePath) => path.extname(filePath).toLowerCase() === ".zip";

const findFontFile = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFontFile(fullPath);
      if (found) return found;
    } else if (entry.isFile() && isFontFile(fullPath)) {
      return fullPath;
    }
  }
  return null;
};

const getAscentRatio = (font) => {
  const units = font.unitsPerEm || 1000;
  const ascent =
    font.ascent ??
    font.hhea?.ascent ??
    font.os2?.sTypoAscender ??
    font.os2?.usWinAscent ??
    0;
  const ratio = ascent / units;
  if (!Number.isFinite(ratio)) return null;
  if (ratio < 0.4 || ratio > 1.2) return null;
  return ratio;
};

export async function POST(request) {
  try {
    const form = await request.formData();
    const file = form.get("font");
    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: "File font tidak ditemukan." },
        { status: 400 }
      );
    }

    await fs.mkdir(tempBase, { recursive: true });
    const tempDir = await fs.mkdtemp(path.join(tempBase, "font-"));
    const inputPath = path.join(tempDir, file.name || "font-upload");
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    let fontPath = inputPath;
    if (isZip(inputPath)) {
      const extractDir = path.join(tempDir, "extracted");
      await fs.mkdir(extractDir, { recursive: true });
      await new Promise((resolve, reject) => {
        createReadStream(inputPath)
          .pipe(unzipper.Extract({ path: extractDir }))
          .on("close", resolve)
          .on("error", reject);
      });
      const found = await findFontFile(extractDir);
      if (!found) {
        return NextResponse.json(
          { error: "File zip tidak berisi .ttf atau .otf." },
          { status: 400 }
        );
      }
      fontPath = found;
      await fs.rm(inputPath, { force: true }).catch(() => {});
    } else if (!isFontFile(inputPath)) {
      return NextResponse.json(
        { error: "Format font harus .ttf, .otf, atau .zip." },
        { status: 400 }
      );
    }

    const fontBuffer = await fs.readFile(fontPath);
    const font = fontkit.create(fontBuffer);
    const ascentRatio = getAscentRatio(font);
    const uploadedName = path.basename(fontPath);
    const fontKey = createR2Key("uploads/font", uploadedName);
    await uploadBufferToR2({
      key: fontKey,
      body: fontBuffer,
      contentType: "font/otf",
    });

    const encoded = Buffer.from(fontPath).toString("base64");
    const fontUrl = `/api/font-file?p=${encodeURIComponent(encoded)}`;

    return NextResponse.json({
      fontUrl,
      fontPath,
      fontKey,
      ascentRatio,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Gagal memuat font." },
      { status: 500 }
    );
  }
}
