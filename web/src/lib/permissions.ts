export type UserRole = "Admin" | "Supervisor" | "Cashier" | "Underwriter";

export type SystemFunctionId =
  | "create_edit_customer"
  | "create_edit_policy"
  | "receive_payment"
  | "generate_user_report"
  | "generate_cash_statements"
  | "create_edit_delete_user"
  | "override_outstanding_balance"
  | "reset_system"
  | "close_period"
  | "view_dashboard"
  | "manage_permissions"
  | "approve_deletions";

export const SYSTEM_FUNCTIONS: Record<
  SystemFunctionId,
  { id: SystemFunctionId; name: string; description: string; category: string }
> = {
  create_edit_customer: {
    id: "create_edit_customer",
    name: "Create/Edit Customer",
    description: "Ability to create new customers and edit existing customer information",
    category: "Customer Management",
  },
  create_edit_policy: {
    id: "create_edit_policy",
    name: "Create/Edit Policy",
    description: "Ability to create new policies and edit existing policies",
    category: "Policy Management",
  },
  receive_payment: {
    id: "receive_payment",
    name: "Receive Payment",
    description: "Ability to receive and record payments from customers",
    category: "Payment Processing",
  },
  generate_user_report: {
    id: "generate_user_report",
    name: "Generate User Report",
    description: "Ability to generate reports about system users",
    category: "Reporting",
  },
  generate_cash_statements: {
    id: "generate_cash_statements",
    name: "Generate Cash Statements",
    description: "Ability to generate cash statements for any date range",
    category: "Reporting",
  },
  create_edit_delete_user: {
    id: "create_edit_delete_user",
    name: "Create/Edit/Delete User",
    description: "Ability to manage system users (create, edit, and delete)",
    category: "User Management",
  },
  override_outstanding_balance: {
    id: "override_outstanding_balance",
    name: "Override Outstanding Balance",
    description: "Ability to override the outstanding balance rule for payments",
    category: "Payment Processing",
  },
  reset_system: {
    id: "reset_system",
    name: "Reset System",
    description: "Ability to reset the system and delete all records (dangerous)",
    category: "System Administration",
  },
  close_period: {
    id: "close_period",
    name: "Close Period",
    description: "Ability to close a financial period",
    category: "Financial Management",
  },
  view_dashboard: {
    id: "view_dashboard",
    name: "View Dashboard",
    description: "Ability to view the main dashboard",
    category: "General",
  },
  manage_permissions: {
    id: "manage_permissions",
    name: "Manage Permissions",
    description: "Ability to assign functions to roles",
    category: "System Administration",
  },
  approve_deletions: {
    id: "approve_deletions",
    name: "Approve Deletions",
    description: "Approve or deny delete requests raised by staff",
    category: "System Administration",
  },
};

export const DEFAULT_PERMISSIONS: Record<UserRole, SystemFunctionId[]> = {
  Admin: Object.keys(SYSTEM_FUNCTIONS) as SystemFunctionId[],
  Supervisor: [
    "create_edit_customer",
    "create_edit_policy",
    "receive_payment",
    "generate_user_report",
    "generate_cash_statements",
    "create_edit_delete_user",
    "override_outstanding_balance",
    "close_period",
    "view_dashboard",
    "approve_deletions",
  ],
  Cashier: ["receive_payment", "generate_cash_statements", "view_dashboard"],
  Underwriter: ["create_edit_customer", "create_edit_policy", "view_dashboard"],
};

export function roleHasPermission(role: UserRole, permission: SystemFunctionId) {
  return DEFAULT_PERMISSIONS[role]?.includes(permission);
}


