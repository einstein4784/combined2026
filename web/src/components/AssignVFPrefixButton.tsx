"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { showSuccessToast } from "./GlobalSuccessToast";
import { showGlobalError } from "./GlobalErrorPopup";

export function AssignVFPrefixButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!confirm(
      `⚠️ WARNING: You are about to assign VF prefix to all policies that contain "VF" in their policy ID or policy number.\n\n` +
      `This will update policy formatting and associated receipt locations.\n\n` +
      `This action cannot be undone. Are you sure you want to continue?`
    )) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/add-vf-prefix", {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        const policiesMsg = `Updated ${data.policies.updated} policy/policies, skipped ${data.policies.skipped} that already had VF prefix.`;
        const receiptsMsg = data.receipts.updated > 0 
          ? ` Updated ${data.receipts.updated} receipt(s) location to "Vieux Fort".`
          : "";
        
        showSuccessToast({
          title: "VF Prefix Assigned",
          message: policiesMsg + receiptsMsg,
        });
        router.refresh();
      } else {
        const errorMsg = data.error || "Failed to assign VF prefix";
        setError(errorMsg);
        showGlobalError({
          title: "Error",
          message: errorMsg,
        });
      }
    } catch (err) {
      const errorMsg = "An error occurred while assigning VF prefix";
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
    <div className="card space-y-3 border-blue-200 bg-blue-50">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-heading text-blue-700">Policy Management</p>
          <h3 className="text-lg font-semibold text-blue-800">Assign VF Prefix</h3>
          <p className="text-sm text-blue-700">
            Assign the VF prefix to all policies that contain "VF" in their policy ID or policy number. 
            This will ensure proper formatting and update associated receipt locations.
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
          className="btn border-blue-300 bg-blue-600 text-white hover:bg-blue-700"
          onClick={handleAssign}
          disabled={busy}
        >
          {busy ? "Processing..." : "Assign VF Prefix"}
        </button>
      </div>
    </div>
  );
}



