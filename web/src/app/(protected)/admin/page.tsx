import Link from "next/link";
import { redirect } from "next/navigation";
import { RolePermissionManager } from "@/components/RolePermissionManager";
import { guardPermission } from "@/lib/api-auth";
import { BackupManager } from "@/components/BackupManager";
import { CoverageTypeManager } from "@/components/CoverageTypeManager";
import { ResetCoverageTypesButton } from "@/components/ResetCoverageTypesButton";
import { StatementRecipientManager } from "@/components/StatementRecipientManager";
import { DeleteAllDataButton } from "@/components/DeleteAllDataButton";
import { DataMigrationTool } from "@/components/DataMigrationTool";
import { DeleteDuplicateCustomersButton } from "@/components/DeleteDuplicateCustomersButton";
import { MultiPaymentImporter } from "@/components/MultiPaymentImporter";
import { MultiReceiptImporter } from "@/components/MultiReceiptImporter";
import { DuplicatePaymentCleaner } from "@/components/DuplicatePaymentCleaner";

export default async function AdminPage() {
  const auth = await guardPermission("manage_permissions");
  if ("response" in auth) {
    redirect("/dashboard");
  }

  const links = [
    {
      title: "User management",
      href: "/users",
      description: "Create, edit, or deactivate users and manage access.",
    },
    {
      title: "Reports",
      href: "/reports",
      description: "Run cash, outstanding balance, and renewal reports.",
    },
    {
      title: "Policies",
      href: "/policies",
      description: "Review policies and print renewal notices.",
    },
    {
      title: "Payments",
      href: "/payments",
      description: "Record payments and generate receipts.",
    },
    {
      title: "Time & attendance",
      href: "/admin/attendance",
      description: "View login and logout times for all users (admin only).",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Warning Banner */}
      <div className="rounded-lg border-2 border-red-500 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⚠️</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-red-800 mb-2">
              WARNING: Changes Cannot Be Undone
            </h3>
            <p className="text-sm text-red-700 mb-1">
              <strong>Do not execute any commands on this page without confirmation.</strong>
            </p>
            <p className="text-sm text-red-700">
              All actions performed on this page can result in permanent data loss. Please carefully review each action before confirming.
            </p>
          </div>
        </div>
      </div>

      <div className="page-title-box">
        <p className="section-heading">Admin</p>
        <h4>Admin console</h4>
        <p className="page-subtitle">
          Quick access to administration tools and reporting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {links.map((item) => (
          <Link key={item.href} href={item.href} className="card hover:no-underline">
            <h3 className="text-lg font-semibold text-[var(--ic-navy)]">{item.title}</h3>
            <p className="mt-2 text-sm text-[var(--ic-gray-700)]">{item.description}</p>
            <span className="mt-3 inline-flex items-center text-[var(--ic-navy)] font-semibold">
              Open →
            </span>
          </Link>
        ))}
      </div>

      <RolePermissionManager />
      <BackupManager />
      <DataMigrationTool />
      <MultiPaymentImporter />
      <MultiReceiptImporter />
      <DuplicatePaymentCleaner />
      <ResetCoverageTypesButton />
      <CoverageTypeManager />
      <StatementRecipientManager />
      <DeleteDuplicateCustomersButton />
      
      {/* Data Wipe - New dedicated page */}
      <div className="card space-y-3 border-red-200 bg-red-50">
        <div>
          <p className="section-heading text-red-700">Danger Zone</p>
          <h3 className="text-lg font-semibold text-red-800">Clear Transactional Data</h3>
          <p className="text-sm text-red-700">
            Advanced data deletion with granular control. Delete customers, policies, payments, and receipts with preview and safety features.
          </p>
        </div>
        <div className="flex justify-end">
          <Link
            href="/admin/data-wipe"
            className="btn border-red-300 bg-red-600 text-white hover:bg-red-700"
          >
            🗑️ Open Data Wipe Tool →
          </Link>
        </div>
      </div>
    </div>
  );
}

