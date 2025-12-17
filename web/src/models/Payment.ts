import { Schema, model, models, Types } from "mongoose";

export type PaymentDocument = {
  _id: string;
  policyId: Types.ObjectId | string;
  amount: number;
  refundAmount?: number;
  paymentDate: Date;
  paymentMethod: string;
  receiptNumber: string;
  receivedBy?: Types.ObjectId | string;
  arrearsOverrideUsed: boolean;
  financialPeriodId?: Types.ObjectId | string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};

const PaymentSchema = new Schema<PaymentDocument>(
  {
    policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
    amount: { type: Number, required: true },
    refundAmount: { type: Number, default: 0 },
    paymentDate: { type: Date, default: Date.now, index: true },
    paymentMethod: { type: String, default: "Cash" },
    receiptNumber: { type: String, required: true, unique: true, index: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: "User" },
    arrearsOverrideUsed: { type: Boolean, default: false },
    financialPeriodId: { type: Schema.Types.ObjectId, ref: "FinancialPeriod" },
    notes: { type: String },
  },
  { timestamps: true },
);

export const Payment = models.Payment || model<PaymentDocument>("Payment", PaymentSchema);

