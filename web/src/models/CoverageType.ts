import { Schema, model, models } from "mongoose";

export type CoverageTypeDocument = {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
};

const CoverageTypeSchema = new Schema<CoverageTypeDocument>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true },
);

export const CoverageType =
  models.CoverageType || model<CoverageTypeDocument>("CoverageType", CoverageTypeSchema);


