import mongoose, { Schema, model, models } from "mongoose"

const submissionSchema = new Schema(
  {
    userId: { type: String, required: true },
    campaignId: { type: Schema.Types.ObjectId, ref: "Campaign", required: true },
    status: {
      type: String,
      enum: ["submitted", "approved", "rejected"],
      default: "submitted",
    },
  },
  { timestamps: true }
)

export default models.Submission || model("Submission", submissionSchema)
