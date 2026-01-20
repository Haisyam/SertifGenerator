import ExcelJS from "exceljs";

const normalizeHeader = (value) =>
  String(value || "").trim().toLowerCase();

const parseWorksheet = (worksheet, options = {}) => {
  const requireSebagai = options.requireSebagai !== false;
  if (!worksheet) {
    throw new Error("Worksheet tidak ditemukan di file Excel.");
  }

  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values.slice(1).map(normalizeHeader);
  const nameIndex = headers.indexOf("nama");
  const roleIndex = headers.indexOf("sebagai");

  if (nameIndex === -1) {
    throw new Error("Kolom Excel harus memiliki header 'nama'.");
  }

  if (requireSebagai && roleIndex === -1) {
    throw new Error("Kolom Excel harus memiliki header 'sebagai'.");
  }

  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = row.values;
    const nama = String(values[nameIndex + 1] || "").trim();
    const sebagai =
      roleIndex === -1 ? "" : String(values[roleIndex + 1] || "").trim();
    if (!nama && !sebagai) return;
    rows.push({ nama, sebagai });
  });

  return rows;
};

export async function parseExcel(filePath, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  return parseWorksheet(worksheet, options);
}

export async function parseExcelBuffer(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];
  return parseWorksheet(worksheet, options);
}
