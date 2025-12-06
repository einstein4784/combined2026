import { Schema, model, models, Types } from "mongoose";

export type ReceiptDocument = {
  _id: string;
  receiptNumber: string;
  paymentId: Types.ObjectId | string;
  policyId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  policyNumberSnapshot?: string;
  customerNameSnapshot?: string;
  customerEmailSnapshot?: string;
  customerContactSnapshot?: string;
  outstandingBalanceAfter?: number;
  generatedByName?: string;
  paymentDate: Date;
  generatedAt: Date;
  generatedBy?: Types.ObjectId | string;
};

const ReceiptSchema = new Schema<ReceiptDocument>(
  {
    receiptNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String },
    notes: { type: String },
    policyNumberSnapshot: { type: String },
    customerNameSnapshot: { type: String },
    customerEmailSnapshot: { type: String },
    customerContactSnapshot: { type: String },
    outstandingBalanceAfter: { type: Number },
    generatedByName: { type: String },
    paymentDate: { type: Date, required: true },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: false },
);

export const Receipt = models.Receipt || model<ReceiptDocument>("Receipt", ReceiptSchema);

