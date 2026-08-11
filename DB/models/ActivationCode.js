import { Schema, Types, model } from "mongoose";

const activationCodeSchema = new Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true, 
      trim: true 
    },
    centerId: { type: Types.ObjectId, ref: "Center", required: true }, 
    lectureId: { type: Types.ObjectId, ref: "Lecture", required: true }, 
    
    isUsed: { type: Boolean, default: false }, 
    
    usedBy: { type: Types.ObjectId, ref: "Student", default: null }, 
    usedAt: { type: Date, default: null }, 
    
    generatedBy: { type: Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const ActivationCode = model("ActivationCode", activationCodeSchema);