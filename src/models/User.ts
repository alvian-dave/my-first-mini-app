// models/User.ts
import mongoose, { Schema, Document, models } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  username?: string;
  profilePictureUrl?: string;
}

const UserSchema = new Schema<IUser>(
  {
    walletAddress: { type: String, required: true, unique: true },
    username: { type: String },
    profilePictureUrl: { type: String },
  },
  { timestamps: true }
);

const User = models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
