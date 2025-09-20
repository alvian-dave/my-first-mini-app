import mongoose, { Schema, model, models } from "mongoose"

const submissionSchema = new Schema(
  {
    userId: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },

    // progress tiap task
    tasks: [
      {
        service: { type: String, required: true },   // twitter / discord / telegram
        type: { type: String, required: true },      // follow / join / retweet
        url: { type: String, required: true },       // target link
        done: { type: Boolean, default: false },     // hasil verifikasi
        verifiedAt: { type: Date },                  // kapan diverifikasi
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
  },
  { timestamps: true }
)

export default models.Submission || model("Submission", submissionSchema)
