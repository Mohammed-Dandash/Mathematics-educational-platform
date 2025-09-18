import { Schema, Types, model } from "mongoose";

const studentTokenSchema = new Schema(
  {
    student: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    token: { type: String, required: true },
    isValid: { type: Boolean, default: true },
    expiredAt: { type: Date, required: true },
    deviceId: { type: String, required: true }, // جهاز واحد فقط
  },
  { timestamps: true }
);

export const StudentTokenMobile = model("StudentTokenMobile", studentTokenSchema);
