import { Schema, model, models, Types } from "mongoose";

export type DeleteRequestStatus = "pending" | "approved" | "denied";

export type DeleteRequestDocument = {
  _id: string;
  entityType: string;
  entityId: string;
  entityLabel?: string;
  requestedBy: Types.ObjectId | string;
  decidedBy?: Types.ObjectId | string | null;
  status: DeleteRequestStatus;
  reason?: string | null;
  decidedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const DeleteRequestSchema = new Schema<DeleteRequestDocument>(
  {
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    entityLabel: { type: String },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    decidedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, enum: ["pending", "approved", "denied"], default: "pending", index: true },
    reason: { type: String },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const DeleteRequest =
  models.DeleteRequest || model<DeleteRequestDocument>("DeleteRequest", DeleteRequestSchema);



