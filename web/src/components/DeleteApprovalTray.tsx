"use client";

import { useEffect, useMemo, useState } from "react";
import { showSuccessToast } from "./GlobalSuccessToast";
import { showGlobalError } from "./GlobalErrorPopup";

type DeleteRequestItem = {
  _id: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  createdAt: string;
  reason?: string | null;
};

type Props = {
  canApprove: boolean;
};

export function DeleteApprovalTray({ canApprove }: Props) {
  const [items, setItems] = useState<DeleteRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (!items.length) return "No pending deletions";
    return `${items.length} pending ${items.length === 1 ? "request" : "requests"}`;
  }, [items.length]);

  const fetchPending = async () => {
    if (!canApprove) return;
    setLoading(true);
    try {
      const res = await fetch("/api/delete-requests");
      if (!res.ok) throw new Error("Failed to load delete requests");
      const data = await res.json();
      setItems(
        (data.requests || []).map((r: any) => ({
          _id: r._id,
          entityType: r.entityType,
          entityId: r.entityId,
          entityLabel: r.entityLabel,
          createdAt: r.createdAt,
          reason: r.reason,
        })),
      );
    } catch (e: any) {
      showGlobalError({
        title: "Unable to load approvals",
        message: e?.message || "Failed to fetch pending delete requests",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canApprove) return;
    fetchPending();
    const interval = setInterval(fetchPending, 15000);
    return () => clearInterval(interval);
  }, [canApprove]);

  if (!canApprove) return null;

  const handleAction = async (id: string, action: "approve" | "deny") => {
    setWorking(id);
    try {
      const res = await fetch(`/api/delete-requests/${id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action}`);
      }
      setItems((prev) => prev.filter((p) => p._id !== id));
      showSuccessToast({
        title: `Delete ${action === "approve" ? "approved" : "denied"}`,
        message: action === "approve" ? "Record removed" : "Request denied",
      });
    } catch (e: any) {
      showGlobalError({
        title: "Action failed",
        message: e?.message || `Could not ${action} request`,
      });
    } finally {
      setWorking(null);
    }
  };

  const hasItems = items.length > 0;
  if (!canApprove || (!hasItems && !loading)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9600] w-full max-w-sm space-y-3 print:hidden">
      <div className="rounded-2xl border border-[var(--ic-gray-200)] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--ic-gray-200)] px-4 py-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[var(--ic-gray-600)]">Delete approvals</p>
            <p className="text-sm font-semibold text-[var(--ic-navy)]">{subtitle}</p>
          </div>
          <button
            className="text-[11px] text-[var(--ic-gray-600)] hover:text-[var(--ic-navy)]"
            onClick={fetchPending}
            disabled={loading}
          >
            {loading ? "…" : "Refresh"}
          </button>
        </div>
        <div className="max-h-80 overflow-auto px-4 py-3 space-y-3">
          {!hasItems && <p className="text-sm text-[var(--ic-gray-600)]">No pending deletion requests.</p>}
          {items.map((item) => (
            <div
              key={item._id}
              className="rounded-xl border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-3"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-500)]">
                    {item.entityType}
                  </p>
                  <p className="text-sm font-semibold text-[var(--ic-navy)]">
                    {item.entityLabel || item.entityId}
                  </p>
                  <p className="text-[11px] text-[var(--ic-gray-600)] break-all">
                    ID: {item.entityId}
                  </p>
                </div>
                <div className="text-right text-[11px] text-[var(--ic-gray-500)]">
                  <p>{new Date(item.createdAt).toLocaleString()}</p>
                  {item.reason && <p className="text-[var(--ic-gray-600)]">Reason: {item.reason}</p>}
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="btn btn-ghost text-[var(--ic-gray-700)]"
                  onClick={() => handleAction(item._id, "deny")}
                  disabled={working === item._id}
                >
                  Deny
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => handleAction(item._id, "approve")}
                  disabled={working === item._id}
                >
                  {working === item._id ? "Working…" : "Approve"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

