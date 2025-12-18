"use client";

import { useState } from "react";
import { showGlobalError } from "@/components/GlobalErrorPopup";
import { showSuccessToast } from "@/components/GlobalSuccessToast";

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length === 0) return { headers: [], rows: [] };

  const splitCsvRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
        continue;
      }
      current += ch;
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitCsvRow(lines[0]);
  const rows = lines.slice(1).map(splitCsvRow);

  return { headers, rows };
}

export function MultiPaymentImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      
      // Parse CSV to show headers for mapping
      const text = await selectedFile.text();
      const parsed = parseCsv(text);
      setCsvData(parsed);
      
      // Auto-detect field mappings
      const autoMappings: Record<string, string> = {};
      
      // Policy Number
      const policyCol = parsed.headers.findIndex(h => 
        h.toLowerCase().replace(/[\s_]+/g, "").includes("policynumber")
      );
      if (policyCol !== -1) autoMappings.policyNumber = parsed.headers[policyCol];
      
      // Account Number (optional)
      const accountCol = parsed.headers.findIndex(h =>
        h.toLowerCase().replace(/[\s_]+/g, "").includes("accountnumber")
      );
      if (accountCol !== -1) autoMappings.accountNumber = parsed.headers[accountCol];
      
      // Try to auto-map payment columns (2-10)
      for (let i = 2; i <= 10; i++) {
        const dateCol = parsed.headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[\s_]+/g, "");
          return normalized.includes(`recdate${i}`) || normalized === `recdate${i}`;
        });
        if (dateCol !== -1) autoMappings[`recDate${i}`] = parsed.headers[dateCol];
        
        const numberCol = parsed.headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[\s_]+/g, "");
          return normalized.includes(`recnumb${i}`) || normalized.includes(`recnumber${i}`);
        });
        if (numberCol !== -1) autoMappings[`recNumber${i}`] = parsed.headers[numberCol];
        
        const amtCol = parsed.headers.findIndex(h => {
          const normalized = h.toLowerCase().replace(/[\s_]+/g, "");
          return normalized.includes(`recamt${i}`) || normalized === `recamt${i}`;
        });
        if (amtCol !== -1) autoMappings[`recAmt${i}`] = parsed.headers[amtCol];
      }
      
      setFieldMappings(autoMappings);
    }
  };

  const handleMappingChange = (field: string, csvColumn: string) => {
    setFieldMappings(prev => ({
      ...prev,
      [field]: csvColumn,
    }));
  };

  const handleUpload = async () => {
    if (!file || !csvData) {
      showGlobalError({
        title: "No File Selected",
        message: "Please select a file first",
      });
      return;
    }

    // Validate required field is mapped
    if (!fieldMappings.policyNumber) {
      showGlobalError({
        title: "Missing Required Mapping",
        message: "Please map the Policy Number column",
      });
      return;
    }

    setUploading(true);
    setResults(null);

    try {
      const text = await file.text();

      const response = await fetch("/api/admin/import-multi-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          csvText: text,
          fieldMappings 
        }),
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
        setCsvData(null);
        setFieldMappings({});
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

  const paymentFields = [
    { key: "policyNumber", label: "Policy Number", required: true },
    { key: "accountNumber", label: "Account Number (Optional)", required: false },
    ...Array.from({ length: 9 }, (_, i) => [
      { key: `recDate${i + 2}`, label: `Payment Date ${i + 2}`, required: false },
      { key: `recNumber${i + 2}`, label: `Receipt Number ${i + 2}`, required: false },
      { key: `recAmt${i + 2}`, label: `Payment Amount ${i + 2}`, required: false },
    ]).flat(),
  ];

  return (
    <div className="card space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--ic-navy)]">
          Multi-Payment CSV Import
        </h2>
        <p className="text-sm text-[var(--ic-gray-600)] mt-1">
          Import CSV files with multiple payments per policy. Each row should contain a policy number and up to 9 payment records (2-10). Blank payment entries will be skipped.
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

        {/* Field Mapping Section */}
        {csvData && (
          <div className="border border-[var(--ic-gray-200)] rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-[var(--ic-navy)]">📋 Map CSV Columns to Fields</h3>
            <p className="text-xs text-[var(--ic-gray-600)]">
              Match your CSV column names to the expected fields. Required fields are marked with *.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
              {paymentFields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-[var(--ic-gray-700)] mb-1">
                    {field.label} {field.required && <span className="text-red-600">*</span>}
                  </label>
                  <select
                    value={fieldMappings[field.key] || ""}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="form-input w-full text-sm"
                    disabled={uploading}
                  >
                    <option value="">-- Not Mapped --</option>
                    {csvData.headers.map((header, i) => (
                      <option key={i} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || !csvData || uploading || !fieldMappings.policyNumber}
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

          {results.duplicatesSkipped && results.duplicatesSkipped.length > 0 && (
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
