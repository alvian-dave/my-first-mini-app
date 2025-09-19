import mongoose, { Schema, model, models } from "mongoose"

const submissionSchema = new Schema(
  {
    userId: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },

    // progress submission
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
      enum: ["pending", "submitted"], // cukup 2 aja kalau auto-system
      default: "pending",
    },
  },
  { timestamps: true }
)

export default models.Submission || model("Submission", submissionSchema)
