import { NextResponse } from "next/server";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { Readable } from "node:stream";
import os from "node:os";
import { createR2Key, uploadBufferToR2 } from "../../../lib/r2";

export const runtime = "nodejs";

const getTempBase = () => {
  if (process.env.VERCEL) return "/tmp";
  return os.tmpdir();
};

const uploadsDir = path.join(getTempBase(), "sertifgenerator", "uploads");

const storage = multer.diskStorage({
  destination: async (_, __, callback) => {
    await fs.mkdir(uploadsDir, { recursive: true });
    callback(null, uploadsDir);
  },
  filename: (_, file, callback) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e6
    )}-${safeName}`;
    callback(null, uniqueName);
  },
});

const upload = multer({ storage }).fields([
  { name: "template", maxCount: 1 },
  { name: "excel", maxCount: 1 },
  { name: "font_nama", maxCount: 1 },
  { name: "font_sebagai", maxCount: 1 },
]);

const parseMultipart = (request) =>
  new Promise((resolve, reject) => {
    const nodeStream = Readable.fromWeb(request.body);
    nodeStream.headers = Object.fromEntries(request.headers);
    nodeStream.method = request.method;
    upload(nodeStream, {}, (error) => {
      if (error) reject(error);
      resolve(nodeStream);
    });
  });

export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type harus multipart/form-data." },
        { status: 400 }
      );
    }

    const req = await parseMultipart(request);
    const files = req.files || {};

    const required = ["template", "excel"];
    for (const key of required) {
      if (!files[key]?.[0]) {
        return NextResponse.json(
          { error: `File ${key} wajib diupload.` },
          { status: 400 }
        );
      }
    }

    const responseFiles = {};
    for (const key of required) {
      const file = files[key][0];
      const buffer = await fs.readFile(file.path);
      const objectKey = createR2Key(`uploads/${key}`, file.originalname || file.filename);
      await uploadBufferToR2({
        key: objectKey,
        body: buffer,
        contentType: file.mimetype,
      });
      responseFiles[key] = objectKey;
      await fs.rm(file.path, { force: true }).catch(() => {});
    }

    return NextResponse.json({ files: responseFiles });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Upload gagal." },
      { status: 500 }
    );
  }
}
