import { Schema, model, models } from "mongoose";
import type { UserRole } from "@/lib/permissions";

export type UserDocument = {
  _id: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  users_location: "Castries" | "Soufriere" | "Vieux Fort";
  createdAt: Date;
  updatedAt: Date;
};

const UserSchema = new Schema<UserDocument>(
  {
    username: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["Admin", "Supervisor", "Cashier", "Underwriter"],
      required: true,
      index: true,
    },
    fullName: { type: String, required: true },
    users_location: {
      type: String,
      enum: ["Castries", "Soufriere", "Vieux Fort"],
      default: "Castries",
      required: true,
    },
  },
  { timestamps: true },
);

export const User = models.User || model<UserDocument>("User", UserSchema);


