import mongoose, { Schema, Document } from "mongoose";

export interface ISession extends Document {
  sessionToken: string;
  userId: string;
  expires: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionToken: { type: String, unique: true },
    userId: { type: String, required: true },
    expires: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);
