import { Schema, model, models, Types } from "mongoose";

export type AuditLogDocument = {
  _id: string;
  userId: Types.ObjectId | string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
};

const AuditLogSchema = new Schema<AuditLogDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String },
    details: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog =
  models.AuditLog || model<AuditLogDocument>("AuditLog", AuditLogSchema);

