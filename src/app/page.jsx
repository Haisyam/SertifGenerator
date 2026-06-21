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
  const [fontNamaKey, setFontNamaKey] = useState("");
  const [fontSebagaiKey, setFontSebagaiKey] = useState("");
  const [imageSize, setImageSize] = useState(emptySize);
  const [namePos, setNamePos] = useState({
    x: 80,
    y: 240,
    fontSize: 100,
    color: "#111827",
    strokeWidth: 0,
    strokeColor: "#ffffff",
  });
  const [rolePos, setRolePos] = useState({
    x: 80,
    y: 340,
    fontSize: 40,
    color: "#111827",
    strokeWidth: 0,
    strokeColor: "#ffffff",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enableSebagai, setEnableSebagai] = useState(false);
  const [alignCenter, setAlignCenter] = useState({
    nama: false,
    sebagai: false,
  });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusTone, setStatusTone] = useState("neutral");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [fontMetrics, setFontMetrics] = useState({
    nama: null,
    sebagai: null,
  });
  const [excelCount, setExcelCount] = useState(null);
  const [excelInfoError, setExcelInfoError] = useState("");
  const [excelInfoLoading, setExcelInfoLoading] = useState(false);
  const [fontLoadState, setFontLoadState] = useState({
    nama: "idle",
    sebagai: "idle",
  });
  const [fontLoadError, setFontLoadError] = useState({
    nama: "",
    sebagai: "",
  });
  const pollRef = useRef(null);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [activeSection, setActiveSection] = useState("materials");

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopPolling();
      if (downloadUrl && downloadUrl.startsWith("blob:")) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

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
      setFontNamaKey("");
      setFontMetrics((prev) => ({ ...prev, nama: null }));
      setFontLoadState((prev) => ({ ...prev, nama: "idle" }));
      setFontLoadError((prev) => ({ ...prev, nama: "" }));
      return;
    }
    setFontLoadState((prev) => ({ ...prev, nama: "loading" }));
    setFontLoadError((prev) => ({ ...prev, nama: "" }));
    const formData = new FormData();
    formData.append("font", fontNamaFile);
    fetch("/api/font-preview", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setFontNamaUrl(data.fontUrl || "");
        setFontNamaPath(data.fontPath || "");
        setFontNamaKey(data.fontKey || "");
        setFontLoadState((prev) => ({ ...prev, nama: "success" }));
        if (typeof data?.ascentRatio === "number") {
          setFontMetrics((prev) => ({ ...prev, nama: data.ascentRatio }));
        }
      })
      .catch((error) => {
        setFontLoadState((prev) => ({ ...prev, nama: "error" }));
        setFontLoadError((prev) => ({
          ...prev,
          nama: error?.message || "Gagal memuat font nama.",
        }));
      });
  }, [fontNamaFile]);

  useEffect(() => {
    if (!enableSebagai || !fontSebagaiFile) {
      setFontSebagaiUrl("");
      setFontSebagaiPath("");
      setFontSebagaiKey("");
      setFontMetrics((prev) => ({ ...prev, sebagai: null }));
      setFontLoadState((prev) => ({ ...prev, sebagai: "idle" }));
      setFontLoadError((prev) => ({ ...prev, sebagai: "" }));
      return;
    }
    setFontLoadState((prev) => ({ ...prev, sebagai: "loading" }));
    setFontLoadError((prev) => ({ ...prev, sebagai: "" }));
    const formData = new FormData();
    formData.append("font", fontSebagaiFile);
    fetch("/api/font-preview", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data?.error) throw new Error(data.error);
        setFontSebagaiUrl(data.fontUrl || "");
        setFontSebagaiPath(data.fontPath || "");
        setFontSebagaiKey(data.fontKey || "");
        setFontLoadState((prev) => ({ ...prev, sebagai: "success" }));
        if (typeof data?.ascentRatio === "number") {
          setFontMetrics((prev) => ({ ...prev, sebagai: data.ascentRatio }));
        }
      })
      .catch((error) => {
        setFontLoadState((prev) => ({ ...prev, sebagai: "error" }));
        setFontLoadError((prev) => ({
          ...prev,
          sebagai: error?.message || "Gagal memuat font sebagai.",
        }));
      });
  }, [fontSebagaiFile, enableSebagai]);

  const missingRequirements = useMemo(() => {
    const missing = [];
    if (!templateFile) missing.push("Template sertifikat belum dipilih.");
    if (templateFile && imageSize.width <= 0)
      missing.push("Template sedang diproses, tunggu sebentar.");
    if (!excelFile) missing.push("File Excel peserta belum dipilih.");
    if (!fontNamaFile) {
      missing.push("Font Nama belum dipilih.");
    } else if (!fontNamaKey || fontLoadState.nama === "loading") {
      missing.push("Font Nama belum siap digunakan.");
    } else if (fontLoadState.nama === "error") {
      missing.push("Font Nama gagal dibaca.");
    }

    if (enableSebagai) {
      if (!fontSebagaiFile) {
        missing.push('Font untuk teks "Sebagai" belum dipilih.');
      } else if (!fontSebagaiKey || fontLoadState.sebagai === "loading") {
        missing.push('Font untuk teks "Sebagai" belum siap.');
      } else if (fontLoadState.sebagai === "error") {
        missing.push('Font untuk teks "Sebagai" gagal dibaca.');
      }
    }
    return missing;
  }, [
    templateFile,
    excelFile,
    fontNamaFile,
    fontNamaKey,
    fontSebagaiFile,
    fontSebagaiKey,
    enableSebagai,
    imageSize.width,
    fontLoadState.nama,
    fontLoadState.sebagai,
  ]);

  const canGenerate = useMemo(() => {
    return missingRequirements.length === 0;
  }, [missingRequirements]);

  const handleGenerate = async () => {
    stopPolling();
    if (!canGenerate) {
      setStatus(missingRequirements[0] || "Lengkapi data terlebih dahulu.");
      setStatusTone("error");
      return;
    }
    setLoading(true);
    setStatus("Mengupload file ke cloud...");
    setStatusTone("processing");
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
      setStatusTone("processing");

      const generateRes = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          excelKey: uploadData.files.excel,
          templateKey: uploadData.files.template,
          fontNamaKey,
          fontSebagaiKey: enableSebagai ? fontSebagaiKey : null,
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
            setStatusTone("processing");
            pollRef.current = setTimeout(pollStatus, 700);
            return;
          }
          if (data.status === "error") {
            throw new Error(data?.error || "Generate gagal.");
          }
          setStatus(`Menyiapkan ZIP untuk ${total} data...`);
          setStatusTone("processing");
          const zipRes = await fetch(`/api/generate/download?jobId=${jobId}`);
          if (!zipRes.ok) {
            const errorData = await zipRes.json().catch(() => null);
            throw new Error(errorData?.error || "Download ZIP gagal.");
          }
          const downloadData = await zipRes.json();
          const nextUrl = downloadData?.url;
          if (!nextUrl) {
            throw new Error("URL download ZIP tidak tersedia.");
          }
          if (downloadUrl && downloadUrl.startsWith("blob:")) {
            URL.revokeObjectURL(downloadUrl);
          }
          setDownloadUrl(nextUrl);
          const link = document.createElement("a");
          link.href = nextUrl;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setStatus("Selesai. ZIP terunduh.");
          setStatusTone("done");
          setLoading(false);
        } catch (error) {
          setStatus(error?.message || "Terjadi kesalahan.");
          setStatusTone("error");
          setLoading(false);
        }
      };

      pollStatus();
    } catch (error) {
      setStatus(error?.message || "Terjadi kesalahan.");
      setStatusTone("error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900">
      <div className="mx-auto max-w-6xl px-6 py-8 lg:py-12">
        <header className="mb-10 space-y-3">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">
            Sertifikat Generator
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            Generate Sertifikat Massal dari Template + Excel
          </h1>
          <p className="max-w-2xl text-slate-700">
            Upload template, Excel, dan font. Atur posisi teks di preview, lalu
            generate ZIP berisi PDF untuk setiap peserta.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="relative">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="mb-4 flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-slate-900 hover:border-blue-400 lg:hidden"
            >
              <span className="text-lg">☰</span>
              Buka Pengaturan Sertifikat
            </button>

            <div
              className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity lg:hidden ${
                sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              onClick={() => setSidebarOpen(false)}
            />
            <aside
              className={`no-scrollbar fixed left-0 top-0 z-50 h-full w-[320px] max-w-[86vw] overflow-y-auto border-r border-blue-100 bg-white p-6 shadow-2xl transition-transform lg:static lg:h-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:border-r-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
              } lg:translate-x-0`}
            >
              <div className="mb-6 flex items-center justify-between lg:hidden">
                <span className="text-sm uppercase tracking-[0.3em] text-slate-500">
                  Pengaturan
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-full border border-blue-200 px-3 py-1 text-xs text-slate-800"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {/* Bagian 1: Berkas & Data */}
                <div className="rounded-xl border border-blue-100 bg-white shadow-md shadow-blue-100/30 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setActiveSection(activeSection === "materials" ? "" : "materials")}
                    className="flex w-full items-center justify-between px-5 py-4 bg-blue-50/20 hover:bg-blue-50/50 font-semibold text-slate-800 text-sm transition border-b border-blue-50/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">📁</span>
                      <span>1. Bahan Sertifikat</span>
                    </div>
                    <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${activeSection === "materials" ? "rotate-90" : ""}`}>▶</span>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out ${activeSection === "materials" ? "max-h-[1200px] p-5 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                    <div className="space-y-5">
                      
                      {/* Template File Upload */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                          Template Latar (Wajib)
                        </label>
                        <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                          templateFile 
                            ? 'border-emerald-300 bg-emerald-50/10' 
                            : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}>
                          {templateFile ? (
                            <div className="flex w-full items-center justify-between gap-3 text-left">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{templateFile.name}</p>
                                <p className="text-xs text-slate-400">
                                  {imageSize.width > 0 ? `${imageSize.width} x ${imageSize.height} px` : 'Memproses gambar...'}
                                </p>
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setTemplateFile(null)} 
                                className="rounded-lg bg-white p-1 text-slate-450 hover:text-rose-500 shadow-sm border border-slate-200 transition cursor-pointer"
                                title="Hapus"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full cursor-pointer py-1 select-none">
                              <span className="text-2xl mb-1">🖼️</span>
                              <span className="text-xs font-semibold text-blue-600 hover:text-blue-700">Pilih Template Gambar</span>
                              <span className="text-[10px] text-slate-400 mt-1">PNG atau JPG</span>
                              <input 
                                type="file" 
                                accept="image/png,image/jpeg"
                                onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                                className="hidden" 
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Excel File Upload */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                          Data Peserta Excel (Wajib)
                        </label>
                        <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                          excelFile 
                            ? 'border-emerald-300 bg-emerald-50/10' 
                            : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}>
                          {excelFile ? (
                            <div className="flex w-full items-center justify-between gap-3 text-left">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{excelFile.name}</p>
                                {excelInfoLoading && <p className="text-xs text-amber-600">Membaca Excel...</p>}
                                {excelCount !== null && !excelInfoError && (
                                  <p className="text-xs text-emerald-600 font-medium">✓ {excelCount} data peserta terdeteksi</p>
                                )}
                                {excelInfoError && <p className="text-xs text-rose-600 font-medium">⚠ {excelInfoError}</p>}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setExcelFile(null);
                                  setExcelCount(null);
                                  setExcelInfoError("");
                                }} 
                                className="rounded-lg bg-white p-1 text-slate-450 hover:text-rose-500 shadow-sm border border-slate-200 transition cursor-pointer"
                                title="Hapus"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full cursor-pointer py-1 select-none">
                              <span className="text-2xl mb-1">📊</span>
                              <span className="text-xs font-semibold text-blue-600 hover:text-blue-700">Pilih Berkas Excel</span>
                              <span className="text-[10px] text-slate-400 mt-1">Format XLSX</span>
                              <input 
                                type="file" 
                                accept=".xlsx"
                                onChange={async (event) => {
                                  const file = event.target.files?.[0] || null;
                                  setExcelFile(file);
                                  setExcelCount(null);
                                  setExcelInfoError("");
                                  setExcelInfoLoading(false);
                                  if (!file) return;
                                  setExcelInfoLoading(true);
                                  try {
                                    const formData = new FormData();
                                    formData.append("excel", file);
                                    const res = await fetch("/api/excel-info", {
                                      method: "POST",
                                      body: formData,
                                    });
                                    const data = await res.json();
                                    if (!res.ok) throw new Error(data?.error || "Gagal membaca Excel.");
                                    setExcelCount(data.count);
                                  } catch (err) {
                                    setExcelInfoError(err?.message || "Gagal membaca Excel.");
                                  } finally {
                                    setExcelInfoLoading(false);
                                  }
                                }}
                                className="hidden" 
                              />
                            </label>
                          )}
                        </div>
                        <a
                          href="/uploads/template.xlsx"
                          download
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/10 cursor-pointer"
                        >
                          📥 Download Contoh Excel
                        </a>
                      </div>

                      {/* Font Nama Upload */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                          Font Teks Nama (Wajib)
                        </label>
                        <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                          fontNamaFile 
                            ? 'border-emerald-300 bg-emerald-50/10' 
                            : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}>
                          {fontNamaFile ? (
                            <div className="flex w-full items-center justify-between gap-3 text-left">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-800">{fontNamaFile.name}</p>
                                {fontLoadState.nama === "loading" && <p className="text-xs text-amber-600">Memproses font...</p>}
                                {fontLoadState.nama === "success" && <p className="text-xs text-emerald-600 font-medium">✓ Font siap digunakan</p>}
                                {fontLoadState.nama === "error" && <p className="text-xs text-rose-600 font-medium">⚠ {fontLoadError.nama}</p>}
                              </div>
                              <button 
                                type="button" 
                                onClick={() => setFontNamaFile(null)} 
                                className="rounded-lg bg-white p-1 text-slate-455 hover:text-rose-500 shadow-sm border border-slate-200 transition cursor-pointer"
                                title="Hapus"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full cursor-pointer py-1 select-none">
                              <span className="text-2xl mb-1">🔤</span>
                              <span className="text-xs font-semibold text-blue-600 hover:text-blue-700">Pilih Berkas Font</span>
                              <span className="text-[10px] text-slate-400 mt-1">TTF, OTF, atau ZIP</span>
                              <input 
                                type="file" 
                                accept=".ttf,.otf,.zip"
                                onChange={(event) => setFontNamaFile(event.target.files?.[0] || null)}
                                className="hidden" 
                              />
                            </label>
                          )}
                        </div>
                        <a
                          href="https://www.dafont.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-blue-200 hover:text-blue-600 hover:bg-blue-50/10 cursor-pointer"
                        >
                          🌐 Cari Font di DaFont
                        </a>
                      </div>

                      {/* Opsi Teks Sebagai Toggle Switch */}
                      <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/30 px-3.5 py-3">
                        <div className="pr-2">
                          <span className="text-sm font-semibold text-slate-800">Tampilkan Teks &quot;Sebagai&quot;</span>
                          <p className="text-[11px] text-slate-500">Tambahkan keterangan peran/jabatan</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
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
                                setFontSebagaiKey("");
                                setFontMetrics((prev) => ({ ...prev, sebagai: null }));
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-6 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Font Sebagai Upload (Conditional) */}
                      {enableSebagai && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                            Font Teks &quot;Sebagai&quot; (Wajib)
                          </label>
                          <div className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
                            fontSebagaiFile 
                              ? 'border-emerald-300 bg-emerald-50/10' 
                              : 'border-blue-200 bg-blue-50/20 hover:border-blue-400 hover:bg-blue-50/50'
                          }`}>
                            {fontSebagaiFile ? (
                              <div className="flex w-full items-center justify-between gap-3 text-left">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-800">{fontSebagaiFile.name}</p>
                                  {fontLoadState.sebagai === "loading" && <p className="text-xs text-amber-600">Memproses font...</p>}
                                  {fontLoadState.sebagai === "success" && <p className="text-xs text-emerald-600 font-medium">✓ Font siap digunakan</p>}
                                  {fontLoadState.sebagai === "error" && <p className="text-xs text-rose-600 font-medium">⚠ {fontLoadError.sebagai}</p>}
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setFontSebagaiFile(null)} 
                                  className="rounded-lg bg-white p-1 text-slate-455 hover:text-rose-500 shadow-sm border border-slate-200 transition cursor-pointer"
                                  title="Hapus"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-full cursor-pointer py-1 select-none">
                                <span className="text-2xl mb-1">🔤</span>
                                <span className="text-xs font-semibold text-blue-600 hover:text-blue-700">Pilih Berkas Font</span>
                                <span className="text-[10px] text-slate-400 mt-1">TTF, OTF, atau ZIP</span>
                                <input 
                                  type="file" 
                                  accept=".ttf,.otf,.zip"
                                  onChange={(event) => setFontSebagaiFile(event.target.files?.[0] || null)}
                                  className="hidden" 
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                {/* Bagian 2: Gaya Teks */}
                <div className="rounded-xl border border-blue-100 bg-white shadow-md shadow-blue-100/30 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setActiveSection(activeSection === "styling" ? "" : "styling")}
                    className="flex w-full items-center justify-between px-5 py-4 bg-blue-50/20 hover:bg-blue-50/50 font-semibold text-slate-800 text-sm transition border-b border-blue-50/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">🎨</span>
                      <span>2. Pengaturan Gaya Teks</span>
                    </div>
                    <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${activeSection === "styling" ? "rotate-90" : ""}`}>▶</span>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out ${activeSection === "styling" ? "max-h-[1200px] p-5 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                    <div className="space-y-6">
                      
                      {/* Gaya Nama */}
                      <div className="space-y-4">
                        <h3 className="font-bold text-xs text-blue-600 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                          Gaya Teks Nama
                        </h3>
                        
                        {/* Size Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>Ukuran Huruf</span>
                            <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-mono font-bold">
                              {namePos.fontSize} px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={namePos.fontSize}
                            onChange={(event) =>
                              setNamePos((prev) => ({
                                ...prev,
                                fontSize: Number(event.target.value) || prev.fontSize,
                              }))
                            }
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                        {/* Rata Tengah Toggle */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-xs font-semibold text-slate-700">Rata Tengah Otomatis</span>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={alignCenter.nama}
                              onChange={(event) =>
                                setAlignCenter((prev) => ({
                                  ...prev,
                                  nama: event.target.checked,
                                }))
                              }
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        {/* Warna Teks */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-xs font-semibold text-slate-700">Warna Huruf</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 uppercase font-medium">{namePos.color}</span>
                            <input
                              type="color"
                              value={namePos.color}
                              onChange={(event) =>
                                setNamePos((prev) => ({
                                  ...prev,
                                  color: event.target.value,
                                }))
                              }
                              className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        </div>

                        {/* Warna Outline */}
                        <div className="flex items-center justify-between py-1 border-b border-slate-50">
                          <span className="text-xs font-semibold text-slate-700">Warna Outline</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-400 uppercase font-medium">{namePos.strokeColor}</span>
                            <input
                              type="color"
                              value={namePos.strokeColor}
                              onChange={(event) =>
                                setNamePos((prev) => ({
                                  ...prev,
                                  strokeColor: event.target.value,
                                }))
                              }
                              className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        </div>

                        {/* Ketebalan Outline Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                            <span>Ketebalan Outline</span>
                            <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-mono font-bold">
                              {namePos.strokeWidth} px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="8"
                            step="0.5"
                            value={namePos.strokeWidth}
                            onChange={(event) =>
                              setNamePos((prev) => ({
                                ...prev,
                                strokeWidth: Number(event.target.value) || 0,
                              }))
                            }
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>

                      </div>

                      {/* Gaya Sebagai (Conditional) */}
                      {enableSebagai && (
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                          <h3 className="font-bold text-xs text-blue-600 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                            Gaya Teks &quot;Sebagai&quot;
                          </h3>
                          
                          {/* Size Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                              <span>Ukuran Huruf</span>
                              <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-mono font-bold">
                                {rolePos.fontSize} px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="10"
                              max="200"
                              value={rolePos.fontSize}
                              onChange={(event) =>
                                setRolePos((prev) => ({
                                  ...prev,
                                  fontSize: Number(event.target.value) || prev.fontSize,
                                }))
                              }
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>

                          {/* Rata Tengah Toggle */}
                          <div className="flex items-center justify-between py-1 border-b border-slate-50">
                            <span className="text-xs font-semibold text-slate-700">Rata Tengah Otomatis</span>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={alignCenter.sebagai}
                                onChange={(event) =>
                                  setAlignCenter((prev) => ({
                                    ...prev,
                                    sebagai: event.target.checked,
                                  }))
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-100 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          {/* Warna Teks */}
                          <div className="flex items-center justify-between py-1 border-b border-slate-50">
                            <span className="text-xs font-semibold text-slate-700">Warna Huruf</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-400 uppercase font-medium">{rolePos.color}</span>
                              <input
                                type="color"
                                value={rolePos.color}
                                onChange={(event) =>
                                  setRolePos((prev) => ({
                                    ...prev,
                                    color: event.target.value,
                                  }))
                                }
                                className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                          </div>

                          {/* Warna Outline */}
                          <div className="flex items-center justify-between py-1 border-b border-slate-50">
                            <span className="text-xs font-semibold text-slate-700">Warna Outline</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-slate-400 uppercase font-medium">{rolePos.strokeColor}</span>
                              <input
                                type="color"
                                value={rolePos.strokeColor}
                                onChange={(event) =>
                                  setRolePos((prev) => ({
                                    ...prev,
                                    strokeColor: event.target.value,
                                  }))
                                }
                                className="h-8 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white"
                              />
                            </div>
                          </div>

                          {/* Ketebalan Outline Slider */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                              <span>Ketebalan Outline</span>
                              <span className="bg-blue-50 px-2 py-0.5 rounded text-blue-600 font-mono font-bold">
                                {rolePos.strokeWidth} px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="8"
                              step="0.5"
                              value={rolePos.strokeWidth}
                              onChange={(event) =>
                                setRolePos((prev) => ({
                                  ...prev,
                                  strokeWidth: Number(event.target.value) || 0,
                                }))
                              }
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                          </div>

                        </div>
                      )}

                      {!enableSebagai && (
                        <p className="text-xs text-slate-400 text-center italic py-2">
                          Aktifkan opsi teks &quot;Sebagai&quot; di bagian 1 untuk mengatur gayanya.
                        </p>
                      )}

                    </div>
                  </div>
                </div>

                {/* Bagian 3: Cek Kesiapan */}
                <div className="rounded-xl border border-blue-100 bg-white shadow-md shadow-blue-100/30 overflow-hidden transition-all">
                  <button
                    type="button"
                    onClick={() => setActiveSection(activeSection === "generate" ? "" : "generate")}
                    className="flex w-full items-center justify-between px-5 py-4 bg-blue-50/20 hover:bg-blue-50/50 font-semibold text-slate-800 text-sm transition border-b border-blue-50/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">⚡</span>
                      <span>3. Kesiapan & Hasil</span>
                    </div>
                    <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${activeSection === "generate" ? "rotate-90" : ""}`}>▶</span>
                  </button>
                  <div className={`transition-all duration-200 ease-in-out ${activeSection === "generate" ? "max-h-[800px] p-5 opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
                    <div className="space-y-4">
                      
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                          Daftar Cek Kesiapan
                        </p>
                        <ul className="space-y-2 text-xs">
                          <li className="flex items-center gap-2.5">
                            <span className={templateFile ? "text-emerald-500 font-bold text-sm" : "text-slate-300 font-bold"}>
                              {templateFile ? "✓" : "•"}
                            </span>
                            <span className={templateFile ? "text-slate-700 font-medium" : "text-slate-400"}>
                              Latar gambar template
                            </span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className={excelFile ? "text-emerald-500 font-bold text-sm" : "text-slate-300 font-bold"}>
                              {excelFile ? "✓" : "•"}
                            </span>
                            <span className={excelFile ? "text-slate-700 font-medium" : "text-slate-400"}>
                              Berkas Excel data peserta
                            </span>
                          </li>
                          <li className="flex items-center gap-2.5">
                            <span className={fontNamaKey ? "text-emerald-500 font-bold text-sm" : "text-slate-300 font-bold"}>
                              {fontNamaKey ? "✓" : "•"}
                            </span>
                            <span className={fontNamaKey ? "text-slate-700 font-medium" : "text-slate-400"}>
                              Berkas Font teks nama
                            </span>
                          </li>
                          {enableSebagai && (
                            <li className="flex items-center gap-2.5">
                              <span className={fontSebagaiKey ? "text-emerald-500 font-bold text-sm" : "text-slate-300 font-bold"}>
                                {fontSebagaiKey ? "✓" : "•"}
                              </span>
                              <span className={fontSebagaiKey ? "text-slate-700 font-medium" : "text-slate-400"}>
                                Berkas Font teks &quot;Sebagai&quot;
                              </span>
                            </li>
                          )}
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <section className="flex w-full min-w-0 justify-center">
            <div className="w-full min-w-0 max-w-4xl rounded-2xl border border-blue-100 bg-blue-50 p-4">
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
                  nameStroke={{
                    width: namePos.strokeWidth,
                    color: namePos.strokeColor,
                  }}
                  roleStroke={{
                    width: rolePos.strokeWidth,
                    color: rolePos.strokeColor,
                  }}
                  alignCenterNama={alignCenter.nama}
                  alignCenterSebagai={alignCenter.sebagai}
                  showSebagai={enableSebagai}
                />
              ) : (
                <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-blue-200 bg-blue-50 text-sm text-slate-500">
                  Upload template untuk mulai preview.
                </div>
              )}
              <div className="mt-4 space-y-3">
                <p className="text-xs text-slate-500">
                  Langkah terakhir: klik tombol di bawah untuk membuat dan
                  mengunduh file ZIP sertifikat.
                </p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading || !canGenerate}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-100 disabled:text-blue-400"
                >
                  {loading ? "Memproses..." : "Buat & Unduh ZIP Sertifikat"}
                </button>
                {!canGenerate && (
                  <div className="rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs text-slate-700">
                    Lengkapi dulu: {missingRequirements[0]}
                  </div>
                )}
                {status && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      statusTone === "processing"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : statusTone === "done"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : statusTone === "error"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : "border-blue-100 bg-white text-slate-700"
                    }`}
                  >
                    {status}
                  </div>
                )}
                {downloadUrl && (
                  <a
                    href={downloadUrl}
                    download="sertifikat.zip"
                    className="inline-flex w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-600/10 px-4 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-600/20"
                  >
                    Unduh Ulang File ZIP
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-12 flex items-center justify-center gap-2 text-sm text-slate-500">
          <span>Dibuat oleh</span>
          <button
            type="button"
            onClick={() => setShowEasterEgg(true)}
            className="text-blue-600 transition hover:text-blue-500"
            aria-label="Easter egg"
          >
            ❤
          </button>
          <a
            href="https://haisyam.my.id"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-800 hover:text-blue-600"
          >
            HaisyamDev
          </a>
        </footer>

        {showEasterEgg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4">
            <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-6 text-slate-900 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold">Easter Egg!</h3>
                <button
                  type="button"
                  onClick={() => setShowEasterEgg(false)}
                  className="rounded-full border border-blue-200 px-2 py-1 text-xs text-slate-800 hover:border-blue-400"
                >
                  ✕
                </button>
              </div>
              <p className="mt-4 text-sm text-slate-700">
                yahh ketahuan dehh siapa developernya hmmm nihh akun instagramnya{" "}
                <a
                  href="https://www.instagram.com/mhmdkhrzmi/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700"
                >
                  @mhmdkhrzmi
                </a>
                , jangan lupa follow yaaa! dia baikk kokkk heheee.
              </p>
              <div className="mt-6 flex justify-end">
                <a
                  href="https://www.instagram.com/mhmdkhrzmi/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-blue-200 px-4 py-2 text-sm text-blue-700 hover:border-blue-400"
                >
                  Follow!
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
