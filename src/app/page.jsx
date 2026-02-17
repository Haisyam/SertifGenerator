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

              <section className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-xl shadow-blue-100/70 lg:p-6">
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-600">
                    Langkah 1
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Upload Bahan Wajib
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Siapkan latar sertifikat, Excel peserta, dan font untuk nama.
                  </p>
                </div>

                <div className="space-y-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      Template Sertifikat (Wajib)
                    </label>
                    <p className="text-xs text-slate-500">
                      Format PNG/JPG. Gambar ini akan jadi latar sertifikat.
                    </p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={(event) =>
                        setTemplateFile(event.target.files?.[0] || null)
                      }
                      className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      Data Peserta Excel (Wajib)
                    </label>
                    <p className="text-xs text-slate-500">
                      Format .xlsx dengan header minimal: nama.
                    </p>
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
                          if (!res.ok) {
                            throw new Error(data?.error || "Gagal membaca Excel.");
                          }
                          setExcelCount(data.count);
                        } catch (err) {
                          setExcelInfoError(
                            err?.message || "Gagal membaca Excel."
                          );
                        } finally {
                          setExcelInfoLoading(false);
                        }
                      }}
                      className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
                    />
                    {excelInfoLoading && (
                      <p className="text-xs text-amber-600">Membaca isi Excel...</p>
                    )}
                    {excelCount !== null && !excelInfoError && (
                      <p className="text-xs text-blue-600">
                        Total data terdeteksi: {excelCount}
                      </p>
                    )}
                    {excelInfoError && (
                      <p className="text-xs text-rose-600">{excelInfoError}</p>
                    )}
                    <a
                      href="/uploads/template.xlsx"
                      download
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-3 py-2 text-xs text-slate-800 transition hover:border-blue-400 hover:text-blue-700"
                    >
                      Download Contoh Excel
                    </a>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-800">
                      Font Nama (Wajib)
                    </label>
                    <p className="text-xs text-slate-500">
                      Format .ttf, .otf, atau .zip yang berisi font.
                    </p>
                    <input
                      type="file"
                      accept=".ttf,.otf,.zip"
                      onChange={(event) =>
                        setFontNamaFile(event.target.files?.[0] || null)
                      }
                      className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
                    />
                    {fontLoadState.nama === "loading" && (
                      <p className="text-xs text-amber-600">
                        Memproses font nama...
                      </p>
                    )}
                    {fontLoadState.nama === "success" && (
                      <p className="text-xs text-blue-600">
                        Font nama siap digunakan.
                      </p>
                    )}
                    {fontLoadState.nama === "error" && (
                      <p className="text-xs text-rose-600">
                        {fontLoadError.nama}
                      </p>
                    )}
                    <a
                      href="https://www.dafont.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center rounded-lg border border-blue-200 px-3 py-2 text-xs text-slate-800 transition hover:border-blue-400 hover:text-blue-700"
                    >
                      Cari Font Gratis
                    </a>
                  </div>

                  <label className="flex items-center justify-between rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-slate-700">
                    <span>Tampilkan teks &quot;Sebagai&quot; (Opsional)</span>
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
                      className="h-4 w-4 rounded border-blue-300 bg-white text-blue-600"
                    />
                  </label>

                  {enableSebagai && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-800">
                        Font Teks &quot;Sebagai&quot; (Wajib jika opsi aktif)
                      </label>
                      <p className="text-xs text-slate-500">
                        Upload font khusus untuk baris &quot;Sebagai&quot;.
                      </p>
                      <input
                        type="file"
                        accept=".ttf,.otf,.zip"
                        onChange={(event) =>
                          setFontSebagaiFile(event.target.files?.[0] || null)
                        }
                        className="w-full rounded-md border border-blue-200 bg-white px-3 py-2 text-sm text-slate-800 file:mr-4 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-blue-700"
                      />
                      {fontLoadState.sebagai === "loading" && (
                        <p className="text-xs text-amber-600">
                          Memproses font sebagai...
                        </p>
                      )}
                      {fontLoadState.sebagai === "success" && (
                        <p className="text-xs text-blue-600">
                          Font sebagai siap digunakan.
                        </p>
                      )}
                      {fontLoadState.sebagai === "error" && (
                        <p className="text-xs text-rose-600">
                          {fontLoadError.sebagai}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-600">
                    Langkah 2
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Atur Posisi dan Gaya Teks
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Geser teks di preview, lalu sesuaikan ukuran, warna, dan
                    rata tengah di sini.
                  </p>
                </div>

                <div className="space-y-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="space-y-4">
                    <h3 className="border-b border-blue-200 pb-2 text-sm font-semibold text-slate-900">
                      Pengaturan Nama
                    </h3>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Ukuran Huruf Nama</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setNamePos((prev) => ({
                              ...prev,
                              fontSize: Math.max(10, prev.fontSize - 2),
                            }))
                          }
                          className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
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
                          className="w-20 rounded-md border border-blue-200 bg-white px-2 py-1 text-right text-sm text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNamePos((prev) => ({
                              ...prev,
                              fontSize: Math.min(200, prev.fontSize + 2),
                            }))
                          }
                          className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <label className="flex items-center justify-between text-sm text-slate-700">
                      <span>Rata Tengah Otomatis (Nama)</span>
                      <input
                        type="checkbox"
                        checked={alignCenter.nama}
                        onChange={(event) =>
                          setAlignCenter((prev) => ({
                            ...prev,
                            nama: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-blue-300 bg-white text-blue-600"
                      />
                    </label>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Warna Huruf Nama</span>
                      <input
                        type="color"
                        value={namePos.color}
                        onChange={(event) =>
                          setNamePos((prev) => ({
                            ...prev,
                            color: event.target.value,
                          }))
                        }
                        className="h-9 w-24 cursor-pointer rounded-md border border-blue-200 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Warna Outline Nama</span>
                      <input
                        type="color"
                        value={namePos.strokeColor}
                        onChange={(event) =>
                          setNamePos((prev) => ({
                            ...prev,
                            strokeColor: event.target.value,
                          }))
                        }
                        className="h-9 w-24 cursor-pointer rounded-md border border-blue-200 bg-white"
                      />
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-700">
                      <span>Ketebalan Outline Nama</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setNamePos((prev) => ({
                              ...prev,
                              strokeWidth: Math.max(0, prev.strokeWidth - 0.5),
                            }))
                          }
                          className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          max="8"
                          step="0.5"
                          value={namePos.strokeWidth}
                          onChange={(event) =>
                            setNamePos((prev) => ({
                              ...prev,
                              strokeWidth: Math.max(
                                0,
                                Math.min(8, Number(event.target.value) || 0)
                              ),
                            }))
                          }
                          className="w-20 rounded-md border border-blue-200 bg-white px-2 py-1 text-right text-sm text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNamePos((prev) => ({
                              ...prev,
                              strokeWidth: Math.min(8, prev.strokeWidth + 0.5),
                            }))
                          }
                          className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {enableSebagai && (
                    <div className="space-y-4 pt-2">
                      <h3 className="border-b border-blue-200 pb-2 text-sm font-semibold text-slate-900">
                        Pengaturan Sebagai
                      </h3>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Ukuran Huruf Sebagai</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                fontSize: Math.max(10, prev.fontSize - 2),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
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
                            className="w-20 rounded-md border border-blue-200 bg-white px-2 py-1 text-right text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                fontSize: Math.min(200, prev.fontSize + 2),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <label className="flex items-center justify-between text-sm text-slate-700">
                        <span>Rata Tengah Otomatis (Sebagai)</span>
                        <input
                          type="checkbox"
                          checked={alignCenter.sebagai}
                          onChange={(event) =>
                            setAlignCenter((prev) => ({
                              ...prev,
                              sebagai: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-blue-300 bg-white text-blue-600"
                        />
                      </label>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Warna Huruf Sebagai</span>
                        <input
                          type="color"
                          value={rolePos.color}
                          onChange={(event) =>
                            setRolePos((prev) => ({
                              ...prev,
                              color: event.target.value,
                            }))
                          }
                          className="h-9 w-24 cursor-pointer rounded-md border border-blue-200 bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Warna Outline Sebagai</span>
                        <input
                          type="color"
                          value={rolePos.strokeColor}
                          onChange={(event) =>
                            setRolePos((prev) => ({
                              ...prev,
                              strokeColor: event.target.value,
                            }))
                          }
                          className="h-9 w-24 cursor-pointer rounded-md border border-blue-200 bg-white"
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm text-slate-700">
                        <span>Ketebalan Outline Sebagai</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                strokeWidth: Math.max(0, prev.strokeWidth - 0.5),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="8"
                            step="0.5"
                            value={rolePos.strokeWidth}
                            onChange={(event) =>
                              setRolePos((prev) => ({
                                ...prev,
                                strokeWidth: Math.max(
                                  0,
                                  Math.min(8, Number(event.target.value) || 0)
                                ),
                              }))
                            }
                            className="w-20 rounded-md border border-blue-200 bg-white px-2 py-1 text-right text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRolePos((prev) => ({
                                ...prev,
                                strokeWidth: Math.min(8, prev.strokeWidth + 0.5),
                              }))
                            }
                            className="h-8 w-8 rounded-md border border-blue-200 bg-white text-sm text-slate-900 hover:border-blue-400"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-blue-600">
                    Langkah 3
                  </p>
                  <h2 className="mt-1 text-sm font-semibold text-slate-900">
                    Cek Kesiapan Generate
                  </h2>
                  <ul className="mt-2 space-y-1 text-xs text-slate-700">
                    <li>{templateFile ? "✓" : "•"} Template sertifikat</li>
                    <li>{excelFile ? "✓" : "•"} Data Excel peserta</li>
                    <li>{fontNamaKey ? "✓" : "•"} Font nama</li>
                    {enableSebagai && (
                      <li>{fontSebagaiKey ? "✓" : "•"} Font sebagai</li>
                    )}
                  </ul>
                </div>
              </section>
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
