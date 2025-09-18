import { Schema, Types, model } from "mongoose";

const schema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    isValid: {
      type: Boolean,
      default: true,
    },
    expiredAt: {
      type: Date,
      default: () => Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
    }, // 7 days
  },
  {
    timestamps: true,
  }
);
export const Token = model("Token", schema);
