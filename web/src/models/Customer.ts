import { Schema, model, models } from "mongoose";

export type CustomerDocument = {
  _id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  address: string;
  contactNumber: string;
  email: string;
  sex?: "Male" | "Female" | "Other" | null;
  idNumber: string;
  hasArrears: boolean;
  arrearsOverride: boolean;
  arrearsOverrideBy?: string;
  arrearsOverrideAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const CustomerSchema = new Schema<CustomerDocument>(
  {
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    address: { type: String, required: true },
    contactNumber: { type: String, required: true },
    email: { type: String, required: true, index: true },
    sex: { type: String, enum: ["Male", "Female", "Other"], default: null },
    idNumber: { type: String, required: true, unique: true, index: true },
    hasArrears: { type: Boolean, default: false },
    arrearsOverride: { type: Boolean, default: false },
    arrearsOverrideBy: { type: String },
    arrearsOverrideAt: { type: Date },
  },
  { timestamps: true },
);

export const Customer =
  models.Customer || model<CustomerDocument>("Customer", CustomerSchema);


