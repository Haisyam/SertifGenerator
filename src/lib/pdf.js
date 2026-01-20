import fs from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const isPng = (filePath) => path.extname(filePath).toLowerCase() === ".png";

export async function generatePdfBuffer({
  templatePath,
  fontNamaPath,
  nama,
  sebagai,
  posisiNama,
  posisiSebagai,
  enableSebagai = false,
  fontSebagaiPath,
}) {
  const templateBytes = await fs.readFile(templatePath);
  const fontNamaBytes = await fs.readFile(fontNamaPath);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const templateImage = isPng(templatePath)
    ? await pdfDoc.embedPng(templateBytes)
    : await pdfDoc.embedJpg(templateBytes);

  const page = pdfDoc.addPage([
    templateImage.width,
    templateImage.height,
  ]);

  page.drawImage(templateImage, {
    x: 0,
    y: 0,
    width: templateImage.width,
    height: templateImage.height,
  });

  const fontNama = await pdfDoc.embedFont(fontNamaBytes);
  const shouldRenderSebagai =
    enableSebagai && Boolean(sebagai) && Boolean(posisiSebagai);
  let fontSebagai = null;
  if (shouldRenderSebagai) {
    if (!fontSebagaiPath) {
      throw new Error("Font Sebagai belum diupload.");
    }
    const fontSebagaiBytes = await fs.readFile(fontSebagaiPath);
    fontSebagai = await pdfDoc.embedFont(fontSebagaiBytes);
  }

  const pageHeight = page.getHeight();
  const namaY = pageHeight - posisiNama.y;
  const sebagaiY = posisiSebagai ? pageHeight - posisiSebagai.y : 0;

  const namaX = posisiNama.alignCenter
    ? (templateImage.width - fontNama.widthOfTextAtSize(nama, posisiNama.fontSize)) / 2
    : posisiNama.x;
  const sebagaiX =
    shouldRenderSebagai && posisiSebagai.alignCenter
      ? (templateImage.width -
          fontSebagai.widthOfTextAtSize(sebagai, posisiSebagai.fontSize)) /
        2
      : posisiSebagai?.x ?? 0;

  page.drawText(nama, {
    x: namaX,
    y: namaY,
    size: posisiNama.fontSize,
    font: fontNama,
    color: hexToRgb(posisiNama.color),
  });

  if (shouldRenderSebagai) {
    page.drawText(sebagai, {
      x: sebagaiX,
      y: sebagaiY,
      size: posisiSebagai.fontSize,
      font: fontSebagai,
      color: hexToRgb(posisiSebagai.color),
    });
  }

  return pdfDoc.save();
}

const hexToRgb = (value) => {
  const hex = String(value || "").replace("#", "");
  if (hex.length !== 6) return rgb(0.07, 0.09, 0.15);
  const num = parseInt(hex, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return rgb(r / 255, g / 255, b / 255);
};
