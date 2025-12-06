import { AuditLog } from "@/models/AuditLog";
import { connectDb } from "./db";

type AuditParams = {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
};

export async function logAuditAction(params: AuditParams) {
  await connectDb();
  await AuditLog.create({
    ...params,
  });
}


