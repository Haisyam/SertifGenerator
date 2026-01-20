import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import os from "node:os";
import archiver from "archiver";
import { parseExcel } from "../../../lib/excel";
import { generatePdfBuffer } from "../../../lib/pdf";
import { createJob, updateJob } from "../../../lib/jobStore";

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

const resolvePath = (inputPath) =>
  path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);

const safeRemove = async (target) => {
  if (!target) return;
  const resolved = path.resolve(target);
  if (!resolved.toLowerCase().startsWith(tempBaseLower)) return;
  await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
};

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      templatePath,
      excelPath,
      fontNamaPath,
      fontSebagaiPath,
      fontNamaTempDir,
      fontSebagaiTempDir,
      positions,
    } = body || {};

    if (
      !templatePath ||
      !excelPath ||
      !fontNamaPath ||
      !positions?.nama ||
      typeof positions.enableSebagai !== "boolean"
    ) {
      return NextResponse.json(
        { error: "Payload tidak lengkap." },
        { status: 400 }
      );
    }

    if (positions.enableSebagai && !positions.sebagai) {
      return NextResponse.json(
        { error: "Posisi Sebagai wajib saat fitur Sebagai aktif." },
        { status: 400 }
      );
    }

    const absoluteTemplate = resolvePath(templatePath);
    const absoluteExcel = resolvePath(excelPath);
    const absoluteFontNama = resolvePath(fontNamaPath);
    const absoluteFontSebagai = fontSebagaiPath
      ? resolvePath(fontSebagaiPath)
      : null;

    if (positions.enableSebagai && !absoluteFontSebagai) {
      return NextResponse.json(
        { error: "Font Sebagai wajib diupload saat fitur Sebagai aktif." },
        { status: 400 }
      );
    }

    const rows = await parseExcel(absoluteExcel, {
      requireSebagai: positions.enableSebagai,
    });
    if (!rows.length) {
      return NextResponse.json(
        { error: "Data Excel kosong." },
        { status: 400 }
      );
    }

    await fs.mkdir(tempBase, { recursive: true });
    const outputDir = await fs.mkdtemp(path.join(tempBase, "output-"));
    const zipPath = path.join(outputDir, "sertifikat.zip");

    const jobId = createJob({
      total: rows.length,
      current: 0,
      zipPath: null,
      outputDir,
      tempTargets: [
        absoluteTemplate,
        absoluteExcel,
        absoluteFontNama,
        absoluteFontSebagai,
        fontNamaTempDir ? resolvePath(fontNamaTempDir) : null,
        fontSebagaiTempDir ? resolvePath(fontSebagaiTempDir) : null,
      ].filter(Boolean),
    });

    void (async () => {
      const cleanupTargets = [
        absoluteTemplate,
        absoluteExcel,
        absoluteFontNama,
        absoluteFontSebagai,
        fontNamaTempDir ? resolvePath(fontNamaTempDir) : null,
        fontSebagaiTempDir ? resolvePath(fontSebagaiTempDir) : null,
      ].filter(Boolean);
      try {
        const files = [];
        const usedNames = new Set();
        for (let i = 0; i < rows.length; i += 1) {
          const row = rows[i];
          const pdfBytes = await generatePdfBuffer({
            templatePath: absoluteTemplate,
            fontNamaPath: absoluteFontNama,
            nama: row.nama,
            sebagai: row.sebagai,
            posisiNama: positions.nama,
            posisiSebagai: positions.sebagai,
            enableSebagai: positions.enableSebagai,
            fontSebagaiPath: positions.enableSebagai
              ? absoluteFontSebagai
              : undefined,
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

        updateJob(jobId, { status: "done", zipPath });
      } catch (error) {
        updateJob(jobId, {
          status: "error",
          error: error?.message || "Generate gagal.",
        });
      } finally {
        await Promise.all(cleanupTargets.map(safeRemove));
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
