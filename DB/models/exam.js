import { Schema, Types, model } from "mongoose";

const examSchema = new Schema(
  {
    lecture: { type: Types.ObjectId, ref: "Lecture", required: true },
    questions: [
      {
        question: { type: String, required: true },
        img: { type: String, default: "" },
        correctAnswer: { type: String, required: true },
        wrongAnswers: [{ type: String, required: true }],
      },
    ],
  },
  { timestamps: true }
);

export const Exam = model("Exam", examSchema);
