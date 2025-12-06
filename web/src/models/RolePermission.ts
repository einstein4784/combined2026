import { Schema, model, models } from "mongoose";
import type { SystemFunctionId, UserRole } from "@/lib/permissions";

export type RolePermissionDocument = {
  _id: string;
  role: UserRole;
  permissions: SystemFunctionId[];
  updatedAt: Date;
};

const RolePermissionSchema = new Schema<RolePermissionDocument>(
  {
    role: {
      type: String,
      enum: ["Admin", "Supervisor", "Cashier", "Underwriter"],
      unique: true,
      required: true,
    },
    permissions: [{ type: String, required: true }],
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

export const RolePermission =
  models.RolePermission || model<RolePermissionDocument>("RolePermission", RolePermissionSchema);
