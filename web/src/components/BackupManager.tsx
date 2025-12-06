"use client";

import { useState } from "react";

export function BackupManager() {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [confirming, setConfirming] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!confirming) {
      setConfirming(true);
      setSuccess(null);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await fetch("/api/admin/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: fileContent, mode }),
    });
    if (res.ok) {
      setSuccess("Import completed.");
      setConfirming(false);
      setFileContent(null);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Import failed.");
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
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
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
          Delete existing data then import
        </label>
      </div>

      <div className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-2 text-sm text-[var(--ic-gray-700)]">
        Before importing, you will be prompted to confirm. Choose “replace” to wipe existing
        data before loading the CSV, or “merge” to upsert into existing records.
      </div>

      <div className="flex justify-end">
        <button
          className="btn btn-primary"
          onClick={doImport}
          disabled={busy || !fileContent}
        >
          {confirming ? "Are you sure? Click to confirm" : busy ? "Importing…" : "Import"}
        </button>
      </div>
    </div>
  );
}

