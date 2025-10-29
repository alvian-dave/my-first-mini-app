import mongoose, { Schema, models } from 'mongoose'

const TaskSchema = new Schema(
  {
    service: {
      type: String,
      enum: ['twitter', 'discord', 'telegram'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'follow',
        'retweet',
        'like',
        'join',
        'comment',
        'join_channel',
        'join_group',
        'comment_group',
      ],
      required: true,
    },
    url: { type: String, required: true },
    targetId: { type: String, required: false },
    tweetId: { type: String, required: false },
  },
  { _id: false }
)

const CampaignSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },

    // ✅ Sama seperti CampaignForm
    budget: { type: String, required: true },
    reward: { type: String, required: true },

    status: {
      type: String,
      enum: ['active', 'finished', 'rejected'],
      default: 'active',
    },

    // ✅ Array task (maks 3, sama seperti frontend)
    tasks: {
      type: [TaskSchema],
      validate: [
        (val: any[]) => val.length <= 3,
        '{PATH} exceeds the limit of 3 tasks',
      ],
    },

    createdBy: { type: String, required: true }, // userId promoter

    // ✅ Hunter yang join / submit
    contributors: { type: Number, default: 0 },

    // ✅ Simpan ID hunter yang sudah selesai
    participants: [{ type: String }],

        // 🧾 Bukti deposit campaign (on-chain)
    depositTxHash: { type: String, required: true }, // dari Worldcoin MiniKit (transaction_id)
    onchainHash: { type: String, required: true },   // tx hash on blockchain

    // 💰 Jumlah WR yang benar-benar dikirim on-chain (wei)
    depositedWR: { type: String, required: true },   // dalam wei (BigInt string)
    remainingWR: { type: String, required: true },   // update setiap reward dikirim

    // 🔐 Alamat wallet promoter yang buat campaign
    promoterAddress: { type: String, required: true },

    // 📦 Hash transaksi refund / reward terakhir (optional, untuk log)
    lastRescueTx: { type: String },

    // 🧩 Tambahan optional:
    error: { type: String }, // kalau gagal verifikasi atau rescue
  },
  { timestamps: true }
)

export const Campaign =
  models.Campaign || mongoose.model('Campaign', CampaignSchema)
