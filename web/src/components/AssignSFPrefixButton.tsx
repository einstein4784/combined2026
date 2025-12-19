"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";
import { showGlobalError } from "./GlobalErrorPopup";

export function AssignSFPrefixButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!confirm(
      `⚠️ WARNING: You are about to assign SF prefix to all policies where the customer's ID number begins with "SF".\n\n` +
      `This will update policy formatting and associated receipt locations to "Soufriere".\n\n` +
      `This action cannot be undone. Are you sure you want to continue?`
    )) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/add-sf-prefix", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const policiesMsg = `Updated ${data.policies.updated} policy/policies, skipped ${data.policies.skipped} (either customer ID doesn't start with SF or already has SF prefix).`;
        const receiptsMsg = data.receipts.updated > 0 
          ? ` Updated ${data.receipts.updated} receipt(s) location to "Soufriere".`
          : "";
        
        showSuccessToast({
          title: "SF Prefix Assigned",
          message: policiesMsg + receiptsMsg,
        });
        router.refresh();
      } else {
        const errorMsg = data.error || "Failed to assign SF prefix";
        setError(errorMsg);
        showGlobalError({
          title: "Error",
          message: errorMsg,
        });
      }
    } catch (err) {
      const errorMsg = "An error occurred while assigning SF prefix";
      setError(errorMsg);
      showGlobalError({
        title: "Error",
        message: errorMsg,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3 border-green-200 bg-green-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-heading text-green-700">Policy Management</p>
          <h3 className="text-lg font-semibold text-green-800">Assign SF Prefix</h3>
          <p className="text-sm text-green-700">
            Assign the SF prefix to all policies where the customer's ID number begins with "SF". 
            This will ensure proper formatting and update associated receipt locations to "Soufriere".
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-100 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          className="btn border-green-300 bg-green-600 text-white hover:bg-green-700"
          onClick={handleAssign}
          disabled={busy}
        >
          {busy ? "Processing..." : "Assign SF Prefix"}
        </button>
      </div>
    </div>
  );
}


