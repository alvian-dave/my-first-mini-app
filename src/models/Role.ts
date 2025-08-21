import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  roles: { type: [String], default: ['hunter'] },
  activeRole: { type: String, default: 'hunter' },
});

export default mongoose.models.Role || mongoose.model('Role', RoleSchema);
