import { z } from "zod";
import { DEFAULT_PERMISSIONS } from "./permissions";

export const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6),
});

export const userSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["Admin", "Supervisor", "Cashier", "Underwriter"]),
  fullName: z.string().min(3),
  users_location: z.string().min(1).default("Castries"),
});

export const customerSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1),
  address: z.string().min(1),
  contactNumber: z.string().min(3),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
  sex: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  idNumber: z.string().min(3),
});

export const policySchema = z
  .object({
    customerIds: z.array(z.string()).min(1).max(3).optional(),
    customerId: z.string().optional(), // legacy single-select support
  policyNumber: z.string().optional(),
  policyIdNumber: z.string().min(1),
  coverageType: z.string().min(1),
  registrationNumber: z.string().max(100).optional().nullable(),
  coverageStartDate: z.string(),
  coverageEndDate: z.string(),
  totalPremiumDue: z.number().nonnegative(),
  status: z.enum(["Active", "Cancelled", "Suspended"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  })
  .transform((data) => {
    const ids = (data.customerIds && data.customerIds.length ? data.customerIds : data.customerId ? [data.customerId] : []).slice(0, 3);
    return { ...data, customerIds: ids };
  })
  .refine((data) => Array.isArray(data.customerIds) && data.customerIds.length >= 1, {
    message: "At least one customer is required",
    path: ["customerIds"],
});

export const paymentSchema = z.object({
  policyId: z.string(),
  amount: z.number().nonnegative(),
  paymentMethod: z.string().default("Cash"),
  notes: z.string().optional(),
  arrearsOverrideUsed: z.boolean().optional(),
  refundAmount: z.number().nonnegative().default(0),
}).superRefine((data, ctx) => {
  if ((data.amount ?? 0) <= 0 && (data.refundAmount ?? 0) <= 0) {
    ctx.addIssue({
      code: "custom",
      message: "Enter a payment or refund amount",
      path: ["amount"],
    });
  }
});

export const rolePermissionSchema = z.object({
  role: z.enum(["Admin", "Supervisor", "Cashier", "Underwriter"]),
  permissions: z
    .array(z.string())
    .default(DEFAULT_PERMISSIONS.Admin)
    .transform((perms) => [...new Set(perms)]),
});


