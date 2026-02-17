import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";
import archiver from "archiver";
import { parseExcelBuffer } from "../../../lib/excel";
import { generatePdfBuffer } from "../../../lib/pdf";
import { createJob, updateJob } from "../../../lib/jobStore";
import { createR2Key, getBufferFromR2, uploadBufferToR2 } from "../../../lib/r2";

export const runtime = "nodejs";

const getTempBase = () => {
  if (process.env.VERCEL) return "/tmp";
  return os.tmpdir();
};

const tempBase = path.join(getTempBase(), "sertifgenerator");
const tempBaseLower = tempBase.toLowerCase();

const sanitizeFilename = (value) =>
  String(value || "")
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 120) || "sertifikat";

const safeRemove = async (target) => {
  if (!target) return;
  const resolved = path.resolve(target);
  if (!resolved.toLowerCase().startsWith(tempBaseLower)) return;
  await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { templateKey, excelKey, fontNamaKey, fontSebagaiKey, positions } = body || {};

    if (
      !templateKey ||
      !excelKey ||
      !fontNamaKey ||
      !positions?.nama ||
      typeof positions.enableSebagai !== "boolean"
    ) {
      return NextResponse.json({ error: "Payload tidak lengkap." }, { status: 400 });
    }

    if (positions.enableSebagai && !positions.sebagai) {
      return NextResponse.json(
        { error: "Posisi Sebagai wajib saat fitur Sebagai aktif." },
        { status: 400 }
      );
    }

    if (positions.enableSebagai && !fontSebagaiKey) {
      return NextResponse.json(
        { error: "Font Sebagai wajib diupload saat fitur Sebagai aktif." },
        { status: 400 }
      );
    }

    const [templateBuffer, excelBuffer, fontNamaBuffer, fontSebagaiBuffer] = await Promise.all([
      getBufferFromR2(templateKey),
      getBufferFromR2(excelKey),
      getBufferFromR2(fontNamaKey),
      positions.enableSebagai && fontSebagaiKey
        ? getBufferFromR2(fontSebagaiKey)
        : Promise.resolve(null),
    ]);

    const rows = await parseExcelBuffer(excelBuffer, {
      requireSebagai: positions.enableSebagai,
    });
    if (!rows.length) {
      return NextResponse.json({ error: "Data Excel kosong." }, { status: 400 });
    }

    await fs.mkdir(tempBase, { recursive: true });
    const outputDir = await fs.mkdtemp(path.join(tempBase, "output-"));
    const zipPath = path.join(outputDir, "sertifikat.zip");
    const templatePath = path.join(
      outputDir,
      `template${path.extname(templateKey || ".png") || ".png"}`
    );
    const fontNamaPath = path.join(
      outputDir,
      `font-nama${path.extname(fontNamaKey || ".otf") || ".otf"}`
    );
    const fontSebagaiPath = positions.enableSebagai
      ? path.join(
          outputDir,
          `font-sebagai${path.extname(fontSebagaiKey || ".otf") || ".otf"}`
        )
      : null;

    await fs.writeFile(templatePath, templateBuffer);
    await fs.writeFile(fontNamaPath, fontNamaBuffer);
    if (fontSebagaiPath && fontSebagaiBuffer) {
      await fs.writeFile(fontSebagaiPath, fontSebagaiBuffer);
    }

    const jobId = createJob({
      total: rows.length,
      current: 0,
      zipKey: null,
      outputDir,
    });

    void (async () => {
      try {
        const files = [];
        const usedNames = new Set();
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          const pdfBytes = await generatePdfBuffer({
            templatePath,
            fontNamaPath,
            nama: row.nama,
            sebagai: row.sebagai,
            posisiNama: positions.nama,
            posisiSebagai: positions.sebagai,
            enableSebagai: positions.enableSebagai,
            fontSebagaiPath: positions.enableSebagai ? fontSebagaiPath : undefined,
          });
          const baseName = sanitizeFilename(row.nama || `peserta_${i + 1}`);
          let filename = `${baseName}.pdf`;
          let counter = 1;
          while (usedNames.has(filename)) {
            counter += 1;
            filename = `${baseName}_${counter}.pdf`;
          }
          usedNames.add(filename);
          const filePath = path.join(outputDir, filename);
          await fs.writeFile(filePath, pdfBytes);
          files.push({ path: filePath, name: filename });
          updateJob(jobId, { current: i + 1 });
        }

        const archive = archiver("zip", { zlib: { level: 9 } });
        const output = createWriteStream(zipPath);
        archive.pipe(output);
        files.forEach((file) => {
          archive.file(file.path, { name: file.name });
        });
        await archive.finalize();
        await new Promise((resolve, reject) => {
          output.on("close", resolve);
          output.on("error", reject);
        });

        const zipBuffer = await fs.readFile(zipPath);
        const zipKey = createR2Key("outputs", `sertifikat-${jobId}.zip`);
        await uploadBufferToR2({
          key: zipKey,
          body: zipBuffer,
          contentType: "application/zip",
        });

        updateJob(jobId, { status: "done", zipKey });
      } catch (error) {
        updateJob(jobId, {
          status: "error",
          error: error?.message || "Generate gagal.",
        });
      } finally {
        await safeRemove(outputDir);
      }
    })();

    return NextResponse.json({ jobId, total: rows.length });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Generate gagal." },
      { status: 500 }
    );
  }
}
