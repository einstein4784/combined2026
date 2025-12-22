// Data categorization for deletion operations

export type DataTier = "TRANSACTIONAL" | "WORKFLOW" | "FINANCIAL";

export const DATA_TIERS = {
  TRANSACTIONAL: {
    label: "Transactional Data",
    description: "Customer records, policies, payments, and receipts",
    collections: [
      { model: "Customer", label: "Customers", icon: "👤" },
      { model: "Policy", label: "Policies", icon: "📋" },
      { model: "Payment", label: "Payments", icon: "💰" },
      { model: "Receipt", label: "Receipts", icon: "🧾" },
    ],
    defaultEnabled: true,
    color: "blue",
  },
  
  WORKFLOW: {
    label: "Workflow Data",
    description: "Delete requests and approval history",
    collections: [
      { model: "DeleteRequest", label: "Delete Requests", icon: "🗑️" },
    ],
    defaultEnabled: true,
    color: "yellow",
  },
  
  FINANCIAL: {
    label: "Financial Periods",
    description: "Reporting periods and statistics",
    collections: [
      { model: "FinancialPeriod", label: "Financial Periods", icon: "📊" },
    ],
    defaultEnabled: false,
    color: "purple",
  },
} as const;

export const PROTECTED_DATA = {
  CONFIGURATION: {
    label: "Configuration",
    description: "System settings (NOT deleted)",
    collections: [
      { model: "CoverageType", label: "Coverage Types", icon: "⚙️" },
      { model: "StatementRecipient", label: "Statement Recipients", icon: "📧" },
    ],
    color: "gray",
  },
  
  SYSTEM: {
    label: "System Data",
    description: "User accounts and security (PROTECTED)",
    collections: [
      { model: "User", label: "User Accounts", icon: "👥" },
      { model: "RolePermission", label: "Permissions", icon: "🔐" },
      { model: "AuditLog", label: "Audit Logs", icon: "📜" },
    ],
    color: "red",
  },
} as const;



