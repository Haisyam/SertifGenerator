import { NextResponse } from "next/server";
import { getJob } from "../../../../lib/jobStore";

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
  return NextResponse.json({
    status: job.status,
    total: job.total,
    current: job.current,
    error: job.error,
  });
}
