import mongoose, { Schema, model, models } from "mongoose";

const spinProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true }, 
    
    // Set ke 0 biar user baru nggak dapet spin gratisan langsung
    availableSpins: { 
      type: Number, 
      default: 0, 
      min: 0 
    },

    lastFreeSpinAt: { 
      type: Date, 
      default: null 
    },

    accumulatedWR: { 
      type: Number, 
      default: 0 
    },

    // Untuk locking API Claim
    isProcessing: {
      type: Boolean,
      default: false
    },

    history: [
      {
        type: { type: String, enum: ["free", "paid", "claim"], required: true },
        reward: { type: Number, required: true }, 
        txHash: { type: String }, 
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default models.SpinProfile || model("SpinProfile", spinProfileSchema);
