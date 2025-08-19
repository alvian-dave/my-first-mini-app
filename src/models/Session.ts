// models/Session.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISession extends Document {
  sessionToken: string;
  userId: string;
  expires: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    sessionToken: { type: String, unique: true, required: true },
    userId: { type: String, required: true }, // reference ke _id user
    expires: { type: Date, required: true },
  },
  { timestamps: true }
);

const Session: Model<ISession> =
  mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);

export default Session;
