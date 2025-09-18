import { model, Schema, Types } from "mongoose";

const examResultSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student", required: true },
    examId: { type: Types.ObjectId, ref: "Exam", required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    answers: [
      {
        question: { type: String },
        chosenAnswer: { type: String },
        isCorrect: { type: Boolean },
      },
    ],
  },
  { timestamps: true }
);

export const ExamResult = model("ExamResult", examResultSchema);
