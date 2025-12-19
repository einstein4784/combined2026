import { Schema, model, models } from "mongoose";

export type CustomerDocument = {
  _id: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  address: string;
  contactNumber: string;
  contactNumber2?: string | null;
  email: string;
  sex?: "Male" | "Female" | "Other" | null;
  idNumber: string;
  driversLicenseNumber?: string | null;
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
    contactNumber2: { type: String },
    email: { type: String, required: true, index: true },
    sex: { type: String, enum: ["Male", "Female", "Other"], default: null },
    idNumber: { type: String, required: true, unique: true, index: true },
    driversLicenseNumber: { type: String, default: null },
    hasArrears: { type: Boolean, default: false },
    arrearsOverride: { type: Boolean, default: false },
    arrearsOverrideBy: { type: String },
    arrearsOverrideAt: { type: Date },
  },
  { timestamps: true },
);

// Compound indexes for common query patterns
CustomerSchema.index({ createdAt: -1 });
CustomerSchema.index({ firstName: 1, lastName: 1 });
CustomerSchema.index({ email: 1, idNumber: 1 });

// Text index for search functionality (enables $text search)
// Note: MongoDB allows only one text index per collection
// Use case-insensitive regex with escaped queries for individual field searches
// This index helps with performance on searches
CustomerSchema.index({ firstName: 1 });
CustomerSchema.index({ lastName: 1 });
CustomerSchema.index({ email: 1 }); // Already indexed as unique, but explicit for clarity
CustomerSchema.index({ idNumber: 1 }); // Already indexed as unique, but explicit for clarity
CustomerSchema.index({ contactNumber: 1 });

export const Customer =
  models.Customer || model<CustomerDocument>("Customer", CustomerSchema);


