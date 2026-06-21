import { NextResponse } from "next/server";
import { getJob, removeJob } from "../../../../lib/jobStore";
import { getDownloadUrl } from "../../../../lib/storage";

export const runtime = "nodejs";

export async function GET(request) {
  const jobId = request.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId wajib." }, { status: 400 });
  }
  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "Job tidak ditemukan." }, { status: 404 });
  }
  if (job.status !== "done" || !job.zipKey) {
    return NextResponse.json({ error: "ZIP belum siap." }, { status: 400 });
  }

  try {
    const url = getDownloadUrl(job.zipKey);
    return NextResponse.json({ url });
  } finally {
    removeJob(jobId);
  }
}
