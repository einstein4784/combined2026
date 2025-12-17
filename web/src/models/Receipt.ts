import { Schema, model, models, Types } from "mongoose";

export type ReceiptDocument = {
  _id: string;
  receiptNumber: string;
  paymentId: Types.ObjectId | string;
  policyId: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  amount: number;
  location?: string;
  registrationNumber?: string;
  paymentMethod?: string;
  notes?: string;
  policyNumberSnapshot?: string;
  policyIdNumberSnapshot?: string;
  customerNameSnapshot?: string;
  customerEmailSnapshot?: string;
  customerContactSnapshot?: string;
  outstandingBalanceAfter?: number;
  generatedByName?: string;
  paymentDate: Date;
  generatedAt: Date;
  generatedBy?: Types.ObjectId | string;
  status?: "active" | "void";
};

const ReceiptSchema = new Schema<ReceiptDocument>(
  {
    receiptNumber: { type: String, required: true, index: true }, // Removed unique constraint to allow duplicates
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: "Policy", required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    amount: { type: Number, required: true },
    location: { type: String },
    registrationNumber: { type: String },
    paymentMethod: { type: String },
    notes: { type: String },
    policyNumberSnapshot: { type: String },
    policyIdNumberSnapshot: { type: String },
    customerNameSnapshot: { type: String },
    customerEmailSnapshot: { type: String },
    customerContactSnapshot: { type: String },
    outstandingBalanceAfter: { type: Number },
    generatedByName: { type: String },
    paymentDate: { type: Date, required: true, index: true },
    generatedAt: { type: Date, default: Date.now, index: true },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: ["active", "void"], default: "active", index: true },
  },
  { timestamps: false },
);

// Compound indexes for common query patterns
ReceiptSchema.index({ generatedAt: -1, status: 1 });
ReceiptSchema.index({ paymentDate: -1, status: 1 });
ReceiptSchema.index({ customerId: 1, generatedAt: -1 });

export const Receipt = models.Receipt || model<ReceiptDocument>("Receipt", ReceiptSchema);

