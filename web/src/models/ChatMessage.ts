import { Schema, model, models, Types } from "mongoose";

export type ChatMessageDocument = {
  _id: string;
  threadId: Types.ObjectId | string;
  senderId: Types.ObjectId | string;
  type: "text" | "file";
  body?: string;
  file?: {
    url?: string;
    name?: string;
    size?: number;
    mime?: string;
    data?: string;
  };
  createdAt: Date;
  updatedAt: Date;
};

const ChatMessageSchema = new Schema<ChatMessageDocument>(
  {
    threadId: { type: Schema.Types.ObjectId, ref: "ChatThread", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["text", "file"], default: "text" },
    body: { type: String },
    file: {
      url: String,
      name: String,
      size: Number,
      mime: String,
    },
  },
  { timestamps: true },
);

ChatMessageSchema.index({ threadId: 1, createdAt: -1 });

export const ChatMessage =
  models.ChatMessage || model<ChatMessageDocument>("ChatMessage", ChatMessageSchema);


