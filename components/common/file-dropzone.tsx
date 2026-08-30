"use client";

import { useCallback, useId, useRef, useState } from "react";
import { FileSpreadsheet, FileText, FileUp, ImageIcon, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
  if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"].includes(ext)) return ImageIcon;
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return FileSpreadsheet;
  return FileText;
}

function matchesAccept(file: File, accept?: string) {
  if (!accept?.trim()) return true;
  const tokens = accept.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  return tokens.some((token) => {
    if (token === "*/*") return true;
    if (token.endsWith("/*")) return type.startsWith(token.slice(0, -1));
    if (token.startsWith(".")) return ext === token;
    return type === token;
  });
}

function acceptHint(accept?: string) {
  if (!accept?.trim()) return "PDF, Office, images, and more";
  return accept
    .split(",")
    .map((t) => t.trim().replace(/^\./, "").toUpperCase())
    .filter(Boolean)
    .join(" · ");
}

export function FileDropzone({
  label,
  hint,
  accept,
  required,
  disabled,
  multiple = false,
  fileName,
  fileSize,
  previewUrl,
  progress,
  error,
  className,
  onFile,
  onClear
}: {
  label?: string;
  hint?: string;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
  multiple?: boolean;
  fileName?: string;
  fileSize?: number;
  previewUrl?: string;
  progress?: number;
  error?: string;
  className?: string;
  onFile: (file: File) => void;
  onClear?: () => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localName, setLocalName] = useState("");
  const [localSize, setLocalSize] = useState(0);
  const [localError, setLocalError] = useState("");

  const shownName = fileName || localName;
  const shownSize = fileSize ?? localSize;
  const shownError = error || localError;
  const Icon = shownName ? fileIcon(shownName) : UploadCloud;

  const takeFile = useCallback(
    (file: File | undefined) => {
      if (!file || disabled) return;
      if (!matchesAccept(file, accept)) {
        setLocalError(`This file type is not allowed. Use ${acceptHint(accept)}.`);
        return;
      }
      setLocalError("");
      setLocalName(file.name);
      setLocalSize(file.size);
      onFile(file);
    },
    [accept, disabled, onFile]
  );

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  return (
    <div className={cn("block", className)}>
      {label ? (
        <span className="mb-1.5 block text-sm font-semibold text-[color:var(--bs-ink)]">{label}</span>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={`${inputId}-hint`}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          takeFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "bs-dropzone",
          dragOver && "bs-dropzone-active",
          disabled && "pointer-events-none opacity-60",
          shownError && "bs-dropzone-error"
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          className="sr-only"
          accept={accept}
          required={required && !shownName && !previewUrl}
          disabled={disabled}
          multiple={multiple}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            takeFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {previewUrl ? (
          <img src={previewUrl} alt={shownName || "Selected file"} className="bs-dropzone-preview" />
        ) : (
          <span className="bs-dropzone-icon">
            <Icon className="size-6" aria-hidden="true" />
          </span>
        )}

        <div className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-ink">
            {dragOver ? "Drop to upload" : shownName ? shownName : "Drop a file here, or choose from your computer"}
          </p>
          <p id={`${inputId}-hint`} className="mt-0.5 text-xs text-slate-500">
            {hint || acceptHint(accept)}
            {shownName && shownSize ? ` · ${formatSize(shownSize)}` : null}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button type="button" variant="secondary" disabled={disabled} onClick={openPicker}>
            <FileUp className="size-4" aria-hidden="true" />
            Choose file
          </Button>
          {shownName || previewUrl ? (
            <Button
              type="button"
              variant="ghost"
              disabled={disabled || !onClear}
              className="!px-2"
              onClick={() => {
                setLocalName("");
                setLocalSize(0);
                setLocalError("");
                onClear?.();
              }}
            >
              <X className="size-4" aria-hidden="true" />
              <span className="sr-only">Remove file</span>
            </Button>
          ) : null}
        </div>
      </div>

      {typeof progress === "number" && progress > 0 ? (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[color:var(--bs-cloud)]">
          <div
            className="h-full rounded-full bg-[color:var(--bs-teal)] transition-all"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
      ) : null}
      {shownError ? <p className="mt-1 text-xs text-[color:var(--bs-coral)]">{shownError}</p> : null}
    </div>
  );
}
