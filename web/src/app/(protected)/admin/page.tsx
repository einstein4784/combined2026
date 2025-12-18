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
import { AssignVFPrefixButton } from "@/components/AssignVFPrefixButton";
import { AssignSFPrefixButton } from "@/components/AssignSFPrefixButton";
import { MultiPaymentImporter } from "@/components/MultiPaymentImporter";
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
      <DuplicatePaymentCleaner />
      <ResetCoverageTypesButton />
      <CoverageTypeManager />
      <StatementRecipientManager />
      <AssignVFPrefixButton />
      <AssignSFPrefixButton />
      <DeleteDuplicateCustomersButton />
      <DeleteAllDataButton />
    </div>
  );
}

