import { Schema, model, models, Types } from "mongoose";

export type ChatThreadDocument = {
  _id: string;
  participants: (Types.ObjectId | string)[];
  title?: string;
  isGroup: boolean;
  lastMessageAt: Date;
  createdBy: Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
};

const ChatThreadSchema = new Schema<ChatThreadDocument>(
  {
    participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
    title: { type: String },
    isGroup: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

ChatThreadSchema.index({ participants: 1 });

export const ChatThread =
  models.ChatThread || model<ChatThreadDocument>("ChatThread", ChatThreadSchema);


