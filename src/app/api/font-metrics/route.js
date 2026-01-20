import { NextResponse } from "next/server";
import fontkit from "@pdf-lib/fontkit";

export const runtime = "nodejs";

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const font = fontkit.create(buffer);
    const ascentRatio = getAscentRatio(font);
    return NextResponse.json({ ascentRatio });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Gagal baca font." },
      { status: 500 }
    );
  }
}
