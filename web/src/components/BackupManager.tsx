"use client";

import { useEffect, useState } from "react";

export function BackupManager() {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[] | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("backup:lastExport") : null;
    if (stored) setLastBackupAt(stored);
  }, []);

  const doExport = async () => {
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/backup");
    if (!res.ok) {
      setError("Export failed");
      return;
    }
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "backup.csv";
    a.click();
    window.URL.revokeObjectURL(url);
    setSuccess("Export started (downloaded).");
    const ts = new Date().toLocaleString();
    setLastBackupAt(ts);
    if (typeof window !== "undefined") window.localStorage.setItem("backup:lastExport", ts);
  };

  const handleFile = (file: File | null) => {
    if (!file) {
      setFileContent(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileContent(String(e.target?.result || ""));
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    if (!fileContent) {
      setError("Please choose a CSV file first.");
      return;
    }
    if (mode === "replace") {
      setConfirmText("");
    }
    setShowConfirm(true);
  };

  const confirmImport = async () => {
    setBusy(true);
    setError(null);
    setErrorDetails(null);
    setSuccess(null);
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: fileContent, mode }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const importedMsg =
        typeof data.imported === "number" ? ` Imported rows: ${data.imported}.` : "";
      setSuccess(`Import completed.${importedMsg}`);
      setShowConfirm(false);
      setFileContent(null);
      setErrorDetails(null);
    } else {
      setError(data.error || "Import failed.");
      if (Array.isArray(data.errors) && data.errors.length) {
        setErrorDetails(data.errors);
      }
    }
    setBusy(false);
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-heading">Backup</p>
          <h3 className="text-lg font-semibold text-[var(--ic-navy)]">
            Export / Import CSV
          </h3>
          <p className="text-sm text-[var(--ic-gray-700)]">
            Last backup:{" "}
            <span className="font-semibold">
              {lastBackupAt || "Not yet downloaded on this device"}
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          {errorDetails && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {errorDetails.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button className="btn" onClick={doExport} disabled={busy}>
          Export CSV
        </button>
        <label className="btn btn-ghost border-[var(--ic-gray-200)]">
          Import CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="grid gap-2">
        <label className="flex items-center gap-2 text-sm text-[var(--ic-gray-700)]">
          <input
            type="radio"
            name="mode"
            value="merge"
            checked={mode === "merge"}
            onChange={() => setMode("merge")}
          />
          Merge data (upsert)
        </label>
        <label className="flex items-center gap-2 text-sm text-[var(--ic-gray-700)]">
          <input
            type="radio"
            name="mode"
            value="replace"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          <span className="font-semibold text-red-700">
            Replace (wipe existing then import) — danger
          </span>
        </label>
      </div>

      <div className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-2 text-sm text-[var(--ic-gray-700)]">
        Before importing, you will be prompted to confirm. Choose “replace” to wipe existing
        data before loading the CSV, or “merge” to upsert into existing records.
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Safety: keep backups encrypted and off source control; restrict who can access them. Maintain an offline copy of the latest known-good backup.
      </div>

      <div className="flex justify-end">
        <button className="btn btn-primary" onClick={doImport} disabled={busy || !fileContent}>
          {busy ? "Importing…" : "Import"}
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">
                  Confirm import
                </p>
                <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Proceed with import?</h3>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-[var(--ic-gray-500)] hover:text-[var(--ic-gray-700)]"
              >
                ✕
              </button>
            </div>
            <p className="mt-3 text-sm text-[var(--ic-gray-700)]">
              Mode: <strong>{mode === "replace" ? "Replace (wipe then import)" : "Merge (upsert)"}</strong>
              . Ensure your CSV has headers <code>collection,data</code> and JSON in the data column.
            </p>
            {mode === "replace" && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-semibold text-red-700">
                  Type REPLACE to confirm you want to delete existing data before import.
                </p>
                <input
                  className="w-full rounded-md border border-red-200 px-3 py-2"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="REPLACE"
                />
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setShowConfirm(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmImport}
                disabled={
                  busy || (mode === "replace" && confirmText.trim().toUpperCase() !== "REPLACE")
                }
              >
                {busy ? "Importing…" : "Confirm import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


