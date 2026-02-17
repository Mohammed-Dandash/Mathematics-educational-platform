import { Schema, Types, model } from "mongoose";
const assignmentSubmissionSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student" },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true},
    // ملف PDF واحد للواجب
    file: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
    // حقول قديمة للتوافق مع البيانات الموجودة (اختيارية)
    files: [{ type: String }],
    images: [{ type: String }],
  },
  { timestamps: true }
);
// assignmentSubmissionSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });


export const AssignmentSubmission = model("AssignmentSubmission", assignmentSubmissionSchema);