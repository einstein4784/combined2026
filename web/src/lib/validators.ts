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
});

export const customerSchema = z.object({
  firstName: z.string().min(1),
  middleName: z.string().optional().nullable(),
  lastName: z.string().min(1),
  address: z.string().min(1),
  contactNumber: z.string().min(3),
  email: z.string().email(),
  sex: z.enum(["Male", "Female", "Other"]).optional().nullable(),
  idNumber: z.string().min(3),
});

export const policySchema = z.object({
  customerId: z.string(),
  policyNumber: z.string().optional(),
  coverageType: z.enum(["Third Party", "Fully Comprehensive"]),
  coverageStartDate: z.string(),
  coverageEndDate: z.string(),
  totalPremiumDue: z.number().nonnegative(),
  status: z.enum(["Active", "Cancelled", "Expired"]).optional(),
});

export const paymentSchema = z.object({
  policyId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string().default("Cash"),
  notes: z.string().optional(),
  arrearsOverrideUsed: z.boolean().optional(),
});

export const rolePermissionSchema = z.object({
  role: z.enum(["Admin", "Supervisor", "Cashier", "Underwriter"]),
  permissions: z
    .array(z.string())
    .default(DEFAULT_PERMISSIONS.Admin)
    .transform((perms) => [...new Set(perms)]),
});


