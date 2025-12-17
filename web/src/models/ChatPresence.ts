import { Schema, model, models, Types } from "mongoose";

export type ChatPresenceDocument = {
  _id: string;
  userId: Types.ObjectId | string;
  lastSeen: Date;
};

const ChatPresenceSchema = new Schema<ChatPresenceDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    lastSeen: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export const ChatPresence =
  models.ChatPresence || model<ChatPresenceDocument>("ChatPresence", ChatPresenceSchema);


