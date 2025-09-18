import { Schema, Types, model } from "mongoose";

const assignmentSchema = new Schema(
  {
    lecture: { type: Types.ObjectId, ref: "Lecture", required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    
  },
  { timestamps: true }
);

export const Assignment = model("Assignment", assignmentSchema);
