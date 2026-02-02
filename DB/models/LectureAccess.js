import mongoose from "mongoose";

const lectureAccessSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    lectureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Lecture",
      required: true,
    },
    grantedBy: {
      type: String,
      enum: ["payment", "admin"],
      default: "admin",
    },
    grantedByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // الأدمن / الأسيستنت اللي أضاف
    },
  },
  { timestamps: true }
);

// منع التكرار
lectureAccessSchema.index(
  { studentId: 1, lectureId: 1 },
  { unique: true }
);

export const LectureAccess = mongoose.model(
  "LectureAccess",
  lectureAccessSchema
);
