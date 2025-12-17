"use client";

import { useState } from "react";
import { showGlobalError } from "./GlobalErrorPopup";
import { showSuccessToast } from "./GlobalSuccessToast";

const PAYMENT_FIELDS = [
  { value: "policyIdentifier", label: "Policy Number/ID (Required)" },
  { value: "amount", label: "Payment Amount" },
  { value: "refundAmount", label: "Refund Amount" },
  { value: "paymentDate", label: "Payment Date" },
  { value: "paymentMethod", label: "Payment Method" },
  { value: "receiptNumber", label: "Receipt Number" },
  { value: "notes", label: "Notes" },
];

export function PaymentUploadTool() {
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [progress, setProgress] = useState<{ current: number; total: number; imported: number } | null>(null);
  const [liveErrors, setLiveErrors] = useState<string[]>([]);
  const [liveWarnings, setLiveWarnings] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      
      // Parse headers
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
      if (lines.length > 0) {
        const headerLine = lines[0];
        const parsedHeaders = headerLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setHeaders(parsedHeaders);
        
        // Auto-map common fields
        const autoMappings: Record<string, string> = {};
        parsedHeaders.forEach((header) => {
          const lowerHeader = header.toLowerCase();
          if (lowerHeader.includes("policy") && (lowerHeader.includes("number") || lowerHeader.includes("id"))) {
            autoMappings.policyIdentifier = header;
          } else if (lowerHeader === "amount" || lowerHeader === "payment amount") {
            autoMappings.amount = header;
          } else if (lowerHeader.includes("refund")) {
            autoMappings.refundAmount = header;
          } else if (lowerHeader.includes("date")) {
            autoMappings.paymentDate = header;
          } else if (lowerHeader.includes("method")) {
            autoMappings.paymentMethod = header;
          } else if (lowerHeader.includes("receipt")) {
            autoMappings.receiptNumber = header;
          } else if (lowerHeader.includes("note")) {
            autoMappings.notes = header;
          }
        });
        setFieldMappings(autoMappings);
      }
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (!csvText.trim()) {
      showGlobalError({ title: "Error", message: "Please select a CSV file first" });
      return;
    }

    if (!fieldMappings.policyIdentifier) {
      showGlobalError({ title: "Error", message: "Policy Number/ID mapping is required" });
      return;
    }

    try {
      setUploading(true);
      setResult(null);
      setProgress(null);
      setLiveErrors([]);
      setLiveWarnings([]);

      const res = await fetch("/api/admin/upload-payments-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvText,
          fieldMappings,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Upload request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n\n");

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;
          
          const jsonStr = line.substring(6);
          try {
            const event = JSON.parse(jsonStr);
            
            if (event.type === "progress") {
              setProgress({
                current: event.current,
                total: event.total,
                imported: event.imported,
              });
            } else if (event.type === "error") {
              setLiveErrors((prev) => [...prev, event.error]);
            } else if (event.type === "warning") {
              setLiveWarnings((prev) => [...prev, event.error]);
            } else if (event.type === "complete") {
              setResult({
                imported: event.imported,
                errors: event.errors,
                warnings: event.warnings,
              });
              showSuccessToast({
                title: "Upload complete",
                message: `Successfully imported ${event.imported} payment(s)`,
              });
              
              // Clear form
              setCsvText("");
              setHeaders([]);
              setFieldMappings({});
              
              // Clear file input
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.value = "";
            }
          } catch (e) {
            // Skip malformed JSON
          }
        }
      }
    } catch (err: any) {
      showGlobalError({ title: "Upload failed", message: err.message || "Could not upload payments" });
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Payment Upload</p>
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Upload Payments from CSV</h2>
        <p className="text-sm text-[var(--ic-gray-600)]">
          Upload a CSV file containing payment records. Each payment will be assigned to its respective policy and receipts will be generated automatically.
        </p>
      </div>

      {/* File upload */}
      <div>
        <label className="block text-sm font-medium text-[var(--ic-navy)] mb-2">
          Select CSV File
        </label>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-[var(--ic-gray-600)]
            file:mr-4 file:py-2 file:px-4
            file:rounded file:border-0
            file:text-sm file:font-medium
            file:bg-[var(--ic-navy)] file:text-white
            hover:file:bg-[var(--ic-navy)]/90
            cursor-pointer"
        />
      </div>

      {/* Field mappings */}
      {headers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--ic-navy)]">Map CSV Columns to Fields</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {PAYMENT_FIELDS.map((field) => (
              <div key={field.value}>
                <label className="block text-xs font-medium text-[var(--ic-gray-600)] mb-1">
                  {field.label}
                </label>
                <select
                  value={fieldMappings[field.value] || ""}
                  onChange={(e) =>
                    setFieldMappings((prev) => ({ ...prev, [field.value]: e.target.value }))
                  }
                  className="form-input w-full text-sm"
                >
                  <option value="">-- Select Column --</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload button */}
      {headers.length > 0 && (
        <div className="flex gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || !fieldMappings.policyIdentifier}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload Payments"}
          </button>
          <button
            onClick={() => {
              setCsvText("");
              setHeaders([]);
              setFieldMappings({});
              setResult(null);
              setProgress(null);
              setLiveErrors([]);
              setLiveWarnings([]);
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              if (fileInput) fileInput.value = "";
            }}
            className="btn-ghost border-[var(--ic-gray-200)]"
            disabled={uploading}
          >
            Clear
          </button>
        </div>
      )}

      {/* Progress bar */}
      {progress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Processing: {progress.current} / {progress.total}
            </span>
            <span className="text-sm font-medium text-green-700">
              Imported: {progress.imported}
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            ></div>
          </div>
          {(liveErrors.length > 0 || liveWarnings.length > 0) && (
            <div className="mt-2 text-xs text-blue-700">
              {liveWarnings.length > 0 && <span>⚠️ {liveWarnings.length} warnings </span>}
              {liveErrors.length > 0 && <span>❌ {liveErrors.length} errors</span>}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800 mb-2">Upload Summary</h3>
          <div className="text-sm text-green-700 space-y-1">
            <p>✅ <strong>{result.imported}</strong> payment(s) imported successfully</p>
            {result.warnings && result.warnings.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-yellow-700 font-medium">
                  ⚠️ {result.warnings.length} warning(s)
                </summary>
                <ul className="mt-1 ml-4 text-xs space-y-1 text-yellow-600">
                  {result.warnings.slice(0, 10).map((warning: string, i: number) => (
                    <li key={i}>{warning}</li>
                  ))}
                  {result.warnings.length > 10 && (
                    <li>... and {result.warnings.length - 10} more</li>
                  )}
                </ul>
              </details>
            )}
            {result.errors && result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-red-700 font-medium">
                  ❌ {result.errors.length} error(s)
                </summary>
                <ul className="mt-1 ml-4 text-xs space-y-1 text-red-600">
                  {result.errors.slice(0, 10).map((error: string, i: number) => (
                    <li key={i}>{error}</li>
                  ))}
                  {result.errors.length > 10 && (
                    <li>... and {result.errors.length - 10} more</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">CSV Format Requirements</h3>
        <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
          <li><strong>Policy Number/ID</strong> is required and must match an existing policy</li>
          <li><strong>Amount</strong> should be a number (currency symbols will be removed automatically)</li>
          <li><strong>Date</strong> formats supported: M/D/YYYY (e.g., 12/17/2025) or standard ISO dates</li>
          <li><strong>Receipt numbers</strong> will be auto-generated if not provided</li>
          <li>Duplicate payments (same policy, amount, and date) will be automatically skipped</li>
          <li>Policy balances and receipts are updated automatically</li>
        </ul>
      </div>
    </div>
  );
}

