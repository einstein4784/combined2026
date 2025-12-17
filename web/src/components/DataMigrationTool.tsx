"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";

type CollectionType = "customers" | "policies" | "payments" | "receipts";

type FieldMapping = {
  csvColumn: string;
  dbField: string;
};

type FieldDefinition = {
  name: string;
  label: string;
  required: boolean;
  type: "string" | "number" | "date" | "boolean";
  options?: string[]; // for enum/select fields
};

const FIELD_DEFINITIONS: Record<CollectionType, FieldDefinition[]> = {
  customers: [
    { name: "firstName", label: "First Name", required: true, type: "string" },
    { name: "middleName", label: "Middle Name", required: false, type: "string" },
    { name: "lastName", label: "Last Name", required: true, type: "string" },
    { name: "address", label: "Address", required: true, type: "string" },
    { name: "contactNumber", label: "Contact Number", required: true, type: "string" },
    { name: "contactNumber2", label: "Secondary Contact", required: false, type: "string" },
    { name: "email", label: "Email", required: true, type: "string" },
    { name: "sex", label: "Sex", required: false, type: "string", options: ["Male", "Female", "Other"] },
    { name: "idNumber", label: "ID Number", required: true, type: "string" },
  ],
  policies: [
    { name: "policyNumber", label: "Policy Number", required: true, type: "string" },
    { name: "policyIdNumber", label: "Policy ID Number (Account Number)", required: true, type: "string" },
    { name: "customerId", label: "Customer ID (or email/idNumber to lookup)", required: true, type: "string" },
    { name: "coverageType", label: "Coverage Type", required: false, type: "string" },
    { name: "registrationNumber", label: "Registration Number", required: false, type: "string" },
    { name: "engineNumber", label: "Engine Number", required: false, type: "string" },
    { name: "chassisNumber", label: "Chassis Number", required: false, type: "string" },
    { name: "vehicleType", label: "Vehicle Type", required: false, type: "string" },
    { name: "coverageStartDate", label: "Coverage Start Date (Commencement Date)", required: false, type: "date" },
    { name: "coverageEndDate", label: "Coverage End Date (Expiry Date)", required: false, type: "date" },
    { name: "totalPremiumDue", label: "Total Premium Due (Amount Due)", required: true, type: "number" },
    { name: "amountPaid", label: "Amount Paid (Total Received)", required: false, type: "number" },
    { name: "outstandingBalance", label: "Outstanding Balance", required: true, type: "number" },
    { name: "status", label: "Status", required: false, type: "string", options: ["Active", "Cancelled", "Suspended"] },
    { name: "notes", label: "Notes", required: false, type: "string" },
  ],
  payments: [
    { name: "policyId", label: "Policy ID (or policyNumber to lookup)", required: true, type: "string" },
    { name: "amount", label: "Amount", required: false, type: "number" },
    { name: "refundAmount", label: "Refund Amount", required: false, type: "number" },
    { name: "paymentDate", label: "Payment Date", required: false, type: "date" },
    { name: "paymentMethod", label: "Payment Method", required: false, type: "string" },
    { name: "receiptNumber", label: "Receipt Number", required: false, type: "string" },
    { name: "arrearsOverrideUsed", label: "Arrears Override Used", required: false, type: "boolean" },
    { name: "notes", label: "Notes", required: false, type: "string" },
  ],
  receipts: [
    { name: "receiptNumber", label: "Receipt Number", required: true, type: "string" },
    { name: "paymentId", label: "Payment ID (or receiptNumber to lookup)", required: true, type: "string" },
    { name: "policyId", label: "Policy ID (or policyNumber to lookup)", required: true, type: "string" },
    { name: "customerId", label: "Customer ID (or email/idNumber to lookup)", required: true, type: "string" },
    { name: "amount", label: "Amount", required: true, type: "number" },
    { name: "paymentDate", label: "Payment Date", required: false, type: "date" },
    { name: "paymentMethod", label: "Payment Method", required: false, type: "string" },
    { name: "location", label: "Location", required: false, type: "string" },
    { name: "registrationNumber", label: "Registration Number", required: false, type: "string" },
    { name: "policyNumberSnapshot", label: "Policy Number (snapshot)", required: false, type: "string" },
    { name: "policyIdNumberSnapshot", label: "Policy ID Number (snapshot)", required: false, type: "string" },
    { name: "customerNameSnapshot", label: "Customer Name (snapshot)", required: false, type: "string" },
    { name: "customerEmailSnapshot", label: "Customer Email (snapshot)", required: false, type: "string" },
    { name: "customerContactSnapshot", label: "Customer Contact (snapshot)", required: false, type: "string" },
    { name: "outstandingBalanceAfter", label: "Outstanding Balance After", required: false, type: "number" },
    { name: "generatedByName", label: "Generated By Name", required: false, type: "string" },
    { name: "status", label: "Status", required: false, type: "string", options: ["active", "void"] },
    { name: "notes", label: "Notes", required: false, type: "string" },
  ],
};

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

