// DB/models/studentToken.model.js
import { Schema, Types, model } from "mongoose";

const studentTokenSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    token:   { type: String, required: true, index: true },
    isValid: { type: Boolean, default: true, index: true },
    expiredAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
      required: true,
    },
    // اختياري لمتابعة المحاولات:
    deviceId:  { type: String, default: null },
    userAgent: { type: String, default: null },
    ip:        { type: String, default: null },
  },
  { timestamps: true }
);

// ✅ جهاز واحد: اسمح بـ "توكن واحد صالح" لكل طالب
studentTokenSchema.index(
  { student: 1, isValid: 1 },
  { unique: true, partialFilterExpression: { isValid: true } }
);

export const StudentToken = model("StudentToken", studentTokenSchema);
