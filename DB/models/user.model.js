import { model, Schema } from "mongoose";

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  role: {
    type: String,
    required: true,
    enum: ["admin", "assistant"],
    default: "assistant",
  },
  password: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    unique: true,
    sparse: true,
  },
});

export const User = model("User", userSchema);