export function DataMigrationTool() {
  const router = useRouter();
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionType>("customers");
  const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState(5);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    imported: number;
    errors: number;
  } | null>(null);

  const fieldDefinitions = FIELD_DEFINITIONS[collectionType];

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setCsvFile(null);
      setCsvContent(null);
      setCsvData(null);
      setFieldMappings({});
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result || "");
      setCsvContent(content);
      try {
        const parsed = parseCsv(content);
        setCsvData(parsed);
        // Auto-map fields with similar names
        const autoMappings: Record<string, string> = {};
        parsed.headers.forEach((header) => {
          const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
          fieldDefinitions.forEach((field) => {
            const lowerField = field.name.toLowerCase();
            
            // Enhanced matching logic for better CSV column recognition
            let matched = false;
            
            // Exact match
            if (lowerHeader === lowerField) {
              matched = true;
            }
            // Contains match
            else if (lowerHeader.includes(lowerField) || lowerField.includes(lowerHeader)) {
              matched = true;
            }
            // Special mappings for common CSV column variations
            else if (field.name === "firstName" && (lowerHeader.includes("first") || lowerHeader.includes("fname"))) {
              matched = true;
            }
            else if (field.name === "lastName" && (lowerHeader.includes("last") || lowerHeader.includes("lname"))) {
              matched = true;
            }
            else if (field.name === "contactNumber" && (lowerHeader.includes("cell") || lowerHeader.includes("phone") || lowerHeader.includes("mobile"))) {
              matched = true;
            }
            else if (field.name === "contactNumber2" && (lowerHeader.includes("work") || lowerHeader.includes("secondary"))) {
              matched = true;
            }
            else if (field.name === "policyIdNumber" && (lowerHeader.includes("account") || lowerHeader.includes("policyid") || lowerHeader.includes("idnumber"))) {
              matched = true;
            }
            else if (field.name === "coverageStartDate" && (lowerHeader.includes("commencement") || lowerHeader.includes("start") || lowerHeader.includes("begin"))) {
              matched = true;
            }
            else if (field.name === "coverageEndDate" && (lowerHeader.includes("expiry") || lowerHeader.includes("end") || lowerHeader.includes("expire"))) {
              matched = true;
            }
            else if (field.name === "totalPremiumDue" && (lowerHeader.includes("amountdue") || lowerHeader.includes("premium") || lowerHeader.includes("due"))) {
              matched = true;
            }
            else if (field.name === "amountPaid" && (lowerHeader.includes("totalreceived") || lowerHeader.includes("paid") || lowerHeader.includes("received"))) {
              matched = true;
            }
            else if (field.name === "engineNumber" && (lowerHeader.includes("engine") || lowerHeader.includes("engineno"))) {
              matched = true;
            }
            else if (field.name === "chassisNumber" && (lowerHeader.includes("chassis") || lowerHeader.includes("chassisno"))) {
              matched = true;
            }
            else if (field.name === "vehicleType" && (lowerHeader.includes("vehicle") || lowerHeader.includes("vehtype"))) {
              matched = true;
            }
            else if (field.name === "registrationNumber" && (lowerHeader.includes("registration") || lowerHeader.includes("reg") || lowerHeader.includes("plate"))) {
              matched = true;
            }
            else if (field.name === "coverageType" && (lowerHeader.includes("coverage") || lowerHeader.includes("type"))) {
              matched = true;
            }
            else if (field.name === "paymentDate" && (lowerHeader.includes("recdate") || lowerHeader.includes("paymentdate") || lowerHeader.includes("date"))) {
              matched = true;
            }
            else if (field.name === "receiptNumber" && (lowerHeader.includes("recnumber") || lowerHeader.includes("receipt"))) {
              matched = true;
            }
            else if (field.name === "amount" && (lowerHeader.includes("recamt") || lowerHeader.includes("amount") || lowerHeader.includes("amt"))) {
              matched = true;
            }
            
            if (matched && !autoMappings[field.name]) {
              autoMappings[field.name] = header;
            }
          });
        });
        setFieldMappings(autoMappings);
      } catch (err) {
        setError("Failed to parse CSV file");
      }
    };
    reader.readAsText(file);
  };

  const handleMappingChange = (dbField: string, csvColumn: string) => {
    setFieldMappings((prev) => {
      const updated = { ...prev };
      if (csvColumn === "") {
        delete updated[dbField];
      } else {
        updated[dbField] = csvColumn;
      }
      return updated;
    });
  };

  const validateMappings = (): string | null => {
    const requiredFields = fieldDefinitions.filter((f) => f.required);
    for (const field of requiredFields) {
      if (!fieldMappings[field.name]) {
        return `Required field "${field.label}" must be mapped (can map to blank CSV column if data is missing)`;
      }
    }
    return null;
  };

  const handleImport = async () => {
    if (!csvData || !csvContent) {
      setError("Please upload a CSV file first");
      return;
    }

    const validationError = validateMappings();
    if (validationError) {
      setError(validationError);
      return;
    }

    setBusy(true);
    setError(null);
    setErrorDetails([]);
    setSuccess(null);
    const totalRows = csvData.rows.length;
    
    // Initialize progress
    setProgress({
      current: 0,
      total: totalRows,
      imported: 0,
      errors: 0,
    });

    try {
      const res = await fetch("/api/admin/migrate-data-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvContent,
          collectionType,
          fieldMappings,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setProgress(null);
        setError(errorData.error || "Migration failed");
        setBusy(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) {
        setProgress(null);
        setError("Failed to start migration stream");
        setBusy(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === "progress") {
                setProgress({
                  current: data.current || 0,
                  total: data.total || totalRows,
                  imported: data.imported || 0,
                  errors: data.errors || 0,
                });
              } else if (data.type === "error") {
                setErrorDetails((prev) => [...prev, data.error]);
                setProgress((prev) => {
                  if (!prev) return null;
                  return { ...prev, errors: prev.errors + 1 };
                });
              } else if (data.type === "complete") {
                const importedCount = data.imported || 0;
                const errorCount = data.errors?.length || 0;
                
                setProgress({
                  current: data.total || totalRows,
                  total: data.total || totalRows,
                  imported: importedCount,
                  errors: errorCount,
                });

                const importedMsg = ` Imported ${importedCount} records.`;
                const errorsMsg = errorCount > 0 ? ` ${errorCount} errors occurred.` : "";
                showSuccessToast({
                  title: "Migration completed",
                  message: `Data migration completed.${importedMsg}${errorsMsg}`,
                });
                setSuccess(`Migration completed.${importedMsg}`);
                
                if (errorCount > 0 && Array.isArray(data.errors)) {
                  setErrorDetails(data.errors);
                  setError(`${errorCount} record(s) failed. See details below.`);
                }
                
                // Clear progress after 10 seconds
                setTimeout(() => {
                  setProgress(null);
                }, 10000);
                
                router.refresh();
                setBusy(false);
                return;
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
    } catch (err: any) {
      setProgress(null);
      setError(`An error occurred during migration: ${err?.message || "Unknown error"}`);
      setBusy(false);
      console.error("Migration error:", err);
    }
  };

  return (
    <div className="card space-y-4 max-w-full">
      <div>
        <p className="section-heading">Data Migration</p>
        <h3 className="text-lg font-semibold text-[var(--ic-navy)]">Import CSV Data</h3>
        <p className="text-sm text-[var(--ic-gray-700)]">
          Upload a CSV file and map its columns to database fields for importing data. Blank fields and rows are allowed - they will be skipped or filled with default values automatically.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {errorDetails.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-red-800">
              Error Log ({errorDetails.length} error{errorDetails.length !== 1 ? "s" : ""})
            </h4>
            <button
              onClick={() => setErrorDetails([])}
              className="text-red-600 hover:text-red-800 text-xs font-semibold px-2 py-1 rounded hover:bg-red-100"
            >
              Clear
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1 bg-white rounded p-2 border border-red-100">
            {errorDetails.map((err, idx) => (
              <div key={idx} className="text-xs text-red-700 bg-red-50 rounded px-2 py-1 border border-red-200 font-mono">
                <span className="text-red-500 font-semibold">[{idx + 1}]</span> {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {progress && (
        <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-blue-900">
              {progress.current >= progress.total ? "Import completed" : "Importing data..."}
            </span>
            <span className="text-sm font-semibold text-blue-700">
              {progress.current} / {progress.total} rows ({Math.round((progress.current / progress.total) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-4 overflow-hidden">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${Math.min((progress.current / progress.total) * 100, 100)}%`,
              }}
            />
          </div>
          <div className="flex items-center gap-4 text-xs text-blue-700">
            {progress.current >= progress.total ? (
              <>
                <span className="flex items-center gap-1.5 font-semibold">
                  <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                  {progress.imported} imported
                </span>
                {progress.errors > 0 && (
                  <span className="flex items-center gap-1.5 font-semibold">
                    <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                    {progress.errors} errors
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                  {progress.total - progress.imported - progress.errors} skipped
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
                  {progress.imported} imported
                </span>
                {progress.errors > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
                    {progress.errors} errors
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                  Processing row {progress.current}...
                </span>
              </>
            )}
          </div>
          {progress.current >= progress.total && progress.errors > 0 && (
            <div className="mt-2 text-xs text-red-700 bg-red-50 rounded px-2 py-1">
              Check error log below for details on failed rows.
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--ic-gray-700)] mb-2">
            Target Collection
          </label>
          <select
            className="w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2"
            value={collectionType}
            onChange={(e) => {
              const newCollectionType = e.target.value as CollectionType;
              setCollectionType(newCollectionType);
              // Re-run auto-mapping if CSV data is already loaded
              if (csvData && csvData.headers.length > 0) {
                const newFieldDefinitions = FIELD_DEFINITIONS[newCollectionType];
                const autoMappings: Record<string, string> = {};
                csvData.headers.forEach((header) => {
                  const lowerHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
                  newFieldDefinitions.forEach((field) => {
                    const lowerField = field.name.toLowerCase();
                    
                    // Enhanced matching logic for better CSV column recognition
                    let matched = false;
                    
                    // Exact match
                    if (lowerHeader === lowerField) {
                      matched = true;
                    }
                    // Contains match
                    else if (lowerHeader.includes(lowerField) || lowerField.includes(lowerHeader)) {
                      matched = true;
                    }
                    // Special mappings for common CSV column variations
                    else if (field.name === "firstName" && (lowerHeader.includes("first") || lowerHeader.includes("fname"))) {
                      matched = true;
                    }
                    else if (field.name === "lastName" && (lowerHeader.includes("last") || lowerHeader.includes("lname"))) {
                      matched = true;
                    }
                    else if (field.name === "contactNumber" && (lowerHeader.includes("cell") || lowerHeader.includes("phone") || lowerHeader.includes("mobile"))) {
                      matched = true;
                    }
                    else if (field.name === "contactNumber2" && (lowerHeader.includes("work") || lowerHeader.includes("secondary"))) {
                      matched = true;
                    }
                    else if (field.name === "policyIdNumber" && (lowerHeader.includes("account") || lowerHeader.includes("policyid") || lowerHeader.includes("idnumber"))) {
                      matched = true;
                    }
                    else if (field.name === "coverageStartDate" && (lowerHeader.includes("commencement") || lowerHeader.includes("start") || lowerHeader.includes("begin"))) {
                      matched = true;
                    }
                    else if (field.name === "coverageEndDate" && (lowerHeader.includes("expiry") || lowerHeader.includes("end") || lowerHeader.includes("expire"))) {
                      matched = true;
                    }
                    else if (field.name === "totalPremiumDue" && (lowerHeader.includes("amountdue") || lowerHeader.includes("premium") || lowerHeader.includes("due"))) {
                      matched = true;
                    }
                    else if (field.name === "amountPaid" && (lowerHeader.includes("totalreceived") || lowerHeader.includes("paid") || lowerHeader.includes("received"))) {
                      matched = true;
                    }
                    else if (field.name === "engineNumber" && (lowerHeader.includes("engine") || lowerHeader.includes("engineno"))) {
                      matched = true;
                    }
                    else if (field.name === "chassisNumber" && (lowerHeader.includes("chassis") || lowerHeader.includes("chassisno"))) {
                      matched = true;
                    }
                    else if (field.name === "vehicleType" && (lowerHeader.includes("vehicle") || lowerHeader.includes("vehtype"))) {
                      matched = true;
                    }
                    else if (field.name === "registrationNumber" && (lowerHeader.includes("registration") || lowerHeader.includes("reg") || lowerHeader.includes("plate"))) {
                      matched = true;
                    }
                    else if (field.name === "coverageType" && (lowerHeader.includes("coverage") || lowerHeader.includes("type"))) {
                      matched = true;
                    }
                    else if (field.name === "paymentDate" && (lowerHeader.includes("recdate") || lowerHeader.includes("paymentdate") || lowerHeader.includes("date"))) {
                      matched = true;
                    }
                    else if (field.name === "receiptNumber" && (lowerHeader.includes("recnumber") || lowerHeader.includes("receipt"))) {
                      matched = true;
                    }
                    else if (field.name === "amount" && (lowerHeader.includes("recamt") || lowerHeader.includes("amount") || lowerHeader.includes("amt"))) {
                      matched = true;
                    }
                    
                    if (matched && !autoMappings[field.name]) {
                      autoMappings[field.name] = header;
                    }
                  });
                });
                setFieldMappings(autoMappings);
              } else {
                setFieldMappings({});
              }
            }}
            disabled={busy}
          >
            <option value="customers">Customers</option>
            <option value="policies">Policies</option>
            <option value="payments">Payments</option>
            <option value="receipts">Receipts</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--ic-gray-700)] mb-2">
            CSV File
          </label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="w-full rounded-md border border-[var(--ic-gray-200)] px-3 py-2"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
          {csvFile && (
            <p className="mt-1 text-xs text-[var(--ic-gray-600)]">Selected: {csvFile.name}</p>
          )}
        </div>

        {csvData && csvData.headers.length > 0 && (
          <>
            <div>
              <label className="block text-sm font-semibold text-[var(--ic-gray-700)] mb-2">
                Field Mapping
              </label>
              <div className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] overflow-hidden">
                <div className="max-h-96 overflow-y-auto p-3">
                  <div className="space-y-2">
                    {fieldDefinitions.map((field) => {
                      const isMapped = !!fieldMappings[field.name];
                      const mappedColumn = fieldMappings[field.name];
                      return (
                        <div key={field.name} className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <label className="block text-xs font-semibold text-[var(--ic-gray-700)]">
                              {field.label}
                              {field.required && <span className="text-red-600 ml-1">*</span>}
                              <span className="text-[var(--ic-gray-500)] ml-1 text-xs font-normal">
                                ({field.type})
                              </span>
                              {isMapped && (
                                <span className="ml-2 text-xs text-green-600 font-normal">
                                  ✓ Mapped to: "{mappedColumn}"
                                </span>
                              )}
                            </label>
                            <select
                              className={`mt-1 w-full rounded-md border px-2 py-1 text-sm ${
                                field.required && !isMapped
                                  ? "border-red-300 bg-red-50"
                                  : isMapped
                                  ? "border-green-300 bg-green-50"
                                  : "border-[var(--ic-gray-200)]"
                              }`}
                              value={fieldMappings[field.name] || ""}
                              onChange={(e) => handleMappingChange(field.name, e.target.value)}
                              disabled={busy}
                            >
                              <option value="">-- Select CSV column --</option>
                              {csvData.headers.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                            {field.required && !isMapped && (
                              <p className="mt-1 text-xs text-red-600">
                                This field is required and must be mapped
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--ic-gray-700)] mb-2">
                CSV Preview (first {previewRows} rows)
              </label>
              <div className="rounded-md border border-[var(--ic-gray-200)] overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--ic-gray-100)] sticky top-0">
                      <tr>
                        {csvData.headers.map((header, idx) => (
                          <th key={idx} className="px-3 py-2 text-left font-semibold text-[var(--ic-gray-700)] border-b whitespace-nowrap">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.rows.slice(0, previewRows).map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b">
                          {row.map((cell, cellIdx) => (
                            <td key={cellIdx} className="px-3 py-2 text-[var(--ic-gray-700)] whitespace-nowrap">
                              {cell || <span className="text-[var(--ic-gray-400)]">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              {csvData.rows.length > previewRows && (
                <p className="mt-1 text-xs text-[var(--ic-gray-600)]">
                  Showing {previewRows} of {csvData.rows.length} rows
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="btn"
                onClick={() => {
                  setCsvFile(null);
                  setCsvContent(null);
                  setCsvData(null);
                  setFieldMappings({});
                  setError(null);
                  setSuccess(null);
                }}
                disabled={busy}
              >
                Clear
              </button>
              <button
                className="btn btn-primary"
                onClick={handleImport}
                disabled={busy || !csvData}
              >
                {busy ? "Importing…" : "Import Data"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

