import { Schema, model } from "mongoose";

const yearSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ["أولى ثانوي", "تانية ثانوي", "تالتة ثانوي"],
    },
  },
  { timestamps: true }
);

export const Year = model("Year", yearSchema);
