import { Schema, model, models, Types } from "mongoose";

export type PolicyDocument = {
  _id: string;
  policyNumber: string;
  customerId: Types.ObjectId | string;
  coverageType: "Third Party" | "Fully Comprehensive";
  coverageStartDate?: Date;
  coverageEndDate?: Date;
  totalPremiumDue: number;
  amountPaid: number;
  outstandingBalance: number;
  status: "Active" | "Cancelled" | "Expired";
  financialPeriodId?: Types.ObjectId | string;
  createdBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
};

const PolicySchema = new Schema<PolicyDocument>(
  {
    policyNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    coverageType: {
      type: String,
      enum: ["Third Party", "Fully Comprehensive"],
      default: "Third Party",
    },
    coverageStartDate: Date,
    coverageEndDate: Date,
    totalPremiumDue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Cancelled", "Expired"], default: "Active" },
    financialPeriodId: { type: Schema.Types.ObjectId, ref: "FinancialPeriod" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export const Policy = models.Policy || model<PolicyDocument>("Policy", PolicySchema);

