"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";

const PreviewEditor = dynamic(
  () => import("../components/PreviewEditor"),
  { ssr: false }
);

const emptySize = { width: 0, height: 0 };

export default function HomePage() {
  const [templateFile, setTemplateFile] = useState(null);
  const [excelFile, setExcelFile] = useState(null);
  const [fontNamaFile, setFontNamaFile] = useState(null);
  const [fontSebagaiFile, setFontSebagaiFile] = useState(null);
  const [templateUrl, setTemplateUrl] = useState("");
  const [fontNamaUrl, setFontNamaUrl] = useState("");
  const [fontSebagaiUrl, setFontSebagaiUrl] = useState("");
  const [fontNamaPath, setFontNamaPath] = useState("");
  const [fontSebagaiPath, setFontSebagaiPath] = useState("");
  const [fontNamaTempDir, setFontNamaTempDir] = useState("");
  const [fontSebagaiTempDir, setFontSebagaiTempDir] = useState("");
  const [imageSize, setImageSize] = useState(emptySize);
  const [namePos, setNamePos] = useState({
    x: 80,
    y: 240,
    fontSize: 100,
    color: "#111827",
  });
  const [rolePos, setRolePos] = useState({
    x: 80,
    y: 340,
    fontSize: 40,
    color: "#111827",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enableSebagai, setEnableSebagai] = useState(false);
  const [alignCenter, setAlignCenter] = useState({
    nama: false,
    sebagai: false,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [fontMetrics, setFontMetrics] = useState({
    nama: null,
    sebagai: null,
  });
  const [excelCount, setExcelCount] = useState(null);
  const [excelInfoError, setExcelInfoError] = useState("");
  const pollRef = useRef(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => () => stopPolling(), []);

  useEffect(() => {
    if (!templateFile) {
      setTemplateUrl("");
      setImageSize(emptySize);
      return;
    }
    const url = URL.createObjectURL(templateFile);
    setTemplateUrl(url);
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [templateFile]);

  useEffect(() => {
    if (!fontNamaFile) {
      setFontNamaUrl("");
      setFontNamaPath("");
      setFontNamaTempDir("");
      setFontMetrics((prev) => ({ ...prev, nama: null }));
      return;
    }
    const formData = new FormData();
    formData.append("font", fontNamaFile);
    fetch("/api/font-preview", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setFontNamaUrl(data.fontUrl || "");
        setFontNamaPath(data.fontPath || "");
        setFontNamaTempDir(data.tempDir || "");
        if (typeof data?.ascentRatio === "number") {
          setFontMetrics((prev) => ({ ...prev, nama: data.ascentRatio }));
        }
      })
      .catch((error) => {
        setStatus(error?.message || "Gagal memuat font nama.");
      });
  }, [fontNamaFile]);

  useEffect(() => {
    if (!enableSebagai || !fontSebagaiFile) {
      setFontSebagaiUrl("");
      setFontSebagaiPath("");
      setFontSebagaiTempDir("");
      setFontMetrics((prev) => ({ ...prev, sebagai: null }));
      return;
    }
    const formData = new FormData();
    formData.append("font", fontSebagaiFile);
    fetch("/api/font-preview", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setFontSebagaiUrl(data.fontUrl || "");
        setFontSebagaiPath(data.fontPath || "");
        setFontSebagaiTempDir(data.tempDir || "");
        if (typeof data?.ascentRatio === "number") {
          setFontMetrics((prev) => ({ ...prev, sebagai: data.ascentRatio }));
        }
      })
      .catch((error) => {
        setStatus(error?.message || "Gagal memuat font sebagai.");
      });
  }, [fontSebagaiFile, enableSebagai]);

  const canGenerate = useMemo(() => {
    return (
      templateFile &&
      excelFile &&
      fontNamaPath &&
      (!enableSebagai || fontSebagaiPath) &&
      imageSize.width > 0
    );
  }, [
    templateFile,
    excelFile,
    fontNamaPath,
    fontSebagaiPath,
    enableSebagai,
    imageSize,
  ]);

  const handleGenerate = async () => {
    stopPolling();
    if (!canGenerate) {
      setStatus("Lengkapi semua file upload terlebih dahulu.");
      return;
    }
    setLoading(true);
    setStatus("Mengupload file...");
    try {
      const formData = new FormData();
      formData.append("template", templateFile);
      formData.append("excel", excelFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => null);
        throw new Error(errorData?.error || "Upload gagal.");
      }

      const uploadData = await uploadRes.json();
      setStatus("Menyiapkan proses generate...");

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templatePath: uploadData.files.template,
          excelPath: uploadData.files.excel,
          fontNamaPath,
          fontSebagaiPath: enableSebagai ? fontSebagaiPath : null,
          fontNamaTempDir,
          fontSebagaiTempDir,
          positions: {
            nama: { ...namePos, alignCenter: alignCenter.nama },
            sebagai: enableSebagai
              ? { ...rolePos, alignCenter: alignCenter.sebagai }
              : null,
            enableSebagai,
          },
        }),
      });

      if (!generateRes.ok) {
        const errorData = await generateRes.json().catch(() => null);
        throw new Error(errorData?.error || "Generate gagal.");
      }

      const { jobId, total } = await generateRes.json();

      const pollStatus = async () => {
        try {
          const res = await fetch(`/api/generate/status?jobId=${jobId}`);
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || "Gagal cek status.");
          }
          if (data.status === "processing") {
            setStatus(`Sedang generate ${data.current} dari ${data.total} data...`);
            pollRef.current = setTimeout(pollStatus, 700);
            return;
          }
          if (data.status === "error") {
            throw new Error(data?.error || "Generate gagal.");
          }
          setStatus(`Menyiapkan ZIP untuk ${total} data...`);
          const zipRes = await fetch(
            `/api/generate/download?jobId=${jobId}`
          );
          if (!zipRes.ok) {
            const errorData = await zipRes.json().catch(() => null);
            throw new Error(errorData?.error || "Download ZIP gagal.");
          }
          const blob = await zipRes.blob();
          const downloadUrl = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = "sertifikat.zip";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(downloadUrl);
          setStatus("Selesai. ZIP terunduh.");
          setLoading(false);
        } catch (error) {
          setStatus(error?.message || "Terjadi kesalahan.");
          setLoading(false);
        }
      };

      pollStatus();
    } catch (error) {
      setStatus(error?.message || "Terjadi kesalahan.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <header className="mb-10 space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Sertifikat Generator
          </p>
          <h1 className="text-3xl font-semibold text-slate-50">
            Generate Sertifikat Massal dari Template + Excel
          </h1>
          <p className="max-w-2xl text-slate-300">
            Upload template, Excel, dan font. Atur posisi teks di preview, lalu
            generate ZIP berisi PDF untuk setiap peserta.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mb-4 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-100 hover:border-slate-500 lg:hidden"
            >
              <span className="text-lg">☰</span>
              Buka Config
            </button>

            <div
              className={`fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden ${
                sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={`no-scrollbar fixed left-0 top-0 z-50 h-full w-[320px] max-w-[86vw] overflow-y-auto border-r border-slate-800 bg-slate-950 p-6 shadow-2xl transition-transform lg:static lg:h-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:border-r-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } lg:translate-x-0`}
            >
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-400">
                  Config
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-200"
                >
                  ✕
                </button>
              </div>

              <section className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-slate-950/30">
                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">
                    Template Sertifikat (PNG / JPG)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) =>
                      setTemplateFile(event.target.files?.[0])
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-slate-600"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">
                    Excel Data Peserta (.xlsx)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={async (event) => {
                      const file = event.target.files?.[0] || null;
                      setExcelFile(file);
                      setExcelCount(null);
                      setExcelInfoError("");
                      if (!file) return;
                      try {
                        const formData = new FormData();
                        formData.append("excel", file);
                        const res = await fetch("/api/excel-info", {
                          method: "POST",
                          body: formData,
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data?.error || "Gagal membaca Excel.");
                        }
                        setExcelCount(data.count);
                      } catch (err) {
                        setExcelInfoError(
                          err?.message || "Gagal membaca Excel."
                        );
                      }
                    }}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-slate-600"
                  />
                  {excelCount !== null && !excelInfoError && (
                    <p className="text-xs text-emerald-300">
                      Total data terdeteksi: {excelCount}
                    </p>
                  )}
                  {excelInfoError && (
                    <p className="text-xs text-rose-300">{excelInfoError}</p>
                  )}
                  <a
                    href="/uploads/template.xlsx"
                    download
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Download Template Excel
                  </a>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">
                    Font Nama (.ttf / .otf / .zip)
                  </label>
                  <input
                    type="file"
                    accept=".ttf,.otf,.zip"
                    onChange={(event) =>
                      setFontNamaFile(event.target.files?.[0])
                    }
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-slate-600"
                  />
                  <a
                    href="https://www.dafont.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 transition hover:border-slate-500 hover:text-white"
                  >
                    Cari & Download Font di dafont.com
                  </a>
                </div>

                <label className="flex items-center justify-between text-sm text-slate-300">
                  <span>Aktifkan [Sebagai]</span>
                  <input
                    type="checkbox"
                    checked={enableSebagai}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setEnableSebagai(checked);
                      if (!checked) {
                        setFontSebagaiFile(null);
                        setFontSebagaiUrl("");
                        setFontSebagaiPath("");
                        setFontSebagaiTempDir("");
                        setFontMetrics((prev) => ({ ...prev, sebagai: null }));
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500"
                  />
                </label>

                {enableSebagai && (
                  <div className="space-y-3">
                  <label className="text-sm font-medium text-slate-200">
                      Font Sebagai (.ttf / .otf / .zip)
                    </label>
                    <input
                      type="file"
                      accept=".ttf,.otf,.zip"
                      onChange={(event) =>
                        setFontSebagaiFile(event.target.files?.[0])
                      }
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 file:mr-4 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-slate-600"
                    />
                  </div>
                )}

                <div className="space-y-4 border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Font size [Nama]</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNamePos((prev) => ({
                            ...prev,
                            fontSize: Math.max(10, prev.fontSize - 2),
                          }))
                        }
                        className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-sm text-slate-100 hover:border-slate-500"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="10"
                        max="200"
                        value={namePos.fontSize}
                        onChange={(event) =>
                          setNamePos((prev) => ({
                            ...prev,
                            fontSize:
                              Number(event.target.value) || prev.fontSize,
                          }))
                        }
                        className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNamePos((prev) => ({
                            ...prev,
                            fontSize: Math.min(200, prev.fontSize + 2),
                          }))
                        }
                        className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-sm text-slate-100 hover:border-slate-500"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <label className="flex items-center justify-between text-sm text-slate-300">
                    <span>Rata Tengah [Nama]</span>
                    <input
                      type="checkbox"
                      checked={alignCenter.nama}
                      onChange={(event) =>
                        setAlignCenter((prev) => ({
                          ...prev,
                          nama: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500"
                    />
                  </label>
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Warna [Nama]</span>
                    <input
                      type="color"
                      value={namePos.color}
                      onChange={(event) =>
                        setNamePos((prev) => ({
                          ...prev,
                          color: event.target.value,
                        }))
                      }
                      className="h-9 w-24 cursor-pointer rounded-md border border-slate-700 bg-slate-950"
                    />
                  </div>
                  {enableSebagai && (
                    <>
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Font size [Sebagai]</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                fontSize: Math.max(10, prev.fontSize - 2),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-sm text-slate-100 hover:border-slate-500"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="10"
                            max="200"
                            value={rolePos.fontSize}
                            onChange={(event) =>
                              setRolePos((prev) => ({
                                ...prev,
                                fontSize:
                                  Number(event.target.value) || prev.fontSize,
                              }))
                            }
                            className="w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-right text-sm text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                fontSize: Math.min(200, prev.fontSize + 2),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-slate-700 bg-slate-950 text-sm text-slate-100 hover:border-slate-500"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center justify-between text-sm text-slate-300">
                        <span>Rata Tengah [Sebagai]</span>
                        <input
                          type="checkbox"
                          checked={alignCenter.sebagai}
                          onChange={(event) =>
                            setAlignCenter((prev) => ({
                              ...prev,
                              sebagai: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-emerald-500"
                        />
                      </label>
                      <div className="flex items-center justify-between text-sm text-slate-300">
                        <span>Warna [Sebagai]</span>
                        <input
                          type="color"
                          value={rolePos.color}
                          onChange={(event) =>
                            setRolePos((prev) => ({
                              ...prev,
                              color: event.target.value,
                            }))
                          }
                          className="h-9 w-24 cursor-pointer rounded-md border border-slate-700 bg-slate-950"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate}
                  className="hidden w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 lg:block"
                >
                  {loading ? "Memproses..." : "Generate Sertifikat"}
                </button>

                {status && (
                  <p className="hidden rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 lg:block">
                    {status}
                  </p>
                )}
              </section>
            </aside>
          </div>

          <section className="flex w-full min-w-0 justify-center">
            <div className="w-full min-w-0 max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              {templateUrl ? (
                <PreviewEditor
                  templateUrl={templateUrl}
                  fontNamaUrl={fontNamaUrl}
                  fontSebagaiUrl={fontSebagaiUrl}
                  imageSize={imageSize}
                  namePos={namePos}
                  setNamePos={setNamePos}
                  rolePos={rolePos}
                  setRolePos={setRolePos}
                  nameAscentRatio={fontMetrics.nama}
                  roleAscentRatio={fontMetrics.sebagai}
                  alignCenterNama={alignCenter.nama}
                  alignCenterSebagai={alignCenter.sebagai}
                  showSebagai={enableSebagai}
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/40 text-sm text-slate-400">
                  Upload template untuk mulai preview.
                </div>
              )}
              <div className="mt-4 space-y-3 lg:hidden">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate}
                  className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
                >
                  {loading ? "Memproses..." : "Generate Sertifikat"}
                </button>
                {status && (
                  <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
                    {status}
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
