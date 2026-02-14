import { Schema, Types, model } from "mongoose";

const lectureSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    img: { type: String, required: true },
    price: { type: Number, required: true },
    year: { type: Types.ObjectId, ref: "Year", required: true },
    branch: {
      type: Types.ObjectId,
      ref: "Branch",
      required: true,
    },

    order: { type: Number, required: true },  // لترتيب المحاضرات

    videos: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  amount: String,
  },
  { timestamps: true }
);

export const Lecture = model("Lecture", lectureSchema);
