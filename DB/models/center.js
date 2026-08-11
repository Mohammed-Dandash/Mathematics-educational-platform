import { Schema, Types, model } from "mongoose";

const centerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true }, 
    location: { type: String, trim: true }, 
    contact: { type: String, trim: true }, 
    isActive: { type: Boolean, default: true }, 
    createdBy: { type: Types.ObjectId, ref: "User", required: true } 
  },
  { timestamps: true }
);

export const Center = model("Center", centerSchema);