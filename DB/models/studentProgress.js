import { Schema, Types, model } from "mongoose";

const studentProgressSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true },
    homeworkDone: { type: Boolean, default: false },
    examDone: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const StudentProgress = model("StudentProgress", studentProgressSchema);
