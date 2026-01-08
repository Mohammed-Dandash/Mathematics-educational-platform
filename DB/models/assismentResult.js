import { Schema, Types, model } from "mongoose";
const assignmentSubmissionSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student" },
    files: [{ type: String, required: true }],
    submittedAt: { type: Date, default: Date.now },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true},
    
   images: [{ type: String, required: true }],
  },
  { timestamps: true }
);
// assignmentSubmissionSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });


export const AssignmentSubmission = model("AssignmentSubmission", assignmentSubmissionSchema);