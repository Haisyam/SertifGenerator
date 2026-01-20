"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";

const sampleName = "Contoh Nama";
const sampleRole = "Contoh Sebagai";

const textWidth = (text, fontSize) =>
  Math.max(120, text.length * fontSize * 0.6);
const textHeight = (fontSize) => Math.max(10, fontSize);
const fallbackAscentRatio = 0.8;

export default function PreviewEditor({
  templateUrl,
  fontNamaUrl,
  fontSebagaiUrl,
  imageSize,
  namePos,
  setNamePos,
  rolePos,
  setRolePos,
  nameAscentRatio,
  roleAscentRatio,
  alignCenterNama,
  alignCenterSebagai,
  showSebagai = true,
}) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const baseScale =
    imageSize.width > 0 && containerSize.width > 0
      ? Math.min(
          1,
          containerSize.width / imageSize.width,
          containerSize.height / imageSize.height
        )
      : 1;
  const scale = Math.min(1, baseScale);
  const scaledWidth = imageSize.width * scale;
  const scaledHeight = imageSize.height * scale;

  const nameAscent =
    (nameAscentRatio ?? fallbackAscentRatio) * namePos.fontSize;
  const roleAscent =
    (roleAscentRatio ?? fallbackAscentRatio) * rolePos.fontSize;
  const nameTop = namePos.y - nameAscent;
  const roleTop = rolePos.y - roleAscent;
  const nameWidth = alignCenterNama
    ? imageSize.width
    : textWidth(sampleName, namePos.fontSize);
  const roleWidth = alignCenterSebagai
    ? imageSize.width
    : textWidth(sampleRole, rolePos.fontSize);
  const nameX = alignCenterNama
    ? 0
    : Math.max(0, Math.min(namePos.x, imageSize.width - nameWidth));
  const roleX = alignCenterSebagai
    ? 0
    : Math.max(0, Math.min(rolePos.x, imageSize.width - roleWidth));

  const nameFontFamily = useMemo(
    () => (fontNamaUrl ? "FontNamaUpload" : "sans-serif"),
    [fontNamaUrl]
  );
  const roleFontFamily = useMemo(
    () => (fontSebagaiUrl ? "FontSebagaiUpload" : "sans-serif"),
    [fontSebagaiUrl]
  );

  useEffect(() => {
    if (!fontNamaUrl) return;
    const style = document.createElement("style");
    style.dataset.font = "font-nama";
    style.textContent = `
      @font-face {
        font-family: "FontNamaUpload";
        src: url("${fontNamaUrl}") format("truetype"), url("${fontNamaUrl}") format("opentype");
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [fontNamaUrl]);

  useEffect(() => {
    if (!fontSebagaiUrl) return;
    const style = document.createElement("style");
    style.dataset.font = "font-sebagai";
    style.textContent = `
      @font-face {
        font-family: "FontSebagaiUpload";
        src: url("${fontSebagaiUrl}") format("truetype"), url("${fontSebagaiUrl}") format("opentype");
        font-weight: normal;
        font-style: normal;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [fontSebagaiUrl]);

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative flex h-[360px] w-full items-center justify-center overflow-y-auto overflow-x-hidden rounded-xl border border-slate-800 bg-slate-950/40 md:h-[520px]"
      >
        <div style={{ width: scaledWidth, height: scaledHeight }}>
          <div
            className="relative"
            style={{
              width: imageSize.width,
              height: imageSize.height,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
          <img
            src={templateUrl}
            alt="Preview"
            className="h-full w-full select-none"
            draggable={false}
          />

          <Rnd
            bounds="parent"
            scale={scale}
            size={{
              width: nameWidth,
              height: textHeight(namePos.fontSize),
            }}
            position={{ x: nameX, y: nameTop }}
            enableResizing={!alignCenterNama}
            disableDragging={false}
            dragAxis={alignCenterNama ? "y" : "both"}
            onDragStop={(_, data) => {
              setNamePos((prev) => ({
                ...prev,
                x: alignCenterNama ? prev.x : data.x,
                y: data.y + nameAscent,
              }));
            }}
            onResizeStop={(_, __, ref, ___, position) => {
              const nextSize = Math.max(
                10,
                Math.round(ref.offsetHeight / 1.2)
              );
              const nextAscent =
                (nameAscentRatio ?? fallbackAscentRatio) * nextSize;
              setNamePos({
                x: alignCenterNama ? namePos.x : position.x,
                y: position.y + nextAscent,
                fontSize: nextSize,
                color: namePos.color,
              });
            }}
            className="absolute z-10"
          >
            <div
              className="h-full w-full text-left"
              style={{
                fontFamily: nameFontFamily,
                fontSize: namePos.fontSize,
                lineHeight: 1,
                color: namePos.color || "#111827",
                pointerEvents: "none",
                textAlign: alignCenterNama ? "center" : "left",
                whiteSpace: "nowrap",
              }}
            >
              {sampleName}
            </div>
          </Rnd>

          {showSebagai && (
            <Rnd
              bounds="parent"
              scale={scale}
              size={{
                width: roleWidth,
                height: textHeight(rolePos.fontSize),
              }}
              position={{ x: roleX, y: roleTop }}
              enableResizing={!alignCenterSebagai}
              disableDragging={false}
              dragAxis={alignCenterSebagai ? "y" : "both"}
              onDragStop={(_, data) => {
                setRolePos((prev) => ({
                  ...prev,
                  x: alignCenterSebagai ? prev.x : data.x,
                  y: data.y + roleAscent,
                }));
              }}
              onResizeStop={(_, __, ref, ___, position) => {
                const nextSize = Math.max(
                  10,
                  Math.round(ref.offsetHeight / 1.2)
                );
                const nextAscent =
                  (roleAscentRatio ?? fallbackAscentRatio) * nextSize;
                setRolePos({
                  x: alignCenterSebagai ? rolePos.x : position.x,
                  y: position.y + nextAscent,
                  fontSize: nextSize,
                  color: rolePos.color,
                });
              }}
              className="absolute z-10"
            >
              <div
                className="h-full w-full text-left"
                style={{
                  fontFamily: roleFontFamily,
                  fontSize: rolePos.fontSize,
                  lineHeight: 1,
                  color: rolePos.color || "#111827",
                  pointerEvents: "none",
                  textAlign: alignCenterSebagai ? "center" : "left",
                  whiteSpace: "nowrap",
                }}
              >
                {sampleRole}
              </div>
            </Rnd>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
