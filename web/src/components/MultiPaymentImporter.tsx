"use client";

import { useState } from "react";
import { showGlobalError } from "@/components/GlobalErrorPopup";
import { showSuccessToast } from "@/components/GlobalSuccessToast";

export function MultiPaymentImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        showGlobalError({
          title: "Invalid File",
          message: "Please select a CSV file",
        });
        return;
      }
      setFile(selectedFile);
      setResults(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showGlobalError({
        title: "No File Selected",
        message: "Please select a file first",
      });
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      // Read file as text
      const text = await file.text();

      // Send to API
      const response = await fetch("/api/admin/import-multi-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setResults(data);
      
      if (data.paymentsCreated > 0) {
        showSuccessToast({
          title: "Import Successful",
          message: `Successfully imported ${data.paymentsCreated} payment${data.paymentsCreated !== 1 ? "s" : ""}`,
        });
      }
      
      if (data.errors.length === 0 && data.policiesNotFound.length === 0) {
        setFile(null);
        // Reset file input
        const fileInput = document.getElementById("multi-payment-file") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      }
    } catch (err: any) {
      showGlobalError({
        title: "Upload Failed",
        message: err.message || "Failed to upload payments",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--ic-navy)]">
          Multi-Payment CSV Import
        </h2>
        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
          Import CSV files with multiple payments per policy. Each row should contain a policy number and up to 9 payment records (Rec Date 2-10, Rec Number 2-10, Rec Amt 2-10). Blank rows and blank payment columns are automatically skipped - the upload will continue processing all valid data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor="multi-payment-file" className="block text-sm font-medium text-[var(--ic-navy)] mb-2">
            Select CSV File
          </label>
          <input
            id="multi-payment-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={uploading}
            className="form-input w-full"
          />
          {file && (
            <p className="text-sm text-[var(--ic-gray-600)] mt-1">
              Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="btn btn-primary"
        >
          {uploading ? "Importing..." : "Import Payments"}
        </button>
      </div>

      {results && (
        <div className="space-y-3 mt-4 pt-4 border-t border-[var(--ic-gray-200)]">
          <h3 className="font-semibold text-[var(--ic-navy)]">Import Results</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-blue-50 rounded border border-blue-200">
              <div className="text-sm text-blue-600 font-medium">Total Rows</div>
              <div className="text-2xl font-bold text-blue-900">{results.totalRows}</div>
            </div>
            
            <div className="p-3 bg-green-50 rounded border border-green-200">
              <div className="text-sm text-green-600 font-medium">Payments Created</div>
              <div className="text-2xl font-bold text-green-900">{results.paymentsCreated}</div>
            </div>
            
            <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
              <div className="text-sm text-yellow-600 font-medium">Payments Skipped</div>
              <div className="text-2xl font-bold text-yellow-900">{results.paymentsSkipped}</div>
            </div>
            
            <div className="p-3 bg-red-50 rounded border border-red-200">
              <div className="text-sm text-red-600 font-medium">Errors</div>
              <div className="text-2xl font-bold text-red-900">{results.errors.length}</div>
            </div>
          </div>

          {results.policiesNotFound.length > 0 && (
            <details className="bg-orange-50 border border-orange-200 rounded p-3">
              <summary className="cursor-pointer font-medium text-orange-900">
                Policies Not Found ({results.policiesNotFound.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-orange-800 max-h-48 overflow-y-auto">
                {results.policiesNotFound.map((p: string, i: number) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </details>
          )}

          {results.duplicatesSkipped.length > 0 && (
            <details className="bg-yellow-50 border border-yellow-200 rounded p-3">
              <summary className="cursor-pointer font-medium text-yellow-900">
                Duplicates Skipped ({results.duplicatesSkipped.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-yellow-800 max-h-48 overflow-y-auto">
                {results.duplicatesSkipped.map((d: string, i: number) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </details>
          )}

          {results.errors.length > 0 && (
            <details className="bg-red-50 border border-red-200 rounded p-3">
              <summary className="cursor-pointer font-medium text-red-900">
                Errors ({results.errors.length})
              </summary>
              <ul className="mt-2 space-y-1 text-sm text-red-800 max-h-48 overflow-y-auto">
                {results.errors.map((e: string, i: number) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

