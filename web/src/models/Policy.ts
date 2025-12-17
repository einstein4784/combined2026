import { Schema, model, models, Types, Model } from "mongoose";

export type PolicyDocument = {
  _id: string;
  policyNumber: string;
  policyIdNumber: string;
  customerId: Types.ObjectId | string; // primary (legacy)
  customerIds: (Types.ObjectId | string)[]; // up to 3 linked customers
  // Coverage types are configurable; store as free-form string
  coverageType: string;
  registrationNumber?: string | null;
  notes?: string | null;
  coverageStartDate?: Date;
  coverageEndDate?: Date;
  totalPremiumDue: number;
  amountPaid: number;
  outstandingBalance: number;
  status: "Active" | "Cancelled" | "Suspended";
  financialPeriodId?: Types.ObjectId | string;
  createdBy?: Types.ObjectId | string;
  renewalNoticeSentAt?: Date | null;
  renewalNoticeSentBy?: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
};

const PolicySchema = new Schema<PolicyDocument>(
  {
    policyNumber: { type: String, required: true, unique: true, index: true },
    policyIdNumber: { type: String, required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Customer", index: true }],
      default: undefined,
      validate: {
        validator: (v: any[]) => Array.isArray(v) && v.length >= 1 && v.length <= 3,
        message: "customerIds must have between 1 and 3 entries",
      },
    },
    coverageType: {
      type: String,
      trim: true,
      // Allow any admin-defined coverage label; keep a sensible default
      default: "Third Party",
    },
    registrationNumber: { type: String, trim: true, default: null },
    notes: { type: String, maxlength: 2000, default: null },
    coverageStartDate: Date,
    coverageEndDate: Date,
    totalPremiumDue: { type: Number, required: true },
    amountPaid: { type: Number, default: 0 },
    outstandingBalance: { type: Number, required: true },
    status: { type: String, enum: ["Active", "Cancelled", "Suspended"], default: "Active" },
    financialPeriodId: { type: Schema.Types.ObjectId, ref: "FinancialPeriod" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    renewalNoticeSentAt: { type: Date, default: null },
    renewalNoticeSentBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

// Older model instances may have shipped with enum validation on coverageType.
// Strip any cached enum validators so admin-defined coverage labels are allowed.
function stripCoverageTypeEnum(m?: Model<PolicyDocument>) {
  const path = m?.schema?.path("coverageType") as any;
  if (!path) return;
  if (Array.isArray(path.enumValues) && path.enumValues.length) {
    path.enumValues = [];
  }
  if (path.options?.enum) {
    delete path.options.enum;
  }
  if (Array.isArray(path.validators)) {
    path.validators = path.validators.filter((v: any) => v?.type !== "enum");
  }
}

const existingPolicyModel = models.Policy as Model<PolicyDocument> | undefined;
stripCoverageTypeEnum(existingPolicyModel);

export const Policy =
  existingPolicyModel || model<PolicyDocument>("Policy", PolicySchema);

stripCoverageTypeEnum(Policy);

