import mongoose, { Schema, model, models } from "mongoose"

const submissionSchema = new Schema(
  {
    userId: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },

    // progress tiap task
    tasks: [
      {
        service: { type: String, required: true }, // twitter / discord / telegram
        type: { type: String, required: true }, // follow / join / retweet
        url: { type: String, required: true }, // target link
        done: { type: Boolean, default: false }, // hasil verifikasi
        verifiedAt: { type: Date }, // kapan diverifikasi
      },
    ],

    // status submission global
    status: {
      type: String,
      enum: ["pending", "submitted"], // pending = belum semua done, submitted = semua task done
      default: "pending",
    },

    // flag tambahan supaya hunter ga bisa farming reward
    rewarded: {
      type: Boolean,
      default: false,
    },

    // --- On-chain reward tracking fields (added) ---
    // rewardStatus:
    // - "none" = belum dicoba
    // - "pending_onchain" = tx dikirim dan sedang menunggu konfirmasi
    // - "onchain_confirmed" = tx sudah dikonfirmasi on-chain
    // - "failed" = percobaan on-chain gagal
    rewardStatus: {
      type: String,
      enum: ["none", "pending_onchain", "onchain_confirmed", "failed"],
      default: "none",
    },

    rewardRequestedAt: { type: Date },

    // reward amount in wei (string)
    rewardAmount: { type: String },

    // tx hash dari reward transaction (string)
    rewardTxHash: { type: String },

    // waktu konfirmasi on-chain
    rewardOnchainAt: { type: Date },

    // error message bila payout gagal
    rewardError: { type: String },
  },
  { timestamps: true }
)

submissionSchema.index(
  { userId: 1, campaignId: 1 },
  { unique: true }
)


export default models.Submission || model("Submission", submissionSchema)