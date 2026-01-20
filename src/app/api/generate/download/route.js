import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getJob, removeJob } from "../../../../lib/jobStore";

export const runtime = "nodejs";

const getTempBase = () => {
  if (process.env.VERCEL) return "/tmp";
  return os.tmpdir();
};

const tempBase = path.join(getTempBase(), "sertifgenerator").toLowerCase();

const safeRemove = async (target) => {
  if (!target) return;
  const resolved = path.resolve(target);
  if (!resolved.toLowerCase().startsWith(tempBase)) return;
  await fs.rm(resolved, { recursive: true, force: true }).catch(() => {});
};

export async function GET(request) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId wajib." }, { status: 400 });
  }
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }
  if (job.status !== "done" || !job.zipPath) {
    return NextResponse.json(
      { error: "ZIP belum siap." },
      { status: 400 }
    );
  }

  try {
    const zipBuffer = await fs.readFile(job.zipPath);
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=sertifikat.zip",
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await safeRemove(job.outputDir);
    removeJob(jobId);
  }
}
