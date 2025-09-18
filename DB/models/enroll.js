import { Schema, Types, model } from "mongoose";

const enrollmentSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true, index: true },
    status: { type: String, enum: ["pending", "active", "rejected", "expired"], default: "pending", index: true },
    paymentId: { type: Types.ObjectId, ref: "Payment" },
    activatedAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

enrollmentSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });

export const Enrollment = model("Enrollment", enrollmentSchema);
