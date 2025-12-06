import { Schema, model, models, Types } from "mongoose";

export type FinancialPeriodDocument = {
  _id: string;
  periodName: string;
  startDate: Date;
  endDate: Date;
  status: "Open" | "Closed";
  totalCollections: number;
  totalPoliciesCreated: number;
  closedBy?: Types.ObjectId | string;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const FinancialPeriodSchema = new Schema<FinancialPeriodDocument>(
  {
    periodName: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ["Open", "Closed"], default: "Open", index: true },
    totalCollections: { type: Number, default: 0 },
    totalPoliciesCreated: { type: Number, default: 0 },
    closedBy: { type: Schema.Types.ObjectId, ref: "User" },
    closedAt: { type: Date },
  },
  { timestamps: true },
);

export const FinancialPeriod =
  models.FinancialPeriod ||
  model<FinancialPeriodDocument>("FinancialPeriod", FinancialPeriodSchema);

