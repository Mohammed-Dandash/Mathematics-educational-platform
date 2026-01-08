import { Schema, Types, model } from "mongoose";

const branchSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    year: {
      type: Types.ObjectId,
      ref: "Year",
      required: true,
    },
  },
  { timestamps: true }
);

export const Branch = model("Branch", branchSchema);
