import { Schema, model, models } from "mongoose";

export type StatementRecipientDocument = {
  _id: string;
  email: string;
  name?: string;
  createdAt: Date;
};

const StatementRecipientSchema = new Schema<StatementRecipientDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

export const StatementRecipient =
  models.StatementRecipient || model<StatementRecipientDocument>("StatementRecipient", StatementRecipientSchema);


