import { Schema, Types, model } from "mongoose";

const paymentSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student", required: true, index: true },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true, index: true },
    // method: { type: String, enum: ["VodafoneCash", "Bank", "Other"], required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending", index: true },
    reviewedBy: { type: Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    note: { type: String },
    image :[String]
  },
  { timestamps: true }
);


export const Payment = model("Payment", paymentSchema);