"use client";

import { useRef, useState } from "react";
import { UploadCloud, FileCheck2, Loader2, Trash2, FileText } from "lucide-react";
import {
  uploadDriverDocument,
  deleteDriverDocument,
  type DocKind,
  type DriverDocument,
} from "@/lib/firebase/drivers";

const ACCEPT = "image/jpeg,image/png,image/heic,application/pdf";
const MAX_MB = 10;

export default function DocumentUploadField({
  uid,
  kind,
  label,
  helper,
  current,
  optional = false,
  onChange,
}: {
  uid: string;
  kind: DocKind;
  label: string;
  helper?: string;
  current?: DriverDocument | null;
  optional?: boolean;
  onChange?: (doc: DriverDocument | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerPick = () => inputRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Fichier trop volumineux (max ${MAX_MB} Mo).`);
      return;
    }

    try {
      setError(null);
      setUploading(true);
      const docData = await uploadDriverDocument(uid, kind, file);
      onChange?.(docData);
    } catch (err: any) {
      console.error("[upload]", err);
      setError(err.message || "Échec de l'upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!current?.path) return;
    if (!confirm("Supprimer ce document ?")) return;
    try {
      setUploading(true);
      await deleteDriverDocument(uid, kind, current.path);
      onChange?.(null);
    } catch (err: any) {
      setError(err.message || "Échec de la suppression");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            {optional && (
              <span className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                Optionnel
              </span>
            )}
          </div>
          {helper && (
            <p className="text-xs text-slate-500 mt-0.5">{helper}</p>
          )}
        </div>
        {current?.url ? (
          <FileCheck2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        ) : null}
      </div>

      {current?.url ? (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md">
          <FileText className="h-4 w-4 text-emerald-700 flex-shrink-0" />
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-emerald-900 truncate flex-1 hover:underline"
          >
            {current.filename || "Document"}
          </a>
          <button
            type="button"
            onClick={triggerPick}
            disabled={uploading}
            className="text-xs font-medium text-slate-700 hover:text-slate-900 underline"
          >
            Remplacer
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={uploading}
            className="text-red-600 hover:text-red-700"
            aria-label="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={triggerPick}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 text-sm text-slate-600 hover:text-amber-700 rounded-md transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Upload en cours…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" />
              Téléverser (JPG, PNG, PDF — max {MAX_MB} Mo)
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        className="hidden"
      />

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
