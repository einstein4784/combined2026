"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { formatDateOnly } from "@/lib/utils";
import { formatDateTimeInUTC4 } from "@/lib/timezone";
import { SendReceiptEmailButton } from "./SendReceiptEmailButton";

type ReceiptViewModel = {
  id: string;
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  location?: string;
  paymentMethod?: string;
  notes?: string;
  policyNumber?: string;
  policyIdNumber?: string;
  coverageType?: string;
  coverageStartDate?: string;
  coverageEndDate?: string;
  outstandingBalanceAfter?: number;
  customerName?: string;
  customerEmail?: string;
  customerContact?: string;
  generatedByName?: string;
  registrationNumber?: string;
};

type Props = {
  receipt: ReceiptViewModel;
  backHref?: string;
};

export function ReceiptViewer({ receipt, backHref }: Props) {
  const router = useRouter();
  const [layout, setLayout] = useState<"standard" | "epson" | "dotMatrix">("standard");
  const [epsonCopies, setEpsonCopies] = useState<1 | 2 | 3>(1);
  const [dotCopies, setDotCopies] = useState<1 | 2 | 3>(1);

  const formattedDate = useMemo(() => {
    return formatDateTimeInUTC4(receipt.paymentDate);
  }, [receipt.paymentDate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = () => {
    // Rely on the browser's print-to-PDF capability for a quick export.
    window.print();
  };

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

  const coverageStart = formatDateOnly(receipt.coverageStartDate);
  const coverageEnd = formatDateOnly(receipt.coverageEndDate);
  const outstanding =
    typeof receipt.outstandingBalanceAfter === "number"
      ? `$${receipt.outstandingBalanceAfter.toFixed(2)}`
      : "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <button className="btn btn-primary" onClick={handlePrint}>
          Print
        </button>
        <button className="btn" onClick={handleExportPdf}>
          Export PDF
        </button>
        <SendReceiptEmailButton receipt={receipt} />
        <button className="btn" onClick={handleBack}>
          Go back
        </button>
        <Link href="/receipts" className="btn">
          Receipts list
        </Link>
        <button
          className={`btn ${layout === "epson" ? "btn-primary" : ""}`}
          onClick={() => setLayout("epson")}
        >
          Epson
        </button>
        {layout === "epson" && (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ic-gray-700)]">
              Receipts per page
              <select
                className="rounded-md border border-[var(--ic-gray-200)] px-2 py-1 text-sm"
                value={epsonCopies}
                onChange={(e) => setEpsonCopies(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
            <button className="btn" onClick={() => setLayout("standard")}>
              Standard
            </button>
          </>
        )}
        <button
          className={`btn ${layout === "dotMatrix" ? "btn-primary" : ""}`}
          onClick={() => setLayout("dotMatrix")}
        >
          Dot Matrix
        </button>
        {layout === "dotMatrix" && (
          <>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ic-gray-700)]">
              Receipts per page
              <select
                className="rounded-md border border-[var(--ic-gray-200)] px-2 py-1 text-sm"
                value={dotCopies}
                onChange={(e) => setDotCopies(Number(e.target.value) as 1 | 2 | 3)}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </label>
          <button className="btn" onClick={() => setLayout("standard")}>
            Standard
          </button>
          </>
        )}
      </div>

      {/* Standard layout (unchanged) */}
      <div className={layout === "standard" ? "" : "hidden"}>
        <div className="receipt-paper">
          <div className="flex flex-col items-center gap-2 text-center">
            <img
              src="/Untitled-5.png"
              alt="Combined Insurance Services"
              className="h-64 w-auto object-contain -mt-2"
            />
            <h2 className="text-2xl font-bold text-[var(--ic-navy)] tracking-tight">Payment Receipt</h2>
            <div className="grid w-full gap-3 rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-xs font-semibold text-[var(--ic-gray-700)] leading-snug md:grid-cols-3">
              <div className="text-left space-y-0.5">
                <p>P.O. GM 636, Gablewoods Mall</p>
                <p>Castries, St. Lucia</p>
                <p>Tel: 758 456-0700</p>
              </div>
              <div className="text-center space-y-0.5">
                <p>Garvey Street</p>
                <p>Vieux Fort</p>
                <p>Tel: 454-5415</p>
              </div>
              <div className="text-right space-y-0.5">
                <p>Bridge Street</p>
                <p>Soufriere</p>
                <p>Tel: 457-1500</p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-2 text-sm text-[var(--ic-gray-700)]">
            <p className="font-semibold text-[var(--ic-navy)]">Receipt: {receipt.receiptNumber}</p>
            <p>Date: {formattedDate}</p>
            <p>Generated by: {receipt.generatedByName || "—"}</p>
            <p>Location: {receipt.location || "—"}</p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="info-card">
              <h3>Customer</h3>
              <p className="primary">{receipt.customerName || "—"}</p>
              <p>{receipt.customerEmail || "—"}</p>
              <p>{receipt.customerContact || "—"}</p>
            </div>
            <div className="info-card">
              <h3>Policy</h3>
              <p className="primary">Policy: {receipt.policyNumber || "—"}</p>
              <p>Policy ID: {receipt.policyIdNumber || "—"}</p>
              <p>Registration: {receipt.registrationNumber || "TBA"}</p>
              <p>Coverage: {receipt.coverageType || "—"}</p>
              <p>
                Coverage dates: {coverageStart} to {coverageEnd}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-lg border border-[var(--ic-gray-200)] p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="label">Payment method</p>
                <p className="value">{receipt.paymentMethod || "—"}</p>
              </div>
              <div>
                <p className="label">Amount</p>
                <p className="value text-2xl">${receipt.amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="label">Outstanding after payment</p>
                <p className="value">{outstanding}</p>
              </div>
            </div>
            {receipt.notes && (
              <div className="mt-4 rounded-md bg-[var(--ic-gray-50)] p-3 text-sm text-[var(--ic-gray-800)]">
                <p className="font-semibold text-[var(--ic-navy)]">Notes</p>
                <p>{receipt.notes}</p>
              </div>
            )}
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="signature-box">
              <p className="label">Received by</p>
              <div className="sig-line" />
              <p className="muted">{receipt.generatedByName || "Name"}</p>
            </div>
            <div className="signature-box">
              <p className="label">Customer</p>
              <div className="sig-line" />
              <p className="muted">{receipt.customerName || "Name"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Epson layout (letter optimized, selectable duplicates) */}
      <div className={layout === "epson" ? "" : "hidden"}>
        <div className="space-y-4">
          {Array.from({ length: epsonCopies }).map((_, idx) => (
        <div
              key={idx}
              className="rounded-md border border-[var(--ic-gray-200)] bg-white p-3 text-xs text-[var(--ic-gray-800)] shadow-sm print:break-inside-avoid"
              style={{ width: "8in", minHeight: "3.6in" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--ic-navy)]">Payment Receipt</p>
              <p className="text-[11px]">Receipt: {receipt.receiptNumber}</p>
              <p className="text-[11px]">Date: {formattedDate}</p>
              <p className="text-[11px]">Location: {receipt.location || "—"}</p>
            </div>
            <img
              src="/Untitled-5.png"
              alt="Combined Insurance Services"
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-b border-[var(--ic-gray-200)] py-2">
            <div className="space-y-0.5">
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Customer</p>
              <p>{receipt.customerName || "—"}</p>
              <p>{receipt.customerContact || "—"}</p>
              <p>{receipt.customerEmail || "—"}</p>
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Policy</p>
              <p>Policy: {receipt.policyNumber || "—"}</p>
              <p>Reg: {receipt.registrationNumber || "TBA"}</p>
              <p>Coverage: {receipt.coverageType || "—"}</p>
              <p>
                {coverageStart} → {coverageEnd}
              </p>
            </div>
            <div className="space-y-0.5 text-right">
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Issued By</p>
              <p>{receipt.generatedByName || "—"}</p>
              <p>Method: {receipt.paymentMethod || "—"}</p>
              <p>Outstanding: {outstanding}</p>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Amount</p>
              <p className="text-xl font-bold text-[var(--ic-navy)]">${receipt.amount.toFixed(2)}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Payment Date</p>
              <p>{formattedDate}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Receipt #</p>
              <p>{receipt.receiptNumber}</p>
            </div>
          </div>

          {receipt.notes && (
            <div className="mt-2 rounded-sm bg-[var(--ic-gray-50)] p-2">
              <p className="font-semibold text-[var(--ic-navy)] text-[11px]">Notes</p>
              <p>{receipt.notes}</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold text-[var(--ic-navy)]">Received by</p>
              <div className="mt-2 h-[1px] w-full bg-[var(--ic-gray-300)]" />
              <p className="text-[11px] text-[var(--ic-gray-600)]">
                {receipt.generatedByName || "Name"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--ic-navy)]">Customer</p>
              <div className="mt-2 h-[1px] w-full bg-[var(--ic-gray-300)]" />
              <p className="text-[11px] text-[var(--ic-gray-600)]">
                {receipt.customerName || "Name"}
              </p>
            </div>
          </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dot Matrix layout (letter optimized, selectable duplicates) */}
      <div className={layout === "dotMatrix" ? "" : "hidden"}>
        <div className="space-y-4">
          {Array.from({ length: dotCopies }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-sm border border-dashed border-[var(--ic-gray-300)] bg-white p-3 text-[13px] text-[#1f2933] shadow-none print:break-inside-avoid"
              style={{ width: "8.5in", minHeight: "3.8in", fontFamily: "Courier New, ui-monospace, monospace" }}
            >
              <div className="flex items-start justify-between border-b border-dashed border-[var(--ic-gray-300)] pb-2">
                <div>
                  <p className="text-[15px] font-bold tracking-[0.08em] uppercase">Payment Receipt</p>
                  <p>Receipt: {receipt.receiptNumber}</p>
                  <p>Date: {formattedDate}</p>
                  <p>Location: {receipt.location || "—"}</p>
                </div>
                <div className="text-right text-[12px] leading-tight">
                  <p>Combined Insurance Services</p>
                  <p>P.O. GM 636, Gablewoods Mall, Castries</p>
                  <p>Tel: 758 456-0700</p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 border-b border-dashed border-[var(--ic-gray-300)] pb-2">
                <div className="space-y-1">
                  <p className="font-bold">Customer</p>
                  <p>Name: {receipt.customerName || "—"}</p>
                  <p>Contact: {receipt.customerContact || "—"}</p>
                  <p>Email: {receipt.customerEmail || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Policy</p>
                  <p>Policy: {receipt.policyNumber || "—"}</p>
                  <p>Reg: {receipt.registrationNumber || "TBA"}</p>
                  <p>Coverage: {receipt.coverageType || "—"}</p>
                  <p>
                    {coverageStart} → {coverageEnd}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-3 border-b border-dashed border-[var(--ic-gray-300)] pb-2">
                <div>
                  <p className="font-bold">Amount</p>
                  <p>${receipt.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-bold">Payment Date</p>
                  <p>{formattedDate}</p>
                </div>
                <div>
                  <p className="font-bold">Method</p>
                  <p>{receipt.paymentMethod || "—"}</p>
                </div>
              </div>

              {receipt.notes && (
                <div className="mt-2 border-b border-dashed border-[var(--ic-gray-300)] pb-2">
                  <p className="font-bold">Notes</p>
                  <p>{receipt.notes}</p>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="font-bold">Received by</p>
                  <div className="mt-2 h-[1px] w-full border-b border-dashed border-[var(--ic-gray-400)]" />
                  <p>{receipt.generatedByName || "Name"}</p>
                </div>
                <div>
                  <p className="font-bold">Customer</p>
                  <div className="mt-2 h-[1px] w-full border-b border-dashed border-[var(--ic-gray-400)]" />
                  <p>{receipt.customerName || "Name"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

