import { Schema, Types, model } from "mongoose";
const assignmentSubmissionSchema = new Schema(
  {
    studentId: { type: Types.ObjectId, ref: "Student",  index: true },
    files: [{ type: String, required: true }],
    submittedAt: { type: Date, default: Date.now },
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true, index: true },
    
   
  },
  { timestamps: true }
);
assignmentSubmissionSchema.index({ studentId: 1, lectureId: 1 }, { unique: true });


export const AssignmentSubmission = model("AssignmentSubmission", assignmentSubmissionSchema);